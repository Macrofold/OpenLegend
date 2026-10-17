import { describe, expect, it } from 'vitest';
import { clearDraft, composerDraftKey, emptyDraft, readDraft, saveDraft } from './draft';

function memoryStorage(initial: Array<[string, string]> = []) {
  const data = new Map(initial);
  const storage = () => ({
    ...Object.fromEntries(data),
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
  it('restores exact text in its selected mode, then removes a cleared draft', () => {
    const { data, storage } = memoryStorage();
    const key = composerDraftKey('private-owner', 'act', null);
    const draft = { text: '  Could we make a sling?\n', revision: 'edit-1' };
    saveDraft(key, draft, storage);
    expect(readDraft(key, storage)).toEqual(draft);
    saveDraft(key, { text: '', revision: 'edit-2' }, storage);
    expect(readDraft(key, storage)).toEqual(emptyDraft());
    expect(data.size).toBe(0);
  });

  it('keeps recipients, private owners and action drafts separate without choosing a person', () => {
    const { data, storage } = memoryStorage();
    const key = composerDraftKey('owner-a', 'speak', 'person-a');
    const draft = {
      text: 'What do you think?',
      revision: 'edit-1',
      item: { itemId: 'permitted-item', name: 'Copper cup' },
    };
    saveDraft(key, draft, storage);
    expect(readDraft(key, storage)).toEqual(draft);
    for (const other of [
      composerDraftKey('owner-a', 'speak', 'person-b'),
      composerDraftKey('owner-b', 'speak', 'person-a'),
      composerDraftKey('owner-a', 'act', 'person-a'),
      composerDraftKey('owner-a', 'speak', null),
      composerDraftKey(null, 'speak', 'person-a'),
    ])
      expect(readDraft(other, storage)).toEqual(emptyDraft());
    saveDraft(null, draft, storage);
    expect(data.size).toBe(1);
  });

  it('clears private composer drafts for every recipient and owner on access replacement', () => {
    const firstKey = composerDraftKey('owner-a', 'speak', 'person-a')!;
    const secondKey = composerDraftKey('owner-b', 'act', null)!;
    const { data, storage } = memoryStorage([
      [firstKey, JSON.stringify({ text: 'First private draft', revision: 'edit-1' })],
      [secondKey, JSON.stringify({ text: 'Second private draft', revision: 'edit-2' })],
      ['unrelated-preference', 'preserved'],
    ]);
    clearDraft(storage);
    expect(readDraft(firstKey, storage)).toEqual(emptyDraft());
    expect(readDraft(secondKey, storage)).toEqual(emptyDraft());
    expect([...data]).toEqual([['unrelated-preference', 'preserved']]);
  });

  it.each([
    '{broken',
    '{"text":"Missing revision"}',
    '{"text":"Wrong item","revision":"edit-1","item":{}}',
  ])('rejects a malformed current record without reading another draft: %s', (saved) => {
    const key = composerDraftKey('owner-a', 'speak', 'person-a')!;
    const otherKey = composerDraftKey('owner-a', 'speak', 'person-b')!;
    const { storage } = memoryStorage([
      [key, saved],
      [otherKey, JSON.stringify({ text: 'Another person', revision: 'edit-1' })],
    ]);
    expect(readDraft(key, storage)).toEqual(emptyDraft());
    expect(readDraft(otherKey, storage).text).toBe('Another person');
  });

  it('does not block editing when browser privacy policy rejects storage access', () => {
    const unavailable = () => {
      throw new Error('Storage is unavailable');
    };
    expect(readDraft('scoped-draft', unavailable)).toEqual(emptyDraft());
    expect(() =>
      saveDraft('scoped-draft', { text: 'Keep writing', revision: 'edit-1' }, unavailable),
    ).not.toThrow();
    expect(() => clearDraft(unavailable)).not.toThrow();
  });

  it('does not block editing when storage quota is exhausted', () => {
    const existing = { text: 'Existing draft', revision: 'edit-1' };
    const full = () => ({
      getItem: () => JSON.stringify(existing),
      setItem: () => {
        throw new Error('Quota exceeded');
      },
      removeItem: () => undefined,
    });
    expect(() =>
      saveDraft('scoped-draft', { text: 'A new draft', revision: 'edit-2' }, full),
    ).not.toThrow();
    expect(readDraft('scoped-draft', full)).toEqual(existing);
  });
});
