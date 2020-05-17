import { SearchInput } from '../models/search.state';
import { SearchActions, SearchActionTypes } from '../actions/search.actions';

export const SEARCH_STATE_DEFAULT: SearchInput = { searchTerm: '' };

export function searchReducer(searchState: SearchInput = SEARCH_STATE_DEFAULT, action: SearchActions): SearchInput {
  switch (action.type) {
    case SearchActionTypes.SET_SEARCH_TERM:
      return { ...searchState, searchTerm: action.searchTerm };

    case SearchActionTypes.CLEAR_SEARCH_TERM:
      return { ...searchState, searchTerm: '' };

    default:
      return searchState;
  }
}
