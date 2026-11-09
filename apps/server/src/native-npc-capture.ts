import type { NativeWorld, NativeWorldNpcRead } from '@open-legend/native-simulation';
import type {
  ActorAgency,
  ActorMind,
  ActorKnowledge,
  AppraisalScope,
  Entity,
  InnerWorld,
  ObservationContribution,
  TemporalHistorySelection,
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
import { presentationSubjects } from './experience-context.js';
import { captureSituationFromRead, situationPresentationValues } from './situation-context.js';
import {
  nativeExperiencePresentation,
  nativeSituationSources,
  type NativePresentationLabels,
} from './native-situation.js';
import type { NativeDefinitionCapture } from './native-definition-capture.js';
import type { NativeGeometryProviders } from './native-geometry.js';
import { driveNativeNpcCandidates } from './native-providers.js';
import {
  nativeNpcCandidateDescriptions,
  type NativeNpcCandidates,
} from './native-npc-candidates.js';
import {
  nativeCurrentSources,
  nativeReceivedScene,
  type NativeCurrentCaptureSeed,
} from './native-current-capture.js';

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
  readonly perception: NativeActorPerception & { readonly npcCurrent: NativeCurrentCaptureSeed };
  readonly appraisals: NativeDecisionAppraisals;
  readonly history: Pick<NativeHistoryInput, 'worldId' | 'generation' | 'baseCut' | 'cuts'>;
  readonly candidates?: NativeNpcCandidates;
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

  currentSources(selection?: Parameters<typeof nativeCurrentSources>[3]) {
    const facts = this.facts;
    return retainNativeSources(
      nativeCurrentSources(facts.self, facts.perception.npcCurrent, facts.history, selection),
      facts,
    );
  }

  receivedScene() {
    const facts = this.facts;
    return retainNativeSources(nativeReceivedScene(facts.perception.npcCurrent), facts);
  }

  attention() {
    const facts = this.facts;
    return retainNativeSources({ ...facts.perception.npcCurrent.attention }, facts);
  }

  receiptTailRequest() {
    const facts = this.facts,
      request = facts.perception.npcCurrent.receiptTailRequest;
    return request && retainNativeSources(request, facts);
  }

  candidates(): NativeNpcCandidates {
    const facts = this.facts;
    if (!facts.candidates) throw new Error('The native NPC choices have not been prepared.');
    return retainNativeSources(facts.candidates, facts);
  }

  choiceDescriptions(definitions: NativeDefinitionCapture) {
    const facts = this.facts,
      installed = definitions.facts;
    if (definitions.worldId !== facts.self.worldId)
      throw new Error('NPC choice definitions belong to another native world.');
    return nativeNpcCandidateDescriptions(facts.self, facts.perception, this.candidates(), {
      statusEffectPolicy: installed.definitions.statusEffectPolicy,
      nativeStrikes: installed.definitions.nativeStrikes,
      probes: installed.nativePolicies.occurrenceRules.response.offers.probes,
    });
  }

  async prepareChoices(
    world: NativeWorld,
    geometry: NativeGeometryProviders,
    options: {
      readonly expandedBodyOrdinals?: readonly number[];
      readonly coverage?: 'suggestions' | 'complete-physical';
      readonly signal?: AbortSignal;
    } = {},
  ): Promise<void> {
    this.facts;
    try {
      options.signal?.throwIfAborted();
      const first = await world.npcCandidates(
        this.read,
        Buffer.from(
          JSON.stringify({
            expandedBodyOrdinals: options.expandedBodyOrdinals ?? [],
            coverage: options.coverage ?? 'suggestions',
          }),
        ),
      );
      await driveNativeNpcCandidates(world, this.read, first, geometry, options.signal);
      this.packet = freezeNativeProduct(decodeNativeProduct<NpcPacket>(await this.read.packet()));
    } catch (error) {
      this.release();
      throw error;
    }
  }

  async prepareSituation(
    world: NativeWorld,
    definitions: NativeDefinitionCapture,
    jobId: string,
    retainedHistory: TemporalHistorySelection,
    representedObservations: readonly ObservationContribution[] = [],
  ) {
    const facts = this.facts,
      installed = definitions.facts;
    if (definitions.worldId !== facts.self.worldId)
      throw new Error('NPC context definitions belong to another native world.');
    const source = nativeSituationSources(facts, installed, jobId);
    const values = situationPresentationValues(source, retainedHistory, representedObservations);
    const labels = freezeNativeProduct(
      decodeNativeProduct<NativePresentationLabels>(
        await world.npcPresentationLabels(
          this.read,
          Buffer.from(
            JSON.stringify({
              subjects: [
                { kind: 'entity', entityId: facts.self.actorId },
                ...presentationSubjects(values),
              ],
            }),
          ),
        ),
      ),
    );
    const prepared = captureSituationFromRead(
      {
        ...source,
        presentation: (selected) =>
          nativeExperiencePresentation(facts, installed, source.frame, labels, selected),
      },
      retainedHistory,
      representedObservations,
    );
    return retainNativeSources(prepared, facts, installed, labels);
  }

  release(): void {
    this.packet = undefined;
    this.read.release();
  }
}
