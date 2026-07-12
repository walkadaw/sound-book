import { Component, OnInit, inject } from '@angular/core';
import { Song } from '../../../interfaces/song';
import { ChordService } from '../../../services/chord/chord.service';
import { SongService } from '../../../services/song-service/song.service';
import { DuplicateService } from '../../../services/duplicate/duplicate.service';
import { RouterLink } from '@angular/router';


@Component({
    selector: 'app-admin',
    templateUrl: './admin.component.html',
    styleUrls: ['./admin.component.scss'],
    standalone: true,
    imports: [
    RouterLink
],
})
export class AdminComponent implements OnInit {
  private songService = inject(SongService);
  private chordService = inject(ChordService);
  private duplicateService = inject(DuplicateService);

  songWithoutChord: Song[] = [];
  songWithoutTag: Song[] = [];
  songChordMistake: Song[] = [];
  songDuplicate: [Song, Song[]][];

  ngOnInit(): void {
    this.songService.songList$.value.forEach((song) => {
      if (!song.chord.trim()) {
        this.songWithoutChord.push(song);
      }

      if (!Object.keys(song.tag).length) {
        this.songWithoutTag.push(song);
      }

      const chord = this.chordService.getChordsList(song.chord.replace(/[^\w\s]+/g, '').split('\n'));
      if (!chord.every((data) => data.every((item) => item.type === 'chord' || !item.text.trim()))) {
        this.songChordMistake.push(song);
      }
    });
  }

  checkDuplication() {
    this.songDuplicate = [...this.songService.songList$.value.reduce((acc, song) => {
      const result = this.songService.songList$.value.filter(
        (songY) => song !== songY && !acc.has(songY) && this.duplicateService.isSimilar(song.text, songY.text),
      );

      if (result.length > 0) {
        acc.set(song, result);
      }
      return acc;
    }, new Map<Song, Song[]>())];
  }
}
