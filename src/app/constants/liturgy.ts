// A mass of the day in a presentation URL: "l" for the default one, as older playlists have it, then "l2", "l3"...
export function liturgyId(index: number): string {
  return index ? `l${index + 1}` : 'l';
}

// The index of the mass in the masses of the day, null when the id is not a mass.
// Each mass has one id: no "l1" for the default one and no leading zeros.
export function liturgyIndex(id: string): number | null {
  const match = /^l([2-9]|[1-9]\d+)?$/.exec(id);

  if (!match) {
    return null;
  }

  return match[1] ? Number(match[1]) - 1 : 0;
}
