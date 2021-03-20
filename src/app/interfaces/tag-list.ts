export enum TagName {
  'fire' = 'Да Духа',
  'eucharist' = 'Эўхарыстычныя',
  'glorification' = 'Праслаўленне',
  'worship' = 'Пакланенне',
  'pilgrim' = 'Пілігрымкавыя',
  'maria' = 'Марыйныя',
  'christmas' = 'Калядныя',
  'fasting' = 'Постныя',
  'easter' = 'Велікодныя',
}

export const TagNameById = {
  1: 'Да Духа',
  2: 'Эўхарыстычныя',
  3: 'Праслаўленне',
  4: 'Пакланенне',
  5: 'Пілігрымкавыя',
  6: 'Марыйныя',
  7: 'Калядныя',
  8: 'Постныя',
  9: 'Велікодныя',
};

export interface TagList {
  id: number;
  title: string;
  icon: string;
}
