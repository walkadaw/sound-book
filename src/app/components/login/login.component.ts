import { Component, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, EMPTY } from 'rxjs';
import { UserService } from '../../services/user/user.service';
import { MatButton } from '@angular/material/button';

import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    standalone: true,
    imports: [
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatButton
],
})
export class LoginComponent implements OnInit {
  loginForm = new UntypedFormGroup({
    username: new UntypedFormControl('', Validators.required),
    password: new UntypedFormControl('', Validators.required),
  });

  constructor(
    private userService: UserService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    if (this.userService.isAuth$.value) {
      this.router.navigate(['/admin']);
    }
  }

  onLogin() {
    this.loginForm.markAsTouched();

    if (this.loginForm.valid) {
      const { username, password } = this.loginForm.value;
      this.userService.login(username, password).pipe(
        catchError(() => {
          this.loginForm.setErrors({ failedError: 'Лагін ці пароль няправільныя' });
          return EMPTY;
        }),
      ).subscribe(() => {
        this.router.navigate(['/admin']);
      });
    }
  }
}
