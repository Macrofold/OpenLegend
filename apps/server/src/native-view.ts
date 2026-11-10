import {
  bodyEligibilityRevisionFor,
  selectedObservedBodyKind,
  splitObservedBody,
  nativeCommandSupported,
  ownPracticeFrom,
  selectedNaturalStrikeBodyPlans,
  selectedPlayerViewRules,
  selectedTradeViewTitle,
  selectedPlayerWorkLabels,
  supportsStrikeBody,
  perceptionGuideFrom,
  acousticReach,
  localWeatherAt,
  selectedDailyRain,
  receivedEventEvidence,
  projectEventEvidence,
  ACTIVITY_DISPLAY_BYTES,
  nativeText,
  type EventOriginalMetadata,
  type EventEvidence,
  selectedEventPresentation,
  definitionPin,
  typedRequestVocabulary,
  selectedTemporalPolicy,
  type TemporalValue,
  type ActivityDefinitionScope,
  type ActivityView,
  type Entity,
  type PracticeProgress,
  type BodyEligibilityWitness,
  type WorldState,
} from '@open-legend/domain';
import { namePhrase } from '@open-legend/language';
import type { EntityView, GameView } from '@open-legend/protocol';
import type { NativeWorld, NativeWorldConsumer } from '@open-legend/native-simulation';
import { scopeKey, type RequestScope } from './authority.js';
import {
  bodyReferenceFor,
  contextActionRevisionFor,
  evidenceSourceHandle,
  permittedSourceHandle,
  type ContextActionWitness,
} from './entity-references.js';
import {
  nativeCurrentValue,
  type NativeActorPerception,
  type NativeActorSelf,
  type NativeBodyBinding,
} from './native-perception.js';
import {
  projectObservedAppearance,
  projectObservedCommunication,
  projectObservedEntity,
} from './observed-body-view.js';
import {
  communicationReference,
  currentContactReferenceFor,
  projectPlayerEventRoles,
  type PlayerEventRoleFacts,
} from './public-contact-references.js';
import {
  projectKnownTradeSummary,
  tradeDraftScopeFor,
  tradeDefinitionsRevisionFor,
  tradeReaderRevisionFor,
} from './trade-view.js';
import { projectMeleeAttackSource } from './attack-execution-view.js';
import { projectActivityStatusFrom } from './activity-requests.js';
import {
  projectPlayerPresentation,
  projectPlayerCartography,
  projectPlayerClock,
  playerHistoryText,
} from './player-world-view.js';
import { boundPlayerEvents, isPlayerJournalEvent } from './player-events-view.js';
import { personalEventEvidence } from './personal-accounts.js';
import { publicEvent, projectConversationEvent } from './perceived-events.js';
import {
  hydratePlayerPractice,
  projectPlayerAction,
  projectPlayerAttempts,
  projectPlayerBody,
  projectPlayerEquipment,
  type PlayerPracticeLoader,
  projectPlayerControl,
  projectRecoveryControl,
  projectRespawnControl,
  playerHasWork,
} from './player-self-view.js';
import {
  attachNativeConsumer,
  nativeJsonEncodingWorkspace,
  nativeJsonFixedWorkspace,
  reserveNativeJsonTextWorkspace,
} from './native-consumer.js';
import { nativeActivityDisplayWorkspace } from './native-provider-format.js';

type PlayerActor = NonNullable<Entity['actor']>;
type ViewCapacity = Pick<NativeWorld, 'reserveConsumerBytes'>;

// The selected formatter creates closed JS records and arrays. Their existing
// children remain borrowed from captures; only the new storage is counted here.
const objectBytes = (fields: number) => 256 + 64 * fields;
const arrayBytes = (items: number) => 256 + 64 * items;
const textBytes = (units: number) => 64 + 2 * units;

function fieldCount(value: object): number {
  let count = 0;
  for (const key in value) if (Object.hasOwn(value, key)) count++;
  return count;
}

function speechUnits(speech: EventEvidence['speech']): number {
  let units = 0;
  for (const segment of speech?.segments ?? [])
    units += (segment.kind === 'heard' ? segment.text.length : 3) + 1;
  return units;
}

function narrationUnits(value: EventEvidence['text']): number {
  if (typeof value === 'string') return value.length;
  let units = 0;
  for (const part of value.narration.parts) {
    if (typeof part === 'string') units += part.length;
    else if ('entityId' in part) units += (value.names[part.entityId]?.name.length ?? 0) + 32;
    else units += part.verb.length + 32;
  }
  return units;
}

/** The shared conversation formatter uses String on a selected event value.
 * Account the actual joined array elements without producing that string. */
function conversationValueUnits(value: unknown): number {
  if (typeof value === 'string') return value.length;
  if (!Array.isArray(value)) return 32;
  let units = value.length;
  for (const child of value) if (child != null) units += conversationValueUnits(child);
  return units;
}

export function nativePlayerProjectionBytes(
  self: NativePlayerActorSelf,
  perception: NativePlayerActorPerception,
  definitions: NativePlayerViewDefinitions,
  map: WorldState['map'],
  withdrawals: readonly unknown[],
): { readonly output: number; readonly workspace: number } {
  // The top-level view/player and their fixed clock, guide, cartography, body,
  // action, inventory, control and AI shells. The physical map is one shallow
  // spread, so its already owned terrain and spatial children do not enter.
  let output =
    objectBytes(44) + objectBytes(51) + 16 * objectBytes(8) + objectBytes(fieldCount(map) + 1);
  let workspace = 12 * objectBytes(16);
  const traits = self.identity.traits?.length ?? 0;
  const ports = self.player.body?.equipmentPorts?.length ?? 0;
  const attempts = self.player.agency.attempts.length;
  const communication = self.player.communicationSubjects;
  const icons = definitions.presentation?.mapArt?.markerIcons.length ?? 0;
  const scars = definitions.bodyPolicy?.reincarnation?.scars.length ?? 0;
  output +=
    arrayBytes(self.attributes.length) +
    arrayBytes(traits) +
    traits * objectBytes(3) +
    arrayBytes(ports) +
    ports * (objectBytes(8) + objectBytes(4)) +
    arrayBytes(attempts) +
    attempts * objectBytes(7) +
    arrayBytes(communication.length) +
    communication.length * (objectBytes(2) + textBytes(64)) +
    arrayBytes(icons) +
    icons * objectBytes(8) +
    arrayBytes(scars) +
    scars * objectBytes(4) +
    arrayBytes(fieldCount(definitions.statusPolicy.namedTimes)) +
    arrayBytes(withdrawals.length + 3) +
    (withdrawals.length + 3) * (objectBytes(6) + objectBytes(4));
  workspace += arrayBytes(scars) + arrayBytes(fieldCount(definitions.nativeStrikes ?? {}));
  for (const { label, description } of communication)
    if (label === undefined)
      output += textBytes(
        typeof description === 'string' ? description.length : (description?.name.length ?? 0),
      );

  const calendar = definitions.presentation?.calendar;
  if (calendar?.historyTemplate) {
    const template = calendar.historyTemplate;
    const units =
      template.length +
      Math.floor(template.length / '{startDay}'.length) * ((calendar.dayLabel?.length ?? 0) + 32);
    output += textBytes(units);
    workspace += 3 * textBytes(units);
  }
  let practice = 0,
    releases = 0;
  for (const definition of definitions.attributeDefinitions) {
    const progress = self.player.practice?.[definition.id];
    if (!progress || !definition.practice) continue;
    practice++;
    releases += progress.releases.length;
    const presentation = definition.practice.presentation;
    const units = 4 * (presentation.effect.length + presentation.progress.length) + 128;
    output += 2 * textBytes(units);
    workspace += 3 * textBytes(units) + arrayBytes(progress.releases.length);
  }
  // Each successful activity caption is bounded by the shared display owner.
  // Its actual render workspace is admitted separately at the loaded view.
  output +=
    arrayBytes(practice) +
    practice * (objectBytes(20) + arrayBytes(0)) +
    releases * (objectBytes(4) + 64 + textBytes(ACTIVITY_DISPLAY_BYTES));
  workspace +=
    arrayBytes(self.player.practiceRecords.length) * 4 +
    self.player.practiceRecords.length * arrayBytes(2) +
    arrayBytes(definitions.attributeDefinitions.length) +
    arrayBytes(practice) +
    practice * (2 * objectBytes(20) + 2 * arrayBytes(0)) +
    releases * (objectBytes(4) + 4 * 64 + textBytes(ACTIVITY_DISPLAY_BYTES));

  output += arrayBytes(perception.bodies.length);
  let bodyWorkspace = 0;
  for (const binding of perception.bodies) {
    let statusUnits = 0;
    for (let i = binding.first; i < binding.first + binding.count; i++) {
      const value = perception.cut.current[i]?.value;
      if (value?.kind !== 'body') continue;
      for (const label of value.body.outward) statusUnits += label.length + 2;
      // The shared immutable split memo lives with each originating read
      // body, so its wrappers overlap across the whole selected body list.
      workspace += 3 * objectBytes(12) + nativeJsonEncodingWorkspace(value.body);
    }
    // Entity record, observation/size/heat/animation/carried and optional
    // communication/trade shells. Digests and composed status are new text.
    output +=
      objectBytes(49) +
      9 * objectBytes(8) +
      arrayBytes(0) +
      10 * textBytes(72) +
      textBytes(statusUnits);
    bodyWorkspace = Math.max(
      bodyWorkspace,
      13 * objectBytes(16) +
        3 * arrayBytes(binding.count) +
        binding.count * objectBytes(11) +
        textBytes(statusUnits) +
        nativeJsonEncodingWorkspace(binding.player.context),
    );
  }
  return { output, workspace: workspace + bodyWorkspace };
}

export function nativePlayerEventSelectionBytes(read: NativePlayerEventRead): number {
  // Evidence/presentation wrappers, flatMap result, stable sort and filtered
  // selected-address arrays. Their child facts are borrowed from this read.
  let bytes =
    14 * arrayBytes(read.accounts.length) +
    read.accounts.length * (2 * objectBytes(25) + objectBytes(5) + arrayBytes(2));
  for (const { evidence, values } of read.accounts) {
    const fallback = evidence ? undefined : values?.find((value) => value.kind === 'event');
    const text = evidence?.text ?? (fallback?.kind === 'event' ? fallback.text : undefined);
    if (text !== undefined && typeof text !== 'string')
      bytes += 3 * textBytes(narrationUnits(text)) + 2 * nativeJsonEncodingWorkspace(text);
    if (evidence?.speech)
      bytes +=
        arrayBytes(evidence.speech.segments.length) + 2 * textBytes(speechUnits(evidence.speech));
  }
  return bytes;
}

export function nativePlayerEventViewBytes(
  events: ReturnType<typeof nativePlayerEvents>,
  conversation: ReturnType<typeof nativePlayerEvents>,
  definitions: NativePlayerViewDefinitions,
): { readonly output: number; readonly workspace: number } {
  const rules = selectedPlayerViewRules({ profile: definitions.profile });
  let output = 2 * arrayBytes(events.length) + objectBytes(2);
  let workspace = 0;
  let journal = 0;
  for (let i = events.length - 1; i >= 0 && journal < 60; i--) {
    const event = events[i]!;
    if (!isPlayerJournalEvent(event, rules)) continue;
    journal++;
    const references = event.references?.length ?? 0;
    const speech = event.speech;
    const nameUnits =
      (speech?.speaker?.nameAtTime.length ?? 0) + (speech?.addressee?.nameAtTime.length ?? 0);
    const words = speechUnits(speech);
    const attributeUnits =
      (typeof event.data?.['attributeName'] === 'string' ? event.data['attributeName'].length : 0) +
      (typeof event.data?.['causeLabel'] === 'string' ? event.data['causeLabel'].length : 0);
    let labelUnits = 0;
    for (const reference of event.references ?? [])
      labelUnits = Math.max(labelUnits, reference.label.length);
    const units = narrationUnits(event.text) + labelUnits + 3 * attributeUnits + 96;
    output +=
      objectBytes(17) +
      objectBytes(12) +
      arrayBytes(references) +
      references * (objectBytes(7) + 3 * textBytes(72)) +
      textBytes(units);
    if (speech)
      output +=
        3 * objectBytes(10) +
        arrayBytes(8) +
        8 * objectBytes(5) +
        5 * textBytes(words + 3 * nameUnits + 128) +
        4 * textBytes(72);
    if (event.sound) output += 4 * objectBytes(14) + 2 * textBytes(64);
    workspace = Math.max(
      workspace,
      14 * objectBytes(10) +
        2 * arrayBytes(references) +
        3 * textBytes(units) +
        3 * arrayBytes(speech?.segments.length ?? 0) +
        4 * textBytes(words + 3 * nameUnits + 128),
    );
  }
  for (const event of conversation) {
    const units =
      speechUnits(event.speech) +
      narrationUnits(event.text) +
      conversationValueUnits(event.data?.['text']);
    output += objectBytes(13) + objectBytes(11) + textBytes(units);
    workspace = Math.max(workspace, 3 * textBytes(units));
  }
  return { output, workspace };
}

function formatWithJsonWorkspace<T>(
  capacity: ViewCapacity,
  input: unknown,
  format: () => T,
  canonical = false,
): T {
  const workspace = reserveNativeJsonTextWorkspace(capacity, input, canonical);
  try {
    return format();
  } finally {
    workspace.release();
  }
}

/** Read-only authored inputs transferred once with installation. These contain
 * no actor, history, clock, inventory or writable simulation object. */
export interface NativePlayerViewDefinitions {
  readonly profile: WorldState['profile'];
  readonly portraits?: NonNullable<WorldState['presentation']>['portraits'];
  readonly itemArt?: NonNullable<WorldState['presentation']>['itemArt'];
  readonly bodyEligibility: Omit<BodyEligibilityWitness, 'body' | 'manifest'>;
  readonly tradeDefinitionsRevision: string;
  readonly tradeTitle: string;
  readonly attributeDefinitions: WorldState['moduleManifest']['definitions'];
  readonly practiceAttributeIds: ReadonlySet<string>;
  readonly statusPolicy: WorldState['statusEffectPolicy'];
  readonly bodyPolicy: WorldState['moduleManifest']['bodyPolicy'];
  readonly participationPolicy: WorldState['participationPolicy'];
  readonly itemDefinitions: WorldState['itemDefinitions'];
  readonly nativeStrikes: WorldState['nativeStrikes'];
  readonly strikeSupported: boolean;
  readonly presentation: WorldState['presentation'];
  readonly knowledgePolicy: WorldState['knowledgePolicy'];
  readonly dailyRain: ReturnType<typeof selectedDailyRain>;
  readonly acoustics: WorldState['moduleManifest']['acoustics'];
  readonly eventPresentation: ReturnType<typeof selectedEventPresentation>;
  readonly workBatchRevision: GameView['player']['workBatchRevision'];
  readonly actionWording: GameView['player']['actionWording'];
  readonly inventionPolicy: GameView['inventionPolicy'];
  readonly recentMaxAgeSeconds: number;
}

/** Setup reads only immutable authored owners. The result remains outside
 * mutable simulation authority and cannot supply actor or historical facts. */
export function nativePlayerViewDefinitions(
  worldId: string,
  actorId: string,
  definitions: Pick<
    WorldState,
    | 'profile'
    | 'presentation'
    | 'moduleManifest'
    | 'statusEffectPolicy'
    | 'cognitionPolicy'
    | 'itemDefinitions'
    | 'itemHandling'
    | 'constructionProfile'
    | 'participationPolicy'
    | 'nativeStrikes'
    | 'knowledgePolicy'
    | 'constructionProfile'
    | 'dailyRainDefinitions'
    | 'workBatchPolicy'
    | 'inventionPolicy'
  > &
    ActivityDefinitionScope,
  capacity: ViewCapacity,
): NativePlayerViewDefinitions {
  const attributes = definitions.moduleManifest.definitions;
  const vocabulary = typedRequestVocabulary(definitions);
  // The returned object retains selected immutable definitions, a practice-ID
  // set, copied example slots and the two small revision strings.
  const output = capacity.reserveConsumerBytes(
    objectBytes(21) +
      objectBytes(4) +
      objectBytes(2) +
      objectBytes(3) +
      arrayBytes(4 * attributes.length) +
      arrayBytes(vocabulary.examples.length) +
      textBytes(24),
  );
  let revision: string | undefined;
  let revisionOwner: NativeWorldConsumer | undefined;
  try {
    if (definitions.workBatchPolicy) {
      const policy = definitions.workBatchPolicy;
      const pin = formatWithJsonWorkspace(
        capacity,
        policy,
        () => definitionPin({ ...policy }),
        true,
      );
      const body = definitions.moduleManifest.bodyPolicyPin;
      const pins = [pin, body];
      // This field is the existing JSON text itself and must outlive its encoder.
      revisionOwner = capacity.reserveConsumerBytes(
        textBytes(
          128 +
            6 *
              (pin.id.length +
                pin.digest.length +
                (body ? body.id.length + body.digest.length : 0)),
        ),
      );
      revision = formatWithJsonWorkspace(capacity, pins, () => JSON.stringify(pins));
    }
    const itemArt = definitions.presentation?.itemArt;
    const tradeDefinitionsRevision = formatWithJsonWorkspace(
      capacity,
      [
        'personal-source',
        worldId,
        actorId,
        [
          'trade-definitions',
          definitions.itemDefinitions,
          itemArt,
          definitions.itemHandling,
          definitions.constructionProfile,
        ],
      ],
      () =>
        tradeDefinitionsRevisionFor(worldId, actorId, {
          itemDefinitions: definitions.itemDefinitions,
          itemArt,
          itemHandling: definitions.itemHandling,
          constructionProfile: definitions.constructionProfile,
        }),
    );
    const view = attachNativeConsumer(
      {
        profile: definitions.profile,
        portraits: definitions.presentation?.portraits,
        itemArt: definitions.presentation?.itemArt,
        bodyEligibility: {
          bodyPolicy: definitions.moduleManifest.bodyPolicyPin,
          attributes: definitions.moduleManifest.pins,
          status: definitions.statusEffectPolicy.revision,
          cognition: definitions.cognitionPolicy,
        },
        tradeDefinitionsRevision,
        tradeTitle: selectedTradeViewTitle(definitions),
        attributeDefinitions: attributes,
        practiceAttributeIds: new Set(
          definitions.moduleManifest.definitions
            .filter((definition) => definition.practice)
            .map((definition) => definition.id),
        ),
        statusPolicy: definitions.statusEffectPolicy,
        bodyPolicy: definitions.moduleManifest.bodyPolicy,
        participationPolicy: definitions.participationPolicy,
        itemDefinitions: definitions.itemDefinitions,
        nativeStrikes: definitions.nativeStrikes,
        strikeSupported: nativeCommandSupported(definitions, 'strike'),
        presentation: definitions.presentation,
        knowledgePolicy: definitions.knowledgePolicy,
        dailyRain: selectedDailyRain(definitions),
        acoustics: definitions.moduleManifest.acoustics,
        eventPresentation: selectedEventPresentation(definitions),
        workBatchRevision: revision,
        actionWording: {
          examples: [...vocabulary.examples],
          placeholder: vocabulary.placeholder,
        },
        inventionPolicy: {
          revision: definitions.inventionPolicy.revision,
          playerLocked: definitions.inventionPolicy.playerLocked,
          agentLocked: definitions.inventionPolicy.agentLocked,
        },
        recentMaxAgeSeconds: selectedTemporalPolicy(definitions).recent.maxAgeSeconds,
      },
      output,
    );
    if (revisionOwner) attachNativeConsumer(view, revisionOwner);
    return view;
  } catch (error) {
    output.release();
    revisionOwner?.release();
    throw error;
  }
}
export interface NativePlayerActorSelf extends NativeActorSelf {
  readonly physicalLife?: number;
  readonly alive: boolean;
  readonly incapacitated: boolean;
  readonly supportSurfaceId: GameView['player']['supportSurfaceId'];
  readonly bodyProfile: Pick<
    Entity['spatial']['body'],
    'radius' | 'height' | 'eyeHeight' | 'earHeight'
  >;
  readonly statusEffects: GameView['player']['statusEffects'];
  readonly actionsBlocked: boolean;
  readonly identity: Omit<NativeActorSelf['identity'], 'traits'> & {
    readonly traits?: PlayerActor['traits'];
  };
  readonly speech: boolean;
  readonly speechBlocked: boolean;
  readonly action: {
    readonly id: string;
    readonly type: string;
    readonly stage: string;
    readonly totalSeconds: number;
    readonly remainingSeconds: number;
    readonly preparingNavigation: boolean;
    readonly targetId?: string;
    readonly definitionId?: string;
    readonly attributeId?: string;
  } | null;
  readonly player: {
    readonly canSteer: boolean;
    readonly seed: number;
    readonly moduleRevision: number;
    readonly spatialRevision: number;
    readonly body?: BodyEligibilityWitness['body'];
    readonly heldStock: readonly (readonly [string, number])[];
    /** The supported closed inventory installation proves this is absent. */
    readonly inventoryRevision?: number;
    readonly equipped: readonly { readonly id: string; readonly definitionId: string }[];
    readonly knowledgeRevision: number;
    readonly agency: PlayerActor['agency'];
    readonly practice?: Readonly<Record<string, PracticeProgress>>;
    readonly practiceRecords: readonly { readonly key: string; readonly view: ActivityView }[];
    readonly participation?: PlayerActor['participation'];
    readonly pendingDeath?: PlayerActor['pendingDeath'];
    readonly scars?: PlayerActor['scars'];
    readonly remainsPhase?: string;
    readonly evasionReadyAt?: number;
    readonly combatReadyAt?: number;
    readonly naturalStrikeIds?: readonly string[];
    readonly actionAnimation: GameView['player']['actionAnimation'];
    readonly senses: {
      readonly enabled: boolean;
      readonly perceptionBlocked: boolean;
      readonly radius: number;
      readonly visionAngle: number;
      readonly hearingFloor: number | null;
    };
    readonly mapMarkers: NonNullable<GameView['cartography']>['markers'];
    readonly communicationSubjects: readonly {
      readonly id: string;
      readonly label?: string;
      readonly description?: Parameters<typeof namePhrase>[0];
    }[];
    /** Installed learned-capability rows were read completely and are empty. */
    readonly knownRecipes: readonly [];
  };
}

/** Complete owned body/practice/action products. Operational scope and reader
 * revisions are separate application facts, supplied by the final request owner. */
export async function nativePlayerOwnedView(
  self: NativePlayerActorSelf,
  perception: NativePlayerActorPerception,
  definitions: NativePlayerViewDefinitions,
  operational: {
    readonly paused: boolean;
    readonly inputScope: GameView['player']['inputScope'];
    readonly freshWorldReview: boolean;
    readonly practiceLoader: PlayerPracticeLoader;
  },
  capacity: ViewCapacity,
) {
  const rules = selectedPlayerViewRules({ profile: definitions.profile });
  const records = new Map(self.player.practiceRecords.map((record) => [record.key, record.view]));
  let activityWorkspace: NativeWorldConsumer | undefined;
  let activityBytes = 0;
  const measureActivity = (view: ActivityView) => {
    const measuring = capacity.reserveConsumerBytes(
      nativeJsonFixedWorkspace + nativeJsonEncodingWorkspace(view),
    );
    let bytes: number;
    try {
      bytes = nativeActivityDisplayWorkspace(view);
    } finally {
      measuring.release();
    }
    if (bytes <= activityBytes) return;
    const next = capacity.reserveConsumerBytes(bytes);
    activityWorkspace?.release();
    activityWorkspace = next;
    activityBytes = bytes;
  };
  let practice: Awaited<ReturnType<typeof hydratePlayerPractice>>;
  try {
    const initial = ownPracticeFrom(
      definitions.attributeDefinitions,
      self.player.practice,
      (id) => {
        const view = records.get(id);
        if (view) measureActivity(view);
        return view;
      },
    );
    activityWorkspace?.release();
    activityWorkspace = undefined;
    activityBytes = 0;
    const missing = initial.flatMap((progress) =>
      progress.evidence
        .filter((evidence) => !records.has(evidence.occurrenceId))
        .map((evidence) => evidence.occurrenceId),
    );
    practice = await hydratePlayerPractice(initial, missing, async (ids) => {
      const rows = await operational.practiceLoader(ids);
      for (const { entry } of rows) if (!entry.revoked) measureActivity(entry.view);
      return rows;
    });
  } finally {
    activityWorkspace?.release();
  }
  const hasWork = playerHasWork(!!self.action, self.player.agency);
  const strikes = Object.values(definitions.nativeStrikes ?? {}).filter((strike) =>
    supportsStrikeBody(
      self.player.body?.plan,
      self.player.naturalStrikeIds,
      strike,
      selectedNaturalStrikeBodyPlans({ profile: definitions.profile }),
    ),
  );
  const strike = strikes.find((candidate) => !candidate.weaponItemId);
  const attackSource = strike
    ? projectMeleeAttackSource(
        strike,
        definitions.strikeSupported,
        strikes.some(
          (candidate) =>
            candidate.id === strike.id && candidate.weaponItemId === strike.weaponItemId,
        ),
        (self.player.combatReadyAt ?? 0) > self.at,
        undefined,
      )
    : undefined;
  const labels = selectedPlayerWorkLabels(
    { profile: definitions.profile },
    {
      waitingForFeedback: false,
      rangedReady: false,
      statusLabel: definitions.statusPolicy.definitions.find(
        (definition) => definition.id === self.action?.definitionId,
      )?.label,
      replenishmentLabel: definitions.attributeDefinitions.find(
        (definition) => definition.id === self.action?.attributeId,
      )?.reservoir?.actionLabel,
      targetName: perception.bodies.find((binding) => binding.sourceId === self.action?.targetId)
        ?.name.name,
      evasionLabel: definitions.bodyPolicy?.evasion?.label,
    },
  );
  const action = self.action
    ? projectPlayerAction(
        { ...self.action, rangedReady: false, waitingForFeedback: false },
        {
          paused: operational.paused,
          label: self.action.preparingNavigation
            ? rules.preparingRoute
            : (labels[self.action.type] ?? rules.working),
          hasExecution: false,
          execution: undefined,
          hasDetail: false,
          detail: undefined,
          controls: undefined,
          statusTypes: rules.actionStatusTypes,
          workingStatusTypes: rules.workingStatusTypes,
          noProgressTypes: rules.noProgressTypes,
        },
      )
    : null;
  if (self.player.agency.plan?.activity)
    throw new Error('Native activity-graph presentation is unavailable.');
  return {
    ...projectPlayerBody(
      {
        identity: self.identity,
        knowledgeRevision: self.player.knowledgeRevision,
        position: self.position,
        supportSurfaceId: self.supportSurfaceId,
        heading: self.heading,
        profile: self.bodyProfile,
        attributes: self.attributes,
        alive: self.alive,
        physicalLife: self.physicalLife,
        participation: self.player.participation,
        pendingDeath: self.player.pendingDeath,
        scars: self.player.scars,
        remainsPhase: self.player.remainsPhase,
        statusEffects: self.statusEffects,
        evasionReadyAt: self.player.evasionReadyAt,
        attackModeNotice: undefined,
        at: self.at,
      },
      {
        portrait:
          definitions.portraits &&
          self.identity.appearance &&
          Object.hasOwn(definitions.portraits, self.identity.appearance)
            ? definitions.portraits[self.identity.appearance]
            : undefined,
        practice,
        actionAnimation: self.player.actionAnimation,
        inputScope: operational.inputScope,
        attackSource,
        hasWork,
        departureNotice: definitions.participationPolicy?.exitDescription,
        bodyPolicy: definitions.bodyPolicy,
        freshWorldReview: operational.freshWorldReview,
        practiceAttributeIds: definitions.practiceAttributeIds,
        defaultAppearance: rules.defaultAppearance,
      },
    ),
    action,
    traits: self.identity.traits?.map((trait) => ({ ...trait })),
    inventory: [],
    equipmentPorts: projectPlayerEquipment(
      self.player.body?.equipmentPorts ?? [],
      self.player.equipped,
      definitions.itemDefinitions,
      definitions.itemArt,
    ),
    inventoryRevision: self.player.inventoryRevision ?? 0,
    actionAttempts: projectPlayerAttempts(self.player.agency.attempts),
    activity: projectActivityStatusFrom(self.player.agency.plan, !!self.action, undefined),
    // The same complete personal agreement proof covers the Source outing
    // readers; positive acquired terms refuse at the native capture owner.
    outings: [],
    workBatchRevision: definitions.workBatchRevision,
    actionWording: definitions.actionWording,
    ...(definitions.presentation?.calendar?.historyTemplate
      ? {
          history: playerHistoryText(
            self.at,
            definitions.statusPolicy.clockOffsetHours,
            definitions.presentation.calendar,
          ),
        }
      : {}),
  };
}

export function nativePlayerCommunicationReferences(
  self: NativePlayerActorSelf,
  scope: RequestScope,
) {
  return self.player.communicationSubjects.map((subject) => ({
    id: communicationReference(scope, { id: subject.id }),
    label: subject.label ?? namePhrase(subject.description!, 'none'),
  }));
}
export interface NativePlayerBodyBinding extends NativeBodyBinding {
  readonly player: {
    readonly context: ContextActionWitness;
    readonly attentionPreference?: boolean;
    readonly communicationId?: string;
    readonly tradeEligible: boolean;
  };
}
export interface NativePlayerActorPerception extends NativeActorPerception {
  readonly bodies: readonly NativePlayerBodyBinding[];
  /** Complete current open-head selection, filtered by actual privacy, proved no terms.
   * A positive unconverted agreement refuses at the native read owner. */
  readonly player: {
    readonly tradeTerms: 'none';
    readonly physicalLandmarks: 'absent';
    readonly finiteWeatherCue: 'absent';
  };
}

/** Full public world-display fields from this actor's permitted cut and the
 * installed immutable definitions. Async storage revisions and provider state
 * remain explicit facts of the application request owner. */
export function nativePlayerWorldView(
  self: NativePlayerActorSelf,
  perception: NativePlayerActorPerception,
  definitions: NativePlayerViewDefinitions,
  controls: NativePlayerControlFacts,
  operational: {
    readonly map: WorldState['map'];
    readonly placesRevision: NonNullable<GameView['cartography']>['placesRevision'];
  } & Pick<GameView['clock'], 'speed' | 'baseRatio' | 'paused' | 'pauseReason'>,
) {
  assertPlayerControlCut(self, controls);
  if (
    perception.player.physicalLandmarks !== 'absent' ||
    perception.player.finiteWeatherCue !== 'absent'
  )
    throw new Error('Native player world display requires its admitted physical families.');
  const senses = self.player.senses;
  const policy = definitions.acoustics;
  const guide = perceptionGuideFrom({
    body: self.bodyProfile,
    heading: self.heading,
    enabled: senses.enabled,
    hearingFloor: senses.hearingFloor,
    visionAngle: senses.visionAngle,
    policy,
  });
  return {
    presentation: projectPlayerPresentation(definitions.presentation),
    ...(definitions.presentation?.mapArt
      ? {
          cartography: projectPlayerCartography(
            definitions.presentation.mapArt,
            definitions.knowledgePolicy?.maxCharacters.subject,
            self.player.knowledgeRevision,
            operational.placesRevision,
            self.player.mapMarkers,
          ),
        }
      : {}),
    vision: { radius: senses.perceptionBlocked ? 0 : senses.radius, ...guide.vision },
    hearing: {
      referenceRadius:
        senses.hearingFloor === null
          ? 0
          : acousticReach(policy, senses.hearingFloor, 'normal', policy.thresholdsDb.clear),
      ...guide.hearing,
    },
    map: { ...operational.map, seed: self.player.seed },
    clock: projectPlayerClock(
      self.at,
      definitions.presentation,
      definitions.statusPolicy.namedTimes,
      definitions.statusPolicy.clockOffsetHours,
      {
        ...operational,
        preparingNavigation: controls.preparingNavigation,
        weather: localWeatherAt(
          definitions.dailyRain,
          undefined,
          self.at,
          definitions.statusPolicy.clockOffsetHours,
          self.position,
        ),
      },
    ),
  };
}

export interface NativePlayerEventRead {
  readonly worldId: string;
  readonly generation: string;
  readonly acceptedCut: number;
  readonly actorId: string;
  readonly physicalLife: number | null;
  readonly at: number;
  readonly privacyRevision: number;
  readonly accounts: readonly {
    readonly original: EventOriginalMetadata;
    readonly authoredBySelf: boolean;
    readonly evidence?: EventEvidence;
    readonly values?: readonly TemporalValue[];
    readonly roles: PlayerEventRoleFacts;
  }[];
}
export function nativePlayerEventViews(
  self: NativePlayerActorSelf,
  events: ReturnType<typeof nativePlayerEvents>,
  conversation: ReturnType<typeof nativePlayerEvents>,
  read: NativePlayerEventRead,
  definitions: NativePlayerViewDefinitions,
  scope: RequestScope,
  timelineId: string,
  replies: ReadonlyMap<string, Parameters<typeof projectConversationEvent>[2]>,
) {
  const roles = new Map<string, PlayerEventRoleFacts>();
  for (const account of read.accounts) roles.set(account.original.id, account.roles);
  const rules = selectedPlayerViewRules({ profile: definitions.profile });
  const referenceScope = JSON.stringify([self.worldId, `${timelineId}:${scopeKey(scope)}`]);
  return {
    events: events
      .filter((event) => isPlayerJournalEvent(event, rules))
      .slice(-60)
      .map((event) =>
        publicEvent(event, definitions.eventPresentation, self.actorId, referenceScope, () =>
          projectPlayerEventRoles(scope, event, roles.get(event.id)!),
        ),
      ),
    conversation: conversation.map((event) =>
      projectConversationEvent(event, self.actorId, replies.get(event.id)),
    ),
  };
}
export function nativePlayerEvents(
  self: NativePlayerActorSelf,
  perception: NativePlayerActorPerception,
  read: NativePlayerEventRead,
  definitions: NativePlayerViewDefinitions,
) {
  if (
    self.worldId !== read.worldId ||
    self.generation !== read.generation ||
    self.acceptedCut !== read.acceptedCut ||
    self.actorId !== read.actorId ||
    (self.physicalLife ?? 0) !== (read.physicalLife ?? 0) ||
    self.at !== read.at ||
    perception.cut.privacyRevision !== read.privacyRevision
  )
    throw new Error('The captured player event cut is unavailable.');
  const selected = boundPlayerEvents(
    read.accounts.flatMap((account) => {
      const evidence =
        account.evidence !== undefined
          ? personalEventEvidence(account.evidence)
          : receivedEventEvidence(self.actorId, account.values ?? []);
      if (!evidence) return [];
      const event = projectEventEvidence(account.original, evidence);
      // A temporary text wrapper avoids retaining a rendered-text memo in
      // the immutable native input when the journal selector checks movement.
      if (typeof event.text !== 'string') event.text = { ...event.text };
      return [event];
    }),
    selectedPlayerViewRules({ profile: definitions.profile }),
  );
  // Only selected events need their presentation; journal and conversation
  // share the same wording and captured names.
  for (const event of selected)
    if (typeof event.text !== 'string') event.text = nativeText(event.text);
  return selected;
}

/** Sealed native preparation emits this only after the actual standing reply. */
export interface NativePlayerControlFacts {
  readonly worldId: string;
  readonly generation: string;
  readonly acceptedCut: number;
  readonly actorId: string;
  readonly physicalLife: number | null;
  readonly at: number;
  readonly canRecover: boolean;
  readonly preparingNavigation: boolean;
}
function assertPlayerControlCut(self: NativePlayerActorSelf, read: NativePlayerControlFacts) {
  if (
    self.worldId !== read.worldId ||
    self.actorId !== read.actorId ||
    self.generation !== read.generation ||
    self.acceptedCut !== read.acceptedCut ||
    (self.physicalLife ?? 0) !== (read.physicalLife ?? 0) ||
    self.at !== read.at
  )
    throw new Error('Native player control facts differ from the captured cut.');
}
export function nativePlayerControls(
  self: NativePlayerActorSelf,
  prepared: NativePlayerControlFacts,
  definitions: NativePlayerViewDefinitions,
  operational: {
    readonly paused: boolean;
    readonly controlling: boolean;
    readonly pausedStop: { readonly ok: boolean; readonly message: string } | undefined;
    readonly withdrawals: readonly {
      readonly id: string;
      readonly label: string;
      readonly command: GameView['player']['controls'][number]['command'];
      readonly ok: boolean;
      readonly message: string;
    }[];
  },
): GameView['player']['controls'] {
  assertPlayerControlCut(self, prepared);
  const rules = selectedPlayerViewRules({ profile: definitions.profile });
  const hasWork = playerHasWork(!!self.action, self.player.agency);
  if (hasWork && operational.paused && !operational.pausedStop)
    throw new Error('Native paused Stop requires its actual preview.');
  const context = {
    profile: definitions.profile,
    paused: operational.paused,
    controlling: operational.controlling,
    active:
      self.player.participation?.phase !== 'inactive' &&
      !operational.paused &&
      self.alive &&
      !self.incapacitated &&
      operational.controlling,
  };
  const controls = [
    projectPlayerControl(
      {
        id: 'cancel',
        label: rules.stopLabel,
        command: { type: 'cancel' },
        possible: hasWork && (operational.pausedStop?.ok ?? true),
        reason: operational.pausedStop?.message ?? rules.noWork,
      },
      context,
    ),
  ];
  for (const option of operational.withdrawals)
    controls.push(
      projectPlayerControl({ ...option, possible: option.ok, reason: option.message }, context),
    );
  if (prepared.canRecover) {
    if (!definitions.bodyPolicy?.recovery) throw new Error('Native recovery policy differs.');
    controls.push(
      projectRecoveryControl(
        definitions.bodyPolicy.recovery.label,
        operational.paused,
        rules.recoverReason,
      ),
    );
  }
  if (self.player.pendingDeath && definitions.bodyPolicy?.reincarnation)
    controls.push(
      projectRespawnControl(
        definitions.bodyPolicy.reincarnation.continueLabel,
        operational.paused,
        self.player.participation?.phase === 'inactive',
        operational.controlling,
        rules.respawnReason,
      ),
    );
  return controls;
}
export function nativeCanUseInventory(
  self: NativePlayerActorSelf,
  paused: boolean,
  controlling: boolean,
): boolean {
  return (
    !paused &&
    self.alive &&
    !self.incapacitated &&
    !self.actionsBlocked &&
    self.player.participation?.phase !== 'inactive' &&
    controlling
  );
}

/** Consume the same complete contact formatter as projectView. Delivery still
 * requires the request's accepted-cut/privacy fence. */
export function nativePlayerEntities(
  self: NativePlayerActorSelf,
  perception: NativePlayerActorPerception,
  definitions: NativePlayerViewDefinitions,
  scope: RequestScope,
  capacity: ViewCapacity,
): EntityView[] {
  if (
    self.worldId !== perception.worldId ||
    self.actorId !== perception.actorId ||
    self.at !== perception.at ||
    scope.actorId !== self.actorId ||
    scope.worldId !== self.worldId ||
    perception.player.tradeTerms !== 'none'
  )
    throw new Error('Native player capture scope differs.');
  const referenceScope = { id: self.worldId };
  const bodyScope = scopeKey(scope);
  const detailTime = (at: number) => (at === perception.sightConfirmedThrough ? undefined : at);
  const playerCanSpeak = self.speech && !self.speechBlocked;
  const bodyWitness = {
    manifest: self.player.moduleRevision,
    ...definitions.bodyEligibility,
    body: self.player.body,
  };
  const readerRevision = formatWithJsonWorkspace(
    capacity,
    bodyWitness,
    () => {
      const input = {
        inventoryRevision: self.player.inventoryRevision,
        bodyRevision: bodyEligibilityRevisionFor(bodyWitness),
        actionId: self.action?.id,
        actionStage: self.action?.stage,
        heldStock: self.player.heldStock,
        moduleRevision: self.player.moduleRevision,
        spatialRevision: self.player.spatialRevision,
        definitionsRevision: definitions.tradeDefinitionsRevision,
      };
      return formatWithJsonWorkspace(
        capacity,
        [
          'personal-source',
          self.worldId,
          self.actorId,
          [
            'trade-reader-owner',
            input.inventoryRevision,
            input.bodyRevision,
            input.actionId,
            input.actionStage,
            input.heldStock,
            input.moduleRevision,
            input.spatialRevision,
            input.definitionsRevision,
          ],
        ],
        () => tradeReaderRevisionFor(self.worldId, self.actorId, input),
      );
    },
    true,
  );
  return perception.bodies.map((binding): EntityView => {
    const captured = perception.cut.current.slice(binding.first, binding.first + binding.count);
    const current = captured.map(nativeCurrentValue);
    const received = current.find((facet) => facet.value.kind === 'body');
    if (!received || received.value.kind !== 'body')
      throw new Error('Native current body is unavailable.');
    const parts = splitObservedBody(received.value.body);
    const description = current.find((facet) => facet.value.kind === 'description');
    const portrait =
      binding.actor &&
      definitions.portraits &&
      parts.details.appearance &&
      Object.hasOwn(definitions.portraits, parts.details.appearance)
        ? definitions.portraits[parts.details.appearance]
        : undefined;
    const appearance = projectObservedAppearance(
      selectedObservedBodyKind({ profile: definitions.profile }, parts.details.kind),
      parts.details,
      description?.value.kind === 'description' ? description.value.text : undefined,
      (description?.role ?? 'direct') === 'direct',
      binding.actor,
      portrait,
    );
    const body = { ...appearance.detail, ...parts.pose };
    const measured =
      received.descriptionSupport?.descriptionMeasuredThrough ?? received.valueMeasuredThrough;
    const acquired = received.descriptionSupport?.descriptionAcquiredAt ?? received.valueAcquiredAt;
    const confirmed = received.descriptionSupport?.confirmedThrough ?? received.confirmedThrough;
    const source = received.descriptionSupport?.confirmation ?? received.source;
    const contact = currentContactReferenceFor(
      scope,
      binding.sourceId,
      binding.physicalLife ?? 0,
      binding.leaseId,
    );
    return projectObservedEntity({
      references: {
        id: contact,
        bodyReference: bodyReferenceFor(bodyScope, binding.sourceId, binding.physicalLife ?? 0),
        contextActionRevision: formatWithJsonWorkspace(
          capacity,
          binding.player.context,
          () => contextActionRevisionFor(bodyScope, binding.player.context),
          true,
        ),
      },
      ...(binding.player.attentionPreference !== undefined
        ? { attentionPreference: binding.player.attentionPreference }
        : {}),
      display: binding.name,
      ...(binding.identity ? { identity: binding.identity } : {}),
      observation: {
        kind: 'current',
        modality: 'sight',
        measurementAt: detailTime(measured),
        acquiredAt: detailTime(acquired),
        confirmedThrough: detailTime(confirmed),
        sourceReference: evidenceSourceHandle(referenceScope, self.actorId, source),
      },
      body,
      kind: appearance.kind,
      portrait: appearance.portrait,
      status: appearance.status,
      bodySize: { width: body.radius * 2, height: body.height },
      facets: current.filter((facet) =>
        ['pile-contents', 'carried', 'public-attributes'].includes(facet.value.kind),
      ),
      observedMoving: current.some((facet) => facet.value.kind === 'observed-motion'),
      observationId: received.id,
      observerId: self.actorId,
      referenceScope,
      sightConfirmedThrough: perception.sightConfirmedThrough,
      resourceArt:
        body.kind === 'resource' &&
        body.subtype &&
        definitions.itemArt &&
        Object.hasOwn(definitions.itemArt, body.subtype)
          ? definitions.itemArt[body.subtype]
          : undefined,
      // The native contact owner refuses positive storage/assembly families
      // until their genuine selected read products are implemented.
      storage: undefined,
      ...(binding.actor
        ? {
            communication: projectObservedCommunication({
              bodyAlive: body.outward[0] === 'alive',
              playerCanSpeak,
              talkRequiresAi: binding.talkRequiresAi,
              communicationReference: binding.player.communicationId
                ? communicationReference(scope, { id: binding.player.communicationId })
                : undefined,
              trade: binding.player.tradeEligible
                ? projectKnownTradeSummary({
                    worldId: self.worldId,
                    observerId: self.actorId,
                    personId: binding.sourceId,
                    personReference: contact,
                    personName: binding.name.name,
                    title: definitions.tradeTitle,
                    draftScope: tradeDraftScopeFor(
                      self.worldId,
                      scope,
                      binding.subject ?? contact,
                      binding.physicalLife ?? 0,
                    ),
                    known: [],
                    at: self.at,
                    readerRevision,
                    disclosureRevision: permittedSourceHandle(referenceScope, self.actorId, [
                      'trade-disclosures',
                      binding.sourceId,
                      [],
                    ]),
                  })
                : undefined,
            }),
          }
        : {}),
    });
  });
}
