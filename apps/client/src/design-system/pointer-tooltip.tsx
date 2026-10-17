import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Tooltip, TooltipTrigger } from 'react-aria-components';

const EDGE = 8;
const GAP = 6;

/** One positioning rule for panel help, including portaled and keyboard-only controls. */
export function PointerTooltip({
  children,
  content,
  className = '',
  delay = 300,
  disabled = false,
}: {
  children: ReactNode;
  content: ReactNode;
  className?: string;
  delay?: number;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLSpanElement>(null);
  const tooltip = useRef<HTMLDivElement | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const frame = useRef<number | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const close = useCallback(() => {
    pointer.current = null;
    setOpen(false);
  }, []);
  const place = useCallback(() => {
    const element = tooltip.current;
    const source = trigger.current;
    if (!element || !source) return;
    const viewport = window.visualViewport;
    const left = (viewport?.offsetLeft ?? 0) + EDGE;
    const top = (viewport?.offsetTop ?? 0) + EDGE;
    const right = left + (viewport?.width ?? innerWidth) - EDGE * 2;
    const bottom = top + (viewport?.height ?? innerHeight) - EDGE * 2;
    const focus = document.activeElement;
    const anchor =
      focus instanceof HTMLElement && source.contains(focus) ? focus : source.firstElementChild;
    // A retained, hidden panel does not unmount its portaled help or reliably
    // dispatch pointer-leave/blur. Its actual trigger must still own visible UI.
    if (
      !(anchor instanceof HTMLElement) ||
      !anchor.getClientRects().length ||
      anchor.closest('[hidden], [inert], [aria-hidden="true"]') ||
      getComputedStyle(anchor).visibility === 'hidden'
    ) {
      element.style.visibility = 'hidden';
      close();
      return;
    }
    const bounds = anchor.getBoundingClientRect();
    const x = pointer.current?.x ?? bounds.left + bounds.width / 2;
    const y = pointer.current?.y ?? bounds.top;
    element.style.maxWidth = `${Math.max(0, right - left)}px`;
    element.style.maxHeight = `${Math.max(0, bottom - top)}px`;
    const box = element.getBoundingClientRect();
    const extendRight = right - x >= x - left;
    const above = y - top >= box.height + GAP || y - top >= bottom - y;
    const preferredX = extendRight ? x + GAP : x - GAP - box.width;
    const preferredY = above ? y - GAP - box.height : (pointer.current?.y ?? bounds.bottom) + GAP;
    element.style.left = `${Math.max(left, Math.min(right - box.width, preferredX))}px`;
    element.style.top = `${Math.max(top, Math.min(bottom - box.height, preferredY))}px`;
    element.style.visibility = 'visible';
  }, [close]);
  const schedule = useCallback(() => {
    if (!tooltip.current || frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      place();
    });
  }, [place]);
  const attach = useCallback(
    (element: HTMLDivElement | null) => {
      cleanup.current?.();
      cleanup.current = null;
      tooltip.current = element;
      if (!element) return;
      place();
      const observer = new ResizeObserver(schedule);
      observer.observe(element);
      const anchor = trigger.current?.firstElementChild;
      if (anchor) observer.observe(anchor);
      // Visibility/inert changes can retain the trigger's dimensions. Observe
      // only its ancestors while open, never the document subtree or every row.
      const visibility = new MutationObserver(schedule);
      for (let owner = anchor; owner; owner = owner.parentElement) {
        visibility.observe(owner, { attributes: true });
      }
      window.addEventListener('blur', close);
      window.addEventListener('resize', schedule);
      window.addEventListener('scroll', schedule, true);
      window.visualViewport?.addEventListener('resize', schedule);
      cleanup.current = () => {
        observer.disconnect();
        visibility.disconnect();
        window.removeEventListener('blur', close);
        window.removeEventListener('resize', schedule);
        window.removeEventListener('scroll', schedule, true);
        window.visualViewport?.removeEventListener('resize', schedule);
        if (frame.current !== null) cancelAnimationFrame(frame.current);
        frame.current = null;
      };
    },
    [place, schedule, close],
  );
  useEffect(() => () => cleanup.current?.(), []);
  return (
    <span
      ref={trigger}
      className="ol-tooltip-trigger"
      onPointerMoveCapture={(event) => {
        if (tooltip.current?.contains(event.target as Node)) return;
        pointer.current = { x: event.clientX, y: event.clientY };
        schedule();
      }}
      onPointerEnter={(event) => {
        if (tooltip.current?.contains(event.target as Node)) return;
        pointer.current = { x: event.clientX, y: event.clientY };
        schedule();
      }}
      onFocusCapture={(event) => {
        if (event.target.matches(':focus-visible')) {
          pointer.current = null;
          schedule();
        }
      }}
    >
      <TooltipTrigger
        delay={delay}
        closeDelay={150}
        isDisabled={disabled}
        isOpen={open}
        onOpenChange={(value) => setOpen(value && document.hasFocus())}
      >
        {children}
        <Tooltip
          ref={attach}
          className={`ol-root ol-pointer-tooltip ${className}`}
          placement="top"
          style={{ position: 'fixed', left: 0, top: 0, visibility: 'hidden' }}
        >
          <div className="ol-portal-content">{content}</div>
        </Tooltip>
      </TooltipTrigger>
    </span>
  );
}
