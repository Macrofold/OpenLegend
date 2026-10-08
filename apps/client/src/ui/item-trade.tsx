import { useEffect, useRef, useState } from 'react';
import { useTradeDraft, type TradeDraft } from '../trade-drafts';
import type { ActionOption, ApiResult, ItemTradeView, TradeLotView } from '@open-legend/protocol';
import { Button, Section } from '../design-system/components';
import { InventoryQuantity, exactQuantity } from './inventory-controls';
import './inventory.css';

export function ItemTrade({
  trade,
  connected,
  command,
  selected,
  initialQuantity,
  inventoryRequestKey,
}: {
  trade: ItemTradeView;
  connected: boolean;
  command(action: ActionOption): Promise<ApiResult>;
  selected?: TradeLotView;
  initialQuantity?: string;
  inventoryRequestKey?: string;
}) {
  const labels = trade.labels;
  // The server scopes this key to account, character and save timeline, independent
  // of reconnect/Resume. Existing logout/access cleanup removes action drafts.
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
    setPending,
    start,
  } = useTradeDraft(draftKey, trade.offers, { key: inventoryRequestKey, scope: trade.scope });
  const [message, setMessage] = useState('');
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
  const alive = useRef(true),
    workspace = useRef<HTMLElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const ownLots = selected
    ? [selected, ...trade.ownLots.filter((lot) => lot.id !== selected.id)]
    : trade.ownLots;
  const activePrior = draft?.prior && trade.offers.find((offer) => offer.id === draft.prior!.id);
  const stale = !!draft?.prior && (!activePrior || activePrior.revision !== draft.prior.revision);
  function refreshDraft() {
    setDraft((value) =>
      value
        ? {
            ...value,
            give: ownLots.find((lot) => lot.id === value.give?.id) ?? value.give,
            receive: trade.knownLots.find((lot) => lot.id === value.receive?.id) ?? value.receive,
            ...(activePrior
              ? { prior: { id: activePrior.id, revision: activePrior.revision } }
              : {}),
          }
        : value,
    );
    if (!inventoryReceipt && !inventoryReadBlocked) setUncertain(false);
  }
  const giveQuantity = draft && exactQuantity(draft.giveQuantity, draft.give?.quantity);
  const receiveQuantity =
    draft?.receive && exactQuantity(draft.receiveQuantity, draft.receive.quantity);
  const valid =
    !!draft?.give &&
    giveQuantity !== undefined &&
    (!draft.give.whole || giveQuantity === draft.give.quantity) &&
    (!draft.receive ||
      (receiveQuantity !== undefined &&
        (!draft.receive.whole || receiveQuantity === draft.receive.quantity)));
  async function send(action: ActionOption) {
    if (!connected || !action.enabled || !start()) return;
    setMessage('');
    workspace.current?.focus({ preventScroll: true });
    try {
      const result = await command(action);
      if (alive.current) setMessage(result.message);
      if (['unconfirmed', 'expired', 'idempotency-conflict'].includes(result.code))
        setUncertain(true);
      if (
        result.ok &&
        action.command.handoverOperation === 'counter' &&
        action.command.offerId &&
        action.command.expectedOfferRevision !== undefined
      ) {
        const id = action.command.offerId,
          revision = action.command.expectedOfferRevision + 1;
        setReviewed((value) => ({ ...value, [id]: revision }));
        setDraft((value) =>
          value?.prior?.id === id ? { ...value, prior: { id, revision } } : value,
        );
      }
      // Keep all draft fields after refusal. Committed status comes from the server view.
    } catch (error) {
      if (alive.current) {
        setMessage(error instanceof Error ? error.message : String(error));
      }
      setUncertain(true);
    } finally {
      setPending(false);
      if (alive.current) {
        requestAnimationFrame(() =>
          workspace.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus(),
        );
      }
    }
  }
  function begin(prior?: ItemTradeView['offers'][number]) {
    const give = prior?.give ?? selected ?? ownLots[0];
    const receive = prior?.receive;
    setDraft({
      give,
      receive,
      giveQuantity:
        !prior && selected && initialQuantity !== undefined
          ? initialQuantity
          : String(give?.quantity ?? 1),
      receiveQuantity: String(receive?.quantity ?? 1),
      ...(prior ? { prior: { id: prior.id, revision: prior.revision } } : {}),
    });
    setMessage('');
  }
  function submit() {
    if (!draft?.give || !valid || stale || giveQuantity === undefined) return;
    void send({
      id: 'trade-draft-' + trade.personId,
      label: draft.prior ? labels.counter : labels.offer,
      enabled: connected,
      command: {
        type: 'handover',
        handoverOperation: draft.prior ? 'counter' : 'offer',
        targetId: trade.personId,
        itemId: draft.give.id,
        quantity: giveQuantity,
        expectedRevision: draft.give.revision,
        placementRevision: draft.give.placementRevision,
        expectedContentsRevision: draft.give.contentsRevision,
        ...(draft.prior
          ? { offerId: draft.prior.id, expectedOfferRevision: draft.prior.revision }
          : {}),
        ...(draft.receive && receiveQuantity !== undefined
          ? {
              requestedItem: {
                itemId: draft.receive.id,
                quantity: receiveQuantity,
                expectedRevision: draft.receive.revision,
                placementRevision: draft.receive.placementRevision,
                expectedContentsRevision: draft.receive.contentsRevision,
              },
            }
          : {}),
      },
    });
  }
  const terms = (give?: TradeLotView, receive?: TradeLotView) => (
    <div className="ol-trade-terms">
      <div>
        <strong>{labels.give}</strong>
        <p>{give ? give.quantity + ' × ' + give.label : labels.gift}</p>
        {give && (
          <p className="ol-caption">
            {labels.to} {trade.personName}
          </p>
        )}
      </div>
      <div>
        <strong>{labels.receive}</strong>
        <p>{receive ? receive.quantity + ' × ' + receive.label : labels.gift}</p>
        {receive && <p className="ol-caption">{labels.into}</p>}
      </div>
    </div>
  );
  return (
    <section ref={workspace} tabIndex={-1} className="ol-item-trade" aria-label={labels.title}>
      <Section title={labels.title + ' · ' + trade.personName}>
        {trade.offers.map((offer) => {
          const changed = reviewed[offer.id] !== undefined && reviewed[offer.id] !== offer.revision;
          return (
            <section
              className="ol-trade-offer"
              key={offer.id}
              aria-label={offer.incoming ? labels.incoming : labels.waiting}
            >
              {terms(offer.give, offer.receive)}
              <p role="status">
                {changed ? labels.changed : offer.incoming ? labels.incoming : labels.waiting}
              </p>
              <div className="ol-actions">
                {changed && (
                  <Button
                    variant="quiet"
                    disabled={!connected || pending}
                    onPress={() =>
                      setReviewed((value) => ({ ...value, [offer.id]: offer.revision }))
                    }
                  >
                    {labels.review}
                  </Button>
                )}
                {offer.actions.map((action) => (
                  <div key={action.id}>
                    <Button
                      disabled={
                        !connected ||
                        pending ||
                        !!inventoryReceipt ||
                        inventoryReadBlocked ||
                        uncertain ||
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
                <Button
                  variant="quiet"
                  disabled={
                    !connected || pending || !!inventoryReceipt || inventoryReadBlocked || uncertain
                  }
                  onPress={() => begin(offer)}
                >
                  {labels.counter}
                </Button>
              </div>
            </section>
          );
        })}
        <Button
          variant="quiet"
          disabled={
            !connected || pending || !!inventoryReceipt || inventoryReadBlocked || uncertain
          }
          onPress={() => {
            if (draft) setDraft((value) => (value ? { ...value, prior: undefined } : value));
            else begin();
          }}
        >
          {labels.newOffer}
        </Button>
        {selected && (
          <Button
            variant="quiet"
            disabled={
              !connected || pending || !!inventoryReceipt || inventoryReadBlocked || uncertain
            }
            onPress={() => begin()}
          >
            Use {initialQuantity ?? selected.quantity} × {selected.label} in a new offer
          </Button>
        )}
        {draft && (
          <div className="ol-trade-draft">
            <p className="ol-caption">{labels.selectionHint}</p>
            <div className="ol-trade-terms">
              <div>
                <label>
                  {labels.give}
                  <select
                    value={draft.give?.id ?? ''}
                    disabled={pending}
                    onChange={(event) => {
                      const give = ownLots.find((lot) => lot.id === event.target.value);
                      setDraft((value) =>
                        value
                          ? {
                              ...value,
                              give,
                              giveQuantity: String(give?.whole ? give.quantity : 1),
                            }
                          : value,
                      );
                    }}
                  >
                    <option value="">{labels.choose}</option>
                    {draft.give && !ownLots.some((lot) => lot.id === draft.give!.id) && (
                      <option value={draft.give.id}>{draft.give.label}</option>
                    )}
                    {ownLots.map((lot) => (
                      <option key={lot.id} value={lot.id}>
                        {lot.label}
                      </option>
                    ))}
                  </select>
                </label>
                <InventoryQuantity
                  label={labels.giveQuantity}
                  value={draft.giveQuantity}
                  maximum={draft.give?.quantity}
                  disabled={pending}
                  onChange={(giveQuantity) =>
                    setDraft((value) => (value ? { ...value, giveQuantity } : value))
                  }
                />
                <p className="ol-caption">
                  {labels.to} {trade.personName}
                </p>
                {draft.give && <p className="ol-caption">{draft.give.description}</p>}
                {draft.give?.whole && <p className="ol-caption">{labels.whole}</p>}
              </div>
              <div>
                <label>
                  {labels.receive}
                  <select
                    value={draft.receive?.id ?? ''}
                    disabled={pending}
                    onChange={(event) => {
                      const receive = trade.knownLots.find((lot) => lot.id === event.target.value);
                      setDraft((value) =>
                        value
                          ? {
                              ...value,
                              receive,
                              receiveQuantity: String(receive?.whole ? receive.quantity : 1),
                            }
                          : value,
                      );
                    }}
                  >
                    <option value="">{labels.gift}</option>
                    {draft.receive &&
                      !trade.knownLots.some((lot) => lot.id === draft.receive!.id) && (
                        <option value={draft.receive.id}>{draft.receive.label}</option>
                      )}
                    {trade.knownLots.map((lot) => (
                      <option key={lot.id} value={lot.id}>
                        {lot.label}
                      </option>
                    ))}
                  </select>
                </label>
                {draft.receive ? (
                  <>
                    <InventoryQuantity
                      label={labels.receiveQuantity}
                      hint={labels.remembered}
                      value={draft.receiveQuantity}
                      maximum={draft.receive.quantity}
                      disabled={pending}
                      onChange={(receiveQuantity) =>
                        setDraft((value) => (value ? { ...value, receiveQuantity } : value))
                      }
                    />
                    <p className="ol-caption">
                      {labels.into} {labels.remembered}
                    </p>
                    <p className="ol-caption">{draft.receive.description}</p>
                    {draft.receive.whole && <p className="ol-caption">{labels.whole}</p>}
                  </>
                ) : (
                  <p className="ol-caption">
                    {trade.knownLots.length ? labels.gift : labels.unknown}
                  </p>
                )}
              </div>
            </div>
            <p>{labels.noTransfer}</p>
            {stale && <p role="status">{labels.draftChanged}</p>}
            <div className="ol-actions">
              {
                <Button variant="quiet" disabled={!connected || pending} onPress={refreshDraft}>
                  {labels.refresh}
                </Button>
              }
              <Button
                disabled={
                  !connected ||
                  pending ||
                  !!inventoryReceipt ||
                  inventoryReadBlocked ||
                  uncertain ||
                  !valid ||
                  stale
                }
                busy={pending}
                onPress={submit}
              >
                {draft.prior ? labels.counter : labels.offer}
              </Button>
            </div>
          </div>
        )}
        {(inventoryReceipt || inventoryReadBlocked) && (
          <p role="status">
            {inventoryReadBlocked
              ? 'The original Inventory request could not be read. Restore browser storage and open Inventory to recover it before trading again.'
              : 'An Inventory trade request needs its original receipt checked. Open Inventory and check the original result before trading again.'}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        {uncertain && (
          <Button variant="quiet" disabled={!connected || pending} onPress={refreshDraft}>
            {labels.review}
          </Button>
        )}
      </Section>
    </section>
  );
}
