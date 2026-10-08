import { useSyncExternalStore, type SetStateAction } from 'react';
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

interface TradeDraftStore {
  getSnapshot(): SavedTradeDraft & { pending: boolean };
  subscribe(listener: () => void): () => void;
  update(
    change: (
      previous: SavedTradeDraft & { pending: boolean },
    ) => SavedTradeDraft & { pending: boolean },
  ): void;
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
        const { pending: _pending, ...saved } = value;
        sessionStorage.setItem(key, JSON.stringify(saved));
      } catch {
        /* Browser storage is optional; sharing still works without it. */
      }
      for (const listener of listeners) listener();
      if (!listeners.size) releaseUnused();
    },
    start() {
      if (!store.active || value.pending || value.uncertain || value.inventoryReceipt) return false;
      store.update((previous) => ({ ...previous, pending: true }));
      return true;
    },
  };
  stores.set(key, store);
  return store;
}
/** One draft and submission guard for the Inventory and person views of the same offer. */
export function useTradeDraft(key: string, offers: ItemTradeView['offers']) {
  const store = tradeDraftStore(key, offers);
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
export function resolveTradeInventoryReceipt(scope: string, commandId: string) {
  const store = tradeDraftStore('open-legend:action-draft:trade:' + scope, []);
  store.update((value) =>
    value.inventoryReceipt === commandId
      ? { ...value, inventoryReceipt: undefined, uncertain: false }
      : value,
  );
}
