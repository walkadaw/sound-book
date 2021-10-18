import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { IAppState } from '../../redux/models/IAppState';

@Component({
  selector: 'app-main-admin',
  templateUrl: './main-admin.component.html',
  styleUrls: ['./main-admin.component.scss'],
})
export class MainAdminComponent {
  constructor(private store: Store<IAppState>, private router: Router) {}
}
