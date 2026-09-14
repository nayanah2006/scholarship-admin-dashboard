"""HTTP service used by Backend/Server.js for scholarship recommendations."""

from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

import pandas as pd

from recommendation.recommendation import recommend_top_scholarships


AI_DIR = Path(__file__).resolve().parent
DEFAULT_DATASET = AI_DIR.parent.parent / "collections" / "scholarships1_cleaned.csv"
DATASET_PATH = Path(os.environ.get("AI_DATASET_PATH", DEFAULT_DATASET))
HOST = os.environ.get("AI_HOST", "127.0.0.1")
PORT = int(os.environ.get("AI_PORT", "5100"))
MODEL_VERSION = os.environ.get("AI_MODEL_VERSION", "historical-match-v1")

FEATURES = (
    "education_qualification",
    "gender",
    "community",
    "religion",
    "exservice_men",
    "disability",
    "sports",
    "annual_percentage",
    "income",
    "india",
)


def _text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip().lower()


def _percentage_band(value: Any) -> str:
    try:
        marks = float(value)
    except (TypeError, ValueError):
        return _text(value)
    if marks >= 90:
        return "90-100"
    if marks >= 80:
        return "80-89"
    if marks >= 70:
        return "70-79"
    if marks >= 60:
        return "60-69"
    return "below 60"


def _income_band(value: Any) -> str:
    try:
        income = float(value)
    except (TypeError, ValueError):
        return _text(value)
    if income <= 150000:
        return "upto 1.5l"
    if income <= 300000:
        return "1.5l-3l"
    if income <= 600000:
        return "3l-6l"
    return "above 6l"


def _candidate_features(candidate: dict[str, Any]) -> dict[str, str]:
    course = _text(candidate.get("course"))
    institution_type = _text(candidate.get("institution_type"))
    education = course or institution_type
    return {
        "education_qualification": education,
        "annual_percentage": _percentage_band(candidate.get("marks")),
        "income": _income_band(candidate.get("income")),
        "india": "in",
    }


def _load_dataset() -> pd.DataFrame:
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Recommendation dataset not found: {DATASET_PATH}")
    dataset = pd.read_csv(DATASET_PATH)
    missing = [column for column in (*FEATURES, "outcome") if column not in dataset.columns]
    if missing:
        raise ValueError(f"Recommendation dataset is missing columns: {', '.join(missing)}")
    return dataset


def predict(candidates: list[dict[str, Any]]) -> list[float]:
    predictions: list[float] = []

    for candidate in candidates:
        student = {
            "course": candidate.get("course"),
            "institution_type": candidate.get("institution_type"),
            "marks": candidate.get("marks"),
            "income": candidate.get("income"),
            "gender": candidate.get("gender"),
            "community": candidate.get("community"),
            "religion": candidate.get("religion"),
            "disability": candidate.get("disability"),
        }
        scholarship_context = " ".join(
            str(candidate.get(key, ""))
            for key in ("scholarship_type", "scholarship_course", "scholarship_district", "provider")
        )
        result = recommend_top_scholarships(
            student,
            document_text=scholarship_context,
            dataset_path=DATASET_PATH,
            top_n=1,
        )
        predictions.append(result[0]["score"] if result else 0.0)

    return predictions


class RecommendationHandler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._send_json(200, {"status": "ok", "model_version": MODEL_VERSION})
            return
        self._send_json(404, {"message": "Route not found."})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/recommend":
            self._send_json(404, {"message": "Route not found."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length))
            candidates = payload.get("candidates")
            if not isinstance(candidates, list):
                raise ValueError("candidates must be an array")
            if not all(isinstance(candidate, dict) for candidate in candidates):
                raise ValueError("each candidate must be an object")
            response: dict[str, Any] = {"model_version": MODEL_VERSION, "predictions": predict(candidates)}
            if isinstance(payload.get("student"), dict):
                response["recommendations"] = recommend_top_scholarships(
                    payload["student"],
                    document_text=payload.get("document_text", ""),
                    documents=payload.get("documents"),
                    dataset_path=DATASET_PATH,
                    top_n=5,
                )
            self._send_json(200, response)
        except (ValueError, FileNotFoundError, pd.errors.ParserError) as error:
            self._send_json(400, {"message": str(error)})
        except Exception as error:  # Keep service failures readable by the Node API.
            self._send_json(500, {"message": f"Recommendation failed: {error}"})

    def log_message(self, format: str, *args: Any) -> None:
        print(f"AI service: {format % args}")


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), RecommendationHandler)
    print(f"Recommendation AI service listening on http://{HOST}:{PORT}")
    server.serve_forever()
