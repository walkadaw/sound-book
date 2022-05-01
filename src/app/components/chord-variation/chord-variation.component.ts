import {
  ChangeDetectionStrategy,
  Component, Input, OnChanges,
} from '@angular/core';
import { Chord } from '../../services/chord/chord.interface';
import { ChordService } from '../../services/chord/chord.service';

@Component({
  selector: 'app-chord-variation',
  templateUrl: './chord-variation.component.html',
  styleUrls: ['./chord-variation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChordVariationComponent implements OnChanges {
  @Input() chord: Chord;
  selectedVariant = 0;

  constructor(public chordService: ChordService) {}

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
