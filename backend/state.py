"""Process-local model state populated by POST /train."""

from typing import Any, Dict

STATE: Dict[str, Any] = {
    "trained": False,
    "s1_pipe": None,   # Stage 1: Engagement Rate
    "s2_pipe": None,   # Stage 2: Conversion Rate
    "s3_pipe": None,   # Stage 3: Revenue
    "cls_pipe": None,  # Classifier: Campaign Success
    "train_df": None,
    "val_df": None,
    "test_df": None,
    "cold_df": None,
    "preprocessor": None,
    "dataset": None,
    "model_source": None,
    "model_files": {},
    "model_load_error": None,
    "model_load_warning": None,
    "models_loaded_from_disk": False,
}
