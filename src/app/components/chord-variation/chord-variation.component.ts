import { ChangeDetectionStrategy, Component, Input, OnChanges, inject } from '@angular/core';
import { Chord } from '../../services/chord/chord.interface';
import { ChordService } from '../../services/chord/chord.service';

@Component({
  selector: 'app-chord-variation',
  templateUrl: './chord-variation.component.html',
  styleUrls: ['./chord-variation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ChordVariationComponent implements OnChanges {
  chordService = inject(ChordService);

  @Input() chord: Chord;
  selectedVariant = 0;

  ngOnChanges(): void {
    this.selectedVariant = 0;
  }

  prevChord() {
    this.selectedVariant -= 1;
  }

  nextChord() {
    this.selectedVariant += 1;
  }
}
