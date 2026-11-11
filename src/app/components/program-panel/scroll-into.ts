/**
 * Scrolls only the given container, just enough to show the element, from its start when it is taller.
 * `scrollIntoView` would also scroll the page around it, and the presentation must not move.
 */
export function scrollInto(container: HTMLElement, element: Element, margin = 8) {
  const box = container.getBoundingClientRect();
  const item = element.getBoundingClientRect();
  const toTop = item.top - box.top - margin;
  const toBottom = Math.min(item.bottom - box.bottom + margin, toTop);

  if (toTop < 0) {
    container.scrollTop += toTop;
  } else if (toBottom > 0) {
    container.scrollTop += toBottom;
  }
}
