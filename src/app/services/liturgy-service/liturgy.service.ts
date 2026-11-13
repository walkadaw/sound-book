import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { of, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Liturgy, LiturgyDays } from '../../interfaces/liturgy';

/**
 * Today's masses by the device's date. The server gives the days ahead and the service worker keeps the last
 * answer, so the readings are there for days without the internet; another day never stands in for today.
 */
@Service()
export class LiturgyService {
  private http = inject(HttpClient);

  /** Null when there is nothing for today. */
  getLiturgy(): Observable<Liturgy[] | null> {
    const today = localDate();

    return this.http.get<LiturgyDays>(`${environment.baseUrl}/liturgy/get`).pipe(
      map((days) => (days[today]?.length ? days[today] : null)),
      catchError(() => of(null)),
    );
  }
}

/** YYYY-MM-DD of the device's day: the liturgical day is the reader's own, wherever they are. */
export function localDate(date = new Date()): string {
  const pad = (value: number) => value.toString().padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
