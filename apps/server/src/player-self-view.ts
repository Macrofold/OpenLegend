import {
  renderActivity,
  nativeActionIcon,
  selectedPlayerControlCanUseInactive,
  selectedPlayerViewRules,
  type ActivityOccurrence,
  type Entity,
  type ItemInstance,
  type PracticeView,
  type WorldState,
} from '@open-legend/domain';
import type { ActionOption, GameView } from '@open-legend/protocol';

type PlayerActionView = NonNullable<GameView['player']['action']>;
type PlayerActor = NonNullable<Entity['actor']>;
type Player = GameView['player'];
export function playerHasWork(
  hasAction: boolean,
  agency: Pick<PlayerActor['agency'], 'plan' | 'suspended'>,
): boolean {
  return (
    hasAction ||
    !!agency.suspended ||
    agency.plan?.status === 'active' ||
    agency.plan?.status === 'blocked'
  );
}
export function projectPlayerControl(
  input: {
    readonly id: string;
    readonly label: string;
    readonly command: ActionOption['command'];
    readonly possible: boolean;
    readonly reason: string | undefined;
  },
  context: {
    readonly profile: WorldState['profile'];
    readonly active: boolean;
    readonly controlling: boolean;
    readonly paused: boolean;
  },
): ActionOption {
  const rules = selectedPlayerViewRules({ profile: context.profile });
  const canChoose =
    context.active ||
    (selectedPlayerControlCanUseInactive({ profile: context.profile }, input.command) &&
      context.controlling);
  return {
    id: input.id,
    label: input.label,
    icon: nativeActionIcon(input.command.type),
    command: input.command,
    enabled: canChoose && input.possible,
    ...(!canChoose
      ? { reason: context.paused ? rules.pausedAction : rules.unavailableAction }
      : !input.possible && input.reason
        ? { reason: input.reason }
        : {}),
  };
}
export function projectRecoveryControl(
  label: string,
  paused: boolean,
  reason: string,
): ActionOption {
  return { id: 'recover', label, command: { type: 'recover' }, enabled: !paused, reason };
}
export function projectRespawnControl(
  label: string,
  paused: boolean,
  inactive: boolean,
  controlling: boolean,
  reason: string,
): ActionOption {
  return {
    id: 'respawn',
    label,
    command: { type: 'respawn' },
    enabled: !paused && !inactive && controlling,
    reason,
  };
}
export interface PlayerBodyFacts {
  readonly identity: Pick<Entity, 'id' | 'name' | 'nameForm' | 'indefiniteArticle' | 'appearance'>;
  readonly knowledgeRevision: number;
  readonly position: Player['position'];
  readonly supportSurfaceId: Player['supportSurfaceId'];
  readonly heading: number;
  readonly profile: Pick<Entity['spatial']['body'], 'radius' | 'height'>;
  readonly attributes: readonly Player['attributes'][number][];
  readonly alive: boolean;
  readonly physicalLife: number | undefined;
  readonly participation: PlayerActor['participation'];
  readonly pendingDeath: PlayerActor['pendingDeath'];
  readonly scars: PlayerActor['scars'];
  readonly remainsPhase: string | undefined;
  readonly statusEffects: Player['statusEffects'];
  readonly evasionReadyAt: number | undefined;
  readonly attackModeNotice: PlayerActor['attackModeNotice'];
  readonly at: number;
}
export interface PlayerBodyPresentation {
  readonly portrait: Player['portrait'];
  readonly practice: Player['practice'];
  readonly actionAnimation: Player['actionAnimation'];
  readonly inputScope: Player['inputScope'];
  readonly attackSource: Player['attackSource'];
  readonly hasWork: boolean;
  readonly departureNotice: Player['departureNotice'];
  readonly bodyPolicy: WorldState['moduleManifest']['bodyPolicy'];
  readonly freshWorldReview: boolean;
  readonly practiceAttributeIds: ReadonlySet<string>;
  readonly defaultAppearance: string;
}
export function projectPlayerBody(facts: PlayerBodyFacts, input: PlayerBodyPresentation) {
  const policy = input.bodyPolicy;
  const reincarnation = policy?.reincarnation;
  return {
    knowledgeRevision: facts.knowledgeRevision,
    appearance: facts.identity.appearance ?? input.defaultAppearance,
    portrait: input.portrait,
    participation: facts.participation?.phase ?? 'active',
    departureNotice: input.departureNotice,
    id: facts.identity.id,
    name: facts.identity.name,
    nameForm: facts.identity.nameForm,
    indefiniteArticle: facts.identity.indefiniteArticle,
    position: facts.position,
    supportSurfaceId: facts.supportSurfaceId,
    heading: facts.heading,
    bodySize: { width: facts.profile.radius * 2, height: facts.profile.height },
    attributes: facts.attributes.filter(
      (attribute) => !input.practiceAttributeIds.has(attribute.id),
    ),
    practice: input.practice,
    actionAnimation: input.actionAnimation,
    alive: facts.alive,
    ...(input.inputScope !== undefined ? { inputScope: input.inputScope } : {}),
    ...(facts.attackModeNotice ? { attackModeNotice: facts.attackModeNotice } : {}),
    ...(facts.alive ? { attackSource: input.attackSource } : {}),
    hasWork: input.hasWork,
    life: facts.physicalLife ?? 0,
    death:
      facts.pendingDeath && reincarnation
        ? {
            message: reincarnation.deathText,
            freshWorldReview: input.freshWorldReview,
            at: facts.pendingDeath.at,
            corpseId: facts.pendingDeath.corpseId,
            retained: facts.pendingDeath.retained,
            left: facts.pendingDeath.left,
            retainedLabel: reincarnation.retainedLabel,
            lostLabel: reincarnation.lostLabel,
          }
        : null,
    scars: (reincarnation?.scars ?? [])
      .filter((scar) => facts.scars?.[scar.id])
      .map((scar) => ({
        id: scar.id,
        name: scar.name,
        description: scar.description,
        treatmentsRemaining: facts.scars![scar.id]!,
      })),
    ...(!facts.alive
      ? {
          bodyState:
            facts.remainsPhase === 'removed'
              ? ('removed' as const)
              : facts.remainsPhase === 'rotting'
                ? ('rotting' as const)
                : ('dead' as const),
        }
      : {}),
    statusEffects: facts.statusEffects,
    ...(policy?.evasion
      ? {
          evasion: {
            label: policy.evasion.label,
            readyIn: Math.max(0, (facts.evasionReadyAt ?? 0) - facts.at),
          },
        }
      : {}),
  };
}
export interface PlayerActionFacts {
  readonly id: string;
  readonly type: string;
  readonly stage: string;
  readonly totalSeconds: number;
  readonly remainingSeconds: number;
  readonly preparingNavigation: boolean;
  readonly rangedReady: boolean;
  readonly waitingForFeedback: boolean;
}
export interface PlayerActionPresentation {
  readonly paused: boolean;
  readonly label: string;
  readonly hasExecution: boolean;
  readonly execution: PlayerActionView['execution'];
  readonly hasDetail: boolean;
  readonly detail: string | undefined;
  readonly controls: ActionOption[] | undefined;
  readonly statusTypes: readonly string[];
  readonly workingStatusTypes: readonly string[];
  readonly noProgressTypes: readonly string[];
}

/** Progress is presentation of the actor's own captured action. Optional attack
 * controls/execution come from their real readers, never reconstructed targets. */
export function projectPlayerAction(
  action: PlayerActionFacts,
  input: PlayerActionPresentation,
): PlayerActionView {
  return {
    id: action.id,
    ...(input.hasExecution ? { execution: input.execution } : {}),
    showStatus:
      input.statusTypes.includes(action.type) ||
      action.preparingNavigation ||
      (action.stage === 'working' && input.workingStatusTypes.includes(action.type)),
    ...(input.hasDetail ? { detail: input.detail } : {}),
    ...(input.controls ? { controls: input.controls } : {}),
    durationSeconds: action.totalSeconds,
    elapsedSeconds: action.stage === 'working' ? action.totalSeconds - action.remainingSeconds : 0,
    advancing:
      !input.paused &&
      action.stage === 'working' &&
      !action.rangedReady &&
      !action.waitingForFeedback,
    label: input.label,
    progress:
      action.stage === 'approaching' || input.noProgressTypes.includes(action.type)
        ? 0
        : action.totalSeconds === 0
          ? 1
          : Math.max(0, Math.min(1, 1 - action.remainingSeconds / action.totalSeconds)),
  };
}

export function projectPlayerAttempts(
  attempts: PlayerActor['agency']['attempts'],
): GameView['player']['actionAttempts'] {
  return attempts.map((attempt) => ({
    id: attempt.id,
    description: attempt.description,
    status: attempt.status,
    mode: attempt.mode,
    ...(attempt.resolution
      ? { reason: attempt.resolution.reason, category: attempt.resolution.category }
      : {}),
    ...(attempt.alternative ? { fulfillment: attempt.alternative.fulfillment } : {}),
  }));
}

export function projectPlayerEquipment(
  ports: NonNullable<PlayerActor['body']>['equipmentPorts'],
  equipped: readonly Pick<ItemInstance, 'id' | 'definitionId'>[],
  definitions: WorldState['itemDefinitions'],
  itemArt: NonNullable<WorldState['presentation']>['itemArt'],
): GameView['player']['equipmentPorts'] {
  return ports.map((port) => {
    const item = equipped.find((item) =>
      definitions[item.definitionId]!.equipment!.ports.includes(port.id),
    );
    const definition = item && definitions[item.definitionId]!;
    return {
      ...port,
      ...(item && definition
        ? {
            item: {
              id: item.id,
              name: definition.name,
              art:
                itemArt && Object.hasOwn(itemArt, item.definitionId)
                  ? itemArt[item.definitionId]
                  : undefined,
              ...(definition.icon ? { icon: definition.icon } : {}),
            },
          }
        : {}),
    };
  });
}

export type PlayerPracticeLoader = (
  ids: string[],
) => Promise<readonly { readonly entry: Pick<ActivityOccurrence, 'id' | 'view' | 'revoked'> }[]>;

/** The ordinary practice reader hydrates only its actual missing occurrence
 * addresses. Its caller retains and rechecks scope/privacy across this await. */
export async function hydratePlayerPractice(
  progress: PracticeView[],
  missing: readonly string[],
  load: PlayerPracticeLoader | undefined,
): Promise<PracticeView[]> {
  const recorded = new Map<string, Pick<ActivityOccurrence, 'id' | 'view' | 'revoked'>>();
  if (load)
    for (let offset = 0; offset < missing.length; offset += 128)
      for (const row of await load(missing.slice(offset, offset + 128)))
        if (!row.entry.revoked) recorded.set(row.entry.id, row.entry);
  return progress.map((p) => ({
    ...p,
    evidence: p.evidence.map((e) => ({
      ...e,
      description: recorded.has(e.occurrenceId)
        ? renderActivity(recorded.get(e.occurrenceId)!.view, 'What happened')
        : e.description,
    })),
  }));
}
