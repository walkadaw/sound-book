import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SongService } from '../../services/song-service/song.service';
import { Song } from '../../interfaces/song';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { TagNameById } from '../../interfaces/tag-list';

@Component({
  selector: 'app-song-details',
  templateUrl: './song-details.component.html',
  styleUrls: ['./song-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongDetailsComponent implements OnInit {
  selectedSong$: Observable<Song>;
  readonly tagNameById = TagNameById;
  constructor(private songService: SongService, private router: ActivatedRoute) {}

  ngOnInit(): void {
    this.selectedSong$ = this.router.paramMap.pipe(
      map((paramMap) => {
        const songId = paramMap.get('id');
        return this.songService.getSong(songId);
      })
    );
  }
}
