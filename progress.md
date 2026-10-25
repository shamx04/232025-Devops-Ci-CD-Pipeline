# Project Progress Tracker

## ✅ Completed (Steps 1–14)

| Step | Item | Status |
|------|------|--------|
| 1 | Git 2.56, Python 3.14, Node v26, npm 10 verified | ✅ |
| 2 | Python venv created (`venv/`) | ✅ |
| 3 | `requirements.txt` – Flask, joblib, scikit-learn 1.6.1, pytest, flask-cors, numpy | ✅ |
| 4 | `app.py` – Flask REST API, `/api/predict` + `/api/health`, full 42-feature preprocessing | ✅ |
| 5 | `sample_payload.py` – real 42-feature sample payload | ✅ |
| 6 | `tests/test_api.py` – **6/6 PASS, 0 warnings** | ✅ |
| 7 | Angular 22 app (`ml-frontend/`) with 42-field reactive form + PredictionService | ✅ |
| 8 | Proxy config (`proxy.conf.json`) + `angular.json` updated | ✅ |
| 9 | Git repo exists, `.gitignore` added | ✅ |
| 10 | All code committed, pushed to `main` | ✅ |
| 11 | Remote: `https://github.com/shamx04/232025-Devops-Ci-CD-Pipeline.git` | ✅ |
| 12 | `.github/workflows/backend-ci.yml` – runs pytest on push/PR | ✅ |
| 13 | `.github/workflows/frontend-deploy.yml` – builds Angular + deploys to gh-pages | ✅ |
| 14 | `base-href` set to `/232025-Devops-Ci-CD-Pipeline/` for GitHub Pages | ✅ |

## ⏳ Pending (Step 15)
- Enable **GitHub Pages** in the repo settings:
  - Go to: `https://github.com/shamx04/232025-Devops-Ci-CD-Pipeline/settings/pages`
  - Source → **Deploy from a branch**
  - Branch → `gh-pages` / `/ (root)`
  - Save → wait ~2 min for the workflow to deploy
- Validate the live URL: `https://shamx04.github.io/232025-Devops-Ci-CD-Pipeline/`

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

## 📎 Links
- GitHub repo: https://github.com/shamx04/232025-Devops-Ci-CD-Pipeline
- Actions: https://github.com/shamx04/232025-Devops-Ci-CD-Pipeline/actions
- Pages (after enabling): https://shamx04.github.io/232025-Devops-Ci-CD-Pipeline/

*Last updated: 2026-10-25 19:58 (UTC+5)*
