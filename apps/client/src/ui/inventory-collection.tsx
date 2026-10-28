import { LoadingIndicator } from '../design-system/loading';
import { useId, useRef, type DragEvent } from 'react';
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

/** A visual grid of ordinary buttons keeps Tab/Enter inspection separate from transfer.
 * It deliberately does not claim composite ARIA-grid arrow-key semantics. */
export function InventoryCollection({
  side,
  title,
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
}: {
  selectionRole?: 'inspect' | 'choose';
  compact?: boolean;
  side: InventorySide;
  title: string;
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
        <h3 className="ol-heading">{collectionTitle}</h3>
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
          <label htmlFor={searchId}>Search {collectionTitle}</label>
          <div>
            <input
              ref={search}
              id={searchId}
              type="text"
              maxLength={160}
              value={state.query}
              onChange={(event) => state.search(event.target.value)}
            />
            {state.query && (
              <Button
                size="sm"
                variant="quiet"
                onPress={() => {
                  state.search('');
                  search.current?.focus();
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
        <div className="ol-inventory-view-controls">
          <label htmlFor={`${searchId}-sort`}>
            Sort
            <select
              id={`${searchId}-sort`}
              aria-label={`Sort ${collectionTitle}`}
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
          </label>
          <label htmlFor={`${searchId}-filter`}>
            Show
            <select
              id={`${searchId}-filter`}
              aria-label={`Filter ${collectionTitle}`}
              value={state.filter}
              disabled={busy}
              onChange={(event) => state.filterBy(event.target.value as InventoryFilter)}
            >
              {INVENTORY_FILTERS.map((value) => (
                <option key={value} value={value}>
                  {filterLabels[value]}
                </option>
              ))}
            </select>
          </label>
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
                    <ItemIllustration art={item.art} icon={item.icon} label={item.name} size={32} />
                    <span className="ol-inventory-cell-quantity">{item.quantity}</span>
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
        <Button
          size="sm"
          variant="quiet"
          disabled={!state.available || loading}
          onPress={state.refresh}
        >
          Refresh
        </Button>
      </footer>
    </section>
  );
}
