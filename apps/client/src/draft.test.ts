import { describe, expect, it } from 'vitest';
import { readDraft, saveDraft } from './draft';

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

  it('keeps plain text from the previous client and migrates its explicitly selected mode', () => {
    const { data, storage } = memoryStorage([['open-legend:composer-draft:v1', 'An older draft']]);
    expect(readDraft(storage)).toEqual({ text: 'An older draft', mode: 'chat' });
    saveDraft({ text: 'An older draft', mode: 'invention' }, storage);
    expect(readDraft(storage)).toEqual({ text: 'An older draft', mode: 'invention' });
    expect(data.has('open-legend:composer-draft:v1')).toBe(false);
    saveDraft({ text: '', mode: 'invention' }, storage);
    expect(readDraft(storage).text).toBe('');
  });

  it.each(['{broken', '{"text":"Wrong route","mode":"unknown"}'])(
    'ignores malformed saved intent without losing a recoverable legacy draft: %s',
    (saved) => {
      const { storage } = memoryStorage([
        ['open-legend:composer-draft:v2', saved],
        ['open-legend:composer-draft:v1', 'Recoverable draft'],
      ]);
      expect(readDraft(storage)).toEqual({ text: 'Recoverable draft', mode: 'chat' });
    },
  );

  it('does not block editing when browser privacy policy rejects storage access', () => {
    const unavailable = () => {
      throw new Error('Storage is unavailable');
    };
    expect(readDraft(unavailable)).toEqual({ text: '', mode: 'chat' });
    expect(() => saveDraft({ text: 'Keep writing', mode: 'chat' }, unavailable)).not.toThrow();
  });

  it('does not block editing when storage quota is exhausted', () => {
    const full = () => ({
      getItem: () => 'Existing draft',
      setItem: () => {
        throw new Error('Quota exceeded');
      },
      removeItem: () => undefined,
    });
    expect(() => saveDraft({ text: 'A new draft', mode: 'invention' }, full)).not.toThrow();
    expect(readDraft(full)).toEqual({ text: 'Existing draft', mode: 'chat' });
  });
});
