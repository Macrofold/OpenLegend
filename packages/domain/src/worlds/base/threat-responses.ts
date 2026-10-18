import { distance3D } from '@open-legend/spatial';
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
} from '../../prepared-responses.js';
import type { ResponsePurposeBinding } from '../../action-capabilities.js';
import type { Awareness } from '../../experience.js';
import { sameDefinitionPin } from '../../state-owners.js';

/** A completed selected response is a new choice boundary even when it produces
 * private action memory instead of public awareness. It is priority, not new harm
 * or a reason to interrupt another already-running decision. */
export function basePreparedThreatResult(
  world: WorldState,
  profile: PreparedResponseProfile,
  actorId: string,
  causeIds: readonly string[],
): boolean {
  const resultId = entityGet(world.entities, actorId)?.actor?.agency.lastResultMemoryId;
  if (!resultId || !causeIds.includes(resultId)) return false;
  const entry = world.actionExperience.occurrences[actorId]?.find(
    (record) => record.resultMemoryId === resultId,
  );
  const forgotten = world.experience?.forgotten[actorId] ?? [];
  return !!(
    entry &&
    entry.status !== 'running' &&
    !entry.revoked &&
    !forgotten.includes(resultId) &&
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
        ['attack-cue', 'struck', 'shot-released', 'projectile-contact'].includes(
          entry.eventType ?? '',
        ),
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
  const pairs = Object.entries(state?.pairs ?? {}).filter(([id, pair]) =>
    subjectReferenceCurrent(world, actor.id, id, pair.episode),
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
    else if (rememberedPlace(actor.actor, id)) value.flags.add('last-seen');
    if (!Object.keys(pair.active).length) value.flags.add('withdrawal-or-ended');
    const other = visible.get(id);
    if (
      pair.movement === 'withdrawing' &&
      other?.actor?.action &&
      ['move', 'follow', 'evade'].includes(other.actor.action.type)
    )
      value.flags.add('withdrawing');
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
      else if (contact && evidence.targetId === actor.id)
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
  const purposes: PreparedResponsePurpose[] = [];
  const unavailable: Array<{ purposeId: string; roles: Record<string, string>; reason: string }> =
    [];
  const primitive = (
    method: PreparedResponseMethod,
    purpose: ResponsePurposeBinding,
    seconds: number,
    participants: readonly string[],
    radius: boolean,
  ): PreparedResponseOption | undefined => {
    const command = method.invocation;
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
      deadline: world.simTime + seconds,
      boundary: radius ? { origin: { ...original }, radius: profile.limits.pursuitRadius } : null,
      subjects: Object.fromEntries(
        participants.flatMap((id) => {
          const person = visible.get(id);
          return person?.actor
            ? [
                [
                  id,
                  {
                    physicalLife: physicalLife(person),
                    episode: world.perceptionEpisodes?.[actor.id]?.[id] ?? null,
                  },
                ],
              ]
            : [];
        }),
      ),
    };
    return {
      ...method,
      purpose,
      firstActionDescription: method.firstActionDescription ?? method.description,
      description: `${method.description} Stop no later than game time ${control.deadline}.${radius ? ` Stop at ${profile.limits.pursuitRadius} m from the original selected position.` : ''}${participants.length ? ' Stop if a selected visible participant is lost or changes physical life.' : ''}`,
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
      const description = `${definition.label}${
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
      ) => {
        const option = primitive(
          method,
          purpose,
          profile.limits.pursuitSeconds,
          participants,
          radius,
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
          addMethod(method, [target, ...(roles.protectee ? [roles.protectee] : [])], true);
        if (
          definition.means.includes('guard') &&
          command?.type === 'guard' &&
          (!target || target === roles.assailant)
        )
          addMethod(method, [
            ...(target ? [target] : []),
            ...(roles.protectee ? [roles.protectee] : []),
          ]);
        if (definition.means.includes('evade') && command?.type === 'evade') addMethod(method);
        if (
          (definition.means.includes('approach') || definition.means.includes('pursue')) &&
          approach
        )
          addMethod(method, [roles.assailant!], true);
        if (
          definition.means.includes('pursue') &&
          command?.type === 'follow' &&
          target !== undefined &&
          target === roles.assailant &&
          visible.has(target)
        )
          addMethod(method, [target], true);
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
              control: { kind: 'finite', deadline: at, boundary: null, subjects: {} },
            },
            transition: 'replace',
          });
        }
      if (definition.means.includes('last-seen') && roles.assailant) {
        const place = rememberedPlace(actor.actor, roles.assailant);
        if (place && supportedPosition(actor))
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
          id: JSON.stringify([definition.id, roles]),
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
