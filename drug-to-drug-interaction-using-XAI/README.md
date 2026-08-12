# Drug-Drug Interaction Prediction with Explainable AI (XAI)

This folder contains a multi-modal deep learning framework to predict multi-label Drug-Drug Interaction (DDI) effects. The architecture combines Autoencoders for feature compression across three bio-similarity modalities (Structural, Target, and Gene Ontology) followed by a Deep Neural Network (DNN) predictor, alongside a SHAP-based Explainable AI (XAI) pipeline.

This is a sub-module of the **MediLink AI Core** repository.

---

## 📊 Pre-Trained Model Status & Performance

> [!NOTE]
> **The model is ALREADY pre-trained** and ready for inference and evaluation.
> Download it from: [Download from gdrive](https://drive.google.com/file/d/13mc5u2DxLC5NmHdC4H0qCvJztei7PvkU/view?usp=sharing)  
> Save it at `./savepoints/0/model_checkpoint` within the folder (drug-to-drug-interaction-using-XAI).

Evaluated on **37,652 test drug-pair samples** (Fold 0):    

| Metric | Score |
| :--- | :--- |
| **Accuracy** | **96.49%** |
| **Macro Recall** | **94.72%** |
| **Macro Precision** | **94.71%** |
| **Micro Recall** | **96.96%** |
| **Micro Precision** | **96.67%** |

---

## 🛠️ Environment Setup

Navigate to this sub-directory from the root of the main repository:

```bash
cd backen
```

Ensure your Python virtual environment is activated, then install the required dependencies:

```bash
pip install torch numpy pandas scikit-learn shap matplotlib joblib
```
or do 

```bash
pip install -r requirements.txt
```

---

## 🚀 Usage Guide

All commands should be executed from within the `drug-to-drug-interaction-using-XAI` directory.

### 1. Evaluate Pre-Trained Model
To verify accuracy and evaluation metrics on the test dataset:

Run `model_evaluation.ipynb` or execute in Python:
```bash
python -c "
import torch, json, pandas as pd, sys
sys.path.append('./src')
from model import build_model
from utils import convert_tensor, evaluate_model

with open('./data/hyperparameter.json') as fp: hparam = json.load(fp)
x, y = pd.read_pickle('./savepoints/0/test_data.pkl')
SS_mat = pd.read_pickle('./data/structural_similarity_matrix.pkl')
TS_mat = pd.read_pickle('./data/target_similarity_matrix.pkl')
GS_mat = pd.read_pickle('./data/GO_similarity_matrix.pkl')
mlb = pd.read_pickle('./data/mlb.pkl')
idx2label = pd.read_pickle('./data/idx2label.pkl')

SS, TS, GS, y_true = convert_tensor(x, y, SS_mat, TS_mat, GS_mat, mlb, idx2label)
model = build_model(hparam)
model.load_model('./savepoints/0/model_checkpoint')
model.eval()

with torch.no_grad():
    _, _, _, pred = model(SS, TS, GS)
    pred_bin = (torch.sigmoid(pred) > 0.5).int().numpy()

acc, ma_rc, ma_pc, mi_rc, mi_pc = evaluate_model(y_true.numpy(), pred_bin)
print(f'Accuracy: {acc:.4f} | Macro Recall: {ma_rc:.4f} | Micro Recall: {mi_rc:.4f}')
"
```

---

### 2. Train Model from Scratch *(Optional - Pre-trained Weights Provided)*
If you wish to retrain the 5-fold cross-validation model:

```bash
python src/run.py
```
*Note: Training is already completed and saved in `./savepoints/0/`.*

---

## 🔍 Explainable AI (XAI) & SHAP Analysis

The `predict_ddi_xai/` directory provides **Kernel SHAP explanations** across all 9,582 similarity features ($3,194 \text{ SS} + 3,194 \text{ TS} + 3,194 \text{ GS}$).

### Step 1: Sample Representative Background & Test Data
Generates background reference pairs (`shap_train_final.npz`) and target test pairs (`shap_test_final.npz`):
```bash
python predict_ddi_xai/sampling.py
```

### Step 2: Compute Kernel SHAP Feature Attributions
Computes SHAP values in batches across interaction labels:
```bash
python predict_ddi_xai/shap_analysis_kernel.py
```
*(Saves batch pickles as `shap_final_kernel_batch_<idx>.pkl`)*

### Step 3: Visualize Explanations
Open and run **`predict_ddi_xai/shap_visualization.ipynb`** to generate:
- **Global Importance**: Beeswarm plots & top $| \text{SHAP} |$ feature bar charts.
- **Local Explanations**: Waterfall plots for specific drug-drug pairs showing feature push/pull logit contributions.
- **Pre-rendered PDF**: View `predict_ddi_xai/48_waterfall_plots.pdf` for 48 evaluated drug interaction waterfall charts.

---

## 📁 Folder Structure

```
drug-to-drug-interaction-using-XAI/
├── data/                       # Similarity matrices (SS, TS, GS) & label pickles
├── savepoints/
│   └── 0/
│       ├── model_checkpoint    # Pre-trained model weights (183 MB)
│       └── test_data.pkl       # Test partition data
├── src/
│   ├── model.py                # Autoencoder + DNN PyTorch architecture
│   ├── run.py                  # Training pipeline script
│   └── utils.py                # Data loading & evaluation metrics
├── predict_ddi_xai/            # Explainable AI module
│   ├── sampling.py             # SHAP background/test sampling
│   ├── shap_analysis_kernel.py # Kernel SHAP computation
│   ├── shap_visualization.ipynb# SHAP plotting notebook
│   └── 48_waterfall_plots.pdf  # Qualitative waterfall charts
├── model_evaluation.ipynb      # Notebook for benchmark evaluation
└── README.md                   # Project documentation
```