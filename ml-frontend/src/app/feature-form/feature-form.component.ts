import { ChangeDetectorRef, Component, HostListener, OnInit, effect, inject, untracked } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PredictionService, PredictionResult, Explanation, ExplainFeature } from '../prediction.service';
import { DataService } from '../data.service';
import { FIELD_GROUPS, FieldDef, FieldGroup, FlowValues, GroupId, fieldLabel, flowKey } from '../flow-fields';
import SAMPLE_DATA from '../data/samples.json';

interface Sample {
  id: string;
  title: string;
  summary: string;
  truth: string;
  score: number;
  data: FlowValues;
  explain: Explanation;
}

interface Packet {
  left: number;   // % along the lane
  height: number; // 0..1 relative bar height
  delay: number;  // ms
}

interface Trace {
  out: Packet[];
  back: Packet[];
  outHidden: number;
  backHidden: number;
}

/** Where a verdict came from: the live API, a score the model gave earlier, or the demo rule. */
type Source = 'model' | 'recorded' | 'rule';

export interface CheckEntry {
  id: number;
  time: string;
  title: string;
  edited: boolean;
  label: 'Normal' | 'Attack';
  confidence: number;
  latencyMs: number;
  source: Source;
  values: FlowValues;
}

const MAX_DRAWN_PACKETS = 40;

@Component({
  selector: 'app-feature-form',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './feature-form.component.html',
  styleUrls: ['./feature-form.component.css']
})
export class FeatureFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PredictionService);
  private readonly data = inject(DataService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly groups = FIELD_GROUPS;
  readonly samples = SAMPLE_DATA as Sample[];
  readonly fieldLabel = fieldLabel;

  /** Scores the trained model gave known flows, so the demo can show real results for them. */
  private readonly recorded = new Map<string, { score: number; explain?: Explanation }>(
    this.samples.map(s => [flowKey(s.data), { score: s.score, explain: s.explain }])
  );

  form: FormGroup;
  activeGroup: GroupId = 'connection';
  fieldQuery = '';

  /** The flow the form started from; "edited" and "revert" compare against it. */
  base: { title: string; truth: string; data: FlowValues; sampleId?: string };
  result: PredictionResult | null = null;
  resultSource: Source = 'model';
  checkedValues = '';
  loading = false;
  errorMsg = '';

  explanation: Explanation | null = null;
  explainState: 'idle' | 'loading' | 'ready' | 'unavailable' | 'error' = 'idle';

  trace: Trace = { out: [], back: [], outHidden: 0, backHidden: 0 };
  runId = 0;
  history: CheckEntry[] = [];
  private nextEntryId = 1;

  readonly isStaticDeployment =
    typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
  demoMode = this.isStaticDeployment;

  constructor() {
    const first = this.samples[0];
    this.base = { title: first.title, truth: first.truth, data: first.data, sampleId: first.id };
    const controls: Record<string, unknown[]> = {};
    for (const [key, value] of Object.entries(first.data)) {
      controls[key] = [value, [Validators.required]];
    }
    this.form = this.fb.group(controls);
    this.trace = this.buildTrace(this.form.value);

    // A flow opened from the Replay view.
    effect(() => {
      const flow = this.data.handoff();
      if (!flow) return;
      untracked(() => {
        this.recorded.set(flowKey(flow.values), { score: flow.score });
        this.base = { title: flow.title, truth: flow.truth, data: flow.values };
        this.form.reset(flow.values);
        this.data.handoff.set(null);
        this.check();
        this.cdr.markForCheck();
      });
    });
  }

  ngOnInit(): void {
    this.check();
  }

  // ---- derived state -------------------------------------------------------

  get visibleGroups(): FieldGroup[] {
    const q = this.fieldQuery.trim().toLowerCase();
    if (!q) {
      return this.groups.filter(g => g.id === this.activeGroup);
    }
    return this.groups
      .map(g => ({
        ...g,
        fields: g.fields.filter(f =>
          f.key.toLowerCase().includes(q) ||
          f.label.toLowerCase().includes(q) ||
          f.help.toLowerCase().includes(q))
      }))
      .filter(g => g.fields.length > 0);
  }

  get editedKeys(): string[] {
    const v = this.form.value as FlowValues;
    return Object.keys(this.base.data).filter(k => !this.same(v[k], this.base.data[k]));
  }

  get isStale(): boolean {
    return !!this.result && !this.loading && JSON.stringify(this.form.value) !== this.checkedValues;
  }

  get canCheck(): boolean {
    return !this.loading && this.form.valid && (this.demoMode || !this.isStaticDeployment);
  }

  get maxEffect(): number {
    return Math.max(0.01, ...(this.explanation?.features ?? []).map(f => Math.abs(f.effect)));
  }

  /** Half the bar is each direction, scaled to the strongest effect in the list. */
  barWidth(f: ExplainFeature): string {
    return (Math.abs(f.effect) / this.maxEffect) * 50 + '%';
  }

  editedCount(group: FieldGroup): number {
    const edited = this.editedKeys;
    return group.fields.filter(f => edited.includes(f.key)).length;
  }

  optionsFor(f: FieldDef): readonly string[] {
    const current = String(this.form.value[f.key]);
    return f.options && !f.options.includes(current) ? [...f.options, current] : f.options ?? [];
  }

  isEdited(key: string): boolean {
    return !this.same(this.form.value[key], this.base.data[key]);
  }

  isInvalid(key: string): boolean {
    const c = this.form.get(key);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  confidence(r: PredictionResult): number {
    return r.label === 'Attack' ? r.probabilities.Attack : r.probabilities.Normal;
  }

  formatValue(v: number | string): string {
    if (typeof v === 'string') return v;
    if (Math.abs(v) >= 100000) return v.toExponential(2).replace('e+', 'e');
    return String(+v.toPrecision(4));
  }

  // ---- actions ---------------------------------------------------------------

  selectSample(sample: Sample): void {
    this.base = { title: sample.title, truth: sample.truth, data: sample.data, sampleId: sample.id };
    this.form.reset(sample.data);
    this.check();
  }

  revertField(key: string): void {
    this.form.get(key)?.setValue(this.base.data[key]);
  }

  revertAll(): void {
    this.form.reset(this.base.data);
  }

  /** Sets one feature to its typical normal value and checks again. */
  tryTypical(f: ExplainFeature): void {
    this.form.get(f.feature)?.setValue(f.typical);
    this.check();
  }

  setGroup(id: GroupId): void {
    this.activeGroup = id;
    this.fieldQuery = '';
  }

  onTabKey(event: KeyboardEvent, index: number): void {
    const dir = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    event.preventDefault();
    const next = (index + dir + this.groups.length) % this.groups.length;
    this.setGroup(this.groups[next].id);
    const tabs = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLElement>('[role="tab"]');
    tabs?.[next]?.focus();
  }

  setMode(demo: boolean): void {
    if (!demo && this.isStaticDeployment) return;
    if (this.demoMode === demo) return;
    this.demoMode = demo;
    this.errorMsg = '';
  }

  restore(entry: CheckEntry): void {
    this.form.reset(entry.values);
    this.check();
  }

  @HostListener('document:keydown', ['$event'])
  onShortcut(event: KeyboardEvent): void {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !(event.target as HTMLElement)?.closest?.('[hidden]')) {
      event.preventDefault();
      this.check();
    }
  }

  onSubmit(): void {
    this.check();
  }

  check(): void {
    if (!this.canCheck) {
      this.form.markAllAsTouched();
      return;
    }

    const values = { ...this.form.value } as FlowValues;
    this.loading = true;
    this.errorMsg = '';
    this.explainState = 'loading';
    this.trace = this.buildTrace(values);
    this.runId++;
    const started = performance.now();
    const traceMs = this.traceDuration(); // let the packets finish drawing before the verdict lands

    if (this.demoMode) {
      const known = this.recorded.get(flowKey(values));
      const res = known ? this.toResult(known.score) : this.ruleOfThumb(values);
      setTimeout(() => {
        this.finish(res, values, started, known ? 'recorded' : 'rule');
        this.explanation = known?.explain ?? null;
        this.explainState = known?.explain ? 'ready' : 'unavailable';
        this.cdr.markForCheck();
      }, traceMs);
      return;
    }

    this.api.predict(values).subscribe({
      next: res => {
        const wait = Math.max(0, traceMs - (performance.now() - started));
        setTimeout(() => this.finish(res, values, started, 'model'), wait);
      },
      error: err => {
        this.loading = false;
        this.explainState = 'idle';
        this.errorMsg = err?.error?.error
          ?? (err?.status === 0 || err?.status === 504
            ? 'The Flask API is not answering on port 5000. Start it with "python app.py" from the project folder, or switch to the in-browser demo.'
            : `The API returned an error (${err?.status ?? 'unknown'}). Check the Flask terminal for details.`);
        this.cdr.markForCheck();
      }
    });

    this.api.explain(values).subscribe({
      next: ex => {
        this.explanation = ex;
        this.explainState = 'ready';
        this.cdr.markForCheck();
      },
      error: () => {
        this.explanation = null;
        this.explainState = 'error';
        this.cdr.markForCheck();
      }
    });
  }

  // ---- internals -------------------------------------------------------------

  private finish(res: PredictionResult, values: FlowValues, started: number, source: Source): void {
    this.result = res;
    this.resultSource = source;
    this.checkedValues = JSON.stringify(values);
    this.loading = false;

    const edited = Object.keys(this.base.data).some(k => !this.same(values[k], this.base.data[k]));
    this.history.unshift({
      id: this.nextEntryId++,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      title: this.base.title,
      edited,
      label: res.label as 'Normal' | 'Attack',
      confidence: this.confidence(res),
      latencyMs: Math.round(performance.now() - started),
      source,
      values
    });
    this.history = this.history.slice(0, 6);
    this.cdr.markForCheck();
  }

  private toResult(attack: number): PredictionResult {
    const isAttack = attack > 0.5;
    return {
      prediction: isAttack ? 1 : 0,
      label: isAttack ? 'Attack' : 'Normal',
      probabilities: { Normal: +(1 - attack).toFixed(4), Attack: attack }
    };
  }

  /** Used in the demo for flows the model has not scored. A rough stand-in, not the model. */
  private ruleOfThumb(v: FlowValues): PredictionResult {
    const n = (k: string) => Number(v[k]) || 0;
    const isAttack =
      (n('sttl') > 100 && (n('rate') > 500 || n('sload') > 5_000_000)) ||
      v['service'] === '-' ||
      v['state'] === 'INT' ||
      n('ct_state_ttl') > 0 ||
      n('ct_dst_ltm') > 15;
    return this.toResult(isAttack ? 0.9 : 0.1);
  }

  private traceDuration(): number {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return 150;
    }
    const last = [...this.trace.out, ...this.trace.back].reduce((m, p) => Math.max(m, p.delay), 0);
    return Math.min(1100, last + 420);
  }

  /** Lays the flow's packets out along two lanes from its real feature values. */
  private buildTrace(v: FlowValues): Trace {
    const n = (k: string) => Math.max(0, Number(v[k]) || 0);
    const spkts = Math.round(n('spkts'));
    const dpkts = Math.round(n('dpkts'));
    const drawOut = Math.min(spkts, MAX_DRAWN_PACKETS);
    const drawBack = Math.min(dpkts, MAX_DRAWN_PACKETS);
    const size = (bytes: number) => Math.min(1, Math.max(0.18, Math.log10(bytes + 1) / Math.log10(1500)));

    // Wobble the spacing by jitter so bursty flows look bursty, but deterministically.
    const lay = (count: number, meanBytes: number, jitter: number, offset: number, stepMs: number): Packet[] => {
      const wobble = Math.min(0.45, jitter / 4000);
      return Array.from({ length: count }, (_, i) => {
        const base = count === 1 ? 0.5 : i / (count - 1);
        const shift = Math.sin((i + 1) * 12.9898) * wobble / Math.max(count, 2);
        const left = 4 + Math.min(1, Math.max(0, base + shift)) * (92 - offset) + offset;
        const h = size(meanBytes) * (0.82 + 0.18 * Math.abs(Math.sin((i + 3) * 7.31)));
        return { left, height: h, delay: Math.round(i * stepMs) };
      });
    };

    const step = Math.max(10, Math.min(28, 600 / Math.max(drawOut, drawBack, 1)));
    return {
      out: lay(drawOut, n('smean'), n('sjit'), 0, step),
      back: lay(drawBack, n('dmean'), n('djit'), 3, step).map(p => ({ ...p, delay: p.delay + step * 2 })),
      outHidden: spkts - drawOut,
      backHidden: dpkts - drawBack
    };
  }

  private same(a: unknown, b: unknown): boolean {
    if (typeof b === 'number') return Number(a) === b;
    return a === b;
  }
}
