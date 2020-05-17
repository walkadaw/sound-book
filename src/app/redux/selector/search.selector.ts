import { IAppState } from '../models/IAppState';
import { SearchInput } from '../models/search.state';
import { createSelector } from '@ngrx/store';

const getSearchState = (state: IAppState) => state.searchInput || {};

export const getSearchTerm = createSelector(getSearchState, (state: SearchInput) => state.searchTerm || '');
