import { useId, useRef, type DragEvent } from 'react';
import type { InventoryItemView } from '@open-legend/protocol';
import { Button, Icon, symbol } from '../design-system/components';
import type { InventoryCollectionState } from './use-inventory-collection';

export type InventorySide = 'belongings' | 'container';

/** A visual grid of ordinary buttons keeps Tab/Enter inspection separate from transfer.
 * It deliberately does not claim composite ARIA-grid arrow-key semantics. */
export function InventoryCollection({
  side,
  title,
  state,
  selectedId,
  busy,
  canMove,
  dropActive,
  onNavigate,
  onSelect,
  onQuickMove,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  side: InventorySide;
  title: string;
  state: InventoryCollectionState;
  selectedId?: string;
  busy: boolean;
  canMove: boolean;
  dropActive: boolean;
  onNavigate(id: string): void;
  onSelect(item: InventoryItemView, anchor: HTMLButtonElement, actions: boolean): void;
  onQuickMove(item: InventoryItemView): void;
  onDragStart(item: InventoryItemView, event: DragEvent<HTMLButtonElement>): void;
  onDragEnd(): void;
  onDrop(event: DragEvent<HTMLElement>): void;
}) {
  const searchId = useId();
  const search = useRef<HTMLInputElement>(null);
  const { page, loading, error } = state;
  return (
    <section
      className="ol-inventory-collection"
      data-side={side}
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
        <h3 className="ol-heading">{page?.container.name ?? title}</h3>
        {page?.container.location && <p className="ol-caption">{page.container.location}</p>}
        {!!page?.breadcrumbs.length && (
          <nav aria-label={`${title} path`} className="ol-inventory-breadcrumbs">
            {page.breadcrumbs.map((entry) => (
              <Button
                key={entry.id}
                size="sm"
                variant="quiet"
                disabled={busy || entry.id === state.location.id}
                onPress={() => onNavigate(entry.id)}
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
          <label htmlFor={searchId}>Search {page?.container.name ?? title}</label>
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
      </header>
      <div className="ol-inventory-grid-scroll">
        {!state.available && <p role="status">Reconnect to read these belongings.</p>}
        {loading && <p role="status">Reading contents…</p>}
        {error && <p role="alert">{error}</p>}
        <ul className="ol-inventory-grid" aria-label={`${title} items`}>
          {page?.items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="ol-inventory-cell"
                data-item-id={item.id}
                data-selected={selectedId === item.id || undefined}
                aria-label={`${item.name}, ${item.quantity}${item.equipped ? ', equipped' : ''}${item.container ? ', container' : ''}`}
                aria-haspopup="dialog"
                draggable={canMove && !busy && item.availableQuantity !== undefined}
                onClick={(event) => {
                  if (busy) return;
                  if (event.shiftKey && canMove) onQuickMove(item);
                  else onSelect(item, event.currentTarget, false);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!busy) onSelect(item, event.currentTarget, true);
                }}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing) return;
                  if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
                    event.preventDefault();
                    if (!busy) onSelect(item, event.currentTarget, true);
                  } else if (event.key === 'Enter' && event.shiftKey && canMove) {
                    event.preventDefault();
                    if (!busy) onQuickMove(item);
                  }
                }}
                onDragStart={(event) => onDragStart(item, event)}
                onDragEnd={onDragEnd}
              >
                <Icon name={symbol(item.definitionId)} fallbackLabel={item.name} size={32} />
                <span className="ol-inventory-cell-name">{item.name}</span>
                <span className="ol-inventory-cell-quantity">× {item.quantity}</span>
                {item.equipped && <span className="ol-inventory-cell-state">Equipped</span>}
                {item.container && <span className="ol-inventory-cell-state">Container</span>}
              </button>
            </li>
          ))}
        </ul>
        {page && !page.items.length && (
          <p role="status">
            {page.next
              ? 'No match in this part of the search. More contents remain to search.'
              : state.query
                ? 'No matching items. Clear the search to see other contents.'
                : 'This container is empty.'}
          </p>
        )}
      </div>
      <footer className="ol-inventory-collection-footer">
        {page?.next && (
          <Button size="sm" variant="quiet" disabled={busy || loading} onPress={state.next}>
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
