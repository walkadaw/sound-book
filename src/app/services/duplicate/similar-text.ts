import { distance } from 'fastest-levenshtein';

// Kept free of Angular so the duplicates web worker can import it
export function isSimilarText(x: string, y: string): boolean {
  const levenshteinDis = distance(x, y);
  const bigger = Math.max(x.length, y.length);
  const pct = ((bigger - levenshteinDis) / bigger) * 100;

  return pct > 44;
}
