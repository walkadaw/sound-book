import { Component, OnInit } from '@angular/core';
import { Song } from '../../../interfaces/song';
import { ChordService } from '../../../services/chord/chord.service';
import { SongService } from '../../../services/song-service/song.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent implements OnInit {
  songWithoutChord: Song[] = [];
  songWithoutTag: Song[] = [];
  songChordMistake: Song[] = [];

  constructor(
    private songService: SongService,
    private chordService: ChordService,
  ) {}

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
}
