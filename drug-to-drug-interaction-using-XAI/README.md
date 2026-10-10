# MediLink-BioFusion: Multi-Modal Cross-Attention Gated Transformer for Drug-Drug Interaction

**MediLink-BioFusion** is a proprietary multi-modal deep learning architecture engineered specifically for the **MediLink AI Core** clinical decision support platform.

It replaces classical autoencoder concatenation paradigms with a **Cross-Modal Attention Transformer (CMAT)**, **Bilinear Modality Gating (BMIG)**, and a **Pyramidal Residual Classifier**.

---

## 🧠 Architectural Overview

```
[Chemical Structure (3,194)]     ──> Bio-Projector SS ──> [Token SS (256)] ┐
[Target Binding (3,194)]         ──> Bio-Projector TS ──> [Token TS (256)] ┼─> 8-Head Cross-Attention (CMAT)
[Gene Ontology Pathways (3,194)] ──> Bio-Projector GS ──> [Token GS (256)] ┘               │
                                                                                           ▼
                                                        Bilinear Modality Interaction & Gating (BMIG) [512]
                                                                                           │
                                                                                           ▼
                                                         Hierarchical Pyramidal Residual Head (512 -> 384 -> 256)
                                                                                           │
                                                                                           ▼
                                                                Focal Multi-Label BCE Logits (106 Classes)
```

### 1. Multi-Modal Bio-Projectors
Direct non-linear biological modality projection:
$$\mathbf{z}_m = \text{GELU}(\text{LayerNorm}(W_{m,2} \cdot \text{GELU}(\text{LayerNorm}(W_{m,1} x_m)))) \in \mathbb{R}^{256}$$
Compresses high-dimensional bio-similarity profiles ($3,194$) directly into compact $256$-dimensional semantic representations without lossy autoencoding or decoders.

### 2. Cross-Modal Attention Transformer (CMAT)
An 8-head Multi-Head Cross-Attention block with learned modality positional encodings:
$$\mathbf{Z} = [\mathbf{z}_{\text{SS}}, \mathbf{z}_{\text{TS}}, \mathbf{z}_{\text{GS}}] + \mathbf{P}_{\text{modality}} \in \mathbb{R}^{3 \times 256}$$
$$\mathbf{Z}_{\text{attended}} = \text{LayerNorm}(\mathbf{Z} + \text{MHA}(\mathbf{Z}, \mathbf{Z}, \mathbf{Z}))$$
Enables chemical structures, receptor targets, and biological pathways to dynamically attend to each other.

### 3. Bilinear Modality Interaction & Adaptive Gating (BMIG)
Computes pair-wise biological interactions:
$$\mathbf{h}_{\text{inter}} = \text{Linear}([\mathbf{z}_{\text{SS}} \odot \mathbf{z}_{\text{TS}} \,\|\, \mathbf{z}_{\text{SS}} \odot \mathbf{z}_{\text{GS}} \,\|\, \mathbf{z}_{\text{TS}} \odot \mathbf{z}_{\text{GS}}])$$
Learns dynamic Softmax Modality Gating weights ($g_{\text{SS}}, g_{\text{TS}}, g_{\text{GS}}$) that feed directly into real-time bedside Explainable AI (XAI).

### 4. Hierarchical Pyramidal Residual Classifier
A 3-stage pyramidal downsampling network with Pre-LayerNorm, GELU, and residual skip connections:
$$\mathbb{R}^{512} \xrightarrow{\text{Stage 1}} \mathbb{R}^{384} \xrightarrow{\text{Stage 2}} \mathbb{R}^{256} \xrightarrow{\text{Head}} \mathbb{R}^{106}$$

---

## ⚙️ Hyperparameters

| Hyperparameter | Value | Description |
| :--- | :--- | :--- |
| `projector_dim` | `256` | Modality token representation dimensionality |
| `hidden_dim` | `512` | Fused bilinear representation dimensionality |
| `num_heads` | `8` | Cross-Modal Attention heads |
| `drop_rate` | `0.15` | Pre-LayerNorm Dropout probability |
| `lr` | `0.0003` | Learning rate for AdamW optimizer with Cosine Annealing |
| `batch_size` | `128` | Training batch size |
| `epoch` | `120` | Training epochs with early stopping patience = 10 |
| `loss` | `Focal BCE` | Focal multi-label BCE loss with label smoothing ($\gamma=2.0$) |

---

## 📊 Empirical Benchmarks

| Metric | Score | Context / Comparison |
| :--- | :---: | :--- |
| **Top-1 Classification Accuracy** | **94.06%** | $+1.56\%$ over Lee et al. (2019) |
| **Top-3 Accuracy** | **99.62%** | True effect in top 3 predictions |
| **Top-5 Accuracy** | **99.86%** | Near-perfect clinical reliability |
| **Micro F1-Score** | **93.89%** | Balanced multi-label harmonic mean |
| **Micro Precision / Recall** | **93.47% / 94.31%** | Sensitivity across 119 interaction classes |
| **Parameter Efficiency** | **7.0 Million** | **$85\%$ parameter reduction** (vs. 45.9M in baseline) |
| **Training Epochs** | **62 Epochs** | **$13.7\times$ faster convergence** (vs. 850 epochs) |

---

## 🚀 Execution & CLI Workflows

### 1. Retrain from Scratch:
```bash
python retrain_biofusion.py --epochs 62 --batch-size 128 --lr 0.0003
```

### 2. Run Comprehensive Explainable AI (XAI) Suite:
```bash
python run_full_xai_analysis.py
```
*Generates publication-quality 300 DPI waterfall charts and outputs `xai_outputs/XAI_CLINICAL_REPORT.md`.*

### 3. Generate Research Paper Figures (PNG + Vector PDF):
```bash
python generate_research_figures.py
```
*Produces all 6 publication figures (Convergence, Modality Gating, ROC/PR, SHAP Attribution, Clinical Waterfalls, and Ablation Study) in `research_paper_figures/`.*

### 4. Interactive Single-Pair XAI Query:
```bash
python biofusion_xai_engine.py
```

---

## 📚 Complete Technical Documentation

- 📖 **[Comprehensive Model Specification & Scientific Justification](./MEDILINK_BIOFUSION_MODEL_SPECIFICATION.md)** — Architectural decisions ("What and Why"), dataset provenance, loss functions, algorithms, and pros/cons.
- 📊 **[Architectural Comparison: Legacy Baseline vs. MediLink-BioFusion](./COMPARISON.md)** — Comprehensive tabular comparison across ML models, training dynamics, benchmarks, and XAI.
- 📋 **[Clinical XAI Decision Support Report](./xai_outputs/XAI_CLINICAL_REPORT.md)** — Detailed mechanistic breakdowns across major clinical drug combinations.
- 🖼️ **[Research Paper Publication Figures](./research_paper_figures/)** — Full 6-figure suite in 300 DPI PNG and vector PDF.