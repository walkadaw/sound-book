import { ChangeDetectionStrategy, Component, inject, input, linkedSignal } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Chord } from '../../services/chord/chord.interface';
import { ChordService } from '../../services/chord/chord.service';
import { ChordComponent } from '../kit/chord/chord.component';

@Component({
  selector: 'app-chord-variation',
  templateUrl: './chord-variation.component.html',
  styleUrls: ['./chord-variation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChordComponent, MatIconButton, MatIcon],
})
export class ChordVariationComponent {
  chordService = inject(ChordService);

  readonly chord = input<Chord>();
  readonly selectedVariant = linkedSignal({ source: this.chord, computation: () => 0 });

  prevChord() {
    this.selectedVariant.update((variant) => variant - 1);
  }

  nextChord() {
    this.selectedVariant.update((variant) => variant + 1);
  }
}
