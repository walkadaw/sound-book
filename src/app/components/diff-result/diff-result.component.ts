import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { Change } from 'diff';

@Component({
    selector: 'app-diff-result',
    templateUrl: './diff-result.component.html',
    styleUrls: ['./diff-result.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class DiffResultComponent {
  @Input() diff: Change[];
}
