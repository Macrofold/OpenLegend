import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Dialog, Popover } from 'react-aria-components';
import type {
  ActionOption,
  ContainerPage,
  GameView,
  InventoryItemView,
  InventoryTransferSource,
} from '@open-legend/protocol';
import { post } from '../api';
import type { CommandDispatcher } from '../command-request';
import { Button, Icon, Tag, symbol } from '../design-system/components';
import { InventoryCollection, type InventorySide } from './inventory-collection';
import { InventoryHistory, MergeTargets } from './inventory-details';
import { InventoryQuantity, exactQuantity } from './inventory-controls';
import { InventoryOffer } from './inventory-offer';
import { useInventoryCollection } from './use-inventory-collection';
import { useInventoryCommand } from './use-inventory-command';
import './inventory.css';

type InventoryProps = {
  view: GameView;
  addItem(): void;
  command: CommandDispatcher;
  connected: boolean;
  visible: boolean;
  openContainer?: { requestId: string; containerId: string | null; name: string } | null;
  onTalkAbout?(context: { itemId: string; name: string; recipientId?: string }): void;
};
type Selection = { side: InventorySide; itemId: string; actions: boolean };
type AmountDraft = {
  operation: 'move' | 'split' | 'drop' | 'offer';
  item: InventoryItemView;
  source: ContainerPage['container'];
  target?: ContainerPage['container'];
  action?: ActionOption;
  value: string;
};
type DragIntention = {
  token: string;
  side: InventorySide;
  action: ActionOption;
  targetId: string;
  targetRevision: number;
};
const dragFormat = 'application/x-open-legend-possession';

function sameItem(left: InventoryItemView, right: InventoryItemView) {
  return (
    left.id === right.id &&
    left.revision === right.revision &&
    left.placementRevision === right.placementRevision &&
    left.container?.revision === right.container?.revision
  );
}
function arrange(
  type: 'transfer-item' | 'merge-item',
  item: InventoryItemView,
  targetId: string,
  targetRevision: number,
  quantity: number,
  label: string,
): ActionOption {
  return {
    id: `${type}-${item.id}-${targetId}`,
    label,
    enabled: true,
    command: {
      type,
      itemId: item.id,
      targetId,
      quantity,
      expectedRevision: item.revision,
      placementRevision: item.placementRevision,
      expectedContentsRevision: item.container?.revision,
      targetRevision,
    },
  };
}
function transferSource(
  item: InventoryItemView,
  container: ContainerPage['container'],
  quantity: number,
): InventoryTransferSource {
  return {
    itemId: item.id,
    revision: item.revision,
    placementRevision: item.placementRevision,
    contentsRevision: item.container?.revision,
    containerId: container.id,
    containerRevision: container.revision,
    quantity,
  };
}

/** Character authority remounts private reads. Unresolved command identities have a separate,
 * stable authorized-session lifetime so a reconnect cannot silently repeat a move. */
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
  openContainer,
  onTalkAbout,
  scope,
}: InventoryProps & { scope: string }) {
  const workspace = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLButtonElement>(null);
  const [selection, setSelection] = useState<Selection>();
  const [amountDraft, setAmountDraft] = useState<AmountDraft>();
  const [quantityError, setQuantityError] = useState('');
  const [rightName, setRightName] = useState(openContainer?.name ?? 'Container');
  const [requestSeen, setRequestSeen] = useState(
    openContainer === null ? null : openContainer?.requestId,
  );
  const [drag, setDrag] = useState<DragIntention>();
  const dragRef = useRef<DragIntention | undefined>(undefined);
  const ignoreClick = useRef(false);
  const [ownerBusy, setOwnerBusy] = useState(false);
  const ownerGuard = useRef(false);
  const [holder, setHolder] = useState(view.player.id);
  const [disclosure, setDisclosure] = useState<'custodian' | 'public'>('custodian');
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  // These are permitted native changes, not world-clock ticks. Exterior storage loses its
  // revision hint on lost reach/access; that invalidates any previously readable contents.
  const revisionKey = JSON.stringify([
    view.player.inventoryRevision,
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
    view.player.inventory.map((item) => [
      item.id,
      item.equipped,
      item.container?.revision,
      item.characteristics,
      item.comparison,
    ]),
    view.entities.filter((entity) => entity.storage).map((entity) => [entity.id, entity.storage]),
    view.recipes.map((recipe) => recipe.id),
  ]);
  const left = useInventoryCollection({
    initialId: view.player.id,
    scope,
    revisionKey,
    visible,
    connected,
  });
  const right = useInventoryCollection({
    initialId: openContainer?.containerId ?? '',
    scope,
    revisionKey,
    visible,
    connected,
  });
  const requestId = openContainer === null ? null : openContainer?.requestId;
  if (requestId !== requestSeen) {
    setRequestSeen(requestId);
    if (openContainer !== undefined) {
      right.navigate(openContainer?.containerId ?? '');
      setRightName(openContainer?.name ?? 'Container');
      setSelection(undefined);
      setAmountDraft(undefined);
      setDrag(undefined);
      dragRef.current = undefined;
    }
  }
  const operations = useInventoryCommand({
    worldId: view.worldId,
    actorId: view.player.id,
    timeline: view.saveTimeline,
    scope: view.access?.scope ?? '',
    epoch: view.commandEpoch,
    connected,
    command,
    onResolved() {
      left.refresh();
      right.refresh();
    },
  });
  const busy = !!operations.pending || ownerBusy;
  const canAct = visible && connected && view.player.canUseInventory && !busy;
  const collection = (side: InventorySide) => (side === 'belongings' ? left : right);
  const opposite = (side: InventorySide) => (side === 'belongings' ? right : left);
  const selectedCollection = selection && collection(selection.side);
  const item = selectedCollection?.page?.items.find((entry) => entry.id === selection?.itemId);
  const target = selection && opposite(selection.side).page?.container;
  const selectedContainer = selectedCollection?.page?.container;
  const amount =
    amountDraft && exactQuantity(amountDraft.value, amountDraft.item.availableQuantity);
  const draftStale =
    !!amountDraft &&
    (!item ||
      !selectedContainer ||
      !sameItem(amountDraft.item, item) ||
      amountDraft.source.id !== selectedContainer.id ||
      amountDraft.source.revision !== selectedContainer.revision ||
      (amountDraft.operation === 'move' &&
        (!target ||
          target.id !== amountDraft.target?.id ||
          target.revision !== amountDraft.target?.revision)));

  function focusCollection(side: InventorySide) {
    window.requestAnimationFrame(() =>
      workspace.current?.querySelector<HTMLElement>(`[data-side="${side}"]`)?.focus(),
    );
  }
  function closeDetail(restoreFocus = true) {
    setSelection(undefined);
    setAmountDraft(undefined);
    setQuantityError('');
    if (restoreFocus) {
      if (anchor.current?.isConnected) anchor.current.focus();
      else if (selection) focusCollection(selection.side);
    }
  }
  function stopDrag() {
    dragRef.current = undefined;
    setDrag(undefined);
    // HTML drag completion may synthesize a click. It must not inspect or move again.
    window.setTimeout(() => {
      ignoreClick.current = false;
    }, 0);
  }
  useEffect(() => {
    const cancel = () => stopDrag();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel();
    };
    window.addEventListener('blur', cancel);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('blur', cancel);
      window.removeEventListener('keydown', escape);
    };
  }, []);
  useEffect(() => {
    if (!visible || !connected) {
      stopDrag();
      closeDetail(false);
    }
  }, [visible, connected]);

  function navigate(side: InventorySide, id: string) {
    if (busy) return;
    closeDetail(false);
    stopDrag();
    collection(side).navigate(id);
    focusCollection(side);
  }
  function choose(
    side: InventorySide,
    selected: InventoryItemView,
    button: HTMLButtonElement,
    actions: boolean,
  ) {
    if (ignoreClick.current || busy) return;
    anchor.current = button;
    setSelection({ side, itemId: selected.id, actions });
    setAmountDraft(undefined);
    setQuantityError('');
  }
  function moveIntention(
    side: InventorySide,
    sourceItem: InventoryItemView,
  ): ActionOption | undefined {
    const source = collection(side).page;
    const destination = opposite(side).page?.container;
    if (
      !canAct ||
      !source ||
      !destination ||
      source.container.id === destination.id ||
      destination.id === sourceItem.id
    )
      return;
    const current = source.items.find((entry) => entry.id === sourceItem.id);
    if (!current || !sameItem(current, sourceItem)) return;
    if (current.availableQuantity === undefined || current.availableQuantity < current.quantity) {
      operations.setMessage(
        'The full stack is not available. Inspect it and choose an available amount.',
      );
      return;
    }
    return arrange(
      'transfer-item',
      current,
      destination.id,
      destination.revision,
      current.quantity,
      `Move ${current.name} to ${destination.name}`,
    );
  }
  function send(action: ActionOption, side: InventorySide) {
    if (!canAct || !action.enabled) return;
    closeDetail(false);
    stopDrag();
    focusCollection(side);
    void operations.dispatch(action);
  }
  function quickMove(side: InventorySide, sourceItem: InventoryItemView) {
    if (ignoreClick.current) return;
    const action = moveIntention(side, sourceItem);
    if (action) send(action, side);
  }
  function beginDrag(
    side: InventorySide,
    sourceItem: InventoryItemView,
    event: DragEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation();
    const action = moveIntention(side, sourceItem);
    const destination = opposite(side).page?.container;
    if (!action || !destination) {
      event.preventDefault();
      return;
    }
    closeDetail(false);
    ignoreClick.current = true;
    const intention = {
      token: crypto.randomUUID(),
      side,
      action,
      targetId: destination.id,
      targetRevision: destination.revision,
    };
    dragRef.current = intention;
    setDrag(intention);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(dragFormat, intention.token);
  }
  function drop(side: InventorySide, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    const intention = dragRef.current;
    const destination = collection(side).page?.container;
    if (
      intention &&
      intention.side !== side &&
      event.dataTransfer.getData(dragFormat) === intention.token &&
      destination?.id === intention.targetId &&
      destination.revision === intention.targetRevision
    )
      send(intention.action, intention.side);
    stopDrag();
  }
  function chooseAmount(operation: AmountDraft['operation'], action?: ActionOption) {
    if (!item || !selectedContainer || !selection) return;
    setQuantityError('');
    setAmountDraft({
      operation,
      item,
      source: selectedContainer,
      target: operation === 'move' ? target : undefined,
      action,
      value: operation === 'split' ? '1' : String(item.availableQuantity ?? ''),
    });
  }
  function submitAmount() {
    if (!selection || !amountDraft || draftStale) return;
    if (
      amount === undefined ||
      (amountDraft.operation === 'split' && amount >= amountDraft.item.quantity)
    ) {
      setQuantityError(
        amountDraft.operation === 'split'
          ? 'Choose a whole amount that leaves some units in this stack.'
          : 'Choose an available whole amount.',
      );
      return;
    }
    if (amountDraft.operation === 'move' && amountDraft.target) {
      send(
        arrange(
          'transfer-item',
          amountDraft.item,
          amountDraft.target.id,
          amountDraft.target.revision,
          amount,
          `Move ${amount} ${amountDraft.item.name} to ${amountDraft.target.name}`,
        ),
        selection.side,
      );
    } else if (amountDraft.action)
      send(
        { ...amountDraft.action, command: { ...amountDraft.action.command, quantity: amount } },
        selection.side,
      );
  }
  async function ownerWrite(path: string, body: object) {
    if (!canAct || ownerGuard.current) return;
    ownerGuard.current = true;
    setOwnerBusy(true);
    try {
      const receipt = await post(path, body);
      if (alive.current) {
        operations.setMessage(receipt.message);
        left.refresh();
        right.refresh();
      }
    } catch (error: unknown) {
      if (alive.current)
        operations.setMessage(
          `${error instanceof Error ? error.message : 'No result received.'} Refresh and inspect the declaration before repeating this edit.`,
        );
    } finally {
      ownerGuard.current = false;
      if (alive.current) setOwnerBusy(false);
    }
  }

  return (
    <div
      ref={workspace}
      className="ol-inventory-workspace"
      onDragOver={(event) => event.stopPropagation()}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        stopDrag();
      }}
    >
      <header className="ol-inventory-header">
        <div className="ol-inventory-toolbar">
          <h2 className="ol-heading">Belongings</h2>
          {view.godMode && (
            <Button size="sm" variant="quiet" disabled={busy || !connected} onPress={addItem}>
              God mode · Add item
            </Button>
          )}
        </div>
        <p className="ol-caption">
          Select an item to inspect it. With two containers open, drag between them or Shift-click
          to move a full stack. Keyboard: Tab to an item, Enter to inspect, Shift+Enter to move.
        </p>
        {view.player.inventory.some((entry) => entry.equipped) && (
          <section className="ol-inventory-equipment" aria-label="Equipped items">
            <strong>Equipped</strong>
            {view.player.inventory
              .filter((entry) => entry.equipped)
              .map((entry) => (
                <div key={entry.id}>
                  <Icon name={symbol(entry.definitionId)} fallbackLabel={entry.name} />
                  <span>{entry.name}</span>
                  {entry.actions
                    .filter((action) => action.command.type === 'unequip')
                    .map((action) => (
                      <Button
                        key={action.id}
                        size="sm"
                        variant="quiet"
                        disabled={!canAct || !action.enabled}
                        onPress={() => send(action, 'belongings')}
                      >
                        Unequip
                      </Button>
                    ))}
                </div>
              ))}
          </section>
        )}
      </header>
      <div className="ol-inventory-panes" data-paired={!!right.location.id || undefined}>
        {(['belongings', 'container'] as const).map((side) => {
          const state = collection(side);
          if (side === 'container' && !state.location.id)
            return (
              <section
                key={side}
                className="ol-inventory-empty-target"
                aria-label="Open a container"
              >
                <Icon name="chest" fallbackLabel="Container" size={32} />
                <h3 className="ol-heading">Open a container in the world</h3>
                <p>
                  Open a chest or other storage to see its contents beside your belongings. You can
                  also open one of your bags beside them.
                </p>
              </section>
            );
          const other = opposite(side);
          return (
            <div key={side} className="ol-inventory-side">
              <InventoryCollection
                side={side}
                title={side === 'belongings' ? 'My belongings' : rightName}
                state={state}
                selectedId={selection?.side === side ? selection.itemId : undefined}
                busy={busy}
                canMove={
                  canAct && !!state.page && !!other.page && state.location.id !== other.location.id
                }
                dropActive={
                  !!drag &&
                  drag.side !== side &&
                  drag.targetId === state.page?.container.id &&
                  drag.targetRevision === state.page.container.revision &&
                  canAct
                }
                onNavigate={(id) => navigate(side, id)}
                onSelect={(selected, button, actions) => choose(side, selected, button, actions)}
                onQuickMove={(selected) => quickMove(side, selected)}
                onDragStart={(selected, event) => beginDrag(side, selected, event)}
                onDragEnd={stopDrag}
                onDrop={(event) => drop(side, event)}
              />
              {side === 'container' && (
                <Button
                  size="sm"
                  variant="quiet"
                  disabled={busy}
                  onPress={() => navigate('container', '')}
                >
                  Close container
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <Popover
        triggerRef={anchor}
        isOpen={!!selection && visible && connected}
        onOpenChange={(open) => {
          if (!open) closeDetail();
        }}
        isNonModal
        className="ol-root ol-inventory-popover"
        placement="right top"
        shouldFlip
      >
        <Dialog
          className="ol-inventory-detail"
          aria-label={item ? `${item.name} actions and details` : 'Item details'}
        >
          <div className="ol-inventory-toolbar">
            <h3 className="ol-heading">{item?.name ?? 'Item details'}</h3>
            <Button size="sm" variant="quiet" onPress={() => closeDetail()}>
              Close
            </Button>
          </div>
          {!item && (
            <p role="status">
              {selectedCollection?.loading
                ? 'Refreshing this item…'
                : 'This item is no longer in these visible contents. Close this panel and select an available item.'}
            </p>
          )}
          {item && selectedContainer && selection && (
            <>
              <p className="ol-caption">
                {selectedContainer.name} · {item.quantity} units {item.equipped && '· Equipped'}
              </p>
              {amountDraft ? (
                <>
                  <h4>
                    {amountDraft.operation === 'move'
                      ? `Move to ${amountDraft.target?.name ?? 'container'}`
                      : amountDraft.operation === 'offer'
                        ? 'Offer to a person'
                        : amountDraft.operation === 'split'
                          ? 'Split this stack'
                          : 'Drop items'}
                  </h4>
                  <InventoryQuantity
                    value={amountDraft.value}
                    onChange={(value) => {
                      setAmountDraft({ ...amountDraft, value });
                      setQuantityError('');
                    }}
                    maximum={amountDraft.item.availableQuantity}
                    disabled={busy}
                    error={quantityError}
                  />
                  {draftStale && (
                    <p role="status">
                      These contents changed. Return to the item to choose a fresh amount and
                      destination.
                    </p>
                  )}
                  {amountDraft.operation === 'offer' && amount !== undefined && (
                    <InventoryOffer
                      source={transferSource(amountDraft.item, amountDraft.source, amount)}
                      scope={view.access?.scope ?? ''}
                      active={canAct && !draftStale}
                      onOffer={(recipient) =>
                        send(
                          {
                            id: `offer-${amountDraft.item.id}-${recipient.id}`,
                            label: `Offer ${amount} ${amountDraft.item.name} to ${recipient.name}`,
                            enabled: true,
                            command: {
                              type: 'handover',
                              handoverOperation: 'offer',
                              targetId: recipient.id,
                              itemId: amountDraft.item.id,
                              quantity: amount,
                              expectedRevision: amountDraft.item.revision,
                              placementRevision: amountDraft.item.placementRevision,
                              expectedContentsRevision: amountDraft.item.container?.revision,
                              targetRevision: recipient.revision,
                            },
                          },
                          selection.side,
                        )
                      }
                    />
                  )}
                  <div className="ol-actions">
                    {amountDraft.operation !== 'offer' && (
                      <Button disabled={!canAct || draftStale} onPress={submitAmount}>
                        {amountDraft.operation === 'move'
                          ? 'Move amount'
                          : amountDraft.operation === 'split'
                            ? 'Split stack'
                            : 'Drop amount'}
                      </Button>
                    )}
                    <Button
                      variant="quiet"
                      onPress={() => {
                        setAmountDraft(undefined);
                        setQuantityError('');
                      }}
                    >
                      Back to item
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="ol-inventory-item-actions">
                    {target && target.id !== selectedContainer.id && target.id !== item.id && (
                      <>
                        <Button
                          disabled={
                            !canAct ||
                            item.availableQuantity === undefined ||
                            item.availableQuantity < item.quantity
                          }
                          onPress={() => quickMove(selection.side, item)}
                        >
                          Move to {target.name}
                        </Button>
                        {!item.individual && item.quantity > 1 && (
                          <Button
                            variant="quiet"
                            disabled={!canAct}
                            onPress={() => chooseAmount('move')}
                          >
                            Move an amount…
                          </Button>
                        )}
                      </>
                    )}
                    {item.container && (
                      <>
                        <Button
                          variant="quiet"
                          disabled={busy}
                          onPress={() => navigate(selection.side, item.id)}
                        >
                          Open {item.name}
                        </Button>
                        {selection.side === 'belongings' && !right.location.id && (
                          <Button
                            variant="quiet"
                            disabled={busy}
                            onPress={() => {
                              setRightName(item.name);
                              navigate('container', item.id);
                            }}
                          >
                            Open beside belongings
                          </Button>
                        )}
                      </>
                    )}
                    <Button
                      variant="quiet"
                      disabled={
                        !canAct ||
                        item.availableQuantity === undefined ||
                        item.availableQuantity < 1
                      }
                      onPress={() => chooseAmount('offer')}
                    >
                      Offer to a person…
                    </Button>
                    {onTalkAbout && (
                      <Button
                        variant="quiet"
                        onPress={() => {
                          onTalkAbout({ itemId: item.id, name: item.name });
                          closeDetail();
                        }}
                      >
                        Talk about {item.name}
                      </Button>
                    )}
                    {item.actions.map((action) => (
                      <div key={action.id}>
                        <Button
                          variant="quiet"
                          disabled={!canAct || !action.enabled}
                          onPress={() =>
                            action.command.type === 'split-item'
                              ? chooseAmount('split', action)
                              : action.command.type === 'drop' && item.quantity > 1
                                ? chooseAmount('drop', action)
                                : send(action, selection.side)
                          }
                        >
                          {action.command.type === 'split-item'
                            ? 'Split stack…'
                            : action.command.type === 'drop' && item.quantity > 1
                              ? 'Drop an amount…'
                              : action.label}
                        </Button>
                        {!action.enabled && action.reason && (
                          <p className="ol-caption">{action.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <details open={!selection.actions}>
                    <summary>Known details and comparison</summary>
                    <p>{item.description}</p>
                    <div className="ol-tags">
                      {item.tags.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                      {item.individual && <Tag>Individual object</Tag>}
                    </div>
                    <p className="ol-caption">
                      Available: {item.availableQuantity ?? 'Unknown'} · Packing load:{' '}
                      {item.packingLoad ?? 'Unknown'}
                      {item.container ? ' including its contents' : ' per unit'}
                    </p>
                    {item.declaredOwner && <p>Declared owner: {item.declaredOwner.name}</p>}
                    <dl className="ol-inventory-facts">
                      {item.characteristics?.map((fact) => (
                        <div key={fact.id}>
                          <dt>{fact.label}</dt>
                          <dd>
                            {fact.value ?? 'Unknown'} {fact.unit}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    {item.comparison && (
                      <table className="ol-inventory-comparison">
                        <caption>Compared with equipped {item.comparison.name}</caption>
                        <thead>
                          <tr>
                            <th>Characteristic</th>
                            <th>{item.name}</th>
                            <th>{item.comparison.name}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.characteristics?.flatMap((fact) => {
                            const other = item.comparison?.characteristics.find(
                              (entry) => entry.id === fact.id && entry.unit === fact.unit,
                            );
                            return other
                              ? [
                                  <tr key={fact.id}>
                                    <th>
                                      {fact.label} {fact.unit}
                                    </th>
                                    <td>{fact.value ?? 'Unknown'}</td>
                                    <td>{other.value ?? 'Unknown'}</td>
                                  </tr>,
                                ]
                              : [];
                          })}
                        </tbody>
                      </table>
                    )}
                  </details>
                  {!item.individual && !item.container && !item.equipped && (
                    <details>
                      <summary>Merge matching stacks</summary>
                      <MergeTargets
                        item={item}
                        containerId={selectedContainer.id}
                        pageKey={selectedCollection?.key ?? ''}
                        canAct={canAct && item.availableQuantity === item.quantity}
                        visible={visible && connected}
                        onMerge={(match) =>
                          send(
                            arrange(
                              'merge-item',
                              item,
                              match.id,
                              match.revision,
                              item.quantity,
                              'Merge stacks',
                            ),
                            selection.side,
                          )
                        }
                      />
                    </details>
                  )}
                  {view.godMode && (
                    <details>
                      <summary>God mode · Declare ownership</summary>
                      <p>
                        A declaration records an owner; it does not move the object or grant access.
                      </p>
                      <label>
                        Holder{' '}
                        <select value={holder} onChange={(event) => setHolder(event.target.value)}>
                          <option value="">No declared owner</option>
                          <option value={view.player.id}>{view.player.name}</option>
                          {view.entities
                            .filter((entry) => entry.kind === 'actor')
                            .map((entry) => (
                              <option key={entry.id} value={entry.id}>
                                {entry.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        Disclosure{' '}
                        <select
                          value={disclosure}
                          onChange={(event) => {
                            if (
                              event.target.value === 'custodian' ||
                              event.target.value === 'public'
                            )
                              setDisclosure(event.target.value);
                          }}
                        >
                          <option value="custodian">Current custodian</option>
                          <option value="public">Public declaration</option>
                        </select>
                      </label>
                      <Button
                        disabled={!canAct}
                        onPress={() =>
                          void ownerWrite('/api/god/ownership', {
                            id: crypto.randomUUID(),
                            itemId: item.id,
                            expectedRevision: item.declaredOwner?.revision ?? 0,
                            holderId: holder || null,
                            disclosure,
                          })
                        }
                      >
                        Save declaration
                      </Button>
                    </details>
                  )}
                </>
              )}
            </>
          )}
        </Dialog>
      </Popover>
      <footer className="ol-inventory-feedback">
        {operations.pending && (
          <section className="ol-inventory-pending" aria-label="Unresolved inventory action">
            <p role="status">
              {operations.pending.status === 'sending'
                ? `Sending ${operations.pending.request?.label ?? 'inventory action'}…`
                : operations.pending.status === 'checking'
                  ? 'Checking the recorded result…'
                  : `The result of ${operations.pending.request?.label ?? 'an earlier inventory action'} is unknown. Further inventory actions are paused to avoid repeating it.`}
            </p>
            {operations.pending.status === 'unknown' && (
              <Button
                disabled={!connected || !operations.pending.request}
                onPress={() => void operations.check()}
              >
                Check result
              </Button>
            )}
            <p className="ol-caption">
              Checking reads the existing result. It never sends the action again.
            </p>
          </section>
        )}
        {operations.message && <p role="status">{operations.message}</p>}
        {!view.player.canUseInventory && (
          <p className="ol-caption">
            {view.clock.paused
              ? 'Resume the world to act.'
              : 'Current character control and the ability to handle possessions are required.'}
          </p>
        )}
        {view.godMode &&
          [left, right].map((state) => {
            const container = state.page?.container;
            return container?.capacity !== undefined ? (
              <Button
                key={container.id}
                size="sm"
                variant="quiet"
                disabled={!canAct}
                onPress={() =>
                  void ownerWrite('/api/god/container-access', {
                    id: crypto.randomUUID(),
                    itemId: container.id,
                    expectedRevision: container.revision,
                    actors: container.restricted ? null : [view.player.id],
                  })
                }
              >
                God mode · {container.restricted ? 'Share' : 'Restrict'} {container.name}
              </Button>
            ) : null;
          })}
        <InventoryHistory
          scope={scope}
          revision={view.player.inventoryRevision}
          visible={visible && connected}
          readRevision={`${left.key}:${right.key}`}
        />
      </footer>
    </div>
  );
}
