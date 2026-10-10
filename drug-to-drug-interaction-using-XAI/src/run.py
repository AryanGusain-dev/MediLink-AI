"""
MediLink-BioFusion Training Pipeline.
Executes training for the novel MediLink-BioFusion Multi-Modal Transformer architecture.
"""

import json
import os
import sys
import numpy as np
import pandas as pd
import torch
from sklearn.model_selection import StratifiedKFold

from model import build_model
from utils import convert_tensor, index_data


def main():
    data_dir = "../data" if os.path.exists("../data") else "./data"
    save_dir = "../savepoints" if os.path.exists("../savepoints") else "./savepoints"

    print("[*] Loading biological similarity matrices...")
    SS_mat = pd.read_pickle(os.path.join(data_dir, "structural_similarity_matrix.pkl"))
    TS_mat = pd.read_pickle(os.path.join(data_dir, "target_similarity_matrix.pkl"))
    GS_mat = pd.read_pickle(os.path.join(data_dir, "GO_similarity_matrix.pkl"))

    mlb, _, idx2label, drugPair2effectIdx = index_data()
    pd.to_pickle(mlb, os.path.join(data_dir, "mlb.pkl"))
    pd.to_pickle(idx2label, os.path.join(data_dir, "idx2label.pkl"))

    x_idx = np.array(list(drugPair2effectIdx.keys()))
    y_idx = np.array(list(drugPair2effectIdx.values()))

    with open(os.path.join(data_dir, "hyperparameter.json")) as fp:
        hparam = json.load(fp)

    batch_size = hparam.get("batch_size", 128)
    n_splits = hparam.get("n_splits", 5)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[*] Training Device: {device} | Batch Size: {batch_size}")

    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)

    for fold, (train_idx, test_idx) in enumerate(skf.split(x_idx, y_idx)):
        print(f"\n==================== Starting Fold {fold + 1} / {n_splits} ====================")
        x_train, y_train = x_idx[train_idx], y_idx[train_idx]
        x_test, y_test = x_idx[test_idx], y_idx[test_idx]

        SS, TS, GS, y = convert_tensor(x_train, y_train, SS_mat, TS_mat, GS_mat, mlb, idx2label)
        dataset = torch.utils.data.TensorDataset(SS, TS, GS, y)
        dataloader = torch.utils.data.DataLoader(dataset, batch_size=batch_size, shuffle=True)

        model = build_model(hparam)
        model.to(device)
        model.fit(dataloader, repeat=fold)

        # Save test partition data for evaluation
        fold_save_path = os.path.join(save_dir, str(fold))
        os.makedirs(fold_save_path, exist_ok=True)
        pd.to_pickle([x_test, y_test], os.path.join(fold_save_path, "test_data.pkl"))
        print(f"[+] Saved test partition for Fold {fold} to {fold_save_path}/test_data.pkl")

        # Break after fold 0 for standard production checkpointing
        if fold == 0:
            print("[✓] Fold 0 checkpointing complete. Model ready for evaluation.")
            break


if __name__ == "__main__":
    main()