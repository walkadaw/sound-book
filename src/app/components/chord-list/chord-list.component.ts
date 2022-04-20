import { Component, Input } from '@angular/core';
import { Chord } from '../../services/chord/chord.interface';
import { ChordList, ChordService } from '../../services/chord/chord.service';

@Component({
  selector: 'app-chord-list',
  templateUrl: './chord-list.component.html',
  styleUrls: ['./chord-list.component.scss'],
})
export class ChordListComponent {
  @Input() set chords(list: string | string[]) {
    this.chordList = this.chordService.getChordsList(!Array.isArray(list) ? list.split('\n') : list);
  }

  chordList: ChordList[][];
  selectedChord: Chord;

  constructor(
    private chordService: ChordService,
  ) {}

  showChords(chord: string) {
    this.selectedChord = this.chordService.getChord(chord);
  }
}
