import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LetDirectiveModule } from '../../directives/let-directive/app-let.module';
import { MatModule } from '../../mat.module';
import { PlaylistMenuModule } from '../playlist/playlist-menu/playlist-menu.module';
import { SearchSongComponent } from '../search-song/search-song.component';
import { HeaderComponent } from './header.component';

@NgModule({
  declarations: [HeaderComponent, SearchSongComponent],
  exports: [HeaderComponent],
  imports: [CommonModule, MatModule, LetDirectiveModule, ReactiveFormsModule, RouterModule, PlaylistMenuModule],
})
export class HeaderModule {}
