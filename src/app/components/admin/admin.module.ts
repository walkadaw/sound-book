import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MatModule } from '../../mat.module';
import { HeaderModule } from '../header/header.module';
import { AdminComponent } from './admin/admin.component';
import { EditSongComponent } from './edit/edit-song/edit-song.component';
import { EditComponent } from './edit/edit.component';
import { LoadSongResolver } from './edit/load-song.resolver';
import { DiffResultComponent } from '../diff-result/diff-result.component';
import { SimilarSongDialogComponent } from '../similar-song-dialog copy/similar-song-dialog.component';

const adminRoutes: Routes = [
  {
    path: '',
    children: [
      { path: 'edit/:id', component: EditComponent, resolve: { song: LoadSongResolver } },
      { path: 'add', component: EditComponent },
      { path: '', component: AdminComponent, pathMatch: 'full' },
    ],
  },
];

@NgModule({
  declarations: [
    AdminComponent,
    EditComponent,
    EditSongComponent,
    DiffResultComponent,
    SimilarSongDialogComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(adminRoutes),
    HeaderModule,
    ReactiveFormsModule,
    MatModule,
  ],
})
export class AdminModule {}
