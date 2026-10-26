import { expect, it } from 'vitest';
import { createWorld, PLAYER_ID } from './data.js';
import { selectedTemporalPolicy } from './world-composition.js';
import { createRememberedImpression } from './remembered-impressions.js';
import type { MemoryRecord } from './types.js';

it('preserves original experience age when native conversion runs late', () => {
  const limits = selectedTemporalPolicy(createWorld(61)).impression;
  const record: MemoryRecord = {
    id: 'age-source',
    actorId: PLAYER_ID,
    kind: 'episode',
    source: 'felt',
    at: 10,
    summary: 'My arm hurt after a fall.',
    eventType: 'fall',
    entityIds: [],
    importance: 4,
    retention: { reason: 'consequence' },
  };
  const provenance = [
    {
      actorId: PLAYER_ID,
      physicalLife: 0,
      epoch: 'age-epoch',
      family: 'temporal-receipt' as const,
      from: 0,
      through: 0,
    },
  ];
  const dependencies = [{ kind: 'memory' as const, id: record.id, revision: 'a'.repeat(64) }];
  const first = createRememberedImpression(record, provenance, 20, limits, dependencies)!;
  expect(first.impression).toMatchObject({
    createdAt: 20,
    reinforcedAt: 10,
    weakenAt: 10 + limits.weakenAfterSeconds,
    expiresAt: 10 + limits.expireAfterSeconds,
  });
  const late = createRememberedImpression(
    record,
    provenance,
    11 + limits.weakenAfterSeconds,
    limits,
    dependencies,
  )!;
  expect(late.summary).toBe('');
  expect(late.impression!.weakened).toBe(true);
  expect(late.impression!.claims).toEqual([
    { kind: 'occurrence', eventType: 'fall', role: 'direct' },
  ]);
  expect(
    createRememberedImpression(
      record,
      provenance,
      10 + limits.expireAfterSeconds,
      limits,
      dependencies,
    ),
  ).toBeUndefined();
});
