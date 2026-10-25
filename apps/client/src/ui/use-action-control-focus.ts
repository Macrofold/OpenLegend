import { useLayoutEffect, useRef, type FocusEvent } from 'react';

/** Removed action controls return focus within their task, or to its nearby opener.
 * A deliberate move to another control always wins over automatic restoration. */
export function useActionControlFocus(fallbackSelector: string) {
  const ref = useRef<HTMLElement>(null);
  const focused = useRef<HTMLElement | SVGElement | null>(null);
  useLayoutEffect(() => {
    const prior = focused.current;
    if (
      !prior ||
      (prior.isConnected && !prior.matches(':disabled')) ||
      document.activeElement !== document.body
    )
      return;
    focused.current = null;
    const next =
      ref.current?.querySelector<HTMLElement | SVGElement>(
        'button:not(:disabled), [tabindex="0"]',
      ) ??
      ref.current ??
      document.querySelector<HTMLElement>(fallbackSelector);
    next?.focus({ preventScroll: true });
  });
  return {
    ref,
    onFocusCapture(event: FocusEvent<HTMLElement | SVGElement>) {
      if (event.target instanceof HTMLElement || event.target instanceof SVGElement)
        focused.current = event.target;
    },
    onBlurCapture(event: FocusEvent<HTMLElement | SVGElement>) {
      if (
        event.relatedTarget instanceof Node &&
        event.relatedTarget !== document.body &&
        !ref.current?.contains(event.relatedTarget)
      )
        focused.current = null;
    },
  };
}
