import { Component, computed, inject, input, signal } from '@angular/core';
import { MatMenuTrigger, MatMenu } from '@angular/material/menu';
import { Store } from '@ngrx/store';
import { IAppState } from '../../redux/models/IAppState';
import { getChordNotation } from '../../redux/selector/settings.selector';
import { Chord } from '../../services/chord/chord.interface';
import { ChordList, ChordService } from '../../services/chord/chord.service';
import { ChordVariationComponent } from '../chord-variation/chord-variation.component';

@Component({
  selector: 'app-chord-list',
  templateUrl: './chord-list.component.html',
  styleUrls: ['./chord-list.component.scss'],
  imports: [MatMenuTrigger, MatMenu, ChordVariationComponent],
})
export class ChordListComponent {
  private chordService = inject(ChordService);
  private chordNotation = inject<Store<IAppState>>(Store).selectSignal(getChordNotation);

  readonly chords = input<string | string[]>('');
  readonly transpilation = input(0);

  private originalChordList = computed(() => {
    const list = this.chords();
    return this.chordService.getChordsList(!Array.isArray(list) ? list.split('\n') : list);
  });

  protected chordList = computed<ChordList[][]>(() => {
    const transpilation = this.transpilation();
    const notation = this.chordNotation();
    const originalChordList = this.originalChordList();

    // songs are stored in the short notation, so there is nothing to convert
    if (transpilation === 0 && notation === 'short') {
      return originalChordList;
    }

    return originalChordList.map((line) =>
      line.map((item) =>
        item.type === 'chord'
          ? { ...item, text: this.chordService.transposeChord(item.text, transpilation, notation) }
          : item,
      ),
    );
  });

  protected selectedChord = signal<Chord | undefined>(undefined);

  showChords(chord: string) {
    this.selectedChord.set(this.chordService.getChord(chord) ?? undefined);
  }
}
