
import sys
import os

# Mock Groq to avoid API key issues
from unittest.mock import MagicMock
sys.modules['groq'] = MagicMock()

# Add current directory to path
sys.path.append(os.getcwd())

print("Importing modules.openrouter...")
import modules.openrouter as or_module

def test_lazy_loading():
    print(f"Testing Lazy Loading on module: {or_module.__name__}")
    
    # Check 1: Model should be None initially
    if hasattr(or_module, '_model'):
        val = or_module._model
        if val is None:
             print("✅ SUCCESS: Global _model is None initially (Lazy Loading works)")
        else:
             print(f"❌ FAILURE: Global _model was loaded immediately: {val}")
    else:
        print("❌ FAILURE: Module has no attribute '_model'")
        return

    # Check 2: Trigger load via get_model
    print("Triggering load via get_model()...")
    try:
        model = or_module.get_model()
        if model is not None:
             print("✅ SUCCESS: get_model() returned a model")
        else:
             print("❌ FAILURE: get_model() returned None")
        
        # Check global variable update
        if or_module._model is not None:
             print("✅ SUCCESS: Global _model is set after first call")
        else:
             print("❌ FAILURE: Global _model is still None")
             
    except Exception as e:
        print(f"⚠️ Caught exception during model load: {e}")

    # Check 3: Verify optimization flags (if we can inspect torch)
    try:
        import torch
        print(f"Torch Threads: {torch.get_num_threads()} (Expected 1)")
        print(f"Torch Interop Threads: {torch.get_num_interop_threads()} (Expected 1)")
    except Exception:
        pass

    print("Test Complete.")

if __name__ == "__main__":
    test_lazy_loading()
