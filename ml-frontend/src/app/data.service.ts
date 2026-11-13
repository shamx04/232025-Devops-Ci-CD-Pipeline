import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { FlowValues } from './flow-fields';

export interface ReportData {
  model: {
    name: string; trees: number; max_depth: number; train_flows: number; test_flows: number;
    roc_auc: number; train_seconds: number; ms_per_1000_flows: number;
  };
  bins: number;
  histograms: { normal: number[]; attack: number[]; by_type: Record<string, number[]> };
  importances: { feature: string; importance: number }[];
  xgb: {
    accuracy: number;
    classes: string[];
    recall: Record<string, number>;
    precision: Record<string, number>;
    support: Record<string, number>;
    confusion: number[][];
  };
}

export interface ReplayData {
  features: string[];
  flows: { v: (number | string)[]; cat: string; p: number }[];
}

/** A flow handed from one view to another, with the score the model gave it ahead of time. */
export interface FlowHandoff {
  values: FlowValues;
  title: string;
  score: number;
  truth: string;
}

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);

  // Relative URLs so they resolve under the GitHub Pages base href too.
  readonly report$: Observable<ReportData> = this.http.get<ReportData>('data/report.json').pipe(shareReplay(1));
  readonly replay$: Observable<ReplayData> = this.http.get<ReplayData>('data/replay.json').pipe(shareReplay(1));

  /** Set by Replay when someone opens a flow; read and cleared by the checker. */
  readonly handoff = signal<FlowHandoff | null>(null);
}
