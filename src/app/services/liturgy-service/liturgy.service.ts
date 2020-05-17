import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError } from 'rxjs/operators';
import { of, Observable } from 'rxjs';
import { Liturgy } from '../../interfaces/liturgy';

@Injectable({
  providedIn: 'root',
})
export class LiturgyService {
  constructor(private http: HttpClient) {}

  getLiturgy(): Observable<Liturgy> {
    return this.http.get<Liturgy>(`${environment.baseUrl}/liturgy/get`).pipe(catchError(() => of(null)));
  }
}
