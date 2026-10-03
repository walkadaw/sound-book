import { Component, input } from '@angular/core';
import { DisplayRow } from '../../services/chord/song-structure';
import { ChordListComponent } from '../chord-list/chord-list.component';

@Component({
  selector: 'app-song-lyrics',
  template: `
    @for (row of rows(); track $index) {
      <div
        class="line"
        [class.chorus]="row.kind === 'chorus'"
        [class.bridge]="row.kind === 'bridge'"
        [class.gap]="row.kind === 'gap'"
      >
        @if (showChord() && row.chords) {
          <app-chord-list [chords]="row.chords" [transpilation]="transpilation()"></app-chord-list>
        }
        <span class="text">{{ row.text }}</span>
      </div>
    }
  `,
  styleUrl: './song-lyrics.component.scss',
  imports: [ChordListComponent],
})
export class SongLyricsComponent {
  readonly rows = input.required<DisplayRow[]>();
  readonly showChord = input(true);
  readonly transpilation = input(0);
}
