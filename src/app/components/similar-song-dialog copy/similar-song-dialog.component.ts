import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogClose } from '@angular/material/dialog';
import { Change, diffWords } from 'diff';
import { Song } from '../../interfaces/song';
import { MatButton } from '@angular/material/button';
import { DiffResultComponent } from '../diff-result/diff-result.component';


interface SimilarData {
  song: Song,
  duplication: Song[]
}

interface DiffResult {
  song: Song,
  diff: Change[]
}

@Component({
    selector: 'app-similar-song-dialog',
    templateUrl: './similar-song-dialog.component.html',
    styleUrls: ['./similar-song-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        DiffResultComponent,
        MatButton,
        MatDialogClose
    ]
})
export class SimilarSongDialogComponent implements OnInit {
  data = inject<SimilarData>(MAT_DIALOG_DATA);

  diffs: DiffResult[];

  ngOnInit(): void {
    this.diffs = this.data.duplication.map((song) => ({ song, diff: diffWords(song.text, this.data.song.text) }));
  }
}
