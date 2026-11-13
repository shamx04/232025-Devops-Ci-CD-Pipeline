import { Component, DestroyRef, EventEmitter, Input, OnChanges, Output, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DataService, FlowHandoff, ReplayData } from '../data.service';
import { FlowValues } from '../flow-fields';

type Outcome = 'passed' | 'alarm' | 'missed' | 'caught';

interface ReplayFlow {
  index: number;
  values: FlowValues;
  cat: string;
  score: number;
  outcome: Outcome;
  summary: string;
}

const SPEEDS = [
  { id: 'slow', label: 'Slow', perSecond: 5 },
  { id: 'fast', label: 'Fast', perSecond: 40 },
  { id: 'fastest', label: 'Fastest', perSecond: 400 }
] as const;

/** Full test-set results at the 0.5 threshold, for comparison with the running sample. */
const FULL_TEST = { accuracy: 0.8915, caught: 0.9799, falseAlarms: 0.2168 };

@Component({
  selector: 'app-replay',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './replay.component.html',
  styleUrl: './replay.component.css'
})
export class ReplayComponent implements OnChanges {
  @Input() active = false;
  @Output() open = new EventEmitter<FlowHandoff>();

  private readonly data = inject(DataService);
  readonly speeds = SPEEDS;
  readonly full = FULL_TEST;

  readonly flows = signal<ReplayFlow[]>([]);
  readonly loadError = signal(false);
  readonly shown = signal(0);
  readonly playing = signal(false);
  readonly speed = signal<(typeof SPEEDS)[number]['id']>('fast');

  readonly seen = computed(() => this.flows().slice(0, this.shown()));
  readonly cells = computed(() => {
    const by: Record<Outcome, ReplayFlow[]> = { passed: [], alarm: [], missed: [], caught: [] };
    for (const f of this.seen()) by[f.outcome].push(f);
    return by;
  });
  readonly stats = computed(() => {
    const c = this.cells();
    const n = this.shown();
    const attacks = c.caught.length + c.missed.length;
    const normals = c.passed.length + c.alarm.length;
    return {
      n,
      accuracy: n ? (c.passed.length + c.caught.length) / n : 0,
      caught: attacks ? c.caught.length / attacks : 0,
      falseAlarms: normals ? c.alarm.length / normals : 0,
      attacks,
      normals
    };
  });
  /** Running accuracy, sampled every 10 flows, as SVG polyline points. */
  readonly accuracyLine = signal<number[]>([]);
  readonly sparkPoints = computed(() => {
    const pts = this.accuracyLine();
    const total = this.flows().length || 1;
    return pts.map((a, i) => `${((i * 10) / total) * 300},${this.yFor(a)}`).join(' ');
  });
  readonly latest = computed(() => this.seen().slice(-6).reverse());
  readonly byType = computed(() => {
    const map = new Map<string, { seen: number; caught: number }>();
    for (const f of this.seen()) {
      if (f.cat === 'Normal') continue;
      const e = map.get(f.cat) ?? { seen: 0, caught: 0 };
      e.seen++;
      if (f.outcome === 'caught') e.caught++;
      map.set(f.cat, e);
    }
    return [...map.entries()].map(([cat, e]) => ({ cat, ...e })).sort((a, b) => b.seen - a.seen);
  });
  readonly done = computed(() => this.flows().length > 0 && this.shown() >= this.flows().length);

  private frame = 0;
  private last = 0;
  private carry = 0;

  constructor() {
    this.data.replay$.subscribe({
      next: d => this.flows.set(this.prepare(d)),
      error: () => this.loadError.set(true)
    });
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frame));
  }

  ngOnChanges(): void {
    if (!this.active) this.pause();
  }

  yFor(accuracy: number): number {
    // 60% at the bottom, 100% at the top of a 60px-high chart.
    return 60 - Math.max(0, Math.min(1, (accuracy - 0.6) / 0.4)) * 60;
  }

  toggle(): void {
    if (this.playing()) {
      this.pause();
    } else {
      if (this.done()) this.restart();
      this.play();
    }
  }

  play(): void {
    if (this.playing() || !this.flows().length) return;
    this.playing.set(true);
    this.last = performance.now();
    this.frame = requestAnimationFrame(t => this.tick(t));
  }

  pause(): void {
    this.playing.set(false);
    cancelAnimationFrame(this.frame);
  }

  restart(): void {
    this.pause();
    this.shown.set(0);
    this.accuracyLine.set([]);
    this.carry = 0;
  }

  skipToEnd(): void {
    this.pause();
    this.advance(this.flows().length - this.shown());
  }

  setSpeed(id: (typeof SPEEDS)[number]['id']): void {
    this.speed.set(id);
  }

  openFlow(f: ReplayFlow): void {
    this.pause();
    this.open.emit({
      values: f.values,
      title: `Replay flow #${f.index + 1}`,
      score: f.score,
      truth: f.cat
    });
  }

  /** Clicks on dots arrive at the cell; the dot carries its flow index. */
  onCellClick(event: Event): void {
    const i = (event.target as HTMLElement).dataset['i'];
    if (i !== undefined) this.openFlow(this.flows()[+i]);
  }

  outcomeLabel(o: Outcome): string {
    return { passed: 'passed', alarm: 'false alarm', missed: 'missed', caught: 'caught' }[o];
  }

  private tick(now: number): void {
    const perSecond = SPEEDS.find(s => s.id === this.speed())!.perSecond;
    this.carry += ((now - this.last) / 1000) * perSecond;
    this.last = now;
    const step = Math.floor(this.carry);
    if (step > 0) {
      this.carry -= step;
      this.advance(step);
    }
    if (this.done()) {
      this.playing.set(false);
      return;
    }
    if (this.playing()) this.frame = requestAnimationFrame(t => this.tick(t));
  }

  private advance(step: number): void {
    const target = Math.min(this.flows().length, this.shown() + step);
    const flows = this.flows();
    const line = [...this.accuracyLine()];
    let right = 0;
    // Recount from what is already shown, then extend the sampled accuracy line.
    for (let i = 0; i < this.shown(); i++) {
      if (flows[i].outcome === 'passed' || flows[i].outcome === 'caught') right++;
    }
    for (let i = this.shown(); i < target; i++) {
      if (flows[i].outcome === 'passed' || flows[i].outcome === 'caught') right++;
      if ((i + 1) % 10 === 0) line.push(right / (i + 1));
    }
    this.accuracyLine.set(line);
    this.shown.set(target);
  }

  private prepare(d: ReplayData): ReplayFlow[] {
    return d.flows.map((f, index) => {
      const values: FlowValues = {};
      d.features.forEach((k, i) => (values[k] = f.v[i]));
      const attack = f.cat !== 'Normal';
      const flagged = f.p > 0.5;
      const outcome: Outcome = attack ? (flagged ? 'caught' : 'missed') : (flagged ? 'alarm' : 'passed');
      const service = values['service'] === '-' ? '' : ` ${values['service']}`;
      return {
        index, values, cat: f.cat, score: f.p, outcome,
        summary: `${String(values['proto']).toUpperCase()}${service}`
      };
    });
  }
}
