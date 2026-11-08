import { invalidateAttentionPreparation } from './attention.js';
import type { SemanticChange } from './dependencies.js';
import type { WorldState } from './types.js';
import { queueSightChange, invalidatePerceptionMeasurements } from './perception-timing.js';
import { countDomainWork } from './diagnostic-counters.js';

type Feed = {
  complete: boolean;
  changes: Array<{ id: string; physical: boolean; status: boolean }>;
  readers: WeakMap<object, number>;
};
const feeds = new WeakMap<WorldState, Feed>();
/** Bound derived deltas within one owned edit; overflow restores the ordinary
 * audit rather than dropping changes or imposing a gameplay/population quota. */
const MAX_NATIVE_CHANGES = 65_536;
/** Only the native mutation owner opts into complete semantic writes. Generic editor
 * drafts retain their existing full audit; indexes never infer an empty unknown set. */
export function beginNativeChangeFeed(world: WorldState): void {
  feeds.set(world, { complete: true, changes: [], readers: new WeakMap() });
}
export function nativeChangesComplete(world: WorldState): boolean {
  return feeds.get(world)?.complete === true;
}
export function recordNativeChange(world: WorldState, change: SemanticChange): void {
  queueSightChange(world, change);
  if (
    change.kind === 'state' &&
    !(change.field === 'behavior' && change.outwardChange === false) &&
    ['body', 'behavior', 'participation', 'contribution'].includes(change.field)
  ) {
    invalidatePerceptionMeasurements(world, change.entityId);
    invalidateAttentionPreparation(world, change.entityId);
  } else if (change.kind === 'geometry' || change.kind === 'membership') {
    invalidatePerceptionMeasurements(world);
    invalidateAttentionPreparation(world);
  }
  const feed = feeds.get(world);
  if (!feed?.complete) return;
  const id =
    'entityId' in change
      ? change.entityId
      : change.kind === 'knowledge'
        ? change.actorId
        : undefined;
  if (!id || feed.changes.length === MAX_NATIVE_CHANGES) {
    // Unknown/global writers and overflow require the conservative original audit.
    feed.complete = false;
    return;
  }
  feed.changes.push({
    id,
    // Knowledge is outside the supported status grammar. Positional motion is
    // irrelevant only when the spatial owner proves support unchanged; other
    // readers still receive every notice and unknown/global edits fall back.
    // docs/projects/bookkeeping-simplification-tech-design.md#n1--invalidate-status-preparation-only-when-its-inputs-may-change
    status:
      change.kind !== 'knowledge' &&
      !(change.kind === 'spatial' && change.supportUnchanged === true),
    physical:
      change.kind === 'spatial' ||
      (change.kind === 'state' && ['body', 'participation'].includes(change.field)),
  });
}
/** Each consumer visits only deltas since its own cursor. Scanning a whole dirty-ID
 * map per moving body would reintroduce quadratic work in a moving crowd. The first
 * read/unknown/overflow retains the original audit, with no shared mutable authority. */
export function takeNativeChanges(
  world: WorldState,
  owner: object,
  kind: 'all' | 'physical' | 'status' = 'all',
): ReadonlySet<string> | undefined {
  const feed = feeds.get(world);
  if (!feed?.complete) return;
  const before = feed.readers.get(owner);
  feed.readers.set(owner, feed.changes.length);
  if (before === undefined) return;
  const ids = new Set<string>();
  for (let index = before; index < feed.changes.length; index++) {
    const change = feed.changes[index]!;
    if (kind === 'all' || change[kind]) ids.add(change.id);
    else if (kind === 'status') countDomainWork('nativeStatusIrrelevantNoticesSkipped');
  }
  return ids;
}
