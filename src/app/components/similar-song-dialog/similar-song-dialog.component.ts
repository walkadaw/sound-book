import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogClose } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { Song } from '../../interfaces/song';
import { DiffResultComponent } from '../diff-result/diff-result.component';

interface SimilarData {
  song: Song;
  duplication: Song[];
}

@Component({
  selector: 'app-similar-song-dialog',
  templateUrl: './similar-song-dialog.component.html',
  styleUrls: ['./similar-song-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DiffResultComponent, MatButton, MatDialogClose],
})
export class SimilarSongDialogComponent {
  data = inject<SimilarData>(MAT_DIALOG_DATA);
}
