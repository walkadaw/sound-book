import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { Change } from 'diff';
import { NgFor, NgIf } from '@angular/common';

@Component({
    selector: 'app-diff-result',
    templateUrl: './diff-result.component.html',
    styleUrls: ['./diff-result.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [NgFor, NgIf],
})
export class DiffResultComponent {
  @Input() diff: Change[];
}
