import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button, Panel } from '../design-system/components';
import { modalOwnsInput } from './keyboard';
import './bag-window.css';

export interface BagWindowProps {
  id: string;
  title: string;
  host: HTMLElement | null;
  narrow: boolean;
  visible: boolean;
  active: boolean;
  order: number;
  opener?: HTMLElement | null;
  onActivate(): void;
  onClose(): void;
  onShowBelongings(opener?: HTMLElement): void;
  children: ReactNode;
  windowSwitcher?: ReactNode;
}

function canFocus(element: HTMLElement | null | undefined): element is HTMLElement {
  return !!(
    element?.isConnected &&
    element.getClientRects().length &&
    !element.matches(':disabled') &&
    !element.closest('[hidden], [inert], [aria-hidden="true"]')
  );
}

/** A presentation host for a collection owned by the one Inventory workspace.
 * Opening/closing this window creates no custody, permission or second command lane.
 * docs/ui-design-brief.md#interaction-direction-to-preserve-and-refine */
export function BagWindow({
  id,
  title,
  host,
  narrow,
  visible,
  active,
  order,
  opener,
  onActivate,
  onClose,
  onShowBelongings,
  children,
  windowSwitcher,
}: BagWindowProps) {
  const slot = useRef<HTMLDivElement>(null);
  const latestOpener = useRef(opener);
  latestOpener.current = opener;
  const initialOrder = useRef(order);
  const focusedActivation = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!visible || !active || focusedActivation.current === order) return;
    const element = slot.current;
    if (!element) return;
    focusedActivation.current = order;
    const focused = document.activeElement;
    if (element.contains(focused)) return;
    // A late access result must not take focus from a different task the player started.
    if (
      focused instanceof HTMLElement &&
      focused !== document.body &&
      focused !== latestOpener.current &&
      canFocus(focused)
    )
      return;
    element
      .querySelector<HTMLElement>('.ol-inventory-search input, .ol-panel-tools button')
      ?.focus({ preventScroll: true });
  }, [host, visible, active, order, narrow]);
  useLayoutEffect(() => {
    const element = slot.current;
    if (!element) return;
    return () => {
      if (document.activeElement !== document.body && !element.contains(document.activeElement))
        return;
      // Let a quantity/detail overlay finish its teardown first. Deliberate focus elsewhere
      // wins; the controller can reveal the parent bag before its exact opener is restored.
      requestAnimationFrame(() => {
        if (document.activeElement !== document.body) return;
        const fallback = [
          latestOpener.current,
          document.querySelector<HTMLElement>('#inventoryPanel .ol-inventory-search input'),
          document.getElementById('gameMenuButton'),
          document.getElementById('world'),
        ].find(canFocus);
        fallback?.focus({ preventScroll: true });
      });
    };
  }, [host]);
  if (!host) return null;
  return createPortal(
    <div
      ref={slot}
      className="ol-bag-window-slot"
      data-bag-window={id}
      data-active={active || undefined}
      hidden={!visible}
      style={
        {
          '--bag-window-offset': `${(initialOrder.current % 5) * 24}px`,
          zIndex: order + 1,
        } as CSSProperties
      }
      onPointerDownCapture={onActivate}
      onFocusCapture={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          onActivate();
      }}
      onKeyDown={(event) => {
        if (
          event.key !== 'Escape' ||
          event.defaultPrevented ||
          event.nativeEvent.isComposing ||
          modalOwnsInput() ||
          document.querySelector('[role="listbox"], [role="menu"]')
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) onClose();
      }}
    >
      <Panel
        id={`bag-window-${id}`}
        title={title}
        onClose={onClose}
        draggable={!narrow}
        avoidOverlap
        placementBounds={host}
        hidden={!visible}
        tabs={
          <div className="ol-bag-window-tools">
            <Button
              size="sm"
              variant="quiet"
              onPress={(event) => onShowBelongings(event.target as HTMLElement)}
            >
              Your belongings
            </Button>
            {windowSwitcher}
          </div>
        }
      >
        {children}
      </Panel>
    </div>,
    host,
  );
}
