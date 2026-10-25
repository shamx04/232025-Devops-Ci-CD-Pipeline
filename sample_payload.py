import json, requests

API_URL = "http://127.0.0.1:5000/api/predict"

payload = {
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

print("Sending payload to", API_URL)
resp = requests.post(API_URL, json=payload)
print("Status:", resp.status_code)
print("Response:", json.dumps(resp.json(), indent=2))
