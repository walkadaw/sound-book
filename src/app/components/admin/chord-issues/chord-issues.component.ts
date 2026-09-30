import { Component, input } from '@angular/core';
import { CHORD_ISSUE_MESSAGE, ChordIssue } from '../../../services/chord/chord-check.service';

@Component({
  selector: 'app-chord-issues',
  template: `
    <ul>
      @for (issue of issues(); track $index) {
        <li>
          <code>{{ issue.token }}</code> — {{ messages[issue.reason] }}
          <span class="line">в строке «{{ issue.line }}»</span>
        </li>
      }
    </ul>
  `,
  styles: `
    ul {
      margin: 4px 0;
    }

    .line {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class ChordIssuesComponent {
  readonly issues = input.required<ChordIssue[]>();

  protected readonly messages = CHORD_ISSUE_MESSAGE;
}
