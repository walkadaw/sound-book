import { Component, computed, input, linkedSignal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { DiffLineKind, buildLineDiff } from './line-diff';

@Component({
  selector: 'app-diff-result',
  templateUrl: './diff-result.component.html',
  styleUrls: ['./diff-result.component.scss'],
  imports: [MatButton],
})
export class DiffResultComponent {
  readonly before = input.required<string>();
  readonly after = input.required<string>();

  protected readonly signs: Record<DiffLineKind, string> = { same: '', removed: '−', added: '+' };
  // the sign is only drawn, screen readers hear the kind of the line from these
  protected readonly labels: Record<DiffLineKind, string> = { same: '', removed: 'Выдалена: ', added: 'Дададзена: ' };

  protected readonly diff = computed(() => buildLineDiff(this.before(), this.after()));

  // indexes of collapsed blocks the user opened; a new pair of texts starts collapsed again
  protected readonly expanded = linkedSignal({ source: this.diff, computation: () => new Set<number>() });

  protected expand(index: number): void {
    this.expanded.update((expanded) => new Set(expanded).add(index));
  }
}
