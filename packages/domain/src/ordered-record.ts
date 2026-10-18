import { readOnlyDraftView } from './draft.js';
import {
  objectIndexEntries,
  objectIndexGet,
  objectIndexSet,
  type ObjectIndexNode,
} from './object-index.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { countDomainWork } from './diagnostic-counters.js';

/** Canonical exact-key records. Only a short immutable branch changes per write;
 * old snapshots and forks share untouched branches. No records are discarded. */
export interface OrderedRecord<T> {
  root?: ObjectIndexNode<T>;
  size: number;
}
export function orderedRecordGet<T>(records: OrderedRecord<T>, key: string): T | undefined {
  return objectIndexGet(readOnlyDraftView(records).root, key);
}
/** Preserve the existing own-record lookup's supported external identity check. */
export function orderedRecordOwn<T>(records: OrderedRecord<T>, key: unknown): T | undefined {
  return isSafeRecordId(key) ? orderedRecordGet(records, key) : undefined;
}
export function orderedRecordSet<T>(
  records: OrderedRecord<T>,
  key: string,
  value: T | undefined,
): void {
  const view = readOnlyDraftView(records);
  const prior = objectIndexGet(view.root, key);
  if (prior === value) return;
  const next = objectIndexSet(view.root, key, value);
  records.size = view.size + (prior === undefined ? 1 : 0) - (value === undefined ? 1 : 0);
  records.root = next;
}
export function orderedRecordEntries<T>(records: OrderedRecord<T>): Generator<[string, T]> {
  return objectIndexEntries(readOnlyDraftView(records).root);
}
/** Compare immutable persistent branches without enumerating their unchanged values.
 * Two ordered cursors also cover rotations, insertions, removals and independent forks.
 * Mutable construction deliberately retains the caller's complete comparison. */
export function orderedRecordChangedKeys<T>(
  before: OrderedRecord<T>,
  after: OrderedRecord<T>,
): ReadonlySet<string> | undefined {
  if (!Object.isFrozen(before) || !Object.isFrozen(after)) return;
  type Part = { node: ObjectIndexNode<T>; entry: boolean };
  const a: Part[] = before.root ? [{ node: before.root, entry: false }] : [];
  const b: Part[] = after.root ? [{ node: after.root, entry: false }] : [];
  const changed = new Set<string>();
  const expand = (parts: Part[]) => {
    const { node } = parts.pop()!;
    countDomainWork('orderedRecordBranchesVisited');
    if (node.right) parts.push({ node: node.right, entry: false });
    parts.push({ node, entry: true });
    if (node.left) parts.push({ node: node.left, entry: false });
  };
  while (a.length || b.length) {
    const left = a.at(-1),
      right = b.at(-1);
    if ((left && !Object.isFrozen(left.node)) || (right && !Object.isFrozen(right.node))) return;
    if (left && right && !left.entry && !right.entry && left.node === right.node) {
      a.pop();
      b.pop();
    } else if ((left && !left.entry) || (right && !right.entry)) {
      if (left && !left.entry) expand(a);
      if (right && !right.entry) expand(b);
    } else if (!right || (left && left.node.key < right.node.key)) {
      changed.add(a.pop()!.node.key);
    } else if (!left || right.node.key < left.node.key) {
      changed.add(b.pop()!.node.key);
    } else {
      if (left.node.value !== right.node.value) changed.add(left.node.key);
      a.pop();
      b.pop();
    }
  }
  return changed;
}
/** Current-format admission checks the actual shape traversed by lookup/update.
 * Iterative validation refuses cycles, broken ordering/balance and false counts. */
export function validateOrderedRecord(
  value: unknown,
  validValue: (entry: unknown) => boolean,
): void {
  const invalid = () => {
    throw new Error('Invalid ordered records.');
  };
  if (
    !hasRecordFields(value, ['size'], ['root']) ||
    !Number.isSafeInteger(value.size) ||
    (value.size as number) < 0
  )
    return invalid();
  const pending: { node: unknown; lower?: string; upper?: string }[] =
    value.root === undefined ? [] : [{ node: value.root }];
  const seen = new Set<object>();
  while (pending.length) {
    const { node: entry, lower, upper } = pending.pop()!;
    if (
      !hasRecordFields(entry, ['key', 'value', 'height', 'maximum'], ['left', 'right']) ||
      typeof entry.key !== 'string' ||
      (lower !== undefined && entry.key <= lower) ||
      (upper !== undefined && entry.key >= upper) ||
      seen.has(entry) ||
      !validValue(entry.value)
    )
      return invalid();
    seen.add(entry);
    const childHeight = (child: unknown): number => {
      if (child === undefined) return 0;
      if (!child || typeof child !== 'object' || !Object.hasOwn(child, 'height')) return invalid();
      const height = (child as { height: unknown }).height;
      return Number.isSafeInteger(height) && (height as number) > 0
        ? (height as number)
        : invalid();
    };
    const left = childHeight(entry.left),
      right = childHeight(entry.right);
    if (
      entry.height !== Math.max(left, right) + 1 ||
      Math.abs(left - right) > 1 ||
      entry.maximum !== 0
    )
      return invalid();
    if (entry.left !== undefined) pending.push({ node: entry.left, lower, upper: entry.key });
    if (entry.right !== undefined) pending.push({ node: entry.right, lower: entry.key, upper });
  }
  if (seen.size !== value.size) invalid();
}
