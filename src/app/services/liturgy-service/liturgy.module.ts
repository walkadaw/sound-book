import { NgModule } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { LiturgyService } from './liturgy.service';

@NgModule({ imports: [], providers: [LiturgyService, provideHttpClient(withXhr(), withInterceptorsFromDi())] })
export class LiturgyModule {}
