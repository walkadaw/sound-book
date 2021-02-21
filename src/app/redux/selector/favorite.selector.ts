import { IAppState } from '../models/IAppState';

export const getFavoriteState = (state: IAppState) =>
  (state.favorite || []).reduce((acc, value) => acc.add(value), new Set<number>());
