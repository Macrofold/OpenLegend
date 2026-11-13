import { hash } from 'node:crypto';
import type { NativeHost, NativeWorldConsumer } from '@open-legend/native-simulation';
import type { AdmittedWorldInput } from '@open-legend/domain';
import type { WorldInputResult, WorldInputScope } from '@open-legend/protocol';
import type { RequestScope } from './authority.js';
import { WorldInputOwner, type WorldInputAllocation } from './world-input.js';
import {
  attachNativeConsumer,
  encodeNativeJson,
  nativeJsonFixedWorkspace,
  releaseNativeProduct,
  retainNativeProduct,
} from './native-consumer.js';

type Admission = Pick<NativeHost, 'reserveConsumerBytes' | 'reserveConsumerJson'>;
interface Context {
  readonly scope: RequestScope;
  readonly generation: string;
  readonly life?: number;
  readonly alive: boolean;
  readonly paused: boolean;
}
const uuidUnits = 36; // The existing owner's crypto.randomUUID() spelling.
// Node22 internal/crypto/random::serializeUUID joins 16 hex pairs and four
// separators. Admit all 19 possible 32-byte cons nodes as well as flat UTF-16
// backing; a still-readable old scope must not depend on a later flatten.
const uuidBytes = 64 + 2 * uuidUnits + 19 * 32;
const scopeBytes = 256 + 3 * uuidBytes;

export function nativeWorldInputs(budget: Admission, maximum: number): WorldInputOwner {
  const storage = budget.reserveConsumerBytes((maximum + 3) * 256);
  try {
    return new WorldInputOwner(maximum, storage);
  } catch (error) {
    storage.release();
    throw error;
  }
}

/** The existing controller owns its state, tokens and steering window. This
 * resource owns only their selected data and the captured private scope used
 * by its real current-authority predicate; it retains no player/world read. */
export class NativeInputAllocation implements WorldInputAllocation {
  private constructor(
    private contextValue: Context | undefined,
    readonly identity: string,
    private guard: NativeWorldConsumer | undefined,
  ) {}

  static prepare(
    budget: Admission,
    scope: RequestScope,
    generation: string,
    life: number | undefined,
    alive: boolean,
    paused: boolean,
  ): NativeInputAllocation {
    // State/scope/allocation headers, closure, current+prospective steering
    // records and directions, three UUIDs plus one rotating token, SHA hex
    // identity and the table key. Native execution-control/attack is refused
    // by its existing command boundary; no attack-state conversion is implied.
    const guard = budget.reserveConsumerBytes(
      3 * 256 + 128 + 2 * (2 * 256) + 4 * uuidBytes + 64 + 2 * 64 + 64 + 2 * scope.actorId.length,
    );
    let workspace: NativeWorldConsumer | undefined;
    let context: Context | undefined;
    try {
      // Keep the existing fixed synchronous JSON/FFI workspace through hashing
      // and context decoding, in addition to each encoder/parser's own guard.
      workspace = budget.reserveConsumerBytes(nativeJsonFixedWorkspace + 256);
      const encoded = encodeNativeJson(budget, { scope, generation, life, alive, paused });
      try {
        // The exact same UTF-8 JSON bytes feed Source's SHA-256 identity. This
        // shared emission also supplies the independent scope graph below.
        const identity = hash('sha256', encoded);
        const decoded = budget.reserveConsumerJson(encoded);
        try {
          context = retainNativeProduct(
            attachNativeConsumer(JSON.parse(encoded.toString('utf8')) as Context, decoded),
          );
        } catch (error) {
          decoded.release();
          throw error;
        }
        return new NativeInputAllocation(context, identity, guard);
      } finally {
        releaseNativeProduct(encoded);
      }
    } catch (error) {
      if (context) releaseNativeProduct(context);
      guard.release();
      throw error;
    } finally {
      workspace?.release();
    }
  }

  get context(): Context {
    if (!this.contextValue) throw new Error('These input controls are no longer available.');
    return this.contextValue;
  }
  get currentContext(): Context | undefined {
    return this.contextValue;
  }
  release(): void {
    if (this.contextValue) releaseNativeProduct(this.contextValue);
    this.contextValue = undefined;
    this.guard?.release();
    this.guard = undefined;
  }
}

/** A view's old tokens can remain readable after a controller rotates or is
 * cleared. Fund that tiny graph independently instead of pinning its state. */
export function nativeInputScope(budget: Admission, scope: WorldInputScope): WorldInputScope {
  const guard = budget.reserveConsumerBytes(
    256 +
      3 * (64 + 19 * 32) +
      2 *
        (scope.inputEpoch.length + scope.movementInputToken.length + scope.attackInputToken.length),
  );
  return attachNativeConsumer({ ...scope }, guard);
}

/** Result and copied scope precede validation/mutation; the separate scratch
 * covers the owner's temporary base-result and this short resource carrier. */
export class NativeInputResultAllocation {
  private constructor(
    private guard: NativeWorldConsumer | undefined,
    private scratch: NativeWorldConsumer | undefined,
  ) {}
  static prepare(budget: Admission): NativeInputResultAllocation {
    const guard = budget.reserveConsumerBytes(256 + scopeBytes);
    try {
      const scratch = budget.reserveConsumerBytes(2 * 256);
      return new NativeInputResultAllocation(guard, scratch);
    } catch (error) {
      guard.release();
      throw error;
    }
  }
  finish(value: WorldInputResult): WorldInputResult {
    const guard = this.guard;
    if (!guard) throw new Error('These input controls are no longer available.');
    this.guard = undefined;
    return attachNativeConsumer(value, guard);
  }
  release(): void {
    this.guard?.release();
    this.scratch?.release();
    this.guard = this.scratch = undefined;
  }
}

/** Keep direction identity: authorized() compares the Source snapshot's actual
 * direction object. Its independent graph allowance survives state expiry. */
export function nativeInputSnapshot(
  budget: Admission,
  owner: WorldInputOwner,
  now: number,
): AdmittedWorldInput[] {
  let guard: NativeWorldConsumer | undefined;
  try {
    const values = owner.inputs(now, (states, active, stringUnits) => {
      // Node22 js-objects.h::NewElementsCapacity grows by half +16. Three
      // slots/member plus these fixed headers cover the values spread's old/
      // new backing overlap. Active slots also fund flatMap/result carriers,
      // selected objects and their independently borrowed ID strings.
      guard = budget.reserveConsumerBytes(
        2 * 256 + states * 3 * 8 + active * (5 * 256 + 2 * 64 + 8) + 2 * stringUnits,
      );
    });
    return attachNativeConsumer(values, guard!);
  } catch (error) {
    guard?.release();
    throw error;
  }
}
