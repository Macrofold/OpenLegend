import {
  attributeBindingTarget,
  attributeBindingSummary,
  attributeBindingImpact,
  bindAuthoringAttributes,
} from './world-authoring-bindings.js';
import {
  admitAttributeDeclaration,
  admitCognitionPolicy,
  admitDeclaration,
  admitStatusEffectPolicy,
  inventionPermission,
  validateDeclaration,
  DEFAULT_COGNITION_POLICY,
  type AttributeDefinition,
  type DeclarationDraft,
  type Transition,
  type WorldState,
} from '@open-legend/domain';
import { AuthoringRequestError, type AuthoringKind } from './world-authoring-contracts.js';
import { normalizeInventionProposal } from './invention-service.js';
import { scopedInventionErrors } from './invention-context.js';
import { fingerprint } from './relationship-index.js';
import { commandInputSchema } from './world-service.js';
import type { WorldService } from './world-service.js';

export interface AuthoringDraft {
  id: string;
  revision: number;
  kind: AuthoringKind;
  intent: string;
  payload: unknown;
  digest: string;
  actorId: string;
  policyRevision: number;
  base: {
    manifest?: string;
    actionRules?: string;
    attributeTarget?: ReturnType<typeof attributeBindingTarget>;
    policy?: string;
    materials?: Record<string, string>;
    recipe?: { recipeId: string; version: number; digest: string };
  };
}
const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
export function decodeAuthoringPayload(kind: AuthoringKind, text: string): unknown {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    throw new AuthoringRequestError('Supply a valid JSON object payload.');
  }
  if (!v || typeof v !== 'object' || Array.isArray(v))
    throw new AuthoringRequestError('Supply an object payload.');
  return kind === 'recipe' ? normalizeInventionProposal(v) : v;
}
export function draftBase(
  world: WorldState,
  kind: AuthoringKind,
  payload: unknown,
  inherited?: AuthoringDraft['base'],
  baseRecipeId?: string,
): AuthoringDraft['base'] {
  // Revision updates keep the original base. An obsolete base requires an explicit new draft.
  if (inherited && kind !== 'recipe') {
    if (kind === 'attribute-bindings') {
      const target = attributeBindingTarget(world, payload);
      // Explicitly changing the target makes a new reviewed revision; it is not a silent rebase.
      if (target.entityId !== inherited.attributeTarget?.entityId)
        return { ...inherited, attributeTarget: target };
    }
    return inherited;
  }
  if (kind === 'recipe') {
    const p = object(payload),
      inputs = Array.isArray(p.inputs) ? p.inputs : [];
    const materialIds = new Set(
      inputs.map((i) => object(i).definitionId).filter((v): v is string => typeof v === 'string'),
    );
    const resource = object(object(p.output).gatheringTool).resourceId;
    if (typeof resource === 'string') materialIds.add(resource);
    baseRecipeId = inherited?.recipe?.recipeId ?? baseRecipeId;
    const recipe = baseRecipeId ? world.recipes[baseRecipeId] : undefined;
    if (baseRecipeId && !recipe) throw new AuthoringRequestError('The base recipe is unavailable.');
    return {
      // Removed inputs no longer invalidate this revision; retained inputs keep their pins.
      // docs/invention-validation.md
      materials: Object.fromEntries(
        [...materialIds].map((id) => [
          id,
          (inherited?.materials && Object.hasOwn(inherited.materials, id)
            ? inherited.materials[id]
            : undefined) ?? fingerprint(world.itemDefinitions[id] ?? null),
        ]),
      ),
      ...(recipe
        ? {
            recipe: inherited?.recipe ?? {
              recipeId: recipe.id,
              version: recipe.version,
              digest: recipe.digest,
            },
          }
        : {}),
    };
  }
  return {
    ...(kind === 'attribute-bindings'
      ? { attributeTarget: attributeBindingTarget(world, payload) }
      : {}),
    ...(kind === 'action' ? { actionRules: actionRules(world) } : {}),
    manifest: fingerprint(world.moduleManifest),
    ...(kind === 'status-effect-policy' ? { policy: fingerprint(world.statusEffectPolicy) } : {}),
    ...(kind === 'cognition-policy'
      ? { policy: fingerprint(world.cognitionPolicy ?? DEFAULT_COGNITION_POLICY) }
      : {}),
  };
}
// Conservative definition-only fence until each native command exposes finer dependency summaries.
function actionRules(world: WorldState) {
  return fingerprint([
    world.recipes,
    world.itemDefinitions,
    world.statusEffectPolicy,
    world.cognitionPolicy,
  ]);
}
export function currentDraftBase(world: WorldState, d: AuthoringDraft): boolean {
  if (
    d.kind === 'attribute-bindings' &&
    fingerprint(d.base.attributeTarget ?? null) !==
      fingerprint(attributeBindingTarget(world, d.payload))
  )
    return false;
  if (d.base.actionRules && d.base.actionRules !== actionRules(world)) return false;
  if (d.base.manifest && d.base.manifest !== fingerprint(world.moduleManifest)) return false;
  if (d.kind === 'status-effect-policy' && d.base.policy !== fingerprint(world.statusEffectPolicy))
    return false;
  if (
    d.kind === 'cognition-policy' &&
    d.base.policy !== fingerprint(world.cognitionPolicy ?? DEFAULT_COGNITION_POLICY)
  )
    return false;
  if (
    d.base.materials &&
    Object.entries(d.base.materials).some(
      ([id, hash]) => fingerprint(world.itemDefinitions[id] ?? null) !== hash,
    )
  )
    return false;
  const r = d.base.recipe;
  return (
    !r ||
    (!!world.recipes[r.recipeId] &&
      world.recipes[r.recipeId]!.version === r.version &&
      world.recipes[r.recipeId]!.digest === r.digest)
  );
}
function reject(world: WorldState, code: string, message: string): Transition {
  return { world, events: [], outcome: { ok: false, code, message } };
}
/** The adapters call existing validators/mutations. No new effects interpreter or registry.
 * docs/world-agent-runtime.md#durable-write-sessions
 */
export function authoringTransition(
  service: WorldService,
  world: WorldState,
  d: AuthoringDraft,
  receiptId: string,
): Transition {
  if (!currentDraftBase(world, d))
    return reject(
      world,
      'stale-base',
      'A referenced definition changed. Create a new draft against the current base.',
    );
  if (d.kind === 'action') {
    const parsed = commandInputSchema.safeParse(d.payload);
    if (!parsed.success)
      return reject(world, 'invalid-action', 'Use an installed native command and its schema.');
    return service.reviewedCommandTransition(world, receiptId, parsed.data, d.actorId);
  }
  if (d.kind === 'attribute-bindings') return bindAuthoringAttributes(world, d.payload, receiptId);
  const permission = inventionPermission(world, {
    origin: 'player',
    policyRevision: d.policyRevision,
  });
  if (!permission.ok) return { world, events: [], outcome: permission };
  try {
    switch (d.kind) {
      case 'recipe': {
        // World-level investigation does not teach the controlled inventor unavailable materials.
        const errors = scopedInventionErrors(service, d.actorId, d.payload);
        if (errors.length) return reject(world, 'invalid-declaration', errors.join(' '));
        return admitDeclaration(world, d.payload as DeclarationDraft, {
          requestId: receiptId,
          actorId: d.actorId,
          source: 'supplied-proposal',
          authority: { origin: 'player', policyRevision: d.policyRevision },
          ...(d.base.recipe ? { derivedFrom: d.base.recipe } : {}),
        });
      }
      case 'attribute': {
        const p = object(d.payload);
        if (
          Object.keys(p).some((k) => !['definition', 'removeId'].includes(k)) ||
          (p.removeId !== undefined && typeof p.removeId !== 'string')
        )
          return reject(
            world,
            'invalid-attribute',
            'Use definition or removeId, without caller-supplied authority/revision fields.',
          );
        return admitAttributeDeclaration(world, {
          id: receiptId,
          expectedManifestRevision: world.moduleManifest.revision,
          ...(p.definition !== undefined
            ? { definition: p.definition as AttributeDefinition }
            : {}),
          ...(typeof p.removeId === 'string' ? { removeId: p.removeId } : {}),
        });
      }
      case 'status-effect-policy': {
        const t = admitStatusEffectPolicy(world, d.payload, world.statusEffectPolicy.revision);
        if (
          t.outcome.ok &&
          !t.world.statusEffectPolicy.definitions.some(
            (v) =>
              v.id === (world.cognitionPolicy ?? DEFAULT_COGNITION_POLICY).dream.statusEffectId,
          )
        )
          return reject(
            world,
            'cognition-dependency',
            'The current dream policy requires an effect this revision removes. Revise that dependency first.',
          );
        return t;
      }
      case 'cognition-policy':
        return admitCognitionPolicy(
          world,
          d.payload,
          (world.cognitionPolicy ?? DEFAULT_COGNITION_POLICY).revision,
        );
    }
  } catch {
    return reject(
      world,
      'invalid-candidate',
      'The candidate does not satisfy its native definition contract. Inspect a valid definition and revise.',
    );
  }
}
export function validateAuthoring(service: WorldService, d: AuthoringDraft) {
  const world = service.world;
  const action = d.kind === 'action' ? commandInputSchema.safeParse(d.payload) : undefined;
  // Preview and Apply share base/control fences. A structurally valid action on an
  // obsolete base must not be presented as ready for human approval.
  const t = !currentDraftBase(world, d)
    ? reject(
        world,
        'stale-base',
        'A referenced definition changed. Create a new draft against the current base.',
      )
    : d.kind === 'action'
      ? {
          outcome:
            d.actorId !== service.controlledEntityId
              ? { ok: false, code: 'stale-controller', message: 'The controlled actor changed.' }
              : action?.success
                ? service.previewCommand(action.data, d.actorId)
                : {
                    ok: false,
                    code: 'invalid-action',
                    message: 'Payload does not match a native command.',
                  },
        }
      : authoringTransition(
          service,
          d.kind === 'recipe' ? { ...world, paused: false } : world,
          d,
          `preview-${d.id}-${d.revision}`,
        );
  // Validate recipe structure while paused, without relaxing actual admission or the actor checks.
  const structural = d.kind === 'recipe' ? validateDeclaration(service.world, d.payload) : [];
  return {
    ...t.outcome,
    activationRequiresResume: d.kind === 'recipe' || d.kind === 'action',
    structuralErrors: structural,
    coverage:
      'Current native family and authority checks only; not a complete emergent-interaction proof.',
    semantics:
      d.kind === 'action'
        ? 'Execute this exact native command as the controlled actor. Admission may start ongoing work, not complete it. Physical consequences depend on current conditions.'
        : d.kind === 'recipe'
          ? 'Install a known technique for this inventor; no item is spawned and existing recipes are unchanged.'
          : d.kind === 'status-effect-policy'
            ? 'Replace this supported policy; changed active effect instances are ended under the old rules.'
            : d.kind === 'attribute'
              ? 'Create/remove an unused custom attribute, or make only revisions permitted by the existing native adapter. No automatic attachment to actors.'
              : d.kind === 'attribute-bindings'
                ? attributeBindingSummary(world, d.payload)
                : 'Change the existing cognition policy; controller and real spending limits remain authoritative.',
  };
}
/** Approval covers affected effect episodes, not merely an earlier object count. Clock drift is irrelevant. */
export function authoringImpact(world: WorldState, d: AuthoringDraft) {
  if (d.kind === 'attribute-bindings') return attributeBindingImpact(world, d.payload);
  if (d.kind !== 'status-effect-policy') return { token: 'none', affected: 0 };
  const proposed = object(d.payload).definitions;
  const definitions = new Map(
    (Array.isArray(proposed) ? proposed : []).map((value) => [object(value).id, value]),
  );
  const changed = new Set(
    world.statusEffectPolicy.definitions
      .filter((old) => fingerprint(old) !== fingerprint(definitions.get(old.id) ?? null))
      .map((v) => v.id),
  );
  const affected: string[][] = [];
  for (const e of Object.values(world.entities))
    for (const [id, s] of Object.entries(e.statusEffects ?? {}))
      if (changed.has(id)) affected.push([e.id, id, s.episode, String(s.active)]);
  return { token: fingerprint(affected), affected: affected.length };
}
