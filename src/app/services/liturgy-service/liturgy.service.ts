import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, tap, switchMap } from 'rxjs/operators';
import { of, Observable, iif } from 'rxjs';
import { Liturgy } from '../../interfaces/liturgy';
import { SlideList } from '../../interfaces/slide';

@Injectable()
export class LiturgyService {
  constructor(private http: HttpClient) {}
  slideLiturgy: SlideList[];
  getLiturgy(): Observable<Liturgy> {
    return this.http.get<Liturgy>(`${environment.baseUrl}/liturgy/get`).pipe(catchError(() => of(null)));
  }

  loadSlideForLiturgy(): Observable<SlideList[]> {
    return of(this.slideLiturgy).pipe(
      switchMap(() =>
        iif(
          () => this.slideLiturgy && !!this.slideLiturgy.length,
          of(this.slideLiturgy),
          this.http.get<SlideList[]>(`${environment.baseUrl}/liturgy/get-slide`).pipe(
            tap((slideLiturgy) => (this.slideLiturgy = slideLiturgy)),
            catchError(() => of(null))
          )
        )
      )
    );
  }

  hasSlideLiturgy(liturgy: string): boolean {
    return this.slideLiturgy.some(({ id }) => id === liturgy);
  }

  getSlideLiturgy(liturgy: string): SlideList {
    return this.slideLiturgy.find(({ id }) => id === liturgy);
  }
}
