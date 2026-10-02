import { Component, computed, inject, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { FormField, form, max, min } from '@angular/forms/signals';
import { CdkFixedSizeVirtualScroll, CdkVirtualForOf, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatCheckbox, MatCheckboxChange } from '@angular/material/checkbox';
import { MatChipListbox, MatChipListboxChange, MatChipOption } from '@angular/material/chips';
import { MatFormField, MatLabel, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PARTS_OF_MASS_TAG_ID, TAGS_LIST } from '../../constants/tag-list';
import { Song } from '../../interfaces/song';
import { FuseService } from '../../services/fuse-service/fuse.service';
import { GeneratorService } from '../../services/generator-service/generator.service';
import { SongService } from '../../services/song-service/song.service';

const SONG_ROW_HEIGHT = 48;
const MAX_NOTES_PAGES = 10;

const isPartOfMass = (song: Song) => !!song.tag?.[PARTS_OF_MASS_TAG_ID];

function plural(count: number, one: string, few: string, many: string): string {
  const lastTwo = count % 100;
  const last = count % 10;

  if (last === 1 && lastTwo !== 11) {
    return `${count} ${one}`;
  }

  return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? `${count} ${few}` : `${count} ${many}`;
}

const songCount = (count: number) => plural(count, 'песня', 'песні', 'песень');

@Component({
  selector: 'app-paper-generator',
  templateUrl: './paper-generator.component.html',
  styleUrls: ['./paper-generator.component.scss'],
  imports: [
    FormField,
    CdkVirtualScrollViewport,
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    MatButton,
    MatButtonToggleGroup,
    MatButtonToggle,
    MatCheckbox,
    MatChipListbox,
    MatChipOption,
    MatFormField,
    MatLabel,
    MatPrefix,
    MatSuffix,
    MatIcon,
    MatIconButton,
    MatInput,
    MatProgressSpinner,
    MatSlideToggle,
    UpperCasePipe,
  ],
})
export class PaperGeneratorComponent {
  private songService = inject(SongService);
  private fuseService = inject(FuseService);
  private generatorService = inject(GeneratorService);
  private snackBar = inject(MatSnackBar);

  protected readonly rowHeight = SONG_ROW_HEIGHT;
  protected readonly tags = TAGS_LIST.filter(({ id }) => id !== PARTS_OF_MASS_TAG_ID);

  private model = signal({
    mode: 'all' as 'all' | 'selected',
    search: '',
    onlySelected: false,
    showChords: true,
    showTags: true,
    repeatChoruses: true,
    addPartsOfMass: false,
    addGadzinki: false,
    toc: true,
    notesPages: 4,
    title: '',
    subtitle: '',
  });

  protected paperForm = form(this.model, (path) => {
    min(path.notesPages, 0);
    max(path.notesPages, MAX_NOTES_PAGES);
  });

  protected selectedTag = signal(0);
  protected selectedIds = signal<ReadonlySet<number>>(new Set());
  protected generating = signal(false);
  protected status = signal('');

  /** Parts of the mass are printed as their own section, so they are not offered as songs */
  protected songs = computed(() => this.songService.songList().filter((song) => !isPartOfMass(song)));
  private partsOfMass = computed(() => this.songService.songList().filter(isPartOfMass));

  private search = computed(() => this.model().search);
  private foundSongs = this.fuseService.getFilteredSong(this.selectedTag, this.search, this.songs);

  protected visibleSongs = computed(() => {
    const ids = this.selectedIds();
    return this.model().onlySelected ? this.foundSongs().filter(({ id }) => ids.has(id)) : this.foundSongs();
  });

  protected allVisibleSelected = computed(() => {
    const ids = this.selectedIds();
    const visible = this.visibleSongs();
    return visible.length > 0 && visible.every(({ id }) => ids.has(id));
  });

  // typing a title does not filter the songs again
  private mode = computed(() => this.model().mode);

  private songsToPrint = computed(() => {
    const ids = this.selectedIds();
    return this.mode() === 'all' ? this.songs() : this.songs().filter(({ id }) => ids.has(id));
  });

  protected summary = computed(() => {
    const { addPartsOfMass, addGadzinki } = this.model();
    const parts = [
      this.songsToPrint().length ? songCount(this.songsToPrint().length) : '',
      addPartsOfMass ? 'Часткі імшы' : '',
      addGadzinki ? 'Гадзінкі' : '',
    ].filter(Boolean);

    return parts.length ? `У файл трапяць: ${parts.join(' + ')}` : 'Выберыце песні або дадатковыя раздзелы';
  });

  protected canDownload = computed(() => {
    const { addPartsOfMass, addGadzinki } = this.model();
    return !this.generating() && (this.songsToPrint().length > 0 || addPartsOfMass || addGadzinki);
  });

  trackById(_index: number, song: Song): number {
    return song.id;
  }

  changeTag(event: MatChipListboxChange): void {
    this.selectedTag.set(event.value ?? 0);
  }

  toggleSong(event: MatCheckboxChange, songId: number): void {
    this.selectedIds.update((ids) => {
      const next = new Set(ids);

      if (event.checked) {
        next.add(songId);
      } else {
        next.delete(songId);
      }

      return next;
    });
  }

  toggleAllVisible(): void {
    const visible = this.visibleSongs().map(({ id }) => id);
    const select = !this.allVisibleSelected();

    this.selectedIds.update((ids) => {
      const next = new Set(ids);
      visible.forEach((id) => (select ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
    this.paperForm.onlySelected().value.set(false);
  }

  clearSearch(): void {
    this.paperForm.search().value.set('');
  }

  async generateDocx(): Promise<void> {
    if (!this.canDownload()) {
      return;
    }

    const { showChords, showTags, repeatChoruses, addPartsOfMass, addGadzinki, toc, notesPages, title, subtitle } =
      this.model();

    this.generating.set(true);
    this.status.set('Ствараецца файл…');

    try {
      const { pages } = await this.generatorService.downloadDocx(this.songsToPrint(), this.partsOfMass(), {
        showChords,
        showTags,
        repeatChoruses,
        addPartsOfMass,
        addGadzinki,
        toc,
        notesPages: Math.min(MAX_NOTES_PAGES, Math.max(0, Math.round(Number(notesPages) || 0))),
        title: title.trim(),
        subtitle: subtitle.trim(),
      });
      this.status.set(`Файл створаны і спампоўваецца: каля ${plural(pages, 'старонкі', 'старонак', 'старонак')}.`);
    } catch (error) {
      console.error('docx generation', error);
      this.status.set('');
      this.snackBar.open('Не атрымалася стварыць файл. Паспрабуйце яшчэ раз.', 'Зачыніць', { duration: 5000 });
    } finally {
      this.generating.set(false);
    }
  }
}
