from pathlib import Path

import joblib
import pandas as pd


def load_artifact(path: str):
    artifact = Path(path)
    if not artifact.exists():
        raise FileNotFoundError(f"Model artifact was not found: {artifact}")
    return joblib.load(artifact)


def predict(artifact_path: str, candidates: list[dict]) -> dict:
    artifact = load_artifact(artifact_path)
    if not candidates:
        return {"model_version": artifact["model_version"], "predictions": []}
    frame = pd.DataFrame(candidates)
    frame = frame.reindex(columns=artifact["feature_columns"])
    probabilities = artifact["model"].predict_proba(frame)[:, 1]
    return {
        "model_version": artifact["model_version"],
        "predictions": [float(round(value, 6)) for value in probabilities],
    }
