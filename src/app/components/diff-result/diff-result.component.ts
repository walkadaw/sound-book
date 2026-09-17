import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { Change } from 'diff';

@Component({
  selector: 'app-diff-result',
  templateUrl: './diff-result.component.html',
  styleUrls: ['./diff-result.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiffResultComponent {
  @Input() diff: Change[];
}
