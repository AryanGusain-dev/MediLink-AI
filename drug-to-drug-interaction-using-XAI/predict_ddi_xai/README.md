# MediLink-BioFusion: Advanced Explainable AI (XAI) Suite

This directory contains the Explainable AI (XAI) framework for the **MediLink-BioFusion Multi-Modal Cross-Attention Gated Transformer** model.

It replaces classical black-box perturbation with a **Dual-Stream XAI Framework**:

---

## 🔬 Novel XAI Architectural Methodology

1. **Architectural Intrinsic Explainability**:
   * **Dynamic Modality Gating**: Directly extracts the Softmax gate weights ($g_{\text{SS}}, g_{\text{TS}}, g_{\text{GS}}$) from the Bilinear Modality Gating layer (`BMIG`), revealing how much the network relies on Chemical Structure vs. Target Binding vs. Gene Ontology.
   * **Cross-Modal Attention Maps**: Multi-head attention matrices ($3 \times 3$) revealing cross-talk between functional chemical groups and cellular pathways.

2. **Path-Integral Integrated Gradients (*Sundararajan et al., ICML 2017*)**:
   * Axiomatically justified path integrals across all 9,582 biological similarity dimensions relative to a biologically grounded zero-similarity baseline.

3. **Biological Entity Grounding**:
   * Maps numerical feature indices directly back to canonical **DrugBank reference drugs and protein targets**, eliminating uninterpretable feature numbers.

4. **Multi-Modal Clinical Waterfall Attributions**:
   * Decomposes the final prediction risk into additive biological stages ($\text{Baseline} \rightarrow \Delta_{\text{SS}} \rightarrow \Delta_{\text{TS}} \rightarrow \Delta_{\text{GS}} \rightarrow \text{Final Risk}$).

---

## 📁 Key Components

* **`biofusion_xai_engine.py`**: Standalone production XAI engine with Integrated Gradients, Modality Gating, Entity Grounding, and 300 DPI plotting.
* **`run_full_xai_analysis.py`**: Automated clinical evaluation across benchmark drug pairs.
* **`xai_outputs/`**: Generated 300 DPI publication waterfall plots and clinical markdown reports.
* **`research_paper_figures/`**: Full 6-figure publication-ready figures suite (both PNG and vector PDF).

---

## 📚 Technical Documentation

- 📖 **[MediLink-BioFusion Model Specification](../MEDILINK_BIOFUSION_MODEL_SPECIFICATION.md)** — Architectural decisions ("What and Why"), dataset provenance, loss functions, algorithms, and pros/cons.
- 📊 **[Architectural Comparison: Legacy Baseline vs. MediLink-BioFusion](../COMPARISON.md)** — Comprehensive tabular comparison across ML models, training dynamics, benchmarks, and XAI suite.
