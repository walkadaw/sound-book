import { Service, Signal, computed, inject } from '@angular/core';
import { PARTS_OF_MASS_TAG_ID } from '../../constants/tag-list';
import { Song } from '../../interfaces/song';
import { CHORD_MISTAKES, ChordCheckService, ChordIssue } from '../../services/chord/chord-check.service';
import { songStructure } from '../../services/chord/song-structure';
import { SongbookIssue, lengthIssues, songIssues } from '../../services/generator-service/songbook-issues';
import { SongService } from '../../services/song-service/song.service';

export type SongCheckKey =
  | 'no-chords'
  | 'chord-mistakes'
  | 'chord-notations'
  | 'text-mistakes'
  | 'print-hints'
  | 'no-tags';

export interface SongCheckItem {
  song: Song;
  issues: ChordIssue[];
  notes?: string[];
}

/** Checked as the paper songbook prints by default */
const PRINT_OPTIONS = { showChords: true, showTags: false, repeatChoruses: true };

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

  private textIssues = computed(() =>
    this.songService.songList().map((song) => ({
      song,
      issues: [
        ...songIssues(song, songStructure(song)),
        ...lengthIssues(song, PRINT_OPTIONS, !song.tag?.[PARTS_OF_MASS_TAG_ID]),
      ],
    })),
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
      key: 'text-mistakes',
      title: 'Ошибки разметки текста',
      description: 'Куплеты не по порядку, лишние аккорды, латиница в названии — видно в бумажной версии',
      items: this.textIssuesWhere((issue) => !issue.hint),
    },
    {
      key: 'print-hints',
      title: 'Подсказки для печати',
      description: 'Песни длиннее страницы и строфы без номера среди куплетов — стоит проверить',
      items: this.textIssuesWhere((issue) => !!issue.hint),
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

  private textIssuesWhere(predicate: (issue: SongbookIssue) => boolean) {
    return computed(() =>
      this.textIssues()
        .map(({ song, issues }): SongCheckItem => ({
          song,
          issues: [],
          notes: issues.filter(predicate).map(({ message }) => message),
        }))
        .filter(({ notes }) => notes?.length),
    );
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
