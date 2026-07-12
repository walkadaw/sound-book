import { NgModule } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { SongService } from './song.service';

@NgModule({ imports: [], providers: [SongService, provideHttpClient(withInterceptorsFromDi())] })
export class SongModule {}
