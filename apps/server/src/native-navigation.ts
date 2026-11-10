import type { NativeGeometryQueries, NativeWorld } from '@open-legend/native-simulation';
import type { NativeGeometryProviders } from './native-geometry.js';
import { setTimeout as delay } from 'node:timers/promises';
import { OverloadError } from './work-lane.js';
import {
  decodeNativeProduct,
  releaseNativeProduct,
  withNativeJsonInput,
} from './native-consumer.js';

/** One bounded physical preparation at a time, outside the gameplay lane.
 * The roster contains only derived pending IDs. Every question, saved proposal
 * binding and prepared answer remains owned by its originating native world. */
export class NativeNavigation {
  private requested = false;
  private running?: Promise<void>;
  private closed = false;
  private readonly stopping = new AbortController();
  constructor(
    private readonly owner: {
      world(): NativeWorld;
      geometry(): NativeGeometryProviders;
      pending(): Iterable<string>;
      available(): boolean;
      inLane<T>(read: () => Promise<T>): Promise<T>;
      failed(error: unknown): void;
    },
  ) {}

  schedule(): void {
    if (this.closed || !this.owner.available()) return;
    this.requested = true;
    if (this.running) return;
    this.running = this.pump()
      .catch((error: unknown) => {
        if (!this.closed && this.owner.available()) this.owner.failed(error);
      })
      .finally(() => {
        this.running = undefined;
        if (this.requested && !this.closed) this.schedule();
      });
  }

  private async pump(): Promise<void> {
    while (this.requested && !this.closed && this.owner.available()) {
      this.requested = false;
      const world = this.owner.world(),
        geometry = this.owner.geometry();
      // Iterate the maintained sparse index; never materialize a TypeScript
      // world or scan all entities on every simulation interval.
      for (const actor of this.owner.pending()) {
        if (this.closed || !this.owner.available() || this.owner.world() !== world) break;
        const read = await this.inLane(async () => {
          if (this.closed || !this.owner.available() || this.owner.world() !== world) return null;
          // NAPI creates a separate UTF-8 String before the native read owns
          // its actor identifier. The roster's Node string cannot fund it.
          const input = world.reserveConsumerBytes(Buffer.byteLength(actor) + 1 + 3 * 8);
          try {
            return await world.readNavigation(actor);
          } finally {
            input.release();
          }
        });
        if (!read) continue;
        try {
          let more = true;
          while (more && !this.closed && this.owner.available() && this.owner.world() === world) {
            const queries = decodeNativeProduct<NativeGeometryQueries>(await read.packet());
            let answer:
              | Awaited<ReturnType<NativeGeometryProviders['prepareEntityNavigation']>>
              | undefined;
            try {
              answer = await geometry.prepareEntityNavigation(queries);
              if (this.closed || !this.owner.available() || this.owner.world() !== world) break;
              more = await this.inLane(() =>
                this.closed || !this.owner.available() || this.owner.world() !== world
                  ? Promise.resolve(false)
                  : withNativeJsonInput(world, answer, (bytes) =>
                      world.resolveNavigation(read, bytes),
                    ),
              );
            } finally {
              if (answer) releaseNativeProduct(answer);
              releaseNativeProduct(queries);
            }
          }
        } finally {
          read.release();
        }
      }
    }
  }

  private async inLane<T>(operation: () => Promise<T>): Promise<T> {
    for (;;) {
      try {
        return await this.owner.inLane(operation);
      } catch (error) {
        if (!(error instanceof OverloadError) || this.closed) throw error;
        // Queue refusal has not consumed the opaque read/answer. As in the
        // Source coordinator, defer this publication without recomputing it.
        await delay(1000, undefined, { signal: this.stopping.signal });
      }
    }
  }

  async close(): Promise<void> {
    this.closed = true;
    this.stopping.abort();
    this.requested = false;
    await this.running;
  }
}
