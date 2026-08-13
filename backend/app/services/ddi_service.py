"""
DDI (Drug-Drug Interaction) Engine and Service Module.

Handles:
1. User medication retrieval from Supabase database.
2. DDI deep learning model loading from the `drug-to-drug-interaction-using-XAI` sub-repository.
3. 2-drug combination generation & tensor inference.
4. Handling missing dataset medications with clinical knowledge-gap warnings.
5. Formatting app-ready `UserDDIReport` payloads.
"""

from __future__ import annotations

import os
import sys
import json
import re
import pickle
import itertools
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Any

import numpy as np
import torch

class _LoggerWrapper:
    def __init__(self, logger, is_structlog: bool):
        self._logger = logger
        self._is_structlog = is_structlog

    def info(self, msg: str, **kwargs):
        if self._is_structlog:
            self._logger.info(msg, **kwargs)
        else:
            kw_str = " ".join(f"{k}={v}" for k, v in kwargs.items())
            self._logger.info(f"{msg} {kw_str}".strip())

    def warning(self, msg: str, **kwargs):
        if self._is_structlog:
            self._logger.warning(msg, **kwargs)
        else:
            kw_str = " ".join(f"{k}={v}" for k, v in kwargs.items())
            self._logger.warning(f"{msg} {kw_str}".strip())

    def error(self, msg: str, **kwargs):
        if self._is_structlog:
            self._logger.error(msg, **kwargs)
        else:
            kw_str = " ".join(f"{k}={v}" for k, v in kwargs.items())
            self._logger.error(f"{msg} {kw_str}".strip())

try:
    import structlog
    log = _LoggerWrapper(structlog.get_logger(__name__), is_structlog=True)
except ImportError:
    import logging
    logging.basicConfig(level=logging.INFO)
    log = _LoggerWrapper(logging.getLogger("ddi_service"), is_structlog=False)

try:
    from supabase import Client
except ImportError:
    Client = Any  # type: ignore

from app.models.ddi import (
    InteractionEffect,
    DrugCombinationDDI,
    UserDDIReport,
)


def find_subrepo_path() -> Path:
    """Find absolute path to the drug-to-drug-interaction-using-XAI sub-repository."""
    # Try relative to backend directory or workspace root
    current = Path(__file__).resolve().parent
    candidates = [
        current.parent.parent / "drug-to-drug-interaction-using-XAI",
        current.parent.parent.parent / "drug-to-drug-interaction-using-XAI",
        Path("c:/Users/Aryan Gusain/OneDrive/Desktop/New folder/medi-link-ai-core/drug-to-drug-interaction-using-XAI"),
        Path.cwd() / "drug-to-drug-interaction-using-XAI",
    ]
    
    for candidate in candidates:
        if candidate.exists() and (candidate / "data").exists():
            return candidate.resolve()
            
    raise FileNotFoundError(
        "Could not locate 'drug-to-drug-interaction-using-XAI' sub-repository directory. "
        "Please ensure it is cloned in the main repository root."
    )


def normalize_drug_name(name: str) -> str:
    """Clean and normalize medication names (strip dosage numbers, forms, whitespace)."""
    if not name:
        return ""
    cleaned = str(name).strip().lower()
    # Remove common strength patterns like 500mg, 10ml, 5 mg/ml, tablets, capsules
    cleaned = re.sub(r'\b\d+(\.\d+)?\s*(mg|g|mcg|ml|iu|unit|units|tablets?|capsules?)\b', '', cleaned)
    cleaned = re.sub(r'[^a-z0-9\s\-]', '', cleaned)
    return cleaned.strip()


class DDIPipelineEngine:
    """Wrapper class for loading and running DDI model inference."""

    _instance: Optional[DDIPipelineEngine] = None

    def __init__(self, subrepo_path: Optional[Path] = None):
        self.subrepo_path = subrepo_path or find_subrepo_path()
        self.data_dir = self.subrepo_path / "data"
        self.savepoint_path = self.subrepo_path / "savepoints" / "0" / "model_checkpoint"
        self.src_dir = self.subrepo_path / "src"

        # Ensure subrepo src is in sys.path to import model.py
        src_str = str(self.src_dir)
        if src_str not in sys.path:
            sys.path.insert(0, src_str)

        from model import build_model  # Dynamic import from sub-repo

        self._load_metadata()
        self._load_matrices()
        self._load_model(build_model)

    def _load_metadata(self):
        """Load drug dictionary mappings and label descriptions."""
        log.info("ddi.load_metadata", path=str(self.data_dir))
        
        with open(self.data_dir / "drugName2idx.pkl", "rb") as f:
            self.drugName2idx: Dict[str, int] = pickle.load(f)
            
        with open(self.data_dir / "idx2label.pkl", "rb") as f:
            self.idx2label: np.ndarray = pickle.load(f)

        with open(self.data_dir / "hyperparameter.json", "r") as f:
            self.hyperparameter: Dict[str, Any] = json.load(f)

        # Build lowercase lookup mapping for drug names
        self.drug_lookup: Dict[str, Tuple[str, int]] = {}
        for original_name, idx in self.drugName2idx.items():
            norm_key = normalize_drug_name(original_name)
            if norm_key:
                self.drug_lookup[norm_key] = (original_name, idx)
            self.drug_lookup[original_name.lower().strip()] = (original_name, idx)

    def _load_matrices(self):
        """Load structural, target, and GO similarity matrices."""
        log.info("ddi.load_matrices")
        self.SS_mat = pickle.load(open(self.data_dir / "structural_similarity_matrix.pkl", "rb"))
        self.TS_mat = pickle.load(open(self.data_dir / "target_similarity_matrix.pkl", "rb"))
        self.GS_mat = pickle.load(open(self.data_dir / "GO_similarity_matrix.pkl", "rb"))
        self.matrix_len = len(self.SS_mat)

    def _load_model(self, build_model_cls):
        """Build PyTorch neural network and load pre-trained weights."""
        log.info("ddi.load_model", checkpoint=str(self.savepoint_path))
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = build_model_cls(self.hyperparameter)
        self.model.load_model(str(self.savepoint_path))
        self.model.to(self.device)
        self.model.eval()

        # Initialize Textual XAI Engine
        from app.services.xai_service import TextualXAIEngine
        self.xai_engine = TextualXAIEngine(self.model, self.device)

    def match_drug(self, raw_drug_name: str) -> Tuple[Optional[str], Optional[int]]:
        """
        Match a raw drug name to the model's dataset index.
        Returns (canonical_name, index) or (None, None) if not found.
        """
        if not raw_drug_name:
            return None, None

        raw_clean = raw_drug_name.strip()

        # 1. Exact match in original dict
        if raw_clean in self.drugName2idx:
            return raw_clean, self.drugName2idx[raw_clean]

        # 2. Case-insensitive exact match
        lower_clean = raw_clean.lower()
        if lower_clean in self.drug_lookup:
            return self.drug_lookup[lower_clean]

        # 3. Normalized string match
        norm_clean = normalize_drug_name(raw_clean)
        if norm_clean in self.drug_lookup:
            return self.drug_lookup[norm_clean]

        # 4. Partial substring match against dataset drug names
        for norm_key, (orig_name, idx) in self.drug_lookup.items():
            if len(norm_clean) >= 4 and (norm_clean in norm_key or norm_key in norm_clean):
                return orig_name, idx

        return None, None

    def predict_pair(
        self,
        drug_a_raw: str,
        drug_b_raw: str,
        threshold: float = 0.5,
    ) -> DrugCombinationDDI:
        """
        Evaluate DDI prediction for a single drug combination pair.
        """
        pair_key = f"{normalize_drug_name(drug_a_raw)}__{normalize_drug_name(drug_b_raw)}"
        pair_label = f"{drug_a_raw.strip().title()} + {drug_b_raw.strip().title()}"

        matched_name_a, idx_a = self.match_drug(drug_a_raw)
        matched_name_b, idx_b = self.match_drug(drug_b_raw)

        drug_a_matched = idx_a is not None
        drug_b_matched = idx_b is not None
        both_matched = drug_a_matched and drug_b_matched

        # ── Case A: Missing drug in pre-trained dataset knowledge ─────────────────
        if not both_matched:
            warning_msg = (
                f"Drug {drug_a_raw.strip()} and Drug {drug_b_raw.strip()} may show reaction, "
                "Lack of knowledge in training period may result in inaccurate result so please consult with an expert"
            )
            return DrugCombinationDDI(
                id=pair_key,
                drug_a=drug_a_raw.strip(),
                drug_b=drug_b_raw.strip(),
                pair_label=pair_label,
                has_potential_interaction=True,  # Conservative safety flag
                matched_in_trained_model=False,
                drug_a_matched=drug_a_matched,
                drug_b_matched=drug_b_matched,
                knowledge_gap_warning=warning_msg,
                interactions=[],
                overall_risk_level="UNKNOWN_RISK",
                recommendation=warning_msg,
            )

        # ── Case B: Both drugs matched — run Deep Learning model inference ───────
        SS_vec = np.concatenate([self.SS_mat[idx_a], self.SS_mat[idx_b]])
        TS_vec = np.concatenate([self.TS_mat[idx_a], self.TS_mat[idx_b]])
        GS_vec = np.concatenate([self.GS_mat[idx_a], self.GS_mat[idx_b]])

        SS_tensor = torch.tensor(SS_vec, dtype=torch.float32).unsqueeze(0).to(self.device)
        TS_tensor = torch.tensor(TS_vec, dtype=torch.float32).unsqueeze(0).to(self.device)
        GS_tensor = torch.tensor(GS_vec, dtype=torch.float32).unsqueeze(0).to(self.device)

        with torch.no_grad():
            _, _, _, logits = self.model(SS_tensor, TS_tensor, GS_tensor)
            probs = torch.sigmoid(logits).squeeze(0).cpu().numpy()

        predicted_effects: List[InteractionEffect] = []
        for class_idx, prob in enumerate(probs):
            if prob >= threshold:
                label_text = str(self.idx2label[class_idx])
                
                # Determine severity grade based on probability and label keywords
                sev = "MODERATE"
                if prob >= 0.85 or "risk" in label_text.lower() or "increase" in label_text.lower():
                    sev = "HIGH"
                elif prob < 0.6:
                    sev = "LOW"

                predicted_effects.append(
                    InteractionEffect(
                        label_idx=class_idx,
                        effect_description=label_text,
                        confidence=round(float(prob), 4),
                        severity=sev,
                    )
                )

        # Sort effects by highest confidence
        predicted_effects.sort(key=lambda x: x.confidence, reverse=True)

        has_interaction = len(predicted_effects) > 0
        overall_risk = "NONE"
        if has_interaction:
            max_conf = predicted_effects[0].confidence
            if max_conf >= 0.8 or any(e.severity == "HIGH" for e in predicted_effects):
                overall_risk = "HIGH"
            elif max_conf >= 0.6:
                overall_risk = "MODERATE"
            else:
                overall_risk = "LOW"

        # Generate Textual XAI Explanation
        xai_text = self.xai_engine.explain_pair(
            drug_a_name=matched_name_a or drug_a_raw,
            drug_b_name=matched_name_b or drug_b_raw,
            SS_vec=SS_vec,
            TS_vec=TS_vec,
            GS_vec=GS_vec,
            predicted_effects=[e.model_dump() for e in predicted_effects],
        )

        if has_interaction:
            rec = (
                f"Potential interaction detected between {matched_name_a} and {matched_name_b}. "
                f"Top effect: {predicted_effects[0].effect_description}. Consult your physician or pharmacist."
            )
        else:
            rec = f"No significant interactions predicted between {matched_name_a} and {matched_name_b} under current model thresholds."

        return DrugCombinationDDI(
            id=pair_key,
            drug_a=drug_a_raw.strip(),
            drug_b=drug_b_raw.strip(),
            pair_label=pair_label,
            has_potential_interaction=has_interaction,
            matched_in_trained_model=True,
            drug_a_matched=True,
            drug_b_matched=True,
            knowledge_gap_warning=None,
            interactions=predicted_effects,
            overall_risk_level=overall_risk,
            xai_explanation=xai_text,
            recommendation=rec,
        )

    def evaluate_drug_list(
        self,
        drugs: List[str],
        profile_id: Optional[str] = None,
        user_name: Optional[str] = None,
        threshold: float = 0.5,
    ) -> UserDDIReport:
        """
        Generate combinations for a list of drugs and return a full UserDDIReport.
        """
        # Deduplicate and clean input drug names
        unique_drugs: List[str] = []
        seen = set()
        for d in drugs:
            cleaned = d.strip()
            norm = normalize_drug_name(cleaned)
            if norm and norm not in seen:
                seen.add(norm)
                unique_drugs.append(cleaned)

        user_ident = user_name or profile_id or "user"

        if not unique_drugs:
            return UserDDIReport(
                profile_id=profile_id,
                user_name=user_name,
                status="NO_MEDICATIONS_FOUND",
                message=f"No medication found for user {user_ident}",
                total_medications=0,
                medications_list=[],
                total_combinations=0,
                combinations_with_interactions=0,
                high_risk_combinations=0,
                combinations=[],
            )

        if len(unique_drugs) == 1:
            return UserDDIReport(
                profile_id=profile_id,
                user_name=user_name,
                status="SUCCESS",
                message=f"Only 1 medication ('{unique_drugs[0]}') found for user {user_ident}. At least 2 medications are required to check interactions.",
                total_medications=1,
                medications_list=unique_drugs,
                total_combinations=0,
                combinations_with_interactions=0,
                high_risk_combinations=0,
                combinations=[],
            )

        # Generate all 2-drug combinations
        pair_tuples = list(itertools.combinations(unique_drugs, 2))
        results: List[DrugCombinationDDI] = []
        interacting_count = 0
        high_risk_count = 0

        for drug_a, drug_b in pair_tuples:
            res = self.predict_pair(drug_a, drug_b, threshold=threshold)
            results.append(res)

            if res.has_potential_interaction:
                interacting_count += 1
            if res.overall_risk_level in ("HIGH", "UNKNOWN_RISK"):
                high_risk_count += 1

        summary_msg = (
            f"Successfully evaluated {len(pair_tuples)} drug combination(s) for user {user_ident}. "
            f"Found {interacting_count} combination(s) with potential interactions ({high_risk_count} high/unknown risk)."
        )

        return UserDDIReport(
            profile_id=profile_id,
            user_name=user_name,
            status="SUCCESS",
            message=summary_msg,
            total_medications=len(unique_drugs),
            medications_list=unique_drugs,
            total_combinations=len(pair_tuples),
            combinations_with_interactions=interacting_count,
            high_risk_combinations=high_risk_count,
            combinations=results,
        )


async def fetch_user_medications(
    supabase: Optional[Client],
    profile_id: str,
) -> Tuple[List[str], Optional[str]]:
    """
    Query user medications strictly for the specified logged-in user profile_id.
    Returns (list_of_medication_names, user_display_name).
    """
    medications: list[str] = []
    user_name: Optional[str] = None

    if not supabase or not profile_id:
        log.warning("ddi.fetch_medications", status="missing_client_or_profile_id")
        return [], None

    try:
        # Resolve profile record (supports both profile.id UUID and auth_user_id UUID)
        target_profile_ids = [profile_id]
        p_resp = (
            supabase.table("profiles")
            .select("id, auth_user_id, full_name, email")
            .or_(f"id.eq.{profile_id},auth_user_id.eq.{profile_id}")
            .execute()
        )
        if p_resp and p_resp.data:
            p_data = p_resp.data[0]
            user_name = p_data.get("full_name") or p_data.get("email")
            if p_data.get("id"):
                target_profile_ids.append(str(p_data["id"]))
            if p_data.get("auth_user_id"):
                target_profile_ids.append(str(p_data["auth_user_id"]))

        target_profile_ids = list(set(target_profile_ids))

        # 1. Fetch from extracted_medical_values table for any matching profile ID
        m_query = supabase.table("extracted_medical_values").select("name").eq("value_type", "medication")
        if len(target_profile_ids) == 1:
            m_query = m_query.eq("profile_id", target_profile_ids[0])
        else:
            m_query = m_query.in_("profile_id", target_profile_ids)

        m_resp = m_query.execute()
        if m_resp and m_resp.data:
            for row in m_resp.data:
                if row.get("name"):
                    medications.append(str(row["name"]).strip())

        # 2. Fetch from ai_analysis_results table JSON array
        a_query = supabase.table("ai_analysis_results").select("medications")
        if len(target_profile_ids) == 1:
            a_query = a_query.eq("profile_id", target_profile_ids[0])
        else:
            a_query = a_query.in_("profile_id", target_profile_ids)

        a_resp = a_query.execute()
        if a_resp and a_resp.data:
            for row in a_resp.data:
                meds_json = row.get("medications") or []
                if isinstance(meds_json, list):
                    for item in meds_json:
                        if isinstance(item, dict) and item.get("name"):
                            medications.append(str(item["name"]).strip())
                        elif isinstance(item, str):
                            medications.append(item.strip())

    except Exception as exc:
        log.error("ddi.fetch_medications_failed", profile_id=profile_id, error=str(exc))

    return medications, user_name


async def run_ddi_pipeline_for_user(
    supabase: Optional[Client],
    profile_id: str,
    threshold: float = 0.5,
) -> UserDDIReport:
    """
    Automatically triggers the DDI Pipeline for a logged-in user (by profile_id).
    Gets all medications strictly belonging to that logged-in user, runs DDI model predictions,
    and logs execution silently without sending results to the main application UI.
    """
    if not profile_id:
        log.warning("ddi.trigger_skipped", reason="no_profile_id")
        return UserDDIReport(
            profile_id=None,
            status="ERROR",
            message="No profile ID provided for DDI trigger",
            combinations=[],
        )

    log.info("ddi.trigger_start", profile_id=profile_id)

    medications, user_name = await fetch_user_medications(supabase, profile_id=profile_id)

    if not medications:
        msg = f"No medication found for user {user_name or profile_id}"
        log.info("ddi.trigger_complete", profile_id=profile_id, status="NO_MEDICATIONS_FOUND", message=msg)
        return UserDDIReport(
            profile_id=profile_id,
            user_name=user_name,
            status="NO_MEDICATIONS_FOUND",
            message=msg,
            total_medications=0,
            medications_list=[],
            combinations=[],
        )

    try:
        engine = DDIPipelineEngine()
        report = engine.evaluate_drug_list(
            drugs=medications,
            profile_id=profile_id,
            user_name=user_name,
            threshold=threshold,
        )
        log.info(
            "ddi.trigger_complete",
            profile_id=profile_id,
            status=report.status,
            total_drugs=report.total_medications,
            total_combinations=report.total_combinations,
            interactions=report.combinations_with_interactions,
            high_risk=report.high_risk_combinations,
        )
        # Print well-structured DDI & Textual XAI report to the backend terminal
        print_cli_report(report)
        return report

    except Exception as exc:
        log.error("ddi.trigger_failed", profile_id=profile_id, error=str(exc))
        return UserDDIReport(
            profile_id=profile_id,
            user_name=user_name,
            status="ERROR",
            message=f"DDI Pipeline background execution failed: {exc}",
            combinations=[],
        )


def print_cli_report(report: UserDDIReport):
    """Prints a well-structured DDI & Textual XAI report to the backend server terminal."""
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    print("\n" + "=" * 80)
    print("               MEDILINK AI — DDI & TEXTUAL XAI REPORT SUMMARY             ")
    print("=" * 80)
    print(f" Status       : {report.status}")
    print(f" User / Profile: {report.user_name or report.profile_id or 'Unknown'}")
    print(f" Medications  : {report.total_medications} ({', '.join(report.medications_list) if report.medications_list else 'None'})")
    print(f" Combinations : {report.total_combinations}")
    print(f" Interacting  : {report.combinations_with_interactions}")
    print(f" High Risk    : {report.high_risk_combinations}")
    print(f" Generated At : {report.generated_at}")
    print("-" * 80)

    if not report.combinations:
        print(f" Message      : {report.message}")
        print("=" * 80 + "\n")
        return

    print(f"{'Drug Pair':<30} | {'Status':<15} | {'Risk':<12} | {'Interactions'}")
    print("-" * 80)

    for combo in report.combinations:
        pair_str = combo.pair_label[:28]

        if not combo.matched_in_trained_model:
            status_str = "KNOWLEDGE_GAP"
            risk_str = "UNKNOWN"
            detail_str = combo.knowledge_gap_warning or "Missing model knowledge"
        elif combo.has_potential_interaction:
            status_str = "INTERACTION"
            risk_str = combo.overall_risk_level
            top_eff = combo.interactions[0].effect_description if combo.interactions else "Detected"
            detail_str = f"[{len(combo.interactions)} effect(s)] {top_eff}"
        else:
            status_str = "NO_INTERACTION"
            risk_str = "NONE"
            detail_str = "Safe under threshold"

        print(f"{pair_str:<30} | {status_str:<15} | {risk_str:<12} | {detail_str[:40]}")

        if combo.knowledge_gap_warning:
            print(f"   └─ WARNING: {combo.knowledge_gap_warning}")

        if combo.xai_explanation:
            print(f"   └─ [TEXTUAL XAI EXPLANATION]: {combo.xai_explanation}")

    print("=" * 80 + "\n")

