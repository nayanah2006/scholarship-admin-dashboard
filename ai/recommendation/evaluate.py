import argparse
import json

from sklearn.metrics import accuracy_score, classification_report, roc_auc_score
from sklearn.model_selection import train_test_split

from preprocess import TARGET_COLUMN, build_pipeline, load_training_data


def evaluate(source: str) -> dict:
    frame = load_training_data(source)
    if TARGET_COLUMN not in frame.columns or frame[TARGET_COLUMN].nunique() < 2:
        raise ValueError("Evaluation requires labeled data with two target classes.")
    features = frame.drop(columns=[TARGET_COLUMN])
    target = frame[TARGET_COLUMN].astype(int)
    train_features, test_features, train_target, test_target = train_test_split(features, target, test_size=0.2, random_state=42, stratify=target)
    model = build_pipeline(frame)
    model.fit(train_features, train_target)
    predictions = model.predict(test_features)
    probabilities = model.predict_proba(test_features)[:, 1]
    return {
        "accuracy": accuracy_score(test_target, predictions),
        "roc_auc": roc_auc_score(test_target, probabilities),
        "classification_report": classification_report(test_target, predictions, output_dict=True),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True)
    args = parser.parse_args()
    print(json.dumps(evaluate(args.data), indent=2))
