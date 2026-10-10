# MediLink AI — Technical Architecture, ML/XAI Specifications & Domain Knowledge

This document provides a comprehensive technical breakdown of the MediLink AI platform, including recent platform additions, Machine Learning & Explainable AI (XAI) modules, core algorithms, database schemas, system architecture, training methodology, evaluation metrics, and essential medical domain knowledge.

---

## 📌 Executive Summary

**MediLink AI** is an advanced, privacy-first healthcare application designed for secure health record management, document OCR extraction, patient passport auto-population, and automated **Drug-Drug Interaction (DDI) safety verification**. 

The system integrates a **5-Layer FastAPI Processing Pipeline**, **Google Gemini 2.0 Flash LLM**, and the **MediLink-CAMF (Cross-Attention Multi-Modal Fusion)** deep neural network trained on multi-modal biological similarity profiles (Structural, Target, and Gene Ontology features) paired with a **Lightweight Saliency-based Explainable AI (XAI) Engine**.

---

## 1. 🚀 Added Features & Capabilities Overview

| Module / Area | Feature Added | Key Function & Purpose |
| :--- | :--- | :--- |
| **Sample Medical Documents** | 10-Document Suite (`example_medical_docs/`) | Sample medical records covering Cardiology, Pathology, Endocrinology, and Orthopedics to try OCR, passport extraction, and DDI safety without real patient data. |
| **Master Vault PDF** | Combined Vault (`00_Combined_Medical_Record_Vault.pdf`) | 10-page master PDF consolidating sample history across multiple specialists into a single uploadable document. |
| **PDF Generation Engine** | Python Script (`scripts/create_pdf_docs.py`) | ReportLab-based automated script generating structured sample medical PDFs with headers, vitals tables, lab metrics, and prescriptions. |
| **DDI Deep Learning Engine** | MediLink-CAMF Sub-Module (`drug-to-drug-interaction-using-XAI/`) | Multi-modal neural network with cross-attention fusion and latent orthogonality regularization predicting 1,308 distinct drug interaction types across 544 canonical clinical drugs. |
| **Textual XAI Engine** | Saliency & Gradient Attribution (`xai_service.py`) | Lightweight, low-RAM gradient attribution module ($G_i \times x_i$) generating human-readable explanations of AI predictions on GTX 1650/8GB setups. |
| **DDI Safety Tagging Matrix** | Rule & ML Dual Engine | Hybrid verification system yielding `SAFE` (Green), `HIGH RISK` (Red DB Library Hit), `MODERATE RISK` (Yellow ML Model), or `KNOWLEDGE GAP` (Orange Warning). |
| **5-Layer Document Pipeline** | Async FastAPI Ingestion (`backend/app/`) | Seamless ingestion, text parsing, OCR preprocessing, Gemini LLM structured extraction, and Supabase database persistence. |
| **Patient Health Passport** | UI Profile & Timeline (`src/routes/dashboard.profile.tsx`) | Auto-populates UHID, demographics, active conditions, current medications, and past lab history directly from scanned PDFs. |

---

## 2. 🧠 Machine Learning & Explainable AI (XAI) Modules

| Module Name | Model Architecture / Methodology | Input & Dimensionality | Output & Accuracy / Metrics |
| :--- | :--- | :--- | :--- |
| **MediLink-BioFusion Multi-Modal Predictor** | 3 Bio-Projectors + 8-Head Cross-Modal Attention Transformer (CMAT) + Bilinear Modality Gating (BMIG) + Pyramidal Residual Head | **9,582 features** per drug pair ($3,194 \text{ Structural} + 3,194 \text{ Target} + 3,194 \text{ Gene Ontology}$ relative to 1,597 reference drugs) | **94.06% Top-1 Acc**, **99.62% Top-3 Acc**, **93.89% Micro F1** across 119 interaction classes. 7.0M parameters ($85\%$ reduction). See [Model Specification](./drug-to-drug-interaction-using-XAI/MEDILINK_BIOFUSION_MODEL_SPECIFICATION.md). |
| **Structural Bio-Projector** | Dense Factorized Projection with Pre-LayerNorm & GELU | 3,194 SMILES chemical fingerprint similarity scores ($1,597 \times 2$) | Direct semantic representation token ($256$ dimensions; no autoencoders) |
| **Target Bio-Projector** | Dense Factorized Projection with Pre-LayerNorm & GELU | 3,194 protein/receptor target interaction similarity scores ($1,597 \times 2$) | Direct target-binding representation token ($256$ dimensions; no autoencoders) |
| **GO Bio-Projector** | Dense Factorized Projection with Pre-LayerNorm & GELU | 3,194 Gene Ontology cellular pathway similarity scores ($1,597 \times 2$) | Direct biological pathway representation token ($256$ dimensions; no autoencoders) |
| **Cross-Modal Attention Transformer (CMAT)** | 8-Head Multi-Head Attention with Modality Positional Encodings | 3 Modality tokens ($3 \times 256$) | Dynamic cross-attention tokens modeling functional group to pathway crosstalk |
| **Bilinear Modality Gating (BMIG)** | Pairwise Hadamard Interactions + Softmax Gating Network | Cross-attended tokens + pairwise bilinear products | Dynamic modality importance weights ($g_{\text{SS}}, g_{\text{TS}}, g_{\text{GS}}$) feeding $512$-dim fused vector directly into XAI |
| **Pyramidal Residual Classifier** | 3-Stage Hierarchical Downsampling Residual Head | $512 \rightarrow 384 \rightarrow 256 \rightarrow \text{Output}$ | Output classification logits with Pre-LayerNorm and GELU |
| **Real-time Textual XAI Engine** | Input $\times$ Gradient Saliency Backpropagation (`app/services/xai_service.py`) | Real-time pair similarity vectors ($SS, TS, GS$) | Text explanation attributing impact % across Target Binding, GO Pathways, and Structural Similarity |

---

## 3. ⚙️ Core Algorithms & Techniques Implemented

| Algorithm / Technique | Category | Mathematical / Algorithmic Principle | Application in MediLink AI |
| :--- | :--- | :--- | :--- |
| **Cross-Modal Attention Transformer (CMAT)** | Attention Mechanism | $\text{Attn}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V, \quad \mathbf{Z}_{\text{att}} = \text{LN}(\mathbf{Z} + \text{MHA}(\mathbf{Z}))$ | Dynamically models inter-modality biological dependencies across chemical structure, target binding, and pathways. |
| **Bilinear Modality Gating (BMIG)** | Bilinear Interaction | $\mathbf{h}_{\text{inter}} = \text{Linear}([\mathbf{z}_{\text{SS}} \odot \mathbf{z}_{\text{TS}} \,\|\, \mathbf{z}_{\text{SS}} \odot \mathbf{z}_{\text{GS}} \,\|\, \mathbf{z}_{\text{TS}} \odot \mathbf{z}_{\text{GS}}])$ | Computes pairwise biological cross-talk and dynamic softmax modality importance weights. |
| **Pyramidal Residual Classification** | Deep Learning | $\mathbf{h}_{l+1} = \text{GELU}(W_{l+1} \text{LN}(\mathbf{h}_l)) + W_{\text{res}} \mathbf{h}_l$ | Downsamples $512 \rightarrow 384 \rightarrow 256 \rightarrow \text{Logits}$ with residual skip connections. |
| **Focal Multi-Label BCE Loss** | Optimization Loss | $\mathcal{L}_{\text{Focal}} = -\sum (1 - p_t)^\gamma \log(p_t) \quad (\gamma=2.0)$ | Prevents class imbalance degradation across rare and frequent adverse drug interaction labels. |
| **Cosine Annealing Optimization** | Learning Rate Schedule | $\eta_t = \eta_{\min} + \frac{1}{2}(\eta_{\max} - \eta_{\min})(1 + \cos(\frac{t}{T_{\max}}\pi))$ | Smoothly decays learning rate from $3 \times 10^{-4}$ down to $10^{-6}$ for stable convergence. |
| **Gradient-Based Saliency Attribution** | Explainable AI | $S_m = \left| \frac{\partial \text{Logit}_{\max}}{\partial X_m} \right| \times \text{mean}(|X_m|)$ | Calculates real-time modality contribution percentages ($SS\%, TS\%, GS\%$) on low-end hardware. |
| **Kernel SHAP (Shapley Values)** | Game Theory / XAI | $\phi_i = \sum_{S \subseteq F \setminus \{i\}} \frac{|S|!(|F|-|S|-1)!}{|F|!} [f(S \cup \{i\}) - f(S)]$ | Computes exact feature attributions for offline visual model validation. |
| **Cosine & Jaccard Bio-Similarity** | Distance Metric | $Sim(D_A, D_B) = \frac{\mathbf{v}_A \cdot \mathbf{v}_B}{\|\mathbf{v}_A\| \|\mathbf{v}_B\|}$ | Constructs the pairwise structural, target, and GO matrices relative to the DrugBank reference cohort. |
| **Regex String Normalization** | Text Processing | `re.sub(r'[^a-z0-9]', '', drug_name.lower())` | Normalizes brand names (e.g., *Pan 40*, *Ibuprofen 400mg*) to DrugBank canonical keys. |
| **Structured LLM Prompting** | NLP / LLM Reasoning | Few-shot schema-enforced JSON extraction via Gemini 2.0 | Transforms raw PDF text into structured JSON containing vitals, labs, and prescriptions. |

---

## 4. 🗄️ Database, Datasets & System Architecture

### A. Database Schemas (Supabase Postgres)

| Table Name | Primary Keys & References | Stored Data & Purpose |
| :--- | :--- | :--- |
| `profiles` | `id` (UUID, refs `auth.users`) | User demographics, UHID (`ML-100231`), blood group, AI health summary. |
| `documents` | `id` (UUID), `profile_id` (refs `profiles`) | Document metadata, raw file storage paths, upload timestamp, processing status. |
| `ai_analysis_results` | `id` (UUID), `document_id` (refs `documents`) | Complete raw LLM output JSON, doctor details, diagnosis notes, confidence score. |
| `extracted_medical_values` | `id` (UUID), `analysis_id` (refs `ai_analysis_results`)| Flattened lab parameters (Hb, HbA1c, BP, Vitamin D) with unit, value, and reference ranges. |
| `notifications` | `id` (UUID), `profile_id` (refs `profiles`) | User alerts for document processing success, DDI high-risk flags, and system events. |
| `shared_links` | `id` (UUID), `token` (String) | Consent-based QR access links with expiration timestamps for doctor sharing. |

---

### B. Datasets & Feature Dimensionality Specification

| Dataset Name | Source / Format | Size & Dimensions | Use Case in Project |
| :--- | :--- | :--- | :--- |
| **DrugBank Reference Benchmark Vocabulary** | DrugBank Database v5.0 | **1,597 Approved Reference Drugs**, 1,308 interaction types | Provides canonical biological feature space across approved pharmaceuticals. |
| **Structural Similarity Matrix (SS)** | SMILES Morgan Fingerprints / Tanimoto | $1,597 \times 1,597$ matrix ($3,194$ paired features) | Measures chemical structure similarity for paired drug inputs ($1,597 \times 2 = 3,194$). |
| **Target Similarity Matrix (TS)** | UniProt Protein Targets / Jaccard | $1,597 \times 1,597$ matrix ($3,194$ paired features) | Measures shared receptor and enzyme binding profiles ($1,597 \times 2 = 3,194$). |
| **Gene Ontology Matrix (GS)** | GO Biological Process Annotations / Resnik | $1,597 \times 1,597$ matrix ($3,194$ paired features) | Measures shared cellular and biological functional pathways ($1,597 \times 2 = 3,194$). |
| **MediLink Clinical Formulary** | Clinical Hospital Formulary | **544 Active Formulations** | Curated high-frequency clinical medications indexed in MediLink for instant bedside verification. |
| **Sample Medical Documents (`example_medical_docs/`)** | ReportLab PDF Generator | **10 PDF Documents** + 1 Combined Master Vault | System verification, demo presentation, OCR, and DDI pipeline testing. |

---

### C. 5-Layer System Architecture Flow

```mermaid
graph TD
    A["Client Upload (React / TanStack)"] -->|Multipart PDF| B["Layer 1: Ingestion (FastAPI)"]
    B --> C["Layer 2: Document Extraction (Kreuzberg / PyPDF)"]
    C --> D["Layer 3: Preprocessing & Text Cleanup"]
    D --> E["Layer 4: LLM Reasoning (Gemini 2.0 Flash)"]
    E --> F["Layer 5: Persistence (Supabase DB & Storage)"]
    F --> G["MediLink-BioFusion Engine (Cross-Modal Transformer + Saliency XAI)"]
    G --> H["Frontend Dashboard (Patient Passport & DDI Safety Tagging)"]
```

---

## 5. 🔬 Model Training Workflow & Hyperparameters

### A. MediLink-BioFusion Training Architecture

```mermaid
flowchart TD
    subgraph InputProfiles["Biological Multi-Modal Inputs (9,582 Dimensions)"]
        Sub1["Modality 1: Chemical Structure (3,194)"]
        Sub2["Modality 2: Target Binding (3,194)"]
        Sub3["Modality 3: GO Pathway (3,194)"]
    end

    Sub1 --> Proj1["Bio-Projector SS (3,194 -> 512 -> 256)"]
    Sub2 --> Proj2["Bio-Projector TS (3,194 -> 512 -> 256)"]
    Sub3 --> Proj3["Bio-Projector GS (3,194 -> 512 -> 256)"]

    Proj1 --> CMAT["Cross-Modal Attention Transformer (CMAT, 8 Heads, 256-dim)"]
    Proj2 --> CMAT
    Proj3 --> CMAT

    CMAT --> BMIG["Bilinear Modality Gating & Interaction (BMIG, 512-dim)"]
    Proj1 -.-> BMIG
    Proj2 -.-> BMIG
    Proj3 -.-> BMIG

    BMIG --> ResHead["Pyramidal Residual Classifier (512 -> 384 -> 256)"]
    ResHead --> Loss["Focal Multi-Label BCE Loss + Cosine Annealing (lr=0.0003)"]
```

1. **Multi-Modal Bio-Projection**: Direct non-linear projection mapping each 3,194 similarity vector into a 256-dimensional semantic token with Pre-LayerNorm and GELU (no autoencoders).
2. **Cross-Modal Attention Transformer (CMAT)**: 8-head multi-head cross-attention across the 3 modality tokens with learned positional embeddings.
3. **Bilinear Modality Gating & Interaction (BMIG)**: Calculates pairwise Hadamard interactions and dynamic Softmax Modality Gating ($g_{\text{SS}}, g_{\text{TS}}, g_{\text{GS}}$), yielding a unified 512-dimensional representation.
4. **Pyramidal Residual Classification**: Downsamples through Pre-LayerNorm residual blocks ($512 \rightarrow 384 \rightarrow 256$) with GELU activations.
5. **Unified Focal Optimization**: Single-pass backpropagation with Focal BCE Loss and Cosine Annealing learning rate schedule.

---

### B. Clean Training Hyperparameters

| Hyperparameter | Value | Description |
| :--- | :--- | :--- |
| `model_name` | `MediLink-BioFusion` | Proprietary Multi-Modal Gated Transformer architecture. |
| `input_size` | `3194` | Feature dimension per modality ($1,597 \text{ reference drugs} \times 2$). |
| `projector_dim` | `256` | Modality representation token dimension. |
| `hidden_dim` | `512` | Fused bilinear representation dimension. |
| `num_heads` | `8` | Multi-Head Cross-Attention heads in CMAT. |
| `output_size` | `106` | Multi-label target interaction classes. |
| `lr` | `0.0003` | Learning rate for AdamW optimizer ($3 \times 10^{-4}$). |
| `scheduler` | `CosineAnnealingLR` | Cosine learning rate decay down to $10^{-6}$. |
| `drop_rate` | `0.15` | Pre-LayerNorm Dropout probability. |
| `batch_size` | `128` | Training batch size per iteration. |
| `epoch` | `120` | Training epochs with early stopping patience = 10. |
| `loss` | `Focal BCE` | Focal loss with label smoothing ($\gamma=2.0$). |

---

### D. Benchmark Metrics on 37,652 Unseen Test Drug Pairs (Fold 0)

$$\text{Sigmoid}(\text{Logit}) > 0.5 \implies \text{Positive Interaction Flagged}$$

| Metric | Score | Clinical & Scientific Meaning |
| :--- | :--- | :--- |
| **Exact Subset Accuracy** | **96.49%** | Overall exact match percentage across all interaction labels for test pairs. |
| **Micro Recall** | **96.96%** | **Catches Dangerous Risks:** Measures total global True Positives over actual real-world interactions ($\frac{\sum TP}{\sum TP + \sum FN}$). |
| **Micro Precision** | **96.67%** | **Prevents False Alarms:** Measures global True Positives over total flagged interactions ($\frac{\sum TP}{\sum TP + \sum FP}$). |
| **Macro Recall** | **94.72%** | Unweighted average recall across all individual interaction types, ensuring high accuracy on **rare interaction types**. |
| **Macro Precision** | **94.71%** | Unweighted average precision across all individual interaction types. |

---

## 6. 🏥 Essential Medical Domain Knowledge for Presentations

When building or presenting **MediLink AI**, the following medical concepts and clinical interactions are fundamental:

| Medical Topic / Area | Clinical Detail & Biomarkers | Relevance in MediLink AI & Patient Passport |
| :--- | :--- | :--- |
| **Drug-Drug Interaction (DDI)** | Adverse pharmacological effects occurring when two or more drugs are taken concurrently. | Core safety engine preventing dangerous co-prescriptions. |
| **NSAID + Antihypertensive Blunting** | **Amlodipine + Ibuprofen** interaction.<br>NSAIDs inhibit renal prostaglandins, causing fluid retention and reducing the BP-lowering effectiveness of Calcium Channel Blockers. | Tested via **Doc 03 & Doc 08**.<br>Yields **`HIGH RISK`** red warning flag. |
| **Glycemic Monitoring (HbA1c)** | Glycated Hemoglobin levels reflecting 3-month average blood glucose:<br>• Normal: $< 5.7\%$<br>• Prediabetes: $5.7\% - 6.4\%$<br>• Diabetes: $\ge 6.5\%$ | Tested via **Doc 05 (6.9%)** & **Doc 06 (6.2%)** showing diabetes onset and improvement. |
| **Anemia & Iron Metabolism** | Hemoglobin reference range: $13.5 - 17.5 \text{ g/dL}$ (Male).<br>Vitamin D deficiency: $< 30 \text{ ng/mL}$. | Tested via **Doc 02** ($\text{Hb } 10.8 \text{ g/dL}$, $\text{Vit D } 18 \text{ ng/mL}$). Triggers Ferrous Sulfate & Vitamin D3. |
| **Safe Analgesic Alternatives** | **Paracetamol (Acetaminophen)** does not inhibit renal prostaglandins or alter blood pressure. | Tested via **Doc 09**.<br>Yields **`SAFE`** green verification tag when combined with Amlodipine. |
| **Specialist Workflow Hierarchy** | Medical history spans multiple clinical disciplines: Cardiology, Endocrinology, Pathology, Orthopedics. | MediLink AI aggregates multi-specialty records into a single patient passport timeline. |
| **UHID System** | Universal Health Identifier (e.g., `ML-100231`) linking records across different hospitals. | Standardizes cross-institutional patient identification. |

---

## 7. 🤖 Multi-Layered Hybrid RAG Architecture & Ingestion Pipeline

### A. 4-Tier Hybrid RAG Retrieval Engine

MediLink AI implements a **4-Tier Hybrid RAG Engine** that combines global live research, dynamic patient data, multi-modal neural matrices, and offline vector retrieval:

| Tier | Engine / Knowledge Source | Scale & Knowledge Depth | Retrieval Technique & Implementation Details |
| :--- | :--- | :--- | :--- |
| **Tier 1 (Live Global)** | **NCBI PubMed Clinical Research** | **36,000,000+ Studies** | Live E-utilities REST API (`esearch` + `esummary`) fetching real-time peer-reviewed clinical trials, PMIDs, and journal articles. |
| **Tier 2 (Patient Context)** | **Supabase Patient Health Vault** | **Dynamic Per-User Vault** | Real-time SQL retrieval of user-uploaded PDF medical records, extracted lab parameters, and prescription history. |
| **Tier 3 (Multi-Modal ML)** | **DrugBank DDI GNN Matrix** | **147,748 Drug Pairs / 544 Compounds** | PyTorch neural network matrix space evaluating Structural, Target Binding, and Gene Ontology features ($9,582 \text{ dimensions}$). |
| **Tier 4 (Offline Vectorstore)** | **Qdrant Hybrid Vector Store** | **FastEmbed BM25 + Dense Embeddings** | Offline Qdrant vector database (`medical_assistance_rag`) equipped with TinyBERT Cross-Encoder reranking for specialized medical literature. |

---

### B. Automated Document Ingestion Pipeline

The offline vector pipeline (`backend/app/agents/rag_agent/`) is fully automated for ingesting large medical textbooks, clinical guidelines, and research PDFs into Qdrant:

```python
from app.agents.config import Config
from app.agents.rag_agent import MedicalRAG

# Ingest any directory of medical PDFs or textbooks into Qdrant vectorstore
rag = MedicalRAG(Config())
rag.ingest_directory("app/agents/data/raw")
```

1. **Document Parsing**: Parses raw PDFs via `MedicalDocParser` (extracting text, tables, and figure captions).
2. **Chunking & Preprocessing**: `ContentProcessor` splits text into 512-token chunks with 50-token semantic overlaps.
3. **Dual Hybrid Indexing**: Generates **FastEmbed BM25 sparse vectors** for exact clinical keyword matching and **Dense Embeddings** for semantic similarity.
4. **Cross-Encoder Reranking**: Re-ranks top Qdrant candidate passages using TinyBERT Cross-Encoder relevance scoring before LLM synthesis.

---

### C. Live NCBI PubMed Search Integration

- **Live NCBI E-Utilities API**: Executes real-time REST HTTP queries to `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/` (`esearch` + `esummary`).
- **Citation Metadata**: Extracts paper titles, lead authors, publication dates, journal sources, and direct PMID URLs (`https://pubmed.ncbi.nlm.nih.gov/{pmid}/`).
- **Real-Time Synthesis**: Automatically triggers PubMed searches when queries ask about clinical guidelines, recent medical discoveries, or drug interaction mechanisms.

---

### D. Multi-Model Rate-Limit Fallback Strategy

To prevent API quota outages (`429 RESOURCE_EXHAUSTED`), MediLink AI implements an automatic fallback chain:

```mermaid
flowchart LR
    A["Primary: Gemini 3.5 Flash"] -->|If 429 Quota Exceeded| B["Fallback 1: Gemini 3.1 Flash Lite"]
    B -->|If 429 Quota Exceeded| C["Fallback 2: Gemini 2.5 Flash"]
```

---

### E. Interactive Framer Motion Chatbot UI & Supabase Action Chips

- **Framer Motion Animations**: Drawer slide-in animation (`x: "100%"` → `x: 0`) with tactile spring physics (`damping: 28, stiffness: 300`) and backdrop blur.
- **Agentic Tool Execution Log**: Displays live progress indicators (*Searching PubMed*, *Fetching Patient Records*, *Evaluating GNN Matrix*) and collapsible tool step accordions.
- **Interactive Action Chips (CTAs)**: Auto-detects mentioned medications/allergies and renders action buttons (`Add "Amlodipine" to Profile`) that execute live `INSERT` operations into Supabase `extracted_medical_values`.

---

### F. Local-First Deterministic Parsing & Consolidated Batch Ingestion

To minimize API token costs and eliminate rate-limit errors during multi-document uploads:
1. **Local Deterministic Extractor (`LocalMedicalParser`)**: Parses Kreuzberg/PyPDF text locally ($0.00 API cost) using regex patterns to extract lab values (BP `146/92 mmHg`, `HbA1c 6.9%`, `Hemoglobin 10.8 g/dL`), prescriptions, conditions, and categories.
2. **Consolidated Single-Request Batch Ingestion (`POST /documents/upload-batch`)**: When multiple files are uploaded at once, the backend extracts text locally and bundles all document contents into **1 single Gemini prompt payload**, saving 80–90% of API requests.

---

### G. Gemini-Directed UI Citation Tagging (`[CITED_DOCS: ...]`)

- **Full Vault Context**: All user document summaries and IDs are provided to Gemini in `PATIENT MEDICAL DOCUMENTS IN VAULT:` context.
- **LLM Citation Output**: Prompt instructs Gemini to append `[CITED_DOCS: doc_id_1, doc_id_2]` listing only the specific document IDs referenced in its synthesized answer.
- **UI Citation Rendering**: The backend parses `[CITED_DOCS: ...]` and renders **ONLY** the exact document cards Gemini cited under `RETRIEVED EVIDENCE & CITATIONS`.

---

## 8. 📚 Academic Bibliography & References

1. **Baseline Multi-Modal DDI Model**: Lee, G., Park, C., & Ahn, J. (2019). *Novel deep learning model for more accurate prediction of drug-drug interaction effects.* **BMC Bioinformatics**, 20(Suppl 16), 502. https://doi.org/10.1186/s12859-019-3084-5
2. **DeepDDI**: Ryu, J. Y., Kim, H. U., & Lee, S. Y. (2018). *Deep learning improves prediction of drug-drug and drug-food interactions.* **Proceedings of the National Academy of Sciences (PNAS)**, 115(18), E4304-E4311. https://doi.org/10.1073/pnas.1803294115
3. **Decagon (Graph DDI)**: Zitnik, M., Agrawal, M., & Leskovec, J. (2018). *Modeling polypharmacy side effects with graph convolutional networks.* **Bioinformatics**, 34(13), i457-i466. https://doi.org/10.1093/bioinformatics/bty294
4. **Explainable AI (Integrated Gradients)**: Sundararajan, M., Taly, A., & Yan, Q. (2017). *Axiomatic attribution for deep networks.* **International Conference on Machine Learning (ICML)**, 3319-3328.
5. **SHAP (Shapley Additive Explanations)**: Lundberg, S. M., & Lee, S. I. (2017). *A unified approach to interpreting model predictions.* **Advances in Neural Information Processing Systems (NeurIPS)**, 30, 4765-4774.
6. **DrugBank**: Wishart, D. S., et al. (2018). *DrugBank 5.0: a major update to the DrugBank database for 2018.* **Nucleic Acids Research**, 46(D1), D1074-D1082. https://doi.org/10.1093/nar/gkx1037
