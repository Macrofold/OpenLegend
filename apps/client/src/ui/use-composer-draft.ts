import { useRef, useState } from 'react';
import { emptyDraft, readDraft, saveDraft, type ComposerDraft } from '../draft';

type Drafts = { scope: string | null; records: Record<string, ComposerDraft> };

/** Recipient changes preserve drafts; private-owner changes cannot show the old text for a frame. */
export function useComposerDraft(scope: string | null, key: string | null) {
  const [saved, setSaved] = useState<Drafts>({ scope, records: {} });
  let current = saved.scope === scope ? saved : { scope, records: {} };
  if (key && !current.records[key])
    current = { scope, records: { ...current.records, [key]: readDraft(key) } };
  if (current !== saved) setSaved(current);
  const latest = useRef(current);
  latest.current = current;

  function write(targetKey: string, draft: ComposerDraft) {
    const next = { scope, records: { ...latest.current.records, [targetKey]: draft } };
    latest.current = next;
    setSaved(next);
    // Persist in the edit handler, never an effect that can run after access cleanup.
    saveDraft(targetKey, draft);
  }
  return {
    draft: (key && current.records[key]) || emptyDraft(),
    edit: (change: Partial<Pick<ComposerDraft, 'text' | 'item'>>) => {
      if (!key || !scope || latest.current.scope !== scope) return;
      write(key, {
        ...(latest.current.records[key] ?? emptyDraft()),
        ...change,
        revision: crypto.randomUUID(),
      });
    },
    clearSent: (sent: { scope: string; key: string; revision: string }) => {
      // Equal text is insufficient: editing and undoing while a send is pending is still a new draft.
      if (
        latest.current.scope !== sent.scope ||
        latest.current.records[sent.key]?.revision !== sent.revision
      )
        return;
      write(sent.key, { text: '', revision: crypto.randomUUID() });
    },
  };
}
