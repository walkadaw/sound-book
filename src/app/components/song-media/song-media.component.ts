import { Component, PLATFORM_ID, computed, effect, inject, input, linkedSignal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatIcon } from '@angular/material/icon';
import { SongMedia } from '../../interfaces/song-media';
import { NetworkService } from '../../services/network/network.service';
import { SettingsService } from '../../services/settings/settings.service';
import { SongService } from '../../services/song-service/song.service';
import { SongMediaPlayer, formatDuration, songMediaPlayer } from './song-media-player';

interface MediaItem {
  media: SongMedia;
  label: string;
  details: string;
  player: SongMediaPlayer;
  frameUrl: SafeResourceUrl | null;
}

const SOURCE_NAMES: Record<string, string> = {
  youtube: 'YouTube',
  gdrive: 'Google Drive',
  file: 'Аўдыяфайл',
};

@Component({
  selector: 'app-song-media',
  templateUrl: './song-media.component.html',
  styleUrl: './song-media.component.scss',
  imports: [MatIcon],
})
export class SongMediaComponent {
  private songService = inject(SongService);
  private sanitizer = inject(DomSanitizer);
  private showMedia = inject(SettingsService).showMedia;
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly online = inject(NetworkService).online;

  readonly songId = input.required<number>();

  // offline the service worker answers from its cache, so readers still see that a song has recordings;
  // prerendered pages get nothing, as they would bake in the list together with the offline note
  protected readonly media = rxResource({
    params: () => (this.isBrowser && this.showMedia() ? { id: this.songId() } : undefined),
    stream: ({ params }) => this.songService.getSongMedia(params.id),
  });

  protected readonly items = computed<MediaItem[]>(() => {
    const media = this.media.hasValue() ? this.media.value() : [];

    const playable = media.flatMap((item) => {
      const player = songMediaPlayer(item);

      return player ? [{ item, player }] : [];
    });

    return playable.map(({ item, player }, index) => ({
      media: item,
      label: item.title || `Запіс ${index + 1}`,
      details: [item.author, item.duration ? formatDuration(item.duration) : null, SOURCE_NAMES[item.source]]
        .filter(Boolean)
        .join(' · '),
      player,
      frameUrl: player.type === 'iframe' ? this.sanitizer.bypassSecurityTrustResourceUrl(player.url) : null,
    }));
  });

  // only one player is open at a time, and none when another song is opened
  protected readonly openId = linkedSignal<number, number | null>({ source: this.songId, computation: () => null });

  constructor() {
    // retries only when the network comes back: retrying on every error would loop while a request keeps failing
    effect(() => {
      if (this.online() && untracked(() => this.media.error())) {
        this.media.reload();
      }
    });
  }

  protected toggle(id: number): void {
    this.openId.update((openId) => (openId === id ? null : id));
  }
}
