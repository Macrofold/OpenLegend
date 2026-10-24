import type { SemanticChange } from './dependencies.js';
import type { WorldState } from './types.js';

type Feed = {
  complete: boolean;
  changes: Array<{ id: string; physical: boolean }>;
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
  physical = false,
): ReadonlySet<string> | undefined {
  const feed = feeds.get(world);
  if (!feed?.complete) return;
  const before = feed.readers.get(owner);
  feed.readers.set(owner, feed.changes.length);
  if (before === undefined) return;
  const ids = new Set<string>();
  for (let index = before; index < feed.changes.length; index++) {
    const change = feed.changes[index]!;
    if (!physical || change.physical) ids.add(change.id);
  }
  return ids;
}
