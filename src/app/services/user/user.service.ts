import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import {
  BehaviorSubject, catchError, EMPTY, map, Observable, of, tap,
} from 'rxjs';
import { environment } from '../../../environments/environment';

const checkAuth = 'auth';

@Injectable({
  providedIn: 'root',
})
export class UserService implements CanActivate {
  private http = inject(HttpClient);
  private router = inject(Router);

  isAuth$ = new BehaviorSubject<boolean>(false);



  isLoginIn(): Observable<string> {
    if (!localStorage.getItem(checkAuth)) {
      return of('');
    }

    return this.http.get<string>(`${environment.baseUrl}/auth/check`).pipe(
      tap(() => this.isAuth$.next(true)),
      catchError(() => {
        localStorage.removeItem(checkAuth);
        return of('');
      }),
    );
  }

  login(username: string, password: string): Observable<void> {
    return this.http.post<void>(`${environment.baseUrl}/auth/login`, { username, password }).pipe(
      tap(() => {
        this.isAuth$.next(true);
        localStorage.setItem(checkAuth, '1');
      }),
    );
  }

  canActivate(): Observable<boolean | UrlTree> {
    return this.isAuth$.pipe(map((isAuth) => (isAuth ? true : this.router.createUrlTree(['/login']))));
  }
}
