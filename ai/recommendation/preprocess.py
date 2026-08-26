from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

TARGET_COLUMN = "awarded"
EXCLUDED_FEATURES = {"student_id", "gender", "caste", "religion", "category"}


def load_training_data(path: str) -> pd.DataFrame:
    source = Path(path)
    if not source.exists():
        raise FileNotFoundError(f"Training data was not found: {source}")
    if source.suffix.lower() == ".csv":
        return pd.read_csv(source)
    if source.suffix.lower() in {".json", ".jsonl"}:
        return pd.read_json(source, lines=source.suffix.lower() == ".jsonl")
    raise ValueError("Training data must be CSV, JSON, or JSONL.")


def build_pipeline(frame: pd.DataFrame):
    feature_frame = frame.drop(columns=[TARGET_COLUMN, *[column for column in EXCLUDED_FEATURES if column in frame.columns]])
    numeric_columns = feature_frame.select_dtypes(include=["number", "bool"]).columns.tolist()
    categorical_columns = [column for column in feature_frame.columns if column not in numeric_columns]

    numeric_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
    ])
    categorical_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore")),
    ])
    transformer = ColumnTransformer([
        ("numeric", numeric_pipeline, numeric_columns),
        ("categorical", categorical_pipeline, categorical_columns),
    ])
    classifier = RandomForestClassifier(
        n_estimators=300,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    return Pipeline([("features", transformer), ("classifier", classifier)])


def save_artifact(path: str, pipeline, model_version: str, feature_columns: list[str], metrics: dict):
    joblib.dump({
        "model": pipeline,
        "model_version": model_version,
        "feature_columns": feature_columns,
        "metrics": metrics,
    }, path)
