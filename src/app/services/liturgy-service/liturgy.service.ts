import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { of, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Liturgy } from '../../interfaces/liturgy';

@Service()
export class LiturgyService {
  private http = inject(HttpClient);

  // the masses of the day, the default one first; null when the request failed
  getLiturgy(): Observable<Liturgy[] | null> {
    return this.http.get<Liturgy[]>(`${environment.baseUrl}/liturgy/get`).pipe(catchError(() => of(null)));
  }
}
