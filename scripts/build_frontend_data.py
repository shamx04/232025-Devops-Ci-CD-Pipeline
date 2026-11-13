"""
Builds the data files the frontend and the explain endpoint need, from the
trained random forest and the UNSW-NB15 CSVs.

    venv/bin/python scripts/build_frontend_data.py

Writes:
  rf_binary_artifacts/normal_baseline.json   typical value of each feature in normal traffic
  ml-frontend/public/data/report.json        test-set results: score histograms, importances, XGB metrics
  ml-frontend/public/data/replay.json        a random sample of test flows with the model's scores
  ml-frontend/src/app/data/samples.json      the sample flows on the checker page, with explanations

Only csv + numpy are used so it runs in the same venv as the API.
"""
import csv
import json
import os
import sys
import zipfile
from collections import Counter

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, "rf_binary_artifacts")
PUBLIC = os.path.join(ROOT, "ml-frontend", "public", "data")
APP_DATA = os.path.join(ROOT, "ml-frontend", "src", "app", "data")
BINS = 100
REPLAY_SIZE = 1500
SEED = 7

with open(os.path.join(ART, "feature_order.json")) as f:
    meta = json.load(f)
FEATURES = meta["feature_order"]
CATS = set(meta["categorical_cols"])


def read_rows(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            out = {k: (row[k] if k in CATS else float(row[k])) for k in FEATURES}
            out["attack_cat"] = row["attack_cat"].strip() or "Normal"
            out["label"] = int(row["label"])
            yield out


def tidy(v):
    """Short JSON numbers: ints stay ints, floats keep 6 significant digits."""
    if isinstance(v, str):
        return v
    if float(v).is_integer():
        return int(v)
    return float(f"{v:.6g}")


# ---------------------------------------------------------------- baseline
print("Reading training set for the normal baseline...")
train_normal = [r for r in read_rows(os.path.join(ROOT, "training-set.csv")) if r["label"] == 0]
baseline = {}
for k in FEATURES:
    if k in CATS:
        baseline[k] = Counter(r[k] for r in train_normal).most_common(1)[0][0]
    else:
        baseline[k] = tidy(float(np.median([r[k] for r in train_normal])))
with open(os.path.join(ART, "normal_baseline.json"), "w") as f:
    json.dump({"source": "median of normal flows in training-set.csv (mode for categories)",
               "n_flows": len(train_normal), "typical_normal": baseline}, f, indent=1)
print(f"  {len(train_normal):,} normal training flows")

# The API module loads the model and the baseline we just wrote.
sys.path.insert(0, ROOT)
import app as api  # noqa: E402

# ---------------------------------------------------------------- score test set
print("Scoring the test set...")
test = list(read_rows(os.path.join(ROOT, "testing-set.csv")))
X = np.array([[r[k] if k not in CATS else 0 for k in FEATURES] for r in test], dtype=float)
cat_idx = [FEATURES.index(c) for c in meta["categorical_cols"]]
X[:, cat_idx] = api.encoder.transform([[r[c] for c in meta["categorical_cols"]] for r in test])
p = api.model.predict_proba(X)[:, 1]
labels = np.array([r["label"] for r in test])
cats = np.array([r["attack_cat"] for r in test])

pred = p > 0.5
acc = float((pred == (labels == 1)).mean())
print(f"  {len(test):,} flows, accuracy at 0.5 = {acc:.4f} (metrics_rf.json says 0.8915)")

# Bin k holds scores in (k/100, (k+1)/100], with 0 in bin 0, so "flagged at
# threshold k/100" is exactly the sum of bins >= k, matching predict()'s p > 0.5.
bin_idx = np.clip(np.ceil(p * BINS).astype(int) - 1, 0, BINS - 1)


def hist(mask):
    return np.bincount(bin_idx[mask], minlength=BINS).tolist()


with open(os.path.join(ART, "metrics_rf.json")) as f:
    rf_metrics = json.load(f)
with zipfile.ZipFile(os.path.join(ROOT, "xgb_multiclass_artifacts.zip")) as z:
    xgb = json.loads(z.read("metrics_xgb.json"))
    xgb_classes = json.loads(z.read("classes.json"))

importances = sorted(
    ({"feature": k, "importance": round(float(v), 5)} for k, v in zip(FEATURES, api.model.feature_importances_)),
    key=lambda d: d["importance"], reverse=True)

report = {
    "model": {
        "name": "Random forest", "trees": rf_metrics["n_estimators"], "max_depth": rf_metrics["max_depth"],
        "train_flows": 175341, "test_flows": len(test),
        "roc_auc": round(rf_metrics["roc_auc"], 4),
        "train_seconds": round(rf_metrics["train_seconds"], 1),
        "ms_per_1000_flows": round(rf_metrics["inference_seconds_per_1000_flows"] * 1000, 1),
    },
    "bins": BINS,
    "histograms": {
        "normal": hist(labels == 0),
        "attack": hist(labels == 1),
        "by_type": {c: hist(cats == c) for c in sorted(set(cats)) if c != "Normal"},
    },
    "importances": importances,
    "xgb": {
        "accuracy": round(xgb["accuracy"], 4),
        "classes": xgb_classes,
        "recall": {c: round(v, 4) for c, v in xgb["recall_per_class"].items()},
        "precision": {c: round(xgb["classification_report"][c]["precision"], 4) for c in xgb_classes},
        "support": {c: int(xgb["classification_report"][c]["support"]) for c in xgb_classes},
        "confusion": xgb["confusion_matrix"],
    },
}
os.makedirs(PUBLIC, exist_ok=True)
with open(os.path.join(PUBLIC, "report.json"), "w") as f:
    json.dump(report, f, separators=(",", ":"))

# ---------------------------------------------------------------- replay sample
rng = np.random.default_rng(SEED)
pick = rng.choice(len(test), size=REPLAY_SIZE, replace=False)
replay = {
    "features": FEATURES,
    "flows": [
        {"v": [tidy(test[i][k]) for k in FEATURES], "cat": test[i]["attack_cat"], "p": round(float(p[i]), 4)}
        for i in pick
    ],
}
with open(os.path.join(PUBLIC, "replay.json"), "w") as f:
    json.dump(replay, f, separators=(",", ":"))

# ---------------------------------------------------------------- sample flows
def first(cond, prefer=None):
    idx = [i for i, r in enumerate(test) if cond(r, p[i])]
    if not idx:
        raise SystemExit("no flow matches a sample rule")
    if prefer:
        idx.sort(key=lambda i: prefer(test[i], p[i]))
    return idx[0]


rules = [
    ("ftp", "FTP file transfer", "A file sent over an FTP data channel, closed cleanly.",
     first(lambda r, s: r["label"] == 0 and r["service"] == "ftp-data" and r["state"] == "FIN" and r["spkts"] >= 10 and s < 0.05)),
    ("web", "Web page request", "An HTTP request answered with a page.",
     first(lambda r, s: r["label"] == 0 and r["service"] == "http" and r["state"] == "FIN" and r["response_body_len"] > 1000 and s < 0.05)),
    ("dns", "DNS flood", "A burst of UDP DNS queries with no replies.",
     first(lambda r, s: r["attack_cat"] == "Generic" and r["service"] == "dns" and r["proto"] == "udp" and s > 0.97)),
    ("shellcode", "Shellcode delivery", "A short TCP session carrying an exploit payload.",
     first(lambda r, s: r["attack_cat"] == "Shellcode" and r["proto"] == "tcp" and r["spkts"] >= 6 and s > 0.9)),
    ("false-alarm", "Normal, but flagged", "Real normal traffic the model mistakes for an attack.",
     first(lambda r, s: r["label"] == 0 and r["proto"] == "udp" and s > 0.9, prefer=lambda r, s: -s)),
    ("missed", "Attack it misses", "A fuzzing flow the model lets through as normal.",
     first(lambda r, s: r["attack_cat"] == "Fuzzers" and s < 0.1, prefer=lambda r, s: s)),
]
samples = []
for sid, title, summary, i in rules:
    values = {k: tidy(test[i][k]) for k in FEATURES}
    samples.append({
        "id": sid, "title": title, "summary": summary,
        "truth": test[i]["attack_cat"], "score": round(float(p[i]), 4),
        "data": values, "explain": api.explain(values),
    })
    print(f"  sample {sid:12s} truth={test[i]['attack_cat']:10s} p(attack)={p[i]:.3f}")
os.makedirs(APP_DATA, exist_ok=True)
with open(os.path.join(APP_DATA, "samples.json"), "w") as f:
    json.dump(samples, f, indent=1)

for name in ("report.json", "replay.json"):
    print(f"  wrote {name}: {os.path.getsize(os.path.join(PUBLIC, name)) / 1024:.0f} KB")
print("Done.")
