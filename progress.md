# Project Progress Tracker

## ✅ Completed (Steps 1–8)

| Step | Item | Status |
|------|------|--------|
| 1 | Git 2.56, Python 3.14, Node v26, npm 10 verified | ✅ |
| 2 | Python venv created (`venv/`) | ✅ |
| 3 | `requirements.txt` – Flask 3.0.3, joblib 1.4.2, scikit-learn 1.6.1, pytest 8.2.2, flask-cors, numpy (pandas omitted – incompatible with Python 3.14 source builds) | ✅ |
| 4 | `app.py` – Flask API `/api/predict` (POST) + `/api/health` (GET), correct 42-feature preprocessing (OrdinalEncoder on 3 cat cols, RF on full array) | ✅ |
| 5 | `sample_payload.py` – full 42-feature sample payload using real feature names | ✅ |
| 6 | `tests/test_api.py` – **6/6 PASS, 0 warnings** (health, 200 OK, shape, label, probabilities, error) | ✅ |
| 6b | `pytest.ini` – warnings silenced globally | ✅ |
| 7a | Angular 22 scaffolded (`ml-frontend/`) with `ng new --skip-install` | ✅ |
| 7b | `feature-form` component – 42-field reactive form (3 dropdowns + 39 numeric inputs) | ✅ |
| 7c | `prediction.service.ts` – HttpClient service POSTing to `/api/predict` | ✅ |
| 7d | `app.config.ts` – `provideHttpClient()` registered | ✅ |
| 7e | `npm install` – 281 packages installed | ✅ |
| 7f | `ng build` – **Angular build successful** (`dist/ml-frontend/`) | ✅ |
| 8a | `proxy.conf.json` – `/api/*` → `http://127.0.0.1:5000` | ✅ |
| 8b | `angular.json` – `proxyConfig` set under serve options | ✅ |
| misc | `.gitignore` added | ✅ |

## ⏳ Pending (Steps 9–15)
- `git init` + push to GitHub
- GitHub Actions CI (pytest + ng build)
- GitHub Pages deployment

## 🚀 Run Locally

```bash
# Terminal 1 – Flask backend
source venv/bin/activate
python app.py
# → http://127.0.0.1:5000/api/health

# Terminal 2 – Angular frontend
cd ml-frontend
npx ng serve --open
# → http://localhost:4200  (proxied to Flask)

# Run tests
source venv/bin/activate && pytest tests/ -v
```

*Last updated: 2026-10-25 19:56 (UTC+5)*
