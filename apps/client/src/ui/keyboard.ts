/** World shortcuts must not compete with text entry or an open child choice.
 * Escape remains with each overlay's dismissal owner.
 * docs/ui-ux/controls.md#text-composition-and-game-shortcuts
 */
export function uiOwnsShortcut(event: KeyboardEvent): boolean {
  return (
    event.defaultPrevented ||
    event.isComposing ||
    !!document.querySelector(
      '[aria-modal="true"], #contextMenu, [role="listbox"], [role="menu"]',
    ) ||
    (event.target instanceof Element &&
      !!event.target.closest(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="dialog"], [role="listbox"], [role="menu"]',
      ))
  );
}
