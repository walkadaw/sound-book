export interface Slide {
  fontSize: string;
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
}
