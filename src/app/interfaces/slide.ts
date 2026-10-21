export interface Slide {
  // px
  fontSize: number;
  text: string;
}

export interface SlideList {
  id: string;
  title: string;
  slides: Slide[];
  startIndex?: number;
  endIndex?: number;
  text?: string;
  chord?: string;
  // the presentation id of the mass this part belongs to; a mass is added and removed only as a whole
  liturgy?: string;
}
