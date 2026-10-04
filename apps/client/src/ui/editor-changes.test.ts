import { describe, expect, it } from 'vitest';
import type { GodMemoryEditorEntry, GodWorldEventEditorEntry } from '@open-legend/protocol';
import { memoryEditorChanges, worldEventEditorChanges } from './editor-changes';

const memory = (id: number): GodMemoryEditorEntry => ({
  id: `memory:${id}`,
  source: 'memory',
  label: 'Raw',
  text: `Memory ${id}`,
  time: id,
  tags: [],
  hash: `hash-${id}`,
  json: JSON.stringify({ id, summary: `Memory ${id}` }),
});
const event = (id: number): GodWorldEventEditorEntry => ({
  id: `event-${id}`,
  type: 'observed',
  text: `Event ${id}`,
  time: id,
  actors: [],
  hash: `hash-${id}`,
  json: JSON.stringify({ id: `event-${id}`, text: `Event ${id}` }),
});

describe('God editor delta requests', () => {
  it('sends one changed memory from a mature list and preserves the baseline hash', () => {
    const loaded = Array.from({ length: 5_000 }, (_, id) => memory(id));
    const current = [...loaded];
    const changes = memoryEditorChanges(
      loaded,
      current,
      new Set(['memory:2500']),
      new Map([['memory:2500', JSON.stringify({ id: 2500, summary: 'Changed one line' })]]),
    );
    expect(changes).toEqual([
      {
        entryId: 'memory:2500',
        expectedHash: 'hash-2500',
        replacement: { source: 'memory', value: { id: 2500, summary: 'Changed one line' } },
      },
    ]);
    expect(Buffer.byteLength(JSON.stringify({ memoryChanges: changes }))).toBeLessThan(1_000);
  });

  it('sends only a selected deletion from a mature event list', () => {
    const loaded = Array.from({ length: 5_000 }, (_, id) => event(id));
    const current = loaded.filter((entry) => entry.id !== 'event-2500');
    const changes = worldEventEditorChanges(loaded, current, new Set(['event-2500']), new Map());
    expect(changes).toEqual([{ id: 'event-2500', expectedHash: 'hash-2500', replacement: null }]);
    expect(Buffer.byteLength(JSON.stringify({ changes }))).toBeLessThan(1_000);
  });

  it('identifies malformed JSON by editor field without sending any request', () => {
    expect(() =>
      memoryEditorChanges(
        [memory(1)],
        [memory(1)],
        new Set(['memory:1']),
        new Map([['memory:1', '{']]),
      ),
    ).toThrow('memory JSON is invalid');
    expect(() =>
      worldEventEditorChanges(
        [event(1)],
        [event(1)],
        new Set(['event-1']),
        new Map([['event-1', '{']]),
      ),
    ).toThrow('world event JSON is invalid');
  });
});
