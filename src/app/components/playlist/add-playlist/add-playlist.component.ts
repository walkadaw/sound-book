import { Component, OnInit, inject } from '@angular/core';
import { UntypedFormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PlaylistService } from '../../../services/playlist/playlist.service';

@Component({
  selector: 'app-add-playlist',
  templateUrl: './add-playlist.component.html',
  styleUrls: ['./add-playlist.component.scss'],
  standalone: false,
})
export class AddPlaylistComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private playlistService = inject(PlaylistService);
  private router = inject(Router);

  playlistControl = new UntypedFormControl('', [Validators.required, Validators.maxLength(60)]);
  playlistId = this.route.snapshot?.params?.playlistId;

  ngOnInit(): void {
    if (this.playlistId) {
      const playlist = this.playlistService.getPlaylist(this.playlistId);

      if (!playlist) {
        this.router.navigate(['/playlist']);
        return;
      }

      this.playlistControl.setValue(playlist.name);
    }
  }

  submitForm() {
    if (this.playlistControl.invalid) {
      this.playlistControl.markAllAsTouched();
      return;
    }

    if (this.playlistId) {
      this.edit();
    } else {
      this.create();
    }
  }

  private create() {
    const songId: string = this.route.snapshot?.params?.songId;
    const playlist = this.playlistService.createPlaylist(this.playlistControl.value, songId ? [songId] : []);

    this.router.navigate(['/', 'playlist', playlist.dateCreate, playlist.name, playlist.songList.join(',')]);
  }

  private edit() {
    const playlist = {
      ...this.playlistService.getPlaylist(this.playlistId),
      name: this.playlistControl.value,
    };

    this.playlistService.updatePlaylist(playlist);

    this.router.navigate(['/', 'playlist', playlist.dateCreate, playlist.name, playlist.songList.join(',')]);
  }
}
