import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LetDirectiveModule } from '../../directives/let-directive/app-let.module';
import { MatModule } from '../../mat.module';
import { SearchSongComponent } from '../search-song/search-song.component';
import { HeaderComponent } from './header.component';

@NgModule({
  declarations: [HeaderComponent, SearchSongComponent],
  exports: [HeaderComponent],
  imports: [CommonModule, MatModule, LetDirectiveModule, ReactiveFormsModule, RouterModule],
})
export class HeaderModule {}
