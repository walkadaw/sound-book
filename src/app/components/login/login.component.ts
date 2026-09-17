import { Component, OnInit, inject } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, EMPTY } from 'rxjs';
import { UserService } from '../../services/user/user.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: false,
})
export class LoginComponent implements OnInit {
  private userService = inject(UserService);
  private router = inject(Router);

  loginForm = new UntypedFormGroup({
    username: new UntypedFormControl('', Validators.required),
    password: new UntypedFormControl('', Validators.required),
  });

  ngOnInit(): void {
    if (this.userService.isAuth$.value) {
      this.router.navigate(['/admin']);
    }
  }

  onLogin() {
    this.loginForm.markAsTouched();

    if (this.loginForm.valid) {
      const { username, password } = this.loginForm.value;
      this.userService
        .login(username, password)
        .pipe(
          catchError(() => {
            this.loginForm.setErrors({ failedError: 'Лагін ці пароль няправільныя' });
            return EMPTY;
          }),
        )
        .subscribe(() => {
          this.router.navigate(['/admin']);
        });
    }
  }
}
