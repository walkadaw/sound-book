export interface TagList {
  id: number;
  title: string;
  icon: string;
}

export const ALL_TAGS: TagList = { id: 0, title: 'Усе', icon: '' };

export const TAGS_LIST: TagList[] = [
  {
    id: 1,
    title: 'Да Духа',
    icon: 'icon-fire',
  },
  {
    id: 2,
    title: 'Эўхарыстычныя',
    icon: 'icon-eucharist',
  },
  {
    id: 3,
    title: 'Праслаўленне',
    icon: 'icon-glorification',
  },
  {
    id: 4,
    title: 'Пакланенне',
    icon: 'icon-worship',
  },
  {
    id: 5,
    title: 'Пілігрымкавыя',
    icon: 'icon-pilgrim',
  },
  {
    id: 6,
    title: 'Марыйныя',
    icon: 'icon-maria',
  },
  {
    id: 7,
    title: 'Калядныя',
    icon: 'icon-christmas',
  },
  {
    id: 8,
    title: 'Постныя',
    icon: 'icon-fasting',
  },
  {
    id: 9,
    title: 'Велікодныя',
    icon: 'icon-easter',
  },
  {
    id: 10,
    title: 'Часткі імшы',
    icon: 'icon-parts-of-mass',
  },
];

export const SEARCH_FILTERS: TagList[] = [ALL_TAGS, ...TAGS_LIST];

export const PARTS_OF_MASS_TAG_ID = 10;

/**
 * Song ids of the parts of Mass in the order they come in the liturgy:
 * Пане, змілуйся; Хвала на вышынях Богу; Святы; Ойча наш; Баранку Божы; Аллелюя.
 * The other parts of Mass follow them alphabetically.
 */
export const PARTS_OF_MASS_ORDER = [420, 421, 430, 431, 432, 442];
