import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { Routes } from '@angular/router';

import { PresentationComponent } from './presentation.component';

export const presentationRoutes: Routes = [
  {
    path: '',
    providers: [provideHttpClient(withXhr(), withInterceptorsFromDi())],
    children: [
      { path: ':id', component: PresentationComponent },
      { path: '', component: PresentationComponent, pathMatch: 'full' },
    ],
  },
];
