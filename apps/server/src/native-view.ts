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
  type EventOriginalMetadata,
  type EventEvidence,
  selectedEventPresentation,
  isConversationEvent,
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

type PlayerActor = NonNullable<Entity['actor']>;

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
): NativePlayerViewDefinitions {
  return {
    profile: definitions.profile,
    portraits: definitions.presentation?.portraits,
    itemArt: definitions.presentation?.itemArt,
    bodyEligibility: {
      bodyPolicy: definitions.moduleManifest.bodyPolicyPin,
      attributes: definitions.moduleManifest.pins,
      status: definitions.statusEffectPolicy.revision,
      cognition: definitions.cognitionPolicy,
    },
    tradeDefinitionsRevision: tradeDefinitionsRevisionFor(worldId, actorId, {
      itemDefinitions: definitions.itemDefinitions,
      itemArt: definitions.presentation?.itemArt,
      itemHandling: definitions.itemHandling,
      constructionProfile: definitions.constructionProfile,
    }),
    tradeTitle: selectedTradeViewTitle(definitions),
    attributeDefinitions: definitions.moduleManifest.definitions,
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
    workBatchRevision: definitions.workBatchPolicy
      ? JSON.stringify([
          definitionPin(definitions.workBatchPolicy),
          definitions.moduleManifest.bodyPolicyPin,
        ])
      : undefined,
    actionWording: {
      examples: [...typedRequestVocabulary(definitions).examples],
      placeholder: typedRequestVocabulary(definitions).placeholder,
    },
    inventionPolicy: {
      revision: definitions.inventionPolicy.revision,
      playerLocked: definitions.inventionPolicy.playerLocked,
      agentLocked: definitions.inventionPolicy.agentLocked,
    },
    recentMaxAgeSeconds: selectedTemporalPolicy(definitions).recent.maxAgeSeconds,
  };
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
) {
  const rules = selectedPlayerViewRules({ profile: definitions.profile });
  const records = new Map(self.player.practiceRecords.map((record) => [record.key, record.view]));
  const initial = ownPracticeFrom(definitions.attributeDefinitions, self.player.practice, (id) =>
    records.get(id),
  );
  const missing = initial.flatMap((progress) =>
    progress.evidence
      .filter((evidence) => !records.has(evidence.occurrenceId))
      .map((evidence) => evidence.occurrenceId),
  );
  const practice = await hydratePlayerPractice(initial, missing, operational.practiceLoader);
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
  perception: NativePlayerActorPerception,
  read: NativePlayerEventRead,
  definitions: NativePlayerViewDefinitions,
  scope: RequestScope,
  timelineId: string,
  replies: ReadonlyMap<string, Parameters<typeof projectConversationEvent>[2]>,
) {
  const events = nativePlayerEvents(self, perception, read, definitions);
  const roles = new Map(read.accounts.map((account) => [account.original.id, account.roles]));
  const rules = selectedPlayerViewRules({ profile: definitions.profile });
  return {
    events: events
      .filter((event) => isPlayerJournalEvent(event, rules))
      .slice(-60)
      .map((event) =>
        publicEvent(
          event,
          definitions.eventPresentation,
          self.actorId,
          JSON.stringify([self.worldId, `${timelineId}:${scopeKey(scope)}`]),
          () => projectPlayerEventRoles(scope, event, roles.get(event.id)!),
        ),
      ),
    conversation: events
      .filter(isConversationEvent)
      .slice(-30)
      .map((event) => projectConversationEvent(event, self.actorId, replies.get(event.id))),
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
  return boundPlayerEvents(
    read.accounts.flatMap((account) => {
      const evidence =
        account.evidence !== undefined
          ? personalEventEvidence(account.evidence)
          : receivedEventEvidence(self.actorId, account.values ?? []);
      return evidence ? [projectEventEvidence(account.original, evidence)] : [];
    }),
    selectedPlayerViewRules({ profile: definitions.profile }),
  );
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

/** Consume the same complete contact formatter as projectView. The returned
 * bindings remain private to the application and must be revalidated with the
 * request's accepted-cut/privacy fence before delivery or command resolution. */
export function nativePlayerEntities(
  self: NativePlayerActorSelf,
  perception: NativePlayerActorPerception,
  definitions: NativePlayerViewDefinitions,
  scope: RequestScope,
): { entities: EntityView[]; bindings: ReadonlyMap<string, NativePlayerBodyBinding> } {
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
  const detailTime = (at: number) => (at === perception.sightConfirmedThrough ? undefined : at);
  const playerCanSpeak = self.speech && !self.speechBlocked;
  const readerRevision = tradeReaderRevisionFor(self.worldId, self.actorId, {
    inventoryRevision: self.player.inventoryRevision,
    bodyRevision: bodyEligibilityRevisionFor({
      manifest: self.player.moduleRevision,
      ...definitions.bodyEligibility,
      body: self.player.body,
    }),
    actionId: self.action?.id,
    actionStage: self.action?.stage,
    heldStock: self.player.heldStock,
    moduleRevision: self.player.moduleRevision,
    spatialRevision: self.player.spatialRevision,
    definitionsRevision: definitions.tradeDefinitionsRevision,
  });
  const bindings = new Map<string, NativePlayerBodyBinding>();
  const entities = perception.bodies.map((binding): EntityView => {
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
    bindings.set(contact, binding);
    return projectObservedEntity({
      references: {
        id: contact,
        bodyReference: bodyReferenceFor(
          scopeKey(scope),
          binding.sourceId,
          binding.physicalLife ?? 0,
        ),
        contextActionRevision: contextActionRevisionFor(scopeKey(scope), binding.player.context),
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
  return { entities, bindings };
}
