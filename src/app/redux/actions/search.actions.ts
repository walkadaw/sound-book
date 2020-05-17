import { Action } from '@ngrx/store';

export enum SearchActionTypes {
  SET_SEARCH_TERM = '[Search] set search term',
  CLEAR_SEARCH_TERM = '[Search] clear search term',
}

export class SetSearchTermAction implements Action {
  readonly type = SearchActionTypes.SET_SEARCH_TERM;

  constructor(readonly searchTerm: string) {}
}

export class ClearSearchAction implements Action {
  readonly type = SearchActionTypes.CLEAR_SEARCH_TERM;

  constructor() {}
}

export type SearchActions = SetSearchTermAction | ClearSearchAction;
