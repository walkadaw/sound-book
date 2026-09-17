import { NgModule } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { SongService } from './song.service';

@NgModule({ imports: [], providers: [SongService, provideHttpClient(withXhr(), withInterceptorsFromDi())] })
export class SongModule {}
