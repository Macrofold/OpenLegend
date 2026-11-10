import { namePhrase } from '@open-legend/language';
import type { NativeWorld, NativeWorldPlayerRead } from '@open-legend/native-simulation';
import type { RequestScope } from './authority.js';
import type { NativeGeometryProviders } from './native-geometry.js';
import type { NativePlayerRead } from './native-player-view.js';
import { ViewChangedError } from './player-view-async.js';
import type { PlayerInteractionFacts } from './player-interaction.js';
import { decodeNativeProduct, encodeNativeJson, freezeNativeProduct } from './native-consumer.js';

type NativeInteractionFacts = Omit<
  PlayerInteractionFacts,
  'controlling' | 'paused' | 'pauseReason'
> & {
  readonly recipientDescription?: Parameters<typeof namePhrase>[0];
  readonly heardUtterance?: boolean;
  readonly recipientCanRespond?: boolean;
};

type PlayerPacket = Pick<NativePlayerRead, 'self' | 'perception' | 'events' | 'controls'>;

/** The actual bridge capture, independent of operational profiles, grants and
 * request scheduling. It retains scoped native evidence through async SQL and
 * never assembles an Entity or WorldState on the server. */
export class NativePlayerCapture {
  private released = false;
  private constructor(
    private packet: PlayerPacket | undefined,
    private readonly world: NativeWorld,
    private readonly read: NativeWorldPlayerRead,
  ) {}

  get facts(): PlayerPacket {
    if (!this.packet) throw new ViewChangedError();
    return this.packet;
  }

  static async capture(
    world: NativeWorld,
    scope: RequestScope,
    eventWindow: number,
    geometry: NativeGeometryProviders,
  ): Promise<NativePlayerCapture> {
    const read = await world.readPlayer(scope.accountId, scope.actorId, eventWindow);
    try {
      const question = await read.controlQuestion();
      if (question) {
        const query =
          decodeNativeProduct<Parameters<NativeGeometryProviders['compute']>[0]>(question);
        const answers = await geometry.compute(query);
        await read.finishControls(Buffer.from(JSON.stringify(answers)));
      }
      return new NativePlayerCapture(
        freezeNativeProduct(decodeNativeProduct<PlayerPacket>(await read.packet())),
        world,
        read,
      );
    } catch (error) {
      read.release();
      throw error;
    }
  }

  /** The purpose-bound native reader checks current speech/action permission;
   * the captured visible body alone cannot authorize a chosen recipient. */
  async interaction(
    mode: 'speak' | 'act',
    targetId?: string,
    utteranceEventId?: string,
  ): Promise<NativeInteractionFacts> {
    if (this.released) throw new ViewChangedError();
    const result = freezeNativeProduct(
      decodeNativeProduct<NativeInteractionFacts>(
        await this.world.playerInteraction(
          this.read,
          Buffer.from(
            JSON.stringify({
              mode,
              ...(targetId ? { targetId } : {}),
              ...(utteranceEventId ? { utteranceEventId } : {}),
            }),
          ),
        ),
      ),
    );
    if (this.released) throw new ViewChangedError();
    return result;
  }

  /** Final projection runs while the native disclosure lease is held. The
   * application supplies its real synchronous authority/asset/narrator check;
   * neither a captured pause value nor a global world cut replaces that check. */
  async publishIfPermitted(
    selectedEventIds: readonly string[],
    complete: (canUseInventory: boolean, encode: (value: object) => Buffer) => Buffer,
    operational: () => { paused: boolean; controlling: boolean },
    operationalStillCurrent: () => boolean,
  ): Promise<Buffer> {
    if (this.released || !operationalStillCurrent()) throw new ViewChangedError();
    const before = operational();
    const publication = await this.world.playerPublication(
      this.read,
      [...selectedEventIds],
      before.paused,
      before.controlling,
    );
    if (!publication) throw new ViewChangedError();
    try {
      const current = operational();
      if (
        this.released ||
        current.paused !== before.paused ||
        current.controlling !== before.controlling ||
        !operationalStillCurrent()
      )
        throw new ViewChangedError();
      return complete(publication.canUseInventory(), (value) =>
        encodeNativeJson(this.world, value, { sources: [this.facts] }),
      );
    } finally {
      publication.release();
    }
  }

  release(): void {
    this.released = true;
    this.packet = undefined;
    this.read.release();
  }
}
