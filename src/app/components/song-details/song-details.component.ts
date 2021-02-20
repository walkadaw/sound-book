import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SongService } from '../../services/song-service/song.service';
import { Song } from '../../interfaces/song';
import { combineLatest, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { TagNameById } from '../../interfaces/tag-list';
import { IAppState } from '../../redux/models/IAppState';
import { getShowChord, getShowSongNumber } from '../../redux/selector/settings.selector';
import { Store } from '@ngrx/store';
import { getFavoriteState } from '../../redux/selector/favorite.selector';
import { toggleFavoriteAction } from '../../redux/actions/favorite.actions';

@Component({
  selector: 'app-song-details',
  templateUrl: './song-details.component.html',
  styleUrls: ['./song-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongDetailsComponent implements OnInit {
  selectedSong$: Observable<Song>;
  isFavoriteSong$: Observable<boolean>;
  showSongNumber$ = this.store.select(getShowSongNumber);
  showChord$ = this.store.select(getShowChord);
  readonly tagNameById = TagNameById;

  constructor(private songService: SongService, private router: ActivatedRoute, private store: Store<IAppState>) {}

  ngOnInit(): void {
    this.selectedSong$ = this.router.paramMap.pipe(
      map((paramMap) => {
        const songId = paramMap.get('id');
        return this.songService.getSong(songId);
      })
    );

    this.isFavoriteSong$ = combineLatest([this.store.select(getFavoriteState), this.selectedSong$]).pipe(
      filter(([favorite, song]) => favorite && !!song),
      map(([favorite, song]) => favorite.has(song.id))
    );
  }

  isArray(arg: any): boolean {
    return Array.isArray(arg);
  }

  toggleFavorite(songID: number): void {
    this.store.dispatch(toggleFavoriteAction(songID));
  }
}
