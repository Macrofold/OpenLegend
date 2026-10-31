import type {
  ActivityRequest,
  ActivityRequestChoice,
  ActivityRequestChoiceQuery,
  ActivityRequestDescriptor,
  ActivityRequestObservation,
} from '../../activity-hosts.js';
import type { Command, Outcome, WorldState } from '../../types.js';
import { knownGuideDestinations, outingRecipientProblem } from '../../outings.js';
import {
  perceivedCooperation,
  cooperationTermsLabel,
  type CooperationProposal,
} from '../../cooperation.js';
import { perceivedItemOffers } from '../../personal-social.js';
import { recipeMechanicalPin } from '../../invention-families.js';
import { sameDefinitionPin } from '../../definition-pins.js';
import { entityGet } from '../../entity-collection.js';
import { accessiblePossession } from '../../object-access.js';
import { visibleEntitiesFor } from '../../perception.js';
import { outcome } from '../../events.js';
import { observerDescription } from './knowledge.js';
import { recipeRequestDescription } from './activity-descriptions.js';

/** World-owned forms replace recipient × quarry × place command products. Their
 * selected binding still enters the ordinary outing owner with exact received terms. */
export const COOPERATION_REQUESTS = {
  guide: 'base:cooperation-guide',
  hunt: 'base:cooperation-hunt',
  prepare: 'base:cooperation-prepare',
  carry: 'base:cooperation-carry',
} as const;
const receivedKey = (id: string, revision: number) => JSON.stringify([id, revision]);
const knownAgreements = (world: WorldState, actorId: string) =>
  perceivedCooperation(world, actorId).filter(
    (entry) =>
      entry.status !== 'ended' &&
      (entry.status === 'pending' ? entry.expiresAt : entry.endAt!) > world.simTime,
  );
function methods(world: WorldState, actorId?: string) {
  const allowed = world.socialOfferPolicy?.cooperation?.helpMethods ?? [];
  const known = actorId
    ? new Set((world.knowledge[actorId] ?? []).map((entry) => entry.recipeId))
    : undefined;
  return allowed.flatMap((pin) => {
    const recipe = world.recipes[pin.id];
    return recipe &&
      (!known || known.has(recipe.id)) &&
      sameDefinitionPin(pin, recipeMechanicalPin(recipe))
      ? [recipe]
      : [];
  });
}
function carryingOffers(world: WorldState, actorId: string) {
  return perceivedItemOffers(world, actorId).filter((offer) => {
    if (
      offer.offererId !== actorId ||
      offer.requested.length ||
      offer.offered.length !== 1 ||
      offer.status !== 'pending' ||
      offer.expiresAt <= world.simTime
    )
      return false;
    const offered = offer.offered[0]!,
      item = entityGet(world.entities, offered.itemId)?.item;
    return (
      !!item &&
      item.revision === offered.revision &&
      item.quantity === offered.quantity &&
      accessiblePossession(world, actorId, offered.itemId)
    );
  });
}
export function cooperationRequestDescriptors(
  world: WorldState,
  actorId?: string,
): ActivityRequestDescriptor[] {
  const policy = world.socialOfferPolicy?.cooperation;
  if (!policy) return [];
  const agreements = actorId ? knownAgreements(world, actorId) : [];
  const recipient = {
    type: 'entity' as const,
    label: 'Companion',
    required: true as const,
    discovery: { source: 'spatial' as const },
  };
  const agreement = {
    type: 'choice' as const,
    label: 'Proposed agreement',
    required: true as const,
    dependencies: ['recipientId'],
    discovery: { source: 'choices' as const },
    choices: [
      { value: 'new', label: 'Propose a new agreement' },
      ...agreements.map((entry) => ({
        value: receivedKey(entry.id, entry.revision),
        label: `Revise current terms: ${cooperationTermsLabel(world, entry.terms)}`,
      })),
    ],
  };
  const destination = {
    type: 'entity' as const,
    label: 'Meeting place',
    required: true as const,
    discovery: { source: 'known-places' as const },
  };
  const common = { recipientId: recipient, agreement };
  const requests: ActivityRequestDescriptor[] = [];
  if (policy.families.includes('guide'))
    requests.push({
      id: COOPERATION_REQUESTS.guide,
      label: policy.labels.propose,
      description: policy.description,
      submitLabel: 'Propose agreement',
      fields: { ...common, destinationId: destination },
      presentation: {
        kind: 'cooperation-proposal',
        target: 'recipientId',
        destination: 'destinationId',
        agreement: 'agreement',
      },
    });
  if (policy.families.includes('hunt'))
    requests.push({
      id: COOPERATION_REQUESTS.hunt,
      label: policy.labels.hunt,
      description: policy.description,
      submitLabel: 'Propose agreement',
      fields: {
        ...common,
        quarryId: {
          type: 'entity',
          label: 'Quarry',
          required: true,
          dependencies: ['recipientId'],
          discovery: { source: 'spatial' },
        },
        destinationId: destination,
      },
      presentation: {
        kind: 'cooperation-proposal',
        target: 'recipientId',
        quarry: 'quarryId',
        destination: 'destinationId',
        agreement: 'agreement',
      },
    });
  if (policy.families.includes('help')) {
    const recipes = methods(world, actorId);
    const ports = [
      ...new Set(recipes.flatMap((recipe) => recipe.outputs.map((output) => output.port))),
    ];
    if (ports.length)
      requests.push({
        id: COOPERATION_REQUESTS.prepare,
        label: policy.labels.help,
        description: policy.description,
        submitLabel: 'Propose agreement',
        fields: {
          ...common,
          recipeId: {
            type: 'definition',
            definitionKind: 'recipe',
            label: 'Known method',
            required: true,
            discovery: { source: 'definitions' },
          },
          outputPort: {
            type: 'choice',
            label: 'Requested product',
            required: true,
            dependencies: ['recipeId'],
            discovery: { source: 'outputs', sourceField: 'recipeId' },
            choices: ports.map((value) => ({ value, label: value })),
          },
          quantity: {
            type: 'integer',
            label: 'Product count',
            minimum: 1,
            maximum: Number.MAX_SAFE_INTEGER,
            required: true,
          },
        },
        presentation: {
          kind: 'cooperation-proposal',
          target: 'recipientId',
          method: 'recipeId',
          output: 'outputPort',
          quantity: 'quantity',
          agreement: 'agreement',
        },
      });
    const offers = actorId ? carryingOffers(world, actorId) : [];
    // An actor without a current offered load has no executable carry form. Keep
    // the unscoped installed family for native routing, never an empty model enum.
    if (!actorId || offers.length)
      requests.push({
        id: COOPERATION_REQUESTS.carry,
        label: policy.labels.carry,
        description: policy.description,
        submitLabel: 'Propose agreement',
        fields: {
          ...common,
          offer: {
            type: 'choice',
            label: 'Offered load',
            required: true,
            dependencies: ['recipientId'],
            discovery: { source: 'choices' },
            choices: offers.map((offer) => ({
              value: receivedKey(offer.id, offer.revision),
              label: `${offer.offered[0]!.quantity} ${world.itemDefinitions[offer.offered[0]!.definitionPin.id]?.name ?? 'items'}`,
            })),
          },
          destinationId: destination,
        },
        presentation: {
          kind: 'cooperation-proposal',
          target: 'recipientId',
          offer: 'offer',
          destination: 'destinationId',
          agreement: 'agreement',
        },
      });
  }
  return requests;
}
export function cooperationRequestChoices(
  world: WorldState,
  actorId: string,
  observed?: ActivityRequestObservation,
  query?: ActivityRequestChoiceQuery,
): { choices: ActivityRequestChoice[]; warnings: string[] } {
  const descriptors = cooperationRequestDescriptors(world, actorId).filter(
    (entry) => !query || entry.id === query.family,
  );
  if (!descriptors.length) return { choices: [], warnings: [] };
  // Role discovery needs the permitted local identities, not another clone of the
  // actor's complete inventory/history for every dependent-field read.
  const needsPeople = !query || ['recipientId', 'agreement', 'quarryId'].includes(query.field);
  const actor = needsPeople && !observed ? entityGet(world.entities, actorId) : undefined;
  const entities = !needsPeople
    ? []
    : (observed?.visibleEntities ?? (actor ? visibleEntitiesFor(world, actor) : []));
  const choices: ActivityRequestChoice[] = [];
  const add = (
    family: string,
    field: string,
    id: string,
    label: string,
    kind: ActivityRequestChoice['kind'],
    requires?: ActivityRequestChoice['requires'],
  ) => {
    if (
      query &&
      (query.field !== field ||
        Object.entries(requires ?? {}).some(([key, value]) => query.arguments[key] !== value))
    )
      return;
    choices.push({
      id,
      label,
      kind,
      roles: [field],
      requestIds: [family],
      accessible: true,
      ...(requires ? { requires } : {}),
    });
  };
  const recipients =
    !query || query.field === 'recipientId' || query.field === 'agreement'
      ? entities.filter((entity) => !outingRecipientProblem(world, actorId, entity.id))
      : [];
  const agreements = knownAgreements(world, actorId);
  let places: ReturnType<typeof knownGuideDestinations> | undefined;
  for (const descriptor of descriptors) {
    if (!query || query.field === 'recipientId')
      for (const recipient of recipients)
        add(
          descriptor.id,
          'recipientId',
          recipient.id,
          observerDescription(world, actorId, recipient.id, 'definite'),
          'entity',
        );
    if (!query || query.field === 'agreement')
      for (const recipient of recipients) {
        const prior = agreements.find((entry) =>
          [entry.proposerId, entry.recipientId].includes(recipient.id),
        );
        add(
          descriptor.id,
          'agreement',
          prior ? receivedKey(prior.id, prior.revision) : 'new',
          prior
            ? `Revise current terms: ${cooperationTermsLabel(world, prior.terms)}. Accepted terms remain until the revision is accepted.`
            : 'Propose a new agreement; nobody acts before acceptance.',
          'choice',
          { recipientId: recipient.id },
        );
      }
    if (descriptor.fields.destinationId && (!query || query.field === 'destinationId'))
      for (const place of (places ??= knownGuideDestinations(world, actorId)))
        add(descriptor.id, 'destinationId', place.id, place.label, 'entity');
    if (descriptor.id === COOPERATION_REQUESTS.hunt && (!query || query.field === 'quarryId'))
      for (const quarry of entities)
        if (quarry.animal && quarry.actor?.alive && quarry.id !== query?.arguments.recipientId)
          add(
            descriptor.id,
            'quarryId',
            quarry.id,
            observerDescription(world, actorId, quarry.id, 'definite'),
            'entity',
          );
    if (descriptor.id === COOPERATION_REQUESTS.prepare)
      for (const recipe of methods(world, actorId)) {
        add(
          descriptor.id,
          'recipeId',
          recipe.id,
          recipeRequestDescription(world, recipe),
          'definition',
        );
        for (const output of recipe.outputs)
          add(
            descriptor.id,
            'outputPort',
            output.port,
            `${world.itemDefinitions[output.definition.id]?.name}; ${output.quantity} per batch of ${recipe.name}`,
            'choice',
            { recipeId: recipe.id },
          );
      }
    if (descriptor.id === COOPERATION_REQUESTS.carry && (!query || query.field === 'offer'))
      for (const offer of carryingOffers(world, actorId))
        add(
          descriptor.id,
          'offer',
          receivedKey(offer.id, offer.revision),
          `${offer.offered[0]!.quantity} ${world.itemDefinitions[offer.offered[0]!.definitionPin.id]?.name} from my pending offer`,
          'choice',
          { recipientId: offer.recipientId },
        );
  }
  return { choices, warnings: [] };
}
export function bindCooperationRequest(
  world: WorldState,
  actorId: string,
  id: string,
  request: ActivityRequest,
  permitted?: readonly string[],
): Command | Outcome {
  const descriptor = cooperationRequestDescriptors(world, actorId).find(
    (entry) => entry.id === request.family,
  );
  const fail = () =>
    outcome(
      false,
      'cooperation-choices',
      'Choose current companions, terms and permitted details for this agreement.',
    );
  if (
    !descriptor ||
    Object.keys(request.arguments).sort().join('|') !==
      Object.keys(descriptor.fields).sort().join('|')
  )
    return fail();
  const args = request.arguments;
  const prepared = cooperationRequestChoices(world, actorId).choices;
  for (const [field, meaning] of Object.entries(descriptor.fields)) {
    if (meaning.type === 'integer') {
      if (
        !Number.isSafeInteger(args[field]) ||
        Number(args[field]) < (meaning.minimum ?? Number.MIN_SAFE_INTEGER) ||
        Number(args[field]) > (meaning.maximum ?? Number.MAX_SAFE_INTEGER)
      )
        return fail();
      continue;
    }
    const option = prepared.find(
      (choice) =>
        choice.requestIds?.includes(request.family) &&
        choice.roles.includes(field) &&
        choice.id === args[field] &&
        Object.entries(choice.requires ?? {}).every(([key, value]) => args[key] === value),
    );
    if (!option || (option.kind === 'entity' && permitted && !permitted.includes(option.id)))
      return fail();
  }
  const recipientId = String(args.recipientId);
  let proposal: CooperationProposal;
  if (request.family === COOPERATION_REQUESTS.guide)
    proposal = { cooperationKind: 'guide', destinationId: String(args.destinationId) };
  else if (request.family === COOPERATION_REQUESTS.hunt)
    proposal = {
      cooperationKind: 'hunt',
      quarryId: String(args.quarryId),
      destinationId: String(args.destinationId),
    };
  else if (request.family === COOPERATION_REQUESTS.prepare)
    proposal = {
      cooperationKind: 'help',
      task: {
        kind: 'prepare',
        recipeId: String(args.recipeId),
        outputPort: String(args.outputPort),
        quantity: Number(args.quantity),
      },
    };
  else {
    const offer = carryingOffers(world, actorId).find(
      (entry) => receivedKey(entry.id, entry.revision) === args.offer,
    );
    if (!offer) return fail();
    proposal = {
      cooperationKind: 'help',
      task: {
        kind: 'carry',
        offerId: offer.id,
        offerRevision: offer.revision,
        destinationId: String(args.destinationId),
      },
    };
  }
  if (args.agreement === 'new')
    return { id, actorId, type: 'outing', operation: 'propose', recipientId, ...proposal };
  const prior = knownAgreements(world, actorId).find(
    (entry) =>
      receivedKey(entry.id, entry.revision) === args.agreement &&
      [entry.proposerId, entry.recipientId].includes(recipientId),
  );
  return prior
    ? {
        id,
        actorId,
        type: 'outing',
        operation: 'revise',
        outingId: prior.id,
        expectedRevision: prior.revision,
        ...proposal,
      }
    : fail();
}
