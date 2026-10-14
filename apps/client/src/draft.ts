const storageKey = 'open-legend:composer-draft:v2';
const obsoleteStorageKey = 'open-legend:composer-draft:v1';
type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type GetStorage = () => DraftStorage;
export type ComposerMode = 'chat' | 'invention';
export interface ComposerDraft {
  text: string;
  mode: ComposerMode;
}
const emptyDraft = (): ComposerDraft => ({ text: '', mode: 'chat' });

/** Session storage keeps a draft through server restarts without sharing it between tabs. */
export function readDraft(getStorage: GetStorage = () => window.sessionStorage): ComposerDraft {
  try {
    const storage = getStorage();
    const saved = storage.getItem(storageKey);
    if (saved) {
      try {
        const draft: unknown = JSON.parse(saved);
        if (
          typeof draft === 'object' &&
          draft !== null &&
          'text' in draft &&
          typeof draft.text === 'string' &&
          'mode' in draft &&
          (draft.mode === 'chat' || draft.mode === 'invention')
        )
          return { text: draft.text.slice(0, 1000), mode: draft.mode };
      } catch {
        /* Malformed current data is not a draft. */
      }
    }
    return emptyDraft();
  } catch {
    // Some embedded/private browsers disable storage; editing must still work.
    return emptyDraft();
  }
}

/** Access replacement clears every known private composer key without reading old formats. */
export function clearDraft(getStorage: GetStorage = () => window.sessionStorage): void {
  try {
    const storage = getStorage();
    storage.removeItem(storageKey);
    storage.removeItem(obsoleteStorageKey);
  } catch {
    // Storage can be disabled independently of in-memory editing.
  }
}

export function saveDraft(
  draft: ComposerDraft,
  getStorage: GetStorage = () => window.sessionStorage,
): void {
  try {
    const storage = getStorage();
    // Save intent with text so returning from setup cannot turn an invention into speech.
    if (draft.text)
      storage.setItem(
        storageKey,
        JSON.stringify({ text: draft.text.slice(0, 1000), mode: draft.mode }),
      );
    else storage.removeItem(storageKey);
    storage.removeItem(obsoleteStorageKey);
  } catch {
    // Quota/privacy failures must not break input or change submission behavior.
  }
}
