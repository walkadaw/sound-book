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

export const TagNameById = [
  'Да Духа',
  'Эўхарыстычныя',
  'Праслаўленне',
  'Пакланенне',
  'Пілігрымкавыя',
  'Марыйныя',
  'Калядныя',
  'Постныя',
  'Велікодныя',
];

export interface TagList {
  id: number;
  title: string;
  icon: string;
}
