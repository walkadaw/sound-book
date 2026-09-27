import { Pipe, PipeTransform } from '@angular/core';
import { songSlug } from '../../utils/song-slug';

@Pipe({ name: 'replaceSpace' })
export class ReplaceSpacePipe implements PipeTransform {
  transform(value: string): string {
    return songSlug(value);
  }
}
