import { describe, expect, it, vi } from 'vitest';
import * as worldComposition from './world-composition.js';
import { createWorld, NPC_ID, PLAYER_ID } from './worlds/base/world.js';
import {
  entityDelete,
  entityGet,
  entitySet,
  entityValues,
  emptyEntities,
} from './entity-collection.js';
import {
  acquireObservation,
  observationFactKey,
  perceptionEvidenceOwner,
  currentBodyObservation,
  receivedFacetValue,
  type LiveFacetSupport,
  type SensoryFacet,
} from './perception-evidence.js';
import { retainReceivedValue } from './received-values.js';
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
import { selectedAttentionPolicy } from './world-composition.js';
import { executeCommand, initializePerception, quantityOf } from './kernel.js';
import { worldPlacement } from './spatial-state.js';
import { commitHealthChange } from './living.js';
import { updateWorld } from './draft.js';
import { advanceWithNavigation } from '../../../tests/fixtures/navigation.js';

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
    const received = owner.received.find((value) => value.id === original.id)!;
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
        original: received,
        originalOrdinal: ordinal,
        modality: 'sight',
        value: received.facets[ordinal]!.value,
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
  it('keeps the oldest quiet discovery while ten actual visible deaths supply urgent received evidence, then expires their priority', () => {
    const world = createWorld(131),
      observer = entityGet(world.entities, PLAYER_ID)!,
      prototype = structuredClone(entityGet(world.entities, NPC_ID)!);
    world.entities = emptyEntities();
    observer.actor!.attentionCapacity = 10;
    observer.placement = worldPlacement({ x: 1, y: 0, z: 2 }, null);
    entitySet(world.entities, PLAYER_ID, observer);
    const body = (id: string, x: number) => {
      const person = structuredClone(prototype);
      person.id = id;
      person.name = 'Private identity';
      person.placement = worldPlacement({ x, y: 0, z: 2 }, null);
      person.actor!.capabilities!.memory = false;
      person.actor!.capabilities!.cognition = false;
      entitySet(world.entities, id, person);
      return person;
    };
    const quiet = body('quiet-old-source', 3);
    initializePerception(world, []);
    const sources = Array.from({ length: 10 }, (_, index) =>
      body(`actual-urgent-source-${index}`, 4 + index / 2),
    );
    initializePerception(world, []);
    const events: import('./types.js').WorldEvent[] = [];
    for (const source of sources)
      commitHealthChange(
        world,
        source,
        -source.actor!.health,
        'fixture-native-body-effect',
        events,
      );
    expect(
      sources.every((source) => !source.actor!.alive && source.remains?.phase === 'fresh'),
    ).toBe(true);
    expect(events.filter((event) => event.type === 'death')).toHaveLength(10);
    initializePerception(world, []);
    const state = world.perceptionEvidence![PLAYER_ID]!.attention!;
    expect(
      Object.values(state.candidates).filter((candidate) => candidate.urgency >= 8),
    ).toHaveLength(10);
    expect(currentDetailedAttention(world, PLAYER_ID)).toHaveLength(10);
    expect(
      currentDetailedAttention(world, PLAYER_ID).find((entry) => entry.sourceId === quiet.id)
        ?.basis,
    ).toBe('discovery');
    const cue = Object.values(state.candidates).find(
      (candidate) => candidate.sourceId === sources[0]!.id,
    )!;
    expect(cue.urgencySource).toBeDefined();
    revokeAttentionEvidence(world, PLAYER_ID, new Set([cue.urgencySource!.source.id]));
    expect(
      state.candidates[
        Object.keys(state.candidates).find(
          (key) => state.candidates[key]!.sourceId === sources[0]!.id,
        )!
      ]!.urgency,
    ).toBe(0);
    world.simTime = 120;
    updateAttention(world, PLAYER_ID, { changedSourceIds: [] });
    expect(Object.values(state.candidates).every((candidate) => candidate.urgency === 0)).toBe(
      true,
    );
    expect(JSON.stringify(state)).not.toContain('Private identity');
    validateAttentionState(state, selectedAttentionPolicy(world));
  });
  it('resolves only the actually accepted native condition generation and withdraws corrected proof', () => {
    let { world, owner } = scene(2, 2);
    const anchor = currentDetailedAttention(world, PLAYER_ID)[0]!,
      lease = owner.current[`${anchor.sourceId}:body`]!;
    applyAttentionRelationEvaluations(world, PLAYER_ID, [
      {
        anchorKey: anchor.key,
        family: 'closing-body',
        revision: 'received',
        exhausted: true,
        complete: true,
        clearSupported: false,
        witnesses: [
          {
            id: 'other-current-body',
            distanceLower: 1,
            distanceUpper: 1.1,
            decreaseLower: 1,
            proof: [observationFactKey(world, lease.original, lease.originalOrdinal)],
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
    validateAttentionState(owner.attention, selectedAttentionPolicy(world));
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
    validateAttentionState(owner.attention, selectedAttentionPolicy(world));
  });

  it('uses the installed world score ceiling and ongoing share', () => {
    const { world, owner, ids } = scene(8, 5);
    const policy = {
      ...selectedAttentionPolicy(world),
      maximumScore: 1,
      ongoingShare: 1,
    };
    vi.spyOn(worldComposition, 'selectedAttentionPolicy').mockReturnValue(policy);
    const state = owner.attention!;
    state.explicit = Object.entries(state.candidates)
      .filter(([, candidate]) => ids.slice(4).includes(candidate.sourceId))
      .map(([key]) => key);
    updateAttention(world, PLAYER_ID);
    expect(state.entries.filter((entry) => entry.basis === 'explicit')).toHaveLength(4);
    expect(state.entries.filter((entry) => entry.basis === 'discovery')).toHaveLength(1);
    expect(Object.values(state.candidates).every((candidate) => candidate.score === 1)).toBe(true);
    validateAttentionState(state, policy);
    Object.values(state.candidates)[0]!.score = 2;
    expect(() => validateAttentionState(state, policy)).toThrow('Invalid attention candidate.');
  });

  it('offers older quiet received people before continuing arrivals and acknowledges only supplied descriptions', () => {
    const world = createWorld(131),
      observer = entityGet(world.entities, PLAYER_ID)!,
      prototype = structuredClone(entityGet(world.entities, NPC_ID)!);
    world.entities = emptyEntities();
    observer.actor!.attentionCapacity = 3;
    observer.placement = worldPlacement({ x: 1, y: 0, z: 2 }, null);
    entitySet(world.entities, PLAYER_ID, observer);
    let ordinal = 0;
    const arrive = () => {
      const person = structuredClone(prototype);
      person.id = `quiet-arrival-${ordinal++}`;
      person.name = 'Private unknown identity';
      person.placement = worldPlacement({ x: 3 + ordinal / 20, y: 0, z: 2 }, null);
      person.actor!.capabilities!.memory = false;
      person.actor!.capabilities!.cognition = false;
      entitySet(world.entities, person.id, person);
      return person.id;
    };
    const older = Array.from({ length: 8 }, arrive);
    initializePerception(world, []);
    const owner = world.perceptionEvidence![PLAYER_ID]!;
    const supplied = new Set<string>();
    const discovered = new Set<string>();
    for (let turn = 0; turn < older.length; turn++) {
      const arrivals = [arrive(), arrive()];
      initializePerception(world, []);
      expect(arrivals.every((id) => currentBodyObservation(world, PLAYER_ID, id))).toBe(true);
      const discovery = currentDetailedAttention(world, PLAYER_ID).find(
        (entry) => entry.basis === 'discovery',
      )!;
      expect(older).toContain(discovery.sourceId);
      expect(discovered.has(discovery.sourceId)).toBe(false);
      // Broad presence/counts provide no individual description to acknowledge.
      acknowledgeAttention(world, PLAYER_ID, []);
      expect(owner.attention!.candidates[discovery.key]!.presentedDescription).toBeUndefined();
      const presentation = captureAttentionPresentation(world, PLAYER_ID, [discovery.key]);
      supplied.add(discovery.key);
      discovered.add(discovery.sourceId);
      acknowledgeAttention(world, PLAYER_ID, presentation);
      for (const [key, candidate] of Object.entries(owner.attention!.candidates))
        if (!supplied.has(key)) expect(candidate.presentedDescription).toBeUndefined();
      expect(currentDetailedAttention(world, PLAYER_ID)).toHaveLength(3);
    }
    expect(discovered).toEqual(new Set(older));
    expect(Object.keys(owner.attention!.candidates)).toHaveLength(24);
    expect(JSON.stringify(owner.attention)).not.toContain('Private unknown identity');
  });

  it('changes detail capacity during admitted gathering without hiding bodies or losing work and its required result', () => {
    let world = createWorld(131);
    const prototype = structuredClone(entityGet(world.entities, NPC_ID)!);
    for (const entity of entityValues(world.entities))
      if (entity.id !== PLAYER_ID && (entity.actor || entity.animal))
        entityDelete(world.entities, entity.id);
    const observer = entityGet(world.entities, PLAYER_ID)!;
    observer.actor!.attentionCapacity = 10;
    observer.placement = worldPlacement({ x: 1, y: 0, z: 2 }, 'terrain');
    entityGet(world.entities, 'branches')!.placement = worldPlacement(
      { x: 1.8, y: 0, z: 2 },
      'terrain',
    );
    const people = Array.from({ length: 15 }, (_, index) => {
      const person = structuredClone(prototype);
      person.id = `capacity-person-${index}`;
      person.name = 'Private unknown identity';
      person.placement = worldPlacement({ x: 4 + index / 4, y: 0, z: 2 }, 'terrain');
      person.actor!.capabilities!.memory = false;
      person.actor!.capabilities!.cognition = false;
      entitySet(world.entities, person.id, person);
      return person.id;
    });
    initializePerception(world, []);
    const initialWood = quantityOf(world, PLAYER_ID, 'wood');
    const admitted = executeCommand(world, {
      id: 'attention-capacity-gather',
      actorId: PLAYER_ID,
      type: 'gather',
      targetId: 'branches',
    });
    expect(admitted.outcome.ok, admitted.outcome.message).toBe(true);
    world = admitted.world;
    const action = entityGet(world.entities, PLAYER_ID)!.actor!.action!;
    expect(action.stage).toBe('working');
    for (const capacity of [3, 15, 2]) {
      world = updateWorld(world, (draft) => {
        entityGet(draft.entities, PLAYER_ID)!.actor!.attentionCapacity = capacity;
        initializePerception(draft, []);
      });
      expect(currentDetailedAttention(world, PLAYER_ID)).toHaveLength(capacity);
      expect(people.every((id) => currentBodyObservation(world, PLAYER_ID, id))).toBe(true);
      expect(entityGet(world.entities, PLAYER_ID)!.actor!.action!.id).toBe(action.id);
      expect(entityGet(world.entities, PLAYER_ID)!.actor!.action!.remainingSeconds).toBe(
        action.remainingSeconds,
      );
    }
    const completed = advanceWithNavigation(world, action.remainingSeconds + 1);
    expect(completed.outcome.ok, completed.outcome.message).toBe(true);
    world = completed.world;
    expect(entityGet(world.entities, PLAYER_ID)!.actor!.action).toBeNull();
    expect(quantityOf(world, PLAYER_ID, 'wood')).toBeGreaterThan(initialWood);
    const gathered = completed.events.find((event) => event.type === 'gathered')!;
    expect(gathered).toBeDefined();
    expect(
      world.experience!.awareness[PLAYER_ID]!.some((entry) => entry.eventId === gathered.id),
    ).toBe(true);
    expect(currentDetailedAttention(world, PLAYER_ID)).toHaveLength(2);
    expect(people.every((id) => currentBodyObservation(world, PLAYER_ID, id))).toBe(true);
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
    const candidate = Object.values(
      world.perceptionEvidence![PLAYER_ID]!.attention!.candidates,
    ).find((candidate) => candidate.sourceId === challenger)!;
    const deadline = candidate.urgencyThrough;
    world.simTime = 1;
    updateAttention(world, PLAYER_ID, { changedSourceIds: [], urgency: { [challenger]: 2 } });
    expect(candidate.urgencyThrough).toBe(deadline);
    world.simTime = 120;
    updateAttention(world, PLAYER_ID, { changedSourceIds: [] });
    expect(
      Object.values(world.perceptionEvidence![PLAYER_ID]!.attention!.candidates).find(
        (candidate) => candidate.sourceId === challenger,
      )!.urgency,
    ).toBe(0);
  });

  it('acknowledges only the exact provided revision and retains newer received motion', () => {
    const { world, owner, ids } = scene(2, 2);
    const provided = captureAttentionPresentation(world, PLAYER_ID);
    const id = ids[0]!,
      location = owner.current[`${id}:location`]!;
    world.simTime = 120;
    const value = receivedFacetValue(world, location.value);
    if (value?.kind !== 'location' || value.location.kind !== 'point')
      throw new Error('fixture location');
    const retained = retainReceivedValue(
      world,
      { kind: 'location', location: { ...value.location, point: { x: 10, y: 0, z: 2 } } },
      selectedAttentionPolicy(world).retention.recent.chunkBytes,
    );
    location.value = {
      ...location.value,
      reference: [retained.reference.blockId, retained.reference.valueOrdinal],
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
    const proof = [observationFactKey(world, lease.original, lease.originalOrdinal)];
    const evaluation = {
      anchorKey: anchor.key,
      family: 'closing-drop' as const,
      revision: 'first',
      exhausted: true,
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
    validateAttentionState(owner.attention, selectedAttentionPolicy(world));
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
      proof: [observationFactKey(world, body.original, body.originalOrdinal)],
    };
    const evaluation = {
      anchorKey: anchor!.key,
      family: 'closing-body' as const,
      revision: 'alarm',
      exhausted: true,
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
          exhausted: true,
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
