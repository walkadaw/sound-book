import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { SongService } from './song.service';

@NgModule({
  imports: [HttpClientModule],
  providers: [SongService],
})
export class SongModule {}
