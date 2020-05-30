export interface SlideList {
  id: string;
  title: string;
  slides: Slide[];
}

export interface Slide {
  fontSize: string;
  text: string;
}
