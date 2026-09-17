import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';

import { PresentationMenuComponent } from './presentation-menu/presentation-menu.component';
import { PresentationComponent } from './presentation.component';

const presentationRoutes: Routes = [
  { path: ':id', component: PresentationComponent },
  { path: '', component: PresentationComponent, pathMatch: 'full' },
];

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(presentationRoutes),
    PresentationComponent,
    PresentationMenuComponent,
  ],
  providers: [provideHttpClient(withXhr(), withInterceptorsFromDi())],
})
export class PresentationModule {}
