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

Install dependencies from `ai/requirements.txt`, then start the recommendation service before starting the Node backend:

```bash
python ai/service.py
```

The service listens on `http://127.0.0.1:5100` by default. Set `AI_PORT`, `AI_HOST`, or `AI_DATASET_PATH` to change its configuration. The Node API calls `POST /recommend` through `AI_SERVICE_URL`. Successful predictions are stored with the returned model version and timestamp in MySQL.
