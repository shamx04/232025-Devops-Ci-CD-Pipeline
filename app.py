import json
from flask import Flask, request, jsonify
import joblib
import os

app = Flask(__name__)

# Load model artefacts (assumes they are in rf_binary_artifacts directory)
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'rf_binary_artifacts', 'rf_binary.joblib')
ENCODER_PATH = os.path.join(os.path.dirname(__file__), 'rf_binary_artifacts', 'encoder.joblib')

model = joblib.load(MODEL_PATH)
encoder = joblib.load(ENCODER_PATH)

@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.get_json(force=True)
    # Expect a dict of feature values; encoder transforms to model input
    try:
        # Convert input dict to ordered list matching training feature order
        # Here we assume encoder is a scikit‑learn ColumnTransformer or similar that can transform a list of dicts
        X = encoder.transform([data])
        preds = model.predict_proba(X)
        # Return probabilities for each class
        return jsonify({
            'predictions': preds.tolist()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    # Run on host accessible to Angular proxy (localhost)
    app.run(host='127.0.0.1', port=5000, debug=True)
