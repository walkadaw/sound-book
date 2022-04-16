import { createSelector } from '@ngrx/store';
import { IAppState } from '../models/IAppState';
import { SearchInput } from '../models/search.state';

const getSearchState = (state: IAppState) => state.searchInput || {};

export const getSearchTerm = createSelector(getSearchState, (state: SearchInput) => state.searchTerm || '');
export const getSelectedTag = createSelector(getSearchState, (state: SearchInput) => state.selectedTag || 0);
