import { MatIconRegistryService } from '../mat-icon-registry-service/mat-icon-registry.service';
import { SongService } from '../song-service/song.service';

export const startUpFactory = (matRegisterIcon: MatIconRegistryService, songService: SongService) => () =>
  new StartUpService(matRegisterIcon, songService).load();

export class StartUpService {
  constructor(private matRegisterIcon: MatIconRegistryService, private songService: SongService) {}

  load(): Promise<any> {
    return Promise.all([this.songService.loadSongs(), this.matRegisterIcon.register()]);
  }
}
