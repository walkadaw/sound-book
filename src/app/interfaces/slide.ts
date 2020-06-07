export interface SlideList {
  id: string;
  title: string;
  slides: Slide[];
  startIndex?: number;
  endIndex?: number;
}

export interface Slide {
  fontSize: string;
  text: string;
}
