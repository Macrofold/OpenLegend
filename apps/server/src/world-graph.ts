import {
  HOST_IMPLEMENTATIONS,
  SUPPORTED_INVENTION_FAMILIES,
  INVENTION_FAMILY_INTERFACES,
  inventionFamily,
  type WorldState,
} from '@open-legend/domain';
import type {
  RelationshipNode,
  RelationshipEdge,
  RelationshipKind,
  RelationshipRef,
} from '@open-legend/protocol';
import {
  fingerprint,
  refKey,
  RelationshipIndex,
  GRAPH_LIMITS,
  GraphReadError,
} from './relationship-index.js';

export const DEFINITION_COVERAGE = [
  'Exact current recipe/material/base references and installed attribute/sense implementation bindings only.',
  'Not a complete read/effect, property-consumer, world-law or interaction-validation graph.',
  'Historical bases absent from this world are reference-only nodes, not installed definitions.',
] as const;
export interface DefinitionRecord {
  node: RelationshipNode;
  data: unknown;
}
export interface DefinitionProjection {
  index: RelationshipIndex;
  records: ReadonlyMap<string, DefinitionRecord>;
  ordered: readonly DefinitionRecord[];
  resolve(kind: string, id: string): DefinitionRecord | undefined;
}

/** Exact source readers live here; traversal and transports know no fictional mechanic names.
 * docs/repertoire-foundation.md#3-definition-live-arrangement-and-evidence-views
 */
export function projectDefinitions(world: WorldState, generation: string): DefinitionProjection {
  const nodes = new Map<string, RelationshipNode>(),
    records = new Map<string, DefinitionRecord>();
  const current = new Map<string, DefinitionRecord>(),
    edges: RelationshipEdge[] = [];
  const add = (kind: string, id: string, label: string, data: unknown): RelationshipRef => {
    const ref = { kind, id, version: fingerprint(data) };
    if (nodes.size >= GRAPH_LIMITS.nodes)
      throw new GraphReadError('capacity', 'Too many graph nodes.');
    const node: RelationshipNode = { ref, label, layer: 'definition' };
    const entry = { node, data };
    nodes.set(refKey(ref), node);
    records.set(refKey(ref), entry);
    current.set(JSON.stringify([kind, id]), entry);
    return ref;
  };
  const link = (
    source: RelationshipRef,
    target: RelationshipRef,
    relation: RelationshipKind,
    role?: string,
    quantity?: number,
  ) => {
    if (edges.length >= GRAPH_LIMITS.edges)
      throw new GraphReadError('capacity', 'Too many graph edges.');
    const fact = {
      source,
      target,
      relation,
      assertion: 'compiler-derived' as const,
      sourceRecord: source,
      ...(role === undefined ? {} : { role }),
      ...(quantity === undefined ? {} : { quantity }),
    };
    edges.push({ id: fingerprint(fact), ...fact });
  };
  const resolve = (kind: string, id: string) => current.get(JSON.stringify([kind, id]));
  for (const [id, value] of Object.entries(HOST_IMPLEMENTATIONS)) add('host', id, id, value);
  for (const [id, value] of Object.entries(SUPPORTED_INVENTION_FAMILIES))
    add('family', id, value.description, {
      ...value,
      ...INVENTION_FAMILY_INTERFACES[id as keyof typeof INVENTION_FAMILY_INTERFACES],
    });
  for (const value of Object.values(world.itemDefinitions))
    add('item-definition', value.id, value.name, value);
  for (const value of Object.values(world.recipes)) {
    // Mechanical inspection must not accidentally become a dump of private authoring provenance.
    const { provenance: _private, ...definition } = value;
    add('recipe', value.id, value.name, definition);
  }
  for (const value of world.moduleManifest.definitions) {
    const ref = add('attribute', value.id, value.name, value);
    const host = resolve('host', value.implementation);
    if (host) link(ref, host.node.ref, 'implements');
  }
  for (const value of world.moduleManifest.senses) {
    // The implementation ref is projected from an already validated installed sense.
    const host =
      resolve('host', value.implementation)?.node.ref ??
      add('host', value.implementation, value.implementation, {
        interface: 'sense',
        implementation: value.implementation,
      });
    link(add('sense', value.id, value.id, value), host, 'implements');
  }
  for (const value of Object.values(world.recipes)) {
    const ref = resolve('recipe', value.id)!.node.ref;
    const family = inventionFamily(value),
      host = family && resolve('family', family);
    if (host) link(ref, host.node.ref, 'implements');
    for (const input of value.inputs) {
      const material = resolve('item-definition', input.definitionId);
      if (material) link(ref, material.node.ref, 'requires', input.role, input.quantity);
      else
        throw new GraphReadError(
          'unavailable',
          'A recipe input is missing; graph coverage is unavailable.',
        );
    }
    const output = resolve('item-definition', value.outputDefinitionId);
    if (!output)
      throw new GraphReadError(
        'unavailable',
        'A recipe output is missing; graph coverage is unavailable.',
      );
    link(ref, output.node.ref, 'produces');
    const target =
      value.output.gatheringTool &&
      resolve('item-definition', value.output.gatheringTool.resourceId);
    if (target) link(ref, target.node.ref, 'uses', 'gathering-target');
    const base = value.provenance.derivedFrom;
    if (base) {
      const actual = world.recipes[base.recipeId];
      const installed =
        actual?.digest === base.digest &&
        actual.version === base.version &&
        resolve('recipe', base.recipeId);
      const reference = installed
        ? installed.node.ref
        : { kind: 'recipe-base', id: base.recipeId, version: base.digest };
      if (!nodes.has(refKey(reference)))
        nodes.set(refKey(reference), {
          ref: reference,
          label: 'Historical recipe base',
          layer: 'definition',
        });
      link(ref, reference, 'derives_from');
    }
  }
  const ordered = [...records.values()].sort((a, b) =>
    refKey(a.node.ref).localeCompare(refKey(b.node.ref)),
  );
  const sortedNodes = [...nodes.values()].sort((a, b) =>
    refKey(a.ref).localeCompare(refKey(b.ref)),
  );
  return {
    index: new RelationshipIndex(
      JSON.stringify([world.id, generation, world.moduleManifest.revision]),
      sortedNodes,
      edges,
      DEFINITION_COVERAGE,
    ),
    records,
    ordered,
    resolve,
  };
}

/** One current definition snapshot per service, not one cache entry per simulation tick. */
export class WorldGraphReader {
  private cache?: {
    id: string;
    generation: string;
    items: WorldState['itemDefinitions'];
    recipes: WorldState['recipes'];
    manifest: WorldState['moduleManifest'];
    value: DefinitionProjection;
  };
  read(world: WorldState, generation: string): DefinitionProjection {
    const c = this.cache;
    if (
      c &&
      c.id === world.id &&
      c.generation === generation &&
      c.items === world.itemDefinitions &&
      c.recipes === world.recipes &&
      c.manifest === world.moduleManifest &&
      Object.isFrozen(c.items) &&
      Object.isFrozen(c.recipes) &&
      Object.isFrozen(c.manifest)
    )
      return c.value;
    const value = projectDefinitions(world, generation);
    this.cache = {
      id: world.id,
      generation,
      items: world.itemDefinitions,
      recipes: world.recipes,
      manifest: world.moduleManifest,
      value,
    };
    return value;
  }
}
