import { inventionAttribution } from './invention-attribution.js';
import { inventionPermission } from './invention-policy.js';
import {
  attributeDefinition,
  HOST_IMPLEMENTATIONS,
  definitionPin,
  validateWorldModules,
  type AttributeDefinition,
} from './world-modules.js';
import { draftWorld, cloneValue } from './draft.js';
import { canonicalJson, contentLabel, emit, finish, outcome } from './events.js';
import { getOwn, isSafeRecordId } from './records.js';
import type {
  DeclarationDraft,
  DeclarationProvenance,
  InputRole,
  MaterialProperty,
  Transition,
  WorldState,
} from './types.js';

export { DECLARATION_CONTRACT } from './invention-families.js';
import { DECLARATION_CONTRACT } from './invention-families.js';
const roleProperties = DECLARATION_CONTRACT.roleProperties;
const properties = new Set<MaterialProperty>([
  'fiber',
  'binding',
  'flexible',
  'rigid',
  'shaft',
  'pouch',
  'point',
  'projectile',
  'food',
  'fuel',
]);
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const range = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const boundedText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const exactKeys = (value: Record<string, unknown>, allowed: string[]) =>
  Object.keys(value).every((key) => allowed.includes(key));

export function validateDeclaration(world: WorldState, candidate: unknown): string[] {
  if (!record(candidate)) return ['Declaration must be an object.'];
  const errors: string[] = [];
  if (
    !exactKeys(candidate, [
      'schemaVersion',
      'name',
      'description',
      'inputs',
      'workSeconds',
      'output',
    ])
  )
    errors.push('Unsupported declaration fields or operations.');
  if (candidate.schemaVersion !== 1) errors.push('Unsupported declaration schema version.');
  if (!boundedText(candidate.name, 80) || !boundedText(candidate.description, 700))
    errors.push('A bounded name and description are required.');
  if (!range(candidate.workSeconds, 48, 480) || !Number.isInteger(candidate.workSeconds))
    errors.push('Work must be an integer from 48 to 480 simulation seconds.');
  if (
    !Array.isArray(candidate.inputs) ||
    candidate.inputs.length < 2 ||
    candidate.inputs.length > 6
  )
    return [...errors, 'Use two to six material roles.'];
  let total = 0;
  const validRoles = new Set<string>();
  const inputProperties = new Set<MaterialProperty>();
  for (const input of candidate.inputs) {
    if (!record(input) || !exactKeys(input, ['definitionId', 'quantity', 'role'])) {
      errors.push('Invalid material input.');
      continue;
    }
    const definition = getOwn(world.itemDefinitions, input.definitionId);
    if (
      !definition ||
      definition.recipeId ||
      definition.nutrition !== undefined ||
      definition.id === 'raw_meat'
    ) {
      errors.push(
        'Inputs must use an available native material, not an invented source or finished tool.',
      );
      continue;
    }
    if (!range(input.quantity, 1, 8) || !Number.isInteger(input.quantity)) {
      errors.push('Material quantities must be integers from 1 to 8.');
      continue;
    }
    total += input.quantity;
    const role = typeof input.role === 'string' ? (input.role as InputRole) : undefined;
    if (
      !role ||
      !Object.hasOwn(roleProperties, role) ||
      !definition.properties.includes(roleProperties[role])
    )
      errors.push(`Material ${definition.id} cannot fill role ${role ?? '<invalid role>'}.`);
    else if (validRoles.has(role))
      errors.push(`Role ${role} must occur once; combine its quantity.`);
    else validRoles.add(role);
    for (const property of definition.properties) inputProperties.add(property);
  }
  if (total > 20) errors.push('Recipe exceeds its material budget.');
  const output = candidate.output;
  if (
    !record(output) ||
    !exactKeys(output, [
      'kind',
      'name',
      'description',
      'properties',
      'launcher',
      'ammunition',
      'gatheringTool',
    ])
  )
    return [...errors, 'Unsupported output shape or effects.'];
  if (!boundedText(output.name, 80) || !boundedText(output.description, 700))
    errors.push('Output name and description are required.');
  if (
    !Array.isArray(output.properties) ||
    output.properties.length > 6 ||
    !output.properties.every(
      (property) =>
        properties.has(property as MaterialProperty) &&
        (property === 'projectile' || inputProperties.has(property as MaterialProperty)) &&
        !['food', 'fuel'].includes(String(property)),
    )
  )
    errors.push(
      'Output properties must be supported by its materials and cannot create food or fuel.',
    );
  const requireRoles = (roles: string[]) => {
    for (const role of roles)
      if (!validRoles.has(role)) errors.push(`Missing mechanically required role: ${role}.`);
  };
  if (output.kind === 'launcher') {
    const launcher = output.launcher;
    if (
      output.ammunition !== undefined ||
      output.gatheringTool !== undefined ||
      !record(launcher) ||
      !exactKeys(launcher, ['mechanism', 'ammunitionKind', 'damage', 'range', 'accuracy'])
    )
      return [...errors, 'A launcher needs one supported launcher component.'];
    if (launcher.mechanism !== 'swing' && launcher.mechanism !== 'flex')
      return [...errors, 'Unsupported launch mechanism.'];
    const envelope = DECLARATION_CONTRACT.mechanisms[launcher.mechanism];
    requireRoles([...envelope.requiredRoles]);
    if (launcher.ammunitionKind !== envelope.ammunitionKind)
      errors.push('Launch mechanism and ammunition are incompatible.');
    if (
      !range(launcher.damage, envelope.damage[0], envelope.damage[1]) ||
      !range(launcher.range, envelope.range[0], envelope.range[1]) ||
      !range(launcher.accuracy, envelope.accuracy[0], envelope.accuracy[1])
    )
      errors.push('Launcher parameters exceed the supported mechanical envelope.');
    if (launcher.mechanism === 'flex') {
      const body = candidate.inputs.find((input) => record(input) && input.role === 'body');
      if (
        !record(body) ||
        !getOwn(world.itemDefinitions, body.definitionId)?.properties.includes('rigid')
      )
        errors.push('A flexing body must also have structural rigidity.');
    }
  } else if (output.kind === 'ammunition') {
    requireRoles(['shaft', 'point', 'fletching']);
    const ammo = output.ammunition;
    if (
      output.launcher !== undefined ||
      output.gatheringTool !== undefined ||
      !record(ammo) ||
      !exactKeys(ammo, ['kind', 'damageBonus']) ||
      ammo.kind !== 'arrow' ||
      !range(ammo.damageBonus, 0, 5)
    )
      errors.push('Only bounded physical arrow ammunition can be assembled.');
  } else if (output.kind === 'gathering-tool') {
    const envelope = DECLARATION_CONTRACT.gatheringTool;
    requireRoles([...envelope.requiredRoles]);
    const tool = output.gatheringTool;
    const body = candidate.inputs.find((input) => record(input) && input.role === 'body');
    if (
      output.launcher !== undefined ||
      output.ammunition !== undefined ||
      !record(tool) ||
      !exactKeys(tool, ['resourceId', 'quantity']) ||
      !range(tool.quantity, envelope.quantity[0], envelope.quantity[1]) ||
      !Number.isInteger(tool.quantity) ||
      !Object.values(world.entities).some(
        (entity) => entity.resource?.definitionId === tool.resourceId,
      ) ||
      !record(body) ||
      !getOwn(world.itemDefinitions, body.definitionId)?.properties.includes('rigid')
    )
      errors.push(
        'A gathering tool needs a rigid body, binding, an existing resource, and a yield of 2–4.',
      );
  } else errors.push('Unsupported output kind.');
  return errors;
}

export function admitDeclaration(
  original: WorldState,
  draft: DeclarationDraft,
  provenance: DeclarationProvenance,
): Transition {
  const reject = (code: string, message: string): Transition => ({
    world: original,
    events: [],
    outcome: outcome(false, code, message),
  });
  if (original.paused)
    return reject('paused', 'The world is paused. Revalidate the candidate after resuming.');
  if (
    !provenance ||
    !isSafeRecordId(provenance.requestId) ||
    !getOwn(original.entities, provenance.actorId)?.actor?.alive ||
    getOwn(original.entities, provenance.actorId)?.actor?.incapacitated ||
    !['live-model', 'test-fixture', 'supplied-proposal'].includes(provenance.source)
  )
    return reject(
      'invalid-provenance',
      'Declaration needs an active actor and a durable authoring request.',
    );
  const permission = inventionPermission(original, provenance.authority);
  if (!permission.ok) return { world: original, events: [], outcome: permission };
  // A derived candidate cannot replace or silently rebase its known source.
  // archive/07-technical-architecture/declarations-and-evolution.md#similar-inventions-before-authoring
  if (provenance.derivedFrom) {
    const base = getOwn(original.recipes, provenance.derivedFrom.recipeId);
    if (
      !base ||
      base.version !== provenance.derivedFrom.version ||
      base.digest !== provenance.derivedFrom.digest ||
      !original.knowledge[provenance.actorId]?.some((entry) => entry.recipeId === base.id)
    )
      return reject('stale-base', 'The selected base recipe is no longer known at that version.');
  }
  let attribution: ReturnType<typeof inventionAttribution>;
  try {
    attribution = inventionAttribution(original, provenance.actorId);
  } catch (error) {
    return reject(
      'invalid-attribution',
      error instanceof Error ? error.message : 'Invalid inventor.',
    );
  }
  const errors = validateDeclaration(original, draft);
  if (errors.length) return reject('invalid-declaration', errors.join(' '));
  const digest = canonicalJson(draft);
  const receipt = getOwn(original.declarationReceipts, provenance.requestId);
  if (receipt)
    return receipt.digest === digest &&
      canonicalJson(receipt.attribution) === canonicalJson(attribution)
      ? {
          world: original,
          events: [],
          outcome: {
            ok: true,
            code: 'reused',
            message: 'This authoring result was already admitted.',
            recipeId: receipt.recipeId,
          },
        }
      : reject('idempotency-conflict', 'The authoring request already has a different result.');
  if (
    Object.keys(original.recipes).length >= 64 &&
    !Object.values(original.recipes).some((recipe) => recipe.digest === digest)
  )
    return reject(
      'registry-capacity',
      'This world has reached its initial limit of 64 invented techniques.',
    );
  const world = draftWorld(original);
  const events: Transition['events'] = [];
  let recipeId = `recipe-${contentLabel(digest)}`;
  const matching = Object.values(world.recipes).find((recipe) => recipe.digest === digest);
  if (matching) recipeId = matching.id;
  else {
    while (world.recipes[recipeId]) recipeId += '-v';
    const outputDefinitionId = `${recipeId}-item`;
    const definition = {
      id: outputDefinitionId,
      version: 1,
      name: draft.output.name,
      description: draft.output.description,
      properties: [...draft.output.properties],
      recipeId,
      ...(draft.output.launcher ? { launcher: { ...draft.output.launcher } } : {}),
      ...(draft.output.ammunition ? { ammunition: { ...draft.output.ammunition } } : {}),
      ...(draft.output.gatheringTool ? { gatheringTool: { ...draft.output.gatheringTool } } : {}),
    };
    world.itemDefinitions[outputDefinitionId] = definition;
    world.recipes[recipeId] = {
      ...cloneValue(draft),
      id: recipeId,
      version: 1,
      digest,
      outputDefinitionId,
      admittedAt: world.simTime,
      provenance: cloneValue(provenance),
    };
  }
  world.declarationReceipts[provenance.requestId] = { digest, recipeId, attribution };
  const knowledge =
    world.knowledge[provenance.actorId] ?? (world.knowledge[provenance.actorId] = []);
  if (!knowledge.some((record) => record.recipeId === recipeId))
    knowledge.push({
      recipeId,
      learnedAt: world.simTime,
      source: 'invented',
      evidenceId: provenance.requestId,
    });
  const actor = world.entities[provenance.actorId]!;
  emit(
    world,
    events,
    'declaration-admitted',
    `${actor.name} worked out a technique: ${draft.name}.`,
    actor,
    undefined,
    { recipeId, source: provenance.source },
    'private',
  );
  return finish(world, events, {
    ok: true,
    code: matching ? 'reused' : 'admitted',
    message: `${draft.name} is now an available technique. It still needs materials and work.`,
    recipeId,
  });
}

export interface AttributeDeclarationRequest {
  id: string;
  expectedManifestRevision: number;
  definition?: import('./world-modules.js').AttributeDefinition;
  removeId?: string;
}

/** Owner authoring uses the declaration admission boundary, not a second installer.
 * The initial revision path changes presentation only; INV-5 owns broader transitions.
 * See archive/07-technical-architecture/world-module-runtime.md#10-initialization-activation-disabling-and-failure.
 */
export function admitAttributeDeclaration(
  original: WorldState,
  request: AttributeDeclarationRequest,
): Transition {
  const reject = (message: string): Transition => ({
    world: original,
    events: [],
    outcome: outcome(false, 'attribute-rejected', message),
  });
  const digest = canonicalJson(request);
  const prior = getOwn(original.commandReceipts, request.id);
  if (prior)
    return prior.digest === digest
      ? { world: original, events: [], outcome: prior.outcome }
      : reject('Request identity conflicts.');
  if (
    !isSafeRecordId(request.id) ||
    !original.moduleManifest ||
    original.moduleManifest.revision !== request.expectedManifestRevision ||
    !!request.definition === !!request.removeId
  )
    return reject('Invalid or stale definition request.');
  const permission = inventionPermission(original, {
    origin: 'player',
    policyRevision: original.inventionPolicy.revision,
  });
  if (!permission.ok) return { world: original, events: [], outcome: permission };
  const id = request.definition?.id ?? request.removeId!;
  const previous = attributeDefinition(original, id);
  if (previous && HOST_IMPLEMENTATIONS[previous.implementation].storage !== 'attributes')
    return reject('Native wilderness bindings cannot be edited.');
  const users = Object.values(original.entities).filter(
    (e) =>
      e.actor?.attributes?.[id] ||
      e.replenisher?.attributeId === id ||
      e.actor?.action?.attributeId === id ||
      e.actor?.agency.plan?.steps.some(
        (step) =>
          ['queued', 'running'].includes(step.status) &&
          step.command.type === 'replenish' &&
          step.command.attributeId === id,
      ),
  );
  if (request.removeId && (!previous || users.length))
    return reject('Missing definition or live state/action/source still depends on it.');
  if (previous && request.definition) {
    const meaning = (definition: AttributeDefinition) => {
      const { version, name, presentation, ...rest } = definition;
      return { ...rest, ...(rest.concern ? { concern: { ...rest.concern, text: '' } } : {}) };
    };
    if (
      request.definition.version !== previous.version + 1 ||
      canonicalJson(meaning(previous)) !== canonicalJson(meaning(request.definition))
    )
      return reject(
        'Only a presentation revision is supported; state, units, ownership and mechanics must remain identical.',
      );
    if (
      users.some(
        (e) =>
          e.actor?.action?.attributeId === id ||
          e.actor?.agency.plan?.steps.some(
            (step) =>
              ['queued', 'running'].includes(step.status) &&
              step.command.type === 'replenish' &&
              step.command.attributeId === id,
          ),
      )
    )
      return reject('Wait for dependent work to finish or cancel it before revision.');
  } else if (request.definition?.version !== 1 && !request.removeId)
    return reject('New definitions begin at version 1.');
  const world = draftWorld(original);
  const manifest = world.moduleManifest!;
  manifest.definitions = request.definition
    ? previous
      ? manifest.definitions.map((d) => (d.id === id ? cloneValue(request.definition!) : d))
      : [...manifest.definitions, cloneValue(request.definition)]
    : manifest.definitions.filter((d) => d.id !== id);
  manifest.pins = manifest.definitions.map(definitionPin);
  manifest.revision++;
  try {
    validateWorldModules(world);
  } catch (error) {
    return reject(error instanceof Error ? error.message : 'Invalid module definition.');
  }
  const result = outcome(
    true,
    request.removeId ? 'attribute-removed' : 'attribute-admitted',
    request.removeId
      ? 'Unused definition removed.'
      : 'Attribute definition admitted; existing instances were preserved.',
  );
  world.commandReceipts[request.id] = { digest, outcome: result };
  return finish(world, [], result);
}
