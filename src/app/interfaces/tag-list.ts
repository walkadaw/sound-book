import { TAGS_LIST } from '../constants/tag-list';

export const TagNameById = Object.values(TAGS_LIST).reduce<{[key: string]: string}>((acc, tag) => {
  acc[tag.id] = tag.title;
  return acc;
}, {});
