// The parts of a mass always stand together: the program moves, removes and inserts around them as one entry.
interface Placed {
  liturgy?: string | null;
  startIndex?: number;
  endIndex?: number;
}

/** The index right after the entry that starts at `index`: the next song, or the end of the mass. */
export function entryEnd(list: readonly Placed[], index: number): number {
  const liturgy = list[index]?.liturgy;
  let end = index + 1;

  while (liturgy && end < list.length && list[end].liturgy === liturgy) {
    end++;
  }

  return end;
}

/** Whether a song may stand at `index` without splitting a mass in two. */
export function isEntryBoundary(list: readonly Placed[], index: number): boolean {
  if (index <= 0 || index >= list.length) {
    return index === 0 || index === list.length;
  }

  const liturgy = list[index].liturgy;

  return !liturgy || list[index - 1].liturgy !== liturgy;
}

/**
 * The list with the entry that starts at `index` standing before the song now at `to` (or at the end for the
 * length of the list); null when nothing would move or the entry would split a mass.
 */
export function moveEntry<T extends Placed>(list: readonly T[], index: number, to: number): T[] | null {
  const end = entryEnd(list, index);

  if (!isEntryBoundary(list, index) || !isEntryBoundary(list, to) || (to >= index && to <= end)) {
    return null;
  }

  const entry = list.slice(index, end);
  const rest = [...list.slice(0, index), ...list.slice(end)];
  const at = to > index ? to - entry.length : to;

  return [...rest.slice(0, at), ...entry, ...rest.slice(at)];
}

/** Where a song goes to be shown next: after the current song, or after the whole mass it is part of. */
export function insertionIndex(list: readonly Placed[], slide: number): number {
  const current = list.findIndex(({ startIndex = 0, endIndex = 0 }) => startIndex <= slide && slide <= endIndex);

  return current < 0 ? list.length : entryEnd(list, current);
}
