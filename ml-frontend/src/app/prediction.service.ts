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

@Injectable({ providedIn: 'root' })
export class PredictionService {
  private apiUrl = '/api/predict';

  constructor(private http: HttpClient) {}

  predict(payload: Record<string, unknown>): Observable<PredictionResult> {
    return this.http.post<PredictionResult>(this.apiUrl, payload);
  }
}
