import { useSimulationClock, GameDeadline, EventTime } from './event-time';
import { useEffect, useId, useRef, useState, type ComponentProps } from 'react';
import { useTradeDraft, type TradeDraft, type TradeDraftLot } from '../trade-drafts';
import type {
  ActionOption,
  ApiResult,
  GameView,
  InventoryItemView,
  ItemTradeView,
  ItemTradeSummary,
  TradeLotView,
  TradeDisclosuresPage,
} from '@open-legend/protocol';
import { Button, IconButton, TextTooltip } from '../design-system/components';
import { Portrait } from '../design-system/portrait';
import { ItemIllustration } from '../design-system/item-illustration';
import { InventoryQuantity, exactQuantity } from './inventory-controls';
import { InventoryCollection } from './inventory-collection';
import { useInventoryCollection } from './use-inventory-collection';
import { ConversationThread } from './conversation';
import type { InventoryCommandRecovery } from './use-inventory-command';
import { postContactRead } from '../api';
import { LoadingIndicator } from '../design-system/loading';
import './inventory.css';
import './item-trade.css';

export type TradeNegotiationTarget = {
  element: HTMLElement;
  person: { id: string; name: string; communicationReference?: string };
};
export const itemTradeTitle = (trade: Pick<ItemTradeSummary, 'labels' | 'personName'>) =>
  `${trade.labels.title} with ${trade.personName}`;
type TradeContext = Pick<
  GameView,
  'worldId' | 'saveTimeline' | 'access' | 'conversation' | 'historyEpoch'
> & {
  player: Pick<
    GameView['player'],
    | 'id'
    | 'inventoryRevision'
    | 'inventoryReadRevision'
    | 'canUseInventory'
    | 'portrait'
    | 'position'
    | 'supportSurfaceId'
  >;
  entities: Array<
    Pick<GameView['entities'][number], 'id' | 'portrait'> &
      Partial<Pick<GameView['entities'][number], 'position' | 'supportSurfaceId'>>
  >;
};
const entry = (lot: TradeLotView, quantity = String(lot.quantity)): TradeDraftLot => ({
  lot,
  quantity,
});
const pins = ({ lot, quantity }: TradeDraftLot) => ({
  itemId: lot.id,
  quantity: exactQuantity(quantity, lot.quantity)!,
  expectedRevision: lot.revision,
  placementRevision: lot.placementRevision,
  expectedContentsRevision: lot.contentsRevision,
});
const fromInventory = (item: InventoryItemView): TradeLotView => ({
  id: item.id,
  icon: item.icon,
  art: item.art,
  name: item.name,
  label: item.name,
  description: item.description,
  quantity: item.group?.representativeAvailableQuantity ?? item.availableQuantity ?? item.quantity,
  revision: item.revision,
  placementRevision: item.placementRevision,
  contentsRevision: item.container?.revision,
  whole: !!item.container || !!item.individual,
});

/** One selected pane owns its details. Same-owner refresh keeps the draft and
 * reading position; only current permitted results enable native submission. */
export function ItemTrade(
  props: Omit<ComponentProps<typeof ItemTradeDetails>, 'trade'> & {
    trade: ItemTradeSummary;
  },
) {
  const { trade, view, connected, visible = true } = props;
  const available = visible && connected;
  const [availability, setAvailability] = useState({ available, revision: 0 });
  if (availability.available !== available)
    setAvailability({ available, revision: availability.revision + 1 });
  const [refresh, setRefresh] = useState(0);
  const privacy = JSON.stringify([trade.scope, view.historyEpoch, view.access?.scope]);
  const target = view.entities.find((entity) => entity.id === trade.personId);
  const key = JSON.stringify([
    privacy,
    trade.revision,
    view.player.inventoryRevision,
    view.player.canUseInventory,
    view.player.position,
    view.player.supportSurfaceId,
    target?.position,
    target?.supportSurfaceId,
    availability.revision,
    refresh,
  ]);
  const [result, setResult] = useState<{
    key: string;
    privacy: string;
    trade?: ItemTradeView;
    error?: string;
  }>();
  const currentKey = useRef<string | null>(null);
  currentKey.current = available ? key : null;
  useEffect(() => {
    if (!available) return;
    const controller = new AbortController();
    void postContactRead<{ ok: boolean; trade?: ItemTradeView; message?: string }>(
      '/api/trade',
      { personId: trade.personId },
      [trade.personId],
      controller.signal,
    )
      .then((reply) => {
        if (controller.signal.aborted || currentKey.current !== key) return;
        setResult({
          key,
          privacy,
          ...(reply.ok && reply.trade
            ? { trade: reply.trade }
            : { error: reply.message ?? 'These offers are unavailable. Refresh to try again.' }),
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || currentKey.current !== key) return;
        setResult((previous) => ({
          key,
          privacy,
          ...(previous?.privacy === privacy ? { trade: previous.trade } : {}),
          error: error instanceof Error ? error.message : 'These offers could not be read.',
        }));
      });
    return () => controller.abort();
  }, [key, available]);
  const displayed = result?.privacy === privacy ? result : undefined;
  const current = available && displayed?.key === key && !!displayed.trade && !displayed.error;
  return (
    <>
      {!displayed?.trade && (props.showHeading !== false || props.onClose) && (
        <div className="ol-inventory-toolbar">
          {props.showHeading !== false && <h3 className="ol-heading">{itemTradeTitle(trade)}</h3>}
          {props.onClose && (
            <Button variant="quiet" onPress={props.onClose}>
              Close
            </Button>
          )}
        </div>
      )}
      <LoadingIndicator active={available && result?.key !== key} label="Reading current offers" />
      {displayed?.error && (
        <p role="status">
          {displayed.error}{' '}
          <Button
            variant="quiet"
            disabled={!available}
            onPress={() => setRefresh((value) => value + 1)}
          >
            Refresh
          </Button>
        </p>
      )}
      {displayed?.trade && (
        <ItemTradeDetails {...props} trade={displayed.trade} connected={!!current} />
      )}
    </>
  );
}

function ItemTradeDetails({
  trade,
  view,
  connected,
  command,
  selected,
  initialQuantity,
  inventoryRequestKeys,
  recovery,
  onNegotiationTarget,
  onClose,
  onChooseRecipient,
  visible = true,
  showHeading = true,
}: {
  trade: ItemTradeView;
  visible?: boolean;
  showHeading?: boolean;
  view: TradeContext;
  connected: boolean;
  command(action: ActionOption): Promise<ApiResult>;
  selected?: TradeLotView;
  initialQuantity?: string;
  inventoryRequestKeys: string[];
  recovery: InventoryCommandRecovery;
  onNegotiationTarget?(target: TradeNegotiationTarget, clear?: boolean): void;
  onClose?(): void;
  onChooseRecipient?(): void;
}) {
  const simTime = useSimulationClock().seconds;
  const fieldId = useId(),
    labels = trade.labels;
  const draftKey = 'open-legend:action-draft:trade:' + trade.scope;
  const {
    draft,
    reviewed,
    uncertain,
    inventoryReceipt,
    inventoryReadBlocked,
    pending,
    setDraft,
    setReviewed,
    setUncertain,
    syncRecovery,
    start,
    isCurrent,
    finish,
  } = useTradeDraft(draftKey, trade.offers, { keys: inventoryRequestKeys, scope: trade.scope });
  const [message, setMessage] = useState('');
  const [chosenOffer, setChosenOffer] = useState<string>();
  const [inventoryChoice, setInventoryChoice] = useState<InventoryItemView>();
  const [editingLot, setEditingLot] = useState<{ side: 'give' | 'receive'; id: string }>();
  const [requestsOpen, setRequestsOpen] = useState(false);
  const alive = useRef(true),
    workspace = useRef<HTMLElement>(null),
    negotiation = useRef<HTMLDivElement>(null);
  const privateOwner = JSON.stringify([
    view.worldId,
    view.player.id,
    view.access?.privateDraftScope,
    view.saveTimeline,
  ]);
  const stock = useInventoryCollection({
    initialId: view.player.id,
    scope: view.access?.scope ?? trade.scope,
    displayOwner: privateOwner,
    disclosureRevision: view.player.inventoryReadRevision.disclosure,
    revisionKey: JSON.stringify([
      view.player.inventoryRevision,
      view.player.inventoryReadRevision.details,
      view.player.canUseInventory,
    ]),
    visible,
    connected,
    expectedRootId: view.player.id,
  });
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!visible || !negotiation.current || !onNegotiationTarget) return;
    const target = {
      element: negotiation.current,
      person: { id: trade.personId, name: trade.personName },
    };
    onNegotiationTarget(target);
    return () => onNegotiationTarget(target, true);
  }, [onNegotiationTarget, trade.scope, trade.personId, trade.personName, visible]);
  useEffect(() => {
    if (
      trade.offers.some((offer) => reviewed[offer.id] === undefined) ||
      Object.keys(reviewed).some((id) => !trade.offers.some((offer) => offer.id === id))
    )
      setReviewed((value) =>
        Object.fromEntries(
          trade.offers.map((offer) => [offer.id, value[offer.id] ?? offer.revision]),
        ),
      );
  }, [trade.offers, reviewed, setReviewed]);
  const prior = draft?.prior && trade.offers.find((offer) => offer.id === draft.prior!.id);
  const stale = !!draft?.prior && (!prior || prior.revision !== draft.prior.revision);
  const offer =
    trade.offers.find((value) => value.id === chosenOffer) ??
    trade.offers.find((value) => value.incoming) ??
    trade.offers[0];
  const changed =
    !!offer && reviewed[offer.id] !== undefined && reviewed[offer.id] !== offer.revision;
  const blocked =
    !connected ||
    pending ||
    !!recovery.pending ||
    !!inventoryReceipt ||
    inventoryReadBlocked ||
    uncertain;
  const validLot = (value: TradeDraftLot) => {
    const amount = exactQuantity(value.quantity, value.lot.quantity);
    return amount !== undefined && (!value.lot.whole || amount === value.lot.quantity);
  };
  const valid =
    !!draft?.give.length &&
    [...draft.give, ...draft.receive].every(validLot) &&
    draft.give.length + draft.receive.length <= trade.maximumLots &&
    (!draft.constructionUse || draft.give.length === 1);
  function draftFrom(value?: ItemTradeView['offers'][number]): TradeDraft {
    return {
      give:
        value?.give.map((lot) => entry(lot)) ??
        (selected ? [entry(selected, initialQuantity)] : []),
      receive: value?.receive.map((lot) => entry(lot)) ?? [],
      ...(value ? { prior: { id: value.id, revision: value.revision } } : {}),
      ...(value?.constructionUse ? { constructionUse: value.constructionUse } : {}),
    };
  }
  function begin(value?: ItemTradeView['offers'][number]) {
    setDraft(draftFrom(value));
    setEditingLot(undefined);
    setMessage('');
  }
  function add(
    lot: TradeLotView,
    side: 'give' | 'receive',
    quantity = String(lot.whole ? lot.quantity : 1),
  ) {
    if (blocked) return;
    const current = draft ?? draftFrom(offer);
    if (
      !current[side].some((item) => item.lot.id === lot.id) &&
      current.give.length + current.receive.length >= trade.maximumLots
    ) {
      setMessage(
        `An offer can include up to ${trade.maximumLots} item lots. Remove one before adding another.`,
      );
      return;
    }
    setDraft((value) => {
      // Selecting stock during negotiation edits the current proposal rather than
      // dropping its other basket or creating a competing offer.
      const next = value ?? current;
      const has = next[side].some((item) => item.lot.id === lot.id);
      return {
        ...next,
        [side]: has
          ? next[side].map((item) => (item.lot.id === lot.id ? { ...item, lot } : item))
          : [...next[side], entry(lot, quantity)],
      };
    });
  }
  function closeLotEditor() {
    const slot = workspace.current?.querySelector<HTMLButtonElement>(
      '.ol-trade-slot[aria-pressed="true"]',
    );
    setEditingLot(undefined);
    slot?.focus({ preventScroll: true });
  }
  function refreshDraft() {
    const current = [
      ...trade.ownLots,
      ...(stock.current ? (stock.page?.items.map(fromInventory) ?? []) : []),
    ];
    setDraft((value) =>
      value
        ? {
            ...value,
            give: value.give.map((item) => ({
              ...item,
              lot: current.find((lot) => lot.id === item.lot.id) ?? item.lot,
            })),
            receive: value.receive.map((item) => ({
              ...item,
              lot: trade.knownLots.find((lot) => lot.id === item.lot.id) ?? item.lot,
            })),
            ...(prior ? { prior: { id: prior.id, revision: prior.revision } } : {}),
          }
        : value,
    );
    stock.refresh();
  }
  async function send(action: ActionOption) {
    if (!connected || !action.enabled) return;
    const attempt = start();
    if (!attempt) return;
    setMessage('');
    const focusOwner = workspace.current;
    focusOwner?.focus({ preventScroll: true });
    try {
      const result = await command(action);
      if (!isCurrent(attempt)) return;
      if (alive.current) setMessage(result.message);
      if (['unconfirmed', 'expired', 'idempotency-conflict'].includes(result.code)) {
        // The one command owner retains before sending. A competing owner's
        // refused dispatch sent nothing; only a retained original needs recovery.
        const original = syncRecovery();
        if (original.inventoryReceipt || original.inventoryReadBlocked) setUncertain(true);
      }
      if (
        result.ok &&
        action.command.handoverOperation === 'counter' &&
        action.command.offerId &&
        action.command.expectedOfferRevision !== undefined
      ) {
        const id = action.command.offerId,
          revision = action.command.expectedOfferRevision + 1;
        setReviewed((value) => ({ ...value, [id]: revision }));
        // The shared receipt owner ended the submitted edits, or retained genuinely
        // newer ones. This late local continuation must not rewrite their prior pin.
      }
    } catch (error) {
      if (!isCurrent(attempt)) return;
      if (alive.current) setMessage(error instanceof Error ? error.message : String(error));
      const original = syncRecovery();
      if (original.inventoryReceipt || original.inventoryReadBlocked) setUncertain(true);
    } finally {
      const current = isCurrent(attempt);
      finish(attempt);
      if (alive.current && current)
        requestAnimationFrame(() => {
          if (
            alive.current &&
            focusOwner?.isConnected &&
            focusOwner.getClientRects().length &&
            document.activeElement === focusOwner
          )
            focusOwner.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
        });
    }
  }
  function submit() {
    if (!draft || !valid || stale) return;
    void send({
      id: 'trade-draft-' + trade.personId,
      label: draft.prior ? labels.counter : labels.offer,
      enabled: !blocked,
      command: {
        type: 'handover',
        handoverOperation: draft.prior ? 'counter' : 'offer',
        targetId: trade.personId,
        offeredItems: draft.give.map(pins),
        requestedItems: draft.receive.map(pins),
        ...(draft.constructionUse ? { constructionUse: draft.constructionUse.terms } : {}),
        ...(draft.prior
          ? { offerId: draft.prior.id, expectedOfferRevision: draft.prior.revision }
          : {}),
      },
    });
  }
  const displayEntries = (side: 'give' | 'receive') =>
    draft
      ? draft[side]
      : ((side === 'give' ? offer?.give : offer?.receive)?.map((lot) => entry(lot)) ?? []);
  const editing =
    editingLot && displayEntries(editingLot.side).find((item) => item.lot.id === editingLot.id);
  const counterpartPortrait = view.entities.find(
    (person) => person.id === trade.personId,
  )?.portrait;
  const lotRows = (side: 'give' | 'receive') => {
    const entries = displayEntries(side);
    return (
      <section
        className="ol-trade-basket"
        aria-label={side === 'give' ? labels.give : labels.receive}
      >
        <h4 className="ol-trade-basket-heading ol-eyebrow">
          <Portrait
            art={side === 'give' ? view.player.portrait : counterpartPortrait}
            head
            size={24}
          />
          <span>{side === 'give' ? labels.give : labels.receive}</span>
        </h4>
        <ul>
          {entries.map((item) => (
            <li key={item.lot.id}>
              <TextTooltip text={item.lot.label}>
                <Button
                  className="ol-trade-slot"
                  variant="quiet"
                  aria-label={`${item.lot.label}, ${item.quantity}`}
                  aria-pressed={editingLot?.side === side && editingLot.id === item.lot.id}
                  disabled={pending}
                  onPress={() => setEditingLot({ side, id: item.lot.id })}
                >
                  <ItemIllustration
                    art={item.lot.art}
                    icon={item.lot.icon}
                    label={item.lot.name}
                    size={40}
                    fallbackSize={24}
                    nativeSize
                  />
                  <span className="ol-trade-slot-quantity">{item.quantity}</span>
                </Button>
              </TextTooltip>
            </li>
          ))}
          {Array.from({ length: Math.max(0, 10 - entries.length) }, (_, index) => (
            <li key={`empty-${index}`} className="ol-trade-slot-empty" aria-hidden="true" />
          ))}
        </ul>
      </section>
    );
  };
  const speech = view.conversation.filter(
    (line) => line.speakerId === trade.personId || line.speakerId === view.player.id,
  );
  return (
    <section
      ref={workspace}
      tabIndex={-1}
      className="ol-item-trade ol-trade-workspace"
      data-heading={showHeading || undefined}
      aria-label={itemTradeTitle(trade)}
    >
      {showHeading && (
        <header className="ol-trade-heading">
          <h3 className="ol-heading t-panel-title">
            <Portrait art={counterpartPortrait} head size={40} />
            <span>{itemTradeTitle(trade)}</span>
          </h3>
          {(onChooseRecipient || onClose) && (
            <div className="ol-trade-heading-actions">
              {onChooseRecipient && (
                <IconButton
                  icon="ui.people"
                  label="Choose another person"
                  disabled={pending}
                  onPress={onChooseRecipient}
                />
              )}
              {onClose && <IconButton icon="ui.close" label="Close trade" onPress={onClose} />}
            </div>
          )}
        </header>
      )}
      <div className="ol-trade-layout">
        <div className="ol-trade-inventory">
          <InventoryCollection
            side="belongings"
            compact
            title="Your inventory"
            state={stock}
            selectedId={inventoryChoice?.id}
            onSelectedAnchor={() => undefined}
            busy={pending}
            canMove={false}
            dropActive={false}
            selectionRole="choose"
            onNavigate={stock.navigate}
            onSelect={(item) => {
              setInventoryChoice(item);
              add(fromInventory(item), 'give');
            }}
            onContextMenu={(item) => setInventoryChoice(item)}
            onQuickMove={(item) => add(fromInventory(item), 'give')}
            onDragStart={(_item, event) => event.preventDefault()}
            onDragEnd={() => undefined}
            onDrop={(event) => event.preventDefault()}
          />
          {inventoryChoice?.container && (
            <Button
              size="sm"
              variant="quiet"
              disabled={!connected || pending}
              onPress={() => stock.navigate(inventoryChoice.id)}
            >
              Open {inventoryChoice.name}
            </Button>
          )}
          {selected && (
            <Button
              size="sm"
              variant="quiet"
              disabled={blocked}
              onPress={() => add(selected, 'give', initialQuantity ?? String(selected.quantity))}
            >
              Add {selected.label} to your offer
            </Button>
          )}
        </div>
        <div className="ol-trade-deal">
          {trade.offers.length > 1 && (
            <label htmlFor={fieldId + '-offer'}>
              Proposal
              <select
                id={fieldId + '-offer'}
                value={offer?.id ?? ''}
                onChange={(event) => {
                  setChosenOffer(event.target.value);
                  setDraft(undefined);
                }}
              >
                {trade.offers.map((value) => (
                  <option key={value.id} value={value.id}>
                    {value.incoming ? labels.incoming : labels.waiting} · {value.id}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="ol-trade-terms">
            {lotRows('give')}
            {lotRows('receive')}
          </div>
          {editing && editingLot && (
            <section
              className="ol-trade-lot-editor"
              aria-label={editing.lot.label}
              onKeyDown={(event) => {
                if (
                  event.key !== 'Escape' ||
                  event.defaultPrevented ||
                  event.nativeEvent.isComposing
                )
                  return;
                event.preventDefault();
                event.stopPropagation();
                closeLotEditor();
              }}
            >
              <strong>{editing.lot.label}</strong>
              <p className="ol-caption">{editing.lot.description}</p>
              {draft ? (
                <>
                  <InventoryQuantity
                    label={`${editingLot.side === 'give' ? labels.giveQuantity : labels.receiveQuantity}: ${editing.lot.label}`}
                    value={editing.quantity}
                    maximum={editing.lot.quantity}
                    disabled={pending || editing.lot.whole}
                    onChange={(quantity) =>
                      setDraft((value) =>
                        value
                          ? {
                              ...value,
                              [editingLot.side]: value[editingLot.side].map((item) =>
                                item.lot.id === editing.lot.id ? { ...item, quantity } : item,
                              ),
                            }
                          : value,
                      )
                    }
                  />
                  {editing.lot.whole && <p className="ol-caption">{labels.whole}</p>}
                  <Button
                    variant="quiet"
                    size="sm"
                    disabled={pending}
                    onPress={() => {
                      const side = editingLot.side;
                      setDraft((value) =>
                        value
                          ? {
                              ...value,
                              [side]: value[side].filter((item) => item.lot.id !== editing.lot.id),
                            }
                          : value,
                      );
                      setEditingLot(undefined);
                    }}
                  >
                    Remove {editing.lot.name}
                  </Button>
                </>
              ) : (
                <p>× {editing.quantity}</p>
              )}
              <Button variant="quiet" size="sm" onPress={closeLotEditor}>
                Close item details
              </Button>
            </section>
          )}
          {draft && (
            <details
              className="ol-trade-request-details"
              open={requestsOpen}
              onToggle={(event) => setRequestsOpen(event.currentTarget.open)}
            >
              <summary>Add a requested item</summary>
              <TradeDisclosurePicker
                key={JSON.stringify([trade.scope, view.access?.scope, view.historyEpoch])}
                trade={trade}
                connected={connected}
                visible={visible && requestsOpen}
                disabled={blocked}
                add={(lot) => add(lot, 'receive')}
              />
            </details>
          )}
          {draft?.constructionUse && (
            <p>
              {draft.constructionUse.detail.replaceAll(
                '{minutes}',
                String(
                  Math.max(0, Math.ceil((draft.constructionUse.terms.expiresAt - simTime) / 60)),
                ),
              )}
            </p>
          )}
          {!!trade.contributionChoices?.length && draft && (
            <details className="ol-trade-use">
              <summary>Material use</summary>
              {trade.contributionChoices.map((choice) => (
                <Button
                  key={choice.id}
                  size="sm"
                  variant="quiet"
                  disabled={pending || draft.give.length !== 1}
                  onPress={() =>
                    setDraft((value) =>
                      value
                        ? {
                            ...value,
                            constructionUse: {
                              terms: {
                                ...choice.terms,
                                expiresAt: simTime + choice.durationSeconds,
                              },
                              detail: choice.detail,
                            },
                          }
                        : value,
                    )
                  }
                >
                  {choice.label}
                </Button>
              ))}
              {draft.constructionUse && (
                <Button
                  variant="quiet"
                  size="sm"
                  onPress={() =>
                    setDraft((value) => (value ? { ...value, constructionUse: undefined } : value))
                  }
                >
                  Remove material-use permission
                </Button>
              )}
            </details>
          )}
          {offer && !draft && (
            <p role="status" className="ol-caption">
              {changed ? labels.changed : offer.incoming ? labels.incoming : labels.waiting}
            </p>
          )}
          {draft?.constructionUse && draft.give.length !== 1 && (
            <p role="status">
              Material-use permission applies to one offered item. Remove that permission to offer
              several items.
            </p>
          )}
          <div className="ol-actions ol-trade-decision">
            {draft ? (
              <>
                <Button variant="quiet" disabled={!connected || pending} onPress={refreshDraft}>
                  {labels.refresh}
                </Button>
                <Button
                  variant="primary"
                  busy={pending}
                  disabled={blocked || !valid || stale}
                  onPress={submit}
                >
                  {draft.prior ? labels.counter : labels.offer}
                </Button>
                <Button variant="quiet" disabled={pending} onPress={() => setDraft(undefined)}>
                  Cancel edits
                </Button>
              </>
            ) : (
              <>
                {changed && (
                  <Button
                    variant="quiet"
                    disabled={blocked}
                    onPress={() =>
                      offer && setReviewed((value) => ({ ...value, [offer.id]: offer.revision }))
                    }
                  >
                    {labels.review}
                  </Button>
                )}
                {offer?.actions.map((action) => (
                  <div key={action.id}>
                    <Button
                      variant={action.command.handoverOperation === 'accept' ? 'primary' : 'quiet'}
                      disabled={
                        blocked ||
                        !action.enabled ||
                        (changed && action.command.handoverOperation === 'accept')
                      }
                      onPress={() => void send(action)}
                    >
                      {action.label}
                    </Button>
                    {action.reason && <p className="ol-caption">{action.reason}</p>}
                  </div>
                ))}
                {offer && (
                  <Button variant="quiet" disabled={blocked} onPress={() => begin(offer)}>
                    {labels.counter}
                  </Button>
                )}
                <Button variant="quiet" disabled={blocked} onPress={() => begin()}>
                  {labels.newOffer}
                </Button>
              </>
            )}
          </div>
          {stale && <p role="status">{labels.draftChanged}</p>}
          {offer?.constructionUse && !draft && (
            <details>
              <summary>Agreed material use</summary>
              <p>
                {offer.constructionUse.detail.replaceAll(
                  '{minutes}',
                  String(
                    Math.max(0, Math.ceil((offer.constructionUse.terms.expiresAt - simTime) / 60)),
                  ),
                )}
              </p>
              <GameDeadline at={offer.constructionUse.terms.expiresAt} />
            </details>
          )}
          {(inventoryReceipt || inventoryReadBlocked) && !recovery.pending && (
            <p role="status">
              {inventoryReadBlocked
                ? 'The original Inventory request could not be read. Restore browser storage and open Inventory to recover it before trading again.'
                : 'An Inventory trade request needs its original receipt checked. Open Inventory and check the original result before trading again.'}
            </p>
          )}
          {/* The shared command/receipt area owns its result; keep independent local feedback. */}
          {message && message !== recovery.message && <p role="status">{message}</p>}
          <TradeCommandStatus recovery={recovery} connected={connected} />
          {uncertain && (
            <Button variant="quiet" disabled={!connected || pending} onPress={refreshDraft}>
              {labels.review}
            </Button>
          )}
          <section
            className="ol-trade-conversation"
            aria-label={`Conversation with ${trade.personName}`}
          >
            <h4 className="ol-eyebrow">Conversation</h4>
            <ConversationThread
              conversationKey={JSON.stringify([privateOwner, trade.personId])}
              items={speech.map((line) => ({
                id: line.id,
                content: (
                  <p
                    className="ol-trade-speech"
                    data-own={line.speakerId === view.player.id || undefined}
                  >
                    <strong>{line.speaker}</strong> <span>{line.text}</span>{' '}
                    <EventTime time={line.time} format="clock" />
                  </p>
                ),
              }))}
              visible={visible && connected}
              ariaLabel={`Perceived speech with ${trade.personName}`}
              preserveReading
              liveAnnouncements="off"
            />
            <div ref={negotiation} className="ol-trade-negotiation-input" />
          </section>
        </div>
      </div>
    </section>
  );
}

/** Paging changes the available rows, never the exact selected disclosure. A
 * private evidence-epoch change remounts this reader before old bodies can render. */
function TradeDisclosurePicker({
  trade,
  visible,
  connected,
  disabled,
  add,
}: {
  trade: ItemTradeView;
  visible: boolean;
  connected: boolean;
  disabled: boolean;
  add(lot: TradeLotView): void;
}) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [choice, setChoice] = useState<TradeLotView>();
  const [page, setPage] = useState<{ context: string; cursor?: string }>();
  const [refresh, setRefresh] = useState(0);
  const [read, setRead] = useState<{ key: string; value?: TradeDisclosuresPage; error?: string }>();
  const context = JSON.stringify([trade.personId, trade.knownLots, query]);
  const cursor = page?.context === context ? page.cursor : undefined;
  const key = JSON.stringify([context, cursor, refresh]);
  const available = visible && connected;
  const current = useRef<string | null>(null);
  current.current = available ? key : null;
  useEffect(() => {
    if (!available) return;
    const abort = new AbortController();
    const timer = setTimeout(
      () => {
        void postContactRead<TradeDisclosuresPage>(
          '/api/trade/disclosures',
          {
            personId: trade.personId,
            query,
            ...(cursor ? { cursor } : {}),
          },
          [trade.personId],
          abort.signal,
        )
          .then((result) => {
            if (abort.signal.aborted || current.current !== key) return;
            if (!result.ok)
              throw new Error(result.message ?? 'Remembered trade items are unavailable.');
            setRead({ key, value: result });
          })
          .catch((error) => {
            if (!abort.signal.aborted && current.current === key)
              setRead({ key, error: error instanceof Error ? error.message : String(error) });
          });
      },
      query ? 150 : 0,
    );
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [key, available]);
  const result = read?.key === key ? read : undefined;
  const rows = result?.value?.items ?? [];
  const options = choice && !rows.some((lot) => lot.id === choice.id) ? [choice, ...rows] : rows;
  const loading = available && !result;
  return (
    <div className="ol-trade-request">
      <label htmlFor={id + '-query'}>Search remembered items</label>
      <input
        id={id + '-query'}
        type="search"
        value={query}
        maxLength={160}
        disabled={disabled}
        onChange={(event) => {
          setQuery(event.target.value);
          setPage(undefined);
        }}
      />
      <label htmlFor={id + '-choice'}>{trade.labels.receive}</label>
      <select
        id={id + '-choice'}
        value={choice?.id ?? ''}
        disabled={disabled}
        onChange={(event) => setChoice(options.find((lot) => lot.id === event.target.value))}
      >
        <option value="">{trade.labels.choose}</option>
        {options.map((lot) => (
          <option key={lot.id} value={lot.id}>
            {lot.label}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        variant="quiet"
        disabled={disabled || !choice}
        onPress={() => choice && add(choice)}
      >
        Add requested item
      </Button>
      <LoadingIndicator active={loading} label="Reading remembered trade items" />
      {result?.error && <p role="alert">{result.error}</p>}
      {result?.value && !rows.length && (
        <p role="status">
          {result.value.next
            ? 'No match in this part of your remembered items. More remain to search.'
            : query
              ? 'No remembered items match this search.'
              : 'No item disclosures are remembered here.'}
        </p>
      )}
      <div className="ol-actions">
        {result?.value?.next && (
          <Button
            size="sm"
            variant="quiet"
            disabled={disabled || loading}
            onPress={() => setPage({ context, cursor: result.value!.next })}
          >
            Next remembered items
          </Button>
        )}
        {cursor && (
          <Button
            size="sm"
            variant="quiet"
            disabled={disabled || loading}
            onPress={() => setPage(undefined)}
          >
            First remembered items
          </Button>
        )}
        <Button
          size="sm"
          variant="quiet"
          disabled={!available || loading}
          onPress={() => {
            setPage(undefined);
            setRefresh((value) => value + 1);
          }}
        >
          Refresh remembered items
        </Button>
      </div>
      <p className="ol-caption">{trade.labels.remembered}</p>
    </div>
  );
}

/** The original receipt remains reachable even if its trade partner leaves sight. */
export function TradeCommandStatus({
  recovery,
  connected,
}: {
  recovery: InventoryCommandRecovery;
  connected: boolean;
}) {
  if (!recovery.pending && !recovery.message) return null;
  return (
    <section className="ol-trade-command-result" aria-label="Trade result">
      {recovery.pending && (
        <>
          <p role="status">
            {recovery.pending.status === 'sending'
              ? 'Sending this trade request…'
              : recovery.pending.status === 'checking'
                ? 'Checking the original trade result…'
                : 'The original trade request needs its result checked before trading again.'}
          </p>
          <Button
            variant="quiet"
            disabled={!connected || recovery.pending.status !== 'unknown'}
            onPress={() => void recovery.check()}
          >
            {recovery.pending.request
              ? 'Check original trade result'
              : 'Read retained trade request'}
          </Button>
        </>
      )}
      {recovery.message && <p role="status">{recovery.message}</p>}
    </section>
  );
}
