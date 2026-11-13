import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { DataService, ReportData } from '../data.service';
import { fieldLabel } from '../flow-fields';

interface Bar {
  k: number;
  x: number;
  normal: number;
  attack: number;
  hNormal: number;
  hAttack: number;
}

const CHART_W = 1000;
const HALF_H = 110;

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './report.component.html',
  styleUrl: './report.component.css'
})
export class ReportComponent {
  private readonly data = inject(DataService);
  readonly report = toSignal(this.data.report$);
  readonly fieldLabel = fieldLabel;
  readonly chartW = CHART_W;
  readonly halfH = HALF_H;

  /** Threshold as a bin index: a flow is flagged when its score is above k / 100. */
  readonly k = signal(50);
  readonly hovered = signal<Bar | null>(null);

  readonly threshold = computed(() => this.k() / (this.report()?.bins ?? 100));

  readonly bars = computed<Bar[]>(() => {
    const r = this.report();
    if (!r) return [];
    const { normal, attack } = r.histograms;
    const max = Math.max(...normal, ...attack);
    const h = (n: number) => (n ? (Math.log10(n + 1) / Math.log10(max + 1)) * HALF_H : 0);
    const w = CHART_W / r.bins;
    return normal.map((n, k) => ({ k, x: k * w, normal: n, attack: attack[k], hNormal: h(n), hAttack: h(attack[k]) }));
  });

  readonly outcome = computed(() => {
    const r = this.report();
    if (!r) return null;
    return this.outcomeAt(r, this.k());
  });

  readonly byType = computed(() => {
    const r = this.report();
    if (!r) return [];
    return Object.entries(r.histograms.by_type)
      .map(([cat, h]) => {
        const total = sum(h);
        return { cat, total, caught: sum(h.slice(this.k())) / total };
      })
      .sort((a, b) => b.total - a.total);
  });

  readonly presets = computed(() => {
    const r = this.report();
    if (!r) return [];
    let best = 50, bestAcc = 0, careful = 50;
    for (let k = 1; k < r.bins; k++) {
      const o = this.outcomeAt(r, k);
      if (o.accuracy > bestAcc) { bestAcc = o.accuracy; best = k; }
      if (o.caughtRate >= 0.95) careful = k;
    }
    return [
      { k: 50, label: 'Default', hint: 'What the model uses' },
      { k: best, label: 'Most accurate', hint: 'Highest share of flows right' },
      { k: careful, label: 'Fewer false alarms', hint: 'Still catches 95% of attacks' }
    ];
  });

  readonly topFeatures = computed(() => {
    const r = this.report();
    if (!r) return [];
    const top = r.importances.slice(0, 10);
    const max = top[0]?.importance ?? 1;
    return top.map(f => ({ ...f, width: f.importance / max }));
  });

  readonly xgbRows = computed(() => {
    const r = this.report();
    if (!r) return [];
    const { classes, confusion, recall, precision, support } = r.xgb;
    return classes.map((c, i) => {
      const row = confusion[i];
      const total = sum(row);
      return {
        cls: c,
        recall: recall[c],
        precision: precision[c],
        support: support[c],
        cells: row.map((n, j) => ({ n, share: total ? n / total : 0, predicted: classes[j] }))
      };
    });
  });

  setK(value: string | number): void {
    this.k.set(Math.min(99, Math.max(1, Math.round(+value))));
  }

  /** Hover target for a bin, also used by keyboard via the slider. */
  hover(bar: Bar | null): void {
    this.hovered.set(bar);
  }

  private outcomeAt(r: ReportData, k: number) {
    const { normal, attack } = r.histograms;
    const alarm = sum(normal.slice(k));
    const passed = sum(normal) - alarm;
    const caught = sum(attack.slice(k));
    const missed = sum(attack) - caught;
    const total = alarm + passed + caught + missed;
    return {
      passed, alarm, missed, caught,
      accuracy: (passed + caught) / total,
      caughtRate: caught / (caught + missed),
      alarmRate: alarm / (alarm + passed)
    };
  }
}

function sum(a: number[]): number {
  return a.reduce((s, n) => s + n, 0);
}
