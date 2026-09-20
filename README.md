# ScholarPath

ScholarPath is a React, Express, MySQL scholarship portal. The legacy scholarship catalog is retained; its portal schema is added through an additive migration.

## Features and architecture

- Students register, sign in, complete a profile, discover/search/save scholarships, receive rule-based recommendations, upload documents, submit applications, and follow status history.
- Institutions see only assigned applications and record enrollment/document decisions and remarks.
- Administrators have live database analytics, account status management, and scholarship creation.
- `frontend/` is React, `Backend/` is the REST API, `Backend/migrations/` has the additive portal migration, and `ai/` contains the sklearn eligibility service.

Relationships: `users -> student_profiles_v2/education`, `institutions -> users`, `applications -> users/scholarships/institutions`, `documents -> applications`; verification, status history, notifications, recommendations, and audit records preserve workflow history. Existing legacy scholarship tables are not dropped.

## API and access rules

Authentication uses HTTP-only server sessions. `STUDENT`, `INSTITUTION`, and `ADMIN` authorization is enforced on API routes; application and document reads also check ownership/assigned institution.

Key routes: `/api/auth/*`, `/api/profile`, `/api/scholarships`, `/api/recommendations`, `/api/eligibility`, `/api/applications`, `/api/institution/applications`, `/api/admin/analytics`, `/api/notifications`. `GET /api/health` is the health check.

## Local setup

1. Copy `.env.example` to `.env`; set a strong session secret and MySQL credentials.
2. Create the `scholarship_admin` database and start MySQL.
3. In `Backend`, run `npm install` then `node Server.js`.
4. In `frontend`, run `npm install` then `npm start`.

The first administrator must be created with a bcrypt password hash through an approved operational bootstrap process; public registration intentionally permits only student and institution accounts.

## ML pipeline

From `scholarship/`:

```powershell
python ai\eligibility_model\train_model.py
python ai\service.py
```

Training removes exact duplicates, excludes `name` and `source_sheet`, uses a scholarship-group holdout split, compares KNN, Decision Tree, and class-balanced Random Forest, and selects by eligible-class F1 then recall. The saved `scholarship_model.joblib` includes preprocessing; `model_metadata.json` records accuracy, precision, recall, F1, confusion matrices, and per-class metrics. It is advisory: official rules drive recommendations and workflow.

## Deployment and security

Use managed MySQL, private persistent file storage, HTTPS, a real shared session store, and environment secrets. Set exact `CORS_ORIGIN`, a long `SESSION_SECRET`, and production `NODE_ENV`. `docker compose up --build` is a local reference; replace all compose passwords before non-local deployment.

Security controls include bcrypt hashing, validation, rate-limited authentication, roles/resource authorization, Helmet headers, restrictive CORS, parameterized queries, protected file downloads, MIME plus signature validation, and safe errors.
