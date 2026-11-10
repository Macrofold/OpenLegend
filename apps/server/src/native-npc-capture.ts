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
import { contributionFactKey } from '@open-legend/domain';
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
  encodeNativeJson,
  freezeNativeProduct,
  releaseNativeProduct,
  retainNativeSources,
  withNativeJsonInput,
} from './native-consumer.js';
import type { NativeHistoryInput } from './native-history.js';
import type { NativeDecisionValidityRead } from './native-decision-validity.js';
import { formatGeneralKnowledgeContext } from './knowledge-context.js';
import { presentationSubjects } from './experience-context.js';
import {
  captureSituationFromRead,
  completeSituationHistory,
  situationPresentationValues,
} from './situation-context.js';
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
import { capturedAttributionReader, type AttributionIdentity } from './entity-references.js';

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
export type NativeNpcConsumer = 'inspection' | 'chat' | 'thought' | 'reflection';
export type NativeNpcPerspectiveSelection = NativeNpcBindingSelection['perspectives'];

/** A native naming cut owns the actual identity tuples. Only its ordinals go
 * back to the native validity owner; these tuples grant no entity access. */
export class NativeNpcPerspectives {
  constructor(
    private readonly product: {
      readonly snapshot: number;
      readonly attributionIdentities: Readonly<Record<string, readonly AttributionIdentity[]>>;
    },
    readonly attribution: (ids: Iterable<string>) => string,
  ) {}

  select(ids: Iterable<string>): NativeNpcPerspectiveSelection {
    const keys = Object.keys(this.product.attributionIdentities);
    return retainNativeSources(
      [...new Set(ids)].map((id) => {
        const entity = keys.indexOf(id);
        if (entity < 0) throw new Error('Selected personal attribution was not captured.');
        return { snapshot: this.product.snapshot, entity };
      }),
      this.product,
    );
  }
}

/** One actual native read owner across asynchronous context preparation. Source
 * receipts, scene validity and executable choices must be bound by their own
 * semantic owners before a response ticket can be issued. */
export class NativeNpcCapture {
  private publicationPerspectives: NativeNpcPerspectiveSelection = [];
  private preparedCandidates: NativeNpcCandidates | undefined;
  private sourceInventories: readonly NativeNpcSourceInventory[] | undefined;
  private constructor(
    private packet: NpcPacket | undefined,
    private readOwner: NativeWorldNpcRead | undefined,
    readonly consumer: NativeNpcConsumer,
  ) {
    this.adoptPacket(packet!);
  }

  private get read(): NativeWorldNpcRead {
    if (!this.readOwner) throw new Error('The native NPC capture was released.');
    return this.readOwner;
  }

  private adoptPacket(packet: NpcPacket): void {
    this.packet = packet;
    this.preparedCandidates = packet.candidates && retainNativeSources(packet.candidates, packet);
    this.sourceInventories = retainNativeSources(packet.sources, packet);
  }

  static async capture(
    world: NativeWorld,
    actorId: string,
    requiredAppraisals: readonly AppraisalScope[],
    consumer: NativeNpcConsumer = 'inspection',
  ): Promise<NativeNpcCapture> {
    const read = await withNativeJsonInput(
      world,
      { actorId, requiredAppraisals, consumer },
      (bytes) => world.readNpc(bytes),
    );
    try {
      return new NativeNpcCapture(
        freezeNativeProduct(decodeNativeProduct<NpcPacket>(await read.packet())),
        read,
        consumer,
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
    const previousRead = this.read;
    const after = freezeNativeProduct(decodeNativeProduct<NpcPacket>(await read.packet()));
    if (
      after.self.worldId !== before.self.worldId ||
      after.self.generation !== before.self.generation ||
      after.self.actorId !== before.self.actorId ||
      after.self.acceptedCut !== before.self.acceptedCut ||
      after.historyScope.readSerial !== before.historyScope.readSerial
    )
      throw new Error('A situation query returned another native read owner.');
    this.facts;
    previousRead.release();
    this.readOwner = read;
    this.adoptPacket(after);
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
    this.facts;
    if (!this.preparedCandidates) throw new Error('The native NPC choices have not been prepared.');
    return this.preparedCandidates;
  }

  sources(): readonly NativeNpcSourceInventory[] {
    this.facts;
    return this.sourceInventories!;
  }

  /** Mint only at the last dispatch turn. The caller releases this gate before
   * awaiting provider work; the originating history remains native-owned. */
  historyPublication(world: NativeWorld) {
    this.facts;
    const input = encodeNativeJson(world, {
      consumer: this.consumer,
      perspectives: this.publicationPerspectives,
    });
    try {
      return world.npcHistoryPublication(this.read, input);
    } finally {
      releaseNativeProduct(input);
    }
  }

  guardPerspectives(selected: NativeNpcPerspectiveSelection): void {
    this.facts;
    this.publicationPerspectives = selected;
  }

  async capturePerspectives(
    world: NativeWorld,
    ids: Iterable<string>,
  ): Promise<NativeNpcPerspectives> {
    const facts = this.facts;
    const entities = [...new Set(ids)].map((id) => {
      if (id === facts.self.actorId) return { kind: 'myself' as const };
      const body = facts.perception.bodies.findIndex((value) => value.sourceId === id);
      if (body >= 0) return { kind: 'body' as const, ordinal: body };
      const inventories = this.sources();
      for (let inventory = inventories.length - 1; inventory >= 0; inventory--) {
        const sources = inventories[inventory]!.personal;
        for (let ordinal = 0; ordinal < sources.length; ordinal++) {
          const entity = Object.keys(sources[ordinal]!.attribution.attributionIdentities).indexOf(
            id,
          );
          if (entity >= 0) return { kind: 'personal' as const, inventory, ordinal, entity };
        }
      }
      throw new Error('Personal naming has no admitted participant witness.');
    });
    const product = freezeNativeProduct(
      decodeNativeProduct<{
        readonly snapshot: number;
        readonly attributionIdentities: Readonly<Record<string, readonly AttributionIdentity[]>>;
      }>(
        await withNativeJsonInput(world, { entities }, (bytes) =>
          world.npcPerspectives(this.read, bytes),
        ),
      ),
    );
    const attribution = retainNativeSources(
      capturedAttributionReader(
        facts.self.worldId,
        facts.self.actorId,
        new Map(Object.entries(product.attributionIdentities)),
      ),
      product,
    );
    return new NativeNpcPerspectives(product, attribution);
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
    const read = this.read;
    signal?.throwIfAborted();
    const current = await captureNativeReadCut(world, facts.self.actorId);
    const pending = history.liveReadCuts({
      worldId: facts.self.worldId,
      actorId: facts.self.actorId,
    });
    if (!pending) throw new Error('Native source preparation has no accepted publication owner.');
    const cut = nativeScopedReadCut(current, pending);
    const prepared = { db: history.db, liveReadCuts: () => cut };
    const first = await withNativeJsonInput(world, selection, (bytes) =>
      world.npcSources(read, bytes),
    );
    await driveNativeNpcSources(world, read, first, geometry, prepared, signal);
    const product = freezeNativeProduct(
      decodeNativeProduct<{ ordinal: number; inventory: NativeNpcSourceInventory }>(
        await read.latestSources(),
      ),
    );
    const previous = this.sources();
    if (product.ordinal !== previous.length)
      throw new Error('Native source preparation returned another inventory ordinal.');
    const latest = retainNativeSources(product.inventory, product);
    // Preserve native inventory ordinals without copying the immutable actor,
    // perception and prior inventories into a new parsed generation each time.
    this.sourceInventories = retainNativeSources([...previous, latest], previous, latest);
    return latest;
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
    const input = encodeNativeJson(world, { decisionId, selection });
    let ticket: NativeWorldNpcResponseTicket;
    try {
      ticket = await world.bindNpcResponse(this.read, current.read, input, trigger);
    } finally {
      releaseNativeProduct(input);
    }
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
        await withNativeJsonInput(
          world,
          {
            subjects: [
              { kind: 'entity', entityId: facts.self.actorId },
              ...presentationSubjects(values),
            ],
          },
          (bytes) => world.npcPresentationLabels(this.read, bytes),
        ),
      ),
    );
    return nativeExperiencePresentation(
      facts,
      installed,
      nativeNpcSpatialFrame(facts.self),
      labels,
      values,
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
    const read = this.read;
    try {
      options.signal?.throwIfAborted();
      const first = await withNativeJsonInput(
        world,
        {
          expandedBodyOrdinals: options.expandedBodyOrdinals ?? [],
          coverage: options.coverage ?? 'suggestions',
        },
        (bytes) => world.npcCandidates(read, bytes),
      );
      await driveNativeNpcCandidates(world, read, first, geometry, options.signal);
      this.preparedCandidates = freezeNativeProduct(
        decodeNativeProduct<NativeNpcCandidates>(await read.candidates()),
      );
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
        await withNativeJsonInput(
          world,
          {
            subjects: [
              { kind: 'entity', entityId: facts.self.actorId },
              ...presentationSubjects(values),
            ],
          },
          (bytes) => world.npcPresentationLabels(this.read, bytes),
        ),
      ),
    );
    const prepared = captureSituationFromRead(
      {
        ...source,
        presentation: (selected) =>
          nativeExperiencePresentation(facts, installed, source.frame, labels, selected),
      },
      { entries: [], incomplete: true },
    );
    // Match the real decision caller: acquired geometry establishes its grants
    // before personally selected history adds evidence grants and recent rows.
    // Their insertion order is also the model's permitted-source enum order.
    const historyPresentation = nativeExperiencePresentation(
      facts,
      installed,
      source.frame,
      labels,
      values,
    );
    completeSituationHistory(
      prepared,
      retainedHistory,
      representedObservations.map((observation) => ({
        observation,
        keys: observation.facets.map((facet) => contributionFactKey(observation, facet.ordinal)),
      })),
      historyPresentation,
    );
    prepared.presentation = historyPresentation;
    return retainNativeSources(prepared, facts, installed, labels);
  }

  release(): void {
    this.packet = undefined;
    this.preparedCandidates = undefined;
    this.sourceInventories = undefined;
    this.readOwner?.release();
    this.readOwner = undefined;
  }
}
