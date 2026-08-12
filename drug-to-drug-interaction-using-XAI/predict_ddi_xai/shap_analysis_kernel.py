import sys
sys.path.append('.')

try:
    import numba

except (ImportError, Exception):
    import sys, types
    mock = types.ModuleType('numba')
    mock.njit = lambda *a, **k: (lambda f: f) if not a or not callable(a[0]) else a[0]
    mock.jit = lambda *a, **k: (lambda f: f) if not a or not callable(a[0]) else a[0]
    mock.typed = types.ModuleType('typed')
    mock.typed.List = list
    mock.typed.Dict = dict
    mock.types = types.ModuleType('types')
    mock.core = types.ModuleType('core')
    sys.modules['numba'] = mock
    sys.modules['numba.typed'] = mock.typed
    sys.modules['numba.types'] = mock.types
    sys.modules['numba.core'] = mock.core

import shap
import numpy as np
import pandas as pd
import json
import joblib
import torch
import pickle
import time
import gc
import logging


from src.model import build_model
from src.utils import convert_tensor

# Load hyperparameters and data
with open('./data/hyperparameter.json') as fp:
    hparam = json.load(fp)

SS_mat = pd.read_pickle('./data/structural_similarity_matrix.pkl')
TS_mat = pd.read_pickle('./data/target_similarity_matrix.pkl')
GS_mat = pd.read_pickle('./data/GO_similarity_matrix.pkl')

drugPair2effectIdx = pd.read_pickle('./data/drugPair2effect_idx.pkl')
mlb = pd.read_pickle('./data/mlb.pkl')
idx2label = pd.read_pickle('./data/idx2label.pkl')

data_test = np.load("shap_test_final.npz")
x_shap = data_test["x_shap"]
y_shap = data_test["y_shap"]

print("Loaded x_shap shape:", x_shap.shape)
print("Loaded y_shap shape:", y_shap.shape)

data = np.load("shap_train_final.npz")
x_background = data["x_background"]
y_background = data["y_background"]

#print(x_background)
print("Loaded x_background shape:", x_background.shape)
print("Loaded y_background shape:", y_shap.shape)

# Build and load the model
model = build_model(hparam)
model.load_model('./savepoints/0/model_checkpoint')

# Convert to tensors
SS_train, TS_train, GS_train, y_train = convert_tensor(x_background,y_background , SS_mat, TS_mat, GS_mat, mlb, idx2label)

SS_test, TS_test, GS_test, y_test = convert_tensor(x_shap, y_shap, SS_mat, TS_mat, GS_mat, mlb, idx2label)

# Define feature dimensions
SS_shape = SS_train.shape[1]
TS_shape = TS_train.shape[1]
GS_shape = GS_train.shape[1]

# Flatten input tensors for SHAP (concatenate them)
X_train_flat = np.concatenate([SS_train, TS_train, GS_train], axis=1)
X_test_flat = np.concatenate([SS_test, TS_test, GS_test], axis=1)

X_train_flat = np.array(X_train_flat)
X_test_flat = np.array(X_test_flat)
print(f"X_train_flat shape: {X_train_flat.shape}")
print(f"X_test_flat shape: {X_test_flat.shape}")

# Define a custom model prediction function for SHAP
def model_predict(flattened_input):
    # Split the input back into the three components
    SS, TS, GS = np.split(flattened_input, [SS_shape, SS_shape + TS_shape], axis=1)

    # Convert numpy arrays to PyTorch tensors
    SS_tensor = torch.tensor(SS, dtype=torch.float32)
    TS_tensor = torch.tensor(TS, dtype=torch.float32)
    GS_tensor = torch.tensor(GS, dtype=torch.float32)

    # Ensure the model is in evaluation mode
    model.eval()

    # Perform inference (disable gradient tracking)
    with torch.no_grad():
        output = model(SS_tensor, TS_tensor, GS_tensor)  # Forward pass through the model

    # Convert output to numpy for SHAP compatibility
    return output[3].numpy()


# Select a subset of the training data as the SHAP reference dataset
background = X_train_flat

#logging.basicConfig(level=logging.WARNING)
logging.basicConfig(
    level=logging.DEBUG,  # Or INFO if you don't want debug-level spam
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)

# Log the start of the process
logging.debug("Starting SHAP computation...")

# Create SHAP KernelExplainer
# Define batch processing
batch_size = 6
num_batches = (len(X_test_flat) + batch_size - 1) // batch_size
print(f"Total expected batches: {num_batches}")

# Function to save SHAP values per batch
def save_shap_values(batch_idx, shap_values_batch):
    filename = f"shap_final_kernel_batch_{batch_idx}.pkl"
    with open(filename, "wb") as f:
        pickle.dump(shap_values_batch, f)

# Compute SHAP values in batches
def compute_shap_for_batch(batch_idx):
    try:
        logging.debug(f"  Starting batch {batch_idx}...")
        if batch_idx == 1:  # Adjust logging level after the 3rd batch
            logging.getLogger().setLevel(logging.WARNING)
            logging.debug("Logging level changed to WARNING after batch 1.")
        
        start_time = time.time()

        # Print memory usage before creating the SHAP explainer
        import psutil
        mem = psutil.virtual_memory()
        logging.debug(f"💾 Memory usage before SHAP explainer: {mem.percent}%")

        logging.debug("🔹 Creating SHAP explainer...")
        explainer = shap.KernelExplainer(model_predict, background)
        
        logging.debug(f"🔹 SHAP explainer created in {time.time() - start_time:.2f} seconds.")

        # Select batch indices
        batch_start = batch_idx * batch_size
        batch_end = min((batch_idx + 1) * batch_size, len(X_test_flat))

        logging.debug(f"📌 Batch indices: {batch_start} to {batch_end}")

        # Get test batch
        x_test_batch = X_test_flat[batch_start:batch_end]

        logging.debug("  Computing SHAP values for batch...")

        shap_values_batch = explainer.shap_values(x_test_batch,l1_reg="aic")

        logging.debug(f"✅ Batch {batch_idx} completed in {time.time() - start_time:.2f} seconds.")

        save_shap_values(batch_idx, shap_values_batch)  # Save after each batch
        del x_test_batch
        gc.collect()
        return shap_values_batch

    except Exception as e:
        logging.error(f"❌ Error in batch {batch_idx}: {e}")
        return None

# Parallel batch processing

batch_indices = range(num_batches)

logging.debug("Starting parallel SHAP computation...")

all_shap_values = []
for batch_idx in batch_indices:
    shap_values = compute_shap_for_batch(batch_idx)
    all_shap_values.append(shap_values)

logging.debug("SHAP computation completed.")

