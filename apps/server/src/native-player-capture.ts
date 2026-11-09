import type {
  NativeWorld,
  NativeWorldJson,
  NativeWorldPlayerRead,
} from '@open-legend/native-simulation';
import type { GameView } from '@open-legend/protocol';
import type { RequestScope } from './authority.js';
import type { NativeGeometryProviders } from './native-geometry.js';
import type { NativePlayerRead } from './native-player-view.js';
import { ViewChangedError } from './player-view-async.js';

type PlayerPacket = Pick<NativePlayerRead, 'self' | 'perception' | 'events' | 'controls'>;
const packet = <T>(value: NativeWorldJson): T => JSON.parse(value.consume().toString('utf8')) as T;

/** The actual bridge capture, independent of operational profiles, grants and
 * request scheduling. It retains scoped native evidence through async SQL and
 * never assembles an Entity or WorldState on the server. */
export class NativePlayerCapture {
  private released = false;
  private constructor(
    readonly facts: PlayerPacket,
    private readonly world: NativeWorld,
    private readonly read: NativeWorldPlayerRead,
  ) {}

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
        const query = packet<Parameters<NativeGeometryProviders['compute']>[0]>(question);
        const answers = await geometry.compute(query);
        await read.finishControls(Buffer.from(JSON.stringify(answers)));
      }
      return new NativePlayerCapture(packet<PlayerPacket>(await read.packet()), world, read);
    } catch (error) {
      read.release();
      throw error;
    }
  }

  /** Final projection runs while the native disclosure lease is held. The
   * application supplies its real synchronous authority/asset/narrator check;
   * neither a captured pause value nor a global world cut replaces that check. */
  async publishIfPermitted(
    selectedEventIds: readonly string[],
    complete: (canUseInventory: boolean) => GameView,
    operational: () => { paused: boolean; controlling: boolean },
    operationalStillCurrent: () => boolean,
  ): Promise<GameView> {
    if (this.released) throw new ViewChangedError();
    const before = operational();
    const publication = await this.world.playerPublication(
      this.read,
      [...selectedEventIds],
      before.paused,
      before.controlling,
    );
    try {
      const current = operational();
      if (
        this.released ||
        current.paused !== before.paused ||
        current.controlling !== before.controlling ||
        !operationalStillCurrent()
      )
        throw new ViewChangedError();
      return complete(publication.canUseInventory());
    } finally {
      publication.release();
    }
  }

  release(): void {
    this.released = true;
    this.read.release();
  }
}
