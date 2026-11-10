import { AsyncLocalStorage } from 'node:async_hooks';
import type { NativeWorld, NativeWorldConsumer } from '@open-legend/native-simulation';

type Admission = Pick<NativeWorld, 'reserveConsumerBytes' | 'reserveConsumerJson'>;
const preparation = new AsyncLocalStorage<{ budget: Admission; guards: NativeWorldConsumer[] }>();
interface Frame {
  budget: Admission;
  guards: NativeWorldConsumer[];
  parent?: Frame;
}
const frames = new AsyncLocalStorage<Frame>();

/** Native bootstrap uses the existing current-row codecs inside its own
 * finite memory owner. Ordinary Source callers keep their existing owner. */
export async function withNativeSourcePreparation<T>(
  budget: Admission,
  read: () => Promise<T>,
): Promise<T> {
  const owner = { budget, guards: [] as NativeWorldConsumer[] };
  try {
    return await preparation.run(owner, read);
  } finally {
    release(owner);
  }
}

function release(frame: { guards: NativeWorldConsumer[] }): void {
  for (const guard of frame.guards) guard.release();
  frame.guards.length = 0;
}

export async function prepareNativeSource<T>(read: () => Promise<T>): Promise<T> {
  const budget = preparation.getStore()?.budget;
  if (!budget) return read();
  const frame = { budget, guards: [] as NativeWorldConsumer[], parent: frames.getStore() };
  try {
    return await frames.run(frame, read);
  } finally {
    release(frame);
  }
}

export function prepareNativeSourceSync<T>(read: () => T): T {
  const budget = preparation.getStore()?.budget;
  if (!budget) return read();
  const frame = { budget, guards: [] as NativeWorldConsumer[], parent: frames.getStore() };
  try {
    return frames.run(frame, read);
  } finally {
    release(frame);
  }
}

/** Parsed source data is preparation, with no grant or mutable-world role.
 * Keep its actual guards until this source section finishes; indexes may
 * retain strings from earlier rows while later SQL queries are still awaited. */
export function parseSourceJson<T>(text: string, copies = 1): T {
  return decodeSourceJson(text, () => JSON.parse(text) as T, copies);
}

export function decodeSourceJson<T>(text: string, decode: () => T, copies = 1): T {
  const budget = preparation.getStore()?.budget;
  if (!budget) return decode();
  const frame = frames.getStore();
  if (!frame) throw new Error('Native source JSON has no preparation owner.');
  const length = Buffer.byteLength(text);
  const carrier = budget.reserveConsumerBytes(length + 256);
  try {
    const buffer = Buffer.allocUnsafeSlow(length);
    buffer.write(text, 0, 'utf8');
    for (let copy = 0; copy < copies; copy++) frame.guards.push(budget.reserveConsumerJson(buffer));
    return decode();
  } finally {
    carrier.release();
  }
}

/** Generated DTO strings, pins and selected IDs outlive parser workspace.
 * Independent custody lasts through input encoding, without retaining a world. */
export function retainPreparedSource<T extends object>(value: T): T {
  const section = preparation.getStore();
  if (!section) return value;
  // A row's selected IDs escape into the surrounding SQL selection, not the
  // later input encoder. Definition DTOs have no parent parser and escape to
  // that encoder. End each guard at its actual last consumer.
  const owner = frames.getStore()?.parent ?? section;
  const bytes = (item: unknown): number => {
    if (typeof item === 'string') return 64 + 2 * item.length;
    if (!item || typeof item !== 'object') return 8;
    if (Array.isArray(item)) {
      let total = 64 + 8 * item.length;
      for (const child of item) total += bytes(child);
      return total;
    }
    let total = 128;
    for (const key in item)
      if (Object.hasOwn(item, key))
        total += 128 + 2 * key.length + bytes((item as Record<string, unknown>)[key]);
    return total;
  };
  owner.guards.push(owner.budget.reserveConsumerBytes(bytes(value)));
  return value;
}
