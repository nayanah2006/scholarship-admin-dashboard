# Scholarship Recommendation AI

The repository currently does not contain a real, labeled historical application dataset. The existing JSON and SQL data are portal aggregates or institution records and do not provide a reliable `awarded` target for supervised learning. No training data is fabricated by this module.

## Training

Provide an approved CSV, JSON, or JSONL export through an external path. It must contain an `awarded` target column with both classes and at least 50 labeled rows. The trainer writes a versioned joblib artifact and evaluation metrics.

```bash
python ai/recommendation/train.py --data path/to/approved_history.csv --artifact ai/recommendation/model/recommendation.joblib
python ai/recommendation/evaluate.py --data path/to/approved_history.csv
```

Direct identifiers and protected attributes (`student_id`, `gender`, `caste`, `religion`, and `category`) are excluded from model features by default. Official eligibility rules remain separate and authoritative.

## Service

Install dependencies from `ai/requirements.txt`, set `AI_MODEL_PATH` and `AI_PORT` as needed, and start:

```bash
python ai/recommendation/service.py
```

The Node API calls `POST /recommend`. When no trained artifact exists, the API returns a clear unavailable response and does not create prediction records. Successful predictions are stored with model version and timestamp in MySQL.
