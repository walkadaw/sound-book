import { isSimilarText } from '../../../services/duplicate/similar-text';
import { DuplicatesRequest, DuplicatesResponse } from './duplicates.model';

addEventListener('message', ({ data }: MessageEvent<DuplicatesRequest[]>) => {
  const matched = new Set<number>();
  const duplicates: DuplicatesResponse[] = [];

  for (const song of data) {
    const similarIds = data
      .filter((other) => other !== song && !matched.has(other.id) && isSimilarText(song.text, other.text))
      .map((other) => other.id);

    if (similarIds.length) {
      matched.add(song.id);
      duplicates.push({ id: song.id, similarIds });
    }
  }

  postMessage(duplicates);
});
