type Forms = [one: string, few: string, many: string];

const SONGS: Forms = ['песня', 'песні', 'песень'];
const SLIDES: Forms = ['слайд', 'слайды', 'слайдаў'];
const DEVICES: Forms = ['прылада', 'прылады', 'прылад'];

function count(n: number, [one, few, many]: Forms): string {
  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${n} ${one}`;
  }

  return `${n} ${mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many}`;
}

export const songCount = (n: number) => count(n, SONGS);
export const slideCount = (n: number) => count(n, SLIDES);
export const deviceCount = (n: number) => count(n, DEVICES);
