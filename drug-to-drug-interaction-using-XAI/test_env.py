import sys
print("Python Executable:", sys.executable)
print("Python Version:", sys.version)

try:
    import torch
    print("PyTorch Version:", torch.__version__)
    print("CUDA Available:", torch.cuda.is_available())
    if torch.cuda.is_available():
        print("Device:", torch.cuda.get_device_name(0))
except Exception as e:
    print("PyTorch import failed:", e)

try:
    import numpy as np
    import pandas as pd
    import sklearn
    print("NumPy, Pandas, Sklearn imported successfully!")
except Exception as e:
    print("Data science stack import failed:", e)
