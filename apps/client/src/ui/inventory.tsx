import { useEffect, useRef, useState } from 'react';
import type {
  ActionOption,
  ContainerPage,
  ObjectHistoryPage,
  GameView,
  InventoryItemView,
  ApiResult,
  InventoryDestination,
  InventoryTransferSource,
} from '@open-legend/protocol';
import { post } from '../api';
import { Button, EmptyState, EntityRow, Section, Tag, symbol } from '../design-system/components';
import { Actions } from './panels';
import { InventoryQuantity, exactQuantity } from './inventory-controls';
import { InventoryDestinations } from './inventory-destinations';
import './inventory.css';

function InventoryHistory({
  scope,
  revision,
  visible,
  readRevision,
}: {
  scope: string;
  revision: number;
  visible: boolean;
  readRevision: number;
}) {
  const [open, setOpen] = useState(false),
    [cursor, setCursor] = useState<string>();
  const [result, setResult] = useState<{ key: string; page?: ObjectHistoryPage; error?: string }>();
  const key = JSON.stringify([scope, revision, cursor, readRevision]);
  useEffect(() => {
    if (!open || !visible) return;
    const controller = new AbortController();
    void post<ObjectHistoryPage>('/api/inventory/history', { cursor }, controller.signal)
      .then((page) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            ...(page.ok ? { page } : { error: page.message ?? 'History unavailable.' }),
          });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ key, error: String(error) });
      });
    return () => {
      controller.abort();
    };
  }, [open, key, visible]);
  const current = result;
  const loading = result?.key !== key;
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Object history</summary>
      <p className="ol-caption">
        Recorded splits, merges and consumption while in your character’s custody.
      </p>
      {loading && open && <p role="status">Loading history…</p>}
      {current?.error && <p role="alert">{current.error}</p>}
      {current?.page?.entries.map((entry) => (
        <p key={entry.id}>
          {entry.name} · {entry.quantity}{' '}
          {entry.type === 'consume'
            ? 'consumed'
            : entry.type === 'merge'
              ? 'merged into another lot'
              : 'split into a new lot'}
        </p>
      ))}
      {current?.page && !current.page.entries.length && <p>No object history on this page.</p>}
      {cursor && (
        <Button disabled={loading || !visible} onPress={() => setCursor(undefined)}>
          First history page
        </Button>
      )}
      {current?.page?.next && (
        <Button disabled={loading || !visible} onPress={() => setCursor(current.page!.next)}>
          More history
        </Button>
      )}
    </details>
  );
}

/** Matching lots anywhere in this container, found by the server with the merge admission
 * rules rather than only among the displayed page (docs/limits/objects.md#qu05). */
function MergeTargets({
  item,
  containerId,
  pageKey,
  canAct,
  visible,
  onMerge,
}: {
  item: InventoryItemView;
  containerId: string;
  pageKey: string;
  canAct: boolean;
  visible: boolean;
  onMerge(target: InventoryItemView): void;
}) {
  const [cursor, setCursor] = useState<string>();
  const [targetId, setTargetId] = useState('');
  const [result, setResult] = useState<{ key: string; page?: ContainerPage; error?: string }>();
  const key = JSON.stringify([pageKey, containerId, item.id, item.revision, cursor]);
  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    void post<ContainerPage>(
      '/api/inventory',
      { containerId, mergeSourceId: item.id, cursor },
      controller.signal,
    )
      .then((page) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            ...(page.ok ? { page } : { error: page.message ?? 'Matching lots are unavailable.' }),
          });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ key, error: String(error) });
      });
    return () => {
      controller.abort();
    };
  }, [key, visible]);
  // While another page loads, keep the previous controls so keyboard focus stays in place;
  // merging waits for the current result.
  const loading = result?.key !== key;
  const current = result;
  if (!current) return <p role="status">Finding matching lots…</p>;
  if (current.error && !loading) return <p role="alert">{current.error}</p>;
  const targets = current.page?.items ?? [];
  const target = targets.find((other) => other.id === targetId) ?? targets[0];
  if (!target && !current.page?.next && !cursor && !loading) return null;
  return (
    <div className="ol-actions" aria-busy={loading}>
      {target ? (
        <>
          <label>
            Merge into{' '}
            <select value={target.id} onChange={(event) => setTargetId(event.target.value)}>
              {targets.map((other, index) => (
                <option key={other.id} value={other.id}>
                  {other.name} × {other.quantity} · matching lot {index + 1}
                </option>
              ))}
            </select>
          </label>
          <Button
            size="sm"
            variant="quiet"
            disabled={!canAct || loading}
            onPress={() => onMerge(target)}
          >
            Merge lots
          </Button>
        </>
      ) : (
        <p className="ol-caption">No matching lot in this part of the container.</p>
      )}
      <span className="ol-caption" role="status">
        {loading ? 'Finding matching lots…' : ''}
      </span>
      {current.page?.next && (
        <Button size="sm" variant="quiet" onPress={() => setCursor(current.page!.next)}>
          Search more lots
        </Button>
      )}
      {cursor && (
        <Button size="sm" variant="quiet" onPress={() => setCursor(undefined)}>
          First matching lots
        </Button>
      )}
    </div>
  );
}

type InventoryProps = {
  view: GameView;
  addItem(): void;
  command(action: ActionOption): Promise<ApiResult>;
  connected: boolean;
  visible: boolean;
};

type SelectedPossession = {
  item: InventoryItemView;
  container: ContainerPage['container'];
  quantity: string;
  query: string;
};
type TransferDraft = {
  source: InventoryTransferSource;
  item: InventoryItemView;
  sourceName: string;
  destination?: InventoryDestination;
  quantity: string;
  rootRevision: number;
};

/** A changed authority/timeline remounts private local work before it can render in another
 * character's inventory. Layout changes never change this identity. */
export function Inventory(props: InventoryProps) {
  const scope = JSON.stringify([
    props.view.worldId,
    props.view.player.id,
    props.view.access?.scope,
    props.view.saveTimeline,
  ]);
  return <InventoryWorkspace key={scope} {...props} scope={scope} />;
}

function InventoryWorkspace({
  view,
  addItem,
  command,
  connected,
  visible,
  scope,
}: InventoryProps & { scope: string }) {
  const [location, setLocation] = useState<{ id: string; cursor?: string }>({ id: view.player.id });
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<SelectedPossession>();
  const [refresh, setRefresh] = useState(0);
  const [readVisibility, setReadVisibility] = useState({ visible, revision: 0 });
  // Adjust before rendering children: a reopened workspace cannot reuse a former
  // visible receipt as fresh, while selected objects, draft text and DOM anchors remain.
  if (readVisibility.visible !== visible)
    setReadVisibility({ visible, revision: readVisibility.revision + 1 });
  const [result, setResult] = useState<{
    key: string;
    base: string;
    page?: ContainerPage;
    error?: string;
  }>();
  const [transfer, setTransfer] = useState<TransferDraft>();
  const [picker, setPicker] = useState<'browse' | 'move'>();
  const [message, setMessage] = useState('');
  const [quantityError, setQuantityError] = useState('');
  const [holder, setHolder] = useState(view.player.id);
  const [disclosure, setDisclosure] = useState<'custodian' | 'public'>('custodian');
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false),
    alive = useRef(true);
  const collection = useRef<HTMLDivElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const detail = useRef<HTMLElement>(null);
  const pickerOpener = useRef<HTMLButtonElement | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const selectedButton = useRef<HTMLButtonElement | null>(null);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );
  useEffect(() => {
    if (!visible) return;
    const element = workspace.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (
        collection.current?.contains(document.activeElement) &&
        getComputedStyle(collection.current).display === 'none'
      )
        detail.current?.querySelector<HTMLButtonElement>('button')?.focus();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);
  const base = JSON.stringify([
    scope,
    view.player.inventoryRevision,
    view.player.inventory.map((entry) => [
      entry.id,
      entry.equipped,
      entry.characteristics,
      entry.comparison,
    ]),
    view.player.canUseInventory,
    view.clock.paused,
    view.access?.controlling,
    view.player.alive,
    view.player.participation,
    !!view.player.action,
    view.player.statusEffects,
    view.player.position,
    view.player.supportSurfaceId,
    view.map.spatial.revision,
    view.recipes.map((recipe) => recipe.id),
    location.id,
    query,
    refresh,
    readVisibility.revision,
  ]);
  const key = JSON.stringify([base, location.cursor]);
  const current = result?.base === base ? result : undefined;
  const page =
    current?.page ?? (result?.page?.container.id === location.id ? result.page : undefined);
  const loading = current?.key !== key;
  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        void post<ContainerPage>(
          '/api/inventory',
          { containerId: location.id, cursor: location.cursor, query },
          controller.signal,
        )
          .then((response) => {
            if (controller.signal.aborted) return;
            if (response.ok)
              setSelection((selected) => {
                if (!selected || selected.container.id !== response.container.id) return selected;
                const inspected = response.items.find((entry) => entry.id === selected.item.id);
                return inspected
                  ? { ...selected, item: inspected, container: response.container }
                  : selected;
              });
            setResult((previous) => {
              if (!response.ok)
                return { key, base, error: response.message ?? 'Inventory unavailable.' };
              const prior =
                location.cursor && previous?.base === base ? (previous.page?.items ?? []) : [];
              const items = new Map(prior.map((entry) => [entry.id, entry]));
              for (const entry of response.items) items.set(entry.id, entry);
              return { key, base, page: { ...response, items: [...items.values()] } };
            });
          })
          .catch((error: unknown) => {
            if (!controller.signal.aborted)
              setResult({
                key,
                base,
                error: error instanceof Error ? error.message : 'Inventory unavailable.',
              });
          });
      },
      query ? 150 : 0,
    );
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [key, visible]);
  const refreshedItem = selection && page?.items.find((entry) => entry.id === selection.item.id);
  const compactItem =
    selection &&
    view.player.inventory.find(
      (entry) =>
        entry.id === selection.item.id &&
        entry.revision === selection.item.revision &&
        entry.placementRevision === selection.item.placementRevision,
    );
  const item =
    refreshedItem ??
    (selection &&
    page?.container.id === selection.container.id &&
    page.container.revision === selection.container.revision
      ? (compactItem ?? selection.item)
      : undefined);
  // A filter or a continuation-only window cannot certify absence from the container.
  const selectedMissing =
    !!selection &&
    !!current?.page &&
    !loading &&
    !item &&
    !query.trim() &&
    !location.cursor &&
    !page?.next;
  const selectedUncertain = !!selection && !!current?.page && !loading && !item && !selectedMissing;
  const canAct = visible && connected && view.player.canUseInventory && !pending && !loading;
  const amount = exactQuantity(selection?.quantity ?? '', item?.availableQuantity);
  const transferAmount = exactQuantity(transfer?.quantity ?? '', transfer?.item.availableQuantity);
  const transferStale =
    !!transfer &&
    (transfer.rootRevision !== view.player.inventoryRevision ||
      (page?.container.id === transfer.source.containerId &&
        page.container.revision !== transfer.source.containerRevision));
  const navigate = (id: string) => {
    if (pendingRef.current) return;
    setLocation({ id });
    setQuery('');
    setSelection(undefined);
    setTransfer(undefined);
    setPicker(undefined);
    setQuantityError('');
    if (collection.current) collection.current.scrollTop = 0;
  };
  const returnToContents = () => {
    setSelection(undefined);
    setTransfer(undefined);
    setPicker(undefined);
    setQuantityError('');
    requestAnimationFrame(() => {
      if (selectedButton.current?.isConnected) selectedButton.current.focus();
      else collection.current?.focus();
    });
  };
  const dismissPicker = () => {
    setPicker(undefined);
    requestAnimationFrame(() => {
      if (pickerOpener.current?.isConnected) pickerOpener.current.focus();
      else detail.current?.querySelector<HTMLButtonElement>('button')?.focus();
    });
  };
  const dispatch = async (action: ActionOption, success?: string) => {
    if (pendingRef.current || !connected || !action.enabled) return;
    pendingRef.current = true;
    setPending(true);
    setMessage('');
    try {
      const receipt = await command(action);
      if (!alive.current) return;
      setMessage(receipt.ok ? (success ?? receipt.message) : receipt.message);
      if (receipt.ok) {
        setTransfer(undefined);
        setPicker(undefined);
        setLocation((value) => ({ id: value.id }));
        setRefresh((value) => value + 1);
      }
    } catch (error: unknown) {
      if (alive.current)
        setMessage(
          `${error instanceof Error ? error.message : 'The result is unavailable.'} Refresh possessions before repeating this action.`,
        );
    } finally {
      pendingRef.current = false;
      if (alive.current) setPending(false);
    }
  };
  const arrange = (
    type: 'transfer-item' | 'merge-item',
    source: InventoryItemView,
    targetId: string,
    targetRevision: number,
    quantity: number,
  ): ActionOption => ({
    id: `${type}-${source.id}-${targetId}`,
    label: type === 'merge-item' ? 'Merge lots' : 'Move',
    enabled: canAct,
    command: {
      type,
      itemId: source.id,
      targetId,
      quantity,
      expectedRevision: source.revision,
      placementRevision: source.placementRevision,
      expectedContentsRevision: source.container?.revision,
      targetRevision,
    },
  });
  async function saveOwnership(selectedItem: InventoryItemView) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setMessage('');
    try {
      const response = await post('/api/god/ownership', {
        id: crypto.randomUUID(),
        itemId: selectedItem.id,
        expectedRevision: selectedItem.declaredOwner?.revision ?? 0,
        holderId: holder || null,
        disclosure,
      });
      if (!alive.current) return;
      setMessage(
        response.message ?? (response.ok ? 'Ownership updated.' : 'Ownership was not changed.'),
      );
      if (response.ok) setRefresh((value) => value + 1);
    } catch (error: unknown) {
      if (alive.current)
        setMessage(error instanceof Error ? error.message : 'Ownership unavailable.');
    } finally {
      pendingRef.current = false;
      if (alive.current) setPending(false);
    }
  }
  const startMove = () => {
    if (!selection || !item || !page) return;
    if (amount === undefined) {
      setQuantityError('Choose an available whole quantity before moving.');
      return;
    }
    setQuantityError('');
    setTransfer({
      source: {
        itemId: item.id,
        revision: item.revision,
        placementRevision: item.placementRevision,
        contentsRevision: item.container?.revision,
        containerId: page.container.id,
        containerRevision: page.container.revision,
        quantity: amount,
      },
      item,
      sourceName: page.container.name,
      quantity: selection.quantity,
      rootRevision: view.player.inventoryRevision,
    });
    setPicker('move');
  };
  const selectDestination = (destination: InventoryDestination) => {
    if (picker === 'browse') navigate(destination.id);
    else setTransfer((draft) => (draft ? { ...draft, destination } : draft));
    dismissPicker();
  };
  const move = () => {
    if (!transfer || !transfer.destination || transferStale || !canAct) return;
    if (transferAmount === undefined) {
      setQuantityError('Choose an available whole quantity.');
      return;
    }
    const target = transfer.destination;
    const action =
      target.kind === 'recipient'
        ? {
            id: `offer-${transfer.item.id}-${target.id}`,
            label: `Offer to ${target.name}`,
            enabled: canAct,
            command: {
              type: 'handover' as const,
              handoverOperation: 'offer' as const,
              targetId: target.id,
              itemId: transfer.item.id,
              quantity: transferAmount,
              expectedRevision: transfer.source.revision,
              placementRevision: transfer.source.placementRevision,
              expectedContentsRevision: transfer.source.contentsRevision,
              targetRevision: target.revision,
            },
          }
        : arrange('transfer-item', transfer.item, target.id, target.revision, transferAmount);
    void dispatch(
      action,
      target.kind === 'recipient'
        ? `Offered ${transferAmount} ${transfer.item.name} to ${target.name}. They must accept before anything moves.`
        : `Moved ${transferAmount} ${transfer.item.name} from ${transfer.sourceName} to ${target.name}.`,
    );
  };
  return (
    <div
      ref={workspace}
      className="ol-inventory-workspace"
      data-detail={!!selection || undefined}
      onWheel={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <header className="ol-inventory-header">
        <h2 className="ol-heading">
          {page?.container.name ??
            (location.id === view.player.id ? 'My possessions' : 'Container')}
        </h2>
        {page?.container.location && <p className="ol-caption">{page.container.location}</p>}
        <nav aria-label="Container path" className="ol-actions">
          <Button
            size="sm"
            variant="quiet"
            disabled={pending}
            onPress={() => navigate(view.player.id)}
          >
            My possessions
          </Button>
          {page?.breadcrumbs
            .filter((entry) => entry.id !== view.player.id)
            .map((entry) => (
              <Button
                key={entry.id}
                size="sm"
                variant="quiet"
                disabled={pending}
                onPress={() => navigate(entry.id)}
              >
                {entry.name}
              </Button>
            ))}
        </nav>
        {page?.container.capacity !== undefined && (
          <p className="ol-caption">
            Packing load: {page.container.load ?? 'Unknown'} / {page.container.capacity}
            {page.container.load !== undefined
              ? ` · ${page.container.capacity - page.container.load} available`
              : ''}
          </p>
        )}
        <div className="ol-actions">
          <Button
            size="sm"
            variant="quiet"
            disabled={!connected || pending}
            onPress={(event) => {
              pickerOpener.current =
                event.target instanceof HTMLButtonElement ? event.target : null;
              setPicker('browse');
            }}
          >
            Browse nearby storage
          </Button>
          <Button
            size="sm"
            variant="quiet"
            disabled={!connected || pending}
            onPress={() => {
              setLocation({ id: location.id });
              setRefresh((value) => value + 1);
            }}
          >
            Refresh contents
          </Button>
          {view.godMode && (
            <Button
              size="sm"
              variant="quiet"
              icon="ui.plus"
              disabled={!connected || pending}
              onPress={addItem}
            >
              God mode · Add item
            </Button>
          )}
        </div>
        <div className="ol-inventory-search">
          <label htmlFor="inventory-contents-search">Search this container</label>
          <div>
            <input
              ref={search}
              id="inventory-contents-search"
              type="text"
              value={query}
              maxLength={160}
              onChange={(event) => {
                setQuery(event.target.value);
                setLocation({ id: location.id });
              }}
            />
            {query && (
              <Button
                size="sm"
                variant="quiet"
                onPress={() => {
                  setQuery('');
                  setLocation({ id: location.id });
                  search.current?.focus();
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
        {picker === 'move' && transfer && (
          <p className="ol-caption">
            Moving {transfer.quantity || '…'} {transfer.item.name} from {transfer.sourceName}
          </p>
        )}
      </header>
      {picker && (
        <InventoryDestinations
          scope={scope}
          visible={visible}
          source={picker === 'move' ? transfer?.source : undefined}
          connected={connected && !pending}
          onSelect={selectDestination}
          onCancel={dismissPicker}
        />
      )}
      <div className="ol-inventory-panes">
        <div
          ref={collection}
          className="ol-inventory-collection"
          role="region"
          tabIndex={-1}
          aria-label="Container contents"
          aria-busy={loading}
        >
          {loading && <p role="status">Loading possessions…</p>}
          {page?.items.map((entry) => (
            <div
              key={entry.id}
              ref={(node) => {
                if (node && selection?.item.id === entry.id)
                  selectedButton.current = node.querySelector('button');
              }}
            >
              <EntityRow
                name={entry.name}
                meta={entry.equipped ? 'Equipped' : entry.container ? 'Container' : entry.category}
                count={entry.quantity}
                icon={symbol(entry.definitionId)}
                selected={selection?.item.id === entry.id}
                onPress={() => {
                  if (loading || pendingRef.current) return;
                  setSelection({
                    item: entry,
                    container: page.container,
                    quantity: String(entry.availableQuantity ?? entry.quantity),
                    query,
                  });
                  setTransfer(undefined);
                  setQuantityError('');
                  setMessage('');
                  requestAnimationFrame(() => {
                    if (
                      collection.current &&
                      getComputedStyle(collection.current).display === 'none'
                    )
                      detail.current?.querySelector<HTMLButtonElement>('button')?.focus();
                  });
                }}
              />
            </div>
          ))}
          {page && !page.items.length && !loading && (
            <EmptyState
              title={
                page.next
                  ? 'No match in this part of the search.'
                  : query
                    ? 'No matching possessions.'
                    : 'This container is empty.'
              }
            >
              {page.next
                ? 'More contents remain to search.'
                : query
                  ? 'Clear the search to see other contents.'
                  : 'Open another container or gather materials.'}
            </EmptyState>
          )}
          {page?.next && (
            <Button
              size="sm"
              variant="quiet"
              disabled={loading}
              onPress={() => setLocation({ id: location.id, cursor: page.next })}
            >
              Load more contents
            </Button>
          )}
          {location.cursor && (
            <Button
              size="sm"
              variant="quiet"
              disabled={loading}
              onPress={() => setLocation({ id: location.id })}
            >
              First contents
            </Button>
          )}
        </div>
        <section ref={detail} className="ol-inventory-detail" aria-label="Selected possession">
          {selection ? (
            <>
              <Button
                size="sm"
                variant="quiet"
                icon="ui.back"
                disabled={pending}
                onPress={returnToContents}
              >
                Back to contents
              </Button>
              <h3 className="ol-heading">
                {item?.name ?? selection.item.name}
                {item ? ` × ${item.quantity}` : ''}
              </h3>
              {!item && (
                <p className="ol-caption">Last inspected quantity: {selection.item.quantity}.</p>
              )}
              {selectedMissing ? (
                <p role="status">
                  This selected item is no longer in the current contents. It may have moved or been
                  used. Your list position is retained; choose an item again.
                </p>
              ) : selectedUncertain ? (
                <>
                  <p role="status">
                    This search page does not establish whether the selected item is still in this
                    container. Your quantity draft is retained.
                  </p>
                  <Button
                    size="sm"
                    variant="quiet"
                    onPress={() => {
                      setQuery(selection.query);
                      setLocation({ id: selection.container.id });
                      setRefresh((value) => value + 1);
                      detail.current?.querySelector<HTMLButtonElement>('button')?.focus();
                    }}
                  >
                    Return to this item’s search
                  </Button>
                </>
              ) : !item ? (
                <p role="status">
                  {current?.error
                    ? 'The selected item’s current facts are unavailable. Your draft is retained; refresh or return to contents.'
                    : 'Refreshing this selected item’s facts…'}
                </p>
              ) : (
                <>
                  <p className="ol-prose">{item.description}</p>
                  <div className="ol-traits">
                    {item.tags.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                    {item.individual && <Tag>Individual object</Tag>}
                    {item.equipped && <Tag>Equipped</Tag>}
                  </div>
                  {item.declaredOwner && <p>Declared owner: {item.declaredOwner.name}</p>}
                  <p className="ol-caption">
                    Packing requirement:{' '}
                    {item.packingLoad === undefined
                      ? 'Unknown'
                      : `${item.packingLoad} units${item.container ? ' including contents' : ' per item'}`}
                  </p>
                  {!!item.characteristics?.length && (
                    <dl className="ol-inventory-facts">
                      {item.characteristics.map((fact) => (
                        <div key={fact.id}>
                          <dt>{fact.label}</dt>
                          <dd>
                            {fact.value === null ? 'Unknown' : fact.value}
                            {fact.value !== null && fact.unit ? ` ${fact.unit}` : ''}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {item.comparison && !item.equipped && (
                    <details>
                      <summary>Compare with equipped {item.comparison.name}</summary>
                      <table className="ol-inventory-comparison">
                        <caption>
                          {item.name} compared with equipped {item.comparison.name}
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">Characteristic</th>
                            <th scope="col">{item.name}</th>
                            <th scope="col">{item.comparison.name}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.characteristics?.flatMap((fact) => {
                            const other = item.comparison!.characteristics.find(
                              (value) => value.id === fact.id && value.unit === fact.unit,
                            );
                            return other
                              ? [
                                  <tr key={fact.id}>
                                    <th scope="row">
                                      {fact.label}
                                      {fact.unit ? ` (${fact.unit})` : ''}
                                    </th>
                                    <td>{fact.value ?? 'Unknown'}</td>
                                    <td>{other.value ?? 'Unknown'}</td>
                                  </tr>,
                                ]
                              : [];
                          })}
                        </tbody>
                      </table>
                      <p className="ol-caption">
                        Only known characteristics with matching meanings and units are compared.
                        These are separate tradeoffs, not a total equipment score.
                      </p>
                    </details>
                  )}
                  {item.container && (
                    <Button
                      size="sm"
                      variant="quiet"
                      disabled={pending}
                      onPress={() => navigate(item.id)}
                    >
                      Open container · {item.container.load} / {item.container.capacity}
                    </Button>
                  )}
                  {!transfer && (
                    <>
                      <InventoryQuantity
                        value={selection.quantity}
                        onChange={(quantity) => {
                          setSelection((current) => (current ? { ...current, quantity } : current));
                          setQuantityError('');
                        }}
                        maximum={item.availableQuantity}
                        disabled={pending}
                        error={quantityError}
                      />
                      <div className="ol-inventory-primary">
                        <Button
                          size="sm"
                          disabled={!canAct}
                          onPress={(event) => {
                            pickerOpener.current =
                              event.target instanceof HTMLButtonElement ? event.target : null;
                            startMove();
                          }}
                        >
                          Move or offer
                        </Button>
                      </div>
                      <Actions
                        connected={connected && !pending && !loading}
                        command={(action) => void dispatch(action)}
                        actions={item.actions.map((action) =>
                          ['drop', 'split-item'].includes(action.command.type)
                            ? {
                                ...action,
                                enabled:
                                  action.enabled &&
                                  amount !== undefined &&
                                  (action.command.type !== 'split-item' || amount < item.quantity),
                                command: { ...action.command, quantity: amount },
                                reason:
                                  amount === undefined
                                    ? 'Choose an available whole quantity.'
                                    : action.command.type === 'split-item' &&
                                        amount >= item.quantity
                                      ? 'Leave some units in the original lot.'
                                      : action.reason,
                              }
                            : action,
                        )}
                      />
                      {!item.individual && !item.container && !item.equipped && (
                        <MergeTargets
                          key={item.id}
                          item={item}
                          containerId={page!.container.id}
                          pageKey={key}
                          canAct={canAct}
                          visible={visible}
                          onMerge={(target) =>
                            void dispatch(
                              arrange(
                                'merge-item',
                                item,
                                target.id,
                                target.revision,
                                item.quantity,
                              ),
                            )
                          }
                        />
                      )}
                    </>
                  )}
                  {transfer && (
                    <section className="ol-inventory-transfer" aria-label="Exact transfer draft">
                      <h4 className="ol-heading">
                        {transfer.destination?.kind === 'recipient' ? 'Offer' : 'Move'}{' '}
                        {transfer.item.name}
                      </h4>
                      <p>
                        From {transfer.sourceName} →{' '}
                        {transfer.destination?.name ?? 'Choose a destination'}
                      </p>
                      {transfer.destination?.location && (
                        <p className="ol-caption">{transfer.destination.location}</p>
                      )}
                      <InventoryQuantity
                        value={transfer.quantity}
                        onChange={(quantity) => {
                          setTransfer((draft) =>
                            draft ? { ...draft, quantity, destination: undefined } : draft,
                          );
                          setQuantityError('');
                        }}
                        maximum={transfer.item.availableQuantity}
                        disabled={pending}
                        error={quantityError}
                      />
                      {transferStale && (
                        <p role="status">
                          The source possessions changed. Cancel this move and select the item
                          again.
                        </p>
                      )}
                      {transfer.destination?.reason && (
                        <p className="ol-caption">{transfer.destination.reason}</p>
                      )}
                      <div className="ol-actions">
                        <Button
                          size="sm"
                          variant="quiet"
                          disabled={!connected || pending || transferStale}
                          onPress={(event) => {
                            if (transferAmount === undefined) {
                              setQuantityError('Choose an available whole quantity.');
                              return;
                            }
                            pickerOpener.current =
                              event.target instanceof HTMLButtonElement ? event.target : null;
                            setTransfer((draft) =>
                              draft
                                ? {
                                    ...draft,
                                    source: { ...draft.source, quantity: transferAmount },
                                  }
                                : draft,
                            );
                            setPicker('move');
                          }}
                        >
                          Choose destination
                        </Button>
                        <Button
                          size="sm"
                          disabled={
                            !canAct ||
                            transferStale ||
                            !transfer.destination ||
                            transferAmount === undefined ||
                            transfer.destination.fit === 'blocked'
                          }
                          busy={pending}
                          onPress={move}
                        >
                          {transfer.destination?.kind === 'recipient'
                            ? 'Offer selected quantity'
                            : 'Move selected quantity'}
                        </Button>
                        <Button
                          size="sm"
                          variant="quiet"
                          disabled={pending}
                          onPress={() => {
                            setTransfer(undefined);
                            setPicker(undefined);
                            setQuantityError('');
                          }}
                        >
                          Cancel move
                        </Button>
                      </div>
                      {transfer.destination?.capacity !== undefined && (
                        <p className="ol-caption">
                          Destination packing load: {transfer.destination.load ?? 'Unknown'} /{' '}
                          {transfer.destination.capacity}. The server checks current space on
                          confirmation.
                        </p>
                      )}
                    </section>
                  )}
                  {view.godMode && (
                    <details>
                      <summary>God mode · Declare ownership</summary>
                      <p>
                        This records a declared owner. It does not move the object or grant access.
                      </p>
                      <label>
                        Holder{' '}
                        <select value={holder} onChange={(event) => setHolder(event.target.value)}>
                          <option value="">No declared owner</option>
                          <option value={view.player.id}>{view.player.name}</option>
                          {view.entities
                            .filter((entity) => entity.kind === 'actor')
                            .map((entity) => (
                              <option key={entity.id} value={entity.id}>
                                {entity.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        Disclosure{' '}
                        <select
                          value={disclosure}
                          onChange={(event) =>
                            setDisclosure(event.target.value as typeof disclosure)
                          }
                        >
                          <option value="custodian">Current custodian</option>
                          <option value="public">Public declaration</option>
                        </select>
                      </label>
                      <Button
                        size="sm"
                        disabled={!visible || !connected || pending || loading}
                        onPress={() => void saveOwnership(item)}
                      >
                        Save declaration
                      </Button>
                    </details>
                  )}
                </>
              )}
            </>
          ) : (
            <p className="ol-caption">
              Select an item to inspect its known facts and choose an exact action.
            </p>
          )}
        </section>
      </div>
      <footer className="ol-inventory-feedback">
        {current?.error && <p role="alert">{current.error}</p>}
        {message && <p role="status">{message}</p>}
        {!view.player.canUseInventory && (
          <p className="ol-caption">
            {view.clock.paused
              ? 'Resume the world to act.'
              : 'Current character control and the ability to handle possessions are required.'}
          </p>
        )}
        {view.godMode && page?.container.capacity !== undefined && (
          <Button
            size="sm"
            variant="quiet"
            disabled={!visible || !connected || pending || loading}
            onPress={() => {
              if (pendingRef.current) return;
              pendingRef.current = true;
              setPending(true);
              void post('/api/god/container-access', {
                id: crypto.randomUUID(),
                itemId: page.container.id,
                expectedRevision: page.container.revision,
                actors: page.container.restricted ? null : [view.player.id],
              })
                .then((receipt) => {
                  if (alive.current) {
                    setMessage(receipt.message ?? 'Access updated.');
                    if (receipt.ok) setRefresh((value) => value + 1);
                  }
                })
                .catch((error: unknown) => {
                  if (alive.current)
                    setMessage(
                      error instanceof Error ? error.message : 'Access could not be updated.',
                    );
                })
                .finally(() => {
                  pendingRef.current = false;
                  if (alive.current) setPending(false);
                });
            }}
          >
            {page.container.restricted
              ? 'God mode · Make shared'
              : 'God mode · Restrict to my character'}
          </Button>
        )}
        <InventoryHistory
          scope={scope}
          revision={view.player.inventoryRevision}
          visible={visible}
          readRevision={readVisibility.revision}
        />
      </footer>
    </div>
  );
}
