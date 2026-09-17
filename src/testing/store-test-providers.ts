import { EnvironmentProviders } from '@angular/core';
import { provideStore } from '@ngrx/store';
import { favoriteReducer } from '../app/redux/reducers/favorite.reducer';
import { searchReducer } from '../app/redux/reducers/search.reducer';
import { settingsReducer } from '../app/redux/reducers/settings.reducer';

export function provideTestStore(): EnvironmentProviders {
  return provideStore({
    searchInput: searchReducer,
    settings: settingsReducer,
    favorite: favoriteReducer,
  });
}
