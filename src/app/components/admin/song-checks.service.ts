import { Service, Signal, computed, inject } from '@angular/core';
import { Song } from '../../interfaces/song';
import { CHORD_MISTAKES, ChordCheckService, ChordIssue } from '../../services/chord/chord-check.service';
import { SongService } from '../../services/song-service/song.service';

export type SongCheckKey = 'no-chords' | 'chord-mistakes' | 'chord-notations' | 'no-tags';

export interface SongCheckItem {
  song: Song;
  issues: ChordIssue[];
}

export interface SongCheck {
  key: SongCheckKey;
  title: string;
  description: string;
  items: Signal<SongCheckItem[]>;
}

@Service()
export class SongChecksService {
  private songService = inject(SongService);
  private chordCheckService = inject(ChordCheckService);

  private chordIssues = computed(() =>
    this.songService
      .songList()
      .map((song) => ({ song, issues: this.chordCheckService.findIssues(song.chord, song.text) }))
      .filter((item) => item.issues.length),
  );

  readonly checks: SongCheck[] = [
    {
      key: 'no-chords',
      title: 'Без аккордов',
      description: 'Песни, у которых не заполнены аккорды',
      items: this.songsWhere((song) => !song.chord.trim()),
    },
    {
      key: 'chord-mistakes',
      title: 'Нераспознанные аккорды',
      description: 'Аккорды с опечатками или кириллицей — их не получится транспонировать',
      items: computed(() =>
        this.chordIssues().filter((item) => item.issues.some((issue) => CHORD_MISTAKES.has(issue.reason))),
      ),
    },
    {
      key: 'chord-notations',
      title: 'Неподдерживаемые пометки',
      description: 'Пометки в строках аккордов, которые приложение не понимает',
      items: computed(() =>
        this.chordIssues().filter((item) => !item.issues.some((issue) => CHORD_MISTAKES.has(issue.reason))),
      ),
    },
    {
      key: 'no-tags',
      title: 'Без тегов',
      description: 'Песни, которым не назначен ни один тег',
      items: this.songsWhere((song) => !Object.keys(song.tag).length),
    },
  ];

  getCheck(key: SongCheckKey): SongCheck | undefined {
    return this.checks.find((check) => check.key === key);
  }

  private songsWhere(predicate: (song: Song) => boolean) {
    return computed(() =>
      this.songService
        .songList()
        .filter(predicate)
        .map((song): SongCheckItem => ({ song, issues: [] })),
    );
  }
}
