import type { GameView } from '@open-legend/protocol';

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type GetStorage = () => DraftStorage;
export type ComposerMode = 'chat' | 'invention';
export interface ComposerItem {
  itemId: string;
  name: string;
}
export interface ComposerDraft {
  text: string;
  revision: string;
  item?: ComposerItem;
}
export const emptyDraft = (): ComposerDraft => ({ text: '', revision: '' });

/** Connection scope can change without changing whose private draft this is. */
export function composerDraftScope(view: GameView): string | null {
  const access = view.access;
  if (
    !access?.privateDraftScope ||
    !access.controlling ||
    access.actorId !== view.player.id ||
    view.player.participation === 'inactive'
  )
    return null;
  return JSON.stringify([
    access.privateDraftScope,
    view.worldId,
    access.actorId,
    view.saveTimeline ?? '',
  ]);
}

export function composerDraftKey(
  scope: string | null,
  mode: ComposerMode,
  recipientId: string | null,
): string | null {
  if (!scope || (mode === 'chat' && !recipientId)) return null;
  return `open-legend:composer-draft:${JSON.stringify([scope, mode, mode === 'chat' ? recipientId : null])}`;
}

/** Session storage keeps exact text in this tab, for this character and recipient only. */
export function readDraft(
  key: string | null,
  getStorage: GetStorage = () => window.sessionStorage,
): ComposerDraft {
  if (!key) return emptyDraft();
  try {
    const saved = getStorage().getItem(key);
    if (!saved) return emptyDraft();
    const draft: unknown = JSON.parse(saved);
    if (
      typeof draft !== 'object' ||
      draft === null ||
      !('text' in draft) ||
      typeof draft.text !== 'string' ||
      !('revision' in draft) ||
      typeof draft.revision !== 'string'
    )
      return emptyDraft();
    if ('item' in draft && draft.item !== undefined) {
      const item = draft.item;
      if (
        typeof item !== 'object' ||
        item === null ||
        !('itemId' in item) ||
        typeof item.itemId !== 'string' ||
        !('name' in item) ||
        typeof item.name !== 'string'
      )
        return emptyDraft();
      return {
        text: draft.text,
        revision: draft.revision,
        item: { itemId: item.itemId, name: item.name },
      };
    }
    return { text: draft.text, revision: draft.revision };
  } catch {
    // Privacy and quota failures must not prevent editing in memory.
    return emptyDraft();
  }
}

export function saveDraft(
  key: string | null,
  draft: ComposerDraft,
  getStorage: GetStorage = () => window.sessionStorage,
): void {
  if (!key) return;
  try {
    const storage = getStorage();
    if (draft.text || draft.item) storage.setItem(key, JSON.stringify(draft));
    else storage.removeItem(key);
  } catch {
    // Storage is optional; never change a draft or its send behavior to fit it.
  }
}
