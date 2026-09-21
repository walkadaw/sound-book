import { HttpClient } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { catchError, Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

const checkAuth = 'auth';

@Service()
export class UserService implements CanActivate {
  private http = inject(HttpClient);
  private router = inject(Router);

  private isAuthState = signal(false);

  readonly isAuth = this.isAuthState.asReadonly();

  isLoginIn(): Observable<string> {
    if (!localStorage.getItem(checkAuth)) {
      return of('');
    }

    return this.http.get<string>(`${environment.baseUrl}/auth/check`).pipe(
      tap(() => this.isAuthState.set(true)),
      catchError(() => {
        localStorage.removeItem(checkAuth);
        return of('');
      }),
    );
  }

  login(username: string, password: string): Observable<void> {
    return this.http.post<void>(`${environment.baseUrl}/auth/login`, { username, password }).pipe(
      tap(() => {
        this.isAuthState.set(true);
        localStorage.setItem(checkAuth, '1');
      }),
    );
  }

  canActivate(): boolean | UrlTree {
    return this.isAuth() || this.router.createUrlTree(['/login']);
  }
}
