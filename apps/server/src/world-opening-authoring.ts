import {
  selectedCreationProfileForCandidate,
  freezeWorld,
  spatialMap,
  type WorldCreationCandidate,
  type InitialWorldPreparation,
  type OpeningReadiness,
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
  candidate: WorldCreationCandidate;
  preparation: InitialWorldPreparation;
  readiness: OpeningReadiness;
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
  const { profile, candidate: validated } = selectedCreationProfileForCandidate(payload);
  const key = fingerprint([payload, scope.accountId]);
  // An admitted operation can retain its exact immutable preparation across storage
  // waits even if another creator replaces the service's single recent cache entry.
  // This is owned native evidence, never a persisted assertion of readiness.
  let result = settled?.key === key ? settled : prepared.get(service);
  if (result?.key !== key) {
    // The profile's fresh preparation receives only authenticated account meaning.
    // No source-world people, inventory, knowledge or history enter this builder.
    const candidate = structuredClone(validated);
    const preparation = profile.build(candidate, {
      creatorAccountIds: [scope.accountId],
      playerAccountId: scope.accountId,
    });
    validateCurrentWorldState(preparation.world);
    const readiness = profile.readiness(candidate, preparation.world);
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
  candidate: WorldCreationCandidate,
  world: WorldState,
) {
  const { profile } = selectedCreationProfileForCandidate(candidate);
  const initial = profile.readiness(candidate, world);
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
  return profile.readiness(candidate, world, routes);
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
    result.readiness = selectedCreationProfileForCandidate(result.candidate).profile.readiness(
      result.candidate,
      result.preparation.world,
    );
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
  const { profile, candidate } = selectedCreationProfileForCandidate(payload);
  try {
    const native = inspectOpening(service, payload, scope, settled);
    return profile.preview(candidate, native.preparation.world, native.readiness);
  } catch (error) {
    return profile.preview(
      candidate,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'the opening is unusable.',
    );
  }
}

export function openingEditor(
  service: WorldService,
  payload: unknown,
  scope: RequestScope,
): WorldAgentDraftEditorView {
  service.assertScope(scope, 'create');
  service.assertScope(scope, 'inspect');
  const { profile, candidate } = selectedCreationProfileForCandidate(payload);
  return profile.editor(candidate);
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
