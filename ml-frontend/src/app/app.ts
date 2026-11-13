import { Component, HostListener, inject, signal } from '@angular/core';
import { FeatureFormComponent } from './feature-form/feature-form.component';
import { ReplayComponent } from './replay/replay.component';
import { ReportComponent } from './report/report.component';
import { DataService, FlowHandoff } from './data.service';

type View = 'check' | 'replay' | 'report';

const VIEWS: { id: View; label: string }[] = [
  { id: 'check', label: 'Check a flow' },
  { id: 'replay', label: 'Replay test traffic' },
  { id: 'report', label: 'Model report' }
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FeatureFormComponent, ReplayComponent, ReportComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private data = inject(DataService);
  readonly views = VIEWS;
  readonly view = signal<View>(this.viewFromHash());
  /** Report is fetched the first time it is opened, then kept. */
  readonly reportOpened = signal(this.view() === 'report');

  @HostListener('window:hashchange')
  onHashChange(): void {
    this.show(this.viewFromHash(), false);
  }

  show(view: View, updateHash = true): void {
    if (view === this.view()) return;
    const apply = () => {
      this.view.set(view);
      if (view === 'report') this.reportOpened.set(true);
    };
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !reduce) {
      doc.startViewTransition(apply);
    } else {
      apply();
    }
    if (updateHash) history.replaceState(null, '', view === 'check' ? location.pathname : `#${view}`);
    window.scrollTo({ top: 0 });
  }

  openFlow(flow: FlowHandoff): void {
    this.data.handoff.set(flow);
    this.show('check');
  }

  private viewFromHash(): View {
    const h = typeof location !== 'undefined' ? location.hash.slice(1) : '';
    return h === 'replay' || h === 'report' ? h : 'check';
  }
}
