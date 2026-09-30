import { Service, inject } from '@angular/core';
import { ChordService } from './chord.service';
import { CHORD_CLEAN_UP } from './chord.model';

/** `cyrillic` and `unknown-chord` are mistakes; the rest are notations the chord parser doesn't support */
export type ChordIssueReason = 'cyrillic' | 'unknown-chord' | 'fret-position' | 'unknown-symbol';

export interface ChordIssue {
  line: string;
  token: string;
  reason: ChordIssueReason;
}

export const CHORD_ISSUE_MESSAGE: Record<ChordIssueReason, string> = {
  cyrillic: 'кириллическая буква вместо латинской',
  'unknown-chord': 'такого аккорда нет в базе',
  'fret-position': 'номер лада в скобках не поддерживается',
  'unknown-symbol': 'непонятный символ в строке аккордов',
};

export const CHORD_MISTAKES: ReadonlySet<ChordIssueReason> = new Set(['cyrillic', 'unknown-chord']);

// Notes written alongside chords that are fine to keep in the chord line
const ANNOTATIONS = [
  /^[^\p{L}\d]+$/u, // separators: "|", "-", "›", "//"
  /:$/, // labels: "Проігрыш:"
  /^[/(]*[xх×]?\d+(?:[xх×]|р\.?|раз[аыу]?)?[.)/]*$/iu, // repeats: "x2", "//x2", "/2р."
];

const CYRILLIC_LOOKALIKE: Record<string, string> = {
  А: 'A', В: 'B', С: 'C', Е: 'E', Н: 'H', а: 'a', с: 'c', е: 'e', і: 'i', м: 'm',
};
const CYRILLIC_LOOKALIKE_LETTER = new RegExp(`[${Object.keys(CYRILLIC_LOOKALIKE).join('')}]`, 'g');
const CYRILLIC_LETTER = /\p{Script=Cyrillic}/u;
const FRET_POSITION = /\([IVX]+\)/g;
const LATIN_LETTER = /[a-z]/i;
const NOTE_START = /^[a-h]/i;

@Service()
export class ChordCheckService {
  private chordService = inject(ChordService);

  /** Expects the chord and lyrics lines of a song, the way the song editor saves them */
  findIssues(chordText: string, lyricsText: string): ChordIssue[] {
    // choruses repeat their chord lines, one mention per line is enough
    const issues = new Map<string, ChordIssue>();
    const add = (line: string, token: string, reason: ChordIssueReason) =>
      issues.set(`${line.trim()}\n${token}`, { line: line.trim(), token, reason });

    for (const line of chordText.split('\n')) {
      for (const token of this.getTokens(line)) {
        const reason = this.getIssueReason(token);

        if (reason) {
          add(line, token, reason);
        }
      }
    }

    // a chord line typed in Cyrillic isn't recognized as chords at all, so it is saved as lyrics
    for (const line of lyricsText.split('\n')) {
      const tokens = this.getTokens(line);

      if (tokens.length && tokens.every((token) => this.isChords(token) || this.isCyrillicChords(token))) {
        tokens.filter((token) => this.isCyrillicChords(token)).forEach((token) => add(line, token, 'cyrillic'));
      }
    }

    return [...issues.values()];
  }

  private getTokens(line: string): string[] {
    return line.split(/\s+/).filter(Boolean);
  }

  private getIssueReason(token: string): ChordIssueReason | null {
    if (this.isChords(token) || ANNOTATIONS.some((pattern) => pattern.test(token))) {
      return null;
    }

    if (this.isCyrillicChords(token)) {
      return 'cyrillic';
    }

    if (this.isChords(token.replace(FRET_POSITION, ''))) {
      return 'fret-position';
    }

    // a word without Latin letters is a label like "Прыпеў", it can't be a misspelled chord
    if (!LATIN_LETTER.test(token)) {
      return null;
    }

    return NOTE_START.test(token.replace(CHORD_CLEAN_UP, '')) ? 'unknown-chord' : 'unknown-symbol';
  }

  private isCyrillicChords(token: string): boolean {
    const latin = token.replace(CYRILLIC_LOOKALIKE_LETTER, (letter) => CYRILLIC_LOOKALIKE[letter]);

    // the rest of a Cyrillic word would be cleaned up, leaving a chord: "Прыпеў" -> "e"
    return latin !== token && !CYRILLIC_LETTER.test(latin) && this.isChords(latin);
  }

  /** Brackets and other symbols around chords are fine, the display keeps them */
  private isChords(token: string): boolean {
    const clear = token.replace(CHORD_CLEAN_UP, '');

    return !!clear && this.chordService.getChordsList([clear])[0].every((item) => item.type === 'chord');
  }
}
