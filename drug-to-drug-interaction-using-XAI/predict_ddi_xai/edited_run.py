import torch
import torch.nn as nn
import numpy as np
import pandas as pd
from sklearn.model_selection import RepeatedStratifiedKFold
import json

from model import build_model
from utils import index_data, convert_tensor

SS_mat = pd.read_pickle('../data/structural_similarity_matrix.pkl')
TS_mat = pd.read_pickle('../data/target_similarity_matrix.pkl')
GS_mat = pd.read_pickle('../data/GO_similarity_matrix.pkl')

mlb, _, idx2label, drugPair2effectIdx = index_data()
pd.to_pickle(mlb, '../data/mlb.pkl')
pd.to_pickle(idx2label, '../data/idx2label.pkl')
    
x_idx = []
y_idx = []
for k, v in drugPair2effectIdx.items():
    x_idx.append(k)
    y_idx.append(v)
x_idx, y_idx = np.array(x_idx), np.array(y_idx)

with open('../data/hyperparameter.json') as fp:
    hparam = json.load(fp)

kf = RepeatedStratifiedKFold(n_splits=hparam['n_splits'], n_repeats=hparam['n_repeats'], random_state=2020)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

for i, (train_idx, test_idx) in enumerate(kf.split(x_idx, y_idx)):    
    # Split into train and test sets based on the indices
    x_train = x_idx[train_idx]
    y_train = y_idx[train_idx]
    x_test = x_idx[test_idx]
    y_test = y_idx[test_idx]

    # Convert the training data into tensors
    SS, TS, GS, y = convert_tensor(x_train, y_train, SS_mat, TS_mat, GS_mat, mlb, idx2label)
    
    # Create a DataLoader for training
    dataset = torch.utils.data.TensorDataset(SS, TS, GS, y)
    dataloader = torch.utils.data.DataLoader(dataset, batch_size=256, shuffle=True)

    # Build and train the model
    model = build_model(hparam)
    model.to(device)
    model.fit(dataloader, i)
    
    # Save the test data (for SHAP evaluation later)
    pd.to_pickle([x_test, y_test], model.path + f'test_data_fold_{i}.pkl')  # Save test data for fold `i`
    pd.to_pickle([x_train, y_train], model.path + f'train_data_fold_{i}.pkl')  # Save training data for fold `i`

    # Clear variables after each fold (optional, depending on memory usage)
    del x_test, y_test, x_train, y_train

