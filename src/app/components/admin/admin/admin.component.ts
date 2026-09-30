import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Song } from '../../../interfaces/song';
import { CHORD_MISTAKES, ChordCheckService, ChordIssue } from '../../../services/chord/chord-check.service';
import { SongService } from '../../../services/song-service/song.service';
import { DuplicateService } from '../../../services/duplicate/duplicate.service';
import { ChordIssuesComponent } from '../chord-issues/chord-issues.component';

interface SongChordIssues {
  song: Song;
  issues: ChordIssue[];
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  imports: [RouterLink, ChordIssuesComponent],
})
export class AdminComponent implements OnInit {
  private songService = inject(SongService);
  private chordCheckService = inject(ChordCheckService);
  private duplicateService = inject(DuplicateService);

  songWithoutChord: Song[] = [];
  songWithoutTag: Song[] = [];
  songChordMistake: SongChordIssues[] = [];
  songChordUnsupported: SongChordIssues[] = [];
  songDuplicate: [Song, Song[]][];

  ngOnInit(): void {
    this.songService.songList().forEach((song) => {
      if (!song.chord.trim()) {
        this.songWithoutChord.push(song);
      }

      if (!Object.keys(song.tag).length) {
        this.songWithoutTag.push(song);
      }

      const issues = this.chordCheckService.findIssues(song.chord, song.text);
      if (issues.some((issue) => CHORD_MISTAKES.has(issue.reason))) {
        this.songChordMistake.push({ song, issues });
      } else if (issues.length) {
        this.songChordUnsupported.push({ song, issues });
      }
    });
  }

  checkDuplication() {
    this.songDuplicate = [
      ...this.songService.songList().reduce((acc, song) => {
        const result = this.songService.songList().filter(
          (songY) => song !== songY && !acc.has(songY) && this.duplicateService.isSimilar(song.text, songY.text),
        );

        if (result.length > 0) {
          acc.set(song, result);
        }
        return acc;
      }, new Map<Song, Song[]>()),
    ];
  }
}
