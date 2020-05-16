import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SongService } from '../../services/song-service/song.service';
import { Song } from '../../interfaces/song';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TAGS_LIST } from '../../constants/tag-list';
import { TagList } from '../../interfaces/tag-list';

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainPageComponent implements OnInit {
  songListFiltered$: Observable<Song[]>;
  tags$: BehaviorSubject<Set<number>> = new BehaviorSubject(new Set());
  tagsList: TagList[] = TAGS_LIST;

  constructor(private songService: SongService) {}

  ngOnInit(): void {
    this.songListFiltered$ = this.tags$.pipe(
      map((tags) => {
        if (tags.size) {
          return this.songService.songList.filter(
            (song) => song.tag && Object.keys(song.tag).some((tag) => tags.has(+tag))
          );
        }
        return this.songService.songList;
      })
    );
  }

  tagToggle(eventTag: number) {
    const tags = this.tags$.value;

    if (!eventTag) {
      tags.clear();
      return this.tags$.next(tags);
    }

    tags.has(eventTag) ? tags.delete(eventTag) : tags.add(eventTag);
    this.tags$.next(tags);
  }

  trackBySong(index: string, item: Song) {
    return item.id;
  }
}
