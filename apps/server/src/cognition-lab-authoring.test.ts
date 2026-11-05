import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  NPC_ID,
  PLAYER_ID,
  entityGet,
  entityValues,
  canRememberSubject,
  rememberSubject,
  type AuthoredHistory,
} from '@open-legend/domain';
import type { CognitionLabEdit, CognitionLabField } from '@open-legend/protocol';
import { testRepository, readConfig } from '../../../tests/fixtures/database.js';
import { editWorld, enterLocalWorld } from '../../../tests/fixtures/service.js';
import { continuitySubjects, continuityView } from './continuity-view.js';
import { CognitionLabRecords, labJson } from './cognition-lab-records.js';
import { CognitionLabAuthoring } from './cognition-lab-authoring.js';
import { WorldService } from './world-service.js';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
}, 60_000);
async function setup() {
  const store = await testRepository();
  const directory = await mkdtemp(join(tmpdir(), 'openlegend-lab-authoring-'));
  const service = new WorldService(store, readConfig({ OPEN_LEGEND_GOD_MODE: 'true' }));
  await enterLocalWorld(service);
  const records = new CognitionLabRecords(store.db, directory);
  await records.ready;
  const authoring = new CognitionLabAuthoring(service, records, () => ({
    workspaceId: 'fixture',
    runtimeGeneration: 'lab-fixture',
    scenarioRevision: 0,
  }));
  cleanup.push(async () => {
    await records.close();
    await store.close();
    await rm(directory, { recursive: true, force: true });
  });
  return { service, records, authoring, scope: service.localScope };
}
function edit(field: CognitionLabField, value: CognitionLabEdit['value']): CognitionLabEdit {
  return {
    actorId: NPC_ID,
    fieldId: field.id,
    owner: field.owner!,
    baseValue: field.value,
    value,
    token: field.token,
  };
}
describe('native cognition lab authoring', () => {
  it('offers an unwritten note for an authored acquaintance and creates it through the ordinary edit owner', async () => {
    const h = await setup();
    await h.service.setPresence('lab-authoring-fixture', true);
    await h.service.control({ paused: false }, h.scope);
    await editWorld(h.service, (world) => {
      world.actorKnowledge![NPC_ID] = {};
      world.observerIdentities![NPC_ID] = {};
      world.perceptionEpisodes![NPC_ID] = {};
      world.visiblePeople![NPC_ID] = [];
    });
    const id = JSON.stringify(['knowledge', PLAYER_ID, null]);
    const before = await h.authoring.current(NPC_ID, 'relations', {}, h.scope);
    expect(before.fields.items.some((field) => field.id === id)).toBe(false);
    const recognition = before.create!.find((field) => field.id === 'create.recognition')!;
    expect(await h.authoring.apply([edit(recognition, PLAYER_ID)], h.scope)).toMatchObject({
      ok: true,
    });
    expect(continuitySubjects(h.service, NPC_ID, h.scope, {}).subjects).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: PLAYER_ID, status: 'known' })]),
    );
    expect(continuityView(h.service, NPC_ID, h.scope).notepads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subjectId: PLAYER_ID,
          origin: 'unwritten',
          text: '',
          revision: 0,
        }),
      ]),
    );
    const current = await h.authoring.current(NPC_ID, 'relations', {}, h.scope);
    const note = current.fields.items.find((field) => field.id === id)!;
    expect(note).toMatchObject({ value: '', editable: true, token: { expectedRevision: 0 } });
    const pinned = await h.authoring.current(NPC_ID, 'overview', { fieldIds: [id] }, h.scope);
    expect(pinned.fields.items.find((field) => field.id === id)).toMatchObject({ value: '' });
    expect(h.service.world.actorKnowledge![NPC_ID]).toEqual({});
    expect(await h.authoring.apply([edit(note, 'A trusted old friend.')], h.scope)).toMatchObject({
      ok: true,
    });
    expect(await h.authoring.apply([edit(note, 'An obsolete draft.')], h.scope)).toMatchObject({
      ok: false,
      code: 'stale-knowledge',
    });
    expect(continuityView(h.service, NPC_ID, h.scope).notepads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subjectId: PLAYER_ID,
          text: 'A trusted old friend.',
          origin: 'actor-edit',
          revision: 1,
        }),
      ]),
    );
  }, 60_000);

  it('pages every permitted unwritten note without creating documents or losing existing note bodies', async () => {
    const h = await setup();
    await h.service.setPresence('lab-authoring-fixture', true);
    await h.service.control({ paused: false }, h.scope);
    const subjects = entityValues(h.service.world.entities)
      .filter((entity) => entity.id !== NPC_ID && !entity.retirement)
      .slice(0, 46)
      .map((entity) => entity.id);
    expect(subjects.length).toBeGreaterThan(40);
    const encountered = subjects.pop()!;
    await editWorld(h.service, (world) => {
      world.observerIdentities![NPC_ID] = {};
      world.perceptionEpisodes![NPC_ID] = {};
      for (const id of subjects) rememberSubject(world, NPC_ID, id, true);
    });
    const before = structuredClone(h.service.world.actorKnowledge![NPC_ID] ?? {});
    const found = new Map<string | null, string>();
    let cursor: string | undefined;
    do {
      const view = continuityView(h.service, NPC_ID, h.scope, cursor);
      expect(view.notepads!.length).toBeLessThanOrEqual(41);
      for (const note of view.notepads!) found.set(note.subjectId, note.text);
      cursor = view.continuity?.cursor ?? undefined;
    } while (cursor);
    for (const id of subjects) expect(found.has(id)).toBe(true);
    for (const note of Object.values(before)) expect(found.get(note.subjectId)).toBe(note.text);
    expect(h.service.world.actorKnowledge![NPC_ID]).toEqual(before);
    const first = continuityView(h.service, NPC_ID, h.scope);
    const knowledgeRevision = h.service.world.knowledgeRevisions![NPC_ID];
    await editWorld(h.service, (world) => {
      world.perceptionEpisodes![NPC_ID]![encountered] = 'new-observed-encounter';
    });
    expect(h.service.world.knowledgeRevisions![NPC_ID]).toBe(knowledgeRevision);
    expect(() => continuityView(h.service, NPC_ID, h.scope, first.continuity!.cursor!)).toThrow(
      'Private continuity changed',
    );
    const current = await h.authoring.current(
      NPC_ID,
      'overview',
      { fieldIds: [JSON.stringify(['knowledge', encountered, null])] },
      h.scope,
    );
    expect(current.fields.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ value: '', editable: true })]),
    );
  }, 60_000);

  it('applies a supported native value and hold together, validates saved bindings, and releases from the accepted current value', async () => {
    const h = await setup();
    const body = await h.authoring.current(NPC_ID, 'body', { limit: 100 }, h.scope),
      field = body.fields.items.find((row) => row.holdable)!;
    expect(field).toBeDefined();
    expect(await h.authoring.apply([{ ...edit(field, 57), hold: true }], h.scope)).toMatchObject({
      ok: true,
    });
    const snapshot = h.authoring.snapshotHolds();
    expect(snapshot).toHaveLength(1);
    expect(h.authoring.validateHolds(snapshot)).toHaveLength(1);
    const candidate = structuredClone(h.service.world);
    entityGet(candidate.entities, NPC_ID)!.actor!.physicalLife = 999;
    expect(() => h.authoring.validateHolds(snapshot, candidate)).toThrow('compatible');
    const held = (
      await h.authoring.current(NPC_ID, 'body', { limit: 100 }, h.scope)
    ).fields.items.find((row) => row.id === field.id)!;
    expect(held).toMatchObject({ value: 57, held: true, holdable: true });
    expect(await h.authoring.apply([{ ...edit(held, 57), hold: false }], h.scope)).toMatchObject({
      ok: true,
    });
    expect(h.authoring.snapshotHolds()).toEqual([]);
    expect(
      (await h.authoring.current(NPC_ID, 'body', { limit: 100 }, h.scope)).fields.items.find(
        (row) => row.id === field.id,
      )?.value,
    ).toBe(57);
    const health = body.fields.items.find(
      (row) => row.owner === 'person' && row.datatype === 'meter',
    )!;
    await expect(
      h.authoring.apply([{ ...edit(health, health.value), hold: true }], h.scope),
    ).rejects.toThrow('hold');
  }, 60_000);
  it('projects scalar custom values and exact pinned native values, applies one owner group, and rejects stale drafts', async () => {
    const h = await setup(),
      id = randomUUID();
    await h.records.putRecord(
      {
        id,
        kind: 'customField',
        sourceId: 'premise',
        name: 'Confidence',
        createdAt: new Date().toISOString(),
        summary: { datatype: 'meter' },
        data: labJson({
          id: 'premise',
          label: 'Confidence',
          datatype: 'meter',
          description: 'An authored experimental premise.',
          value: 12,
          subject: { kind: 'person', actorId: NPC_ID },
          recipientActorIds: [NPC_ID],
          enabled: true,
          placement: 'experimentalContext',
          minimum: 0,
          maximum: 20,
          unit: 'points',
        }),
      },
      { recipientActorIds: [NPC_ID] },
    );
    const custom = await h.authoring.current(NPC_ID, 'custom', {}, h.scope),
      field = custom.fields.items[0]!;
    expect(field).toMatchObject({
      datatype: 'meter',
      value: 12,
      minimum: 0,
      maximum: 20,
      unit: 'points',
      owner: 'custom',
    });
    const time = h.service.world.simTime;
    const person = await h.authoring.current(NPC_ID, 'person', {}, h.scope);
    const traitField = person.fields.items.find((row) => row.id === 'person.traitIds')!;
    expect(traitField.options?.length).toBeGreaterThan(1);
    expect(traitField.options?.map((option) => option.id)).toEqual(
      expect.arrayContaining(
        entityGet(h.service.world.entities, NPC_ID)!.actor!.traits?.map((trait) => trait.id) ?? [],
      ),
    );
    expect(await h.authoring.apply([edit(field, 17)], h.scope)).toMatchObject({ ok: true });
    await expect(h.authoring.apply([edit(field, 18)], h.scope)).rejects.toThrow('changed');
    const overview = await h.authoring.current(
      NPC_ID,
      'overview',
      { fieldIds: ['person.name', field.id] },
      h.scope,
    );
    expect(overview.fields.items.find((row) => row.id === field.id)?.value).toBe(17);
    expect(overview.fields.items.find((row) => row.id === 'person.name')).toMatchObject({
      category: 'person',
      value: entityGet(h.service.world.entities, NPC_ID)!.name,
    });
    expect(h.service.world.simTime).toBe(time);
    const body = await h.authoring.current(NPC_ID, 'body', {}, h.scope),
      meter = body.fields.items.find(
        (row) => row.owner === 'attribute' && row.datatype === 'meter',
      )!;
    expect(body.fields.items[0]?.advanced).not.toBe(true);
    const advancedAt = body.fields.items.findIndex((row) => row.advanced);
    expect(advancedAt).toBeGreaterThan(0);
    expect(body.fields.items.slice(advancedAt).every((row) => row.advanced)).toBe(true);
    expect(meter).toBeDefined();
    const next = typeof meter.value === 'number' && meter.value > 50 ? 45 : 55;
    expect(await h.authoring.apply([edit(meter, next)], h.scope)).toMatchObject({ ok: true });
    expect(
      (await h.authoring.current(NPC_ID, 'body', {}, h.scope)).fields.items.find(
        (row) => row.id === meter.id,
      )?.value,
    ).toBe(next);
    expect(await h.authoring.apply([edit(meter, next + 1)], h.scope)).toMatchObject({
      ok: false,
      code: 'conflict',
    });
  }, 60_000);

  it('inserts a personal memory, corrects its exact native source, and atomically authors only declared event perspectives', async () => {
    const h = await setup();
    const current = await h.authoring.current(NPC_ID, 'memories', {}, h.scope),
      create = current.create!.find((row) => row.id === 'create.memory')!;
    const history: AuthoredHistory = {
      kind: 'memory',
      actorId: NPC_ID,
      memory: {
        kind: 'episode',
        source: 'internal',
        summary: 'The blue stone reminded me of home.',
        at: h.service.world.simTime,
        importance: 5,
        entityIds: [],
      },
    };
    for (const memory of [
      { ...history.memory, kind: 'belief' as const },
      { ...history.memory, kind: 'reflection' as const },
      { ...history.memory, source: 'inferred' as const },
    ]) {
      await expect(
        h.authoring.apply([edit(create, labJson({ ...history, memory }))], h.scope),
      ).rejects.toThrow();
      expect(
        await h.service.authorHistory(
          { generation: h.service.generation, history: { ...history, memory } },
          h.scope,
        ),
      ).toMatchObject({ ok: false, code: 'history-rejected' });
    }
    expect(await h.authoring.apply([edit(create, labJson(history))], h.scope)).toMatchObject({
      ok: true,
    });
    const memories = await h.authoring.current(
        NPC_ID,
        'memories',
        { query: 'blue stone' },
        h.scope,
      ),
      memory = memories.fields.items[0]!;
    const source = await h.authoring.readSource(memory.detail!.id, h.scope);
    const detail = source.content as {
      entry: Record<string, unknown>;
      hash: string;
      entryId: string;
      generation: string;
    };
    expect(detail.entry['summary']).toBe('The blue stone reminded me of home.');
    const pinned = await h.authoring.current(
      NPC_ID,
      'overview',
      { fieldIds: [memory.id, 'create.memory', 'currentAction', PLAYER_ID] },
      h.scope,
    );
    const pinnedMemory = pinned.fields.items.find((row) => row.id === memory.id)!;
    expect(pinnedMemory).toMatchObject({ category: 'memories', owner: 'memory' });
    expect((await h.authoring.readSource(pinnedMemory.detail!.id, h.scope)).content).toEqual(
      source.content,
    );
    expect(pinned.fields.items.find((row) => row.id === 'currentAction')).toMatchObject({
      category: 'work',
      editable: false,
    });
    expect(pinned.fields.items.find((row) => row.id === PLAYER_ID)).toMatchObject({
      category: 'surroundings',
      editable: false,
    });
    expect(pinned.create?.find((row) => row.id === 'create.memory')).toMatchObject({
      value: null,
      initialValue: create.initialValue,
      applyGroup: 'create.memory',
    });
    const corrected = { ...detail.entry, summary: 'The green stone reminded me of home.' };
    const operation = {
      ...edit(memory, labJson(corrected)),
      token: labJson({ hash: detail.hash, entryId: detail.entryId, generation: detail.generation }),
    };
    expect(await h.authoring.apply([operation], h.scope)).toMatchObject({ ok: true });
    expect(await h.authoring.apply([operation], h.scope)).toMatchObject({
      ok: false,
      code: 'stale',
    });
    await expect(
      h.authoring.apply(
        [
          edit(
            create,
            labJson({ ...history, memory: { ...history.memory, at: h.service.world.simTime + 1 } }),
          ),
        ],
        h.scope,
      ),
    ).resolves.toMatchObject({ ok: false, code: 'history-rejected' });
    const events = await h.authoring.current(NPC_ID, 'history', {}, h.scope),
      eventCreate = events.create![0]!;
    const event: AuthoredHistory = {
      kind: 'event',
      event: { type: 'authored-event', text: 'A distant bell rang.', at: h.service.world.simTime },
      perspectives: [
        {
          retentionClass: 'memory',
          actorId: NPC_ID,
          text: 'I heard a distant bell.',
          modality: 'heard',
          recognized: false,
          intelligible: false,
          entityIds: [],
          importance: 3,
        },
      ],
    };
    const authored = await h.authoring.apply([edit(eventCreate, labJson(event))], h.scope);
    expect(authored, JSON.stringify(authored)).toMatchObject({ ok: true });
    const saved = h.service.world.events.find((row) => row.text === event.event.text)!;
    expect(saved.audience).toEqual([NPC_ID]);
    expect(
      (h.service.world.experience!.awareness[PLAYER_ID] ?? []).some(
        (row) => row.eventId === saved.id,
      ),
    ).toBe(false);
    const row = (await h.authoring.current(NPC_ID, 'history', {}, h.scope)).fields.items.find(
      (row) => row.id === JSON.stringify(['event', saved.id]),
    )!;
    const selected = await h.authoring.readSource(row.detail!.id, h.scope),
      exact = selected.content as typeof detail;
    expect(
      await h.authoring.apply(
        [
          {
            ...edit(row, labJson({ ...exact.entry, text: 'A distant bronze bell rang.' })),
            token: labJson({
              entryId: exact.entryId,
              hash: exact.hash,
              generation: exact.generation,
            }),
          },
        ],
        h.scope,
      ),
    ).toMatchObject({ ok: true });
    expect(
      h.service.world.experience!.awareness[NPC_ID]?.find((entry) => entry.eventId === saved.id)
        ?.text,
    ).toContain('bronze');
  }, 60_000);

  it('authors acquaintance and supported private appraisals through native revision checks', async () => {
    const h = await setup();
    const relations = await h.authoring.current(NPC_ID, 'relations', {}, h.scope),
      recognition = relations.create!.find((row) => row.id === 'create.recognition')!;
    const count = h.service.world.events.length;
    expect(await h.authoring.apply([edit(recognition, PLAYER_ID)], h.scope)).toMatchObject({
      ok: true,
    });
    expect(canRememberSubject(h.service.world, NPC_ID, PLAYER_ID)).toBe(true);
    expect(h.service.world.events).toHaveLength(count);
    expect(await h.authoring.apply([edit(recognition, PLAYER_ID)], h.scope)).toMatchObject({
      ok: false,
      code: 'stale',
    });
    const feelings = await h.authoring.current(NPC_ID, 'feelings', {}, h.scope),
      create = feelings.create!.find((row) => row.owner === 'appraisal');
    expect(create).toBeDefined();
    expect(await h.authoring.apply([edit(create!, create!.initialValue!)], h.scope)).toMatchObject({
      ok: true,
    });
    const appraisal = (
      await h.authoring.current(NPC_ID, 'feelings', {}, h.scope)
    ).fields.items.find((row) => row.owner === 'appraisal')!;
    expect(await h.authoring.apply([edit(appraisal, null)], h.scope)).toMatchObject({ ok: true });
  }, 60_000);

  it('uses native declaration admission and keeps a live attribute definition from being removed', async () => {
    const h = await setup();
    const policy = h.service.world.inventionPolicy;
    if (policy.playerLocked)
      expect(
        await h.service.godInventionPolicy(
          h.service.generation,
          policy.revision,
          { playerLocked: false, agentLocked: policy.agentLocked },
          h.scope,
        ),
      ).toMatchObject({ ok: true });
    const body = await h.authoring.current(NPC_ID, 'body', { limit: 100 }, h.scope),
      create = body.create!.find((row) => row.id === 'create.attributeDefinition')!;
    const definition = {
      ...(create.initialValue as Record<string, unknown>),
      id: 'fixture:composure',
      name: 'Composure',
    };
    expect(await h.authoring.apply([edit(create, labJson(definition))], h.scope)).toMatchObject({
      ok: true,
    });
    const after = await h.authoring.current(NPC_ID, 'body', { limit: 100 }, h.scope),
      initialize = after.create!.find(
        (row) => row.id === JSON.stringify(['initializeAttribute', 'fixture:composure']),
      )!;
    expect(await h.authoring.apply([edit(initialize, 23)], h.scope)).toMatchObject({ ok: true });
    const installed = await h.authoring.current(NPC_ID, 'body', { limit: 100 }, h.scope),
      declaration = installed.fields.items.find(
        (row) => row.id === JSON.stringify(['attributeDefinition', 'fixture:composure']),
      )!;
    expect(await h.authoring.apply([edit(declaration, null)], h.scope)).toMatchObject({
      ok: false,
      code: 'attribute-rejected',
    });
    expect(
      entityGet(h.service.world.entities, NPC_ID)?.actor?.attributes?.['fixture:composure']?.value,
    ).toBe(23);
  }, 60_000);
});
