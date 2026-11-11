import { Component, ElementRef, booleanAttribute, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { ALL_TAGS, TAGS_LIST } from '../../../constants/tag-list';
import { Song } from '../../../interfaces/song';
import { FuseService } from '../../../services/fuse-service/fuse.service';
import { InsertPosition, RemoteMass } from '../../../services/remote-control/remote-control';
import { SongService } from '../../../services/song-service/song.service';
import { MatchHighlightComponent } from '../../match-highlight/match-highlight.component';
import { RemoteSession } from '../remote-session.service';

/** Finds a song or a mass of the day on this device and asks the presentation to add it. */
@Component({
  selector: 'app-remote-add',
  imports: [MatIconButton, MatIcon, MatchHighlightComponent],
  templateUrl: './remote-add.component.html',
  styleUrl: './remote-add.component.scss',
})
export class RemoteAddComponent {
  protected session = inject(RemoteSession);

  /** Beside the main screen: no page heading, and the field shows the key that opens it. */
  readonly compact = input(false, { transform: booleanAttribute });
  /** Escape in the search field: the search is cleared and the reader is done adding. */
  readonly leaveSearch = output();

  readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  readonly tags = [ALL_TAGS, ...TAGS_LIST];
  readonly search = signal('');
  readonly tag = signal(ALL_TAGS.id);

  readonly results = inject(FuseService).getSearchResults(this.tag, this.search, inject(SongService).songList);

  readonly songIds = computed(() => new Set(this.session.songs().map(({ id }) => id)));
  readonly addedMasses = computed(() => new Set(this.session.songs().map(({ liturgy }) => liturgy)));

  // A mass is found by its title or by the start of the word "літургія", and a song tag hides the masses.
  readonly masses = computed<RemoteMass[]>(() => {
    const search = this.search().trim().toLowerCase();

    if (this.tag()) {
      return [];
    }

    return (this.session.state()?.masses ?? []).filter(
      ({ title }) => 'літургія'.startsWith(search) || title.toLowerCase().includes(search),
    );
  });

  /** "пасля «Святы»" or "у канец", as the button labels say it. */
  readonly where = computed(() => {
    const current = this.session.currentSong();

    return this.session.insertPosition() === 'afterCurrent' && current ? `пасля «${current.title}»` : 'у канец';
  });

  focusSearch() {
    this.searchInput().nativeElement.focus();
  }

  leave() {
    this.search.set('');
    this.leaveSearch.emit();
  }

  setPosition(position: InsertPosition) {
    this.session.insertPosition.set(position);
  }

  addSong(song: Song) {
    this.session.add(song.id.toString());
  }

  addMass(mass: RemoteMass) {
    this.session.add(mass.id);
  }
}
