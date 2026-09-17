import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';

import { SongModule } from '../../services/song-service/song.module';
import { RevealService } from '../../services/reveal-service/reveal.service';

import { LiturgyModule } from '../../services/liturgy-service/liturgy.module';
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
    SongModule,
    LiturgyModule,
    RouterModule.forChild(presentationRoutes),
    PresentationComponent,
    PresentationMenuComponent,
  ],
  providers: [RevealService, provideHttpClient(withXhr(), withInterceptorsFromDi())],
})
export class PresentationModule {}
