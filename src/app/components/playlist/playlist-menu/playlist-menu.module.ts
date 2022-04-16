import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatModule } from '../../../mat.module';
import { PlaylistMenuComponent } from './playlist-menu.component';

@NgModule({
  declarations: [PlaylistMenuComponent],
  exports: [PlaylistMenuComponent],
  imports: [CommonModule, RouterModule, MatModule],
})
export class PlaylistMenuModule { }
