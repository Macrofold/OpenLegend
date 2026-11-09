/** Fixture-only reference provenance. Normal gameplay never constructs this owner.
 * docs/performance/hierarchical-profiling.md#overhead-qualification-and-stop-rules */
import { canonicalJson } from '@open-legend/domain';
import type { ExperienceEntry } from '@open-legend/domain';
import type {
  EvidenceSource,
  ObservationContribution,
  ObserverLife,
} from '../../packages/domain/src/perception-evidence.js';
import type { ObserverSubject } from '../../packages/domain/src/knowledge.js';
import {
  evidenceSourceHandle,
  permittedSourceHandle,
  receivedSubjectHandle,
  subjectHandle,
} from '../../apps/server/src/entity-references.js';
import { facetValueForModel } from '../../apps/server/src/experience-context.js';
import { temporalHistoryForModel } from '../../apps/server/src/situation-context.js';
import type { prepareDecision } from '../../apps/server/src/decision-context.js';
import { digest } from './profiling-plan.js';

type Prepared = Awaited<ReturnType<typeof prepareDecision>>;
type RecordValue = Record<string, unknown>;
interface Proof {
  capture: number;
  role: string;
  value: unknown;
}
interface Reference {
  identity: unknown;
  proofs: Proof[];
}
export interface ReferenceWitness {
  capture(prepared: Prepared): Promise<void>;
  canonicalize(value: unknown): unknown;
  snapshot(): unknown;
}
const record = (value: unknown): RecordValue | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as RecordValue) : undefined;
function observer(value: unknown): value is ObserverLife {
  const data = record(value);
  return !!data && typeof data.actorId === 'string' && Number.isSafeInteger(data.physicalLife);
}
function evidence(value: RecordValue): value is RecordValue & EvidenceSource {
  return (
    [
      'awareness',
      'memory',
      'action-result',
      'private-condition',
      'native-exposure',
      'native-response',
    ].includes(String(value.family)) &&
    typeof value.id === 'string' &&
    (typeof value.revision === 'number' || typeof value.revision === 'string') &&
    observer(value.observer)
  );
}
function subject(value: RecordValue): value is RecordValue & ObserverSubject {
  return (
    (value.kind === 'entity' && typeof value.entityId === 'string') ||
    (value.kind === 'individual' && typeof value.individualId === 'string')
  );
}
function observation(value: RecordValue): value is RecordValue & ObservationContribution {
  const origin = record(value.origin);
  return (
    typeof value.id === 'string' &&
    typeof value.revision === 'number' &&
    observer(value.observer) &&
    Array.isArray(value.facets) &&
    !!origin &&
    ['exposure', 'occurrence'].includes(String(origin.kind))
  );
}
function visit(value: unknown, accept: (value: RecordValue) => void): void {
  if (Array.isArray(value)) {
    for (const child of value) visit(child, accept);
  } else {
    const data = record(value);
    if (!data) return;
    accept(data);
    for (const child of Object.values(data)) visit(child, accept);
  }
}
function strings(value: unknown): Set<string> {
  const found = new Set<string>();
  const add = (value: unknown): void => {
    if (typeof value === 'string') found.add(value);
    else if (Array.isArray(value)) value.forEach(add);
    else {
      const data = record(value);
      if (data) Object.values(data).forEach(add);
    }
  };
  add(value);
  return found;
}
const copy = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

/** The registry contains only actual typed binding keys or values reproduced by
 * their semantic owner. An unknown token remains literal and fails equivalence.
 * Proofs participate in comparison markers; preserving an artifact alone would
 * not establish that an identically displayed token still names the same fact. */
export function createReferenceWitness(
  resolveEntries: (prepared: Prepared) => Promise<ExperienceEntry[]>,
): ReferenceWitness {
  const references = new Map<string, Reference>();
  const identities = new Map<string, string>();
  const episodes = new Map<string, Map<string, unknown>>();
  const episodeGroups = new Map<string, string[]>();
  const encodedTracks = new Set<string>();
  let worldId: string | undefined;
  let captures = 0;
  let failure: { capture: number; reason: string } | undefined;

  const bind = (token: string, identity: unknown, role: string, value: unknown): void => {
    const key = canonicalJson(identity),
      previous = references.get(token);
    if (previous && canonicalJson(previous.identity) !== key)
      throw Error(
        `Profiler reference changed native binding: ${role}; previous=${canonicalJson(previous.identity).slice(0, 384)}; next=${key.slice(0, 384)}.`,
      );
    // A source without a body lease can receive a fresh presentation token at
    // the next publication. Bijection belongs to one prepared request; the
    // retained token/proof history separately preserves cross-request equality.
    const captureKey = canonicalJson([captures, identity]);
    const other = identities.get(captureKey);
    if (other && other !== token)
      throw Error(
        `Profiler native binding has two tokens: ${role}; identity=${key.slice(0, 384)}.`,
      );
    identities.set(captureKey, token);
    const entry = previous ?? { identity: copy(identity), proofs: [] };
    const proof = { capture: captures, role, value: copy(value) };
    if (!entry.proofs.some((prior) => canonicalJson(prior) === canonicalJson(proof)))
      entry.proofs.push(proof);
    references.set(token, entry);
  };
  const known = (token: string, fallback: unknown, role: string, value: unknown): void =>
    bind(token, references.get(token)?.identity ?? fallback, role, value);

  // This format is produced by perceptionEpisodeId. Only that identity's
  // publication prefix is variable; game-time onset, source, observer/life and
  // distinct episodes at the same instant remain explicit comparison inputs.
  const exposure = (id: string, life: ObserverLife, sourceId?: string): void => {
    const first = id.indexOf(':'),
      second = id.indexOf(':', first + 1);
    if (first < 1 || second <= first + 1) return;
    const publication = Number(id.slice(0, first)),
      at = Number(id.slice(first + 1, second));
    const source = id.slice(second + 1);
    if (
      !Number.isSafeInteger(publication) ||
      publication < 0 ||
      !Number.isFinite(at) ||
      at < 0 ||
      !source
    )
      return;
    if (sourceId !== undefined && source !== sourceId)
      throw Error('Profiler exposure source differs from its body binding.');
    const group = canonicalJson([worldId, life, source, at]);
    const members = episodeGroups.get(group) ?? [];
    if (!members.includes(id)) members.push(id);
    episodeGroups.set(group, members);
    const contexts = episodes.get(id) ?? new Map<string, unknown>();
    contexts.set(group, {
      worldId,
      observer: life,
      sourceId: source,
      onset: at,
      ordinal: members.indexOf(id),
    });
    episodes.set(id, contexts);
  };
  const discoverEpisodes = (value: unknown): void =>
    visit(value, (data) => {
      if (observation(data) && data.origin.kind === 'exposure')
        exposure(data.origin.episodeId, data.observer);
      if (
        observer(data.observer) &&
        typeof data.track === 'string' &&
        typeof data.episodeId === 'string'
      )
        exposure(data.episodeId, data.observer);
    });

  const capturePrepared = (prepared: Prepared, entries: ExperienceEntry[]): void => {
    const scene = prepared.situation,
      scope = scene.presentation,
      actorId = prepared.binding.actorId;
    if (worldId !== undefined && worldId !== scope.id)
      throw Error('Profiler reference witness cannot join different worlds.');
    worldId = scope.id;
    captures++;
    const native = [
      scene.cut,
      scene.history,
      Object.values(scene.allCurrentReferences),
      Object.values(scene.observationReferences),
      Object.values(scene.receiptDetails),
      Object.values(prepared.binding.identityReferences ?? {}),
      Object.values(prepared.binding.knowledgeReferences ?? {}),
      entries,
    ];
    discoverEpisodes(native);
    for (const [id, body] of scene.bodyBindings)
      if (body.episode) exposure(body.episode, scene.cut.observer, id);

    const factory = (identity: unknown[], token: string, value: unknown): void =>
      bind(token, [scope.id, actorId, ...identity], 'source-owner', value);
    const sourceIds = new Map<string, string>();
    visit(native, (data) => {
      if (evidence(data)) {
        sourceIds.set(evidenceSourceHandle(scope, actorId, data), data.id);
        factory(['evidence', data], evidenceSourceHandle(scope, actorId, data), data);
      }
      if (subject(data)) factory(['subject', data], subjectHandle(scope, actorId, data), data);
      if (
        observer(data.observer) &&
        typeof data.track === 'string' &&
        typeof data.episodeId === 'string'
      ) {
        encodedTracks.add(data.track);
        factory(
          ['received-subject', data.track],
          receivedSubjectHandle(scope, actorId, data.track),
          data,
        );
      }
      if (observation(data)) {
        const source: EvidenceSource = {
          family: 'native-exposure',
          observer: data.observer,
          id: data.id,
          revision: data.revision,
        };
        sourceIds.set(evidenceSourceHandle(scope, actorId, source), data.id);
        factory(['evidence', source], evidenceSourceHandle(scope, actorId, source), data);
        for (const facet of data.facets) {
          // Ask the same renderer, then witness only exact owner outputs that it
          // actually emitted. Prose/definition strings are never guessed as IDs.
          const rendered = strings(
            facetValueForModel(scope, actorId, facet.value, data.id, scene.frame),
          );
          for (const id of strings(facet.value)) {
            const identity = ['historical-participant', data.id, id];
            const handle = permittedSourceHandle(scope, actorId, identity);
            if (rendered.has(handle)) factory(identity, handle, { source: data.id, id });
          }
        }
      }
    });
    const history = temporalHistoryForModel(scope, actorId, scene.history, scene.frame);
    for (const [index, entry] of scene.history.entries.entries()) {
      const { receipt, values } = entry;
      const receivedBy = { actorId, physicalLife: receipt.physicalLife };
      for (const track of [receipt.subject, ...(receipt.contextSubjects ?? [])]) {
        encodedTracks.add(track);
        factory(['received-subject', track], receivedSubjectHandle(scope, actorId, track), {
          track,
          observer: receivedBy,
        });
      }
      // Temporal facts use the receipt tuple, not the original occurrence ID,
      // as their historical participant namespace. Ask the same renderer.
      const sourceScope = [receipt.epoch, receipt.batchOrder, receipt.entryIndex];
      const rendered = strings(history.entries[index]);
      for (const id of strings(values)) {
        const identity = ['historical-participant', sourceScope, id];
        const handle = permittedSourceHandle(scope, actorId, identity);
        if (rendered.has(handle))
          factory(identity, handle, { sourceScope, observer: receivedBy, id });
      }
    }

    const entities = [
      prepared.entityReferences,
      prepared.visibleEntityReferences,
      prepared.intentionReferences,
      prepared.binding.physicalEntityReferences ?? {},
      Object.fromEntries(scene.references),
    ];
    for (const [index, values] of entities.entries())
      for (const [handle, id] of Object.entries(values))
        bind(
          handle,
          [
            scope.id,
            actorId,
            'entity',
            id,
            prepared.binding.entityLeases?.[id] ?? scene.bodyBindings.get(id)?.leaseId ?? null,
          ],
          `entity-map-${index}`,
          {
            id,
            lease:
              prepared.binding.entityLeases?.[id] ?? scene.bodyBindings.get(id)?.leaseId ?? null,
          },
        );
    for (const [id, body] of scene.bodyBindings)
      known(body.handle, [scope.id, actorId, 'entity', id, body.leaseId], 'body', { id, ...body });
    for (const [role, values] of [
      ['identity', prepared.binding.identityReferences ?? {}],
      ['knowledge', prepared.binding.knowledgeReferences ?? {}],
      ['attention', scene.allAttentionReferences],
      ['subject-track', Object.fromEntries(scene.subjectReferences)],
      ['region', Object.fromEntries(scene.regions)],
    ] as const)
      for (const [handle, value] of Object.entries(values)) {
        if ((role === 'attention' || role === 'subject-track') && typeof value === 'string')
          encodedTracks.add(value);
        known(
          handle,
          [
            scope.id,
            actorId,
            role,
            ...(role === 'region' ? [prepared.binding.decisionId] : []),
            value,
          ],
          role,
          value,
        );
      }
    for (const [handle, facet] of Object.entries(scene.allCurrentReferences)) {
      const identity = ['current-fact', facet.original.source.id, facet.original.ordinal];
      if (permittedSourceHandle(scope, actorId, identity) !== handle)
        throw Error('Profiler current fact does not match its source-owner handle.');
      factory(identity, handle, facet);
    }
    for (const [handle, locator] of Object.entries(scene.retentionReferences)) {
      const identity = [
        'receipt',
        locator.physicalLife,
        locator.epoch,
        locator.batchOrder,
        locator.entryIndex,
      ];
      if (permittedSourceHandle(scope, actorId, identity) !== handle)
        throw Error('Profiler receipt does not match its source-owner handle.');
      factory(identity, handle, { locator, detail: scene.receiptDetails[handle] });
    }
    for (const [handle, value] of Object.entries(scene.observationReferences))
      known(
        handle,
        [scope.id, actorId, 'observation', value.observer, value.id, value.revision],
        'observation',
        value,
      );
    const participantIds = strings(native);
    for (const values of entities) Object.values(values).forEach((id) => participantIds.add(id));
    for (const [key, shared] of prepared.sharedExperiences) {
      const source: unknown = JSON.parse(key);
      if (
        !Array.isArray(source) ||
        source.length !== 2 ||
        typeof source[1] !== 'string' ||
        source[0] !== shared.experience.source
      )
        throw Error('Profiler personal account lacks its exact native source key.');
      const id = source[1],
        identity = ['experience', id];
      if (permittedSourceHandle(scope, actorId, identity) !== shared.experience.value.id)
        throw Error('Profiler personal account does not match its source-owner handle.');
      factory(identity, shared.experience.value.id, {
        key,
        revision: shared.revision,
        index: shared.index,
      });
      // Declaration handles such as "trigger" and "source:awareness:..." are
      // already stable. They are not opaque tokens and never replace prose.
      const observed = shared.experience.value.observation;
      const sourceScope = observed ? sourceIds.get(observed.source) : id;
      if (sourceScope === undefined)
        throw Error(
          `Profiler personal account lacks its native observation binding: key=${key}; source=${observed?.source}.`,
        );
      const rendered = strings(shared.experience.value);
      for (const participantId of participantIds) {
        const participant = ['historical-participant', sourceScope, participantId];
        const handle = permittedSourceHandle(scope, actorId, participant);
        if (rendered.has(handle))
          factory(participant, handle, {
            key,
            revision: shared.revision,
            sourceScope,
            participantId,
          });
      }
    }
  };

  const transform = (
    value: unknown,
    tokens: ReadonlyMap<string, string>,
    episodeTokens: ReadonlyMap<string, string>,
  ): unknown => {
    const escaped = [...tokens.keys()]
      .sort((a, b) => b.length - a.length)
      .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    // This matches the finite proven registry, never a hash-shaped value.
    const pattern = escaped.length ? new RegExp(escaped.join('|'), 'g') : undefined;
    const replace = (text: string) =>
      pattern ? text.replace(pattern, (token) => tokens.get(token)!) : text;
    const track = (value: unknown): unknown => {
      if (typeof value === 'string') {
        if (episodeTokens.has(value)) return episodeTokens.get(value);
        if (encodedTracks.has(value)) {
          try {
            return JSON.stringify(track(JSON.parse(value)));
          } catch {
            return value;
          } // A plain source-owned track has no embedded tuple.
        }
        return value;
      }
      return Array.isArray(value) ? value.map(track) : value;
    };
    const walk = (value: unknown, field?: string): unknown => {
      if (typeof value === 'string')
        return replace(encodedTracks.has(value) ? String(track(value)) : value);
      if (Array.isArray(value)) return value.map((child) => walk(child));
      const data = record(value);
      if (!data) return value;
      return Object.fromEntries(
        Object.entries(data).map(([key, child]) => {
          const episodeField =
            (key === 'episodeId' && (data.kind === 'exposure' || observer(data.observer))) ||
            (key === 'episode' &&
              typeof data.handle === 'string' &&
              typeof data.leaseId === 'string') ||
            field === 'entityEpisodes';
          return [
            replace(key),
            episodeField && typeof child === 'string' && episodeTokens.has(child)
              ? episodeTokens.get(child)
              : walk(child, key),
          ];
        }),
      );
    };
    return walk(value);
  };
  const canonicalize = (value: unknown): unknown => {
    if (failure)
      throw Error(
        `Profiler reference witness failed at capture ${failure.capture}: ${failure.reason}`,
      );
    if (!captures) throw Error('Profiler reference comparison has no preparation witness.');
    discoverEpisodes(value);
    const episodeTokens = new Map(
      [...episodes].map(([id, contexts]) => [
        id,
        `exposure:${digest([...contexts.values()].sort((a, b) => canonicalJson(a).localeCompare(canonicalJson(b))))}`,
      ]),
    );
    const base = new Map(
      [...references].map(([token, entry]) => [
        token,
        `reference:${digest(transform(entry.identity, new Map(), episodeTokens))}`,
      ]),
    );
    const tokens = new Map(
      [...references].map(([token, entry]) => [
        token,
        `reference:${digest({ identity: transform(entry.identity, base, episodeTokens), proofs: transform(entry.proofs, base, episodeTokens) })}`,
      ]),
    );
    if (new Set(tokens.values()).size !== tokens.size)
      throw Error('Profiler canonical references collapse distinct owner bindings.');
    return transform(value, tokens, episodeTokens);
  };
  return {
    capture: async (prepared) => {
      if (failure) return;
      const capture = captures + 1;
      try {
        capturePrepared(prepared, await resolveEntries(prepared));
      } catch (error) {
        failure = {
          capture,
          reason: error instanceof Error ? error.message : 'Unknown reference witness failure.',
        };
      }
    },
    canonicalize,
    snapshot: () => ({
      worldId,
      captures,
      failure,
      references: [...references].map(([token, value]) => ({ token, ...value })),
      exposures: [...episodes].map(([id, contexts]) => ({ id, contexts: [...contexts.values()] })),
    }),
  };
}
