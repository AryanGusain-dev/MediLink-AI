# SHAP-Based Explainability for Drug-Drug Interaction Prediction

This directory contains the Kernel SHAP Explainable AI (XAI) analysis pipeline for the MediLink AI Multi-Modal Drug-Drug Interaction (DDI) deep learning model.

## 🛠️ Module Workflow Components

1. **`sampling.py`**: Generates representative input samples used as background and evaluation data for the SHAP Kernel Explainer.
2. **`shap_analysis_kernel.py`**: Runs the Kernel SHAP Explainer across interaction labels to compute feature attributions across Structural, Target, and Gene Ontology similarity features.
3. **`shap_visualization.ipynb`**: Generates global importance plots (bar, beeswarm) and local explanation plots (waterfall charts) of SHAP results.
4. **`48_waterfall_plots.pdf`**: Pre-rendered qualitative waterfall charts for 48 evaluated drug interaction pairs.

## 📌 Implementation Notes

* All SHAP computations use **Kernel SHAP**, which is model-agnostic and well-suited for high-dimensional multi-modal similarity profiles (9,582 features).
* Local explanations break down the positive and negative logit contributions of each feature to explain specific drug interaction predictions.
