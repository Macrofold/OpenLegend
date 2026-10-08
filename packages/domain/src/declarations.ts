import { subjectNarration } from './narration.js';
import { canonicalName, namePhrase } from '@open-legend/language';
import { learnRecipe } from './knowledge.js';
import type { RecipeDefinition } from './types.js';
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
import type { DeclarationDraft, DeclarationProvenance, Transition, WorldState } from './types.js';

import {
  compileRecipeCandidate,
  recipeDependencyReferences,
  validateRecipeCandidate,
} from './invention-families.js';
import { recipeFamily } from './world-modules.js';

export const validateDeclaration = validateRecipeCandidate;

/** Installed world content and actor inventions share exact compiler/admission semantics.
 * Installation alone teaches nobody and produces no physical item. */
export function installRecipe(
  world: WorldState,
  draft: DeclarationDraft,
  provenance: RecipeDefinition['provenance'],
) {
  const digest = canonicalJson(draft);
  let recipeId = `recipe-${contentLabel(digest)}`;
  const matching = Object.values(world.recipes).find((recipe) => recipe.digest === digest);
  if (matching) recipeId = matching.id;
  else {
    while (world.recipes[recipeId]) recipeId += '-v';
    // Possession exposes the item identity without encoding its private manufacturing recipe.
    // docs/invention-composition.md#3-composition-contract
    let outputDefinitionId = `item-${contentLabel(`output:${digest}`)}`;
    while (world.itemDefinitions[outputDefinitionId]) outputDefinitionId += '-v';
    const compiled = compileRecipeCandidate(world, draft);
    const outputName = canonicalName(draft.output.name, compiled.outputDefinition.nameForm);
    const family = recipeFamily(world, draft.family.id);
    if (!family) throw new Error('The selected recipe family is not installed.');
    world.itemDefinitions[outputDefinitionId] = {
      ...cloneValue(compiled.outputDefinition),
      id: outputDefinitionId,
      version: 1,
      name: outputName,
      description: draft.output.description,
      recipeId,
    };
    world.recipes[recipeId] = {
      name: draft.name,
      description: draft.description,
      inputs: cloneValue(draft.inputs),
      output: {
        ...cloneValue(draft.output),
        name: outputName,
      },
      workSeconds: compiled.workSeconds,
      sourceCandidate: cloneValue(draft),
      familyPin: definitionPin(family.definition),
      dependencyReferences: recipeDependencyReferences(world, draft, compiled),
      facts: cloneValue(compiled.facts),
      id: recipeId,
      version: 1,
      digest,
      outputDefinitionId,
      admittedAt: world.simTime,
      provenance: cloneValue(provenance),
    };
  }
  return { recipe: world.recipes[recipeId]!, reused: !!matching };
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
      receipt.source === provenance.source &&
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
  const world = draftWorld(original);
  const events: Transition['events'] = [];
  const { recipe, reused } = installRecipe(world, draft, provenance);
  const recipeId = recipe.id;
  world.declarationReceipts[provenance.requestId] = {
    digest,
    recipeId,
    attribution,
    source: provenance.source,
  };
  learnRecipe(world, provenance.actorId, recipeId, 'invented', provenance.requestId);
  const actor = world.entities[provenance.actorId]!;
  emit(
    world,
    events,
    'declaration-admitted',
    subjectNarration(actor, `worked out a technique: ${draft.name}.`),
    actor,
    undefined,
    { recipeId, source: provenance.source },
    'private',
  );
  return finish(world, events, {
    ok: true,
    code: reused ? 'reused' : 'admitted',
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
  if (
    previous &&
    !['attributes', 'practice'].includes(HOST_IMPLEMENTATIONS[previous.implementation].storage)
  )
    return reject('Body-backed bindings cannot be edited.');
  const users = Object.values(original.entities).filter(
    (e) =>
      e.actor?.attributes?.[id] ||
      e.actor?.practice?.[id] ||
      e.practiceTarget?.attributeId === id ||
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
          e.actor?.action?.competencePin?.id === id ||
          (e.actor?.coachingEpisodeId &&
            original.coachingEpisodes?.[e.actor.coachingEpisodeId]?.pin.id === id) ||
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
