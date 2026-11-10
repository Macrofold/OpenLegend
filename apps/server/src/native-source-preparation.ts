import { AsyncLocalStorage } from 'node:async_hooks';
import type { NativeWorld, NativeWorldConsumer } from '@open-legend/native-simulation';
import type { SqlDatabase } from './store.js';

type Admission = Pick<NativeWorld, 'reserveConsumerBytes' | 'reserveConsumerJson'>;
interface Section {
  budget: Admission;
  guards: NativeWorldConsumer[];
  closed: boolean;
}
const preparation = new AsyncLocalStorage<Section>();
interface Frame {
  section: Section;
  closed: boolean;
  budget: Admission;
  guards: NativeWorldConsumer[];
  parent?: Frame;
}
const frames = new AsyncLocalStorage<Frame>();

/** Timers own later work, not the finite SQL/source graph which created them. */
export function withoutNativeSqlPreparation<T>(
  db: Pick<SqlDatabase, 'withoutReadTransferAdmission'>,
  operation: () => T,
): T {
  return preparation.exit(() =>
    frames.exit(() =>
      db.withoutReadTransferAdmission ? db.withoutReadTransferAdmission(operation) : operation(),
    ),
  );
}
function currentSection(): Section | undefined {
  const section = preparation.getStore();
  return section?.closed ? undefined : section;
}
function currentFrame(section: Section): Frame | undefined {
  const frame = frames.getStore();
  return frame && !frame.closed && frame.section === section ? frame : undefined;
}

/** Native bootstrap uses the existing current-row codecs inside its own
 * finite memory owner. Ordinary Source callers keep their existing owner. */
export async function withNativeSourcePreparation<T>(
  budget: Admission,
  read: () => Promise<T>,
): Promise<T> {
  const owner = { budget, guards: [] as NativeWorldConsumer[], closed: false };
  try {
    return await preparation.run(owner, read);
  } finally {
    release(owner);
  }
}

/** One actual PostgreSQL selection/factory owns raw transfers and parser frames
 * through its final consumer. Returning data requires a separate output owner. */
export async function withNativeSqlPreparation<T>(
  budget: Admission,
  db: Pick<SqlDatabase, 'withReadTransferAdmission'>,
  read: () => Promise<T>,
): Promise<T> {
  if (!db.withReadTransferAdmission)
    throw new Error('Native preparation requires admitted PostgreSQL transfers.');
  const roots: NativeWorldConsumer[] = [];
  let active = true;
  try {
    return await withNativeSourcePreparation(budget, () =>
      prepareNativeSource(() =>
        db.withReadTransferAdmission!((bytes, rows) => {
          // Long-lived repository timers may inherit this async context. They
          // have their own callers; a finished frame cannot acquire new roots.
          if (!active) return;
          // Driver wire plus UTF-16 fields; per-row space covers row/current-row
          // objects, indexed-cell/grouping arrays and lookup entries. Rich JSON
          // and array columns have their own pre-decode admissions below.
          const bound = 3 * bytes + 1536 * rows + 512;
          if (!Number.isSafeInteger(bound))
            throw new Error('Native SQL transfer exceeds capacity.');
          roots.push(budget.reserveConsumerBytes(bound));
        }, read),
      ),
    );
  } finally {
    active = false;
    for (const root of roots) root.release();
    roots.length = 0;
  }
}

function release(frame: { guards: NativeWorldConsumer[]; closed: boolean }): void {
  frame.closed = true;
  for (const guard of frame.guards) guard.release();
  frame.guards.length = 0;
}

export async function prepareNativeSource<T>(read: () => Promise<T>): Promise<T> {
  const section = currentSection();
  if (!section) return read();
  const { budget } = section;
  const frame = {
    section,
    closed: false,
    budget,
    guards: [] as NativeWorldConsumer[],
    parent: currentFrame(section),
  };
  try {
    return await frames.run(frame, read);
  } finally {
    release(frame);
  }
}

export function prepareNativeSourceSync<T>(read: () => T): T {
  const section = currentSection();
  if (!section) return read();
  const { budget } = section;
  const frame = {
    section,
    closed: false,
    budget,
    guards: [] as NativeWorldConsumer[],
    parent: currentFrame(section),
  };
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
  const section = currentSection();
  if (!section) return decode();
  const frame = currentFrame(section);
  if (!frame) throw new Error('Native source JSON has no preparation owner.');
  return decodeOwnedJson(frame, text, decode, copies);
}

function decodeOwnedJson<T>(
  frame: { budget: Admission; guards: NativeWorldConsumer[] },
  text: string,
  decode: () => T,
  copies = 1,
  refused?: (error: unknown) => void,
): T {
  const { budget } = frame;
  const length = Buffer.byteLength(text);
  const carrier = admitColumn(() => budget.reserveConsumerBytes(length + 256), refused);
  try {
    const buffer = Buffer.allocUnsafeSlow(length);
    buffer.write(text, 0, 'utf8');
    for (let copy = 0; copy < copies; copy++)
      frame.guards.push(admitColumn(() => budget.reserveConsumerJson(buffer), refused));
    return decode();
  } finally {
    carrier.release();
  }
}

/** PostgreSQL parses JSON/array columns inside its driver, before a repository
 * can admit the resulting graph. Capture this real preparation owner when the
 * query is dispatched; socket callbacks need not inherit its async context.
 * Source queries outside native preparation keep their existing parsers. */
export function nativeSourceColumnParsers(refused: (error: unknown) => void) {
  const section = currentSection();
  if (!section) return;
  const owner = currentFrame(section) ?? section;
  return {
    json<T>(text: string, decode: () => T): T {
      if (owner.closed)
        return admitColumn(() => {
          throw new Error('Native SQL preparation ended before decoding.');
        }, refused);
      return decodeOwnedJson(owner, text, decode, 1, refused);
    },
    array<T>(text: string, decode: () => T): T {
      if (owner.closed)
        return admitColumn(() => {
          throw new Error('Native SQL preparation ended before decoding.');
        }, refused);
      // The existing pg-types array parser keeps nested arrays and copied
      // element strings. Count delimiters outside quotes without parsing data
      // a second time; NULL/numeric elements conservatively use string slots.
      let containers = 0,
        elements = 0,
        quoted = false,
        escaped = false;
      for (let at = 0; at < text.length; at++) {
        const char = text[at];
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = !quoted;
        else if (!quoted) {
          if (char === '{') {
            containers++;
            if (text[at + 1] !== '}') elements++;
          } else if (char === ',') elements++;
        }
      }
      owner.guards.push(
        admitColumn(
          () =>
            owner.budget.reserveConsumerBytes(2 * text.length + containers * 256 + elements * 128),
          refused,
        ),
      );
      return decode();
    },
  };
}

function admitColumn<T>(admit: () => T, refused?: (error: unknown) => void): T {
  try {
    return admit();
  } catch (error) {
    refused?.(error);
    throw error;
  }
}

/** Generated DTO strings, pins and selected IDs outlive parser workspace.
 * Independent custody lasts through input encoding, without retaining a world. */
export function retainPreparedSource<T>(value: T): T {
  const section = currentSection();
  if (!section) return value;
  // A row's selected IDs escape into the surrounding SQL selection, not the
  // later input encoder. Definition DTOs have no parent parser and escape to
  // that encoder. End each guard at its actual last consumer.
  const owner = currentFrame(section)?.parent ?? section;
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
