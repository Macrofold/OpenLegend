import { DEFAULT_COGNITION_POLICY, type WorldState } from '@open-legend/domain';
import type {
  RelationshipEdge,
  RelationshipKind,
  RelationshipNode,
  RelationshipRef,
  WorldAgentCandidateGraph,
  WorldAgentPreparation,
  WorldAgentRequirement,
} from '@open-legend/protocol';
import { fingerprint, refKey, RelationshipIndex } from './relationship-index.js';
import { readDefinition } from './world-graph.js';
import {
  authoringImpact,
  validateAuthoring,
  type AuthoringDraft,
} from './world-authoring-kinds.js';
import type { RequestScope } from './authority.js';
import type { WorldService } from './world-service.js';
import { statusCapabilitySchema, statusConditionSchema } from './world-authoring-schemas.js';
import { authoringBodyTarget } from './world-authoring-bindings.js';
import { authoringAttributeValue } from './world-authoring-values.js';

export const CONTEXT_WORK = { records: 64, examined: 256, tools: 32, bytes: 64000 } as const;
export const AUTHORING_ANALYSIS_VERSION = 'native-authoring-analysis-v2';
const sourceDigests = new WeakMap<object, string>();
// Durable content hashes survive restart; immutable source identities avoid re-hashing the
// entire definition catalogue on every review. Mutable fixtures are deliberately not cached.
function sourceDigest(source: unknown): string {
  if (!source || typeof source !== 'object' || !Object.isFrozen(source))
    return fingerprint(source ?? null);
  let digest = sourceDigests.get(source);
  if (!digest) {
    digest = fingerprint(source);
    sourceDigests.set(source, digest);
  }
  return digest;
}
export function authoringEvidenceDependencies(
  world: WorldState,
  draft: AuthoringDraft,
  scope: RequestScope,
  impact = authoringImpact(world, draft),
) {
  return fingerprint([
    AUTHORING_ANALYSIS_VERSION,
    draft.base,
    ...[
      world.inventionPolicy,
      world.itemDefinitions,
      world.recipes,
      world.moduleManifest,
      world.statusEffectPolicy,
      world.cognitionPolicy,
    ].map(sourceDigest),
    // Reviews belong to a principal and grant, not a browser connection. Current login
    // and control authority are checked separately at decision/apply time; reconnecting
    // must not invalidate otherwise unchanged evidence. Commands additionally bind control.
    {
      accountId: scope.accountId,
      actorId: scope.actorId,
      worldId: scope.worldId,
      timelineId: scope.timelineId,
      grantRevision: scope.grantRevision,
      audience: scope.audience,
      ...(draft.kind === 'action' ? { controlGeneration: scope.controlGeneration } : {}),
    },
    impact,
  ]);
}
export const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** Source-derived candidate overlay. Missing endpoints are findings, not invented exact nodes.
 * This graph is never submitted by a model or used as a second mutation authority.
 * docs/projects/world-agent-context/initial-foundation.md#4-small-shared-candidate-graph */
export function candidateGraph(
  world: WorldState,
  draft: AuthoringDraft,
  generation: string,
  canReadBody: (id: string) => boolean = () => false,
): WorldAgentCandidateGraph {
  const candidate = { kind: 'authoring-draft', id: draft.id, version: draft.digest };
  const nodes = new Map<string, RelationshipNode>();
  const edges = new Map<string, RelationshipEdge>();
  const unresolved: WorldAgentCandidateGraph['unresolved'] = [];
  let examined = 0;
  let complete = true;
  const missing = (field: string, message: string) => {
    if (unresolved.length < CONTEXT_WORK.records) unresolved.push({ field, message });
    else complete = false;
  };
  const spend = () => {
    if (examined >= CONTEXT_WORK.examined) {
      complete = false;
      return false;
    }
    examined++;
    return true;
  };
  const add = (node: RelationshipNode) => {
    const key = refKey(node.ref);
    if (!nodes.has(key) && nodes.size >= CONTEXT_WORK.records) {
      complete = false;
      return undefined;
    }
    nodes.set(key, node);
    return node.ref;
  };
  add({
    ref: candidate,
    label: `Proposed ${draft.kind}, revision ${draft.revision}`,
    layer: 'proposed',
    canInspect: true,
  });
  const link = (
    source: RelationshipRef,
    target: RelationshipRef | undefined,
    relation: RelationshipKind,
    role?: string,
    quantity?: number,
  ) => {
    if (!target) return;
    if (!spend()) return;
    const fact = {
      source,
      target,
      relation,
      sourceRecord: source,
      assertion: 'compiler-derived' as const,
      ...(role === undefined ? {} : { role }),
      ...(quantity === undefined ? {} : { quantity }),
    };
    edges.set(fingerprint(fact), { id: fingerprint(fact), ...fact });
  };
  const existing = (kind: string, id: unknown, field: string) => {
    if (!spend()) return;
    const found = typeof id === 'string' && readDefinition(world, kind, id);
    if (!found) {
      missing(field, 'Required definition is unavailable in the supported source.');
      return;
    }
    return add(found.node);
  };
  const p = record(draft.payload);
  if (draft.kind === 'recipe') {
    for (const [i, input] of list(p.inputs).entries()) {
      if (!spend()) break;
      const v = record(input);
      link(
        candidate,
        existing('item-definition', v.definitionId, `inputs[${i}].definitionId`),
        'requires',
        typeof v.role === 'string' ? v.role : undefined,
        typeof v.quantity === 'number' ? v.quantity : undefined,
      );
    }
    const output = record(p.output);
    const family =
      output.kind === 'gathering-tool'
        ? 'gathering-tool'
        : output.kind === 'launcher'
          ? record(output.launcher).mechanism
          : output.kind === 'ammunition' && record(output.ammunition).kind === 'arrow'
            ? 'arrow'
            : undefined;
    link(candidate, existing('family', family, 'output'), 'implements');
    if (typeof output.kind === 'string')
      link(
        candidate,
        add({
          ref: {
            kind: 'proposed-item-definition',
            id: `${draft.id}:output`,
            version: fingerprint(output),
          },
          label: typeof output.name === 'string' ? output.name : 'Proposed output',
          layer: 'proposed',
        }),
        'produces',
      );
    if (output.kind === 'gathering-tool')
      link(
        candidate,
        existing(
          'item-definition',
          record(output.gatheringTool).resourceId,
          'output.gatheringTool.resourceId',
        ),
        'uses',
        'finite gathering resource; best carried tool, no stacking',
      );
    if (draft.base.recipe)
      link(
        candidate,
        existing('recipe', draft.base.recipe.recipeId, 'base.recipe'),
        'derives_from',
      );
  } else if (draft.kind === 'status-effect-policy') {
    link(candidate, existing('status-effect-policy', 'current', 'base.policy'), 'derives_from');
    link(
      candidate,
      existing('cognition-policy', 'current', 'cognition-policy'),
      'governed_by',
      'dream eligibility',
    );
    const proposed = new Map<string, RelationshipRef>();
    for (const [i, raw] of list(p.definitions).entries()) {
      if (!spend()) break;
      const d = record(raw);
      if (typeof d.id !== 'string') {
        missing(`definitions[${i}].id`, 'A status definition needs an exact ID.');
        continue;
      }
      const ref = add({
        ref: { kind: 'proposed-status-effect', id: d.id, version: fingerprint(d) },
        label: typeof d.label === 'string' ? d.label : d.id,
        layer: 'proposed',
      });
      if (ref) {
        proposed.set(d.id, ref);
        link(ref, candidate, 'governed_by');
      }
    }
    const dreamId = (world.cognitionPolicy ?? DEFAULT_COGNITION_POLICY).dream.statusEffectId;
    if (!proposed.has(dreamId))
      missing('definitions', 'The cognition policy requires a retained dream status.');
    for (const [i, raw] of list(p.definitions).entries()) {
      if (!spend()) break;
      const d = record(raw),
        source = typeof d.id === 'string' ? proposed.get(d.id) : undefined;
      if (!source) continue;
      const pending: { value: unknown; field: string }[] = [
        'requires',
        'activationCondition',
        'automaticActivation',
        'automaticDeactivation',
      ]
        .filter((k) => d[k] !== undefined)
        .map((k) => ({ value: d[k], field: `definitions[${i}].${k}` }));
      for (const [j, rawOp] of list(d.whileActive).entries()) {
        if (!spend()) break;
        const op = record(rawOp),
          rate = record(op.changeRate),
          restrictions = record(op.restrictCapabilities);
        if (op.changeRate)
          link(
            source,
            existing('attribute', rate.attribute, `definitions[${i}].whileActive[${j}]`),
            'contributes_to',
            `${String(rate.target)}: ${String(rate.amount)} per ${String(rate.per)}`,
          );
        if (op.when)
          pending.push({ value: op.when, field: `definitions[${i}].whileActive[${j}].when` });
        if (op.restrictCapabilities) {
          for (const capability of list(restrictions.capabilities)) {
            if (!spend()) break;
            if (!statusCapabilitySchema.safeParse(capability).success) {
              missing(`definitions[${i}].whileActive[${j}]`, 'Unsupported native capability.');
              continue;
            }
            if (typeof capability !== 'string') continue;
            const ref = add({
              ref: {
                kind: 'native-capability',
                id: capability,
                version: AUTHORING_ANALYSIS_VERSION,
              },
              label: `Subject capability: ${capability}`,
              layer: 'definition',
              availability: 'reference-only',
            });
            link(source, ref, 'contributes_to', 'restriction while this status is active');
          }
        }
      }
      for (let n = 0; n < pending.length; n++) {
        if (!spend()) break;
        const { value, field } = pending[n]!;
        const condition = record(value);
        if (condition.all || condition.any) {
          for (const [j, child] of list(condition.all ?? condition.any).entries()) {
            if (pending.length >= CONTEXT_WORK.examined) {
              complete = false;
              break;
            }
            pending.push({ value: child, field: `${field}[${j}]` });
          }
        } else if (condition.compare) {
          const c = record(condition.compare);
          link(source, existing('attribute', c.attribute, field), 'reads', String(c.target));
        } else if (condition.statusActive) {
          const c = record(condition.statusActive);
          const target =
            typeof c.definitionId === 'string' ? proposed.get(c.definitionId) : undefined;
          if (!target)
            missing(field, 'A required status is missing from the proposed whole policy.');
          // These are state reads across simulation steps, not recursive invocation edges.
          link(source, target, 'reads', `${String(c.target)} active=${String(c.value)}`);
        } else if (condition.field || condition.dailyWindow) {
          if (!statusConditionSchema.safeParse(condition).success) {
            missing(field, 'Unsupported native state predicate.');
            continue;
          }
          const c = record(condition.field ?? condition.dailyWindow);
          const key = condition.field ? String(c.name) : 'localTime';
          link(
            source,
            add({
              ref: { kind: 'native-state-field', id: key, version: AUTHORING_ANALYSIS_VERSION },
              label: condition.field ? `Native body field: ${key}` : 'World local-time clock',
              layer: 'definition',
              availability: 'reference-only',
            }),
            'reads',
            String(c.target),
          );
        }
      }
    }
  } else {
    // Other existing kind adapters still own validation. Their graph coverage is deliberately
    // finite and does not assert complete live-body, command or unknown-host dependencies.
    let body: RelationshipRef | undefined;
    if (draft.kind === 'attribute-bindings' || draft.kind === 'attribute-values') {
      // A body binding and a value snapshot have different freshness owners. Do not
      // bind attachment review to changing energy/charge or project private bodies.
      // docs/invention-graph.md#candidate-preparation-projection
      if (
        typeof p.entityId !== 'string' ||
        !canReadBody(p.entityId) ||
        !Object.hasOwn(world.entities, p.entityId) ||
        !world.entities[p.entityId]?.actor
      ) {
        missing('entityId', 'Required body is unavailable in the permitted scope.');
      } else {
        body = add({
          ref: {
            kind: 'authoring-body-target',
            id: p.entityId,
            version: authoringBodyTarget(world, p.entityId).digest,
          },
          label: `Body: ${world.entities[p.entityId]!.name}`,
          layer: 'live',
          availability: 'reference-only',
        });
        link(
          candidate,
          body,
          'contributes_to',
          draft.kind === 'attribute-bindings'
            ? 'attribute attachment'
            : 'creator value intervention',
        );
      }
    }
    if (draft.kind === 'cognition-policy') {
      link(candidate, existing('cognition-policy', 'current', 'base.policy'), 'derives_from');
      link(
        candidate,
        existing('status-effect', record(p.dream).statusEffectId, 'dream.statusEffectId'),
        'requires',
      );
    } else if (draft.kind === 'attribute-bindings') {
      for (const id of list(p.attributeIds)) {
        if (!spend()) break;
        link(candidate, existing('attribute', id, 'attributeIds'), 'requires');
      }
    } else if (draft.kind === 'attribute-values') {
      for (const change of list(p.changes)) {
        if (!spend()) break;
        const c = record(change);
        const definition = existing('attribute', c.attributeId, 'changes.attributeId');
        link(candidate, definition, 'requires');
        if (!body || typeof c.attributeId !== 'string') continue;
        const value = authoringAttributeValue(world, body.id, c.attributeId);
        if (!value) {
          missing(
            'changes.attributeId',
            'Required attribute is not attached to the selected body.',
          );
          continue;
        }
        const current = add({
          ref: {
            kind: 'authoring-attribute-value',
            id: JSON.stringify([body.id, c.attributeId]),
            version: fingerprint([body.version, value]),
          },
          label: `Current ${c.attributeId} on selected body`,
          layer: 'live',
          availability: 'reference-only',
        });
        link(candidate, current, 'reads', 'current value and revision');
        if (current) link(current, definition, 'defined_by');
      }
    } else if (draft.kind === 'attribute') {
      if (p.removeId) link(candidate, existing('attribute', p.removeId, 'removeId'), 'uses');
      if (p.definition)
        link(
          candidate,
          existing('host', record(p.definition).implementation, 'definition.implementation'),
          'implements',
        );
    }
  }
  const selectedNodes = [...nodes.values()],
    selectedEdges = [...edges.values()];
  const index = new RelationshipIndex(
    JSON.stringify([world.id, generation, draft.id, draft.digest]),
    selectedNodes,
    selectedEdges,
    ['Selected native references only; not a complete emergent-interaction proof.'],
  );
  if (!complete)
    missing(
      'coverage',
      'Native analysis slice exhausted; required coverage is incomplete. No review is ready.',
    );
  return {
    snapshot: index.snapshot,
    candidate,
    nodes: selectedNodes,
    edges: selectedEdges,
    unresolved,
    coverage: {
      projection: complete ? 'complete' : 'incomplete',
      scope: `Selected ${draft.kind} native references`,
      broaderInteractions: 'not-evaluated',
    },
    work: { examined, records: nodes.size },
  };
}

export function prepareAuthoring(
  service: WorldService,
  world: WorldState,
  draft: AuthoringDraft,
  scope: RequestScope,
  generation: string,
  requirements: WorldAgentRequirement[],
) {
  const validation = validateAuthoring(service, draft, scope, world);
  const graph = candidateGraph(world, draft, generation, (id) =>
    service.mayInspectPrivate(id, scope),
  );
  const impact = authoringImpact(world, draft);
  const pending = graph.coverage.projection === 'incomplete';
  const missing = graph.unresolved.length > 0;
  const unsupported = requirements.some((r) => r.status === 'unsupported');
  const hasRepresentation =
    draft.kind !== 'recipe' ||
    graph.edges.some((edge) => edge.relation === 'implements' && edge.target.kind === 'family');
  const presentation: WorldAgentPreparation['presentation'] = {
    status:
      draft.kind === 'recipe'
        ? hasRepresentation
          ? 'existing-fallback-adequate'
          : 'required-representation-missing'
        : 'no-new-asset',
    description:
      draft.kind === 'recipe'
        ? hasRepresentation
          ? 'Supported native inventory/tool representation with the exact output name and description. No generated artwork or spawned item.'
          : 'No supported native representation was resolved for this output. Required presentation is incomplete.'
        : 'No new asset is required by this existing native adapter. Native status pose/particle fields retain their own validation.',
    optionalArt: 'not-requested',
  };
  const checks: WorldAgentPreparation['checks'] = [
    {
      id: 'native-admission',
      validatorVersion: AUTHORING_ANALYSIS_VERSION,
      requires: [],
      status: validation.ok ? 'passed' : 'failed',
      finding: validation.message,
    },
    {
      id: 'required-references',
      validatorVersion: AUTHORING_ANALYSIS_VERSION,
      requires: [],
      status: pending ? 'pending' : missing ? 'failed' : 'passed',
      finding: pending
        ? 'Required analysis exceeded the bounded slice.'
        : missing
          ? 'Resolve the retained dependency findings.'
          : graph.coverage.scope,
    },
    {
      id: 'presentation',
      validatorVersion: AUTHORING_ANALYSIS_VERSION,
      requires: ['native-admission'],
      status: presentation.status === 'required-representation-missing' ? 'pending' : 'passed',
      finding: presentation.description,
    },
  ];
  const preparation: WorldAgentPreparation = {
    version: 1,
    candidateDigest: draft.digest,
    graph,
    requirements,
    checks,
    presentation,
    coverage: pending
      ? 'pending'
      : validation.ok && !missing && !unsupported && hasRepresentation
        ? 'complete-for-native-admission'
        : 'blocked',
    evidence: {
      version: AUTHORING_ANALYSIS_VERSION,
      generation,
      dependencies: authoringEvidenceDependencies(world, draft, scope, impact),
    },
    next: pending
      ? 'pending_analysis'
      : unsupported || !hasRepresentation
        ? 'blocked'
        : validation.ok && !missing
          ? 'ready_for_review'
          : 'needs_revision',
  };
  return { preparation, validation, impact };
}
