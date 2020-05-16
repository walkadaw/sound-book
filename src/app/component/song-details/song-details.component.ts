import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MockDataService } from '../../service/mock-data.service';
import { Song } from '../../interface/song';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-song-details',
  templateUrl: './song-details.component.html',
  styleUrls: ['./song-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongDetailsComponent implements OnInit {
  selectedSong$: Observable<Song>;
  constructor(private mockService: MockDataService) {}

  ngOnInit(): void {
    this.selectedSong$ = this.mockService.getData().pipe(
      map((value) => {
        return value[10];
      })
    );

    this.selectedSong$.subscribe(console.log);
  }
}
