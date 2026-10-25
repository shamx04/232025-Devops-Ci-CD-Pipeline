# Network Intrusion Detection System — Full-Stack ML CI/CD Application

A machine learning web application that predicts network intrusion attacks using a trained Random Forest classifier. Built with Flask, Angular 22, and automated with GitHub Actions CI/CD.

---

## 📌 Project Overview
- **Domain:** Network Intrusion Detection / Cybersecurity
- **Model:** Random Forest Binary Classifier (`rf_binary.joblib`) with `OrdinalEncoder` (`encoder.joblib`)
- **Classification Task:** Binary classification — **Normal Traffic (0)** vs. **Attack (1)**
- **Features:** 42 network flow attributes (including duration, protocol, service, state, packet counts, byte counts, TTL, rates, etc.)

---

## 🛠️ Technology Stack & Versions
- **Python:** 3.11+ / 3.14 (Virtual Environment `venv`)
- **Backend Framework:** Flask 3.0.3, Flask-CORS 4.0.1
- **ML / Data Libraries:** scikit-learn 1.6.1, joblib 1.4.2, numpy 2.x
- **Frontend Framework:** Angular 22 (Standalone Components, Reactive Forms)
- **Node.js:** v24 / v26 (LTS)
- **Testing:** pytest 8.2.2
- **CI/CD:** GitHub Actions (Python test matrix, Angular production build, GitHub Pages)

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
Ensure Git, Python 3, and Node.js are installed:
```bash
git --version
python3 --version
node -v
npm -v
```

### 2. Backend Setup & Run (Terminal 1)
```bash
# Clone the repository
git clone https://github.com/shamx04/232025-Devops-Ci-CD-Pipeline.git
cd 232025-Devops-Ci-CD-Pipeline

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start Flask API
python app.py
```
Flask runs at `http://127.0.0.1:5000`. Health check: `http://127.0.0.1:5000/api/health`.

### 3. Frontend Setup & Run (Terminal 2)
```bash
cd ml-frontend

# Install dependencies
npm install

# Start Angular development server with proxy
npx ng serve --open --proxy-config proxy.conf.json
```
The browser will automatically open at `http://localhost:4200`.

### 4. Running Backend Tests (Terminal 3)
```bash
source venv/bin/activate
pytest tests/ -v
```

---

## 📡 API Specification

### `POST /api/predict`
Accepts a JSON payload with 42 network traffic flow features and returns the binary prediction and probabilities:
```json
{
  "prediction": 0,
  "label": "Normal",
  "probabilities": {
    "Normal": 0.985,
    "Attack": 0.015
  }
}
```

### `GET /api/health`
Returns API status:
```json
{
  "status": "ok"
}
```

---

## 🔄 CI/CD & Deployment Architecture
- **Backend CI (`.github/workflows/backend-ci.yml`):** Automatically checks out code, installs Python dependencies, and runs the full pytest suite on every push to `main`.
- **Frontend CI/CD (`.github/workflows/frontend-deploy.yml`):** Sets up Node 24, builds the Angular app with `--base-href`, and deploys the static bundle to GitHub Pages.

### Live Links:
- **GitHub Repository:** [https://github.com/shamx04/232025-Devops-Ci-CD-Pipeline](https://github.com/shamx04/232025-Devops-Ci-CD-Pipeline)
- **GitHub Actions Runs:** [https://github.com/shamx04/232025-Devops-Ci-CD-Pipeline/actions](https://github.com/shamx04/232025-Devops-Ci-CD-Pipeline/actions)
- **Static GitHub Pages Site:** [https://shamx04.github.io/232025-Devops-Ci-CD-Pipeline/](https://shamx04.github.io/232025-Devops-Ci-CD-Pipeline/)

---

## ⚠️ Deployment Limitations & Research Disclaimer
1. **GitHub Pages Static-Only Limitation:** GitHub Pages only hosts static client assets (HTML/CSS/JS). It cannot execute Python, Flask, or scikit-learn models. Therefore, live inferences run through the local Flask server (`http://127.0.0.1:5000`) via Angular's reverse-proxy configuration.
2. **Research & Educational Disclaimer:** This model is intended for academic research and educational demonstration only. It must not be deployed as an unverified production firewall or mission-critical security filter without formal operational validation.
