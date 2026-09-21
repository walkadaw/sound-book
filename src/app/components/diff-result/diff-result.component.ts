import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { Change } from 'diff';

@Component({
  selector: 'app-diff-result',
  templateUrl: './diff-result.component.html',
  styleUrls: ['./diff-result.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiffResultComponent {
  readonly diff = input<Change[]>();
}
