"""
Integration tests for the Flask prediction API.
Run from the project root with: pytest
"""
import json
import pytest
import sys
import os

# Ensure the project root is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


# Minimal valid payload (uses defaults for missing numeric features)
SAMPLE_PAYLOAD = {
    "dur": 0.0,
    "proto": "tcp",
    "service": "http",
    "state": "FIN",
    "spkts": 2,
    "dpkts": 0,
    "sbytes": 500,
    "dbytes": 0,
    "rate": 0.0,
    "sttl": 254,
    "dttl": 0,
    "sload": 0.0,
    "dload": 0.0,
    "sloss": 0,
    "dloss": 0,
    "sinpkt": 0.0,
    "dinpkt": 0.0,
    "sjit": 0.0,
    "djit": 0.0,
    "swin": 0,
    "stcpb": 0,
    "dtcpb": 0,
    "dwin": 0,
    "tcprtt": 0.0,
    "synack": 0.0,
    "ackdat": 0.0,
    "smean": 0,
    "dmean": 0,
    "trans_depth": 0,
    "response_body_len": 0,
    "ct_srv_src": 1,
    "ct_state_ttl": 0,
    "ct_dst_ltm": 1,
    "ct_src_dport_ltm": 1,
    "ct_dst_sport_ltm": 1,
    "ct_dst_src_ltm": 1,
    "is_ftp_login": 0,
    "ct_ftp_cmd": 0,
    "ct_flw_http_mthd": 0,
    "ct_src_ltm": 1,
    "ct_srv_dst": 1,
    "is_sm_ips_ports": 0
}


def test_health_check(client):
    """GET /api/health should return 200 and status ok."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "ok"


def test_predict_returns_200(client):
    """POST /api/predict with a valid payload should return 200."""
    resp = client.post(
        "/api/predict",
        data=json.dumps(SAMPLE_PAYLOAD),
        content_type="application/json"
    )
    assert resp.status_code == 200


def test_predict_response_shape(client):
    """Response should contain prediction, label and probabilities keys."""
    resp = client.post(
        "/api/predict",
        data=json.dumps(SAMPLE_PAYLOAD),
        content_type="application/json"
    )
    data = resp.get_json()
    assert "prediction" in data
    assert "label" in data
    assert "probabilities" in data
    assert "Normal" in data["probabilities"]
    assert "Attack" in data["probabilities"]


def test_predict_label_values(client):
    """Label must be either 'Normal' or 'Attack'."""
    resp = client.post(
        "/api/predict",
        data=json.dumps(SAMPLE_PAYLOAD),
        content_type="application/json"
    )
    data = resp.get_json()
    assert data["label"] in ("Normal", "Attack")


def test_predict_probabilities_sum_to_one(client):
    """Normal + Attack probabilities must sum to ~1.0."""
    resp = client.post(
        "/api/predict",
        data=json.dumps(SAMPLE_PAYLOAD),
        content_type="application/json"
    )
    data = resp.get_json()
    total = data["probabilities"]["Normal"] + data["probabilities"]["Attack"]
    assert abs(total - 1.0) < 0.01


def test_predict_empty_body_returns_error(client):
    """POST with no body should return 400 or 500 (not 200)."""
    resp = client.post("/api/predict", data="", content_type="application/json")
    assert resp.status_code in (400, 500)
