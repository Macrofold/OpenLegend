import { describe, expect, it } from 'vitest';
import { clearDraft, readDraft, saveDraft } from './draft';

function memoryStorage(initial: Array<[string, string]> = []) {
  const data = new Map(initial);
  const storage = () => ({
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  });
  return { data, storage };
}

describe('local composer draft', () => {
  it('restores exact invention text and intent, then removes a cleared draft', () => {
    const { data, storage } = memoryStorage();
    const draft = { text: '  Could we make a sling?\n', mode: 'invention' as const };
    saveDraft(draft, storage);
    expect(readDraft(storage)).toEqual(draft);
    saveDraft({ text: '', mode: 'invention' }, storage);
    expect(readDraft(storage)).toEqual({ text: '', mode: 'chat' });
    expect(data.size).toBe(0);
  });

  it('never reads obsolete private text and clears all known keys on access replacement', () => {
    const { data, storage } = memoryStorage([['open-legend:composer-draft:v1', 'An older draft']]);
    expect(readDraft(storage)).toEqual({ text: '', mode: 'chat' });
    data.set(
      'open-legend:composer-draft:v2',
      JSON.stringify({ text: 'Current', mode: 'invention' }),
    );
    clearDraft(storage);
    expect(data.size).toBe(0);
    expect(readDraft(storage)).toEqual({ text: '', mode: 'chat' });
  });

  it.each(['{broken', '{"text":"Wrong route","mode":"unknown"}'])(
    'does not turn malformed current data into a recovered older draft: %s',
    (saved) => {
      const { storage } = memoryStorage([
        ['open-legend:composer-draft:v2', saved],
        ['open-legend:composer-draft:v1', 'Recoverable draft'],
      ]);
      expect(readDraft(storage)).toEqual({ text: '', mode: 'chat' });
    },
  );

  it('does not block editing when browser privacy policy rejects storage access', () => {
    const unavailable = () => {
      throw new Error('Storage is unavailable');
    };
    expect(readDraft(unavailable)).toEqual({ text: '', mode: 'chat' });
    expect(() => saveDraft({ text: 'Keep writing', mode: 'chat' }, unavailable)).not.toThrow();
    expect(() => clearDraft(unavailable)).not.toThrow();
  });

  it('does not block editing when storage quota is exhausted', () => {
    const full = () => ({
      getItem: () => JSON.stringify({ text: 'Existing draft', mode: 'chat' }),
      setItem: () => {
        throw new Error('Quota exceeded');
      },
      removeItem: () => undefined,
    });
    expect(() => saveDraft({ text: 'A new draft', mode: 'invention' }, full)).not.toThrow();
    expect(readDraft(full)).toEqual({ text: 'Existing draft', mode: 'chat' });
  });
});
