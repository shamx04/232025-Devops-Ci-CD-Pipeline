import json
import os
import warnings
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib

# Suppress sklearn feature-name warnings (we pass numpy arrays by design)
warnings.filterwarnings("ignore", message="X does not have valid feature names")
warnings.filterwarnings("ignore", category=DeprecationWarning)

app = Flask(__name__)
CORS(app)

BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.join(BASE_DIR, "rf_binary_artifacts")

# Load artefacts once at startup
model   = joblib.load(os.path.join(ARTIFACTS_DIR, "rf_binary.joblib"))
encoder = joblib.load(os.path.join(ARTIFACTS_DIR, "encoder.joblib"))

with open(os.path.join(ARTIFACTS_DIR, "feature_order.json")) as f:
    feature_meta = json.load(f)

FEATURE_ORDER    = feature_meta["feature_order"]    # 42 features in model order
CATEGORICAL_COLS = feature_meta["categorical_cols"] # ['proto', 'service', 'state']
CAT_INDICES      = [FEATURE_ORDER.index(c) for c in CATEGORICAL_COLS]

# Typical value of every feature in *normal* training traffic (median, or most
# common category). Built by scripts/build_frontend_data.py; used by /api/explain.
BASELINE_PATH = os.path.join(ARTIFACTS_DIR, "normal_baseline.json")
NORMAL_BASELINE = None
if os.path.exists(BASELINE_PATH):
    with open(BASELINE_PATH) as f:
        NORMAL_BASELINE = json.load(f)["typical_normal"]


def preprocess(payload: dict) -> np.ndarray:
    """
    1.  Build an ordered row of all 42 raw values from the payload.
    2.  Pass only the 3 categorical values through the OrdinalEncoder.
    3.  Substitute the encoded ordinal floats back into the row.
    4.  Return a 2-D float array ready for model.predict / predict_proba.
    """
    row = [payload.get(f, 0) for f in FEATURE_ORDER]

    # Encode categoricals: encoder expects [[proto, service, state]]
    cat_values = [[row[i] for i in CAT_INDICES]]
    encoded    = encoder.transform(cat_values)[0]

    for idx, enc_val in zip(CAT_INDICES, encoded):
        row[idx] = enc_val

    return np.array(row, dtype=float).reshape(1, -1)


def explain(payload: dict, top: int = 6) -> dict:
    """
    "What if this one value were typical of normal traffic?"

    For each of the 42 features, copy the flow, replace that single feature with
    its typical normal value, and re-score the copy. The drop in attack
    probability is how much that feature pushed the flow towards "attack".
    One batch of 42 rows, so it costs about as much as a single prediction.
    """
    if NORMAL_BASELINE is None:
        raise RuntimeError("normal_baseline.json is missing; run scripts/build_frontend_data.py")

    original = preprocess(payload)
    p_attack = float(model.predict_proba(original)[0][1])

    typical_row = preprocess(NORMAL_BASELINE)[0]
    variants = np.repeat(original, len(FEATURE_ORDER), axis=0)
    for i in range(len(FEATURE_ORDER)):
        variants[i, i] = typical_row[i]
    p_variants = model.predict_proba(variants)[:, 1]

    features = []
    for i, name in enumerate(FEATURE_ORDER):
        if original[0, i] == typical_row[i]:
            continue
        features.append({
            "feature": name,
            "value": payload.get(name, 0),
            "typical": NORMAL_BASELINE[name],
            "attack_if_typical": round(float(p_variants[i]), 4),
            "effect": round(p_attack - float(p_variants[i]), 4),
        })
    features.sort(key=lambda f: abs(f["effect"]), reverse=True)

    return {
        "attack_probability": round(p_attack, 4),
        "features": [f for f in features if f["effect"] != 0][:top],
    }


@app.route("/api/predict", methods=["POST"])
def predict():
    payload = request.get_json(force=True)
    if payload is None:
        return jsonify({"error": "No JSON body received"}), 400

    try:
        X          = preprocess(payload)
        probas     = model.predict_proba(X)[0].tolist()
        prediction = int(model.predict(X)[0])
        label      = "Attack" if prediction == 1 else "Normal"
        return jsonify({
            "prediction": prediction,
            "label": label,
            "probabilities": {
                "Normal": round(probas[0], 4),
                "Attack": round(probas[1], 4)
            }
        })
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/explain", methods=["POST"])
def explain_route():
    payload = request.get_json(force=True, silent=True)
    if not payload:
        return jsonify({"error": "No JSON body received"}), 400
    try:
        return jsonify(explain(payload))
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
