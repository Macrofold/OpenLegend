import {
  HOST_IMPLEMENTATIONS,
  bodyPolicy,
  type StatusCondition,
  installedRecipeFamilies,
  recipeFamily,
  recipeItemHandlingPin,
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

export const DEFINITION_KINDS = [
  'recipe',
  'item-definition',
  'attribute',
  'sense',
  'host',
  'family',
  'item-handling-policy',
  'status-effect',
  'status-effect-policy',
  'cognition-policy',
  'body-policy',
] as const;

export const DEFINITION_COVERAGE = [
  'Exact current recipe/material/base, attribute/sense bindings, and explicit status/cognition policy references. Status reads/rates describe only their supported native operators.',
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

/** A selected context needs exact source facts, not a build of every world's edge.
 * Keep identities identical to projectDefinitions; neither path exposes recipe provenance. */
export function readDefinition(
  world: WorldState,
  kind: string,
  id: string,
): DefinitionRecord | undefined {
  let data: unknown;
  let label = id;
  switch (kind) {
    case 'item-definition': {
      const value = Object.hasOwn(world.itemDefinitions, id)
        ? world.itemDefinitions[id]
        : undefined;
      if (!value) return;
      data = value;
      label = value.name;
      break;
    }
    case 'recipe': {
      const value = Object.hasOwn(world.recipes, id) ? world.recipes[id] : undefined;
      if (!value) return;
      const { provenance: _private, ...definition } = value;
      data = definition;
      label = value.name;
      break;
    }
    case 'attribute': {
      const value = world.moduleManifest.definitions.find((d) => d.id === id);
      if (!value) return;
      data = value;
      label = value.name;
      break;
    }
    case 'status-effect': {
      const value = world.statusEffectPolicy.definitions.find((d) => d.id === id);
      if (!value) return;
      data = value;
      label = value.label;
      break;
    }
    case 'status-effect-policy':
      if (id !== 'current') return;
      data = world.statusEffectPolicy;
      label = 'Status effect policy';
      break;
    case 'cognition-policy':
      if (id !== 'current') return;
      data = world.cognitionPolicy;
      label = 'Cognition policy';
      break;
    case 'body-policy':
      if (id !== 'current' || !bodyPolicy(world)) return;
      data = bodyPolicy(world);
      label = 'Body policy';
      break;
    case 'item-handling-policy': {
      if (id !== 'engine:item-handling-policy') return;
      data = { ...world.itemHandling, pin: recipeItemHandlingPin(world) };
      label = 'Item handling policy';
      break;
    }
    case 'family': {
      const value = recipeFamily(world, id)?.definition;
      if (!value) return;
      data = value;
      label = value.name;
      break;
    }
    case 'host':
      if (!Object.hasOwn(HOST_IMPLEMENTATIONS, id)) return;
      data = HOST_IMPLEMENTATIONS[id as keyof typeof HOST_IMPLEMENTATIONS];
      break;
    default:
      return;
  }
  return {
    node: {
      ref: { kind, id, version: fingerprint(data) },
      label,
      layer: 'definition',
      canInspect: true,
    },
    data,
  };
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
    const node: RelationshipNode = { ref, label, layer: 'definition', canInspect: true };
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
  add('item-handling-policy', 'engine:item-handling-policy', 'Item handling policy', {
    ...world.itemHandling,
    pin: recipeItemHandlingPin(world),
  });
  for (const { definition } of installedRecipeFamilies(world))
    add('family', definition.id, definition.name, definition);
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
    if (!host) throw new GraphReadError('unavailable', 'An attribute implementation is missing.');
    link(ref, host.node.ref, 'implements');
  }
  for (const value of world.moduleManifest.senses) {
    // The implementation ref is projected from an already validated installed sense.
    const host =
      resolve('host', value.implementation)?.node.ref ??
      add('host', value.implementation, value.implementation, {
        interface: 'sense',
        implementation: value.implementation,
        coverage: 'Installed implementation reference only; no standalone host codec exposed.',
      });
    link(add('sense', value.id, value.id, value), host, 'implements');
  }
  const statusPolicy = add(
    'status-effect-policy',
    'current',
    'Status effect policy',
    world.statusEffectPolicy,
  );
  const cognitionPolicy = add(
    'cognition-policy',
    'current',
    'Cognition policy',
    world.cognitionPolicy,
  );
  for (const d of world.statusEffectPolicy.definitions)
    link(add('status-effect', d.id, d.label, d), statusPolicy, 'governed_by');
  const dream =
    world.cognitionPolicy.dream &&
    resolve('status-effect', world.cognitionPolicy.dream.statusEffectId);
  if (dream) link(cognitionPolicy, dream.node.ref, 'requires', 'dream-state');
  for (const d of world.statusEffectPolicy.definitions) {
    const source = resolve('status-effect', d.id)!.node.ref;
    const pending: StatusCondition[] = [
      d.requires,
      ...[d.activationCondition, d.automaticActivation, d.automaticDeactivation].filter(
        (v): v is StatusCondition => !!v,
      ),
    ];
    for (const op of d.whileActive)
      if ('changeRate' in op) {
        const target = resolve('attribute', op.changeRate.attribute);
        if (target) link(source, target.node.ref, 'contributes_to', op.changeRate.target);
        if (op.when) pending.push(op.when);
      }
    // Traverse the native condition AST, not arbitrary properties or invented prose.
    for (let i = 0; i < pending.length; i++) {
      if (i > 10000)
        throw new GraphReadError('capacity', 'Status relationship extraction is too large.');
      const c = pending[i]!;
      if ('all' in c) pending.push(...c.all);
      else if ('any' in c) pending.push(...c.any);
      else if ('compare' in c) {
        const target = resolve('attribute', c.compare.attribute);
        if (target) link(source, target.node.ref, 'uses', `condition:${c.compare.target}`);
      } else if ('hasAttribute' in c) {
        const target = resolve('attribute', c.hasAttribute.attribute);
        if (target) link(source, target.node.ref, 'uses', `applicability:${c.hasAttribute.target}`);
      } else if ('statusActive' in c) {
        const target = resolve('status-effect', c.statusActive.definitionId);
        if (target) link(source, target.node.ref, 'requires', `condition:${c.statusActive.target}`);
      }
    }
  }
  const installedBodyPolicy = bodyPolicy(world);
  if (installedBodyPolicy) {
    const source = add('body-policy', 'current', 'Body policy', installedBodyPolicy);
    const pending: StatusCondition[] = [
      installedBodyPolicy.recovery?.when,
      installedBodyPolicy.consumption?.suggestWhen,
      installedBodyPolicy.backgroundThinking.maintenanceBlockedWhen,
      installedBodyPolicy.backgroundThinking.commitBlockedWhen,
      installedBodyPolicy.backgroundThinking.reflectionBlockedWhen,
      ...installedBodyPolicy.backgroundThinking.reconsiderationInputs.map((input) => input.when),
    ].filter((condition): condition is StatusCondition => !!condition);
    for (const id of [
      ...(installedBodyPolicy.recovery?.floors.map((floor) => floor.attributeId) ?? []),
      ...installedBodyPolicy.revival.fillToMaximum,
      installedBodyPolicy.consumption?.attributeId,
      installedBodyPolicy.carryingConcern?.attributeId,
    ]) {
      if (!id) continue;
      const target = resolve('attribute', id);
      if (target) link(source, target.node.ref, 'uses', 'body service');
    }
    for (let i = 0; i < pending.length; i++) {
      if (i > 10000)
        throw new GraphReadError('capacity', 'Body policy relationships are too large.');
      const condition = pending[i]!;
      if ('all' in condition) pending.push(...condition.all);
      else if ('any' in condition) pending.push(...condition.any);
      else if ('compare' in condition || 'hasAttribute' in condition) {
        const predicate = 'compare' in condition ? condition.compare : condition.hasAttribute;
        const target = resolve('attribute', predicate.attribute);
        if (target) link(source, target.node.ref, 'reads', predicate.target);
      } else if ('statusActive' in condition) {
        const target = resolve('status-effect', condition.statusActive.definitionId);
        if (target) link(source, target.node.ref, 'requires', condition.statusActive.target);
      }
    }
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
    for (const dependency of value.dependencyReferences) {
      if (
        dependency.kind === 'item-definition' &&
        value.inputs.some((input) => input.definitionId === dependency.pin.id)
      )
        continue;
      const target = resolve(dependency.kind, dependency.pin.id);
      if (!target)
        throw new GraphReadError('unavailable', 'A compiled recipe dependency is missing.');
      link(ref, target.node.ref, 'uses', 'family-dependency');
    }
    const base =
      value.provenance.source === 'world-authored' ? undefined : value.provenance.derivedFrom;
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
          availability: 'reference-only',
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
      [...new Map(edges.map((e) => [e.id, e])).values()],
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
    status: WorldState['statusEffectPolicy'];
    cognition: WorldState['cognitionPolicy'];
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
      c.status === world.statusEffectPolicy &&
      c.cognition === world.cognitionPolicy &&
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
      status: world.statusEffectPolicy,
      cognition: world.cognitionPolicy,
      value,
    };
    return value;
  }
}
