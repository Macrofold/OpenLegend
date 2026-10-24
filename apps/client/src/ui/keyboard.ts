/** React Aria's modal overlay need not emit aria-modal on its dialog. */
export function modalOwnsInput(): boolean {
  return !!document.querySelector(
    '[aria-modal="true"], .ol-modal-overlay, .react-aria-ModalOverlay',
  );
}

/** Enter at the appropriate end before wrapping between rows. Native-disabled
 * controls cannot take focus; aria-disabled rows retain their explanations.
 */
export function movePickerFocus(container: HTMLElement, key: 'ArrowDown' | 'ArrowUp'): void {
  const rows = Array.from(
    container.querySelectorAll<HTMLButtonElement>('[data-picker-row]'),
  ).filter((row) => !row.disabled);
  const index = rows.indexOf(document.activeElement as HTMLButtonElement);
  const next =
    index < 0
      ? key === 'ArrowDown'
        ? 0
        : rows.length - 1
      : (index + (key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length;
  rows[next]?.focus();
}

/** World shortcuts must not compete with text entry or an open child choice.
 * Escape remains with each overlay's dismissal owner.
 * docs/ui-ux/controls.md#text-composition-and-game-shortcuts
 */
export function uiOwnsShortcut(event: KeyboardEvent): boolean {
  return (
    event.defaultPrevented ||
    event.isComposing ||
    modalOwnsInput() ||
    !!document.querySelector('#contextMenu, [role="listbox"], [role="menu"]') ||
    (event.target instanceof Element &&
      !!event.target.closest(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="dialog"], [role="listbox"], [role="menu"]',
      ))
  );
}
