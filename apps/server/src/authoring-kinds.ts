import { z } from 'zod';
import {
  admitAttributeDeclaration,
  validateDeclaration,
  strikeDefinition,
  type AttributeDeclarationRequest,
  type DeclarationDraft,
  type DeclarationProvenance,
} from '@open-legend/domain';
import type { ApiResult, AuthoringKind } from '@open-legend/protocol';
import { normalizeInventionProposal } from './invention-service.js';
import { commandInputSchema, type WorldService } from './world-service.js';
import type { AuthoringSession, AuthoringDraft, AuthoringPlan } from './authoring-records.js';
import { digest } from './content-digest.js';

const attributeInput = z
  .object({
    definition: z.record(z.string(), z.unknown()).optional(),
    removeId: z.string().min(1).max(120).optional(),
  })
  .strict()
  .refine((v) => !!v.definition !== !!v.removeId, 'Supply exactly one definition or removeId.');
export const AUTHORING_KINDS = ['recipe', 'attribute', 'action'] as const;

export function parseAuthoringCandidate(kind: AuthoringKind, json: string): unknown {
  const candidate: unknown = JSON.parse(json);
  if (kind === 'action') return parseAuthoringAction(candidate);
  if (kind === 'attribute') return attributeInput.parse(candidate);
  // Retain invalid recipe drafts and native findings instead of silently rewriting meaning.
  return normalizeInventionProposal(candidate);
}
export function authoringDependencies(service: WorldService, draft: AuthoringDraft): string {
  if (draft.kind === 'recipe') {
    const candidate = draft.candidate as Partial<DeclarationDraft> | null;
    const refs = Array.isArray(candidate?.inputs)
      ? candidate.inputs.map((v) => v?.definitionId).filter((v) => typeof v === 'string')
      : [];
    const target = candidate?.output?.gatheringTool?.resourceId;
    return digest({
      materials: refs.map((id) => service.world.itemDefinitions[id] ?? null),
      target: target ? (service.world.itemDefinitions[target] ?? null) : null,
      base: draft.base ? (service.world.recipes[draft.base.id] ?? null) : null,
    });
  }
  if (draft.kind === 'action') {
    const input = parseAuthoringAction(draft.candidate);
    return digest({
      manifest: service.world.moduleManifest,
      recipe: input.recipeId ? (service.world.recipes[input.recipeId] ?? null) : null,
      // These definitions are owned separately from the attribute/sense manifest.
      strike:
        input.type === 'strike' && input.definitionId
          ? (strikeDefinition(input.definitionId) ?? null)
          : null,
      effect:
        input.type === 'status-effect' && input.definitionId
          ? (service.world.statusEffectPolicy.definitions.find(
              (d) => d.id === input.definitionId,
            ) ?? null)
          : null,
    });
  }
  return digest(service.world.moduleManifest);
}
export function authoringProvenance(
  service: WorldService,
  session: AuthoringSession,
  draft: AuthoringDraft,
  requestId: string,
): DeclarationProvenance {
  const base = draft.base ? service.world.recipes[draft.base.id] : undefined;
  if (draft.base && (!base || String(base.version) !== draft.base.version))
    throw new Error('The selected recipe base is unavailable at that version.');
  return {
    requestId,
    source: 'supplied-proposal',
    ...(session.mode === 'creator'
      ? { creatorAccountId: session.accountId }
      : { actorId: session.actorId! }),
    authority: { origin: 'player', policyRevision: service.world.inventionPolicy.revision },
    ...(base
      ? { derivedFrom: { recipeId: base.id, version: base.version, digest: base.digest } }
      : {}),
  };
}
export function previewAuthoring(
  service: WorldService,
  session: AuthoringSession,
  draft: AuthoringDraft,
): ApiResult {
  if (draft.kind === 'recipe') {
    const errors = validateDeclaration(service.world, draft.candidate);
    try {
      authoringProvenance(service, session, draft, 'authoring-preview');
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Invalid base.');
    }
    return {
      ok: !errors.length,
      code: errors.length ? 'invalid-declaration' : 'native-valid',
      message:
        errors.join(' ') ||
        'Finite recipe checks passed. Not an installation or complete interaction proof.',
    };
  }
  if (draft.kind === 'action')
    return service.previewCommand(
      parseAuthoringAction(draft.candidate),
      session.actorId ?? service.controlledEntityId,
    );
  if (session.mode !== 'creator')
    return {
      ok: false,
      code: 'forbidden',
      message: 'Attribute authoring requires creator authority.',
    };
  const request = attributeInput.parse(draft.candidate) as Omit<
    AttributeDeclarationRequest,
    'id' | 'expectedManifestRevision'
  >;
  return admitAttributeDeclaration(service.world, {
    ...request,
    id: `preview-${digest(draft).slice(0, 32)}`,
    expectedManifestRevision: service.world.moduleManifest!.revision,
  }).outcome;
}
export async function applyAuthoring(
  service: WorldService,
  session: AuthoringSession,
  plan: AuthoringPlan,
  checkCurrent: () => void,
): Promise<ApiResult> {
  const id = `authoring-${plan.id}`;
  if (plan.kind === 'recipe') {
    const draft: AuthoringDraft = {
      id: plan.draftId,
      sessionId: session.id,
      revision: plan.draftRevision,
      kind: plan.kind,
      intent: plan.intent,
      candidate: plan.candidate,
      ...(plan.base ? { base: plan.base } : {}),
    };
    // The exact base is part of the immutable change plan, not reconstructed from chat.
    const provenance = authoringProvenance(service, session, draft, id);
    return service.admit(plan.candidate as DeclarationDraft, provenance, checkCurrent);
  }
  if (plan.kind === 'action')
    return service.command(
      id,
      parseAuthoringAction(plan.candidate),
      plan.actorId,
      plan.commandEpoch,
      checkCurrent,
    );
  return service.godAttributeDeclaration(
    {
      ...attributeInput.parse(plan.candidate),
      id,
      expectedManifestRevision: plan.manifestRevision,
    } as AttributeDeclarationRequest,
    service.generation,
    checkCurrent,
  );
}

/** Do not silently ignore an agent's meaningful modifier just because the public input is flat.
 * Native family argument extraction remains in WorldService; this projection is explicit v1.
 */
const actionFields: Record<z.infer<typeof commandInputSchema>['type'], string[]> = {
  move: ['position'],
  pickup: ['targetId', 'itemId'],
  drop: ['itemId', 'quantity'],
  gather: ['targetId'],
  harvest: ['targetId'],
  prepare: ['preparation'],
  craft: ['recipeId'],
  equip: ['itemId'],
  eat: ['itemId'],
  cook: ['itemId', 'targetId'],
  hunt: ['targetId', 'itemId', 'ammunitionId'],
  strike: ['targetId', 'definitionId'],
  replenish: ['targetId', 'attributeId'],
  teach: ['targetId', 'recipeId'],
  'status-effect': ['targetId', 'definitionId', 'effectOperation'],
  conversation: ['conversationId', 'generation', 'operation'],
  cancel: [],
  recover: [],
};
export function parseAuthoringAction(candidate: unknown) {
  const parsed = commandInputSchema.parse(candidate);
  const allowed = actionFields[parsed.type];
  if (Object.keys(parsed).some((k) => k !== 'type' && !allowed.includes(k)))
    throw new Error(
      'This command does not support the supplied modifier. Inspect the action schema.',
    );
  if (parsed.type === 'cook' && !parsed.targetId)
    throw new Error('Choose the actual heat source; authoring never selects a hidden fire.');
  return parsed;
}
export function authoringActionSchema() {
  return {
    commandSchema: z.toJSONSchema(commandInputSchema),
    fieldsByType: actionFields,
    limitations:
      'Only the listed fields are supported for each type. Cook requires targetId. Native admission still checks required arguments, knowledge, resources and current conditions.',
  };
}
