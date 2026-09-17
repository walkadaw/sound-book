import { Service } from '@angular/core';
import { distance } from 'fastest-levenshtein';

@Service()
export class DuplicateService {
  isSimilar(x: string, y: string): boolean {
    const levenshteinDis = distance(x, y);
    const bigger = Math.max(x.length, y.length);
    const pct = ((bigger - levenshteinDis) / bigger) * 100;

    return pct > 44;
  }
}
