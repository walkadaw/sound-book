import { createAction } from '@ngrx/store';

export const setSearchTermAction = createAction('[Search] set search term', (searchTerm: string) => ({ searchTerm }));
export const setSelectedTagAction = createAction('[Search] set selected tag', (selectedTag: number) => ({
  selectedTag,
}));
export const clearSearchAction = createAction('[Search] clear search term');
