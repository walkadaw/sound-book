import { Component, computed, input } from '@angular/core';
import { LiturgySection, LiturgyText } from '../../../interfaces/liturgy';

@Component({
  selector: 'app-liturgy-section',
  templateUrl: './liturgy-section.component.html',
  styleUrl: './liturgy-section.component.scss',
})
export class LiturgySectionComponent {
  readonly section = input.required<LiturgySection>();

  // the first text, then those that may be read instead of it, as a lectionary prints them: one after another
  protected readonly texts = computed(() => [this.section(), ...this.section().alternatives].map(paragraphs));
}

// each block is one paragraph, its lines kept apart
function paragraphs({ reference, blocks }: LiturgyText) {
  return { reference, blocks: blocks.map(({ kind, lines }) => ({ kind, html: lines.join('<br>') })) };
}
