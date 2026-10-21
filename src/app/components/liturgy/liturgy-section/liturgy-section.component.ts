import { Component, computed, input } from '@angular/core';
import { LiturgySection } from '../../../interfaces/liturgy';

@Component({
  selector: 'app-liturgy-section',
  templateUrl: './liturgy-section.component.html',
  styleUrl: './liturgy-section.component.scss',
})
export class LiturgySectionComponent {
  readonly section = input.required<LiturgySection>();

  // each block is one paragraph, its lines kept apart
  protected readonly blocks = computed(() =>
    this.section().blocks.map(({ kind, lines }) => ({ kind, html: lines.join('<br>') })),
  );
}
