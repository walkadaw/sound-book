import { Component, OnInit } from '@angular/core';
import { UntypedFormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PlaylistService } from '../../../services/playlist/playlist.service';
import { MatButton } from '@angular/material/button';
import { NgIf } from '@angular/common';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';

@Component({
    selector: 'app-add-playlist',
    templateUrl: './add-playlist.component.html',
    styleUrls: ['./add-playlist.component.scss'],
    standalone: true,
    imports: [
        MatFormField,
        MatLabel,
        MatInput,
        ReactiveFormsModule,
        NgIf,
        MatError,
        MatButton,
    ],
})
export class AddPlaylistComponent implements OnInit {
  playlistControl = new UntypedFormControl('', [Validators.required, Validators.maxLength(60)]);
  playlistId = this.route.snapshot?.params?.playlistId;

  constructor(
    private route: ActivatedRoute,
    private playlistService: PlaylistService,
    private router: Router,
  ) { }

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
