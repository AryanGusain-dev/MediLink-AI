#!/usr/bin/env python
"""
MediLink-BioFusion Retraining Script.

Retrains the novel MediLink-BioFusion Multi-Modal Transformer model from scratch
using the pre-computed biological similarity matrices (Chemical Structure, Target Binding, Gene Ontology).

Usage:
    python retrain_biofusion.py
    python retrain_biofusion.py --epochs 100 --batch-size 128 --lr 0.0003
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from sklearn.model_selection import StratifiedKFold

# Ensure src directory is available
CURRENT_DIR = Path(__file__).resolve().parent
SRC_DIR = CURRENT_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from model import build_model
from utils import convert_tensor, evaluate_model, index_data


def parse_args():
    parser = argparse.ArgumentParser(description="Retrain MediLink-BioFusion Multi-Modal Model")
    parser.add_argument("--epochs", type=int, default=120, help="Number of training epochs (default: 120)")
    parser.add_argument("--batch-size", type=int, default=128, help="Batch size (default: 128)")
    parser.add_argument("--lr", type=float, default=0.0003, help="Learning rate for AdamW (default: 0.0003)")
    parser.add_argument("--patience", type=int, default=10, help="Early stopping patience (default: 10)")
    parser.add_argument("--max-samples", type=int, default=None, help="Optionally cap dataset size for fast CPU execution")
    parser.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu", help="Device (cuda/cpu)")
    return parser.parse_args()


def main():
    args = parse_args()
    data_dir = CURRENT_DIR / "data"
    save_dir = CURRENT_DIR / "savepoints" / "biofusion"
    save_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("      MediLink-BioFusion Model Training Pipeline      ")
    print("=" * 70)
    print(f"[*] PyTorch Device: {args.device}")
    print(f"[*] Hyperparameters: Epochs={args.epochs}, BatchSize={args.batch_size}, LR={args.lr}")

    # Load Hyperparameters
    with open(data_dir / "hyperparameter.json", "r") as f:
        hparam = json.load(f)

    hparam["epoch"] = args.epochs
    hparam["batch_size"] = args.batch_size
    hparam["lr"] = args.lr
    hparam["patience"] = args.patience
    hparam["save_path"] = str(save_dir) + "/"

    print("[*] Loading biological similarity matrices & indexing data...")
    SS_mat = pd.read_pickle(data_dir / "structural_similarity_matrix.pkl")
    TS_mat = pd.read_pickle(data_dir / "target_similarity_matrix.pkl")
    GS_mat = pd.read_pickle(data_dir / "GO_similarity_matrix.pkl")

    mlb, _, idx2label, drugPair2effectIdx = index_data(data_dir=str(data_dir))
    pd.to_pickle(mlb, data_dir / "mlb.pkl")
    pd.to_pickle(idx2label, data_dir / "idx2label.pkl")

    x_idx = np.array(list(drugPair2effectIdx.keys()))
    y_idx = np.array(list(drugPair2effectIdx.values()))

    if args.max_samples and args.max_samples < len(x_idx):
        np.random.seed(42)
        sample_indices = np.random.choice(len(x_idx), size=args.max_samples, replace=False)
        x_idx = x_idx[sample_indices]
        y_idx = y_idx[sample_indices]
        print(f"[*] Sampled {args.max_samples} representative drug pairs for fast CPU execution.")

    print(f"[+] Total samples indexed: {len(x_idx)} drug pairs across {len(idx2label)} interaction labels.")

    # 5-Fold Stratified Split (Training on Fold 0)
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    train_idx, test_idx = next(skf.split(x_idx, y_idx))

    x_train, y_train = x_idx[train_idx], y_idx[train_idx]
    x_test, y_test = x_idx[test_idx], y_idx[test_idx]
    print(f"[+] Train set: {len(x_train)} pairs | Test set: {len(x_test)} pairs")

    # Build Tensors & DataLoader
    print("[*] Preparing PyTorch Tensors...")
    SS, TS, GS, y = convert_tensor(x_train, y_train, SS_mat, TS_mat, GS_mat, mlb, idx2label)
    dataset = torch.utils.data.TensorDataset(SS, TS, GS, y)
    dataloader = torch.utils.data.DataLoader(dataset, batch_size=args.batch_size, shuffle=True)

    # Initialize MediLink-BioFusion Model
    print("[*] Initializing MediLink-BioFusion Network...")
    model = build_model(hparam)
    model.to(torch.device(args.device))

    # Train
    start_time = time.time()
    model.fit(dataloader, repeat=0)
    elapsed = time.time() - start_time
    print(f"[OK] Training completed in {elapsed / 60:.2f} minutes.")

    # Save test partition
    pd.to_pickle([x_test, y_test], save_dir / "test_data.pkl")
    print(f"[+] Saved test partition to: {save_dir / 'test_data.pkl'}")

    # Evaluate on Test Partition
    print("[*] Evaluating on held-out test partition...")
    SS_test, TS_test, GS_test, y_test_tensor = convert_tensor(x_test, y_test, SS_mat, TS_mat, GS_mat, mlb, idx2label)
    model.eval()
    with torch.no_grad():
        _, _, _, pred = model(
            SS_test.to(args.device), TS_test.to(args.device), GS_test.to(args.device)
        )
        pred_bin = (torch.sigmoid(pred) > hparam.get("threshold", 0.5)).int().cpu().numpy()

    y_true_np = y_test_tensor.int().numpy()
    top1_pred = torch.argmax(pred, dim=-1).cpu().numpy()
    top1_true = torch.argmax(y_test_tensor, dim=-1).numpy()
    top1_acc = float(np.mean(top1_pred == top1_true))

    acc, ma_rc, ma_pc, mi_rc, mi_pc = evaluate_model(y_true_np, pred_bin)
    print("\n" + "=" * 50)
    print("      MediLink-BioFusion Test Results       ")
    print("=" * 50)
    print(f"Top-1 Accuracy:  {top1_acc:.4f} ({top1_acc*100:.2f}%)")
    print(f"Exact Match Acc: {acc:.4f} ({acc*100:.2f}%)")
    print(f"Micro Recall:    {mi_rc:.4f} ({mi_rc*100:.2f}%)")
    print(f"Micro Precision: {mi_pc:.4f} ({mi_pc*100:.2f}%)")
    print(f"Macro Recall:    {ma_rc:.4f} ({ma_rc*100:.2f}%)")
    print(f"Macro Precision: {ma_pc:.4f} ({ma_pc*100:.2f}%)")
    print("=" * 50)


if __name__ == "__main__":
    main()
