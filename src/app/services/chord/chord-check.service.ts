import { Service, inject } from '@angular/core';
import { ChordService } from './chord.service';
import { LineToken, tokenizeLine } from './song-parser';

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

const CYRILLIC_LETTER = /\p{Script=Cyrillic}/u;
const FRET_POSITION = /\([IVX]+\)/;
const LATIN_LETTER = /[a-z]/i;
const NOTE_START = /^[^a-z]*[a-h]/i;

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
      for (const token of tokenizeLine(line)) {
        const reason = this.getIssueReason(token);

        if (reason) {
          add(line, token.text, reason);
        }
      }
    }

    // songs saved before the editor fixed Cyrillic chords have such chord lines among the lyrics
    for (const line of lyricsText.split('\n')) {
      const tokens = tokenizeLine(line);

      if (tokens.some((token) => token.type === 'chord') && tokens.every((token) => token.type !== 'word')) {
        tokens.filter((token) => this.isCyrillicChord(token)).forEach((token) => add(line, token.text, 'cyrillic'));
      }
    }

    return [...issues.values()];
  }

  private getIssueReason(token: LineToken): ChordIssueReason | null {
    if (FRET_POSITION.test(token.text)) {
      return 'fret-position';
    }

    if (token.type === 'neutral') {
      return null;
    }

    if (this.isCyrillicChord(token)) {
      return 'cyrillic';
    }

    if (token.type === 'chord') {
      return token.chords.every(({ chord }) => this.isKnownChord(chord)) ? null : 'unknown-chord';
    }

    // a word without Latin letters is a label like "Прыпеў", it can't be a misspelled chord
    if (!LATIN_LETTER.test(token.text)) {
      return null;
    }

    return NOTE_START.test(token.text) ? 'unknown-chord' : 'unknown-symbol';
  }

  private isCyrillicChord(token: LineToken): boolean {
    return token.type === 'chord' && CYRILLIC_LETTER.test(token.text);
  }

  /** Grammar accepts chords the chord list has no fingering for, like "E9sus4" */
  private isKnownChord(chord: string): boolean {
    return this.chordService.getChordsList([chord])[0].every((item) => item.type === 'chord');
  }
}
