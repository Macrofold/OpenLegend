import { z } from 'zod';
import {
  installedRecipeFamilies,
  recipeFamily,
  compileRecipeCandidate,
  recipeDependencyReferences,
  recipeVisibleDependencies,
  selectedRecipeCandidateSchema,
  familyMaterialEligible,
  observeActor,
  describeInvention,
  inventionFamily,
  readAttribute,
  type DeclarationDraft,
  type RecipeDefinition,
} from '@open-legend/domain';
import type { InventionValidationView } from '@open-legend/protocol';
import { inventionMaterials, scopedInventionErrors } from './invention-context.js';
import { declarationSchema } from './ai-schemas.js';
import { normalizeInventionProposal } from './invention-service.js';
import { digest } from './store.js';
import type { WorldService } from './world-service.js';

export const INVENTION_TOOL_DESCRIPTIONS = {
  catalogue:
    'List installed recipe families. Supply familyId to inspect one exact native interface and its strict candidate schema. No new host capability is implied.',
  materials:
    'Page observed native definitions and verified owned manufactured materials. Native validation separately checks ingredient roles and parameter references; discovery is not a promise of inventory quantity.',
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
    familyId: z.string().min(1).max(120).optional(),
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
export function recipeDraft(recipe: RecipeDefinition): DeclarationDraft {
  return structuredClone(recipe.sourceCandidate);
}
/** Human editors receive only inventor-permitted material choices and descriptor-owned labels.
 * Editing these fields produces a new candidate; admission remains the trusted family's owner. */
const candidateEnvelope = z.fromJSONSchema(declarationSchema);
type RecipeEditorProjectionField = {
  path: string[];
  label: string;
  description?: string;
  unit?: string;
  kind: 'text' | 'number' | 'choice';
  minimum?: number;
  maximum?: number;
  step?: number;
  choices?: Array<{ value: string; label: string }>;
};
export function projectRecipeEditor(service: WorldService, actorId: string, raw: unknown) {
  const parsed = candidateEnvelope.safeParse(raw);
  if (!parsed.success) return undefined;
  const candidate = parsed.data as DeclarationDraft;
  const family = recipeFamily(service.world, candidate.family.id);
  if (!family || family.definition.version !== candidate.family.version) return undefined;
  const observed = observeActor(service.world, actorId, { includeMemories: false });
  if (!observed) return undefined;
  const materials = inventionMaterials(service.world, observed);
  const fields = family.definition.editor.fields
    .filter((field) => !field.readOnly)
    .flatMap<RecipeEditorProjectionField>((field) => {
      const path = field.path.split('.');
      if (path[0] === 'inputs') {
        const role = path[1];
        const index = candidate.inputs.findIndex((input) => input.role === role);
        if (index < 0) return [];
        path[1] = String(index);
        if (path[2] === 'definitionId')
          return [
            {
              ...field,
              path,
              kind: 'choice' as const,
              choices: materials
                .filter((material) => {
                  const definition = service.world.itemDefinitions[material.id];
                  return (
                    definition && familyMaterialEligible(service.world, family, definition, role)
                  );
                })
                .map((material) => ({ value: material.id, label: material.name })),
            },
          ];
        return [
          {
            ...field,
            path,
            kind: 'number' as const,
            minimum: family.definition.inputs.minimumQuantity,
            maximum: family.definition.inputs.maximumQuantity,
            step: 1,
          },
        ];
      }
      const constraint =
        path[0] === 'parameters' && path[1]
          ? family.definition.parameterSchema.properties[path[1]]
          : undefined;
      if (
        path[0] === 'parameters' &&
        family.definition.references?.some((reference) => reference.parameter === path[1])
      )
        return [
          {
            ...field,
            path,
            kind: 'choice' as const,
            choices: materials.map((material) => ({ value: material.id, label: material.name })),
          },
        ];
      if (constraint && constraint.type !== 'string')
        return [
          {
            ...field,
            path,
            kind: 'number' as const,
            minimum: constraint.minimum,
            maximum: constraint.maximum,
            ...(constraint.type === 'integer' ? { step: 1 } : {}),
          },
        ];
      if (constraint?.type === 'string' && constraint.enum)
        return [
          {
            ...field,
            path,
            kind: 'choice' as const,
            choices: constraint.enum.map((value) => ({ value, label: value })),
          },
        ];
      return [{ ...field, path, kind: 'text' as const }];
    });
  const errors = scopedInventionErrors(service, actorId, candidate);
  return {
    family: candidate.family,
    fields,
    facts: errors.length ? [] : compileRecipeCandidate(service.world, candidate).facts,
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
    recipeEditor: projectRecipeEditor(service, actorId, recipe.sourceCandidate),
    summary: describeInvention(recipe),
    interface: recipeFamily(service.world, family)!.definition,
    familyPin: recipe.familyPin,
    dependencyReferences: recipeVisibleDependencies(service.world, recipe),
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
  const compiled = draft ? compileRecipeCandidate(service.world, draft) : undefined;
  const dependencies =
    draft && compiled
      ? recipeDependencyReferences(service.world, draft, compiled)
          // Producer proof is private authority data; preview reports the supplied inputs only.
          .filter(
            (reference) =>
              reference.kind === 'item-definition' &&
              (draft.inputs.some((input) => input.definitionId === reference.pin.id) ||
                compiled.dependencyIds?.includes(reference.pin.id)),
          )
          .map(({ pin }) => ({
            id: pin.id,
            version: pin.version,
            digest: pin.digest,
            role:
              draft.inputs.find((input) => input.definitionId === pin.id)?.role ??
              'family-dependency',
          }))
      : [];
  const descriptor = family ? recipeFamily(service.world, family) : undefined;
  return {
    valid,
    errors,
    dependencies,
    ...(family && compiled
      ? {
          family,
          summary: compiled.facts
            .map((fact) => `${fact.label}: ${fact.value}${fact.unit ? ` ${fact.unit}` : ''}`)
            .join('; '),
        }
      : {}),
    limits: [
      'Checks cover the current native recipe envelope, not arbitrary physical plausibility or complete cross-system verification.',
      'Apply rechecks current authority, world capacity, base references and actor state; a valid preview is not guaranteed installation. Crafting and use remain separate native actions.',
      ...(descriptor ? [descriptor.definition.limitation] : []),
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
    (input.operation !== 'catalogue' && input.familyId !== undefined) ||
    (input.operation !== 'inspect_recipe' && input.recipeId !== null) ||
    (!['materials', 'recipes', 'inspect_modules'].includes(input.operation) && input.offset !== 0)
  )
    return { ok: false, message: 'Arguments do not apply to this tool.' };
  switch (input.operation) {
    case 'catalogue': {
      const selected = input.familyId ? recipeFamily(service.world, input.familyId) : undefined;
      if (input.familyId && !selected)
        return { ok: false, message: 'That recipe family is not installed.' };
      return {
        ok: true,
        profile: service.world.profile,
        ...(selected
          ? { family: selected.definition, schema: selectedRecipeCandidateSchema(selected) }
          : {
              families: installedRecipeFamilies(service.world).map(({ definition }) => ({
                id: definition.id,
                version: definition.version,
                name: definition.name,
                description: definition.description,
                limitation: definition.limitation,
              })),
              select:
                'Supply familyId to read one strict family schema before proposing its candidate.',
            }),
        limits:
          'These are native recipe consumers, not a complete world-module graph. Shared-law replacement, generated art and general mechanic authoring remain unsupported here.',
      };
    }
    case 'materials': {
      const observed = service.observe(actorId);
      const all = observed ? inventionMaterials(service.world, observed) : [];
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
