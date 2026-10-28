import { ACTIVITY_WORK_MODES } from './activity-request-choice.js';
import {
  perceivedItemOffers,
  describeItemOffer,
  perceivedMovementOutings,
  perceivedOffersBetween,
  perceivedCompacts,
  compactTermsLabel,
  compactEndingText,
  entityGet,
  accessiblePossession,
  subjectReferenceCurrent,
  rememberedPlace,
  recognizesSubject,
  perceivedCooperation,
  cooperationTermsLabel,
  recipeMechanicalPin,
  sameDefinitionPin,
  knownGuideDestinations,
  BASE_OUTING,
  BASE_COMBAT_HELP,
  observerDescription,
  seesEntity,
  worldPosition,
  type PerceivedMovementOuting,
  type WorldState,
} from '@open-legend/domain';
import type { CommandInput, OutingView } from '@open-legend/protocol';

/** Social terms belong to the parties. Companion position, private work and hidden arrival do not. */
export function outingViews(world: WorldState, actorId: string): OutingView[] {
  return [
    ...itemOfferViews(world, actorId),
    ...compactViews(world, actorId),
    ...cooperationViews(world, actorId),
    ...outingTerms(world, actorId),
  ];
}
function outingTerms(world: WorldState, actorId: string): OutingView[] {
  const actor = entityGet(world.entities, actorId);
  if (!actor) return [];
  return perceivedMovementOutings(world, actorId).map((trip) => {
    const otherId = actorId === trip.proposerId ? trip.recipientId : trip.proposerId;
    const other = entityGet(world.entities, otherId);
    const visible = !!other && seesEntity(world, actor, other);
    const here = worldPosition(actor),
      destination = trip.destination.point;
    const status =
      trip.status === 'pending' && trip.expiresAt <= world.simTime
        ? 'ended'
        : trip.status === 'traveling' && trip.ownArrived
          ? 'arrived'
          : trip.status;
    return {
      id: trip.id,
      kind: trip.kind,
      revision: trip.revision,
      destination: trip.destination.label,
      distance:
        trip.kind === 'combat-help'
          ? (() => {
              const opponent = entityGet(world.entities, trip.opponentId!);
              if (!opponent || !seesEntity(world, actor, opponent)) return null;
              const point = worldPosition(opponent);
              return Math.hypot(here.x - point.x, here.y - point.y, here.z - point.z);
            })()
          : destination
            ? Math.hypot(here.x - destination.x, here.y - destination.y, here.z - destination.z)
            : null,
      companion: observerDescription(world, actorId, otherId, 'definite'),
      purpose: trip.purpose,
      status,
      company: BASE_OUTING.companyLabel(visible),
      choices: status === 'ended' ? [] : outingChoices(world, actorId, trip),
      description:
        'Last known personally received terms. ' +
        (trip.kind === 'combat-help'
          ? `${BASE_COMBAT_HELP.description}${trip.status === 'helping' ? ` ${BASE_COMBAT_HELP.workChoiceTerms}` : ''}`
          : BASE_OUTING.agreementDescription),
    };
  });
}
/** Action lists need exact choices, not a second projection of sight and travel distance. */
export function outingActions(
  world: WorldState,
  actorId: string,
): Array<OutingView['choices'][number] & { received?: true }> {
  return [
    ...itemOfferViews(world, actorId).flatMap((trip) =>
      trip.choices.map((choice) => ({ ...choice, received: true as const })),
    ),
    ...compactViews(world, actorId).flatMap((trip) =>
      trip.choices.map((choice) => ({ ...choice, received: true as const })),
    ),
    ...cooperationViews(world, actorId).flatMap((trip) =>
      trip.choices.map((choice) => ({ ...choice, received: true as const })),
    ),
    ...perceivedMovementOutings(world, actorId).flatMap((trip) =>
      outingChoices(world, actorId, trip).map((choice) => ({ ...choice, received: true as const })),
    ),
  ];
}
function outingChoices(
  world: WorldState,
  actorId: string,
  trip: PerceivedMovementOuting,
): OutingView['choices'] {
  if (trip.status === 'ended' || (trip.status === 'pending' && trip.expiresAt <= world.simTime))
    return [];
  const command = (
    operation: 'accept' | 'decline' | 'leave',
    mode?: CommandInput['outingMode'],
  ): CommandInput => ({
    type: 'outing',
    outingOperation: operation,
    outingId: trip.id,
    expectedRevision: trip.revision,
    ...(mode ? { outingMode: mode } : {}),
  });
  const description =
    trip.kind === 'combat-help' ? BASE_COMBAT_HELP.description : BASE_OUTING.agreementDescription;
  const make = (id: string, label: string, input: CommandInput) => ({
    id: `${id}:${trip.id}`,
    label,
    description: `${label}. ${description}${BASE_OUTING.purposeText(trip.purpose)}`,
    command: input,
  });
  if (trip.status === 'pending' && trip.recipientId === actorId) {
    const actor = entityGet(world.entities, actorId)!.actor!;
    const busy =
      !!actor.action ||
      !!actor.agency.suspended ||
      actor.agency.plan?.status === 'active' ||
      actor.agency.plan?.status === 'blocked';
    return [
      make(
        'outing-accept',
        trip.kind === 'combat-help'
          ? BASE_COMBAT_HELP.accept
          : BASE_OUTING.acceptLabel(trip.destination.label, busy),
        command('accept', busy ? 'replace' : 'enqueue'),
      ),
      make(
        'outing-decline',
        trip.kind === 'combat-help'
          ? BASE_COMBAT_HELP.decline
          : BASE_OUTING.declineLabel(trip.destination.label),
        command('decline'),
      ),
    ];
  }
  return [
    make(
      'outing-leave',
      trip.kind === 'combat-help'
        ? trip.status === 'pending'
          ? BASE_COMBAT_HELP.cancel
          : BASE_COMBAT_HELP.stop
        : trip.status === 'pending'
          ? BASE_OUTING.withdrawLabel(trip.destination.label)
          : BASE_OUTING.leaveLabel,
      command('leave'),
    ),
  ];
}
export function outingContext(world: WorldState, actorId: string): string {
  return [
    ...compactViews(world, actorId),
    ...cooperationViews(world, actorId),
    ...outingTerms(world, actorId),
  ]
    .map(
      (trip) =>
        `${trip.kind !== 'travel' && trip.kind !== 'combat-help' ? `Known ${trip.status} cooperative activity with ${trip.companion}: ${trip.destination}.` : trip.kind === 'combat-help' ? BASE_COMBAT_HELP.context(trip.companion, trip.destination, trip.distance, trip.status, trip.company) : BASE_OUTING.context(trip.companion, trip.destination, trip.distance!, trip.status, trip.company)}${BASE_OUTING.purposeText(trip.purpose)} ${trip.description}`,
    )
    .join('\n');
}

function compactViews(world: WorldState, actorId: string): OutingView[] {
  const policy = world.socialOfferPolicy?.cooperation,
    actor = entityGet(world.entities, actorId);
  if (!policy || !actor) return [];
  return perceivedCompacts(world, actorId).map((known) => {
    const otherId = known.proposerId === actorId ? known.recipientId : known.proposerId;
    const other = entityGet(world.entities, otherId),
      deadline = known.phase === 'pending' ? known.replyBy : known.endAt;
    const status = deadline !== undefined && deadline <= world.simTime ? 'ended' : known.phase;
    const choices: OutingView['choices'] = [];
    const add = (operation: NonNullable<CommandInput['outingOperation']>, label: string) =>
      choices.push({
        id: JSON.stringify(['compact', known.id, known.revision, operation]),
        label,
        description: `${label}. ${compactTermsLabel(world, known.terms)}`,
        command: {
          type: 'outing',
          outingOperation: operation,
          compactId: known.id,
          expectedRevision: known.revision,
        },
      });
    if (status === 'pending') {
      if (known.recipientId === actorId) {
        add('compact-accept', 'Accept these exact terms');
        add('compact-decline', 'Decline these terms');
      } else add('compact-withdraw', 'Withdraw my proposal');
    } else if (status === 'accepted') {
      add('compact-leave', 'End my assent');
      add('compact-revise', 'Propose renewed terms');
    }
    return {
      id: known.id,
      revision: known.revision,
      kind: known.terms.kind,
      destination: compactTermsLabel(world, known.terms),
      companion: observerDescription(world, actorId, otherId, 'definite'),
      distance: null,
      status,
      ...(deadline === undefined ? {} : { deadline }),
      company:
        other && seesEntity(world, actor, other)
          ? 'That person is currently in view'
          : 'Their current location and choices are not known',
      description: `Last known agreement received personally.${known.terms.kind === 'ceasefire' ? ' ' + policy.labels.releasedRisk : ''}${known.cause ? ' ' + compactEndingText(known.cause, known.endedBy === actorId ? 'You' : known.endedBy ? observerDescription(world, actorId, known.endedBy, 'definite') : 'A participant') : ''}`,
      choices,
    };
  });
}

/** The actor's received account survives unseen native removal. Actual commands recheck consent. */
function cooperationViews(world: WorldState, actorId: string): OutingView[] {
  const policy = world.socialOfferPolicy?.cooperation,
    actor = entityGet(world.entities, actorId);
  if (!policy || !actor) return [];
  return perceivedCooperation(world, actorId).map((known) => {
    const otherId = known.proposerId === actorId ? known.recipientId : known.proposerId;
    const other = entityGet(world.entities, otherId),
      here = worldPosition(actor),
      destination =
        known.terms.purpose === 'hunt'
          ? known.terms.meetingPlace
          : known.terms.purpose === 'guide'
            ? known.terms.destination
            : known.terms.task.kind === 'carry'
              ? known.terms.task.destination
              : undefined;
    const deadline = known.status === 'pending' ? known.expiresAt : known.endAt;
    const status =
      known.status !== 'ended' && deadline !== undefined && world.simTime >= deadline
        ? 'ended'
        : known.status;
    const choices: OutingView['choices'] = [];
    const add = (
      operation: NonNullable<CommandInput['outingOperation']>,
      label: string,
      amendmentRevision?: number,
    ) =>
      choices.push({
        id: `cooperation:${known.id}:${operation}:${amendmentRevision ?? ''}`,
        label,
        description: `${label}: ${cooperationTermsLabel(world, amendmentRevision !== undefined && known.amendment ? known.amendment.terms : known.terms)}. ${policy.description}`,
        command: {
          type: 'outing',
          outingOperation: operation,
          outingId: known.id,
          expectedRevision:
            operation === 'leave' || operation === 'conclude'
              ? known.acceptedRevision!
              : known.revision,
          ...(amendmentRevision === undefined ? {} : { amendmentRevision }),
        },
      });
    if (status === 'pending') {
      if (known.recipientId === actorId) {
        add('accept', policy.labels.accept);
        add('decline', policy.labels.decline);
      } else add('withdraw', policy.labels.withdraw);
    } else if (status === 'accepted') {
      if (known.amendment && known.amendment.expiresAt > world.simTime) {
        if (known.amendment.proposedBy === actorId)
          add('withdraw', policy.labels.withdraw, known.amendment.revision);
        else {
          add('accept', policy.labels.acceptAmendment, known.amendment.revision);
          add('decline', policy.labels.declineAmendment, known.amendment.revision);
        }
      }
      add('leave', policy.labels.leave);
      add('conclude', policy.labels.conclude);
      if (destination && (known.terms.purpose !== 'help' || known.terms.task.helperId === actorId))
        choices.push({
          id: `cooperation:${known.id}:walk`,
          label: policy.labels.walk,
          description: `${policy.labels.walk}: ${cooperationTermsLabel(world, known.terms)}. ${policy.description}`,
          command: {
            type: 'move',
            position: destination.point,
            cooperation: { id: known.id, revision: known.acceptedRevision! },
            purpose: `Visit ${destination.label} under agreement ${known.id}`,
          },
        });
    }
    if (
      status === 'accepted' &&
      known.terms.purpose === 'help' &&
      known.terms.task.kind === 'prepare' &&
      known.terms.task.helperId === actorId
    )
      choices.push({
        id: `cooperation:${known.id}:prepare`,
        label: policy.labels.prepare,
        description: `${policy.labels.prepare}: ${cooperationTermsLabel(world, known.terms)}. ${policy.description}`,
        command: {
          type: 'craft',
          recipeId: known.terms.task.recipe.id,
          cooperation: { id: known.id, revision: known.acceptedRevision! },
          purpose: `Prepare ${known.terms.task.outputLabel} under agreement ${known.id}`,
        },
      });
    if (
      status === 'accepted' &&
      known.terms.purpose === 'help' &&
      known.terms.task.kind === 'construction' &&
      known.terms.task.helperId === actorId
    )
      for (const mode of ['enqueue', 'interrupt', 'replace'] as const)
        choices.push({
          id: JSON.stringify(['cooperative-construction', known.id, mode]),
          label: `${policy.labels.construct}: ${ACTIVITY_WORK_MODES[mode].label}`,
          description: `${cooperationTermsLabel(world, known.terms)}. ${ACTIVITY_WORK_MODES[mode].description}`,
          command: {
            type: 'outing',
            outingOperation: 'work',
            outingId: known.id,
            expectedRevision: known.acceptedRevision!,
            outingMode: mode,
          },
        });
    if (
      status === 'accepted' &&
      known.terms.purpose === 'help' &&
      known.terms.task.kind === 'carry' &&
      known.terms.task.helperId === actorId
    ) {
      const task = known.terms.task;
      if (accessiblePossession(world, actorId, task.itemId))
        choices.push({
          id: `cooperation:${known.id}:place`,
          label: policy.labels.placeCarry,
          description: cooperationTermsLabel(world, known.terms),
          command: {
            type: 'drop',
            itemId: task.itemId,
            quantity: task.quantity,
            cooperation: { id: known.id, revision: known.acceptedRevision! },
          },
        });
      else
        choices.push({
          id: `cooperation:${known.id}:take`,
          label: policy.labels.takeCarry,
          description: cooperationTermsLabel(world, known.terms),
          command: {
            type: 'handover',
            handoverOperation: 'accept',
            targetId: otherId,
            offerId: task.offerId,
            expectedOfferRevision: task.offerRevision,
          },
        });
    }
    if (status === 'accepted' && known.terms.purpose === 'hunt') {
      const quarry = known.terms.quarry,
        seen = rememberedPlace(actor.actor!, quarry.id);
      if (
        seen &&
        (seen.episode === quarry.encounters[actorId] ||
          recognizesSubject(world, actorId, quarry.id))
      )
        choices.push({
          id: `cooperation:${known.id}:last-seen`,
          label: policy.labels.lastSeen,
          description: `Your own recorded sighting, not a current target location. ${policy.description}`,
          command: {
            type: 'move',
            position: seen.point,
            cooperation: { id: known.id, revision: known.acceptedRevision! },
          },
        });
    }
    return {
      id: known.id,
      revision: known.revision,
      kind: 'cooperate',
      status,
      destination: cooperationTermsLabel(world, known.terms),
      companion: observerDescription(world, actorId, otherId, 'definite'),
      distance: destination
        ? Math.hypot(
            here.x - destination.point.x,
            here.y - destination.point.y,
            here.z - destination.point.z,
          )
        : null,
      company: BASE_OUTING.companyLabel(!!other && seesEntity(world, actor, other)),
      description: `Personally received terms; another person's unseen choices or arrival are unknown. ${deadline === undefined ? '' : `${Math.max(0, deadline - world.simTime)} game seconds remain before the known deadline.`} ${policy.description}`,
      deadline: known.status === 'pending' ? known.expiresAt : known.endAt,
      choices,
    };
  });
}
export function cooperationProposals(
  world: WorldState,
  actorId: string,
  recipientId: string,
  constructionPlans: readonly import('@open-legend/protocol').ConstructionPlan[] = [],
): OutingView['choices'] {
  const policy = world.socialOfferPolicy?.cooperation;
  if (!policy) return [];
  const helping = policy.families.includes('help');
  // All proposals in this read share the same personal place knowledge. Preparing
  // it for each quarry or carrying offer repeats the same memory/visibility work.
  let destinations: ReturnType<typeof knownGuideDestinations> | undefined;
  const knownDestinations = () => (destinations ??= knownGuideDestinations(world, actorId));
  // Keep family ordering for bounded action retrieval; tuple fields prevent ID collisions.
  // docs/identity-and-references.md#contract
  const choices: OutingView['choices'] = policy.families.includes('guide')
    ? knownDestinations().map((place) => ({
        id: `guide:${JSON.stringify([recipientId, place.id])}`,
        label: `${policy.labels.propose}: ${place.label}`,
        description: policy.description,
        command: {
          type: 'outing',
          outingOperation: 'propose',
          cooperationKind: 'guide',
          targetId: recipientId,
          destinationId: place.id,
        },
      }))
    : [];
  for (const [index, plan] of (helping ? constructionPlans : []).entries())
    choices.push({
      id: JSON.stringify(['construction-help', recipientId, index, plan]),
      label: 'Offer my reviewed construction work',
      description: policy.description,
      command: {
        type: 'outing',
        outingOperation: 'propose',
        cooperationKind: 'help',
        targetId: recipientId,
        cooperationTask: { kind: 'construction', plan },
      },
    });
  const knownCompacts = perceivedCompacts(world, actorId);
  for (const kind of ['alliance', 'ceasefire'] as const) {
    if (!policy.families.includes(kind)) continue;
    const existing = knownCompacts.find(
      (known) =>
        [known.proposerId, known.recipientId].includes(recipientId) &&
        known.terms.kind === kind &&
        known.phase !== 'ended' &&
        (known.phase === 'pending' ? known.replyBy : (known.endAt ?? Infinity)) > world.simTime,
    );
    if (existing) continue;
    const terms =
      kind === 'alliance'
        ? { kind }
        : { kind, durationSeconds: policy.ceasefireSeconds!, lives: {} };
    choices.push({
      id: JSON.stringify(['compact-propose', kind, recipientId]),
      label: `Propose: ${compactTermsLabel(world, terms)}`,
      description: compactTermsLabel(world, terms),
      command: {
        type: 'outing',
        outingOperation: 'compact-propose',
        targetId: recipientId,
        compactKind: kind,
      },
    });
  }
  if (policy.families.includes('hunt'))
    for (const quarryId of [
      ...(world.visibleObjects?.[actorId] ?? []),
      ...(world.visiblePeople?.[actorId] ?? []),
    ]) {
      const quarry = entityGet(world.entities, quarryId);
      if (!quarry?.animal || !quarry.actor?.alive) continue;
      for (const place of knownDestinations())
        choices.push({
          id: `hunt:${JSON.stringify([recipientId, quarryId, place.id])}`,
          label: `${policy.labels.hunt}: ${observerDescription(world, actorId, quarryId, 'definite')}; ${place.label}`,
          description: policy.labels.huntTerms
            .replaceAll('{quarry}', observerDescription(world, actorId, quarryId, 'definite'))
            .replaceAll('{place}', place.label),
          command: {
            type: 'outing',
            outingOperation: 'propose',
            cooperationKind: 'hunt',
            quarryId,
            destinationId: place.id,
            targetId: recipientId,
          },
        });
    }
  for (const record of helping ? (world.knowledge[actorId] ?? []) : []) {
    const recipe = world.recipes[record.recipeId];
    if (!recipe) continue;
    const recipePin = recipeMechanicalPin(recipe);
    if (!policy.helpMethods?.some((pin) => sameDefinitionPin(pin, recipePin))) continue;
    for (const output of recipe.outputs)
      choices.push({
        id: `prepare-help:${JSON.stringify([recipientId, recipe.id, output.port])}`,
        label: `${policy.labels.help}: ${world.itemDefinitions[output.definition.id]!.name}`,
        description: policy.description,
        command: {
          type: 'outing',
          outingOperation: 'propose',
          cooperationKind: 'help',
          targetId: recipientId,
          cooperationTask: {
            kind: 'prepare',
            recipeId: recipe.id,
            outputPort: output.port,
            quantity: output.quantity,
          },
        },
      });
  }
  for (const offer of helping ? perceivedOffersBetween(world, actorId, recipientId).outgoing : []) {
    const item =
      offer.offered.length === 1
        ? entityGet(world.entities, offer.offered[0]!.itemId)?.item
        : undefined;
    if (
      offer.requested.length ||
      !item ||
      item.revision !== offer.offered[0]!.revision ||
      item.quantity !== offer.offered[0]!.quantity
    )
      continue;
    for (const place of knownDestinations())
      choices.push({
        id: `carry-help:${JSON.stringify([offer.id, place.id])}`,
        label: `${policy.labels.carry}: ${place.label}`,
        description: policy.description,
        command: {
          type: 'outing',
          outingOperation: 'propose',
          cooperationKind: 'help',
          targetId: recipientId,
          cooperationTask: {
            kind: 'carry',
            offerId: offer.id,
            offerRevision: offer.revision,
            destinationId: place.id,
          },
        },
      });
  }
  // Every installed purpose revises received terms, including profiles without helping.
  // docs/projects/first-playable-cooperation-tech-design.md#exact-consent-and-cancellation
  const previous = perceivedCooperation(world, actorId).find(
    (known) =>
      [known.proposerId, known.recipientId].includes(recipientId) &&
      known.status !== 'ended' &&
      (known.status === 'pending' ? known.expiresAt : known.endAt!) > world.simTime,
  );
  if (previous)
    return choices.map((choice) => {
      if (!choice.command.cooperationKind) return choice;
      return {
        ...choice,
        // Amendments retain the purpose's family ordering too: a large set must
        // not displace ordinary work in bounded deterministic action retrieval.
        id: `${choice.command.cooperationKind}:${JSON.stringify(['revise', previous.id, previous.revision, choice.id])}`,
        label: `Propose revised terms: ${choice.label}`,
        description: `${choice.description} Current personally received terms: ${cooperationTermsLabel(world, previous.terms)}. Accepted terms remain until the other person accepts the revision.`,
        command: {
          ...choice.command,
          outingOperation: 'revise',
          outingId: previous.id,
          expectedRevision: previous.revision,
        },
      };
    });
  return choices;
}

/** A stated purpose comes from the actor's received agreement. A private native
 * ending must not manufacture knowledge by removing an otherwise ordinary choice. */
export function cooperativePurposeChoice(
  world: WorldState,
  actorId: string,
  command: CommandInput,
): { command: CommandInput; label: string; description: string; agreementId: string } | undefined {
  const policy = world.socialOfferPolicy?.cooperation;
  if (!policy || command.cooperation) return;
  const known = perceivedCooperation(world, actorId).find(
    (record) =>
      record.status === 'accepted' &&
      (record.terms.purpose === 'hunt' ||
        (record.terms.purpose === 'help' &&
          ['prepare', 'carry'].includes(record.terms.task.kind) &&
          record.terms.task.helperId === actorId)) &&
      record.endAt! > world.simTime,
  );
  if (!known) return;
  if (known.terms.purpose === 'help' && known.terms.task.kind === 'prepare') {
    if (
      !['craft', 'gather', 'move', 'equip', 'pickup'].includes(command.type) ||
      (command.type === 'move' && !command.position)
    )
      return;
    return {
      agreementId: known.id,
      label: 'Prepare for these agreed terms',
      description: cooperationTermsLabel(world, known.terms),
      command: { ...command, cooperation: { id: known.id, revision: known.acceptedRevision! } },
    };
  }
  if (known.terms.purpose === 'help' && known.terms.task.kind === 'carry') {
    const task = known.terms.task;
    if (
      command.type === 'move'
        ? !command.position
        : !(
            ['drop', 'transfer-item'].includes(command.type) &&
            command.itemId === task.itemId &&
            command.quantity === task.quantity &&
            (command.type !== 'transfer-item' || command.targetId === task.destination.entityId)
          )
    )
      return;
    return {
      agreementId: known.id,
      label: 'Act for these carrying terms',
      description: cooperationTermsLabel(world, known.terms),
      command: { ...command, cooperation: { id: known.id, revision: known.acceptedRevision! } },
    };
  }
  if (known.terms.purpose !== 'hunt') return;
  const quarry = known.terms.quarry;
  if (['strike', 'hunt', 'aim', 'shoot-once', 'follow'].includes(command.type)) {
    if (
      command.targetId !== quarry.id ||
      !subjectReferenceCurrent(world, actorId, quarry.id, quarry.encounters[actorId])
    )
      return;
  } else if (!['guard', 'evade'].includes(command.type)) return;
  return {
    agreementId: known.id,
    label: policy.labels.huntAction,
    description: cooperationTermsLabel(world, known.terms),
    command: {
      ...command,
      cooperation: { id: known.id, revision: known.acceptedRevision! },
      purpose: policy.labels.huntAction,
    },
  };
}

/** A remote offer stays a last-known attempt until personally ended or its known
 * deadline. Native missing rows never select this panel's membership or controls. */
function itemOfferViews(world: WorldState, actorId: string): OutingView[] {
  return perceivedItemOffers(world, actorId)
    .filter((known) => known.status === 'pending' && known.expiresAt > world.simTime)
    .map((known) => {
      const incoming = known.recipientId === actorId,
        otherId = incoming ? known.offererId : known.recipientId;
      return {
        id: known.id,
        revision: known.revision,
        kind: 'item-offer',
        status: 'pending',
        destination: describeItemOffer(world, known),
        companion: observerDescription(world, actorId, otherId, 'definite'),
        distance: null,
        deadline: known.expiresAt,
        company: 'Only the personally received terms are known',
        description:
          'Last known offer. No possessions move until a separately admitted acceptance. Current availability is checked when you attempt it.',
        choices: (incoming ? (['accept', 'decline'] as const) : (['withdraw'] as const)).map(
          (operation) => ({
            id: JSON.stringify(['known-offer', known.id, known.revision, operation]),
            label:
              operation === 'accept'
                ? 'Accept these offered terms'
                : operation === 'decline'
                  ? 'Decline these offered terms'
                  : 'Withdraw my offer',
            description: describeItemOffer(world, known),
            command: {
              type: 'handover',
              handoverOperation: operation,
              targetId: otherId,
              offerId: known.id,
              expectedOfferRevision: known.revision,
            },
          }),
        ),
      };
    });
}
