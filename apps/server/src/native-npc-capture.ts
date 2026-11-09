import type { NativeWorld, NativeWorldNpcRead } from '@open-legend/native-simulation';
import type {
  ActorAgency,
  ActorMind,
  ActorKnowledge,
  AppraisalScope,
  Entity,
  InnerWorld,
} from '@open-legend/domain';
import type { NativeActorPerception, NativeActorSelf } from './native-perception.js';
import {
  nativeDecisionFeelings,
  nativeDecisionSelfContext,
  type NativeDecisionAppraisals,
} from './native-decision-context.js';
import { nativeBodyContext } from './native-perception.js';
import {
  decodeNativeProduct,
  freezeNativeProduct,
  retainNativeSources,
} from './native-consumer.js';
import type { NativeHistoryInput } from './native-history.js';
import { formatGeneralKnowledgeContext } from './knowledge-context.js';

/** The NPC purpose supplies the actual selected first-person mental records.
 * These private facts are formatter input; model output cannot edit this graph
 * or turn its personal references into current physical permissions. */
export interface NativeNpcActorSelf extends NativeActorSelf {
  readonly alive: boolean;
  readonly incapacitated: boolean;
  readonly supportSurfaceId: string | null;
  readonly bodyProfile: Readonly<Entity['spatial']['body']>;
  readonly agency: Readonly<ActorAgency>;
  readonly mind: Readonly<ActorMind>;
  readonly knowledge?: Readonly<ActorKnowledge>;
  readonly innerWorld?: Readonly<InnerWorld>;
  readonly speech: boolean;
  readonly speechBlocked: boolean;
  readonly actionsBlocked: boolean;
}

interface NpcPacket {
  readonly self: NativeNpcActorSelf;
  readonly perception: NativeActorPerception;
  readonly appraisals: NativeDecisionAppraisals;
  readonly history: Pick<NativeHistoryInput, 'worldId' | 'generation' | 'baseCut' | 'cuts'>;
}

/** One actual native read owner across asynchronous context preparation. Source
 * receipts, scene validity and executable choices must be bound by their own
 * semantic owners before a response ticket can be issued. */
export class NativeNpcCapture {
  private constructor(
    private packet: NpcPacket | undefined,
    private readonly read: NativeWorldNpcRead,
  ) {}

  static async capture(
    world: NativeWorld,
    actorId: string,
    requiredAppraisals: readonly AppraisalScope[],
  ): Promise<NativeNpcCapture> {
    const read = await world.readNpc(Buffer.from(JSON.stringify({ actorId, requiredAppraisals })));
    try {
      return new NativeNpcCapture(
        freezeNativeProduct(decodeNativeProduct<NpcPacket>(await read.packet())),
        read,
      );
    } catch (error) {
      read.release();
      throw error;
    }
  }

  get facts(): NpcPacket {
    if (!this.packet) throw new Error('The native NPC capture was released.');
    return this.packet;
  }

  firstPersonContext() {
    const facts = this.facts;
    const self = nativeDecisionSelfContext(facts.self);
    return retainNativeSources(
      {
        identity: self.identity,
        aboutMe: self.aboutMe,
        goal: self.goal,
        body: nativeBodyContext(facts.self),
        feelings: nativeDecisionFeelings(facts.self, facts.appraisals),
      },
      facts,
    );
  }

  generalKnowledgeContext(maxCharacters: number | undefined) {
    const facts = this.facts;
    return retainNativeSources(
      formatGeneralKnowledgeContext(facts.self.knowledge?.['general'], maxCharacters),
      facts,
    );
  }

  release(): void {
    this.packet = undefined;
    this.read.release();
  }
}
