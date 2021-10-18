import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { AdminComponent } from './admin/admin.component';
import { EditComponent } from './edit/edit.component';
import { AddComponent } from './add/add.component';
import { MainAdminComponent } from '../../application/main-admin/main-admin.component';
import { HeaderModule } from '../header/header.module';

const adminRoutes: Routes = [
  {
    path: '',
    component: MainAdminComponent,
    children: [
      { path: 'edit/:id', component: EditComponent },
      { path: 'add', component: AddComponent },
      { path: '', component: AdminComponent, pathMatch: 'full' },
    ],
  },
];

@NgModule({
  declarations: [MainAdminComponent, AdminComponent, EditComponent, AddComponent],
  imports: [CommonModule, RouterModule.forChild(adminRoutes), HeaderModule],
})
export class AdminModule {}
