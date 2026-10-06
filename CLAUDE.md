You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly. `OnPush` is the default in Angular v22+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `model()` for two-way bound properties with `[(prop)]` syntax instead of pairing `input()` with `output()`
- Use `computed()` for derived state
- Use `linkedSignal()` for state derived from multiple reactive sources that must stay synchronized
- Prefer inline templates for small components
- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular v22+ and provide signal-based state, type-safe field access, and schema-based validation
- When not using Signal Forms, prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- Do NOT import `CommonModule`, import only the directives and pipes the template uses, such as `AsyncPipe` or `DatePipe`
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Typography

The songbook is read both at a music stand and on the move (a phone in hand, outdoors), so text must stay legible at any size the reader picks. The tokens live in `src/styles.scss`.

- Text uses Arsenal (`--app-font-text`, inherited from `body`); headings, the logo and song numbers use `--app-font-heading`. Do NOT add other font families or set `font-family` on body text
- Inside `<main>`, size text with the em tokens (`--app-fs-page-title`, `--app-fs-title`, `--app-fs-subtitle`, `--app-fs-small`, `--app-fs-meta`) so the reader's font size setting scales it. Do NOT size text in `px`
- Outside `<main>` (header, footer, menus, dialogs and other overlays) use `rem`
- Keep text at 14px or more at the default size: `--app-fs-meta` (0.8em) or `0.875rem` is the smallest
- Size headings by role class (`.page-title`, `.section-title`, `.song-subtitle`, `.subsection-title`), not by heading level, and do NOT override a heading's size or color with `!important`
- Arsenal only has weights 400 and 700. Do NOT use 100–600: they silently render as 400 or 700, or as a thin fallback font on phones
- Secondary text (counts, dates, tags) uses the `.meta` class: a smaller size and `--mat-sys-on-surface-variant`, never a thin weight or added letter-spacing
- Show song titles in capitals with the `.song-name` class; never uppercase the stored text. Do NOT put `.song-name` on form fields or labels
- Set Material text sizes once with the system tokens in `mat.theme-overrides` in `src/styles.scss`, not with per-component `--mat-*-text-size` overrides
- Use `--app-text`, `--app-heading` and `--app-accent-muted` (chords, tag names) for text colors

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Prefer the `@Service` decorator over `@Injectable({providedIn: 'root'})` for new singleton services (Angular v22+)
- Use the `inject()` function instead of constructor injection
