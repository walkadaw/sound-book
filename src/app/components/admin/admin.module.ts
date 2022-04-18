import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MainAdminComponent } from '../../application/main-admin/main-admin.component';
import { MatModule } from '../../mat.module';
import { HeaderModule } from '../header/header.module';
import { AdminComponent } from './admin/admin.component';
import { EditSongComponent } from './edit/edit-song/edit-song.component';
import { EditComponent } from './edit/edit.component';

const adminRoutes: Routes = [
  {
    path: '',
    component: MainAdminComponent,
    children: [
      { path: 'edit/:id', component: EditComponent },
      { path: 'add', component: EditComponent },
      { path: '', component: AdminComponent, pathMatch: 'full' },
    ],
  },
];

@NgModule({
  declarations: [
    MainAdminComponent,
    AdminComponent,
    EditComponent,
    EditSongComponent,
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
