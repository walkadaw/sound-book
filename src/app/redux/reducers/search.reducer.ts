import { createReducer, on } from '@ngrx/store';
import { SearchInput } from '../models/search.state';
import { clearSearchAction, setSearchTermAction, setSelectedTagAction } from '../actions/search.actions';

export const SEARCH_STATE_DEFAULT: SearchInput = { searchTerm: '', selectedTag: 0 };

export const searchReducer = createReducer(
  SEARCH_STATE_DEFAULT,
  on(setSearchTermAction, (state, { searchTerm }) => ({ ...state, searchTerm })),
  on(setSelectedTagAction, (state, { selectedTag }) => ({ ...state, selectedTag })),
  on(clearSearchAction, () => ({ ...SEARCH_STATE_DEFAULT })),
);
