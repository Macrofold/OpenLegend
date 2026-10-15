/** React Aria's modal overlay need not emit aria-modal on its dialog. */
export function modalOwnsInput(): boolean {
  return !!document.querySelector(
    '[aria-modal="true"], .ol-modal-overlay, .react-aria-ModalOverlay',
  );
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
