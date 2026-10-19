/** `upload` is a file uploaded in the admin and kept on this site */
export type SongMediaSource = 'youtube' | 'gdrive' | 'file' | 'upload';

export interface SongMedia {
  id: number;
  /** a source this client does not know yet is shown as a plain link */
  source: SongMediaSource | (string & {});
  /** YouTube video id, Google Drive file id, the file URL or the uploaded file's name, depending on the source */
  ref: string;
  title: string | null;
  author: string | null;
  /** seconds */
  duration: number | null;
  startAt: number | null;
  endAt: number | null;
}

/** what the admin saves; a record without an id is added at the end of the song's list */
export type SongMediaDraft = Omit<SongMedia, 'id'> & { id: number | null };
