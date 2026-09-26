import type { WorldState } from '@open-legend/domain';
import type {
  RelationshipEdge,
  RelationshipKind,
  RelationshipNode,
  RelationshipRef,
} from '@open-legend/protocol';
import { fingerprint, GraphReadError, refKey, RelationshipIndex } from './relationship-index.js';
import type { DefinitionProjection } from './world-graph.js';

/** Live arrangements are projected from their owners, not inferred from labels or pictures.
 * docs/repertoire-foundation.md#3-definition-live-arrangement-and-evidence-views
 */
export function projectLiveSubject(
  world: WorldState,
  generation: string,
  definitions: DefinitionProjection,
  kind: 'entity' | 'item',
  id: string,
) {
  const nodes = new Map<string, RelationshipNode>(),
    edges = new Map<string, RelationshipEdge>();
  const add = (kind: string, id: string, label: string, data: unknown): RelationshipRef => {
    const ref = { kind, id, version: fingerprint(data) };
    nodes.set(refKey(ref), { ref, label, layer: 'live' });
    return ref;
  };
  const link = (
    source: RelationshipRef,
    target: RelationshipRef,
    relation: RelationshipKind,
    role?: string,
  ) => {
    const fact = {
      source,
      target,
      relation,
      sourceRecord: source,
      assertion: 'observed' as const,
      ...(role === undefined ? {} : { role }),
    };
    const id = fingerprint(fact);
    edges.set(id, { id, ...fact });
  };
  const definition = (kind: string, id: string) => {
    const entry = definitions.resolve(kind, id);
    if (!entry) throw new GraphReadError('unavailable', 'A live object has a missing definition.');
    nodes.set(refKey(entry.node.ref), entry.node);
    return entry.node.ref;
  };
  // Deliberate field projection: no memory/private authoring records or full path arrays.
  const entity = (id: string) => {
    const e = Object.hasOwn(world.entities, id) ? world.entities[id] : undefined;
    if (!e) throw new GraphReadError('unavailable', 'Entity is unavailable.');
    return add('entity', id, e.name, {
      id,
      name: e.name,
      kind: e.kind,
      position: e.position,
      spatial: e.spatial,
      resource: e.resource,
      heat: e.heat,
      remains: e.remains,
    });
  };
  const item = (id: string) => {
    const i = Object.hasOwn(world.items, id) ? world.items[id] : undefined;
    if (!i) throw new GraphReadError('unavailable', 'Item is unavailable.');
    const ref = add('item', id, world.itemDefinitions[i.definitionId]?.name ?? 'Item', i);
    link(ref, definition('item-definition', i.definitionId), 'instance_of');
    if (i.ownerId && Object.hasOwn(world.entities, i.ownerId))
      link(ref, entity(i.ownerId), 'inventory_owner');
    return ref;
  };
  let root: RelationshipRef;
  if (kind === 'item') root = item(id);
  else {
    root = entity(id);
    const e = world.entities[id]!;
    const supportId = e.spatial.supportSurfaceId;
    const support =
      supportId && world.map.spatial.surfaces.find((surface) => surface.id === supportId);
    if (support) link(root, add('surface', support.id, support.name, support), 'supported_by');
    // Terrain is a real native support ID even though it is not a separate surface patch.
    else if (supportId === 'terrain')
      link(
        root,
        add('support', 'terrain', 'Native terrain', {
          revision: world.map.spatial.revision,
          provider: 'native-terrain',
        }),
        'supported_by',
      );
    const action = e.actor?.action;
    if (action) {
      const { path, ...state } = action;
      const ref = add('activity', action.id, action.type, { ...state, pathLength: path.length });
      link(root, ref, 'uses', 'current-action');
      link(ref, root, 'operated_by');
      if (action.recipeId) link(ref, definition('recipe', action.recipeId), 'uses', 'recipe');
      if (action.targetId && Object.hasOwn(world.entities, action.targetId))
        link(ref, entity(action.targetId), 'uses', 'target');
      for (const [role, itemId] of Object.entries({
        item: action.itemId,
        weapon: action.weaponItemId,
        ammunition: action.ammoItemId,
      }))
        if (itemId && Object.hasOwn(world.items, itemId)) link(ref, item(itemId), 'uses', role);
    }
    if (e.actor?.equippedItemId && Object.hasOwn(world.items, e.actor.equippedItemId))
      link(root, item(e.actor.equippedItemId), 'uses', 'equipped');
  }
  const index = new RelationshipIndex(
    JSON.stringify([world.id, generation, world.sequence, world.simTime]),
    [...nodes.values()],
    [...edges.values()],
    [
      'Current native support, inventory possession, equipment and active-action references only; not a complete physical contact or social-ownership graph.',
      'Joint interactions, attachment/load-bearing, information carriers and agreements appear only after their owning systems exist.',
      'Observed here means read from authoritative live records by an authorized World Agent, not witnessed by an NPC.',
    ],
  );
  return { root, index };
}
