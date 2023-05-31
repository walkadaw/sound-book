import {
  Component, ChangeDetectionStrategy, Inject, OnInit,
} from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Change, diffWords } from 'diff';
import { Song } from '../../interfaces/song';

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
})
export class SimilarSongDialogComponent implements OnInit {
  diffs: DiffResult[];
  constructor(@Inject(MAT_DIALOG_DATA) public data: SimilarData) {}

  ngOnInit(): void {
    this.diffs = this.data.duplication.map((song) => ({ song, diff: diffWords(song.text, this.data.song.text) }));
  }
}
