import { useSyncExternalStore, type SetStateAction } from 'react';
import { readInventoryCommand, type PendingCommand } from './inventory-command-record';
import type { ApiResult, CommandInput, ItemTradeView, TradeLotView } from '@open-legend/protocol';
import { isRepositoryAssetPath } from '@open-legend/assets';

export interface TradeDraftLot {
  lot: TradeLotView;
  quantity: string;
}
export interface TradeDraft {
  give: TradeDraftLot[];
  receive: TradeDraftLot[];
  prior?: { id: string; revision: number };
  constructionUse?: NonNullable<ItemTradeView['offers'][number]['constructionUse']>;
}
interface SavedTradeDraft {
  draft?: TradeDraft;
  reviewed: Record<string, number>;
  uncertain: boolean;
  inventoryReceipt?: string;
}
/** Retained browser data is untrusted even when its native lot pins are current.
 * Validate artwork before it can reach selected-release URL construction. */
function itemArtValid(art: unknown): boolean {
  return (
    art === undefined ||
    (!!art &&
      typeof art === 'object' &&
      !Array.isArray(art) &&
      Object.keys(art).every((key) => key === 'path' || key === 'detailPath') &&
      'path' in art &&
      isRepositoryAssetPath(art.path) &&
      (!('detailPath' in art) ||
        art.detailPath === undefined ||
        isRepositoryAssetPath(art.detailPath)))
  );
}
function readDraft(key: string): SavedTradeDraft | undefined {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null') as SavedTradeDraft | null;
    const lotValid = (lot?: TradeLotView) =>
      !lot ||
      (['id', 'name', 'label', 'description'].every(
        (field) => typeof lot[field as keyof TradeLotView] === 'string',
      ) &&
        ['quantity', 'revision', 'placementRevision'].every((field) =>
          Number.isSafeInteger(lot[field as keyof TradeLotView]),
        ) &&
        typeof lot.whole === 'boolean' &&
        itemArtValid(lot.art));
    if (
      saved &&
      typeof saved.uncertain === 'boolean' &&
      (saved.inventoryReceipt === undefined || typeof saved.inventoryReceipt === 'string') &&
      saved.reviewed &&
      Object.values(saved.reviewed).every(Number.isSafeInteger) &&
      (!saved.draft ||
        (Array.isArray(saved.draft.give) &&
          Array.isArray(saved.draft.receive) &&
          [...saved.draft.give, ...saved.draft.receive].every(
            (entry) =>
              !!entry && typeof entry.quantity === 'string' && !!entry.lot && lotValid(entry.lot),
          ) &&
          (!saved.draft.constructionUse ||
            (typeof saved.draft.constructionUse.detail === 'string' &&
              typeof saved.draft.constructionUse.terms?.operation === 'string' &&
              Number.isFinite(saved.draft.constructionUse.terms.expiresAt) &&
              !!saved.draft.constructionUse.terms.site &&
              ['minX', 'maxX', 'minZ', 'maxZ'].every((key) =>
                Number.isFinite(saved.draft!.constructionUse!.terms.site[key as 'minX']),
              ))) &&
          (!saved.draft.prior ||
            (typeof saved.draft.prior.id === 'string' &&
              Number.isSafeInteger(saved.draft.prior.revision)))))
    )
      return saved;
  } catch {
    // Browser storage is optional; malformed local drafts grant no authority.
  }
}

type TradeState = SavedTradeDraft & { pending: boolean; inventoryReadBlocked: boolean };
type InventoryRecovery = { keys: string[]; scope: string };
interface TradeDraftStore {
  recovery?: InventoryRecovery;
  configureRecovery(recovery?: InventoryRecovery): void;
  refreshRecovery(): TradeState;
  getSnapshot(): TradeState;
  subscribe(listener: () => void): () => void;
  update(change: (previous: TradeState) => TradeState): void;
  start(): symbol | undefined;
  isCurrent(attempt: symbol): boolean;
  finish(attempt?: symbol): void;
  active: boolean;
}
const stores = new Map<string, TradeDraftStore>();

/** Forget private in-memory copies with the same access/timeline cleanup as saved drafts. */
export function clearTradeDrafts(): void {
  for (const store of stores.values()) store.active = false;
  stores.clear();
}
function tradeDraftStore(key: string, offers: ItemTradeView['offers']): TradeDraftStore {
  const existing = stores.get(key);
  if (existing) return existing;
  let value = {
    ...(readDraft(key) ?? {
      reviewed: Object.fromEntries(offers.map((offer) => [offer.id, offer.revision])),
      uncertain: false,
    }),
    pending: false,
    inventoryReadBlocked: false,
  };
  const listeners = new Set<() => void>();
  let submission: symbol | undefined;
  const releaseUnused = () =>
    queueMicrotask(() => {
      if (
        !listeners.size &&
        !value.pending &&
        !value.inventoryReceipt &&
        stores.get(key) === store
      ) {
        stores.delete(key);
        store.active = false;
      }
    });
  const store: TradeDraftStore = {
    active: true,
    configureRecovery(recovery) {
      if (
        store.recovery?.scope === recovery?.scope &&
        JSON.stringify(store.recovery?.keys) === JSON.stringify(recovery?.keys)
      )
        return;
      store.recovery = recovery;
      // First use and changed request ownership must guard the first render.
      // Ordinary snapshot reads reuse this result instead of parsing storage.
      if (readRecovery() && listeners.size)
        queueMicrotask(() => {
          // A caller configures its key while rendering; notify existing readers
          // after that render instead of updating another component inside it.
          if (store.active) for (const listener of listeners) listener();
        });
    },
    refreshRecovery() {
      if (readRecovery()) for (const listener of listeners) listener();
      return value;
    },
    getSnapshot: () => value,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        releaseUnused();
      };
    },
    update(change) {
      // An acknowledgment from an old account/timeline must not repopulate private work.
      if (!store.active) return;
      const next = change(value);
      if (next === value) return;
      value = next;
      try {
        const { pending: _pending, inventoryReadBlocked: _blocked, ...saved } = value;
        sessionStorage.setItem(key, JSON.stringify(saved));
      } catch {
        /* Browser storage is optional; sharing still works without it. */
      }
      for (const listener of listeners) listener();
      if (!listeners.size) releaseUnused();
    },
    start() {
      store.refreshRecovery();
      if (
        !store.active ||
        value.pending ||
        value.uncertain ||
        value.inventoryReceipt ||
        value.inventoryReadBlocked
      )
        return undefined;
      submission = Symbol();
      store.update((previous) => ({ ...previous, pending: true }));
      return submission;
    },
    isCurrent: (attempt) => store.active && submission === attempt,
    finish(attempt) {
      if (attempt !== undefined && submission !== attempt) return;
      submission = undefined;
      store.update((previous) => (previous.pending ? { ...previous, pending: false } : previous));
    },
  };
  function readRecovery() {
    if (store.recovery) {
      const originals = store.recovery.keys.length
        ? store.recovery.keys.map(readInventoryCommand)
        : [{ status: 'unknown' as const, request: undefined }];
      const blocked = originals.some((original) => !!original && !original.request);
      const receipt = originals.find(
        (original) => original?.request?.tradeScope === store.recovery!.scope,
      )?.request?.commandId;
      const inventoryReceipt = blocked ? value.inventoryReceipt : receipt;
      if (value.inventoryReadBlocked !== blocked || value.inventoryReceipt !== inventoryReceipt) {
        value = { ...value, inventoryReadBlocked: blocked, inventoryReceipt };
        return true;
      }
    }
    return false;
  }
  stores.set(key, store);
  return store;
}
/** One draft and submission guard for the Inventory and person views of the same offer. */
export function useTradeDraft(
  key: string,
  offers: ItemTradeView['offers'],
  recovery?: InventoryRecovery,
) {
  const store = tradeDraftStore(key, offers);
  store.configureRecovery(recovery);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const field = <K extends keyof typeof state>(name: K, next: SetStateAction<(typeof state)[K]>) =>
    store.update((previous) => ({
      ...previous,
      [name]: typeof next === 'function' ? next(previous[name]) : next,
    }));
  return {
    ...state,
    setDraft: (next: SetStateAction<TradeDraft | undefined>) => field('draft', next),
    setReviewed: (next: SetStateAction<Record<string, number>>) => field('reviewed', next),
    setUncertain: (next: SetStateAction<boolean>) => field('uncertain', next),
    syncRecovery: store.refreshRecovery,
    start: store.start,
    isCurrent: store.isCurrent,
    finish: store.finish,
  };
}

/** Exact command storage changes notify only the trade views reading that owner. */
export function refreshTradeInventoryRecovery(key: string) {
  for (const store of stores.values())
    if (store.active && store.recovery?.keys.includes(key)) store.refreshRecovery();
}

/** Inventory owns this exact receipt; reviewing trade terms cannot release it. */
export function retainTradeInventoryReceipt(scope: string, commandId: string) {
  const store = tradeDraftStore('open-legend:action-draft:trade:' + scope, []);
  store.update((value) => ({ ...value, inventoryReceipt: commandId }));
}

/** Compare the exact submitted terms, not labels or whichever proposal is now visible.
 * A known successful receipt ends only those edits; later quantities, pins or terms stay.
 * This comparison grants no execution and never reconstructs a saved command to send. */
function isSubmittedTradeDraft(draft: TradeDraft | undefined, command: unknown): boolean {
  if (!draft || !command || typeof command !== 'object') return false;
  const submitted = command as Partial<CommandInput>;
  if (
    submitted.type !== 'handover' ||
    submitted.handoverOperation !== (draft.prior ? 'counter' : 'offer') ||
    submitted.offerId !== draft.prior?.id ||
    submitted.expectedOfferRevision !== draft.prior?.revision
  )
    return false;
  const sameLots = (drafts: TradeDraftLot[], lots: CommandInput['offeredItems']) =>
    Array.isArray(lots) &&
    drafts.length === lots.length &&
    drafts.every(({ lot, quantity }, index) => {
      const sent = lots[index];
      // Invalid/intermediate text is a new edit, even when Number(text) could parse it.
      return (
        !!sent &&
        /^\d+$/.test(quantity.trim()) &&
        Number(quantity.trim()) === sent.quantity &&
        lot.id === sent.itemId &&
        lot.revision === sent.expectedRevision &&
        lot.placementRevision === sent.placementRevision &&
        lot.contentsRevision === sent.expectedContentsRevision
      );
    });
  const terms = draft.constructionUse?.terms,
    sentTerms = submitted.constructionUse;
  const sameTerms =
    (!terms && !sentTerms) ||
    (!!terms &&
      !!sentTerms &&
      terms.operation === sentTerms.operation &&
      terms.expiresAt === sentTerms.expiresAt &&
      !!sentTerms.site &&
      (Object.keys(terms.site) as Array<keyof typeof terms.site>).every(
        (key) => terms.site[key] === sentTerms.site[key],
      ));
  return (
    sameLots(draft.give, submitted.offeredItems) &&
    sameLots(draft.receive, submitted.requestedItems ?? []) &&
    sameTerms
  );
}
export function prepareTradeInventoryReceiptResolution(
  request: PendingCommand,
  result: ApiResult,
  recovered = false,
) {
  const { tradeScope: scope, commandId } = request;
  if (!scope) throw new Error('The original trade request has no current recipient scope.');
  const key = 'open-legend:action-draft:trade:' + scope;
  const store = tradeDraftStore(key, []);
  const current = store.getSnapshot();
  const raw = sessionStorage.getItem(key);
  const saved = raw === null ? undefined : readDraft(key);
  if (raw !== null && !saved) throw new Error('The retained trade draft could not be read.');
  if (
    (saved?.inventoryReceipt && saved.inventoryReceipt !== commandId) ||
    (current.inventoryReceipt && current.inventoryReceipt !== commandId)
  )
    throw new Error('The retained trade receipt changed. Check its original result.');
  const { pending: _pending, inventoryReadBlocked: _blocked, ...retained } = current;
  const resolvedDraft = (draft: TradeDraft | undefined) =>
    result.ok && isSubmittedTradeDraft(draft, request.command) ? undefined : draft;
  const serialized = JSON.stringify({
    ...retained,
    draft: resolvedDraft(retained.draft),
    inventoryReceipt: undefined,
    uncertain: false,
  });
  // Keep the live guard until Inventory has also removed its original request.
  // A failed write/read-back leaves that exact request available for another receipt check.
  sessionStorage.setItem(key, serialized);
  if (sessionStorage.getItem(key) !== serialized)
    throw new Error('The resolved trade receipt could not be retained. Check its original result.');
  return () => {
    // An old Inventory component may still await its network promise. Once the
    // exact receipt and cleanup are confirmed, that obsolete continuation no
    // longer owns the shared pending state or any later trade draft.
    if (recovered) store.finish();
    store.update((value) =>
      value.inventoryReceipt === commandId || value.inventoryReceipt === undefined
        ? {
            ...value,
            draft: resolvedDraft(value.draft),
            inventoryReceipt: undefined,
            uncertain: false,
          }
        : value,
    );
  };
}
