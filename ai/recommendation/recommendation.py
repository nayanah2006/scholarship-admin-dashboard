"""Scholarship recommendations from student details and document text.

The catalog is intentionally treated as the source of recommendation results:
the model ranks rows from ``scholarships1_cleaned.csv`` instead of inventing
scholarships from the training data.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Any, Iterable

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


MODULE_DIR = Path(__file__).resolve().parent
DEFAULT_DATASET = MODULE_DIR.parent.parent.parent / "collections" / "scholarships1_cleaned.csv"
REQUIRED_COLUMNS = ("title", "eligibility", "award", "category", "status")
TEXT_COLUMNS = ("title", "eligibility", "award", "category")


def _text(value: Any) -> str:
	if value is None or (isinstance(value, float) and pd.isna(value)):
		return ""
	return str(value).strip()


def _normalise(value: Any) -> str:
	return re.sub(r"\s+", " ", _text(value).lower()).strip()


def _number(value: Any) -> float | None:
	match = re.search(r"\d+(?:\.\d+)?", _text(value).replace(",", ""))
	return float(match.group()) if match else None


def _income_limit(text: str) -> float | None:
	match = re.search(r"(?:income|family income|annual income)[^.!?]{0,100}?\b(?:inr|rs\.?|₹)?\s*([\d,.]+)\s*(lakh|lac|l|crore|cr)?", text, re.I)
	if not match:
		return None
	amount = float(match.group(1).replace(",", ""))
	unit = (match.group(2) or "").lower()
	if unit in {"lakh", "lac", "l"}:
		amount *= 100000
	elif unit in {"crore", "cr"}:
		amount *= 10000000
	return amount


def _student_text(student: dict[str, Any], document_text: str = "") -> str:
	ignored = {"documents", "document_text", "document", "file", "files"}
	fields = [f"{key}: {_text(value)}" for key, value in student.items() if key not in ignored and _text(value)]
	return " ".join(fields + [_text(document_text)])


def _document_text(documents: Any) -> str:
	if documents is None:
		return ""
	if isinstance(documents, (list, tuple)):
		return " ".join(_document_text(item) for item in documents)
	if isinstance(documents, dict):
		return " ".join(_document_text(documents.get(key)) for key in ("text", "content", "document_text"))
	path = Path(_text(documents))
	if path.is_file() and path.suffix.lower() in {".txt", ".md", ".csv"}:
		return path.read_text(encoding="utf-8", errors="ignore")
	return _text(documents)


def load_catalog(dataset_path: str | Path = DEFAULT_DATASET) -> pd.DataFrame:
	"""Load and validate the scholarship catalog."""
	path = Path(dataset_path)
	if not path.exists():
		raise FileNotFoundError(f"Scholarship catalog not found: {path}")
	catalog = pd.read_csv(path).fillna("")
	missing = [column for column in REQUIRED_COLUMNS if column not in catalog.columns]
	if missing:
		raise ValueError(f"Scholarship catalog is missing columns: {', '.join(missing)}")
	if "title_clean" in catalog.columns:
		catalog["title"] = catalog["title_clean"].where(catalog["title_clean"].astype(str).str.strip().ne(""), catalog["title"])
	active = catalog[
		catalog["status"].map(_normalise).isin({"active", "open", "featured"})
		| catalog.get("deadline", pd.Series("", index=catalog.index)).map(_normalise).str.contains("always open")
	]
	# Some snapshots have fewer than five active rows; keep the catalog-wide
	# fallback so the API can still honour its top-five response contract.
	usable = active if len(active) >= 5 else catalog
	return usable.drop_duplicates(subset=["title"]).reset_index(drop=True)


def _score_rows(student: dict[str, Any], catalog: pd.DataFrame, document_text: str) -> pd.DataFrame:
	query = _student_text(student, document_text)
	scholarship_text = catalog[list(TEXT_COLUMNS)].astype(str).agg(" ".join, axis=1)
	vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
	matrix = vectorizer.fit_transform(pd.concat([scholarship_text, pd.Series([query])], ignore_index=True))
	similarity = cosine_similarity(matrix[-1], matrix[:-1]).ravel()
	result = catalog.copy()
	result["match_score"] = similarity

	marks = _number(student.get("marks", student.get("percentage")))
	income = _number(student.get("income", student.get("annual_income")))
	for index, eligibility in result["eligibility"].items():
		eligibility_text = _normalise(eligibility)
		bonus = 0.0
		minimum_marks = re.search(r"(?:at least|minimum of|more than|above)\s*(\d{2,3})\s*%", eligibility_text)
		if marks is not None and minimum_marks:
			bonus += 0.15 if marks >= float(minimum_marks.group(1)) else -0.25
		limit = _income_limit(eligibility_text)
		if income is not None and limit is not None:
			bonus += 0.15 if income <= limit else -0.25
		result.at[index, "match_score"] = max(0.0, min(1.0, result.at[index, "match_score"] + bonus))
	return result


def recommend_top_scholarships(
	student: dict[str, Any],
	document_text: str = "",
	documents: Any = None,
	dataset_path: str | Path = DEFAULT_DATASET,
	top_n: int = 5,
) -> list[dict[str, Any]]:
	"""Return the highest-ranked active catalog scholarships for one student."""
	if not isinstance(student, dict):
		raise TypeError("student must be an object containing student details")
	catalog = load_catalog(dataset_path)
	combined_documents = " ".join(part for part in (document_text, _document_text(documents)) if part)
	ranked = _score_rows(student, catalog, combined_documents).sort_values("match_score", ascending=False).head(max(0, top_n))
	results = []
	for row in ranked.to_dict("records"):
		score = round(float(row.pop("match_score")), 4)
		results.append({**row, "score": score, "match_score": score, "reason": "Matched student details and supplied document text against scholarship eligibility and award information."})
	return results


def _prompt_student() -> dict[str, str]:
	fields = ("name", "education", "course", "gender", "community", "religion", "marks", "income", "disability", "document_text")
	return {field: input(f"{field.replace('_', ' ').title()}: ").strip() for field in fields}


def main() -> None:
	parser = argparse.ArgumentParser(description="Recommend scholarships from the cleaned scholarship catalog.")
	parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
	parser.add_argument("--top", type=int, default=5)
	args = parser.parse_args()
	student = _prompt_student()
	recommendations = recommend_top_scholarships(student, dataset_path=args.dataset, top_n=args.top)
	print("\nRecommended scholarships")
	for number, scholarship in enumerate(recommendations, start=1):
		print(f"{number}. {scholarship['title']} ({scholarship['score']:.1%})")
		print(f"   Eligibility: {scholarship['eligibility']}")
		print(f"   Award: {scholarship['award']}")
		print(f"   URL: {scholarship.get('url', '')}")


if __name__ == "__main__":
	main()
