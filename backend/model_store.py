"""Model persistence helpers for startup loading and training saves."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Dict

import joblib

from state import STATE

MODEL_FILENAMES: Dict[str, str] = {
    "s1_pipe": "stage1_er_model_v4.pkl",
    "s2_pipe": "stage2_cvr_model_v4.pkl",
    "s3_pipe": "stage3_revenue_model_v4.pkl",
    "cls_pipe": "success_cls_v4.pkl",
}


def model_dir() -> Path:
    return Path(os.getenv("MODEL_DIR", Path(__file__).with_name("models"))).resolve()


def _candidate_paths(state_key: str, directory: Path) -> list[Path]:
    filename = MODEL_FILENAMES[state_key]
    candidates = []
    if state_key == "cls_pipe":
        candidates.append(Path(__file__).with_name(filename).resolve())
    candidates.append((directory / filename).resolve())
    return candidates


def load_models_once() -> dict:
    """Load persisted model pipelines into process-local state once per server process."""
    if STATE.get("models_loaded_from_disk"):
        return {"status": "already_loaded", "model_dir": str(model_dir())}

    directory = model_dir()
    missing = [
        MODEL_FILENAMES[state_key]
        for state_key in MODEL_FILENAMES
        if not any(path.exists() for path in _candidate_paths(state_key, directory))
    ]
    if missing:
        message = f"Missing model files in {directory}: {', '.join(missing)}"
        STATE.update({
            "trained": False,
            "model_source": None,
            "model_files": {},
            "model_load_error": message,
            "model_load_warning": None,
            "models_loaded_from_disk": False,
        })
        return {"status": "missing", "model_dir": str(directory), "missing": missing}

    loaded = {}
    loaded_files = {}
    warnings = []
    try:
        for state_key in MODEL_FILENAMES:
            errors = []
            for path in _candidate_paths(state_key, directory):
                if not path.exists():
                    continue
                try:
                    loaded[state_key] = joblib.load(path)
                    loaded_files[state_key] = str(path)
                    break
                except Exception as exc:
                    errors.append(f"{path}: {exc}")
            if state_key not in loaded:
                raise RuntimeError(f"Unable to load {MODEL_FILENAMES[state_key]} from candidates: {'; '.join(errors)}")
            warnings.extend(errors)
    except Exception as exc:
        message = f"Unable to load model files from {directory}: {exc}"
        STATE.update({
            "trained": False,
            "model_source": None,
            "model_files": {},
            "model_load_error": message,
            "model_load_warning": None,
            "models_loaded_from_disk": False,
        })
        return {"status": "error", "model_dir": str(directory), "detail": str(exc)}

    STATE.update({
        **loaded,
        "trained": True,
        "model_source": str(directory),
        "model_files": loaded_files,
        "model_load_error": None,
        "model_load_warning": "; ".join(warnings) if warnings else None,
        "models_loaded_from_disk": True,
    })
    return {"status": "loaded", "model_dir": str(directory), "files": loaded_files}


def save_models() -> Path:
    """Persist the currently trained model pipelines to the configured model directory."""
    directory = model_dir()
    directory.mkdir(parents=True, exist_ok=True)
    for state_key, filename in MODEL_FILENAMES.items():
        model = STATE.get(state_key)
        if model is None:
            raise RuntimeError(f"Cannot save missing model pipeline: {state_key}")
        joblib.dump(model, directory / filename)
    return directory
