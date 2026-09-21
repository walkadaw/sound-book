import { Component, computed, inject, input, signal } from '@angular/core';
import { MatMenuTrigger, MatMenu } from '@angular/material/menu';
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

  readonly chords = input<string | string[]>('');
  readonly transpilation = input(0);

  private originalChordList = computed(() => {
    const list = this.chords();
    return this.chordService.getChordsList(!Array.isArray(list) ? list.split('\n') : list);
  });

  protected chordList = computed<ChordList[][]>(() => {
    const transpilation = this.transpilation();
    const originalChordList = this.originalChordList();

    if (transpilation === 0) {
      return originalChordList;
    }

    return originalChordList.map((line) =>
      line.map((item) => {
        if (item.type === 'chord') {
          const chord = this.chordService.getChord(item.text);
          const suffix = this.chordService.getReadableSuffix(chord.suffix);
          return {
            ...item,
            text: this.chordService.transpilationChord(chord.key, transpilation) + suffix,
          };
        }
        return item;
      }),
    );
  });

  protected selectedChord = signal<Chord | undefined>(undefined);

  showChords(chord: string) {
    this.selectedChord.set(this.chordService.getChord(chord));
  }
}
