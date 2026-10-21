import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap, switchMap } from 'rxjs/operators';
import { of, Observable, iif } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Liturgy } from '../../interfaces/liturgy';
import { SlideList } from '../../interfaces/slide';

@Service()
export class LiturgyService {
  private http = inject(HttpClient);

  slideLiturgy: SlideList[];

  // the masses of the day, the default one first; null when the request failed
  getLiturgy(): Observable<Liturgy[] | null> {
    return this.http.get<Liturgy[]>(`${environment.baseUrl}/liturgy/get`).pipe(catchError(() => of(null)));
  }

  loadSlideForLiturgy(): Observable<SlideList[]> {
    return of(this.slideLiturgy).pipe(
      switchMap(() =>
        iif(
          () => this.slideLiturgy && !!this.slideLiturgy.length,
          of(this.slideLiturgy),
          this.http.get<SlideList[]>(`${environment.baseUrl}/liturgy/get-slide`).pipe(
            tap((slideLiturgy) => {
              this.slideLiturgy = slideLiturgy;
            }),
            catchError(() => of(null)),
          ),
        ),
      ),
    );
  }

  hasSlideLiturgy(liturgy: string): boolean {
    // slideLiturgy stays undefined when the request failed
    return !!this.slideLiturgy?.some(({ id }) => id === liturgy);
  }

  getSlideLiturgy(liturgy: string): SlideList | undefined {
    return this.slideLiturgy?.find(({ id }) => id === liturgy);
  }
}
