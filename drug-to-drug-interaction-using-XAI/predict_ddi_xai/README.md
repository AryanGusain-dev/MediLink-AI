# predict_ddi_xai: SHAP-Based Explainability for Drug-Drug Interaction Prediction:

This repository contains the code used to run Kernel SHAP explanations for the [thisishe/predict_ddi](https://github.com/thisishe/predict_ddi/tree/master) model developed by Lee et al., as reported in the paper:

A Case Study in Explainable AI for Drug-Drug Interaction Prediction: A SHAP-Based Approach

The workflow consists of four main components:

`edited_run.py` a modified version of the original `run.py` from the predict_ddi repository that initializes and trains the model for SHAP analysis.

`sampling.py` generates representative input samples used as background and evaluation data for the SHAP Kernel Explainer.

`shap_analysis_kernel.py` runs the Kernel SHAP Explainer to compute SHAP values for model predictions.

`shap_visualization.ipynb` generates global (e.g., bar, beeswarm) and local (e.g., waterfall) visualizations of SHAP results.

**Notes:** 

Waterfall plots for the 48 selected samples are included in the accompanying PDF file for qualitative analysis of local explanations.

This project builds on the original architecture by Lee et al. Please refer to their repository for model details and dependencies.
All SHAP computations use Kernel SHAP, which is model-agnostic and well-suited for high-dimensional input spaces like similarity profiles.
