// The readable tail of /song/:id/:title; prerendered pages are written at these exact paths.
export function songSlug(title: string | null | undefined): string {
  return title ? title.replace(/\s/g, '-') : '';
}
