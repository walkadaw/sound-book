import { SearchInput } from './search.state';
import { MainSettings } from './settings.state';

export interface IAppState {
  searchInput?: SearchInput;
  settings?: MainSettings;
  favorite?: number[];
}
