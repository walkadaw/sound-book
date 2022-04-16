import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';
import { PresentationComponent } from './presentation.component';
import { PresentationMenuComponent } from './presentation-menu/presentation-menu.component';
import { MatModule } from '../../mat.module';
import { SongModule } from '../../services/song-service/song.module';
import { RevealService } from '../../services/reveal-service/reveal.service';
import { LetDirectiveModule } from '../../directives/let-directive/app-let.module';
import { LiturgyModule } from '../../services/liturgy-service/liturgy.module';

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
    HttpClientModule,
    LetDirectiveModule,
    RouterModule.forChild(presentationRoutes),
  ],
  providers: [RevealService],
})
export class PresentationModule {}
