import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from sklearn.metrics import accuracy_score, classification_report, roc_auc_score
from sklearn.model_selection import train_test_split

from preprocess import TARGET_COLUMN, build_pipeline, load_training_data, save_artifact

MINIMUM_ROWS = 50


def train(source: str, artifact_path: str) -> dict:
    frame = load_training_data(source)
    if TARGET_COLUMN not in frame.columns:
        raise ValueError(f"Training data must include the '{TARGET_COLUMN}' target column.")
    if len(frame) < MINIMUM_ROWS or frame[TARGET_COLUMN].nunique() < 2:
        raise ValueError(f"Insufficient labeled data: need at least {MINIMUM_ROWS} rows and two target classes.")

    features = frame.drop(columns=[TARGET_COLUMN])
    target = frame[TARGET_COLUMN].astype(int)
    train_features, test_features, train_target, test_target = train_test_split(
        features, target, test_size=0.2, random_state=42, stratify=target
    )
    pipeline = build_pipeline(frame)
    pipeline.fit(train_features, train_target)
    predictions = pipeline.predict(test_features)
    probabilities = pipeline.predict_proba(test_features)[:, 1]
    metrics = {
        "accuracy": accuracy_score(test_target, predictions),
        "roc_auc": roc_auc_score(test_target, probabilities),
        "classification_report": classification_report(test_target, predictions, output_dict=True),
        "training_rows": len(frame),
        "test_rows": len(test_features),
    }
    model_version = datetime.now(timezone.utc).strftime("rf-%Y%m%dT%H%M%SZ")
    Path(artifact_path).parent.mkdir(parents=True, exist_ok=True)
    save_artifact(artifact_path, pipeline, model_version, features.columns.tolist(), metrics)
    return {"model_version": model_version, "artifact_path": artifact_path, "metrics": metrics}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True)
    parser.add_argument("--artifact", required=True)
    args = parser.parse_args()
    result = train(args.data, args.artifact)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
