import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';
import { MatModule } from '../../mat.module';
import { SongModule } from '../../services/song-service/song.module';
import { RevealService } from '../../services/reveal-service/reveal.service';
import { LetDirectiveModule } from '../../directives/let-directive/app-let.module';
import { LiturgyModule } from '../../services/liturgy-service/liturgy.module';
import { PresentationMenuComponent } from './presentation-menu/presentation-menu.component';
import { PresentationComponent } from './presentation.component';

const presentationRoutes: Routes = [
  { path: ':id', component: PresentationComponent },
  { path: '', component: PresentationComponent, pathMatch: 'full' },
];

@NgModule({
  declarations: [PresentationComponent, PresentationMenuComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatModule,
    SongModule,
    LiturgyModule,
    LetDirectiveModule,
    RouterModule.forChild(presentationRoutes),
  ],
  providers: [RevealService, provideHttpClient(withXhr(), withInterceptorsFromDi())],
})
export class PresentationModule {}
