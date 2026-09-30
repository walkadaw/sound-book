export interface DuplicatesRequest {
  id: number;
  text: string;
}

export interface DuplicatesResponse {
  id: number;
  similarIds: number[];
}
