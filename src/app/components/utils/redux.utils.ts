import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { IAppState } from '../../redux/models/IAppState';

export function getCurrentValue<T>(store: Store<IAppState>, selector: (state: IAppState) => T): T {
  return getCurrentValue$(store.select(selector));
}

function getCurrentValue$<T>(observable$: Observable<T>): T {
  let value: T;
  observable$.subscribe((v) => (value = v)).unsubscribe();
  return value;
}
