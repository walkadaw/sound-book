import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  // TODO: рассмотреть переход на ChangeDetectionStrategy.OnPush (требует регресс-тестирования)
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class AppComponent {}
