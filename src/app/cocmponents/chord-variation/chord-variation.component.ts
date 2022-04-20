import {
  Component, Input, OnChanges,
} from '@angular/core';
import { Chord } from '../../services/chord/chord.interface';

@Component({
  selector: 'app-chord-variation',
  templateUrl: './chord-variation.component.html',
  styleUrls: ['./chord-variation.component.scss'],
})
export class ChordVariationComponent implements OnChanges {
  @Input() chord: Chord;
  selectedVariant = 0;

  ngOnChanges(): void {
    this.selectedVariant = 0;
  }

  prevChord(event: Event) {
    event.stopPropagation();
    this.selectedVariant -= 1;
  }

  nextChord(event: Event) {
    event.stopPropagation();
    this.selectedVariant += 1;
  }
}
