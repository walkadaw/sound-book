import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, pipe, of } from 'rxjs';
import { Song } from '../interface/song';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class MockDataService {
  constructor(private http: HttpClient) {}

  getData(): Observable<Song[]> {
    return this.http.get<Song[]>('http://public/ajax/json-song-list?slide=false').pipe(
      catchError((error) => {
        console.log(error);
        return of([]);
      })
    );
  }
}
