import { useEffect, useState } from 'react';
import type {
  ActionOption,
  ContainerPage,
  ObjectHistoryPage,
  GameView,
  InventoryItemView,
} from '@open-legend/protocol';
import { post } from '../api';
import { Button, EmptyState, EntityRow, Section, Tag, symbol } from '../design-system/components';
import { Actions } from './panels';

function InventoryHistory({ scope, revision }: { scope: string; revision: number }) {
  const [open, setOpen] = useState(false),
    [cursor, setCursor] = useState<string>();
  const [result, setResult] = useState<{ key: string; page?: ObjectHistoryPage; error?: string }>();
  const key = JSON.stringify([scope, revision, cursor]);
  useEffect(() => {
    if (!open) return;
    let active = true;
    void post<ObjectHistoryPage>('/api/inventory/history', { cursor })
      .then((page) => {
        if (active)
          setResult({
            key,
            ...(page.ok ? { page } : { error: page.message ?? 'History unavailable.' }),
          });
      })
      .catch((error) => {
        if (active) setResult({ key, error: String(error) });
      });
    return () => {
      active = false;
    };
  }, [open, key, cursor]);
  const current = result?.key === key ? result : undefined;
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Object history</summary>
      <p className="ol-caption">
        Recorded splits, merges and consumption while in your character’s custody.
      </p>
      {!current && open && <p role="status">Loading history…</p>}
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
      {cursor && <Button onPress={() => setCursor(undefined)}>First history page</Button>}
      {current?.page?.next && (
        <Button onPress={() => setCursor(current.page!.next)}>More history</Button>
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
  onMerge,
}: {
  item: InventoryItemView;
  containerId: string;
  pageKey: string;
  canAct: boolean;
  onMerge(target: InventoryItemView): void;
}) {
  const [cursor, setCursor] = useState<string>();
  const [targetId, setTargetId] = useState('');
  const [result, setResult] = useState<{ key: string; page?: ContainerPage; error?: string }>();
  const key = JSON.stringify([pageKey, containerId, item.id, item.revision, cursor]);
  useEffect(() => {
    let active = true;
    void post<ContainerPage>('/api/inventory', { containerId, mergeSourceId: item.id, cursor })
      .then((page) => {
        if (active)
          setResult({
            key,
            ...(page.ok ? { page } : { error: page.message ?? 'Matching lots are unavailable.' }),
          });
      })
      .catch((error) => {
        if (active) setResult({ key, error: String(error) });
      });
    return () => {
      active = false;
    };
  }, [key]);
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

export function Inventory({
  view,
  addItem,
  command,
  connected,
}: {
  view: GameView;
  addItem(): void;
  command(action: ActionOption): void;
  connected: boolean;
}) {
  const [location, setLocation] = useState<{ id: string; cursor?: string }>({ id: view.player.id });
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{ key: string; page?: ContainerPage; error?: string }>();
  const [moving, setMoving] = useState<{
    item: InventoryItemView;
    quantity: number;
    rootRevision: number;
    sourceContainerId: string;
  }>();
  const [message, setMessage] = useState('');
  const [holder, setHolder] = useState(view.player.id);
  const [disclosure, setDisclosure] = useState<'custodian' | 'public'>('custodian');
  const [saving, setSaving] = useState(false);
  const key = JSON.stringify([
    view.access?.scope,
    view.saveTimeline,
    view.player.inventoryRevision,
    view.player.canUseInventory,
    // Pages include action availability as well as custody. Quiet need progression
    // does not reload a page; pause, occupation, capability and support changes do.
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
    location,
    query,
    refresh,
  ]);
  const page = result?.key === key ? result.page : undefined;
  const error = result?.key === key ? result.error : undefined;
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(
      () => {
        void post<ContainerPage>('/api/inventory', {
          containerId: location.id,
          cursor: location.cursor,
          query,
        })
          .then((response) => {
            if (!cancelled)
              setResult(
                response.ok
                  ? { key, page: response }
                  : { key, error: response.message ?? 'Inventory unavailable.' },
              );
          })
          .catch((cause: unknown) => {
            if (!cancelled)
              setResult({
                key,
                error: cause instanceof Error ? cause.message : 'Inventory unavailable.',
              });
          });
      },
      query ? 150 : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, location.id, location.cursor, query]);
  const item = page?.items.find((entry) => entry.id === selected);
  const validQuantity =
    !!item && Number.isSafeInteger(quantity) && quantity > 0 && quantity <= item.quantity;
  const canAct = connected && view.player.canUseInventory;
  const navigate = (id: string) => {
    setLocation({ id });
    setSelected(null);
    setQuery('');
  };
  const dispatch = (action: ActionOption) => {
    command(action);
    setSelected(null);
    setMoving(undefined);
    // A command changes this container's revision, which invalidates a later-page cursor.
    setLocation((current) => ({ id: current.id }));
  };
  const arrange = (
    type: 'transfer-item' | 'merge-item',
    source: InventoryItemView,
    targetId: string,
    targetRevision: number,
    amount: number,
  ): ActionOption => ({
    id: `${type}-${source.id}-${targetId}`,
    label: type === 'merge-item' ? 'Merge lots' : 'Move here',
    enabled: canAct,
    command: {
      type,
      itemId: source.id,
      targetId,
      quantity: amount,
      expectedRevision: source.revision,
      placementRevision: source.placementRevision,
      targetRevision,
    },
  });
  async function saveOwnership(selectedItem: InventoryItemView) {
    setSaving(true);
    setMessage('');
    try {
      const response = await post('/api/god/ownership', {
        id: crypto.randomUUID(),
        itemId: selectedItem.id,
        expectedRevision: selectedItem.declaredOwner?.revision ?? 0,
        holderId: holder || null,
        disclosure,
      });
      setMessage(
        response.message ?? (response.ok ? 'Ownership updated.' : 'Ownership was not changed.'),
      );
      if (response.ok) setRefresh((value) => value + 1);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Ownership unavailable.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      {view.godMode && (
        <Button size="sm" variant="quiet" icon="ui.plus" onPress={addItem} disabled={!connected}>
          God mode · Add item
        </Button>
      )}
      <InventoryHistory
        scope={view.access?.scope ?? view.saveTimeline ?? ''}
        revision={view.player.inventoryRevision}
      />
      <div className="ol-actions" aria-label="Nearby containers and recipients">
        <Button size="sm" onPress={() => navigate(view.player.id)}>
          My possessions
        </Button>
        {page?.destinations?.map((target) =>
          target.depositOnly ? (
            moving && (
              <Button
                key={target.id}
                size="sm"
                disabled={!canAct}
                onPress={() =>
                  dispatch(
                    arrange(
                      'transfer-item',
                      moving.item,
                      target.id,
                      target.revision,
                      moving.quantity,
                    ),
                  )
                }
              >
                Give to {target.name}
              </Button>
            )
          ) : (
            <Button key={target.id} size="sm" onPress={() => navigate(target.id)}>
              Open {target.name}
            </Button>
          ),
        )}
      </div>
      <nav aria-label="Container path" className="ol-actions">
        {(page?.breadcrumbs ?? [{ id: view.player.id, name: 'Possessions' }]).map((entry) => (
          <Button key={entry.id} size="sm" variant="quiet" onPress={() => navigate(entry.id)}>
            {entry.id === view.player.id ? 'Possessions' : entry.name}
          </Button>
        ))}
      </nav>
      {view.godMode && page?.container.capacity !== undefined && (
        <Button
          size="sm"
          disabled={saving || !connected}
          onPress={() => {
            setSaving(true);
            void post('/api/god/container-access', {
              id: crypto.randomUUID(),
              itemId: page.container.id,
              expectedRevision: page.container.revision,
              actors: page.container.restricted ? null : [view.player.id],
            })
              .then((response) => {
                setMessage(response.message ?? 'Access updated.');
                setRefresh((value) => value + 1);
              })
              .catch((cause) => setMessage(String(cause)))
              .finally(() => setSaving(false));
          }}
        >
          {page.container.restricted ? 'Make shared' : 'Restrict to my character'}
        </Button>
      )}
      {page?.container.capacity !== undefined && (
        <p>
          Packing load: {page.container.load} / {page.container.capacity}
        </p>
      )}
      {moving && (
        <Section title={`Move ${moving.quantity} ${moving.item.name}`}>
          <p>Open a bag or choose a parent, then move the selected units here.</p>
          {moving.rootRevision !== view.player.inventoryRevision ? (
            <p role="status">Possessions changed. Select the item again.</p>
          ) : (
            page && (
              <Button
                size="sm"
                onPress={() =>
                  dispatch(
                    arrange(
                      'transfer-item',
                      moving.item,
                      page.container.id,
                      page.container.revision,
                      moving.quantity,
                    ),
                  )
                }
                disabled={
                  !canAct ||
                  page.container.id === moving.item.id ||
                  page.container.id === moving.sourceContainerId
                }
              >
                Move to {page.container.name}
              </Button>
            )
          )}
          <Button size="sm" variant="quiet" onPress={() => setMoving(undefined)}>
            Cancel move
          </Button>
        </Section>
      )}
      <input
        type="search"
        aria-label="Search this container"
        placeholder="Search this container…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setLocation({ id: location.id });
          setSelected(null);
        }}
      />
      <Button
        size="sm"
        variant="quiet"
        onPress={() => {
          setLocation({ id: location.id });
          setRefresh((value) => value + 1);
        }}
        disabled={!connected}
      >
        Refresh
      </Button>
      {error && <p role="alert">{error}</p>}
      {!page && !error && <p role="status">Loading possessions…</p>}
      {message && <p role="status">{message}</p>}
      {item ? (
        <>
          <Button size="sm" variant="quiet" icon="ui.back" onPress={() => setSelected(null)}>
            Back to contents
          </Button>
          <h3 className="ol-heading">
            {item.name} × {item.quantity}
          </h3>
          <p>{item.description}</p>
          <div className="ol-traits">
            {item.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
            {item.individual && <Tag>Individual object</Tag>}
          </div>
          {item.declaredOwner && <p>Declared owner: {item.declaredOwner.name}</p>}
          {item.container && (
            <Button size="sm" onPress={() => navigate(item.id)}>
              Open bag · {item.container.load} / {item.container.capacity}
            </Button>
          )}
          <label>
            Quantity{' '}
            <input
              type="number"
              min={1}
              max={item.quantity}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
            />
          </label>
          <Actions
            connected={connected}
            command={dispatch}
            actions={item.actions.map((action) =>
              ['drop', 'split-item'].includes(action.command.type)
                ? {
                    ...action,
                    enabled:
                      action.enabled &&
                      validQuantity &&
                      (action.command.type !== 'split-item' || quantity < item.quantity),
                    command: { ...action.command, quantity },
                    reason: !validQuantity
                      ? 'Choose an available whole quantity.'
                      : action.command.type === 'split-item' && quantity >= item.quantity
                        ? 'Leave some units in the original lot.'
                        : action.reason,
                  }
                : action,
            )}
          />
          <Button
            size="sm"
            variant="quiet"
            disabled={!canAct || !validQuantity}
            onPress={() => {
              setMoving({
                item,
                quantity,
                rootRevision: view.player.inventoryRevision,
                sourceContainerId: page!.container.id,
              });
              setSelected(null);
            }}
          >
            Move to a container
          </Button>
          {!item.individual && !item.container && !item.equipped && (
            <MergeTargets
              key={item.id}
              item={item}
              containerId={page!.container.id}
              pageKey={key}
              canAct={canAct}
              onMerge={(target) =>
                dispatch(arrange('merge-item', item, target.id, target.revision, item.quantity))
              }
            />
          )}
          {view.godMode && (
            <details>
              <summary>God mode · Declare ownership</summary>
              <p>This records a declared owner. It does not move the object or grant access.</p>
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
                  onChange={(event) => setDisclosure(event.target.value as typeof disclosure)}
                >
                  <option value="custodian">Current custodian</option>
                  <option value="public">Public declaration</option>
                </select>
              </label>
              <Button
                size="sm"
                disabled={!connected || saving}
                onPress={() => void saveOwnership(item)}
              >
                Save declaration
              </Button>
            </details>
          )}
        </>
      ) : (
        page && (
          <>
            {page.items.map((entry) => (
              <EntityRow
                key={entry.id}
                name={entry.name}
                meta={entry.equipped ? 'Equipped' : entry.container ? 'Bag' : entry.category}
                count={entry.quantity}
                icon={symbol(entry.definitionId)}
                onPress={() => {
                  setSelected(entry.id);
                  setQuantity(entry.quantity);
                  setMessage('');
                }}
              />
            ))}
            {!page.items.length && (
              <EmptyState title={page.next ? 'No match on this page.' : 'No possessions found.'}>
                {page.next
                  ? 'Continue to search more contents.'
                  : 'Open another container or gather some materials.'}
              </EmptyState>
            )}
            {page.next && (
              <Button
                size="sm"
                variant="quiet"
                onPress={() => {
                  setLocation({ id: location.id, cursor: page.next });
                  setSelected(null);
                }}
              >
                Next contents
              </Button>
            )}
            {location.cursor && (
              <Button size="sm" variant="quiet" onPress={() => setLocation({ id: location.id })}>
                First contents
              </Button>
            )}
          </>
        )
      )}
    </>
  );
}
