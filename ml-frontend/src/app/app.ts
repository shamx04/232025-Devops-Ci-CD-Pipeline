import { Component } from '@angular/core';
import { FeatureFormComponent } from './feature-form/feature-form.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FeatureFormComponent],
  template: `<app-feature-form></app-feature-form>`
})
export class App {}
