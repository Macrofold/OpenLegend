import { z } from 'zod';
import {
  DECLARATION_CONTRACT,
  SUPPORTED_INVENTION_FAMILIES,
  INVENTION_FAMILY_INTERFACES,
  describeInvention,
  inventionFamily,
  readAttribute,
  type DeclarationDraft,
} from '@open-legend/domain';
import type { InventionValidationView } from '@open-legend/protocol';
import { declarationSchema } from './ai-schemas.js';
import { inventionMaterials, scopedInventionErrors } from './invention-context.js';
import { normalizeInventionProposal } from './invention-service.js';
import { digest } from './store.js';
import type { WorldService } from './world-service.js';

export const INVENTION_TOOL_DESCRIPTIONS = {
  catalogue:
    'List the installed finite recipe families, their native interfaces and the candidate schema. No new host capability is implied.',
  materials:
    'Page materials available to this inventor. Ingredients are knowledge, not a promise of inventory quantity.',
  recipes:
    'Page learned recipe summaries. This is exact scoped listing, not semantic search or access to hidden inventions.',
  inspect_recipe:
    'Inspect one learned recipe, its immutable base pin, ingredients, bounded effects and limitations. No private provenance.',
  inspect_modules:
    'Inspect only attribute and sense definitions used by this actor. This does not expose other minds, values or module-edit authority.',
  validate:
    'Check a complete proposed recipe against the shared scoped/native recipe validator. Installation authority and current prerequisites are checked separately at Apply. Does not install, teach, spend materials or simulate an experiment.',
} as const;
export const inventionToolInput = z
  .object({
    operation: z.enum([
      'catalogue',
      'materials',
      'recipes',
      'inspect_recipe',
      'inspect_modules',
      'validate',
    ]),
    recipeId: z.string().min(1).max(180).nullable(),
    offset: z.number().int().min(0).max(10000),
    candidateJson: z.string().max(12000).nullable(),
  })
  .strict();
export type InventionToolInput = z.infer<typeof inventionToolInput>;
export type RecipePin = { recipeId: string; version: number; digest: string };

export function knownInvention(service: WorldService, actorId: string, id: string) {
  if (
    !Object.hasOwn(service.world.recipes, id) ||
    !service.world.knowledge[actorId]?.some((entry) => entry.recipeId === id)
  )
    return undefined;
  return service.world.recipes[id];
}
export function recipeDraft(recipe: DeclarationDraft): DeclarationDraft {
  return {
    schemaVersion: recipe.schemaVersion,
    name: recipe.name,
    description: recipe.description,
    inputs: recipe.inputs,
    workSeconds: recipe.workSeconds,
    output: recipe.output,
  };
}
export function inspectInvention(service: WorldService, actorId: string, id: string) {
  const recipe = knownInvention(service, actorId, id);
  if (!recipe)
    return { ok: false as const, message: 'That recipe is not available to this inventor.' };
  const family = inventionFamily(recipe)!;
  return {
    ok: true as const,
    pin: { recipeId: recipe.id, version: recipe.version, digest: recipe.digest },
    candidate: recipeDraft(recipe),
    summary: describeInvention(recipe),
    interface: INVENTION_FAMILY_INTERFACES[family],
    dependencies: recipe.inputs.map((input) => ({
      id: input.definitionId,
      version: service.world.itemDefinitions[input.definitionId]!.version,
      role: input.role,
    })),
  };
}

export function validateInventionCandidate(
  service: WorldService,
  actorId: string,
  candidate: unknown,
): InventionValidationView {
  const errors = scopedInventionErrors(service, actorId, candidate);
  const valid = errors.length === 0;
  const draft = valid ? (candidate as DeclarationDraft) : undefined;
  const family = draft && inventionFamily(draft);
  const dependencies = draft
    ? draft.inputs.map((input) => ({
        id: input.definitionId,
        version: service.world.itemDefinitions[input.definitionId]!.version,
        role: input.role as string,
      }))
    : [];
  if (draft?.output.gatheringTool) {
    const resource = service.world.itemDefinitions[draft.output.gatheringTool.resourceId];
    if (resource)
      dependencies.push({ id: resource.id, version: resource.version, role: 'gathering-target' });
  }
  return {
    valid,
    errors,
    dependencies,
    ...(family ? { family, summary: describeInvention(draft!) } : {}),
    limits: [
      'Checks cover the current native recipe envelope, not arbitrary physical plausibility or complete cross-system verification.',
      'Apply rechecks current authority, world capacity, base references and actor state; a valid preview is not guaranteed installation. Crafting and use remain separate native actions.',
      ...(family ? [INVENTION_FAMILY_INTERFACES[family].limitation] : []),
    ],
  };
}

/** Read/preview tools are app-owned and actor-scoped. JSON cannot request a god audience.
 * docs/architecture.md#invention-workshop-tools
 */
export function executeInventionTool(
  service: WorldService,
  actorId: string,
  raw: unknown,
): unknown {
  const parsed = inventionToolInput.safeParse(raw);
  if (!parsed.success) return { ok: false, message: 'Invalid tool arguments.' };
  const input = parsed.data;
  if (!service.world.entities[actorId]?.actor)
    return { ok: false, message: 'Inventor unavailable.' };
  if (
    (input.operation !== 'validate' && input.candidateJson !== null) ||
    (input.operation !== 'inspect_recipe' && input.recipeId !== null) ||
    (!['materials', 'recipes', 'inspect_modules'].includes(input.operation) && input.offset !== 0)
  )
    return { ok: false, message: 'Arguments do not apply to this tool.' };
  switch (input.operation) {
    case 'catalogue':
      return {
        ok: true,
        profile: service.world.profile,
        contract: DECLARATION_CONTRACT,
        schema: declarationSchema,
        families: Object.entries(SUPPORTED_INVENTION_FAMILIES).map(([id, value]) => ({
          id,
          ...value,
          ...INVENTION_FAMILY_INTERFACES[id as keyof typeof INVENTION_FAMILY_INTERFACES],
        })),
        limits:
          'These are native recipe consumers, not a complete world-module graph. Shared-law replacement, generated art and general mechanic authoring remain unsupported here.',
      };
    case 'materials': {
      const observed = service.observe(actorId);
      const all = observed ? inventionMaterials(observed) : [];
      return {
        ok: true,
        materials: all.slice(input.offset, input.offset + 24),
        total: all.length,
        nextOffset: input.offset + 24 < all.length ? input.offset + 24 : null,
      };
    }
    case 'recipes': {
      const all = (service.world.knowledge[actorId] ?? []).flatMap(({ recipeId }) => {
        const recipe = service.world.recipes[recipeId];
        return recipe ? [recipe] : [];
      });
      return {
        ok: true,
        recipes: all.slice(input.offset, input.offset + 16).map((recipe) => ({
          id: recipe.id,
          version: recipe.version,
          name: recipe.name,
          summary: describeInvention(recipe),
        })),
        total: all.length,
        nextOffset: input.offset + 16 < all.length ? input.offset + 16 : null,
        revision: digest(all.map((recipe) => [recipe.id, recipe.digest])),
        note: 'Fresh scoped listing; restart paging if revision changes. This is not semantic equivalence search.',
      };
    }
    case 'inspect_recipe':
      return input.recipeId
        ? inspectInvention(service, actorId, input.recipeId)
        : { ok: false, message: 'Select a recipe ID.' };
    case 'inspect_modules': {
      const world = service.world,
        actor = world.entities[actorId]!.actor!,
        manifest = world.moduleManifest;
      const attributes = manifest.definitions.filter(
        (definition) => readAttribute(actor, definition) !== undefined,
      );
      return {
        ok: true,
        profile: world.profile,
        manifestRevision: manifest.revision,
        attributes: attributes.slice(input.offset, input.offset + 8),
        total: attributes.length,
        nextOffset: input.offset + 8 < attributes.length ? input.offset + 8 : null,
        senses: manifest.senses.filter((sense) =>
          (actor.senses ?? manifest.defaultSenses).includes(sense.id),
        ),
        limits:
          "Actor-used definition metadata only, not other actors' private values. This workshop cannot install or modify modules; use the existing authorized owner controls for supported edits.",
      };
    }
    case 'validate': {
      if (input.candidateJson === null)
        return { ok: false, message: 'Supply complete candidate JSON.' };
      let candidate: unknown;
      try {
        candidate = JSON.parse(input.candidateJson);
      } catch {
        return { ok: false, message: 'Candidate is not valid JSON.' };
      }
      return {
        ok: true,
        validation: validateInventionCandidate(
          service,
          actorId,
          normalizeInventionProposal(candidate),
        ),
      };
    }
  }
}
