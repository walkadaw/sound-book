import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, EMPTY } from 'rxjs';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { UserService } from '../../services/user/user.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatButton],
})
export class LoginComponent implements OnInit {
  private userService = inject(UserService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  loginForm = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: Validators.required }),
    password: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });

  ngOnInit(): void {
    if (this.userService.isAuth$.value) {
      this.router.navigate(['/admin']);
    }
  }

  onLogin() {
    this.loginForm.markAsTouched();

    if (this.loginForm.valid) {
      const { username, password } = this.loginForm.getRawValue();
      this.userService
        .login(username, password)
        .pipe(
          catchError(() => {
            this.loginForm.setErrors({ failedError: 'Лагін ці пароль няправільныя' });
            this.cdr.markForCheck();
            return EMPTY;
          }),
        )
        .subscribe(() => {
          this.router.navigate(['/admin']);
        });
    }
  }
}
