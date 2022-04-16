import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface PlayList {
  name: string,
  dateCreate: string,
  lastChange: string,
  songList: string[],
}

const PLAYLIST_KEY = 'playlists';

@Injectable({
  providedIn: 'root',
})
export class PlaylistService {
  playlists$: BehaviorSubject<PlayList[]> = new BehaviorSubject(this.getAllPlaylists());

  get playlists(): PlayList[] {
    return this.playlists$.value;
  }

  getAllPlaylists(): PlayList[] {
    let result: PlayList[];

    try {
      result = JSON.parse(window.localStorage.getItem(PLAYLIST_KEY)) || [];
    } catch (error) {
      result = [];
    }

    return result;
  }

  getPlaylist(id: string): PlayList {
    return this.playlists.find(({ dateCreate }) => dateCreate.toString() === id.toString());
  }

  createPlaylist(name: string, songList: string[]): PlayList {
    const playlist: PlayList = {
      name,
      dateCreate: new Date().getTime().toString(),
      lastChange: new Date().getTime().toString(),
      songList,
    };

    const playlists = [playlist, ...this.getAllPlaylists()];

    this.updateLocalStorage(playlists);

    return playlist;
  }

  addSongToPlaylist(id: string, songId: string) {
    const playlists = this.getAllPlaylists().map((playlist) => {
      if (playlist.dateCreate.toString() !== id.toString()) {
        return playlist;
      }

      return {
        ...playlist,
        lastChange: new Date().getTime().toString(),
        songList: [...playlist.songList, songId],
      };
    });

    this.updateLocalStorage(playlists);
  }

  updatePlaylist(updatedPlaylist: PlayList) {
    const playlists = this.getAllPlaylists().map((playlist) => {
      if (playlist.dateCreate.toString() !== updatedPlaylist.dateCreate.toString()) {
        return playlist;
      }

      return updatedPlaylist;
    });

    this.updateLocalStorage(playlists);
  }

  setAllPlaylist(playlists: PlayList[]) {
    this.updateLocalStorage(playlists);
  }

  deletePlayList(id: string) {
    const playlists = this.getAllPlaylists().filter(({ dateCreate }) => dateCreate.toString() !== id.toString());

    this.updateLocalStorage(playlists);
  }

  private updateLocalStorage(playlists: PlayList[]) {
    window.localStorage.setItem(PLAYLIST_KEY, JSON.stringify(playlists));
    this.playlists$.next(playlists);
  }
}
