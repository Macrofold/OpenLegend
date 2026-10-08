import { useSyncExternalStore, type SetStateAction } from 'react';
import { readInventoryCommand } from './inventory-command-record';
import type { ItemTradeView, TradeLotView } from '@open-legend/protocol';

export interface TradeDraft {
  give?: TradeLotView;
  receive?: TradeLotView;
  giveQuantity: string;
  receiveQuantity: string;
  prior?: { id: string; revision: number };
}
interface SavedTradeDraft {
  draft?: TradeDraft;
  reviewed: Record<string, number>;
  uncertain: boolean;
  inventoryReceipt?: string;
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
        typeof lot.whole === 'boolean');
    if (
      saved &&
      typeof saved.uncertain === 'boolean' &&
      (saved.inventoryReceipt === undefined || typeof saved.inventoryReceipt === 'string') &&
      saved.reviewed &&
      Object.values(saved.reviewed).every(Number.isSafeInteger) &&
      (!saved.draft ||
        (typeof saved.draft.giveQuantity === 'string' &&
          typeof saved.draft.receiveQuantity === 'string' &&
          lotValid(saved.draft.give) &&
          lotValid(saved.draft.receive) &&
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
type InventoryRecovery = { key?: string; scope: string };
interface TradeDraftStore {
  recovery?: InventoryRecovery;
  getSnapshot(): TradeState;
  subscribe(listener: () => void): () => void;
  update(change: (previous: TradeState) => TradeState): void;
  start(): boolean;
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
    getSnapshot: () => {
      if (store.recovery) {
        const original = store.recovery.key
          ? readInventoryCommand(store.recovery.key)
          : { status: 'unknown' as const };
        const blocked = !!original && !original.request;
        const receipt =
          original?.request?.tradeScope === store.recovery.scope
            ? original.request.commandId
            : undefined;
        const inventoryReceipt = blocked ? value.inventoryReceipt : receipt;
        if (value.inventoryReadBlocked !== blocked || value.inventoryReceipt !== inventoryReceipt)
          value = { ...value, inventoryReadBlocked: blocked, inventoryReceipt };
      }
      return value;
    },
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
      store.getSnapshot();
      if (
        !store.active ||
        value.pending ||
        value.uncertain ||
        value.inventoryReceipt ||
        value.inventoryReadBlocked
      )
        return false;
      store.update((previous) => ({ ...previous, pending: true }));
      return true;
    },
  };
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
  store.recovery = recovery;
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
    setPending: (pending: boolean) => field('pending', pending),
    start: store.start,
  };
}

/** Inventory owns this exact receipt; reviewing trade terms cannot release it. */
export function retainTradeInventoryReceipt(scope: string, commandId: string) {
  const store = tradeDraftStore('open-legend:action-draft:trade:' + scope, []);
  store.update((value) => ({ ...value, inventoryReceipt: commandId }));
}
export function prepareTradeInventoryReceiptResolution(scope: string, commandId: string) {
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
  const serialized = JSON.stringify({ ...retained, inventoryReceipt: undefined, uncertain: false });
  // Keep the live guard until Inventory has also removed its original request.
  // A failed write/read-back leaves that exact request available for another receipt check.
  sessionStorage.setItem(key, serialized);
  if (sessionStorage.getItem(key) !== serialized)
    throw new Error('The resolved trade receipt could not be retained. Check its original result.');
  return () => {
    store.update((value) =>
      value.inventoryReceipt === commandId || value.inventoryReceipt === undefined
        ? { ...value, inventoryReceipt: undefined, uncertain: false }
        : value,
    );
  };
}
