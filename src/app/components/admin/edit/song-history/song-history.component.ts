import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { SongVersion } from '../../../../interfaces/song';
import { ChordService } from '../../../../services/chord/chord.service';
import { SongService } from '../../../../services/song-service/song.service';
import { DiffResultComponent } from '../../../diff-result/diff-result.component';

interface SongTexts {
  title: string;
  text: string;
}

interface Comparison {
  mode: 'previous' | 'created' | 'editor';
  canCompareWithEditor: boolean;
  before: SongTexts;
  after: SongTexts;
}

@Component({
  selector: 'app-song-history',
  templateUrl: './song-history.component.html',
  styleUrls: ['./song-history.component.scss'],
  imports: [DatePipe, MatButton, MatCheckbox, DiffResultComponent],
})
export class SongHistoryComponent {
  private songService = inject(SongService);
  private chordService = inject(ChordService);

  readonly songId = input.required<number>();
  /** what the editor holds right now, chords merged into the text */
  readonly title = input.required<string>();
  readonly text = input.required<string>();
  /** bumped by the editor after a save so the list picks up the new version */
  readonly reloadKey = input(0);

  readonly restore = output<SongVersion>();

  protected readonly open = signal(false);
  protected readonly selectedId = signal<number | null>(null);

  // nothing is requested until the panel is opened
  protected readonly history = rxResource({
    params: () => (this.open() ? { id: this.songId(), key: this.reloadKey() } : undefined),
    stream: ({ params }) => this.songService.getSongHistory(params.id),
  });

  // every newly opened version starts with what that save changed
  protected readonly compareWithEditor = linkedSignal({ source: this.selectedId, computation: () => false });

  protected readonly comparison = computed<Comparison | null>(() => {
    const versions = this.history.hasValue() ? this.history.value() : [];
    const index = versions.findIndex(({ id }) => id === this.selectedId());

    if (index < 0) {
      return null;
    }

    const version = versions[index];
    // the version a song had before its history started was not saved by anyone, so it changed nothing
    const isInitial = version.createdAt === null;

    if (isInitial || this.compareWithEditor()) {
      return {
        mode: 'editor',
        canCompareWithEditor: !isInitial,
        before: this.toTexts(version),
        after: { title: this.title(), text: this.text() },
      };
    }

    // versions come newest first, so the one saved before this sits next in the list
    const previous = versions[index + 1];

    return {
      mode: previous ? 'previous' : 'created',
      canCompareWithEditor: true,
      before: previous ? this.toTexts(previous) : { title: '', text: '' },
      after: this.toTexts(version),
    };
  });

  protected toggle(): void {
    this.open.update((open) => !open);
  }

  protected select(version: SongVersion): void {
    this.selectedId.update((id) => (id === version.id ? null : version.id));
  }

  private toTexts(version: SongVersion): SongTexts {
    return { title: version.title, text: this.chordService.mergeTextAndChord(version) };
  }
}
