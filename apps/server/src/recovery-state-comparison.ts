import { isDeepStrictEqual } from 'node:util';
import {
  orderedRecordEntries,
  validateOrderedRecord,
  type OrderedRecord,
} from '../../../packages/domain/src/ordered-record.js';
import type { SavedWorld } from './saved-world.js';

const invalidProjection = Symbol('invalid recovery comparison');
const orderedEntries = Symbol('ordered entries');

function object(value: unknown): object {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalidProjection;
  return value;
}

/** Copy only the fixed comparison path, retaining own presence and prototypes. */
function replaceOwn(
  value: unknown,
  key: string,
  project: (value: unknown) => unknown,
  optional = false,
): object {
  const source = object(value);
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor) {
    if (optional) return source;
    throw invalidProjection;
  }
  if (!('value' in descriptor)) throw invalidProjection;
  if (optional && descriptor.value === undefined) return source;
  const descriptors = Object.getOwnPropertyDescriptors(source);
  descriptors[key] = { ...descriptor, value: project(descriptor.value) };
  return Object.create(Object.getPrototypeOf(source), descriptors);
}

function recentIndex(value: unknown): object {
  try {
    // Current-format admission owns value validation; comparison still requires
    // a valid complete tree before excluding its derived balancing fields.
    validateOrderedRecord(value, () => true);
  } catch (error) {
    if (
      error instanceof Error &&
      Object.getPrototypeOf(error) === Error.prototype &&
      error.message === 'Invalid ordered records.'
    )
      throw invalidProjection;
    throw error;
  }
  const records = value as OrderedRecord<unknown>;
  const descriptors = Object.getOwnPropertyDescriptors(records);
  delete descriptors['root'];
  const result = Object.create(Object.getPrototypeOf(records), descriptors);
  Object.defineProperty(result, orderedEntries, {
    value: [...orderedRecordEntries(records)],
    enumerable: true,
  });
  return result;
}

function temporalActors(value: unknown): object {
  const actors = object(value);
  const descriptors = Object.getOwnPropertyDescriptors(actors);
  for (const id of Object.keys(actors)) {
    const descriptor = descriptors[id]!;
    if (!('value' in descriptor)) throw invalidProjection;
    descriptors[id] = {
      ...descriptor,
      value: replaceOwn(descriptor.value, 'recent', (recent) =>
        replaceOwn(replaceOwn(recent, 'blocks', recentIndex), 'individuals', recentIndex),
      ),
    };
  }
  return Object.create(Object.getPrototypeOf(actors), descriptors);
}

function comparisonView(state: SavedWorld): object {
  return replaceOwn(state, 'world', (world) =>
    replaceOwn(
      world,
      'experience',
      (experience) =>
        replaceOwn(
          experience,
          'temporal',
          (temporal) => replaceOwn(temporal, 'actors', temporalActors),
          true,
        ),
      true,
    ),
  );
}

/** SQL rebuilds recent charge indexes from canonical temporal pages, not their
 * AVL insertion history (WorldRecords.body/restoreTemporalDirectories and
 * restoreReceivedRecentDirectory). Compare their complete ordered contents;
 * every other saved value retains the original strict recovery comparison.
 * See docs/save-and-load.md#current-history-capture-boundary. */
export function sameRecoveredSavedWorld(actual: SavedWorld, expected: SavedWorld): boolean {
  try {
    return isDeepStrictEqual(comparisonView(actual), comparisonView(expected));
  } catch (error) {
    if (error === invalidProjection) return false;
    throw error;
  }
}
