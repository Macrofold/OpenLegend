import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { Dialog } from 'react-aria-components';

/** A presentation delay only: callers disable unsafe actions immediately. */
export const LOADING_INDICATOR_DELAY_MS = 500;

export function useDelayedPending(pending: boolean): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!pending) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), LOADING_INDICATOR_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pending]);
  // Completion hides feedback in the same render, without waiting for the effect.
  return pending && visible;
}

type LoadingOwner = (id: string, label: string | null) => void;
const LoadingContext = createContext<LoadingOwner | null>(null);

/** Returns local feedback only when no surrounding panel owns it. */
export function useLoadingStatus(active: boolean, label: string): boolean {
  const owner = useContext(LoadingContext);
  const id = useId();
  useLayoutEffect(() => {
    owner?.(id, active ? label : null);
    return () => owner?.(id, null);
  }, [owner, id, active, label]);
  return useDelayedPending(!owner && active);
}

/** One owner combines concurrent reads without adding rows or covering input. */
export function LoadingScope({
  region,
  children,
}: {
  region: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const [pending, setPending] = useState<ReadonlyMap<string, string>>(new Map());
  const overlay = useRef<HTMLSpanElement>(null);
  const update = useCallback<LoadingOwner>((id, label) => {
    setPending((previous) => {
      if (label === null ? !previous.has(id) : previous.get(id) === label) return previous;
      const next = new Map(previous);
      if (label === null) next.delete(id);
      else next.set(id, label);
      return next;
    });
  }, []);
  const visible = useDelayedPending(pending.size > 0);
  useLayoutEffect(() => {
    const element = region.current;
    if (!visible || !element) return;
    // Center in the visible scroll frame, not halfway through a long document.
    // CSS handles resizing; only actual owner scrolling needs an offset update.
    const followScroll = () => {
      if (overlay.current)
        overlay.current.style.transform = `translate(${element.scrollLeft}px, ${element.scrollTop}px)`;
    };
    followScroll();
    element.addEventListener('scroll', followScroll, { passive: true });
    return () => element.removeEventListener('scroll', followScroll);
  }, [region, visible]);
  return (
    <LoadingContext.Provider value={update}>
      {children}
      {visible &&
        region.current &&
        createPortal(
          <span
            ref={overlay}
            className="ol-loading-overlay"
            role="status"
            aria-label={[...pending.values()].join('. ')}
          >
            <span className="ol-loading-indicator">
              <span className="ol-spinner" aria-hidden="true" />
            </span>
          </span>,
          region.current,
        )}
    </LoadingContext.Provider>
  );
}

/** Standalone reading areas opt into the same centered feedback as panels. */
export function LoadingRegion({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const region = useRef<HTMLDivElement>(null);
  return (
    <div {...props} ref={region} className={`ol-loading-region ${className}`}>
      <LoadingScope region={region}>{children}</LoadingScope>
    </div>
  );
}

/** Portaled dialogs establish their own owner instead of loading a background panel. */
export function LoadingDialog({
  children,
  className,
  ref,
  ...props
}: ComponentProps<typeof Dialog>) {
  const region = useRef<HTMLElement>(null);
  const attach = useCallback(
    (element: HTMLElement | null) => {
      region.current = element?.closest<HTMLElement>('.ol-modal') ?? element;
      if (typeof ref === 'function') return ref(element);
      if (ref) ref.current = element;
    },
    [ref],
  );
  return (
    <Dialog {...props} ref={attach} className={`ol-loading-dialog ${className ?? ''}`}>
      {(state) => (
        <LoadingScope region={region}>
          {typeof children === 'function' ? children(state) : children}
        </LoadingScope>
      )}
    </Dialog>
  );
}

export function LoadingIndicator({
  active,
  label = 'Loading',
  className = '',
}: {
  active: boolean;
  label?: string;
  className?: string;
}) {
  const owner = useContext(LoadingContext);
  const visible = useLoadingStatus(active, label);
  if (owner || !active) return null;
  return (
    <span className={`ol-loading-standalone ${className}`}>
      {visible && (
        <span className="ol-loading-indicator" role="status" aria-label={label}>
          <span className="ol-spinner" aria-hidden="true" />
        </span>
      )}
    </span>
  );
}
