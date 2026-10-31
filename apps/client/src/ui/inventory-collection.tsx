import { JadeGlass } from '../design-system/jade-glass';
import { LoadingDialog, LoadingIndicator } from '../design-system/loading';
import { useId, useRef, type DragEvent, type ReactNode } from 'react';
import { DialogTrigger, Popover } from 'react-aria-components';
import {
  DEFAULT_INVENTORY_FILTER,
  INVENTORY_FILTERS,
  INVENTORY_SORTS,
  type InventoryFilter,
  type InventoryItemView,
  type InventorySort,
} from '@open-legend/protocol';
import { Button, Icon, TextTooltip } from '../design-system/components';
import { ItemIllustration } from '../design-system/item-illustration';
import type { InventoryCollectionState } from './use-inventory-collection';

export type InventorySide = 'belongings' | 'container' | `bag-${string}`;
const sortLabels: Record<InventorySort, string> = {
  native: 'Default order',
  'name-asc': 'Name A–Z',
  'name-desc': 'Name Z–A',
  'quantity-desc': 'Quantity high–low',
};
const filterLabels: Record<InventoryFilter, string> = {
  all: 'All items',
  equipped: 'Equipped',
  containers: 'Containers',
};
const filterIcons: Record<InventoryFilter, string> = {
  all: 'ui.all',
  equipped: 'ui.check',
  containers: 'ui.inventory',
};

/** These are the same native collection tools in a compact, labelled opener. */
function InventoryTool({
  label,
  icon,
  children,
  variant,
}: {
  label: string;
  icon: string;
  children: ReactNode;
  variant: 'quiet' | 'secondary';
}) {
  return (
    <DialogTrigger>
      <TextTooltip text={label}>
        <Button variant={variant} className="ol-inventory-tool" aria-label={label}>
          <Icon name={icon} size={18} />
        </Button>
      </TextTooltip>
      <Popover className="ol-root ol-disclosure-popover" placement="bottom end" offset={8}>
        <JadeGlass identity="inventory-collection::disclosure-popover:1" />
        <LoadingDialog aria-label={label} className="ol-portal-content ol-disclosure-content">
          {children}
        </LoadingDialog>
      </Popover>
    </DialogTrigger>
  );
}

/** A visual grid of ordinary buttons keeps Tab/Enter inspection separate from transfer.
 * It deliberately does not claim composite ARIA-grid arrow-key semantics. */
export function InventoryCollection({
  side,
  title,
  heading,
  state,
  selectedId,
  onSelectedAnchor,
  busy,
  canMove,
  dropActive,
  onNavigate,
  onSelect,
  onContextMenu,
  onQuickMove,
  onDragStart,
  onDragEnd,
  onDrop,
  selectionRole = 'inspect',
  compact = false,
  tools,
}: {
  selectionRole?: 'inspect' | 'choose';
  compact?: boolean;
  tools?: ReactNode;
  side: InventorySide;
  title: string;
  heading?: string;
  state: InventoryCollectionState;
  selectedId?: string;
  onSelectedAnchor(button: HTMLButtonElement | null): void;
  busy: boolean;
  canMove: boolean;
  dropActive: boolean;
  onNavigate(id: string, opener?: HTMLElement): void;
  onSelect(item: InventoryItemView, anchor: HTMLButtonElement, actions: boolean): void;
  onContextMenu(
    item: InventoryItemView,
    anchor: HTMLButtonElement,
    point: { x: number; y: number },
  ): void;
  onQuickMove(item: InventoryItemView): void;
  onDragStart(item: InventoryItemView, event: DragEvent<HTMLButtonElement>): void;
  onDragEnd(): void;
  onDrop(event: DragEvent<HTMLElement>): void;
}) {
  const searchId = useId();
  const search = useRef<HTMLInputElement>(null);
  const { page, loading, error } = state;
  const collectionTitle =
    side === 'belongings' && (page?.breadcrumbs.length ?? 1) === 1
      ? title
      : (page?.container.name ?? title);
  const sorting = (
    <InventoryTool
      label={`Sort ${collectionTitle}`}
      icon="ui.sort"
      variant={compact ? 'quiet' : 'secondary'}
    >
      <label htmlFor={`${searchId}-sort`}>Sort {collectionTitle}</label>
      <select
        id={`${searchId}-sort`}
        value={state.sort}
        disabled={busy}
        onChange={(event) => state.sortBy(event.target.value as InventorySort)}
      >
        {INVENTORY_SORTS.map((value) => (
          <option key={value} value={value}>
            {sortLabels[value]}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        variant="quiet"
        icon="ui.refresh"
        disabled={!state.available || loading}
        onPress={state.refresh}
      >
        Refresh
      </Button>
      {tools}
    </InventoryTool>
  );
  return (
    <section
      className="ol-inventory-collection"
      data-side={side}
      data-compact={compact || undefined}
      data-drop-active={dropActive || undefined}
      aria-label={title}
      aria-busy={loading}
      tabIndex={-1}
      onDragOver={(event) => {
        if (dropActive) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }
        event.stopPropagation();
      }}
      onDrop={onDrop}
    >
      <header className="ol-inventory-collection-header">
        <div className="ol-inventory-collection-title">
          <h3 className="ol-heading">
            {side === 'belongings' && (page?.breadcrumbs.length ?? 1) === 1
              ? (heading ?? collectionTitle)
              : collectionTitle}
          </h3>
          {!compact && sorting}
        </div>
        {page?.container.location && !(side === 'belongings' && page.breadcrumbs.length === 1) && (
          <p className="ol-caption">{page.container.location}</p>
        )}
        {page && page.breadcrumbs.length > 1 && (
          <nav aria-label={`${title} path`} className="ol-inventory-breadcrumbs">
            {page.breadcrumbs.map((entry) => (
              <Button
                key={entry.id}
                size="sm"
                variant="quiet"
                disabled={busy || entry.id === state.location.id}
                onPress={(event) =>
                  onNavigate(
                    entry.id,
                    event.target instanceof HTMLElement ? event.target : undefined,
                  )
                }
              >
                {entry.name}
              </Button>
            ))}
          </nav>
        )}
        {page?.container.capacity !== undefined && (
          <p className="ol-caption">
            Packing load: {page.container.load ?? 'Unknown'} / {page.container.capacity}
          </p>
        )}
        <div className="ol-inventory-search">
          <label className="ol-sr" htmlFor={searchId}>
            Search {collectionTitle}
          </label>
          <div>
            <Icon name="ui.search" size={16} />
            <input
              ref={search}
              id={searchId}
              type="text"
              placeholder={side === 'belongings' ? 'Search inventory' : `Search ${collectionTitle}`}
              maxLength={160}
              value={state.query}
              onChange={(event) => state.search(event.target.value)}
            />
            {state.query && (
              <Button
                size="sm"
                variant="quiet"
                className="ol-inventory-search-clear"
                aria-label={`Clear search in ${collectionTitle}`}
                onPress={() => {
                  state.search('');
                  search.current?.focus();
                }}
              >
                <Icon name="ui.close" size={16} />
              </Button>
            )}
          </div>
        </div>
        <div className="ol-inventory-view-controls">
          {INVENTORY_FILTERS.map((value) => (
            <TextTooltip key={value} text={`${filterLabels[value]} in ${collectionTitle}`}>
              <Button
                variant="quiet"
                className="ol-inventory-tool"
                aria-label={`${filterLabels[value]} in ${collectionTitle}`}
                aria-pressed={state.filter === value}
                disabled={busy}
                onPress={() => state.filterBy(value)}
              >
                <Icon name={filterIcons[value]} size={18} />
              </Button>
            </TextTooltip>
          ))}
          {compact && sorting}
        </div>
      </header>
      <div className="ol-inventory-grid-scroll">
        {!state.available && !page && (
          <p role="status">{state.blockedReason ?? 'Reconnect to read these belongings.'}</p>
        )}
        {state.notice && <p role="status">{state.notice}</p>}
        <LoadingIndicator
          active={loading}
          label="Reading inventory contents"
          className="ol-inventory-refreshing"
        />
        {error && <p role="alert">{error}</p>}
        <ul className="ol-inventory-grid" aria-label={`${title} items`}>
          {page?.items.map((item) => {
            const reserved =
              item.availableQuantity !== undefined && item.availableQuantity !== item.quantity;
            const identity = `${item.name}, ${item.quantity}${item.equipped ? ', equipped' : ''}${item.container ? ', container' : ''}${item.individual && !item.equipped && !item.container ? ', individual object' : ''}${reserved ? `; ${item.availableQuantity} available, reserved remainder stays` : ''}`;
            return (
              <li key={item.id}>
                <TextTooltip text={identity}>
                  <button
                    type="button"
                    ref={selectedId === item.id ? onSelectedAnchor : undefined}
                    className="ol-inventory-cell"
                    data-item-id={item.id}
                    data-selected={selectedId === item.id || undefined}
                    aria-label={identity}
                    aria-haspopup={selectionRole === 'inspect' ? 'dialog' : undefined}
                    draggable={
                      canMove &&
                      !busy &&
                      item.availableQuantity !== undefined &&
                      item.availableQuantity > 0
                    }
                    onClick={(event) => {
                      if (busy) return;
                      if (event.shiftKey && canMove) onQuickMove(item);
                      else onSelect(item, event.currentTarget, false);
                    }}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (!busy)
                        onContextMenu(item, event.currentTarget, {
                          x: event.clientX,
                          y: event.clientY,
                        });
                    }}
                    onKeyDown={(event) => {
                      if (event.defaultPrevented || event.nativeEvent.isComposing || event.repeat)
                        return;
                      if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!busy) {
                          const bounds = event.currentTarget.getBoundingClientRect();
                          onContextMenu(item, event.currentTarget, {
                            x: bounds.left,
                            y: bounds.bottom,
                          });
                        }
                      } else if (event.key === 'Enter' && event.shiftKey && canMove) {
                        event.preventDefault();
                        if (!busy) onQuickMove(item);
                      }
                    }}
                    onDragStart={(event) => onDragStart(item, event)}
                    onDragEnd={onDragEnd}
                  >
                    <ItemIllustration
                      art={item.art}
                      icon={item.icon}
                      label={item.name}
                      size={40}
                      fallbackSize={24}
                      nativeSize
                    />
                    {item.quantity > 1 && (
                      <span className="ol-inventory-cell-quantity">{item.quantity}</span>
                    )}
                    {(item.equipped || item.container || reserved) && (
                      <span className="ol-inventory-cell-marks" aria-hidden="true">
                        {item.equipped && <Icon name="ui.check" size={12} />}
                        {item.container && <Icon name="category.containers" size={12} />}
                        {reserved && <Icon name="ui.lock" size={12} />}
                      </span>
                    )}
                  </button>
                </TextTooltip>
              </li>
            );
          })}
          {/* Empty cells are presentation, not storage capacity or item records. */}
          {Array.from(
            {
              length: Math.max(
                0,
                (compact ? 36 : side === 'belongings' ? 56 : 18) - (page?.items.length ?? 0),
              ),
            },
            (_, index) => (
              <li key={`empty-${index}`} className="ol-inventory-cell-empty" aria-hidden="true" />
            ),
          )}
        </ul>
        {page && !page.items.length && (
          <p role="status">
            {page.next
              ? 'No match in this part of the search. More contents remain to search.'
              : state.query || state.filter !== DEFAULT_INVENTORY_FILTER
                ? 'No matching items. Change the search or filter to see other contents.'
                : 'This container is empty.'}
          </p>
        )}
      </div>
      <footer className="ol-inventory-collection-footer">
        {page?.next && (
          <Button size="sm" variant="quiet" disabled={busy || !state.current} onPress={state.next}>
            Next contents
          </Button>
        )}
        {state.location.cursor && (
          <Button size="sm" variant="quiet" disabled={busy || loading} onPress={state.first}>
            First contents
          </Button>
        )}
      </footer>
    </section>
  );
}
