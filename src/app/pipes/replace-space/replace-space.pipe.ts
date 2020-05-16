import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'replaceSpace',
})
export class ReplaceSpacePipe implements PipeTransform {
  transform(value: string): string {
    return value ? value.replace(/\s/g, '-') : '';
  }
}
