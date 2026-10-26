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
} from '@open-legend/domain';
import {
  captureSituation,
  expandSituation,
  situationProposalBinding,
  situationQuerySchema,
} from './situation-context.js';
import { boundResponseSchema } from './cognition-contracts.js';
import { entityHandle } from './entity-references.js';

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
      [{ kind: 'near', anchor: entityHandle(world, PLAYER_ID, id), radius: 8, cursor: null }],
      async () => ({ entries: [], incomplete: false }),
    );
    expect(result.visited).toBeLessThanOrEqual(128);
    expect(result.expandedIds.size).toBeGreaterThan(0);
    expect(JSON.stringify(result.results)).not.toContain('Private name');
    const invalid = await expandSituation(
      captured,
      [{ kind: 'near', anchor: 'hidden-person', radius: 8, cursor: null }],
      async () => {
        throw Error('must not read history');
      },
    );
    expect(invalid.results).toEqual([
      {
        query: { kind: 'near', anchor: 'hidden-person', radius: 8, cursor: null },
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
  it('returns every received body across byte-shortened pages without skips or duplicates', async () => {
    const world = crowded(),
      captured = captureSituation(
        world,
        PLAYER_ID,
        'body-pages',
        selectTemporalHistory(world.experience?.temporal, PLAYER_ID),
      );
    const anchor = entityHandle(world, PLAYER_ID, [...captured.scene.bodies.keys()][0]!);
    const bounded = { ...captured, policy: { ...captured.policy, expansionBytes: 4500 } };
    const seen = new Set<string>();
    let cursor: string | null = null,
      pages = 0;
    do {
      const result = await expandSituation(
        bounded,
        [{ kind: 'near', anchor, radius: 100, cursor }],
        async () => {
          throw Error('not a history query');
        },
      );
      const { expandedIds: _, ...wire } = result;
      expect(Buffer.byteLength(JSON.stringify(wire))).toBeLessThanOrEqual(4500);
      const page = (
        result.results[0] as { result: { bodies: Array<{ reference: string }>; cursor?: string } }
      ).result;
      expect(page.bodies.length).toBeGreaterThan(0);
      for (const body of page.bodies) {
        expect(seen.has(body.reference)).toBe(false);
        seen.add(body.reference);
      }
      cursor = page.cursor ?? null;
      expect(++pages).toBeLessThan(64);
    } while (cursor);
    expect(pages).toBeGreaterThan(1);
    // A near query returns other received bodies, not its anchor itself.
    expect(seen.size).toBe(captured.scene.bodies.size - 1);
  });
  it('uses the oldest actually returned receipt as the history continuation after byte trimming', async () => {
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
    let cursor: string | null = null;
    const acquired: number[] = [];
    do {
      const result = await expandSituation(
        bounded,
        [{ kind: 'history', subject: null, from: 0, through: world.simTime, cursor }],
        async (query) => ({
          entries: entries.filter(
            ({ receipt }) => !query.before || receipt.order < query.before.order,
          ),
          incomplete: false,
          hasMore: false,
        }),
      );
      const { expandedIds: _, ...wire } = result;
      expect(Buffer.byteLength(JSON.stringify(wire))).toBeLessThanOrEqual(4500);
      const page = (
        result.results[0] as {
          result: {
            entries: Array<{ facts: Array<{ value: { text: string } }> }>;
            cursor?: string;
          };
        }
      ).result;
      expect(page.entries.length).toBeGreaterThan(0);
      acquired.push(
        ...page.entries.map((entry) =>
          Number(/Observed change (\d+)/.exec(entry.facts[0]!.value.text)![1]),
        ),
      );
      cursor = page.cursor ?? null;
      expect(acquired.length).toBeLessThanOrEqual(12);
    } while (cursor);
    expect([...acquired].sort((a, b) => a - b)).toEqual(entries.map((_, index) => index));
    expect(new Set(acquired).size).toBe(12);
  });
});
