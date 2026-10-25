import json, requests

# Adjust the URL if Flask runs on a different host/port
API_URL = 'http://127.0.0.1:5000/api/predict'

# Example payload with 24 features (replace with actual feature names)
payload = {
    "feature1": 0.5,
    "feature2": 1.2,
    "feature3": 3.4,
    "feature4": 0,
    "feature5": 2,
    "feature6": 1,
    "feature7": 0,
    "feature8": 5,
    "feature9": 0.1,
    "feature10": 0.2,
    "feature11": 0.3,
    "feature12": 0.4,
    "feature13": 0.5,
    "feature14": 0.6,
    "feature15": 0.7,
    "feature16": 0.8,
    "feature17": 0.9,
    "feature18": 1.0,
    "feature19": 1.1,
    "feature20": 1.2,
    "feature21": 1.3,
    "feature22": 1.4,
    "feature23": 1.5,
    "feature24": 1.6
}

response = requests.post(API_URL, json=payload)
print('Status:', response.status_code)
print('Response:', response.json())
