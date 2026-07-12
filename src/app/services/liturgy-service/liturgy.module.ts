import { NgModule } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { LiturgyService } from './liturgy.service';

@NgModule({ imports: [], providers: [LiturgyService, provideHttpClient(withInterceptorsFromDi())] })
export class LiturgyModule {}
