import {
  BASE_OPENING_PROFILE,
  baseOpeningEditorFields,
  buildBaseInitialWorld,
  checkBaseOpeningReadiness,
  freezeWorld,
  supportedPosition,
  spatialMap,
  validateBaseOpeningCandidate,
  type BaseInitialWorldCandidate,
  type BaseInitialWorldPreparation,
  type WorldState,
} from '@open-legend/domain';
import type {
  WorldAgentDraftEditorView,
  WorldAgentPreparation,
  WorldAgentRequirement,
  WorldAgentValidation,
  WorldCreationPreview,
} from '@open-legend/protocol';
import type { RequestScope } from './authority.js';
import type { AuthoringDraft } from './world-authoring-kinds.js';
import type { WorldService } from './world-service.js';
import { fingerprint } from './relationship-index.js';
import { validateCurrentWorldState } from './upgrade-world.js';
import { countMetric } from './performance.js';
import { prepareCandidateNavigation } from './navigation/preparation.js';

export const OPENING_CHECKER_VERSION = 'initial-opening-native-1';
export interface PreparedOpening {
  key: string;
  candidate: BaseInitialWorldCandidate;
  preparation: BaseInitialWorldPreparation;
  readiness: ReturnType<typeof checkBaseOpeningReadiness>;
  pending?: Promise<void>;
}
// Only the last complete preparation is retained by each service. It is owned data,
// never a source-world draft or a second writable claim about a running world.
// docs/projects/parallel-batch-07-playable-world-creation-tech-design.md#performance-and-growth
const prepared = new WeakMap<WorldService, PreparedOpening>();

export function inspectOpening(
  service: WorldService,
  payload: unknown,
  scope: RequestScope,
  settled?: PreparedOpening,
) {
  service.assertScope(scope, 'create');
  service.assertScope(scope, 'inspect');
  validateBaseOpeningCandidate(payload);
  const key = fingerprint([payload, scope.accountId]);
  // An admitted operation can retain its exact immutable preparation across storage
  // waits even if another creator replaces the service's single recent cache entry.
  // This is owned native evidence, never a persisted assertion of readiness.
  let result = settled?.key === key ? settled : prepared.get(service);
  if (result?.key !== key) {
    // The profile's fresh preparation receives only authenticated account meaning.
    // No source-world people, inventory, knowledge or history enter this builder.
    const candidate = structuredClone(payload);
    const preparation = buildBaseInitialWorld(candidate, {
      creatorAccountIds: [scope.accountId],
      playerAccountId: scope.accountId,
    });
    validateCurrentWorldState(preparation.world);
    const readiness = checkBaseOpeningReadiness(candidate, preparation.world);
    freezeWorld(preparation.world);
    result = { key, candidate, preparation, readiness };
    prepared.set(service, result);
  }
  return result;
}

// One recent physical batch can serve repeated checks and wording-only edits. Its
// key covers native geometry, body, endpoints and policy; no private actor history.
// Incomplete native work is evicted so an explicit check can retry it honestly.
let recentRoutes: { key: string; value: ReturnType<typeof prepareCandidateNavigation> } | undefined;

export async function prepareOpeningReadiness(
  candidate: BaseInitialWorldCandidate,
  world: WorldState,
) {
  const initial = checkBaseOpeningReadiness(candidate, world);
  if (!initial.navigation.length) return initial;
  const map = spatialMap(world);
  const key = fingerprint([map, initial.navigation]);
  let batch = recentRoutes;
  if (batch?.key === key) countMetric('creation.navigation.reused');
  else {
    countMetric('creation.navigation.prepared');
    batch = { key, value: prepareCandidateNavigation(map, initial.navigation) };
    recentRoutes = batch;
  }
  let routes: Awaited<typeof batch.value>;
  try {
    routes = await batch.value;
  } catch (error) {
    if (recentRoutes === batch) recentRoutes = undefined;
    throw error;
  }
  if (
    [...routes.values()].some(
      (route) => route.status === 'unavailable' || route.status === 'budget-exceeded',
    ) &&
    recentRoutes === batch
  )
    recentRoutes = undefined;
  return checkBaseOpeningReadiness(candidate, world, routes);
}

export async function settleOpeningReadiness(
  service: WorldService,
  payload: unknown,
  scope: RequestScope,
) {
  const result = inspectOpening(service, payload, scope);
  if (
    result.readiness.findings.some((finding) => finding.status === 'incomplete') &&
    !result.pending
  )
    result.readiness = checkBaseOpeningReadiness(result.candidate, result.preparation.world);
  if (result.readiness.navigation.length) {
    result.pending ??= prepareOpeningReadiness(result.candidate, result.preparation.world)
      .then((readiness) => {
        result.readiness = readiness;
      })
      .finally(() => {
        delete result.pending;
      });
    await result.pending;
  }
  service.assertScope(scope, 'create');
  service.assertScope(scope, 'inspect');
  return result;
}

export function openingValidation(
  service: WorldService,
  payload: unknown,
  scope: RequestScope,
  settled?: PreparedOpening,
): WorldAgentValidation {
  let error: string | undefined;
  let incomplete = false;
  try {
    const { readiness } = inspectOpening(service, payload, scope, settled);
    const blocked = readiness.findings.find((finding) => finding.status === 'blocked');
    const pending = readiness.findings.find((finding) => finding.status === 'incomplete');
    incomplete = !blocked && !!pending;
    error = blocked?.message ?? pending?.message;
  } catch (failure) {
    error = failure instanceof Error ? failure.message : 'The opening could not be prepared.';
  }
  return {
    ok: !error,
    code: incomplete ? 'opening-pending' : error ? 'invalid-opening' : 'opening-valid',
    message: error ?? 'The supported fresh opening satisfies current native model validation.',
    coverage:
      'Selected supported initial-world profile; destination permission and required activity readiness are checked separately.',
    semantics:
      'Prepare a new paused world with explicit starting circumstances. This never changes the source world or grants character control.',
    activationRequiresResume: false,
    structuralErrors: error && !incomplete ? [error] : [],
  };
}

export function openingPreview(
  service: WorldService,
  payload: unknown,
  scope: RequestScope,
  settled?: PreparedOpening,
): WorldCreationPreview {
  service.assertScope(scope, 'create');
  service.assertScope(scope, 'inspect');
  validateBaseOpeningCandidate(payload);
  const candidate = payload;
  let native: PreparedOpening;
  try {
    native = inspectOpening(service, payload, scope, settled);
  } catch (error) {
    const activity = BASE_OPENING_PROFILE.openings.find(
      (opening) => opening.id === candidate.opening,
    )!;
    // These are declared starting circumstances, never a successfully prepared world.
    // Keep invalid geometry visible so the creator can repair the exact retained idea.
    return {
      worldId: candidate.worldId,
      title: candidate.title,
      activity: activity.activity,
      payoff: activity.payoff,
      harsh: candidate.harsh,
      entries: [
        candidate.player,
        ...(candidate.resident ? [candidate.resident] : []),
        ...candidate.scene,
      ].map((entry) => ({
        id: entry.id,
        label: entry.name,
        kind: 'initialGoals' in entry ? 'person' : entry.kind,
        position: entry.position,
        description: 'description' in entry ? entry.description : '',
      })),
      findings: [
        {
          id: 'native-preparation',
          status: 'failed',
          message: `Declared layout only; native preparation failed: ${error instanceof Error ? error.message : 'the opening is unusable.'}`,
        },
      ],
    };
  }
  const { preparation, readiness } = native;
  const activity = BASE_OPENING_PROFILE.openings.find(
    (opening) => opening.id === candidate.opening,
  );
  if (!activity) throw new Error('The selected opening profile is unavailable.');
  return {
    worldId: candidate.worldId,
    title: candidate.title,
    activity: activity.activity,
    payoff: activity.payoff,
    harsh: candidate.harsh,
    entries: Object.values(preparation.world.entities).flatMap((entity) => {
      if (entity.placement?.mode !== 'world') return [];
      const position = supportedPosition(entity);
      if (!position) throw new Error('A starting object has no native world position.');
      return [
        {
          id: entity.id,
          label: entity.name,
          kind: entity.kind,
          position: { x: position.x, y: position.y, z: position.z },
          description: entity.description ?? '',
          ...(entity.resource ? { quantity: entity.resource.quantity } : {}),
        },
      ];
    }),
    findings: readiness.findings.map((finding) => ({
      id: finding.id,
      status:
        finding.status === 'ready' ? 'passed' : finding.status === 'blocked' ? 'failed' : 'pending',
      message: finding.message,
    })),
  };
}

export function openingEditor(
  service: WorldService,
  payload: unknown,
  scope: RequestScope,
): WorldAgentDraftEditorView {
  service.assertScope(scope, 'create');
  service.assertScope(scope, 'inspect');
  validateBaseOpeningCandidate(payload);
  const candidate = payload;
  return {
    family: { ...candidate.profile },
    fields: baseOpeningEditorFields(candidate),
    facts: [
      { id: 'people', label: 'People initially present', value: candidate.resident ? 2 : 1 },
      { id: 'stock', label: 'Explicit initial stock lots', value: candidate.stock.length },
      {
        id: 'world',
        label: 'Publication',
        value: 'Fresh paused world; no existing world is replaced.',
      },
    ],
  };
}

export function prepareOpeningAuthoring(
  service: WorldService,
  draft: AuthoringDraft,
  scope: RequestScope,
  generation: string,
  requirements: WorldAgentRequirement[],
  settled?: PreparedOpening,
) {
  const validation = openingValidation(service, draft.payload, scope, settled);
  const unsupported = requirements.some((requirement) => requirement.status === 'unsupported');
  const candidate = { kind: 'authoring-draft', id: draft.id, version: draft.digest };
  const impact = { token: fingerprint([draft.digest, OPENING_CHECKER_VERSION]), affected: 0 };
  const preparation: WorldAgentPreparation = {
    version: 1,
    candidateDigest: draft.digest,
    graph: {
      snapshot: fingerprint([candidate, OPENING_CHECKER_VERSION]),
      candidate,
      nodes: [{ ref: candidate, label: draft.intent, layer: 'proposed', canInspect: true }],
      edges: [],
      unresolved: validation.structuralErrors.map((message) => ({ field: 'opening', message })),
      coverage: {
        projection: 'complete',
        scope: 'World-owned initial opening only; no source-world private records.',
        broaderInteractions: 'not-evaluated',
      },
      work: { examined: 1, records: 1 },
    },
    requirements,
    checks: [
      {
        id: 'initial-world-model',
        validatorVersion: OPENING_CHECKER_VERSION,
        requires: [],
        status: validation.ok ? 'passed' : 'failed',
        finding: validation.message,
      },
    ],
    coverage:
      validation.code === 'opening-pending'
        ? 'pending'
        : validation.ok && !unsupported
          ? 'complete-for-native-admission'
          : 'blocked',
    presentation: {
      status: 'existing-fallback-adequate',
      description:
        'The exact native starting layout and readable list are available for creator inspection; no rehearsal history or generated art is installed.',
      optionalArt: 'not-requested',
    },
    evidence: {
      version: OPENING_CHECKER_VERSION,
      dependencies: fingerprint([
        draft.digest,
        OPENING_CHECKER_VERSION,
        scope.accountId,
        scope.grantRevision,
      ]),
      generation,
    },
    next: unsupported
      ? 'blocked'
      : validation.code === 'opening-pending'
        ? 'pending_analysis'
        : validation.ok
          ? 'ready_for_review'
          : 'needs_revision',
  };
  return { validation, preparation, impact };
}
