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

/** This is a finite mechanical envelope, not a claim to validate arbitrary physics. */
export const DECLARATION_CONTRACT = {
  schemaVersion: 1,
  outputKinds: ['launcher', 'ammunition'],
  workSeconds: { minimum: 48, maximum: 480 },
  inputQuantity: { minimum: 1, maximum: 8, maximumTotal: 20 },
  mechanisms: {
    swing: {
      ammunitionKind: 'stone',
      requiredRoles: ['binding', 'pouch'],
      damage: [10, 20],
      range: [3, 7],
      accuracy: [0.6, 0.9],
    },
    flex: {
      ammunitionKind: 'arrow',
      requiredRoles: ['body', 'binding'],
      damage: [16, 28],
      range: [4, 10],
      accuracy: [0.6, 0.9],
    },
    arrow: { requiredRoles: ['shaft', 'point', 'fletching'], damageBonus: [0, 5] },
  },
  roleProperties: {
    binding: 'binding',
    body: 'flexible',
    pouch: 'pouch',
    shaft: 'shaft',
    point: 'point',
    fletching: 'fiber',
  },
  notes:
    'Choose actual registered materials and quantities, a fitting name, mechanism and bounded parameters. Finished recipes are generated during play. Properties cannot invent effects. No scripts, free sources, nutrition, fuel or unregistered operations are supported. Arrow ammunition produces one projectile per completed craft.',
} as const;

const roleProperties: Record<InputRole, MaterialProperty> = {
  binding: 'binding',
  body: 'flexible',
  pouch: 'pouch',
  shaft: 'shaft',
  point: 'point',
  fletching: 'fiber',
};
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
    !exactKeys(output, ['kind', 'name', 'description', 'properties', 'launcher', 'ammunition'])
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
      !record(ammo) ||
      !exactKeys(ammo, ['kind', 'damageBonus']) ||
      ammo.kind !== 'arrow' ||
      !range(ammo.damageBonus, 0, 5)
    )
      errors.push('Only bounded physical arrow ammunition can be assembled.');
  } else errors.push('Output kind must be launcher or ammunition.');
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
    !['live-model', 'test-fixture'].includes(provenance.source)
  )
    return reject(
      'invalid-provenance',
      'Declaration needs an active actor and a durable authoring request.',
    );
  const errors = validateDeclaration(original, draft);
  if (errors.length) return reject('invalid-declaration', errors.join(' '));
  const digest = canonicalJson(draft);
  const receipt = getOwn(original.declarationReceipts, provenance.requestId);
  if (receipt)
    return receipt.digest === digest
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
  const world = structuredClone(original);
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
    };
    world.itemDefinitions[outputDefinitionId] = definition;
    world.recipes[recipeId] = {
      ...structuredClone(draft),
      id: recipeId,
      version: 1,
      digest,
      outputDefinitionId,
      admittedAt: world.simTime,
      provenance: structuredClone(provenance),
    };
  }
  world.declarationReceipts[provenance.requestId] = { digest, recipeId };
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
  );
  return finish(world, events, {
    ok: true,
    code: matching ? 'reused' : 'admitted',
    message: `${draft.name} is now an available technique. It still needs materials and work.`,
    recipeId,
  });
}
