import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  createWorld,
  NPC_ID,
  PLAYER_ID,
  entityGet,
  entitySet,
  initializePerception,
  setSpatialPosition,
  worldSupport,
  selectTemporalHistory,
  currentDetailedAttention,
  commitActorResponse,
  emptyEntities,
  setAttentionFocus,
  currentAttentionCues,
  currentBodyObservation,
  selectedAttentionPolicy,
  updateWorld,
  executeCommand,
} from '@open-legend/domain';
import {
  captureSituation,
  expandSituation,
  situationProposalBinding,
  situationQuerySchema,
  temporalHistoryForModel,
} from './situation-context.js';
import { boundResponseSchema } from './cognition-contracts.js';
import { entityHandle } from './entity-references.js';
import { readableDecisionContext } from './response-context.js';
import { presentedSpatialSubject, receivedMeasurementDescription } from './perceived-context.js';
import { appendMemory } from '../../../packages/domain/src/events.js';
import { cloneValue } from '../../../packages/domain/src/draft.js';
import { assignGivenName } from '../../../packages/domain/src/worlds/base/knowledge.js';

function crowded(count = 16) {
  const world = createWorld(734),
    player = entityGet(world.entities, PLAYER_ID)!,
    prototype = entityGet(world.entities, NPC_ID)!;
  setSpatialPosition(world, player, { x: 1, y: 0, z: 2 }, worldSupport(player));
  for (let i = 0; i < count; i++) {
    const entity = structuredClone(prototype),
      id = `crowd-${i}`;
    entity.id = id;
    entity.name = `Private name ${i}`;
    entitySet(world.entities, id, entity);
    setSpatialPosition(
      world,
      entity,
      { x: 3 + (i % 4), y: 0, z: 2 + Math.floor(i / 4) },
      worldSupport(entity),
    );
  }
  initializePerception(world, []);
  return world;
}

describe('bounded received situation', () => {
  it('words only emitted supported names and rounds measurement guarantees conservatively', () => {
    expect(
      presentedSpatialSubject([
        { reference: 'unlabelled-proof', value: { kind: 'body', body: {} } },
      ]),
    ).toEqual({ label: 'this observed body', support: ['unlabelled-proof'] });
    const body = {
      reference: 'body-proof',
      value: { kind: 'body', body: { label: { name: 'person', nameForm: 'count' } } },
    };
    const possible = {
      reference: 'possible-proof',
      value: { kind: 'association', strength: 'possible', subject: { label: 'Unproven name' } },
    };
    const supported = {
      reference: 'name-proof',
      value: { kind: 'association', strength: 'supported', subject: { label: 'Received name' } },
    };
    expect(presentedSpatialSubject([body, possible])).toEqual({
      label: 'a person',
      support: ['body-proof'],
    });
    expect(presentedSpatialSubject([body, supported])).toEqual({
      label: 'Received name',
      support: ['body-proof', 'name-proof'],
    });
    // The same kept-row rendering is repeated after byte narrowing: an omitted
    // association contributes neither its name nor an undisclosed proof handle.
    const narrowed = presentedSpatialSubject([body]);
    const measurement = {
      status: 'complete',
      asOf: 30,
      lower: 3.604,
      upper: 3.854,
      decreaseLower: 0.748,
      dropLower: 5.755,
    };
    const description = receivedMeasurementDescription(narrowed.label, measurement)!;
    expect(description).toContain('a person');
    expect(description).not.toContain('Received name');
    expect(description).toContain('3.6–3.86 metres');
    expect(description).toContain('at least 0.74 metres');
    expect(description).toContain('at least 5.75 metres lower');
    expect(description).toContain('between received endpoints');
    expect(receivedMeasurementDescription('a person', { status: 'unavailable' })).toBeUndefined();
    expect(measurement).toEqual({
      status: 'complete',
      asOf: 30,
      lower: 3.604,
      upper: 3.854,
      decreaseLower: 0.748,
      dropLower: 5.755,
    });
  });

  it('separates earlier memories from received surroundings without hiding actual contact evidence', () => {
    const world = crowded(1);
    const captured = captureSituation(world, PLAYER_ID, 'grounded-render', {
      entries: [],
      incomplete: true,
    });
    const memory = 'Earlier I reached a hearth. A lit fire can cook food.';
    const context = {
      receivedSituation: captured.packet,
      recall: [memory],
      surroundings: [],
      contacts: [],
    };
    const rendered = readableDecisionContext(context, []);
    expect(rendered).toContain(memory);
    expect(rendered).toContain('not a current scene');
    expect(rendered).toContain('Use this packet for current received surroundings');
    expect(rendered).not.toContain('## Nearby actors and objects');
    expect(rendered).toContain('minimum supported decrease between measured endpoints');
    expect(rendered).toContain('not a continuous path, speed or intent');
    const contact = 'I feel a touch against my left side.';
    const withContact = readableDecisionContext({ ...context, contacts: [contact] }, []);
    expect(withContact).toContain(`Contact evidence:\n- ${contact}`);
    expect(
      withContact.split('## Nearby actors and objects')[1]!.split('## Inventory')[0],
    ).not.toContain('None supplied.');
  });

  it('keeps actually received changes and native relation proof before optional crowd detail', async () => {
    let world = updateWorld(createWorld(117), (draft) => {
      const observer = entityGet(draft.entities, NPC_ID)!,
        player = entityGet(draft.entities, PLAYER_ID)!,
        prototype = cloneValue(observer);
      draft.entities = emptyEntities();
      entitySet(draft.entities, NPC_ID, observer);
      entitySet(draft.entities, PLAYER_ID, player);
      draft.map.width = 42;
      draft.map.height = 5;
      draft.map.tiles = Array.from({ length: 5 }, () => Array(42).fill('grass'));
      const surface = (id: string, minX: number, maxX: number, y: number) => ({
        id,
        name: 'Private terrain name',
        levelId: 'level',
        minX,
        maxX,
        minZ: 0,
        maxZ: 4,
        y,
        slopeX: 0,
        slopeZ: 0,
        thickness: 0.1,
        material: 'stone',
        acousticTransmission: 0,
      });
      draft.map.spatial = {
        version: 1,
        revision: draft.map.spatial.revision + 1,
        disclosure: 'public',
        levels: [{ id: 'level', name: 'Private level', focusY: 0 }],
        blockers: [],
        surfaces: [surface('high', 0, 20, 2), surface('low', 20, 40, 0)],
      };
      // Qualified far-side observation: both actual surfaces are visible. These
      // coordinates supply no hidden destination, pursuit or relationship.
      setSpatialPosition(draft, observer, { x: 25, y: 2, z: 2 }, null);
      setSpatialPosition(draft, player, { x: 7, y: 2, z: 3 }, null);
      for (let index = 0; index < 15; index++) {
        const person = structuredClone(prototype);
        person.id = `edge-person-${index}`;
        person.name = `Hidden person ${index}`;
        person.actor!.action = null;
        if (index === 0)
          person.actor!.voiceProfile = {
            pitchRange: 930,
            resonance: 120,
            texture: 740,
            rhythm: 380,
          };
        else delete person.actor!.voiceProfile;
        entitySet(draft.entities, person.id, person);
        setSpatialPosition(
          draft,
          person,
          {
            x: index === 0 ? 15 : 5 + index / 3,
            y: 2,
            z: 2,
          },
          null,
        );
      }
      expect(
        assignGivenName(
          draft,
          NPC_ID,
          {
            subjectId: 'edge-person-0',
            expectedRevision: 0,
            givenName: 'An acquaintance',
          },
          ['edge-person-0'],
          true,
        ).ok,
      ).toBe(true);
      initializePerception(draft, []);
    });
    const voice = executeCommand(world, {
      id: 'edge-known-voice',
      actorId: 'edge-person-0',
      type: 'say',
      text: 'Here I am.',
      targetId: NPC_ID,
    });
    expect(voice.outcome.ok).toBe(true);
    world = updateWorld(voice.world, (draft) => {
      const key = Object.entries(draft.perceptionEvidence![NPC_ID]!.attention!.candidates).find(
        ([, candidate]) => candidate.sourceId === 'edge-person-0',
      )![0];
      expect(setAttentionFocus(draft, NPC_ID, [key])).toBe(true);
      draft.simTime = 15;
      setSpatialPosition(
        draft,
        entityGet(draft.entities, 'edge-person-0')!,
        { x: 16, y: 2, z: 2 },
        null,
        'physical',
      );
      initializePerception(draft, []);
    });
    const nativeBefore = currentAttentionCues(world, NPC_ID);
    expect(
      nativeBefore.some((cue) => cue.sourceId === 'edge-person-0' && cue.family === 'closing-drop'),
    ).toBe(true);
    const eventsBefore = world.events,
      currentBefore = world.perceptionEvidence;
    // No history fallback: this is the actual current-source narrowing path.
    const captured = captureSituation(world, NPC_ID, 'crowded-edge', {
      entries: [],
      incomplete: true,
    });
    const reference = entityHandle(world, NPC_ID, 'edge-person-0');
    const row = captured.packet.detailed.find((row) => row.reference === reference)!;
    expect(
      row.facts.facts.some(
        (fact) => (fact['value'] as { kind: string }).kind === 'observed-motion',
      ),
    ).toBe(true);
    expect(
      captured.packet.relations
        .find((row) => row.anchor === reference)!
        .boundaries.some(
          (edge) =>
            edge.status === 'complete' &&
            (edge.dropLower ?? 0) >= 1 &&
            (edge.decreaseLower ?? 0) > 0,
        ),
    ).toBe(true);
    const relation = captured.packet.relations.find((relation) => relation.anchor === reference)!;
    const boundary = relation.boundaries.find((edge) => (edge.decreaseLower ?? 0) > 0)!;
    expect(boundary.description).toContain('An acquaintance');
    expect(boundary.description).toContain('observed physical edge');
    expect(boundary.description).toContain('Clearance decreased');
    for (const support of boundary.support ?? [])
      expect(
        captured.currentReferences[support] ?? captured.observationReferences[support],
      ).toBeDefined();
    expect(boundary.support).toContain(boundary.reference);
    const expanded = await expandSituation(
      captured,
      [{ kind: 'boundaries', anchor: reference }],
      async () => ({ entries: [], incomplete: true, hasMore: false }),
    );
    const queried = (
      expanded.results[0] as { result: { facts: { description?: string; support?: string[] }[] } }
    ).result.facts[0]!;
    expect(queried.description).toContain('An acquaintance');
    expect(queried.description).toContain('received endpoints');
    for (const support of queried.support ?? [])
      expect(
        captured.currentReferences[support] ?? captured.observationReferences[support],
      ).toBeDefined();
    expect(captured.packet.coverage.omittedOptionalFacets).toBeGreaterThan(0);
    const suppliedDescriptions = new Set(captured.presented.map((entry) => entry.key));
    expect(captured.packet.coverage.unconsideredDescriptions).toBe(
      Object.entries(world.perceptionEvidence![NPC_ID]!.attention!.candidates).filter(
        ([key, candidate]) =>
          candidate.presentedDescription !== candidate.descriptionRevision &&
          !suppliedDescriptions.has(key),
      ).length,
    );
    expect(captured.packet.broad.reduce((sum, row) => sum + row.count, 0)).toBe(16);
    expect(
      Buffer.byteLength(JSON.stringify({ ...captured.packet, recent: undefined })),
    ).toBeLessThanOrEqual(selectedAttentionPolicy(world).scene.maxBytes);
    expect(JSON.stringify(captured.packet)).not.toContain('Hidden person');
    expect(JSON.stringify(captured.packet)).not.toContain('Private terrain name');
    expect(world.events).toBe(eventsBefore);
    expect(world.perceptionEvidence).toBe(currentBefore);
    expect(currentAttentionCues(world, NPC_ID)).toEqual(nativeBefore);
    expect(currentBodyObservation(world, NPC_ID, 'edge-person-0')).toBeDefined();
  });

  it('retains an interpretation of an actually supplied discovery fact without exposing omitted candidates', () => {
    const world = crowded();
    world.paused = false;
    const captured = captureSituation(world, PLAYER_ID, 'discovery-remember', {
      entries: [],
      incomplete: true,
    });
    const discovery = captured.packet.discovery[0]!;
    expect(discovery).toBeDefined();
    const source = discovery.facts.facts[0]!['reference'] as string;
    expect(captured.currentReferences[source]).toBeDefined();
    const actual = new Set(
      [...captured.packet.detailed, ...captured.packet.discovery].flatMap((row) =>
        row.facts.facts.map((fact) => fact['reference']),
      ),
    );
    expect(
      Object.keys(captured.currentReferences).every((reference) => actual.has(reference)),
    ).toBe(true);
    const result = commitActorResponse(
      world,
      'discovery-interpretation',
      PLAYER_ID,
      {
        operations: [
          {
            localId: 'keep',
            requiresAccepted: [],
            talk: null,
            act: null,
            think: null,
            goal: null,
            plan: null,
            note: null,
            name: null,
            appraise: null,
            observe: null,
            remember: { sources: [source], text: 'That unfamiliar person caught my attention.' },
          },
        ],
      },
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
      situationProposalBinding(captured),
    );
    expect(result.outcome.ok, result.outcome.message).toBe(true);
    expect(result.world.memories[PLAYER_ID]!.some((memory) => memory.kind === 'impression')).toBe(
      true,
    );
  });
  it('never rebinds an old thought about an unknown person to a silently reacquired body', () => {
    const world = crowded(1),
      id = 'crowd-0';
    const before = entityHandle(world, PLAYER_ID, id);
    const source = appendMemory(world, PLAYER_ID, {
      kind: 'episode',
      source: 'self_thought',
      summary: `I wondered about the person (ID:${id}).`,
      entityIds: [id],
      importance: 5,
    })!;
    expect(source).toBeTruthy();
    const original = selectTemporalHistory(world.experience?.temporal, PLAYER_ID, {
      bytes: 262144,
      limit: 1000,
    }).entries.find((entry) =>
      entry.values.some((value) => value.kind === 'personal-account' && value.id === source),
    )!;
    expect(original).toBeDefined();
    const person = entityGet(world.entities, id)!;
    world.simTime = 1;
    setSpatialPosition(world, person, { x: 60, y: 0, z: 2 }, worldSupport(person), 'physical');
    initializePerception(world, []);
    world.simTime = 40;
    setSpatialPosition(world, person, { x: 4, y: 0, z: 2 }, worldSupport(person), 'physical');
    initializePerception(world, []);
    const after = entityHandle(world, PLAYER_ID, id);
    expect(after).not.toBe(before);
    const rendered = temporalHistoryForModel(world, PLAYER_ID, {
      entries: [original],
      incomplete: false,
    });
    expect(
      rendered.entries[0]!.facts.find(
        (fact) => (fact.value as { kind: string }).kind === 'personal-account',
      )!.value,
    ).toMatchObject({ text: 'I wondered about the person.' });
    expect(JSON.stringify(rendered)).not.toContain(after);
    expect(JSON.stringify(rendered)).not.toContain(id);
    expect(
      original.values.some(
        (value) => value.kind === 'personal-account' && value.text.includes(`(ID:${id})`),
      ),
    ).toBe(true);
  });
  it('uses supported anyOf branches in the strict provider query envelope', () => {
    const schema = z.toJSONSchema(
      boundResponseSchema(['actor'], [], { speech: true, expressions: true }).extend({
        queries: z.array(situationQuerySchema).max(4).nullable(),
      }),
      { target: 'draft-7' },
    );
    expect(JSON.stringify(schema)).not.toContain('"oneOf"');
    const inspect = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      const definition = value as Record<string, unknown>;
      if (definition['type'] === 'object') {
        expect(definition['additionalProperties']).toBe(false);
        expect([...(definition['required'] as string[])].sort()).toEqual(
          Object.keys(definition['properties'] as object).sort(),
        );
      }
      Object.values(definition).forEach(inspect);
    };
    inspect(schema);
  });
  it('passes only finite serializable granted references into domain admission', () => {
    const world = crowded(1),
      captured = captureSituation(
        world,
        PLAYER_ID,
        'binding-test',
        selectTemporalHistory(world.experience?.temporal, PLAYER_ID),
      );
    const binding = situationProposalBinding(captured);
    expect(structuredClone(binding)).toEqual(binding);
    expect(Object.keys(binding).sort()).toEqual(
      [
        'privacyRevision',
        'attentionReferences',
        'retentionReferences',
        'receiptDetails',
        'observationReferences',
        'presented',
        'currentReferences',
      ].sort(),
    );
    expect(binding).not.toHaveProperty('world');
    expect(binding).not.toHaveProperty('queryBodies');
    expect(Object.keys(binding.currentReferences ?? {}).length).toBeGreaterThan(0);
  });
  it('keeps broad crowd presence when only ten subjects receive detail', () => {
    const world = crowded(),
      history = selectTemporalHistory(world.experience?.temporal, PLAYER_ID);
    const captured = captureSituation(world, PLAYER_ID, 'scene-test', history);
    expect(currentDetailedAttention(world, PLAYER_ID)).toHaveLength(10);
    expect(captured.packet.broad.reduce((sum, row) => sum + row.count, 0)).toBe(
      captured.scene.bodies.size,
    );
    expect(captured.scene.bodies.size).toBeGreaterThan(10);
    expect(
      Buffer.byteLength(JSON.stringify({ ...captured.packet, recent: undefined })),
    ).toBeLessThanOrEqual(12288);
    expect(JSON.stringify(captured.packet)).not.toContain('Private name');
  });
  it('expands only received references and keeps partial searches honest', async () => {
    const world = crowded(),
      captured = captureSituation(
        world,
        PLAYER_ID,
        'query-test',
        selectTemporalHistory(world.experience?.temporal, PLAYER_ID),
      );
    const id = [...captured.scene.bodies.keys()][0]!;
    const result = await expandSituation(
      captured,
      [{ kind: 'near', anchor: entityHandle(world, PLAYER_ID, id), radius: 8 }],
      async () => ({ entries: [], incomplete: false, hasMore: false }),
    );
    expect(result.visited).toBeLessThanOrEqual(128);
    expect(result.expandedIds.size).toBeGreaterThan(0);
    expect(JSON.stringify(result.results)).not.toContain('Private name');
    const invalid = await expandSituation(
      captured,
      [{ kind: 'near', anchor: 'hidden-person', radius: 8 }],
      async () => {
        throw Error('must not read history');
      },
    );
    expect(invalid.results).toEqual([
      {
        query: { kind: 'near', anchor: 'hidden-person', radius: 8 },
        result: { status: 'unavailable' },
      },
    ]);
  });
  it('preserves acquired ages when the world advances and fences explicit forgetting', () => {
    const world = crowded(1),
      captured = captureSituation(
        world,
        PLAYER_ID,
        'cut-test',
        selectTemporalHistory(world.experience?.temporal, PLAYER_ID),
      );
    const at = captured.packet.measuredAt;
    world.simTime += 120;
    expect(captured.packet.measuredAt).toBe(at);
    expect(captured.valid(world)).toBe(true);
    const source = captured.cut.acquired[0]!;
    (world.experience!.forgotten[PLAYER_ID] ??= []).push(source.id);
    expect(captured.valid(world)).toBe(false);
  });
  it('compacts only registered coordinate frames and preserves ordinary numeric frame fields', () => {
    const world = crowded(1),
      captured = captureSituation(
        world,
        PLAYER_ID,
        'frame-test',
        selectTemporalHistory(world.experience?.temporal, PLAYER_ID),
      );
    const id = [...captured.scene.bodies.keys()][0]!;
    const facts = captured.bodyFacts(id);
    const authored = { frame: 737, nested: { frame: 8192 } };
    captured.compactFrames({ facts, authored }, 0);
    expect(authored).toEqual({ frame: 737, nested: { frame: 8192 } });
    const location = facts.facts.find(
      (fact) => (fact['value'] as { kind: string }).kind === 'location',
    )!['value'] as { frame: number };
    expect(Number.isInteger(location.frame)).toBe(true);
    expect(captured.frames[location.frame]).toBeDefined();
  });
  it('returns one bounded partial body answer without suggesting a continuation', async () => {
    const world = crowded(),
      captured = captureSituation(
        world,
        PLAYER_ID,
        'body-query',
        selectTemporalHistory(world.experience?.temporal, PLAYER_ID),
      );
    const anchor = entityHandle(world, PLAYER_ID, [...captured.scene.bodies.keys()][0]!);
    const result = await expandSituation(
      { ...captured, policy: { ...captured.policy, expansionBytes: 4500 } },
      [{ kind: 'near', anchor, radius: 100 }],
      async () => {
        throw Error('not history');
      },
    );
    const { expandedIds: _, ...wire } = result;
    expect(Buffer.byteLength(JSON.stringify(wire))).toBeLessThanOrEqual(4500);
    const page = (
      result.results[0] as {
        result: { status: string; bodies: Array<{ reference: string }>; cursor?: unknown };
      }
    ).result;
    expect(page.status).toBe('partial');
    expect(page.bodies.length).toBeGreaterThan(0);
    expect(page.bodies.length).toBeLessThan(captured.scene.bodies.size - 1);
    expect(new Set(page.bodies.map((body) => body.reference)).size).toBe(page.bodies.length);
    expect(page).not.toHaveProperty('cursor');
    expect(
      situationQuerySchema.safeParse({ kind: 'near', anchor, radius: 100, cursor: 'unusable' })
        .success,
    ).toBe(false);
  });
  it('acknowledges only the actual additional body descriptions that survived the query byte limit', async () => {
    const world = crowded();
    world.paused = false;
    const captured = captureSituation(world, PLAYER_ID, 'ack-expanded', {
      entries: [],
      incomplete: true,
    });
    const before = new Set(captured.presented.map((entry) => entry.key));
    const expanded = await expandSituation(
      captured,
      [{ kind: 'near', anchor: entityHandle(world, PLAYER_ID, 'crowd-15'), radius: 100 }],
      async () => {
        throw Error('not history');
      },
    );
    const rows = (expanded.results[0] as { result: { bodies: Array<{ reference: string }> } })
      .result.bodies;
    const supplied = new Set(
      rows.map((row) => captured.allAttentionReferences[row.reference]).filter(Boolean),
    );
    const newlyPresented = captured.presented.filter((entry) => !before.has(entry.key));
    expect(newlyPresented.length).toBeGreaterThan(0);
    expect(newlyPresented.every((entry) => supplied.has(entry.key))).toBe(true);
    const original = world.perceptionEvidence![PLAYER_ID]!.attention!.candidates;
    const omitted = Object.keys(original).filter((key) => !before.has(key) && !supplied.has(key));
    const result = commitActorResponse(
      world,
      'accept-expanded',
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
      situationProposalBinding(captured),
    );
    expect(result.outcome.ok, result.outcome.message).toBe(true);
    const current = result.world.perceptionEvidence![PLAYER_ID]!.attention!.candidates;
    for (const supplied of newlyPresented)
      expect(current[supplied.key]!.presentedDescription).toBe(supplied.descriptionRevision);
    for (const key of omitted)
      expect(current[key]!.presentedDescription).toBe(original[key]!.presentedDescription);
  });
  it('keeps exact newest rows chronological and marks byte-shortened history partial', async () => {
    const world = crowded(1),
      history = selectTemporalHistory(world.experience?.temporal, PLAYER_ID);
    const captured = captureSituation(world, PLAYER_ID, 'history-pages', history);
    const source = history.entries[0]!;
    const entries = Array.from({ length: 12 }, (_, ordinal) => ({
      receipt: {
        ...source.receipt,
        ordinal,
        order: ordinal,
        at: 0,
        facets: [source.receipt.facets[0]!],
      },
      values: [
        {
          kind: 'personal-account' as const,
          source: 'awareness' as const,
          id: `sample-${ordinal}`,
          text: `Observed change ${ordinal}: ` + 'x'.repeat(500),
        },
      ],
    }));
    const bounded = { ...captured, policy: { ...captured.policy, expansionBytes: 4500 } };
    const result = await expandSituation(
      bounded,
      [{ kind: 'history', subject: null, from: 0, through: world.simTime }],
      async () => ({ entries, incomplete: false, hasMore: false }),
    );
    const { expandedIds: _, ...wire } = result;
    expect(Buffer.byteLength(JSON.stringify(wire))).toBeLessThanOrEqual(4500);
    const page = (
      result.results[0] as {
        result: { coverage: string; entries: Array<{ facts: Array<{ value: { text: string } }> }> };
      }
    ).result;
    expect(page.coverage).toBe('partial');
    expect(page.entries.length).toBeGreaterThan(0);
    expect(page.entries.length).toBeLessThan(entries.length);
    const actual = page.entries.map((entry) =>
      Number(/Observed change (\d+)/.exec(entry.facts[0]!.value.text)![1]),
    );
    expect(actual).toEqual(entries.slice(-actual.length).map((entry) => entry.receipt.ordinal));
    expect(
      page.entries.every((entry) => entry.facts[0]!.value.text.endsWith('x'.repeat(500))),
    ).toBe(true);
    expect(page).not.toHaveProperty('cursor');
  });
  it('keeps an empty incomplete history answer distinct from absence without a dead cursor', async () => {
    const world = crowded(1),
      captured = captureSituation(world, PLAYER_ID, 'omitted-history', {
        entries: [],
        incomplete: true,
      });
    const result = await expandSituation(
      captured,
      [{ kind: 'history', subject: null, from: 0, through: world.simTime }],
      async () => ({
        entries: [],
        incomplete: true,
        hasMore: true,
        nextBefore: { at: 0, order: 44, epoch: 'issued-epoch', ordinal: 3 },
      }),
    );
    const page = (result.results[0] as { result: { coverage: string; entries: unknown[] } }).result;
    expect(page.entries).toEqual([]);
    expect(page.coverage).toBe('partial');
    expect(page).not.toHaveProperty('cursor');
  });
});
