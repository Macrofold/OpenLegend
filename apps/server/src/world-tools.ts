import { authoringKind } from './world-authoring-contracts.js';
import { describeAuthoringKind } from './world-authoring-metadata.js';
import { memoryRef, projectMemoryRecord } from './evidence-relationships.js';
import { z } from 'zod';
import {
  DECLARATION_CONTRACT,
  projectAttributes,
  validateDeclaration,
  type WorldState,
} from '@open-legend/domain';
import { RELATIONSHIP_KINDS, type RelationshipRef } from '@open-legend/protocol';
import { declarationSchema } from './ai-schemas.js';
import { normalizeInventionProposal } from './invention-service.js';
import { fingerprint, GraphReadError, GRAPH_LIMITS, refKey } from './relationship-index.js';
import { inspectableEntity, projectLiveSubject } from './live-relationships.js';
import { DEFINITION_KINDS, WorldGraphReader } from './world-graph.js';
import type { WorldService } from './world-service.js';

const id = z.string().min(1).max(200);
const version = z.string().min(1).max(100);
const ref = z.object({ kind: id, id: z.string().min(1).max(500), version }).strict();
const subject = z.object({ kind: z.enum(['entity', 'item']), id }).strict();
const select = z
  .object({ kind: id, id: z.string().min(1).max(500), version: version.optional() })
  .strict();
const paging = {
  cursor: z.string().min(1).max(512).optional(),
  limit: z.number().int().min(1).max(50).default(20),
};

/** Shared descriptors generate MCP and local discovery. They do not grant authority.
 * docs/world-agent-mcp.md#implemented-read-only-bootstrap
 */
export const WORLD_READ_TOOLS = {
  ol_schema: {
    description:
      'Read the actual supported authoring shape, current example, limits and change semantics for a native kind. Guidance is not validation or permission.',
    schema: z.object({ kind: authoringKind }).strict(),
  },
  ol_context: {
    description:
      'Inspect the authorized world profile, installed families, policy and implemented tool coverage. This is an out-of-world read, not NPC knowledge.',
    schema: z.object({}).strict(),
  },
  ol_find: {
    description:
      'Find current definitions by label/ID with bounded lexical paging. No paid semantic search. Empty pages may have a continuation.',
    schema: z
      .object({
        query: z.string().max(200).default(''),
        kinds: z.array(id).max(8).optional(),
        ...paging,
      })
      .strict(),
  },
  ol_inspect: {
    description:
      'Inspect a current exact definition, live item/entity, or retained memory-record ref. Optional version detects stale selection. Owner evidence stays separate from private authoring provenance, learning and mutation.',
    schema: select,
  },
  ol_graph: {
    description:
      'Page direct outgoing/incoming relationships from exact source records. Coverage is projection-only, never complete behavioral validation. Expand returned refs to navigate.',
    schema: z
      .object({
        root: ref,
        subject: subject.optional(),
        direction: z.enum(['out', 'in', 'both']).default('both'),
        relations: z.array(z.enum(RELATIONSHIP_KINDS)).max(RELATIONSHIP_KINDS.length).optional(),
        ...paging,
      })
      .strict(),
  },
  ol_instances: {
    description:
      'Page current items by optional definition or inventory owner, with snapshot-bound continuation. Inventory owner is not a general legal title or custody system.',
    schema: z.object({ definitionId: id.optional(), ownerId: id.optional(), ...paging }).strict(),
  },
  ol_evidence: {
    description:
      'Page retained private memory/commitment records of an actor under explicit world-owner inspection. These are claims/evidence, not mutual agreements, universal truth or a complete event archive.',
    schema: z.object({ actorId: id, ...paging }).strict(),
  },
  ol_activity: {
    description:
      "Inspect an actor's existing action, selected plan and goals at world-authorized scope. This does not command the actor or implement new activity templates.",
    schema: z.object({ actorId: id }).strict(),
  },
  ol_validate_recipe: {
    description:
      'Unpaid native validation of supplied finite recipe JSON using world-level material facts. Returns findings, not installation, character knowledge, general interaction proof or a physical experiment.',
    schema: z.object({ candidateJson: z.string().min(2).max(12000) }).strict(),
  },
} as const;
export type WorldReadToolName = keyof typeof WORLD_READ_TOOLS;
export const worldReadRequest = z
  .object({
    name: z.enum(Object.keys(WORLD_READ_TOOLS) as [WorldReadToolName, ...WorldReadToolName[]]),
    arguments: z.unknown(),
  })
  .strict();
export interface WorldReadGrant {
  worldId: string;
  principal: string;
}
export interface WorldToolResult {
  status: 'ok' | 'invalid' | 'stale' | 'unavailable' | 'capacity' | 'forbidden';
  data?: unknown;
  message?: string;
  snapshot?: { worldId: string; generation: string; sequence: number; simTime: number };
  cost: 'no-paid-work';
}
const RESULT_BYTES = 64 * 1024;

function pageOffset(cursor: string | undefined, binding: string, size: number) {
  if (!cursor) return 0;
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new GraphReadError('invalid', 'Invalid cursor.');
  }
  if (!Array.isArray(value) || value.length !== 2 || value[0] !== binding)
    throw new GraphReadError(
      'stale',
      'The selected source or query changed. Restart this listing.',
    );
  if (!Number.isSafeInteger(value[1]) || value[1] < 0 || value[1] > size)
    throw new GraphReadError('invalid', 'Invalid cursor offset.');
  return value[1] as number;
}
const nextPage = (binding: string, offset: number, total: number) =>
  offset < total ? Buffer.from(JSON.stringify([binding, offset])).toString('base64url') : null;

/** One service per world host; UI and MCP call exactly the same strictly validated read path.
 * Grants are transport-established. No tool can create grants or submit effects.
 */
export class WorldToolService {
  private readonly graph = new WorldGraphReader();
  private items?: { source: WorldState['items']; keys: string[]; revision: string };
  constructor(private readonly service: WorldService) {}

  execute(name: string, args: unknown, grant: WorldReadGrant): WorldToolResult {
    const world = this.service.world,
      generation = this.service.timelineId;
    if (grant.worldId !== world.id || !grant.principal)
      return {
        status: 'forbidden',
        message: 'World inspection grant is unavailable.',
        cost: 'no-paid-work',
      };
    if (!Object.hasOwn(WORLD_READ_TOOLS, name))
      return { status: 'invalid', message: 'Unknown tool.', cost: 'no-paid-work' };
    try {
      const checked = WORLD_READ_TOOLS[name as WorldReadToolName].schema.safeParse(args);
      if (!checked.success)
        return {
          status: 'invalid',
          message: 'Arguments do not match this tool.',
          cost: 'no-paid-work',
        };
      const result: WorldToolResult = {
        status: 'ok',
        data: this.read(name as WorldReadToolName, checked.data, world, generation),
        snapshot: {
          worldId: world.id,
          generation,
          sequence: world.sequence,
          simTime: world.simTime,
        },
        cost: 'no-paid-work',
      };
      // The whole result is rejected, never silently truncated into a misleading complete response.
      const serialized = JSON.stringify(result);
      if (Buffer.byteLength(serialized) > RESULT_BYTES)
        return {
          status: 'capacity',
          message: 'Result exceeds the read envelope. Select a smaller page or subject.',
          cost: 'no-paid-work',
        };
      // All adapters receive detached JSON, never writable references to authoritative state.
      return JSON.parse(serialized) as WorldToolResult;
    } catch (error) {
      if (error instanceof GraphReadError)
        return { status: error.code, message: error.message, cost: 'no-paid-work' };
      return {
        status: 'unavailable',
        message: 'World inspection failed; no effect or paid work was performed.',
        cost: 'no-paid-work',
      };
    }
  }

  private read(
    name: WorldReadToolName,
    raw: unknown,
    world: WorldState,
    generation: string,
  ): unknown {
    switch (name) {
      case 'ol_schema':
        return describeAuthoringKind(world, (raw as { kind: z.infer<typeof authoringKind> }).kind);
      case 'ol_context':
        return {
          profile: world.profile,
          policy: world.inventionPolicy,
          manifestRevision: world.moduleManifest.revision,
          tools: Object.entries(WORLD_READ_TOOLS).map(([name, tool]) => ({
            name,
            description: tool.description,
          })),
          definitionKinds: DEFINITION_KINDS,
          recipeContract: DECLARATION_CONTRACT,
          recipeSchema: declarationSchema,
          limitations: [
            'Read tools do not authorize writes. Authoring requires an application-issued session context and exact human approval.',
            'No complete interaction proof, arbitrary process compiler, joint physics, information-artifact or agreement authoring is implemented.',
          ],
        };
      case 'ol_find': {
        const input = raw as z.infer<typeof WORLD_READ_TOOLS.ol_find.schema>;
        if (input.kinds?.some((kind) => !DEFINITION_KINDS.some((supported) => supported === kind)))
          throw new GraphReadError(
            'unavailable',
            'A requested definition kind has no implemented reader.',
          );
        const projection = this.graph.read(world, generation),
          query = input.query.toLowerCase();
        const binding = fingerprint([
          projection.index.snapshot,
          query,
          [...new Set(input.kinds ?? [])].sort(),
        ]);
        let offset = pageOffset(input.cursor, binding, projection.ordered.length),
          examined = 0;
        const nodes = [];
        while (
          offset < projection.ordered.length &&
          nodes.length < input.limit &&
          examined++ < GRAPH_LIMITS.examined
        ) {
          const node = projection.ordered[offset++]!.node;
          if (input.kinds?.length && !input.kinds.includes(node.ref.kind)) continue;
          if (
            query &&
            !node.label.toLowerCase().includes(query) &&
            !node.ref.id.toLowerCase().includes(query)
          )
            continue;
          nodes.push(node);
        }
        return {
          nodes,
          snapshot: projection.index.snapshot,
          nextCursor: nextPage(binding, offset, projection.ordered.length),
          coverage: 'Current projected definitions; lexical matching only.',
        };
      }
      case 'ol_inspect': {
        const input = raw as z.infer<typeof select>;
        const definitions = this.graph.read(world, generation);
        if (input.kind === 'memory-record') {
          const record = projectMemoryRecord(world, generation, input.id);
          if (input.version && input.version !== record.node.ref.version)
            throw new GraphReadError('stale', 'Memory record changed.');
          return {
            node: record.node,
            data: record.data,
            relationships: record.index.neighborhood({ root: record.node.ref, direction: 'out' }),
          };
        }
        if (input.kind === 'entity' || input.kind === 'item') {
          const projection = projectLiveSubject(
            world,
            generation,
            definitions,
            input.kind,
            input.id,
          );
          if (input.version && input.version !== projection.root.version)
            throw new GraphReadError('stale', 'Live subject changed.');
          const item = input.kind === 'item' ? world.items[input.id] : undefined;
          const entity = input.kind === 'entity' ? world.entities[input.id] : undefined;
          return {
            ref: projection.root,
            data: item ?? (entity && inspectableEntity(entity)),
            relationships: {
              ...projection.index.neighborhood({ root: projection.root, direction: 'both' }),
              subject: { kind: input.kind, id: input.id },
            },
          };
        }
        const entry = definitions.resolve(input.kind, input.id);
        if (!entry)
          throw new GraphReadError(
            'unavailable',
            'Definition is not available in the implemented projection.',
          );
        if (input.version && input.version !== entry.node.ref.version)
          throw new GraphReadError('stale', 'Definition changed.');
        return {
          ...entry,
          relationships: definitions.index.neighborhood({ root: entry.node.ref, direction: 'out' }),
        };
      }
      case 'ol_graph': {
        const input = raw as z.infer<typeof WORLD_READ_TOOLS.ol_graph.schema>;
        const definitions = this.graph.read(world, generation);
        if (input.root.kind === 'memory-record')
          return projectMemoryRecord(world, generation, input.root.id).index.neighborhood(input);
        const source =
          input.subject ??
          (input.root.kind === 'entity' || input.root.kind === 'item'
            ? { kind: input.root.kind, id: input.root.id }
            : undefined);
        if (source) {
          const live = projectLiveSubject(
            world,
            generation,
            definitions,
            source.kind as 'entity' | 'item',
            source.id,
          );
          return { ...live.index.neighborhood(input), subject: source };
        }
        return definitions.index.neighborhood(input);
      }
      case 'ol_instances': {
        const input = raw as z.infer<typeof WORLD_READ_TOOLS.ol_instances.schema>;
        let items = this.items;
        if (!items || items.source !== world.items || !Object.isFrozen(world.items)) {
          const keys = Object.keys(world.items);
          if (keys.length > GRAPH_LIMITS.nodes)
            throw new GraphReadError(
              'capacity',
              'Instance projection needs a larger indexed reader.',
            );
          items = { source: world.items, keys, revision: fingerprint(world.items) };
          this.items = items;
        }
        const binding = fingerprint([
          world.id,
          generation,
          items.revision,
          input.definitionId ?? null,
          input.ownerId ?? null,
        ]);
        let offset = pageOffset(input.cursor, binding, items.keys.length),
          examined = 0;
        const values = [];
        while (
          offset < items.keys.length &&
          values.length < input.limit &&
          examined++ < GRAPH_LIMITS.examined
        ) {
          const item = world.items[items.keys[offset++]!]!;
          if (input.definitionId && input.definitionId !== item.definitionId) continue;
          if (input.ownerId && input.ownerId !== item.ownerId) continue;
          values.push({ ...item, ref: { kind: 'item', id: item.id, version: fingerprint(item) } });
        }
        return {
          items: values,
          nextCursor: nextPage(binding, offset, items.keys.length),
          coverage:
            'Current native item instances only; not all entities, joint arrangements or legal ownership.',
        };
      }
      case 'ol_evidence': {
        const input = raw as z.infer<typeof WORLD_READ_TOOLS.ol_evidence.schema>;
        if (!Object.hasOwn(world.entities, input.actorId) || !world.entities[input.actorId]?.actor)
          throw new GraphReadError('unavailable', 'Actor is unavailable.');
        const records = world.memories[input.actorId] ?? [];
        if (records.length > 1000)
          throw new GraphReadError('capacity', 'Retained evidence needs an indexed reader.');
        const binding = fingerprint([world.id, generation, input.actorId, records]);
        const offset = pageOffset(input.cursor, binding, records.length);
        const page = records.slice(offset, offset + Math.min(input.limit, 10));
        return {
          records: page.map((record) => ({
            ref: memoryRef(input.actorId, record),
            summary: record.summary,
            kind: record.kind,
            source: record.source,
            obligation: record.obligation,
          })),
          nextCursor: nextPage(binding, offset + page.length, records.length),
          coverage:
            'Retained actor memory only. Use each exact ref to inspect record and evidence relationships.',
        };
      }
      case 'ol_activity': {
        const { actorId } = raw as { actorId: string };
        const entity = Object.hasOwn(world.entities, actorId) ? world.entities[actorId] : undefined;
        if (!entity?.actor) throw new GraphReadError('unavailable', 'Actor is unavailable.');
        const { path, ...action } = entity.actor.action ?? { path: [] };
        return {
          actorId,
          action: entity.actor.action ? { ...action, pathLength: path.length } : null,
          agency: entity.actor.agency,
          attributes: projectAttributes(world, entity, 'owner'),
          senses: entity.actor.senses ?? world.moduleManifest.defaultSenses,
          controller: entity.actor.controller,
          actorState: { alive: entity.actor.alive, incapacitated: entity.actor.incapacitated },
          coverage:
            'Current native action, goals and plan; no new wait/repeat/joint-activity executor is implied. Private actor state is owner-inspection evidence, not an NPC observation.',
        };
      }
      case 'ol_validate_recipe': {
        let candidate: unknown;
        try {
          candidate = normalizeInventionProposal(
            JSON.parse((raw as { candidateJson: string }).candidateJson),
          );
        } catch {
          throw new GraphReadError('invalid', 'Candidate is not valid recipe JSON.');
        }
        const errors = validateDeclaration(world, candidate);
        return {
          valid: errors.length === 0,
          errors,
          coverage:
            'Finite native recipe validator only. No full interaction validation, current actor admission, installation, experiment or learning occurred.',
        };
      }
    }
  }
}
