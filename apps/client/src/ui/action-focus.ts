/** Native-disabled actions lose focus. Hold it in this task, then return only
 * if the person has not moved elsewhere while awaiting the result.
 */
export function holdActionFocus(task: HTMLElement | null, anchor: HTMLElement | null = task) {
  const opener =
    document.activeElement instanceof HTMLButtonElement && task?.contains(document.activeElement)
      ? document.activeElement
      : null;
  if (!opener || !anchor) return () => {};
  anchor.focus({ preventScroll: true });
  return () => {
    requestAnimationFrame(() => {
      if (
        document.activeElement === anchor &&
        anchor.isConnected &&
        task?.getClientRects().length &&
        opener.isConnected &&
        !opener.disabled
      )
        opener.focus({ preventScroll: true });
    });
  };
}
