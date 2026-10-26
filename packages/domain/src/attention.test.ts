import { describe, expect, it } from 'vitest';
import { createWorld, NPC_ID, PLAYER_ID } from './worlds/base/world.js';
import { entityGet, entitySet } from './entity-collection.js';
import {
  acquireObservation,
  observationFactKey,
  perceptionEvidenceOwner,
  type LiveFacetSupport,
  type SensoryFacet,
} from './perception-evidence.js';
import {
  acknowledgeAttention,
  applyAttentionRelationEvaluations,
  attentionRelationOpportunity,
  captureAttentionPresentation,
  currentAttentionCues,
  currentDetailedAttention,
  markAttentionRelationsDirty,
  updateAttention,
  validateAttentionState,
  revokeAttentionEvidence,
} from './attention.js';
import {
  creditSubjectFamiliarity,
  individualFamiliarity,
  perceiveVoice,
  revokeRecognitionEvidence,
  validateFamiliarityState,
  validateRecognition,
  associateIndividualFamiliarity,
} from './worlds/base/recognition.js';
import type { ObserverIdentity } from './worlds/base/knowledge.js';
import type { WorldState } from './types.js';
import { commitActorResponse } from './response.js';
import { semanticCauseResolved } from './semantic-opportunities.js';
import { ensureExperienceAccounting } from './remembered-impressions.js';
import {
  commitObserverIdentity,
  pruneObserverIndividuals,
  retainedIndividualEvidenceKeys,
} from './worlds/base/knowledge.js';
import { createReservoirDemo } from './world-presets.js';
import { executeCommand } from './kernel.js';

function scene(count: number, capacity = 10) {
  const world = createWorld();
  const observer = entityGet(world.entities, PLAYER_ID)!;
  observer.actor!.attentionCapacity = capacity;
  const owner = perceptionEvidenceOwner(world, observer);
  owner.current = {};
  owner.attention = undefined;
  const prototype = entityGet(world.entities, NPC_ID)!;
  const ids: string[] = [];
  for (let index = 0; index < count; index++) {
    const id = `fixture-person-${index}`;
    ids.push(id);
    const source = structuredClone(prototype);
    source.id = id;
    source.name = `Private identity ${index}`;
    entitySet(world.entities, id, source);
    const position = { x: index + 1, y: 0, z: 2 };
    const facets: SensoryFacet[] = [
      {
        kind: 'body',
        body: {
          kind: 'npc',
          position,
          heading: 0,
          appearance: 'person',
          radius: 0.3,
          height: 1.8,
          supportSurfaceId: null,
          outward: ['', '', '', ''],
          label: { name: 'person' },
        },
      },
      {
        kind: 'location',
        location: { kind: 'point', point: position, errorRadius: 0 },
        frame: { positionAtObservation: { x: 0, y: 0, z: 0 } },
      },
    ];
    const original = acquireObservation(world, observer, {
      origin: {
        kind: 'exposure',
        episodeId: `fixture-exposure-${index}`,
        detectorId: 'fixture-sight',
        measuredFrom: 0,
        measuredThrough: 0,
      },
      modality: 'sight',
      detector: { id: 'fixture-sight', version: 1 },
      facets: facets.map((value) => ({
        value,
        role: 'direct',
        asOf: 0,
        measuredFrom: 0,
        measuredThrough: 0,
      })),
    });
    const individualId = `fixture-local-${index}`;
    ((world.observerIdentities ??= {})[PLAYER_ID] ??= {})[individualId] = {
      individualId,
      givenName: '',
      revision: 1,
      encounterId: original.id,
      authored: false,
    };
    for (const [ordinal, value] of facets.entries()) {
      const lease: LiveFacetSupport = {
        id: `fixture-lease-${index}-${ordinal}`,
        revision: 1,
        observer: original.observer,
        subjectId: id,
        subjectPhysicalLife: source.actor!.physicalLife ?? 0,
        exposure: { observer: original.observer, episodeId: original.id },
        original,
        originalOrdinal: ordinal,
        modality: 'sight',
        value,
        valueMeasuredFrom: 0,
        valueMeasuredThrough: 0,
        valueAcquiredAt: 0,
        confirmedFrom: 0,
        confirmedThrough: 0,
        ...(value.kind === 'body'
          ? { localSubject: { kind: 'individual', individualId } as const }
          : {}),
      };
      owner.current[`${id}:${value.kind}`] = lease;
    }
  }
  updateAttention(world, PLAYER_ID);
  return { world, owner, ids };
}

describe('received detailed attention', () => {
  it('resolves only the actually accepted native condition generation and withdraws corrected proof', () => {
    let { world, owner } = scene(2, 2);
    const anchor = currentDetailedAttention(world, PLAYER_ID)[0]!,
      lease = owner.current[`${anchor.sourceId}:body`]!;
    applyAttentionRelationEvaluations(world, PLAYER_ID, [
      {
        anchorKey: anchor.key,
        family: 'closing-body',
        revision: 'received',
        complete: true,
        clearSupported: false,
        witnesses: [
          {
            id: 'other-current-body',
            distanceLower: 1,
            distanceUpper: 1.1,
            decreaseLower: 1,
            proof: [observationFactKey(lease.original, lease.originalOrdinal)],
          },
        ],
      },
    ]);
    const cue = currentAttentionCues(world, PLAYER_ID)[0]!,
      key = JSON.stringify([cue.anchorKey, cue.family]),
      qualitativeRevision = anchor.descriptionRevision;
    const result = commitActorResponse(
      world,
      'fixture-cue-choice',
      PLAYER_ID,
      { operations: [] },
      {},
      [PLAYER_ID],
      0,
      [],
      undefined,
      [],
      {},
      undefined,
      {},
      {},
      {
        privacyRevision: 0,
        attentionReferences: {},
        retentionReferences: {},
        semanticCauses: [{ key, qualitativeRevision, severity: 8, generation: cue.generation }],
      },
    );
    expect(result.outcome.ok).toBe(true);
    world = result.world;
    expect(semanticCauseResolved(world, PLAYER_ID, key, qualitativeRevision, 8)).toBe(true);
    // Correction withdraws the source-supported condition, rather than recording
    // an invented negative observation or retaining a free-standing alarm.
    const draft = structuredClone(world);
    revokeAttentionEvidence(draft, PLAYER_ID, new Set([lease.original.id]));
    expect(currentAttentionCues(draft, PLAYER_ID)).toHaveLength(0);
  });
  it('bounds detail without hiding the other current sources or learning private identities', () => {
    const { world, owner } = scene(15);
    expect(currentDetailedAttention(world, PLAYER_ID)).toHaveLength(10);
    expect(
      Object.values(owner.current).filter((lease) => lease.value.kind === 'body'),
    ).toHaveLength(15);
    expect(
      currentDetailedAttention(world, PLAYER_ID).every(
        (entry) => entry.subject?.kind === 'individual',
      ),
    ).toBe(true);
    expect(JSON.stringify(owner.attention)).not.toContain('Private identity');
    expect(
      Object.values(world.observerIdentities![PLAYER_ID]!)
        .filter((identity) => identity.individualId?.startsWith('fixture-local-'))
        .every((identity) => !identity.canonicalId),
    ).toBe(true);
    validateAttentionState(owner.attention);
  });

  it('lends unused ongoing slots and fairly rotates unconsidered discovery', () => {
    const { world, owner } = scene(18, 3);
    const encountered = new Set<string>();
    for (let cycle = 0; cycle < 18; cycle++) {
      for (const entry of currentDetailedAttention(world, PLAYER_ID))
        encountered.add(entry.sourceId);
      const presentation = captureAttentionPresentation(world, PLAYER_ID);
      acknowledgeAttention(world, PLAYER_ID, presentation);
      world.simTime += 120;
      updateAttention(world, PLAYER_ID, { changedSourceIds: [] });
    }
    expect(encountered.size).toBe(18);
    expect(owner.attention!.entries).toHaveLength(3);
    validateAttentionState(owner.attention);
  });

  it('keeps a stable current choice but allows a strong actual cue to interrupt it', () => {
    const { world, ids } = scene(4, 2);
    const before = currentDetailedAttention(world, PLAYER_ID).map((entry) => entry.sourceId);
    const challenger = ids.find((id) => !before.includes(id))!;
    updateAttention(world, PLAYER_ID, {
      changedSourceIds: [challenger],
      urgency: { [challenger]: 5 },
    });
    expect(currentDetailedAttention(world, PLAYER_ID).map((entry) => entry.sourceId)).toEqual(
      before,
    );
    updateAttention(world, PLAYER_ID, {
      changedSourceIds: [challenger],
      urgency: { [challenger]: 10 },
    });
    expect(
      currentDetailedAttention(world, PLAYER_ID).some((entry) => entry.sourceId === challenger),
    ).toBe(true);
  });

  it('acknowledges only the exact provided revision and retains newer received motion', () => {
    const { world, owner, ids } = scene(2, 2);
    const provided = captureAttentionPresentation(world, PLAYER_ID);
    const id = ids[0]!,
      location = owner.current[`${id}:location`]!;
    world.simTime = 120;
    if (location.value.kind !== 'location' || location.value.location.kind !== 'point')
      throw new Error('fixture location');
    location.value = {
      ...location.value,
      location: { ...location.value.location, point: { x: 10, y: 0, z: 2 } },
    };
    location.valueMeasuredThrough = 120;
    location.valueAcquiredAt = 120;
    updateAttention(world, PLAYER_ID, { changedSourceIds: [id] });
    acknowledgeAttention(world, PLAYER_ID, provided);
    const candidate = Object.values(owner.attention!.candidates).find(
      (entry) => entry.sourceId === id,
    )!;
    expect(candidate.presentedChange).not.toBe(candidate.changeRevision);
    expect(candidate.score).toBeGreaterThanOrEqual(4);
    expect(candidate.anchor!.point.x).toBe(1);
  });

  it('keeps stationary-anchor conditions latched through partial evidence and rotation', () => {
    const { world, owner } = scene(2, 2);
    const anchor = currentDetailedAttention(world, PLAYER_ID)[0]!;
    const lease = owner.current[`${anchor.sourceId}:body`]!;
    const proof = [observationFactKey(lease.original, lease.originalOrdinal)];
    const evaluation = {
      anchorKey: anchor.key,
      family: 'closing-drop' as const,
      revision: 'first',
      complete: true,
      clearSupported: true,
      witnesses: [
        {
          id: 'received-edge',
          distanceLower: 10,
          distanceUpper: 10.25,
          decreaseLower: 0.5,
          dropLower: 2,
          proof,
        },
      ],
    };
    expect(applyAttentionRelationEvaluations(world, PLAYER_ID, [evaluation])).toHaveLength(1);
    expect(applyAttentionRelationEvaluations(world, PLAYER_ID, [evaluation])).toHaveLength(0);
    world.simTime += 120;
    applyAttentionRelationEvaluations(world, PLAYER_ID, [
      { ...evaluation, revision: 'incomplete', complete: false, witnesses: [] },
    ]);
    expect(currentAttentionCues(world, PLAYER_ID)).toHaveLength(1);
    applyAttentionRelationEvaluations(world, PLAYER_ID, [
      {
        ...evaluation,
        revision: 'clear',
        witnesses: evaluation.witnesses.map((value) => ({
          ...value,
          distanceLower: 7,
          distanceUpper: 7,
          decreaseLower: 0,
        })),
      },
    ]);
    world.simTime += 120;
    applyAttentionRelationEvaluations(world, PLAYER_ID, [
      {
        ...evaluation,
        revision: 'clear-confirmed',
        witnesses: evaluation.witnesses.map((value) => ({
          ...value,
          distanceLower: 7,
          distanceUpper: 7,
          decreaseLower: 0,
        })),
      },
    ]);
    expect(currentAttentionCues(world, PLAYER_ID)).toHaveLength(0);
    expect(
      applyAttentionRelationEvaluations(world, PLAYER_ID, [{ ...evaluation, revision: 'again' }]),
    ).toHaveLength(1);
    validateAttentionState(owner.attention);
  });

  it('does not bridge an all-clear interval across a brief loss of its neighbor', () => {
    const { world, owner } = scene(2, 2),
      [anchor, neighbor] = currentDetailedAttention(world, PLAYER_ID);
    const body = owner.current[`${neighbor!.sourceId}:body`]!;
    const location = owner.current[`${neighbor!.sourceId}:location`]!;
    const witness = {
      id: neighbor!.exposure.episodeId,
      distanceLower: 2,
      distanceUpper: 2.25,
      decreaseLower: 0.5,
      proof: [observationFactKey(body.original, body.originalOrdinal)],
    };
    const evaluation = {
      anchorKey: anchor!.key,
      family: 'closing-body' as const,
      revision: 'alarm',
      complete: true,
      clearSupported: true,
      witnesses: [witness],
    };
    applyAttentionRelationEvaluations(world, PLAYER_ID, [evaluation]);
    const clear = {
      ...evaluation,
      revision: 'clear',
      witnesses: [{ ...witness, distanceLower: 8, distanceUpper: 8.25, decreaseLower: 0 }],
    };
    world.simTime = 10;
    applyAttentionRelationEvaluations(world, PLAYER_ID, [clear]);
    world.simTime = 20;
    delete owner.current[`${neighbor!.sourceId}:body`];
    delete owner.current[`${neighbor!.sourceId}:location`];
    updateAttention(world, PLAYER_ID, { changedSourceIds: [neighbor!.sourceId] });
    world.simTime = 30;
    owner.current[`${neighbor!.sourceId}:body`] = { ...body, id: `${body.id}-returned` };
    owner.current[`${neighbor!.sourceId}:location`] = location;
    updateAttention(world, PLAYER_ID, { changedSourceIds: [neighbor!.sourceId] });
    applyAttentionRelationEvaluations(world, PLAYER_ID, [clear]);
    world.simTime = 130;
    applyAttentionRelationEvaluations(world, PLAYER_ID, [clear]);
    expect(currentAttentionCues(world, PLAYER_ID)).toHaveLength(1);
    world.simTime = 150;
    applyAttentionRelationEvaluations(world, PLAYER_ID, [clear]);
    expect(currentAttentionCues(world, PLAYER_ID)).toHaveLength(0);
  });

  it('does no relation work in an unchanged scene after complete checks', () => {
    const { world, owner } = scene(2, 2);
    const opportunity = attentionRelationOpportunity(world, PLAYER_ID)!;
    applyAttentionRelationEvaluations(
      world,
      PLAYER_ID,
      opportunity.anchors.flatMap((anchor) =>
        (['closing-body', 'closing-drop'] as const).map((family) => ({
          anchorKey: anchor.key,
          family,
          revision: 'complete',
          complete: true,
          clearSupported: true,
          witnesses: [],
        })),
      ),
    );
    world.simTime += 60;
    updateAttention(world, PLAYER_ID);
    expect(attentionRelationOpportunity(world, PLAYER_ID)).toBeUndefined();
    markAttentionRelationsDirty(world, PLAYER_ID);
    expect(attentionRelationOpportunity(world, PLAYER_ID)?.anchors).toHaveLength(2);
    delete owner.current[`${opportunity.anchors[0]!.sourceId}:body`];
    updateAttention(world, PLAYER_ID);
    expect(
      Object.values(owner.attention!.latches).some(
        (latch) => latch.anchorKey === opportunity.anchors[0]!.key,
      ),
    ).toBe(false);
  });
});

describe('one evidence-backed subject familiarity score', () => {
  it('does not impose the optional human recognition attribute on another authored world', () => {
    const world = createReservoirDemo(75);
    expect(entityGet(world.entities, NPC_ID)!.actor!.individualRecognition).toBeUndefined();
    expect(
      world.moduleManifest.definitions.some(
        (definition) => definition.id === 'wilderness:perception',
      ),
    ).toBe(false);
    const spoken = executeCommand(world, {
      id: 'clockwork-heard-words',
      actorId: NPC_ID,
      type: 'say',
      text: 'I can hear the machinery.',
    });
    expect(spoken.outcome.ok).toBe(true);
    expect(spoken.events.some((event) => event.type === 'speech')).toBe(true);
  });
  const subject = { kind: 'individual', individualId: 'fixture-acquaintance' } as const;
  function acquaintance(world: WorldState): ObserverIdentity {
    return (((world.observerIdentities ??= {})[PLAYER_ID] ??= {})[subject.individualId] = {
      individualId: subject.individualId,
      givenName: 'A private name',
      encounterId: null,
      authored: false,
      revision: 1,
    });
  }
  function contact(world: WorldState, ordinal: number, at: number) {
    world.simTime = at;
    const sourceKey = `awareness:fixture-contact-${ordinal}`;
    return creditSubjectFamiliarity(world, PLAYER_ID, subject, {
      key: JSON.stringify(['contact', sourceKey, at]),
      sourceKey,
      at,
      order: ordinal,
      support: [sourceKey],
    });
  }
  const currentIdentity = (world: WorldState) =>
    world.observerIdentities![PLAYER_ID]![subject.individualId]!;

  it('does not let an incidental first contact become its own lasting proof owner', () => {
    const world = createWorld();
    const identity = acquaintance(world);
    identity.givenName = '';
    expect(contact(world, 1, 0)).toBe(true);
    expect(retainedIndividualEvidenceKeys(world, PLAYER_ID)).not.toContain(
      'awareness:fixture-contact-1',
    );
    currentIdentity(world).givenName = 'A deliberately remembered person';
    expect(retainedIndividualEvidenceKeys(world, PLAYER_ID)).toContain(
      'awareness:fixture-contact-1',
    );
  });

  it('declines optional learning at the shared retained-knowledge limit and removes unsupported ephemeral locals on loss', () => {
    const world = createWorld();
    acquaintance(world);
    ensureExperienceAccounting(world, PLAYER_ID);
    const account = world.experience!.temporal!.actors[PLAYER_ID]!.accounts!.optional;
    account.count = 2048; // Existing cold retained records share this same allowance.
    expect(contact(world, 1, 0)).toBe(false);
    expect(currentIdentity(world).familiarity).toBeUndefined();
    expect(account.count).toBe(2048);
    expect(
      commitObserverIdentity(world, PLAYER_ID, subject.individualId, {
        ...currentIdentity(world),
        givenName: 'A new retained name',
      }),
    ).toBe(false);
    const local = 'unretained-current-local';
    world.observerIdentities![PLAYER_ID]![local] = {
      individualId: local,
      givenName: '',
      revision: 0,
      encounterId: null,
      authored: false,
    };
    expect(
      pruneObserverIndividuals(world, PLAYER_ID, { releasedSourceIds: [], candidates: [local] }),
    ).toBe(1);
    expect(world.observerIdentities![PLAYER_ID]![local]).toBeUndefined();
  });

  it('credits actual spaced contact across modalities and preserves the mature deadline after forgetting', () => {
    const world = createWorld(),
      identity = acquaintance(world);
    expect(individualFamiliarity(identity)).toBe(0);
    expect(contact(world, 1, 0)).toBe(true);
    expect(contact(world, 2, 0)).toBe(false);
    expect(contact(world, 2, 119)).toBe(false);
    for (let index = 2; index <= 6; index++)
      expect(contact(world, index, (index - 1) * 120)).toBe(true);
    expect(individualFamiliarity(currentIdentity(world))).toBe(6);
    expect(contact(world, 7, 2399)).toBe(false);
    expect(contact(world, 7, 2400)).toBe(true);
    const deadline = currentIdentity(world).familiarity!.nextCreditAt;
    revokeRecognitionEvidence(world, PLAYER_ID, new Set(['fixture-contact-1']));
    expect(individualFamiliarity(currentIdentity(world))).toBe(6);
    expect(currentIdentity(world).familiarity!.nextCreditAt).toBe(deadline);
    expect(currentIdentity(world).familiarity!.fastCredits).toBe(6);
    expect(contact(world, 8, 2519)).toBe(false);
    expect(contact(world, 8, deadline!)).toBe(true);
    validateFamiliarityState(currentIdentity(world).familiarity);
  });

  it('keeps at most120 actual roots, retains minimal protected proof and expires unrelated evidence independently', () => {
    const world = createWorld(),
      identity = acquaintance(world);
    for (let index = 1; index <= 6; index++) contact(world, index, (index - 1) * 120);
    for (const root of currentIdentity(world).familiarity!.roots) root.required = true;
    for (let index = 7; index <= 130; index++) contact(world, index, 600 + (index - 6) * 1800);
    expect(currentIdentity(world).familiarity!.roots).toHaveLength(120);
    expect(individualFamiliarity(currentIdentity(world))).toBe(100);
    expect(
      currentIdentity(world).familiarity!.roots.some(
        (root) => root.sourceKey === 'awareness:fixture-contact-1',
      ),
    ).toBe(true);
    expect(
      currentIdentity(world).familiarity!.roots.some(
        (root) => root.sourceKey === 'awareness:fixture-contact-7',
      ),
    ).toBe(false);
    revokeRecognitionEvidence(world, PLAYER_ID, new Set(['unrelated-place-source']));
    expect(currentIdentity(world).familiarity!.roots).toHaveLength(120);
    const restored = structuredClone(world);
    validateRecognition(restored);
    expect(
      individualFamiliarity(restored.observerIdentities![PLAYER_ID]![subject.individualId]!),
    ).toBe(100);
  });

  it('does not turn familiarity or a name into an acquired sensory profile', () => {
    const world = createWorld(),
      identity = acquaintance(world);
    identity.familiarity = {
      roots: [],
      fastCredits: 0,
      authored: {
        source: JSON.stringify([
          'authored-acquaintance',
          NPC_ID,
          'wilderness:individual-recognition',
          1,
        ]),
        value: 100,
      },
    };
    const result = perceiveVoice(
      world,
      PLAYER_ID,
      {
        id: 'fixture-first-voice',
        at: world.simTime,
        sequence: world.sequence,
        type: 'speech',
        text: 'Hello',
        audience: [PLAYER_ID],
        targetId: PLAYER_ID,
      },
      { a: { min: 100, max: 100 }, b: { min: 300, max: 300 }, c: { min: 500, max: 500 } },
      20,
    );
    expect(result.recognized).toBe(false);
    expect(result.subject).toBeUndefined();
    expect(individualFamiliarity(identity)).toBe(100);
  });
  it('merges actual cross-sense contact without double credit or displacing protected recognition proof', () => {
    const world = createWorld(),
      from = acquaintance(world);
    for (let index = 1; index <= 6; index++) contact(world, index, (index - 1) * 120);
    const local = structuredClone(currentIdentity(world));
    const target: ObserverIdentity = {
      ...structuredClone(local),
      individualId: 'independent-known-voice',
      familiarity: {
        roots: local.familiarity!.roots.map((root, index) => {
          const sourceKey = `awareness:other-contact-${index}`,
            at = root.at + 60;
          return {
            ...root,
            key: JSON.stringify(['contact', sourceKey, at]),
            sourceKey,
            support: [sourceKey],
            at,
            required: true,
          };
        }),
        fastCredits: 6,
        lastCreditAt: 660,
        nextCreditAt: 2460,
      },
    };
    associateIndividualFamiliarity(
      world,
      local,
      target,
      'awareness:actual-visible-body-voice-association',
    );
    expect(individualFamiliarity(target)).toBe(6);
    expect(target.familiarity!.roots.filter((root) => root.required)).toHaveLength(6);
    expect(
      target.familiarity!.roots.filter((root) => root.required).every((root) => root.credited),
    ).toBe(true);
    expect(target.familiarity!.nextCreditAt).toBeGreaterThanOrEqual(2460);
    validateFamiliarityState(target.familiarity);
    expect(from.individualId).toBe(subject.individualId);
  });
});
