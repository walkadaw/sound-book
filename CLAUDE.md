# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

SoundBook is an Angular 13 app for browsing/searching a songbook, transposing chords, building playlists, generating printable/DOCX song sheets, running liturgy slide presentations (reveal.js), and editing songs via an admin panel. The backend is a small PHP API (`api/`) with a MySQL/PDO datastore — there is no Node backend; `server.js` only serves the built static `dist/` output.

## Commands

- `npm start` / `ng serve` — dev server at `http://localhost:4200`. API calls to `/api` are proxied (see `dev-proxy.config.json`) to the remote host `bixbox0i.beget.tech`, since there's no local PHP server.
- `npm run build` — dev build; `npm run build-prod` — production build (`dist/sound-book`), includes service worker registration.
- `npm test` — Karma/Jasmine unit tests. Run a single spec by temporarily narrowing focus with `fit`/`fdescribe`, or filter via `ng test --include='**/song.service.spec.ts'`.
- `npm run lint` — ESLint (airbnb-base + Angular + Prettier rules) over `src/**/*.ts` and `src/**/*.html`.
- `npm run e2e` — Protractor e2e tests.
- `npm run host` — serve an already-built `dist/sound-book` via Express on port 4200 (`npm run host-prod` builds first).

## Architecture

### Frontend/backend split
The Angular app under `src/app` is a fully client-side SPA. All persistence goes through the PHP API in `api/`, routed by a single front controller `api/index.php` that dispatches on a `mpage` query param (e.g. `song/get`, `song/update`, `liturgy/get`, `auth/login`, `generator/docx`) to files under `api/song`, `api/liturgy`, `api/auth`, `api/generator`. `api/classes/_class.db.php` holds DB credentials that get substituted at deploy time (see CI below) — never hardcode real credentials there. `environment.baseUrl` (`src/environments`) is always `/api`; only the dev-proxy target changes.

### Song loading and caching
`SongService` (`src/app/services/song-service`) is the single source of truth for song data: `loadSongs()` fetches from `/api/song/get` and caches the full list to `localStorage` under `songList`; `loadSongFromCache()` prefers the cached copy and falls back to a network load if the cache is missing/corrupt. Songs are re-sorted and re-indexed (`songId`) on every load — don't assume the `id` from the API is stable for anything but identity lookups (`hasSong`/`getSong` compare by string `id`, not `songId`).

### Chord engine
`ChordService` (`src/app/services/chord`) parses raw song text into interleaved text/chord tokens, recognizes chords against `chord-list.ts` (chord data keyed by root) and `chord.model.ts` (alias/suffix/short-form lookup tables), and transposes via a fixed circular key sequence in `chord-transpitaliton.ts`. Chord recognition, alias normalization (`convertAlias`/`normalizeChord`), and suffix handling (`normalizeSuffix`/`getReadableSuffix`) are pure lookup-table driven — when adding chord aliases or short forms, extend the maps in `chord.model.ts` rather than special-casing logic in the service.

### State management
NgRx (`@ngrx/store` + `@ngrx/effects`) is used only for cross-component concerns that need to survive navigation: search input, settings, and favorites (`src/app/redux`). Most other state (songs, playlists, liturgy) is held directly in services as `BehaviorSubject`s rather than the store — don't assume everything goes through NgRx.

### Routing
Two route trees in `app.routing.ts`: a top-level `appRoutes` (handles `/presentation`, lazy-loaded, and mounts everything else under `MainSoundComponent`), and `soundRoutes` nested under it for the main app (song details, playlist, liturgy, admin, etc.). `admin` and `presentation` are lazy-loaded feature modules; `admin` is additionally gated by `UserService` as a route guard, and song detail routes are gated by `HasSongGuard` (which depends on `SongService` having songs loaded).

### Presentation/slides
Liturgy and song presentation slides are driven by `reveal.js` via `RevealService`/`SlidesService`, with slide content parsed server-side (`api/liturgy/_parser.php`, `api/liturgy/_get_slide.php`) or client-side from song lyrics.

### Document generation
`generator/docx` builds printable song sheets server-side via PHP (`api/classes/_class.docx.php`, `api/generator/_docx.php`); `GeneratorService` and `PaperGeneratorComponent` on the frontend assemble the request.

## Deployment

`.github/workflows/node.js.yml` builds on push to `master` and deploys via FTP to a Beget hosting account, excluding `api/tmp/**`. DB credentials are injected into `_class.db.php` at deploy time via `sed` from GitHub Actions secrets — the file in the repo should keep placeholder values.

## Conventions

- Linting follows `airbnb-base` plus Angular-specific rules; notable non-default rules: 120-char line length, 2-space indent, mandatory blank lines between class members, `@typescript-eslint/no-shadow` enforced. Run `npm run lint` before finishing changes to `.ts`/`.html` files.
- Component/directive selectors must use the `app` prefix (kebab-case for components, camelCase for attribute directives).
