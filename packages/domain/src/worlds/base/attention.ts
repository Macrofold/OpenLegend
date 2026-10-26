import type { AttentionPolicy, RecordingInput, RecordingReason } from '../../attention.js';
import type { Entity, WorldState } from '../../types.js';
import { readAttribute } from '../../world-modules.js';

/** The selected world's initial qualified envelope, not a universal mind capacity.
 * docs/worlds/base/attention.md */
export const BASE_ATTENTION_POLICY: AttentionPolicy = {
  geometry: { intervalSeconds: 15, patchVisits: 64, indexVisits: 64, patchMetres: 2, errorMetres: 0.125, maxFragments: 256, preparationPatches: 512 },
  semantic: { discovery: true, coalesceMs: 250, deadlineMs: 5000 },
  scene: {
    maxBytes: 12 * 1024, maxRows: 48, nodeVisits: 128,
    staticBytes: 3 * 1024, staticRows: 8, discoveryBytes: 2 * 1024, discoveryRows: 8,
    historyBytes: 8 * 1024, historyReceipts: 128,
    candidateVisits: 512, initialVisits: 384, queryVisits: 128, perAnchorVisits: 64,
    maximumQueries: 4, expansionBytes: 8 * 1024, expansionReceipts: 128,
  },
  id: 'wilderness:attention',
  version: 1,
  defaultCapacity: 10,
  maximumCapacity: 15,
  stabilitySeconds: 120,
  switchMargin: 2,
  familiarityBonus: 3,
  displacementMetresPerPoint: 2,
  maximumMotionCue: 4,
  newDescriptionCue: 2,
  urgentCue: 8,
  relation: {
    intervalSeconds: 15,
    candidates: 128,
    clearSeconds: 120,
    minimumDecrease: 0.25,
    body: { enter: 4, clear: 6 },
    drop: { enter: 20, clear: 25, minimumDrop: 1 },
  },
  retention: {
    recent: { maxAgeSeconds: 21_600, maxBytes: 8 * 1024 * 1024, maxChanges: 131_072, chunkBytes: 65_536, residentChunks: 2 },
    optional: { maxBytes: 4 * 1024 * 1024, maxRecords: 2048 },
    required: { maxBytes: 4 * 1024 * 1024, maxRecords: 512 },
    speech: { maxBytes: 8 * 1024 * 1024, maxRecords: 512 },
    derivedMaxBytes: 1024 * 1024,
    impression: { maxBytes: 4096, maxClaims: 16, maxSpans: 8, weakenAfterSeconds: 604_800, expireAfterSeconds: 2_592_000, reinforceIntervalSeconds: 86_400 },
    aftermathSeconds: 86_400,
  },
};

export function baseAttentionCapacity(world: WorldState, observer: Entity): number {
  if (observer.actor?.attentionCapacity !== undefined) return observer.actor.attentionCapacity;
  const focus = world.moduleManifest.definitions.find((definition) => definition.id === 'wilderness:focus');
  const value = (focus ? readAttribute(world, observer, focus) : undefined) ?? 50;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100)
    throw new Error('Installed Focus must be in 0–100.');
  return Math.round(5 + value / 10);
}

/** Lasting admission is separate from current receipt and attended recent capture. */
export function baseRecordingReason(world: WorldState, input: RecordingInput): RecordingReason {
  if (input.source === 'confirmation') return 'none';
  if (input.eventType === 'speech' || input.hasExposure) return 'required';
  if (input.own && input.consequence) return 'required';
  if (input.eventType && world.cognitionPolicy.significantEventTypes.includes(input.eventType))
    return 'required';
  if (input.eventType && ['inventory-inspected', 'item-inspected', 'learned', 'taught', 'recipe-learned'].includes(input.eventType))
    return 'required';
  if (input.eventType === 'encounter') return 'none';
  // These are received outward outcomes, not the private action that caused them.
  if (input.eventType && ['struck', 'projectile-contact', 'fire-out', 'fire-lit', 'fire-extinguished', 'crafted', 'construction-phase', 'cover-lowered'].includes(input.eventType))
    return 'optional';
  if (input.source === 'summary' || (input.source === 'memory' && input.own)) return 'optional';
  return input.consequence ? 'optional' : 'none';
}
