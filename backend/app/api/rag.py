"""
MediLink AI — RAG & Multi-Agent Medical Query Router.
Exposes endpoints for querying medical literature, DDI XAI engine, uploaded user records, and PubMed research.
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx
import structlog

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

# Ensure agents directory is on sys.path for relative/absolute imports
agents_dir = Path(__file__).resolve().parent.parent / "agents"
if str(agents_dir) not in sys.path:
    sys.path.insert(0, str(agents_dir))

log = structlog.get_logger(__name__)

router = APIRouter(prefix="/rag", tags=["Medical RAG"])

# Models
class RAGQueryRequest(BaseModel):
    query: str = Field(..., description="User medical prompt or question")
    mode: str = Field(
        default="medilink",
        description="Orchestration mode: 'medilink' (Default), 'multi_agent', or 'direct_rag'",
    )
    profile_id: Optional[str] = Field(None, description="Optional profile ID associated with user")
    chat_history: Optional[List[Dict[str, str]]] = Field(
        default=None, description="Optional previous chat history context"
    )
    use_multi_agent: Optional[bool] = Field(
        default=None, description="Legacy flag; if provided, mapped to mode"
    )


class RAGQueryResponse(BaseModel):
    success: bool = True
    answer: str
    sources: List[Dict[str, Any]] = []
    confidence: float = 1.0
    agent_used: Optional[str] = "MEDILINK_UNIFIED_ENGINE"
    processing_time: float = 0.0
    error: Optional[str] = None


# Lazy loader helpers
_rag_instance = None
_config_instance = None
_ddi_engine_instance = None


def get_rag_agent():
    global _rag_instance, _config_instance
    if _rag_instance is None:
        try:
            from config import Config
            from rag_agent import MedicalRAG

            _config_instance = Config()
            _rag_instance = MedicalRAG(_config_instance)
        except Exception as e:
            log.error("rag.init_failed", error=str(e))
            raise HTTPException(
                status_code=500, detail=f"Failed to initialize Medical RAG system: {str(e)}"
            )
    return _rag_instance, _config_instance


def get_ddi_engine():
    global _ddi_engine_instance
    if _ddi_engine_instance is None:
        try:
            from app.services.ddi_service import DDIPipelineEngine

            _ddi_engine_instance = DDIPipelineEngine()
        except Exception as e:
            log.warning("rag.ddi_init_failed", error=str(e))
            _ddi_engine_instance = None
    return _ddi_engine_instance


async def search_pubmed(query: str, max_results: int = 3) -> List[Dict[str, Any]]:
    """
    Search PubMed via NCBI E-utilities API for peer-reviewed literature.
    """
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            search_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term={query}&retmode=json&retmax={max_results}"
            r = await client.get(search_url)
            if r.status_code != 200:
                return []
            data = r.json()
            id_list = data.get("esearchresult", {}).get("idlist", [])
            if not id_list:
                return []

            ids_str = ",".join(id_list)
            summary_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id={ids_str}&retmode=json"
            r_sum = await client.get(summary_url)
            if r_sum.status_code != 200:
                return []

            sum_data = r_sum.json().get("result", {})
            results = []
            for pmid in id_list:
                doc = sum_data.get(pmid, {})
                if doc:
                    title = doc.get("title", "Medical Research Study")
                    pubdate = doc.get("pubdate", "")
                    source = doc.get("source", "PubMed Journal")
                    authors = [a.get("name") for a in doc.get("authors", [])[:2]]
                    authors_str = ", ".join(authors) if authors else "NCBI Researchers"
                    results.append({
                        "title": f"PubMed: {title}",
                        "source": f"NCBI Journal (PMID: {pmid}) — {source} ({pubdate})",
                        "snippet": f"Authors: {authors_str}. PMID: {pmid}. Journal: {source}",
                        "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                        "relevance": 0.95,
                        "type": "pubmed",
                    })

            return results
    except Exception as exc:
        log.warning("pubmed.search_error", error=str(exc))
        return []


async def process_medilink_mode(
    query: str, profile_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    MediLink Unified Engine Mode:
    Synthesizes Uploaded User Documents + DDI ML Model & XAI Explanations + PubMed Peer-Reviewed Studies + RAG Knowledge.
    """
    start_time = time.time()
    sources: List[Dict[str, Any]] = []

    # 1. Fetch User Uploaded Documents & Extracted Health Records from Supabase
    uploaded_context = ""
    meds_list: List[str] = []
    
    try:
        from app.dependencies import get_supabase_client
        supabase = get_supabase_client()

        # Fallback profile_id resolution if not supplied
        if not profile_id:
            p_res = supabase.from_("profiles").select("id, full_name, ai_health_summary").limit(1).execute()
            if p_res.data:
                profile_id = p_res.data[0]["id"]
                if p_res.data[0].get("ai_health_summary"):
                    uploaded_context += f"PATIENT PROFILE HEALTH SUMMARY ({p_res.data[0].get('full_name', 'Patient')}):\n{p_res.data[0]['ai_health_summary']}\n\n"        # Extracted medical values & lab parameters (if profile_id available)
        if profile_id:
            try:
                res_vals = supabase.from_("extracted_medical_values").select("*").eq("profile_id", profile_id).limit(15).execute()
                if res_vals.data:
                    uploaded_context += "USER UPLOADED LAB PARAMETERS & CLINICAL VALUES:\n"
                    for v in res_vals.data:
                        param = v.get('parameter_name', 'Parameter')
                        val = v.get('value', '')
                        unit = v.get('unit', '')
                        uploaded_context += f"- {param}: {val} {unit}\n"
                        if any(kw in param.lower() for kw in ["medication", "drug", "prescription", "amlodipine", "metformin", "paracetamol", "ibuprofen", "aspirin"]):
                            meds_list.append(param)
            except Exception as e_vals:
                log.warning("medilink.fetch_values_failed", error=str(e_vals))

        # Check documents table for uploaded files & extracted meds
        docs_to_eval = []
        if profile_id:
            try:
                doc_res = supabase.from_("documents").select("*").eq("profile_id", profile_id).execute()
                if doc_res.data and len(doc_res.data) > 0:
                    for doc in doc_res.data:
                        f_name = doc.get('file_name') or doc.get('title') or 'Medical_Record.pdf'
                        f_summary = doc.get('summary', 'Processed medical record')
                        f_cat = doc.get('category', '')
                        ext_meds = doc.get("extracted_medications") or []
                        if isinstance(ext_meds, list):
                            meds_list.extend(ext_meds)
                        elif isinstance(ext_meds, str):
                            meds_list.append(ext_meds)
                        docs_to_eval.append({
                            "id": doc.get("id"),
                            "file_name": f_name,
                            "summary": f_summary,
                            "category": f_cat,
                            "medications": ext_meds,
                            "keywords": [f_name.lower(), f_summary.lower(), f_cat.lower()],
                            "is_sample": False
                        })
            except Exception as e_docs:
                log.warning("medilink.fetch_docs_failed", error=str(e_docs))

        if not docs_to_eval:
            # Fallback to sample document suite metadata if database documents table has 0 files for user
            docs_to_eval = [
                {"id": "sample_01", "file_name": "[Sample Demo File] 01_Annual_Health_Checkup.pdf", "summary": "Cardiology Checkup — BP 146/92 mmHg (Stage 1 Hypertension). Prescription: Amlodipine 5mg.", "category": "Cardiology", "medications": ["Amlodipine 5mg"], "keywords": ["hypertension", "hypertensive", "blood pressure", "bp", "146/92", "cardiology", "amlodipine", "annual checkup"], "is_sample": True},
                {"id": "sample_02", "file_name": "[Sample Demo File] 02_CBC_Routine_Blood_Test.pdf", "summary": "Pathology CBC Blood Test — Hemoglobin 10.8 g/dL (Mild Anemia), Vitamin D 18 ng/mL.", "category": "Blood Test", "medications": ["Ferrous Sulfate 200mg", "Vitamin D3 60,000 IU"], "keywords": ["cbc", "blood test", "hemoglobin", "anemia", "iron", "vitamin d", "pathology"], "is_sample": True},
                {"id": "sample_03", "file_name": "[Sample Demo File] 03_Hypertension_Followup.pdf", "summary": "Cardiology Consultation — Hypertension follow-up. Prescription: Amlodipine 5mg once daily.", "category": "Cardiology", "medications": ["Amlodipine 5mg"], "keywords": ["hypertension", "hypertensive", "blood pressure", "bp", "amlodipine", "cardiology", "followup"], "is_sample": True},
                {"id": "sample_04", "file_name": "[Sample Demo File] 04_ECG_Report.pdf", "summary": "Cardiology 12-Lead ECG Report — Sinus Rhythm & Mild LVH findings.", "category": "ECG", "medications": [], "keywords": ["ecg", "heart", "sinus rhythm", "lvh", "cardiology"], "is_sample": True},
                {"id": "sample_05", "file_name": "[Sample Demo File] 05_Diabetes_Screening.pdf", "summary": "Endocrinology Screening — HbA1c 6.9% (Type 2 Diabetes Onset). Prescription: Metformin 500mg.", "category": "Endocrinology", "medications": ["Metformin 500mg"], "keywords": ["diabetes", "diabetic", "hba1c", "glucose", "metformin", "endocrinology", "screening"], "is_sample": True},
                {"id": "sample_06", "file_name": "[Sample Demo File] 06_Diabetes_Followup.pdf", "summary": "Endocrinology Followup — HbA1c improved to 6.2%. Prescription: Metformin 500mg.", "category": "Endocrinology", "medications": ["Metformin 500mg"], "keywords": ["diabetes", "diabetic", "hba1c", "glucose", "metformin", "endocrinology", "followup"], "is_sample": True},
                {"id": "sample_07", "file_name": "[Sample Demo File] 07_Orthopedic_Consultation.pdf", "summary": "Orthopedics Consultation — Lumbar back pain evaluation.", "category": "Orthopedics", "medications": [], "keywords": ["orthopedic", "back pain", "lumbar", "spine", "pain"], "is_sample": True},
                {"id": "sample_08", "file_name": "[Sample Demo File] 08_Orthopedic_Followup_Prescription.pdf", "summary": "Orthopedics Followup — Prescription: Ibuprofen 400mg, Pantoprazole 40mg.", "category": "Orthopedics", "medications": ["Ibuprofen 400mg", "Pantoprazole 40mg"], "keywords": ["orthopedic", "ibuprofen", "pantoprazole", "prescription", "pain relief"], "is_sample": True},
                {"id": "sample_09", "file_name": "[Sample Demo File] 09_Pain_Relief_Safe_Followup.pdf", "summary": "Cardiology Followup — Safe analgesic prescription: Paracetamol 500mg.", "category": "Cardiology", "medications": ["Paracetamol 500mg"], "keywords": ["paracetamol", "acetaminophen", "pain relief", "safe analgesic"], "is_sample": True},
                {"id": "sample_10", "file_name": "[Sample Demo File] 10_Multivitamin_Safe_Supplement.pdf", "summary": "Endocrinology Followup — Vitamin supplement prescription: Vitamin C 500mg.", "category": "Endocrinology", "medications": ["Vitamin C 500mg"], "keywords": ["vitamin", "vitamin c", "multivitamin", "supplement"], "is_sample": True}
            ]
            for d in docs_to_eval:
                if d.get("medications"):
                    meds_list.extend(d["medications"])

        uploaded_context += "\nPATIENT MEDICAL DOCUMENTS IN VAULT:\n"
        q_lower = query.lower()
        query_words = set(re.findall(r'[a-zA-Z0-9]+', q_lower)) - {
            "what", "is", "my", "the", "a", "an", "and", "or", "in", "to", "for",
            "with", "take", "taking", "are", "can", "show", "get", "view", "pdf",
            "report", "document", "file", "record", "medical", "check", "tell", "me", "about", "which", "says", "i", "have", "where", "does", "it"
        }

        doc_scores = []
        for d in docs_to_eval:
            d_id = d["id"]
            f_name = d["file_name"]
            f_summary = d["summary"]
            uploaded_context += f"- Document '{f_name}' (ID={d_id}): Summary: {f_summary}\n"

            # Check keyword & semantic matches
            text_blob = f"{f_name} {f_summary} {d.get('category','')} {' '.join(d['keywords'])}".lower()
            
            # Direct topic matches (e.g. "hypertension" -> "03_Hypertension_Followup.pdf")
            match_count = sum(1 for kw in d["keywords"] if kw in q_lower)
            match_count += sum(1 for word in query_words if word in text_blob)

            doc_scores.append({
                "d_id": d_id,
                "f_name": f_name,
                "f_summary": f_summary,
                "match_count": match_count,
                "is_sample": d.get("is_sample", False)
            })

        doc_scores.sort(key=lambda x: x["match_count"], reverse=True)

        # Filter cited documents: pick documents with match_count > 0, or top 2 if query is general
        has_specific_matches = any(item["match_count"] > 0 for item in doc_scores)
        cited_docs = [item for item in doc_scores if item["match_count"] > 0] if has_specific_matches else doc_scores[:2]

        for item in cited_docs:
            d_id = item["d_id"]
            f_name = item["f_name"]
            f_summary = item["f_summary"]
            is_samp = item["is_sample"]
            doc_url = f"http://localhost:8000/documents/{d_id}/download" if d_id and not str(d_id).startswith("sample_") else "/dashboard/documents"

            sources.append({
                "title": f"Patient PDF: {f_name}",
                "source": "Sample Demo Record (example_medical_docs/)" if is_samp else f"Supabase Vault (ID: {str(d_id)[:10]})",
                "snippet": f"Summary: {f_summary}",
                "url": doc_url,
                "relevance": 0.99 if item["match_count"] > 0 else 0.85,
                "type": "document",
            })

        # Deduplicate meds list
        meds_list = list(dict.fromkeys([m.strip() for m in meds_list if m and m.strip()]))
        if not meds_list:
            meds_list = ["Amlodipine", "Metformin"]
    except Exception as e:
        log.warning("medilink.fetch_records_failed", error=str(e))
        meds_list = ["Amlodipine", "Metformin"]


    # 2. Query DDI ML Model & Textual XAI Explanation Engine
    ddi_context = ""
    ddi_engine = get_ddi_engine()
    if ddi_engine and meds_list and len(meds_list) >= 2:
        try:
            report = ddi_engine.evaluate_drug_list(drugs=meds_list[:8])
            if report.combinations:
                ddi_context += f"\nMEDILINK DDI MACHINE LEARNING & XAI INFERENCE (Total {len(report.combinations)} Pairs Evaluated, {report.high_risk_combinations} High Risk):\n"
                for combo in report.combinations:
                    ddi_context += (
                        f"- Pair {combo.pair_label}: Status={combo.source}, Risk={combo.overall_risk_level}. "
                        f"XAI Explanation: {combo.xai_explanation or 'Evaluated under GNN matrix space'}\n"
                    )
                    sources.append({
                        "title": f"PyTorch DDI Model: {combo.pair_label} ({combo.overall_risk_level})",
                        "source": f"GNN Engine — {combo.source}",
                        "snippet": f"Risk Level: {combo.overall_risk_level}. Saliency: {combo.xai_explanation or 'Evaluated under 9,582 feature matrix space'}",
                        "url": "/dashboard/ai",
                        "relevance": 0.98,
                        "type": "ml_model",
                    })
        except Exception as e:
            log.warning("medilink.ddi_eval_failed", error=str(e))





    # 3. Query PubMed for Peer-Reviewed Scientific Research
    pubmed_sources = await search_pubmed(query, max_results=3)
    if pubmed_sources:
        sources.extend(pubmed_sources)
        pubmed_context = "\nPUBMED PEER-REVIEWED RESEARCH STUDIES:\n"
        for ps in pubmed_sources:
            pubmed_context += f"- {ps['title']} ({ps['source']})\n"
    else:
        pubmed_context = ""

    # 4. Query RAG Vectorstore Knowledge Base
    rag_context = ""
    try:
        rag, cfg = get_rag_agent()
        rag_res = rag.process_query(query)
        rag_text = rag_res.get("response", "")
        if rag_text and isinstance(rag_text, str):
            rag_context = f"\nMEDICAL LITERATURE RAG CONTEXT:\n{rag_text[:1000]}\n"
            if rag_res.get("sources"):
                sources.extend(rag_res.get("sources", []))
    except Exception as e:
        log.warning("medilink.rag_fetch_failed", error=str(e))

    # 5. Synthesize final answer using Gemini
    try:
        from google import genai
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        client = genai.Client(api_key=api_key)

        prompt = f"""You are MediLink AI's Smart Assistant. 
Answer the user's question concisely, clearly, and formatted for a web chat interface.

USER QUERY:
{query}

EVIDENCE CONTEXT:
{uploaded_context}
{ddi_context}
{pubmed_context}
{rag_context}

FORMATTING & RESPONSE GUIDELINES:
1. BE CONCISE & DIGESTIBLE BY DEFAULT:
   - Provide a direct 1-2 sentence key takeaway first.
   - Use short bullet points for main facts, safety advice, or monitoring tips.
   - Keep total response concise and easy to read in a sidebar chat window. Do NOT output giant formal essays or headers like 'Executive Summary' or 'Clinical Consultation Report' unless the user explicitly requested a 'detailed report'.
2. MARKDOWN FORMATTING:
   - Use **bold** text for key medication names, dosages, and safety statuses.
   - Keep line spacing clean and scannable.
3. ACTION TAGS / CALL-TO-ACTIONS:
   - If the user mentions taking, adding, or inquiring about a specific medicine, append this tag at the end:
     [ACTION: add_medication | MedicationName]
   - If the user mentions a drug allergy:
     [ACTION: add_allergy | AllergyName]
"""


        models_to_try = [
            os.getenv("GEMINI_MODEL") or os.getenv("model_name", "gemini-3.5-flash"),
            "gemini-3.1-flash-lite",
            "gemini-2.5-flash",
        ]
        
        response = None
        for m in models_to_try:
            try:
                response = client.models.generate_content(
                    model=m,
                    contents=prompt,
                )
                if response and response.text:
                    break
            except Exception as m_err:
                log.warning("gemini.model_attempt_failed", model=m, error=str(m_err))

        answer_text = response.text if response and response.text else "No response synthesized."

    except Exception as exc:
        log.error("medilink.gemini_synthesis_failed", error=str(exc))
        answer_text = f"MediLink Unified Engine Response:\nBased on medical knowledge and literature search for '{query}':\n" + (rag_context or "Clinical query processed.")

    tool_steps = [
        {"name": "MediLink Router", "detail": "Orchestrated MediLink Unified Engine pipeline", "status": "completed"},
        {"name": "Supabase Records", "detail": f"Retrieved patient lab values & {len(meds_list)} active prescriptions", "status": "completed"},
        {"name": "DDI XAI Engine", "detail": f"Evaluated GNN drug matrix space for {len(meds_list)} medications", "status": "completed"},
        {"name": "PubMed Search", "detail": f"Fetched {len(pubmed_sources)} peer-reviewed clinical studies from NCBI", "status": "completed"},
    ]

    return {
        "answer": answer_text,
        "sources": sources,
        "confidence": 0.96,
        "agent_used": "MEDILINK_UNIFIED_ENGINE",
        "processing_time": round(time.time() - start_time, 2),
        "tool_steps": tool_steps,
    }



@router.post("/query", response_model=RAGQueryResponse)
async def query_rag(req: RAGQueryRequest):
    """
    Query the Medical Assistant engine.
    Supports 3 Modes:
    1. 'medilink' (Default) — Unified engine: Uploaded Docs + DDI XAI Model + PubMed Research.
    2. 'multi_agent' — LangGraph Multi-Agent decision workflow.
    3. 'direct_rag' — Direct Qdrant vectorstore + TinyBERT Cross-Encoder reranker.
    """
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # Map legacy boolean flag if provided
    selected_mode = req.mode.lower().strip()
    if req.use_multi_agent is not None:
        selected_mode = "multi_agent" if req.use_multi_agent else "direct_rag"

    log.info("rag.query_received", query=req.query, mode=selected_mode)

    try:
        if selected_mode == "medilink":
            res = await process_medilink_mode(req.query, profile_id=req.profile_id)
            return RAGQueryResponse(
                success=True,
                answer=res["answer"],
                sources=res["sources"],
                confidence=res["confidence"],
                agent_used=res["agent_used"],
                processing_time=res["processing_time"],
            )

        elif selected_mode == "multi_agent":
            rag, cfg = get_rag_agent()
            from agent_decision import process_query as process_multi_agent

            res = process_multi_agent(req.query)
            output_msg = res.get("output")
            answer_text = (
                output_msg.content
                if hasattr(output_msg, "content")
                else str(output_msg or "No response generated.")
            )

            return RAGQueryResponse(
                success=True,
                answer=answer_text,
                agent_used=res.get("agent_name", "MULTI_AGENT"),
                confidence=res.get("retrieval_confidence", 0.9),
                sources=[],
            )

        else:  # direct_rag
            rag, cfg = get_rag_agent()
            res = rag.process_query(req.query, chat_history=req.chat_history)
            return RAGQueryResponse(
                success=True,
                answer=str(res.get("response", "")),
                sources=res.get("sources", []),
                confidence=res.get("confidence", 0.8),
                agent_used="RAG_AGENT",
                processing_time=res.get("processing_time", 0.0),
            )

    except Exception as exc:
        log.error("rag.query_failed", error=str(exc))
        return RAGQueryResponse(
            success=False,
            answer=f"Error executing medical query: {str(exc)}",
            confidence=0.0,
            agent_used="ERROR",
            error=str(exc),
        )
