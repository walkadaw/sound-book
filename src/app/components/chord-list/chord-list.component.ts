import { Component, Input, inject } from '@angular/core';
import { Chord } from '../../services/chord/chord.interface';
import { ChordList, ChordService } from '../../services/chord/chord.service';
import { ChordVariationComponent } from '../chord-variation/chord-variation.component';
import { MatMenuTrigger, MatMenu } from '@angular/material/menu';


@Component({
    selector: 'app-chord-list',
    templateUrl: './chord-list.component.html',
    styleUrls: ['./chord-list.component.scss'],
    imports: [
        MatMenuTrigger,
        MatMenu,
        ChordVariationComponent
    ]
})
export class ChordListComponent {
  private chordService = inject(ChordService);

  @Input() set chords(list: string | string[]) {
    this.originalChordList = this.chordService.getChordsList(!Array.isArray(list) ? list.split('\n') : list);
    this.chordList = this.originalChordList;
  }

  @Input() set transpilation(transpilation: number) {
    if (transpilation === 0) {
      this.chordList = this.originalChordList;
      return;
    }

    this.chordList = this.originalChordList.map((line) => line.map((item) => {
      if (item.type === 'chord') {
        const chord = this.chordService.getChord(item.text);
        const suffix = this.chordService.getReadableSuffix(chord.suffix);
        return {
          ...item,
          text: this.chordService.transpilationChord(chord.key, transpilation) + suffix,
        };
      }
      return item;
    }));
  }

  private originalChordList: ChordList[][];
  chordList: ChordList[][];
  selectedChord: Chord;

  showChords(chord: string) {
    this.selectedChord = this.chordService.getChord(chord);
  }
}
