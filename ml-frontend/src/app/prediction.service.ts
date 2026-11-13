import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PredictionResult {
  prediction: number;
  label: string;
  probabilities: {
    Normal: number;
    Attack: number;
  };
  error?: string;
}

export interface ExplainFeature {
  feature: string;
  value: number | string;
  typical: number | string;
  attack_if_typical: number;
  effect: number;
}

export interface Explanation {
  attack_probability: number;
  features: ExplainFeature[];
}

@Injectable({ providedIn: 'root' })
export class PredictionService {
  constructor(private http: HttpClient) {}

  predict(payload: Record<string, unknown>): Observable<PredictionResult> {
    return this.http.post<PredictionResult>('/api/predict', payload);
  }

  explain(payload: Record<string, unknown>): Observable<Explanation> {
    return this.http.post<Explanation>('/api/explain', payload);
  }
}
