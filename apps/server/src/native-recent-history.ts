import type { NativeWorld, NativeWorldRecentHistoryRead } from '@open-legend/native-simulation';
import type {
  NativeNpcHistoricalScope,
  NativeNpcSourceInventory,
  NativeNpcSourceSelection,
} from './native-npc-sources.js';
import type { NativeHistoryInput } from './native-history.js';
import type { NativeHistoryReadContext } from './native-providers.js';
import type { NativeGeometryProviders } from './native-geometry.js';
import { answerNativeProvider } from './native-providers.js';
import {
  decodeNativeProduct,
  freezeNativeProduct,
  releaseNativeProduct,
  withNativeJsonInput,
} from './native-consumer.js';

export interface NativeRecentHistoryPacket {
  readonly scope: NativeNpcHistoricalScope;
  readonly history: Pick<NativeHistoryInput, 'worldId' | 'generation' | 'baseCut' | 'cuts'>;
  readonly recordingGap?: { readonly from: number; readonly through: number };
}

/** A private reader owns only its actual actor history scope and the selected
 * receipt inventory. No NPC context or writable world is manufactured for UI. */
export class NativeRecentHistoryCapture {
  private inventory: NativeNpcSourceInventory | undefined;
  private constructor(
    readonly read: NativeWorldRecentHistoryRead,
    private packetValue: NativeRecentHistoryPacket | undefined,
  ) {}

  static async capture(world: NativeWorld, actorId: string) {
    const read = await world.readRecentHistory(actorId);
    try {
      return new NativeRecentHistoryCapture(
        read,
        freezeNativeProduct(decodeNativeProduct<NativeRecentHistoryPacket>(await read.packet())),
      );
    } catch (error) {
      read.release();
      throw error;
    }
  }
  get facts(): NativeRecentHistoryPacket {
    if (!this.packetValue) throw new Error('Recent observations were released.');
    return this.packetValue;
  }
  tailRequest() {
    const { scope } = this.facts;
    return scope.receiptPrefix.state === 'pending'
      ? {
          actorId: scope.actorId,
          physicalLife: scope.receiptPrefix.physicalLife,
          epoch: scope.receiptPrefix.epoch,
          tailRevision: scope.receiptPrefix.tailRevision,
        }
      : undefined;
  }
  async prepareSources(
    world: NativeWorld,
    selection: NativeNpcSourceSelection,
    geometry: NativeGeometryProviders,
    history: NativeHistoryReadContext,
  ): Promise<NativeNpcSourceInventory> {
    this.facts;
    try {
      let turn = await withNativeJsonInput(world, selection, (bytes) =>
        world.recentHistorySources(this.read, bytes),
      );
      while (turn.kind === 'provider') {
        if (!turn.provider) throw new Error('Recent observations have no actual source question.');
        const answer = await answerNativeProvider(turn.provider, geometry, history);
        try {
          turn = await world.answerRecentHistorySources(
            this.read,
            turn.key,
            turn.provider,
            answer.json,
          );
        } finally {
          releaseNativeProduct(answer);
        }
      }
      if (turn.kind !== 'complete')
        throw new Error('Recent observations did not close their read-only source preparation.');
      this.inventory = freezeNativeProduct(
        decodeNativeProduct<NativeNpcSourceInventory>(await this.read.sources()),
      );
      return this.inventory;
    } catch (error) {
      // Await the sole private cursor's cancellation before the service lane
      // admits another writer, including an initial provider admission refusal.
      await world.cancelRecentHistorySources(this.read);
      throw error;
    }
  }
  release(): void {
    this.read.release();
    if (this.packetValue) releaseNativeProduct(this.packetValue);
    if (this.inventory) releaseNativeProduct(this.inventory);
    this.packetValue = this.inventory = undefined;
  }
}
