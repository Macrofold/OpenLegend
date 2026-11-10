import type {
  NativeWorld,
  NativeWorldNpcRead,
  NativeWorldNpcResponseTicket,
  NativeWorldNpcTrigger,
} from '@open-legend/native-simulation';
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
import { nativeBodyContext, nativePerceivedEntities } from './native-perception.js';
import { formatEntityRecallCandidate } from './recall-entity.js';
import {
  decodeNativeProduct,
  freezeNativeProduct,
  retainNativeSources,
} from './native-consumer.js';
import type { NativeHistoryInput } from './native-history.js';
import type { NativeDecisionValidityRead } from './native-decision-validity.js';
import { formatGeneralKnowledgeContext } from './knowledge-context.js';
import { presentationSubjects } from './experience-context.js';
import { captureSituationFromRead, situationPresentationValues } from './situation-context.js';
import {
  nativeExperiencePresentation,
  nativeNpcSpatialFrame,
  nativeSituationSources,
  type NativePresentationLabels,
} from './native-situation.js';
import type { NativeDefinitionCapture } from './native-definition-capture.js';
import type { NativeGeometryProviders } from './native-geometry.js';
import {
  driveNativeNpcCandidates,
  driveNativeNpcSources,
  type NativeHistoryReadContext,
} from './native-providers.js';
import { captureNativeReadCut, nativeScopedReadCut } from './native-read-cut.js';
import type {
  NativeNpcBindingSelection,
  NativeNpcHistoricalScope,
  NativeNpcSourceInventory,
  NativeNpcSourceSelection,
  NativeNpcReferenceFacts,
} from './native-npc-sources.js';
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
  readonly npc: {
    readonly contacts: Readonly<
      Record<string, NonNullable<NonNullable<Entity['actor']>['contacts']>[string]>
    > | null;
    readonly expressions: boolean;
    readonly inventoryCount: number;
    readonly knownRecipesCount: number;
    readonly corrections?: Readonly<Record<string, string>>;
    readonly forgotten?: readonly string[];
    readonly mapMarkerLabels?: Readonly<Record<string, string>>;
  };
}

interface NpcPacket {
  readonly self: NativeNpcActorSelf;
  readonly perception: NativeActorPerception & { readonly npcCurrent: NativeCurrentCaptureSeed };
  readonly appraisals: NativeDecisionAppraisals;
  readonly history: Pick<NativeHistoryInput, 'worldId' | 'generation' | 'baseCut' | 'cuts'>;
  readonly candidates?: NativeNpcCandidates;
  readonly historyScope: NativeNpcHistoricalScope;
  readonly referenceFacts: NativeNpcReferenceFacts;
  readonly sources: readonly NativeNpcSourceInventory[];
  readonly validity: NativeDecisionValidityRead;
}

/** One actual native read owner across asynchronous context preparation. Source
 * receipts, scene validity and executable choices must be bound by their own
 * semantic owners before a response ticket can be issued. */
export class NativeNpcCapture {
  private constructor(
    private packet: NpcPacket | undefined,
    private read: NativeWorldNpcRead,
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

  /** A single situation-query continuation receives the very same native read
   * owners back from its unused ticket. It cannot substitute a later capture. */
  static async reopenResponse(
    world: NativeWorld,
    ticket: NativeWorldNpcResponseTicket,
    original: NativeNpcCapture,
    current: NativeNpcCapture,
  ): Promise<void> {
    const reads = await world.openNpcResponse(ticket);
    try {
      await original.adoptRead(reads.original);
      await current.adoptRead(reads.current);
    } catch (error) {
      reads.original.release();
      reads.current.release();
      throw error;
    }
  }

  private async adoptRead(read: NativeWorldNpcRead): Promise<void> {
    const before = this.facts;
    const after = freezeNativeProduct(decodeNativeProduct<NpcPacket>(await read.packet()));
    if (
      after.self.worldId !== before.self.worldId ||
      after.self.generation !== before.self.generation ||
      after.self.actorId !== before.self.actorId ||
      after.self.acceptedCut !== before.self.acceptedCut ||
      after.historyScope.readSerial !== before.historyScope.readSerial
    )
      throw new Error('A situation query returned another native read owner.');
    this.read.release();
    this.read = read;
    this.packet = after;
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

  sources(): readonly NativeNpcSourceInventory[] {
    const facts = this.facts;
    return retainNativeSources(facts.sources, facts);
  }

  /** Mint only at the last dispatch turn. The caller releases this gate before
   * awaiting provider work; the originating history remains native-owned. */
  historyPublication(world: NativeWorld) {
    this.facts;
    return world.npcHistoryPublication(this.read);
  }

  /** A later expansion keeps the original evidence window while reading the
   * current genuine SQL/pending representation. No model-supplied source body
   * or permission map crosses the native admission boundary. */
  async prepareSources(
    world: NativeWorld,
    selection: NativeNpcSourceSelection,
    geometry: NativeGeometryProviders,
    history: NativeHistoryReadContext,
    signal?: AbortSignal,
  ): Promise<NativeNpcSourceInventory> {
    const facts = this.facts;
    signal?.throwIfAborted();
    const current = await captureNativeReadCut(world, facts.self.actorId);
    const pending = history.liveReadCuts({
      worldId: facts.self.worldId,
      actorId: facts.self.actorId,
    });
    if (!pending) throw new Error('Native source preparation has no accepted publication owner.');
    const cut = nativeScopedReadCut(current, pending);
    const prepared = { db: history.db, liveReadCuts: () => cut };
    const first = await world.npcSources(this.read, Buffer.from(JSON.stringify(selection)));
    await driveNativeNpcSources(world, this.read, first, geometry, prepared, signal);
    this.packet = freezeNativeProduct(decodeNativeProduct<NpcPacket>(await this.read.packet()));
    const sources = this.sources();
    const latest = sources.at(-1);
    if (!latest) throw new Error('Native source preparation produced no owned inventory.');
    return retainNativeSources(latest, sources);
  }

  /** The first read owns situation/history, while the refreshed read owns the
   * current physical menu. Only their native ordinals and displayed spellings
   * enter issuance; neither permission maps nor commands cross back to native. */
  async bindResponse(
    world: NativeWorld,
    current: NativeNpcCapture,
    decisionId: string,
    selection: NativeNpcBindingSelection,
    signal?: AbortSignal,
    trigger?: NativeWorldNpcTrigger,
  ): Promise<NativeWorldNpcResponseTicket> {
    const originalFacts = this.facts,
      currentFacts = current.facts;
    signal?.throwIfAborted();
    const ticket = await world.bindNpcResponse(
      this.read,
      current.read,
      Buffer.from(JSON.stringify({ decisionId, selection })),
      trigger,
    );
    if (signal?.aborted) {
      ticket.release();
      signal.throwIfAborted();
    }
    return retainNativeSources(ticket, originalFacts, currentFacts);
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

  recallEntities() {
    const facts = this.facts,
      choices = this.candidates();
    const perceived = nativePerceivedEntities(facts.self, facts.perception, choices.bodyOrdinals);
    return retainNativeSources(
      perceived.entries.map((entry) => {
        const binding = perceived.bindings.get(entry.handle)!;
        const body = facts.perception.cut.current
          .slice(binding.first, binding.first + binding.count)
          .find((facet) => facet.value.kind === 'body');
        if (!body || body.value.kind !== 'body')
          throw new Error('The selected entity recall has no received body.');
        return {
          ...formatEntityRecallCandidate({
            id: binding.sourceId,
            description: entry.text,
            relativeLocation: entry.relativeLocation,
            acquiredAt: body.valueAcquiredAt,
            outward: body.value.body.outward,
          }),
          // Source hard-query recall includes every actually selected detailed
          // or expanded current body, independently of optional relevance.
          required: true,
        };
      }),
      facts,
      choices,
    );
  }

  async prepareExperiencePresentation(
    world: NativeWorld,
    definitions: NativeDefinitionCapture,
    values: readonly unknown[],
  ) {
    const facts = this.facts,
      installed = definitions.facts;
    if (definitions.worldId !== facts.self.worldId)
      throw new Error('NPC presentation definitions belong to another native world.');
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
    return retainNativeSources(
      nativeExperiencePresentation(
        facts,
        installed,
        nativeNpcSpatialFrame(facts.self),
        labels,
        values,
      ),
      facts,
      installed,
      labels,
    );
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
