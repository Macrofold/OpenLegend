import { distance3D, type SurfacePoint } from '@open-legend/spatial';
import { entityGet } from '../../entity-collection.js';
import { definitionPin } from '../../world-modules.js';
import { worldPosition } from '../../spatial-state.js';
import { supportedPosition } from '../../spatial-state.js';
import { rememberedPlace } from '../../agency.js';
import { activityCommandFields } from '../../food-preparation.js';
import { nativeBindingKind } from '../../native-command-contracts.js';
import { canSpeak } from '../../living.js';
import { observerDescription, recognizesSubject, subjectReferenceCurrent } from './knowledge.js';
import type { WorldState, Command, Entity } from '../../types.js';
import type { ActivityArgument, ActivityBinding, ActivityNode } from '../../action-experience.js';
import type { FiniteActivityControl } from '../../activity-execution.js';
import type {
  PreparedResponseProfile,
  PreparedResponseSituation,
  PreparedResponseMethod,
  PreparedResponsePurpose,
  PreparedResponseOption,
  PreparedResponseObservation,
} from '../../prepared-responses.js';
import type { ResponsePurposeBinding } from '../../action-capabilities.js';
import type { Awareness } from '../../experience.js';
import { sameDefinitionPin } from '../../state-owners.js';
import { strikeDefinition } from '../../strikes.js';
import { canReachEntity } from '../../spatial.js';
import { FOLLOW_RULES } from './navigation.js';

/** Physical observations only; none states another person's motive or intention. */
export function baseThreatObservation(
  change: PreparedResponseObservation,
  label: string,
  range?: number,
): string {
  switch (change) {
    case 'lost-sight':
      return `I can no longer see ${label}.`;
    case 'reacquired-sight':
      return `I can again see ${label}.`;
    case 'preparation-ended':
      return `${label} is no longer visibly preparing that attack.`;
    case 'closing':
      return `${label} is moving closer to my position.`;
    case 'withdrawing':
      return `${label} is moving away from my position.`;
    case 'lateral':
      return `${label} is moving across my view.`;
    case 'still':
      return `${label} has stopped changing position.`;
    case 'range-entered':
      return `${label} is now within the ${range} m reach of a strike or shot I have the means to attempt.`;
    case 'range-left':
      return `${label} has stayed beyond the ${range} m reach I was considering.`;
    case 'combat-ready':
      return 'My wait before another strike or guard has ended.';
    case 'evasion-ready':
      return 'I have recovered from that short evasion.';
  }
}

/** A completed selected response is a new choice boundary even when it produces
 * private action memory instead of public awareness. It is priority, not new harm
 * or a reason to interrupt another already-running decision. */
export function basePreparedThreatResult(
  world: WorldState,
  profile: PreparedResponseProfile,
  actorId: string,
  causeIds: readonly string[],
): boolean {
  const agency = entityGet(world.entities, actorId)?.actor?.agency;
  const resultId = agency?.lastResultMemoryId;
  if (!resultId || !causeIds.includes(resultId)) return false;
  const entry = world.actionExperience.occurrences[actorId]?.find(
    (record) => record.resultMemoryId === resultId,
  );
  if (entry?.command.type === 'say') return false;
  const forgotten = world.experience?.forgotten[actorId] ?? [];
  if (forgotten.includes(resultId)) return false;
  const plan = agency?.plan;
  if (
    plan?.resultMemoryId === resultId &&
    plan.activity?.request?.chosenPurpose &&
    sameDefinitionPin(plan.activity.request.chosenPurpose.definition, definitionPin(profile)) &&
    world.memories[actorId]?.some(
      (memory) =>
        memory.id === resultId && memory.actorId === actorId && memory.source === 'internal',
    )
  )
    return true;
  return !!(
    entry &&
    entry.status !== 'running' &&
    !entry.revoked &&
    !forgotten.includes(entry.id) &&
    entry.command.chosenPurpose &&
    sameDefinitionPin(entry.command.chosenPurpose.definition, definitionPin(profile))
  );
}

/** Select a deliberation strategy from personal causes/active commitments before
 * preparing its physical repertoire. Old encounter history alone is not a new wake. */
export function basePreparedThreatOpportunity(
  world: WorldState,
  profile: PreparedResponseProfile,
  actorId: string,
  evidence: readonly Awareness[],
  causeIds: readonly string[],
): boolean {
  const actor = entityGet(world.entities, actorId)?.actor;
  if (!actor?.alive) return false;
  if (basePreparedThreatResult(world, profile, actorId, causeIds)) return true;
  if (
    evidence.some(
      (entry) =>
        entry.actorId === actorId &&
        [
          'attack-cue',
          'struck',
          'shot-released',
          'projectile-contact',
          'response-observation',
        ].includes(entry.eventType ?? ''),
    )
  )
    return true;
  const state = actor.encounters?.life === (actor.physicalLife ?? 0) ? actor.encounters : undefined;
  if (Object.values(state?.unknown ?? {}).some((entry) => entry.until > world.simTime)) return true;
  if (
    Object.entries(state?.pairs ?? {}).some(
      ([id, pair]) =>
        subjectReferenceCurrent(world, actorId, id, pair.episode) &&
        (Object.keys(pair.active).length > 0 ||
          (pair.incomingUntil ?? 0) > world.simTime ||
          !!pair.own),
    )
  )
    return true;
  const purpose = actor.agency.plan?.activity?.request?.chosenPurpose;
  return (
    purpose?.definition.id === profile.id &&
    purpose.definition.version === profile.version &&
    actor.agency.plan?.status === 'active'
  );
}

interface SituationBinding {
  roles: Record<string, string>;
  sources: Set<string>;
  flags: Set<string>;
  /** Historical only: never published as a live subject role or targeting grant. */
  lastSeen?: {
    subjectId: string;
    episode: string | null;
    causeId: string;
    point: SurfacePoint;
    at: number;
    label: string;
  };
}

/** This world's finite templates attach meaning to existing prepared native means.
 * The common capability owner subsequently checks complete physical feasibility.
 * docs/worlds/base/threat-response-options.md */
export function basePreparedThreatResponses(
  world: WorldState,
  profile: PreparedResponseProfile,
  input: PreparedResponseSituation,
) {
  const actor = entityGet(world.entities, input.actorId);
  if (!actor?.actor) throw new Error('The responding person is unavailable.');
  const visible = new Map(input.visible.map((entity) => [entity.id, entity]));
  const labels = new Map(
    input.visible.map((entity) => [entity.id, observerDescription(world, actor.id, entity.id)]),
  );
  for (const evidence of input.evidence)
    for (const reference of evidence.references ?? [])
      if (!labels.has(reference.id)) labels.set(reference.id, reference.label);
  const label = (id: string) =>
    labels.get(id) ??
    rememberedPlace(actor.actor!, id)?.label ??
    'the person in my recorded encounter';
  const physicalLife = (entity: Entity) => entity.actor?.physicalLife ?? 0;
  const state =
    actor.actor.encounters?.life === physicalLife(actor) ? actor.actor.encounters : undefined;
  const pairs = Object.entries(state?.pairs ?? {}).filter(
    ([id, pair]) =>
      subjectReferenceCurrent(world, actor.id, id, pair.episode) &&
      !!(pair.lastCause || pair.own || Object.keys(pair.active).length),
  );
  const original = worldPosition(actor);
  const currentWork =
    !!actor.actor.action ||
    !!actor.actor.agency.suspended ||
    ['active', 'blocked'].includes(actor.actor.agency.plan?.status ?? '');
  const local: SituationBinding = { roles: {}, sources: new Set(), flags: new Set() };
  const bindings = new Map<string, SituationBinding>([['local', local]]);
  const appraisalOccurrences: Array<{
    eventId: string;
    sequence: number;
    subjectId: string | null;
  }> = [];
  const bind = (roles: Record<string, string>) => {
    const key = JSON.stringify(Object.entries(roles).sort(([a], [b]) => a.localeCompare(b)));
    let value = bindings.get(key);
    if (!value) {
      value = { roles, sources: new Set(), flags: new Set() };
      bindings.set(key, value);
    }
    return value;
  };
  const inEncounter = pairs.length > 0 || Object.keys(state?.unknown ?? {}).length > 0;
  if (inEncounter) local.flags.add('encounter');
  if (currentWork) local.flags.add('existing-work');
  // Value and relevance remain personal judgments; this is the actual present place/work.
  local.flags.add('valued-stake');
  if (Object.keys(state?.unknown ?? {}).length) local.flags.add('personal-danger');
  for (const [id, pair] of pairs) {
    const value = bind({ assailant: id });
    value.flags.add('encounter');
    value.flags.add('identified-conduct');
    if (pair.lastCause) value.sources.add(pair.lastCause.id);
    if (pair.lastCause?.kind === 'contact') value.flags.add('identified-harm');
    if (Object.keys(pair.active).length || (pair.incomingUntil ?? 0) > world.simTime) {
      value.flags.add('personal-danger');
    }
    if (visible.has(id)) value.flags.add('visible-assailant');
    if (!Object.keys(pair.active).length) value.flags.add('withdrawal-or-ended');
    const other = visible.get(id);
    if (
      pair.movement === 'withdrawing' &&
      other?.actor?.action &&
      ['move', 'follow', 'evade'].includes(other.actor.action.type)
    )
      value.flags.add('withdrawing');
  }
  // Leaving sight ends an unfamiliar body's current association. The observed
  // point remains personal historical evidence, without identifying any live body.
  for (const [subjectId, pair] of Object.entries(state?.pairs ?? {})) {
    const observed = pair.lastObserved;
    if (
      !observed?.surfaceId ||
      !pair.lastCause ||
      (visible.has(subjectId) && subjectReferenceCurrent(world, actor.id, subjectId, pair.episode))
    )
      continue;
    const lastSeen = {
      subjectId,
      episode: pair.episode,
      causeId: pair.lastCause.id,
      point: { ...observed.point, surfaceId: observed.surfaceId },
      at: observed.at,
      label: observed.label,
    };
    bindings.set(
      JSON.stringify([
        'last-seen',
        subjectId,
        pair.episode,
        observed.at,
        observed.point,
        observed.surfaceId,
      ]),
      {
        roles: {},
        sources: new Set([pair.lastCause.id]),
        flags: new Set(['last-seen', 'encounter']),
        lastSeen,
      },
    );
  }
  for (const evidence of input.evidence) {
    if (evidence.actorId !== actor.id)
      throw new Error('Another person’s private evidence cannot prepare this response.');
    local.sources.add(evidence.eventId);
    const contact = evidence.eventData?.['contactInjury'] === true;
    const hostile = ['attack-cue', 'struck', 'shot-released', 'projectile-contact'].includes(
      evidence.eventType ?? '',
    );
    if (hostile && evidence.targetId === actor.id) {
      if (!evidence.sourceId || state?.unknown[evidence.eventId])
        local.flags.add('personal-danger');
      local.flags.add('encounter');
      if (contact) {
        local.flags.add('personal-contact');
        local.flags.add('observed-harm');
      }
    }
    if (
      contact &&
      evidence.targetId === actor.id &&
      Number(evidence.eventData?.['damage'] ?? 0) > 0
    ) {
      local.flags.add('hurt');
      local.flags.add('experienced-cost');
    }
    // A contact account is grammatically about the struck body. Only its admitted
    // projectile-source fact can identify the shooter; the victim is not an assailant.
    const source =
      evidence.eventType === 'projectile-contact'
        ? typeof evidence.eventData?.['contactSourceId'] === 'string'
          ? evidence.eventData['contactSourceId']
          : undefined
        : evidence.sourceId;
    if (
      hostile ||
      (source &&
        pairs.some(([id]) => id === source) &&
        ['speech', 'moved', 'encounter', 'action-stopped'].includes(evidence.eventType ?? ''))
    ) {
      if (
        source &&
        source !== actor.id &&
        subjectReferenceCurrent(world, actor.id, source, evidence.entityEpisodes?.[source] ?? null)
      )
        appraisalOccurrences.push({
          eventId: evidence.eventId,
          sequence: evidence.sequence,
          subjectId: source,
        });
      // Losing a formerly identified sighting does not turn that same recorded
      // cause into a second anonymous injury or renew its interpretation curve.
      else if (!source && contact && evidence.targetId === actor.id)
        appraisalOccurrences.push({
          eventId: evidence.eventId,
          sequence: evidence.sequence,
          subjectId: null,
        });
    }
    if (
      !hostile ||
      !source ||
      source === actor.id ||
      !subjectReferenceCurrent(world, actor.id, source, evidence.entityEpisodes?.[source] ?? null)
    )
      continue;
    const value = bind({ assailant: source });
    value.sources.add(evidence.eventId);
    value.flags.add('encounter');
    value.flags.add('identified-conduct');
    if (evidence.targetId === actor.id) {
      value.flags.add('personal-danger');
      if (contact) {
        value.flags.add('personal-contact');
        value.flags.add('identified-harm');
      }
    }
    if (visible.has(source)) value.flags.add('visible-assailant');
    const target = evidence.targetId;
    if (
      target &&
      target !== actor.id &&
      visible.get(target)?.actor?.alive &&
      visible.has(source) &&
      subjectReferenceCurrent(world, actor.id, target, evidence.entityEpisodes?.[target] ?? null)
    ) {
      const protecting = bind({ assailant: source, protectee: target });
      protecting.sources.add(evidence.eventId);
      protecting.flags.add('protectee');
      protecting.flags.add('visible-assailant');
      if (contact) protecting.flags.add('observed-harm');
      const action = visible.get(target)?.actor?.action;
      if (action && ['move', 'follow', 'evade'].includes(action.type))
        protecting.flags.add('escaping-protectee');
    }
  }
  const people = input.visible.filter((entity) => entity.actor?.alive && entity.id !== actor.id);
  if (people.length) local.flags.add('possible-hearer');
  for (const person of people) {
    if (!recognizesSubject(world, actor.id, person.id)) continue;
    const helper = bind({ helper: person.id });
    helper.flags.add('known-helper');
    helper.flags.add('possible-hearer');
    helper.flags.add('supported-help');
  }
  for (const binding of bindings.values()) {
    for (const flag of [
      'hurt',
      'experienced-cost',
      'existing-work',
      'possible-hearer',
      'valued-stake',
    ])
      if (local.flags.has(flag)) binding.flags.add(flag);
    binding.flags.add('can-stay');
    if (binding.roles.protectee) binding.flags.add('supported-help');
  }

  const profilePin = definitionPin(profile);
  // These methods already passed the common prospective-work preparation. Read
  // their actual reach once; no new route search or invented attack range.
  const directReach = new Map<string, number>();
  for (const method of input.methods) {
    const command = method.invocation;
    if (command?.type !== 'strike') continue;
    const strike = strikeDefinition(command.definitionId, world, command.weaponItemId);
    if (strike)
      directReach.set(
        command.targetId,
        Math.min(directReach.get(command.targetId) ?? Infinity, strike.range),
      );
  }
  const purposes: PreparedResponsePurpose[] = [];
  const unavailable: Array<{ purposeId: string; roles: Record<string, string>; reason: string }> =
    [];
  const subjectsFor = (purpose: ResponsePurposeBinding, participants: readonly string[]) => {
    const hard = new Set(participants);
    return Object.fromEntries(
      [...new Set([...participants, ...Object.values(purpose.roles)])].flatMap((id) => {
        const person = visible.get(id);
        return person?.actor
          ? [
              [
                id,
                {
                  physicalLife: physicalLife(person),
                  episode: world.perceptionEpisodes?.[actor.id]?.[id] ?? null,
                  ...(!hard.has(id) ? { observationOnly: true as const } : {}),
                },
              ],
            ]
          : [];
      }),
    );
  };
  const primitive = (
    method: PreparedResponseMethod,
    purpose: ResponsePurposeBinding,
    seconds: number,
    participants: readonly string[],
    radius: boolean,
    inherited?: FiniteActivityControl,
    followRange?: number,
  ): PreparedResponseOption | undefined => {
    let command = method.invocation;
    if (!command)
      return {
        ...method,
        purpose,
        firstActionDescription: method.firstActionDescription ?? method.description,
      };
    if (command.type === 'say')
      return {
        ...method,
        purpose,
        firstActionDescription: method.firstActionDescription ?? method.description,
        invocation: { ...command, chosenPurpose: purpose },
        transition: 'continue',
      };
    if (
      !['move', 'follow', 'strike', 'shoot-once', 'hunt', 'guard', 'evade'].includes(command.type)
    )
      return;
    if (command.type === 'follow') {
      const distance = followRange ?? command.distance ?? FOLLOW_RULES.defaultDistance;
      const target = visible.get(command.targetId);
      if (!target || canReachEntity(world, actor, target, distance)) return;
      command = {
        ...command,
        distance,
        complete: true,
        until: inherited?.deadline ?? world.simTime + seconds,
      };
      method = {
        ...method,
        firstActionDescription: `Move toward ${label(command.targetId)} until within ${distance} m, then stop`,
        description: `Follow the currently perceived ${label(command.targetId)} only until within the selected ${distance} m proximity, then end this movement. This does not equip a weapon or attack. Arrival is not guaranteed; lost sight ends this choice.`,
      };
    }
    if (command.type === 'move' && followRange !== undefined && participants[0]) {
      const target = visible.get(participants[0]);
      if (!target || canReachEntity(world, actor, target, followRange)) return;
    }
    const args: Record<string, ActivityArgument> = {},
      values: Record<string, ActivityBinding> = {};
    for (const [field, value] of Object.entries(activityCommandFields(command))) {
      if (
        value === undefined ||
        [
          'id',
          'actorId',
          'type',
          'purpose',
          'chosenPurpose',
          'humanInitiated',
          'combatHelpId',
        ].includes(field)
      )
        continue;
      if (nativeBindingKind(field)) {
        values[field] = value as ActivityBinding;
        args[field] = { role: field };
      } else args[field] = { literal: value as string | number | boolean };
    }
    const control: FiniteActivityControl = {
      kind: 'finite',
      deadline: inherited?.deadline ?? world.simTime + seconds,
      boundary: inherited
        ? inherited.boundary
          ? { origin: { ...inherited.boundary.origin }, radius: inherited.boundary.radius }
          : null
        : radius
          ? { origin: { ...original }, radius: profile.limits.pursuitRadius }
          : null,
      subjects: subjectsFor(purpose, participants),
      ...(command.type === 'move' && followRange !== undefined && participants[0]
        ? { stopWithin: { subjectId: participants[0], distance: followRange } }
        : {}),
    };
    return {
      ...method,
      purpose,
      firstActionDescription: method.firstActionDescription ?? method.description,
      description: `${method.description} Stop no later than game time ${control.deadline}.${control.boundary ? ` Stop at ${control.boundary.radius} m from the original selected position.` : ''}${participants.length ? ' Stop if a selected visible participant is lost or changes physical life.' : ''}${control.stopWithin ? ` Stop when ${label(control.stopWithin.subjectId)} comes within the selected ${control.stopWithin.distance} m distance with a clear interaction path; no attack follows.` : ''}`,
      invocation: {
        id: 'prepared-response',
        actorId: actor.id,
        type: 'compose',
        name: purpose.description,
        purpose: purpose.description,
        chosenPurpose: purpose,
        mode: method.transition === 'interrupt' ? 'interrupt' : 'replace',
        root: {
          kind: 'invoke',
          key: 'first',
          name: command.purpose ?? command.type,
          command: command.type,
          args,
        },
        bindings: values,
        control,
      },
      transition: method.transition === 'interrupt' ? 'interrupt' : 'replace',
    };
  };
  for (const definition of profile.purposes)
    for (const binding of bindings.values()) {
      if (binding.lastSeen && !definition.means.includes('last-seen')) continue;
      if (binding.roles.helper && !definition.requires.includes('known-helper')) continue;
      if (
        binding.roles.protectee &&
        !definition.requires.some((value) =>
          ['protectee', 'escaping-protectee', 'observed-harm'].includes(value),
        )
      )
        continue;
      if (!definition.requires.every((requirement) => binding.flags.has(requirement))) continue;
      const roles = binding.roles;
      const description = `${definition.label}${binding.lastSeen ? ` (where I saw ${binding.lastSeen.label} at game time ${binding.lastSeen.at})` : ''}${
        Object.keys(roles).length
          ? ` (${Object.entries(roles)
              .map(([role, id]) => `${role}: ${label(id)}`)
              .join('; ')})`
          : ''
      }`;
      const sourceIds = [...new Set([...local.sources, ...binding.sources])];
      if (sourceIds.length > 48)
        throw new Error('The complete purpose source set exceeds the existing evidence allowance.');
      const purpose: ResponsePurposeBinding = {
        definition: profilePin,
        id: definition.id,
        description,
        roles: { ...roles },
        sourceIds,
      };
      const options: PreparedResponseOption[] = [];
      if (definition.means.includes('resume') && actor.actor.agency.suspended) {
        const paused = actor.actor.agency.suspended;
        const name =
          paused.activity?.request?.name ??
          world.actionExperience.methods[paused.activity?.methodId ?? '']?.name ??
          paused.steps.find((step) => step.status === 'queued')?.command.purpose ??
          'my paused work';
        const action = actor.actor.action;
        const lostSeconds =
          action?.stage === 'working'
            ? Math.max(0, action.totalSeconds - action.remainingSeconds)
            : 0;
        options.push({
          id: 'resume',
          purpose,
          firstActionDescription: `Return to ${name}`,
          description: `End the intervening activity and return to ${name}. Its stopped step restarts with original remaining materials, recorded outputs and stopping limits. Ending the current step loses ${lostSeconds} game seconds of work; already consumed materials and released effects remain committed. Refused resumption preserves the current and paused work.`,
          invocation: {
            id: 'prepared-response',
            actorId: actor.id,
            type: 'resume-work',
            planId: paused.id,
            expectedRevision: paused.revision,
            chosenPurpose: purpose,
          },
          // This exact control operation owns the transition; a generic replace
          // before it would discard the very paused frontier being selected.
          transition: 'continue',
        });
      }
      const addMethod = (
        method: PreparedResponseMethod,
        participants: string[] = [],
        radius = false,
        inherited?: FiniteActivityControl,
        followRange?: number,
      ) => {
        const option = primitive(
          method,
          purpose,
          profile.limits.pursuitSeconds,
          participants,
          radius,
          inherited,
          followRange,
        );
        if (option) options.push(option);
      };
      for (const method of input.methods) {
        const command = method.invocation;
        const target = command && 'targetId' in command ? command.targetId : undefined;
        const approach =
          command?.type === 'move' && method.subjects?.includes(roles.assailant ?? '');
        if (
          definition.means.includes('attack') &&
          command &&
          ['strike', 'shoot-once', 'hunt'].includes(command.type) &&
          target !== undefined &&
          target === roles.assailant &&
          visible.has(target)
        )
          addMethod(method, [target], true);
        if (
          definition.means.includes('guard') &&
          command?.type === 'guard' &&
          (!target || target === roles.assailant)
        )
          addMethod(method, target ? [target] : []);
        if (definition.means.includes('evade') && command?.type === 'evade') addMethod(method);
        if (
          (definition.means.includes('approach') || definition.means.includes('pursue')) &&
          approach
        )
          addMethod(
            method,
            [roles.assailant!],
            true,
            undefined,
            definition.means.includes('pursue')
              ? (directReach.get(roles.assailant!) ?? FOLLOW_RULES.defaultDistance)
              : undefined,
          );
        if (
          definition.means.includes('pursue') &&
          command?.type === 'follow' &&
          target !== undefined &&
          target === roles.assailant &&
          visible.has(target)
        )
          addMethod(method, [target], true, undefined, directReach.get(target));
        if (
          definition.means.includes('follow-helper') &&
          command?.type === 'follow' &&
          target !== undefined &&
          target === roles.helper &&
          visible.has(target)
        )
          addMethod(method, [target], true);
        if (
          definition.means.includes('approach-helper') &&
          command?.type === 'move' &&
          method.subjects?.includes(roles.helper ?? '')
        )
          addMethod(method, [roles.helper!], true);
        if (definition.means.includes('leave') && command?.type === 'move') {
          const danger = roles.assailant ? visible.get(roles.assailant) : undefined;
          if (
            !danger ||
            distance3D(command.destination, worldPosition(danger)) >
              distance3D(original, worldPosition(danger))
          )
            addMethod(method, [], true);
        }
        if (definition.means.includes('continue') && !command && currentWork)
          options.push({
            ...method,
            purpose,
            description: method.description,
          });
      }
      for (const mean of ['hold', 'assess'] as const)
        if (definition.means.includes(mean)) {
          const seconds =
            mean === 'hold' ? profile.limits.holdSeconds : profile.limits.assessmentSeconds;
          const at = world.simTime + seconds;
          const root: ActivityNode = {
            kind: 'wait',
            name:
              mean === 'hold'
                ? 'Remain at the selected place'
                : 'Observe until the selected review time',
            until: { test: 'time', at },
            seconds,
          };
          options.push({
            id: mean,
            purpose,
            firstActionDescription: root.name,
            description: `${mean === 'hold' ? 'Remain at the selected place' : 'Observe without starting another physical action'}. Stop at game time ${at}; earlier personally meaningful evidence can prompt a new choice.`,
            invocation: {
              id: 'prepared-response',
              actorId: actor.id,
              type: 'compose',
              name: description,
              chosenPurpose: purpose,
              root,
              bindings: {},
              mode: 'replace',
              control: {
                kind: 'finite',
                deadline: at,
                boundary: null,
                subjects: subjectsFor(purpose, []),
              },
            },
            transition: 'replace',
          });
        }
      if (definition.means.includes('last-seen') && binding.lastSeen) {
        const place = binding.lastSeen;
        const previous = actor.actor.agency.plan;
        const previousPurpose = previous?.activity?.request?.chosenPurpose;
        const priorMeans = profile.purposes.find(
          (entry) => entry.id === previousPurpose?.id,
        )?.means;
        const inherited =
          previous &&
          ['active', 'blocked'].includes(previous.status) &&
          previous.activity?.control?.kind === 'finite' &&
          previousPurpose &&
          sameDefinitionPin(previousPurpose.definition, profilePin) &&
          (previousPurpose.roles.assailant === place.subjectId ||
            (previousPurpose.id === definition.id &&
              previousPurpose.sourceIds.includes(place.causeId))) &&
          priorMeans?.some((mean) => ['pursue', 'last-seen'].includes(mean))
            ? previous.activity.control
            : undefined;
        if (supportedPosition(actor))
          addMethod(
            {
              id: 'last-seen',
              firstActionDescription: `Move once to where I last saw ${place.label}`,
              description: `Move once to the point where I saw ${place.label} at game time ${place.at}; this does not track their present location.`,
              invocation: {
                id: 'prepared-response',
                actorId: actor.id,
                type: 'move',
                destination: { ...place.point },
              },
              transition: 'replace',
            },
            [],
            true,
            inherited,
          );
      }
      if (definition.means.includes('speech') && canSpeak(actor))
        for (const speech of profile.speech) {
          if (
            !speech.purposes.includes(definition.id) ||
            !speech.requires.every((requirement) => binding.flags.has(requirement))
          )
            continue;
          const recipient =
            speech.addressee === 'beneficiary'
              ? (roles.protectee ?? roles.helper ?? roles.assailant)
              : (roles.assailant ?? roles.helper ?? roles.protectee);
          if (speech.audience === 'person' && (!recipient || !visible.has(recipient))) continue;
          if (speech.audience === 'possible-hearer' && !binding.flags.has('possible-hearer'))
            continue;
          for (const volume of speech.audience === 'possible-hearer'
            ? (['normal', 'shout'] as const)
            : (['normal'] as const))
            options.push({
              id: `${speech.id}:${volume}`,
              purpose,
              firstActionDescription: `Say “${speech.text}” at ${volume} volume${recipient ? ` to ${label(recipient)}` : ' aloud'}`,
              description: `Say exactly “${speech.text}” at ${volume} volume${recipient ? ` to ${label(recipient)}` : ' aloud to possible actual listeners'}. This is speech only; hearing and any reply remain independent.`,
              invocation: {
                id: 'prepared-response',
                actorId: actor.id,
                type: 'say',
                text: speech.text,
                ...(recipient ? { intendedRecipientId: recipient } : {}),
                volume,
                chosenPurpose: purpose,
              },
              transition: 'continue',
            });
        }
      if (options.length)
        purposes.push({
          id: JSON.stringify([
            definition.id,
            roles,
            ...(binding.lastSeen
              ? [
                  binding.lastSeen.causeId,
                  binding.lastSeen.episode,
                  binding.lastSeen.at,
                  binding.lastSeen.point,
                ]
              : []),
          ]),
          purpose,
          description: `${description}. ${definition.meaning}`,
          options,
        });
      else
        unavailable.push({
          purposeId: definition.id,
          roles: { ...roles },
          reason:
            'No currently supplied native means supports this exact purpose and participants.',
        });
    }
  const eligible = basePreparedThreatOpportunity(
    world,
    profile,
    actor.id,
    input.evidence,
    input.causeIds,
  );
  const subjectDescriptions = Object.fromEntries(
    [
      ...new Set([
        ...purposes.flatMap((purpose) => Object.values(purpose.purpose.roles)),
        ...appraisalOccurrences.flatMap((occurrence) =>
          occurrence.subjectId ? [occurrence.subjectId] : [],
        ),
      ]),
    ].map((id) => [id, label(id)]),
  );
  return {
    purposes,
    unavailable,
    profile: profilePin,
    appraisalOccurrences,
    eligible,
    subjectDescriptions,
  };
}
