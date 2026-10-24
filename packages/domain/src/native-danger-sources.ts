import { isDraft } from 'immer';
import { entityChangesBetween, readOnlyDraftView } from './draft.js';
import { entityGet } from './entity-collection.js';
import { physicalRoot, worldRootEntities } from './entity-index.js';
import { activelyParticipates } from './participation-state.js';
import { countDomainWork } from './diagnostic-counters.js';
import { chargeWork } from './work-budget.js';
import type { NativeResponseProfile } from './native-response.js';
import type { Entity, WorldState } from './types.js';

/** Classification never needs a writable source, including after an in-phase edit. */
export function nativeSourceActor(source: Entity) {
  const actor = readOnlyDraftView(source).actor;
  return actor && readOnlyDraftView(actor);
}
interface SourceFacts {
  species: string;
  plan: string | undefined;
  natural: boolean;
  alias: string | undefined;
}
type Membership = Map<string, ReadonlySet<string>>;
interface Catalog {
  facts: Map<string, SourceFacts>;
  species: Membership;
  plans: Membership;
  natural: Set<string>;
  aliases: Membership;
}
interface Snapshot {
  entities: WorldState['entities'];
  catalog: Catalog;
}
const snapshots = new WeakMap<WorldState['entities'], Snapshot>();
// Neither this hint nor a catalog retains an abandoned world or a draft proxy.
let latest: WeakRef<Snapshot> | undefined;

function currentFacts(entity: Entity | undefined, prior?: SourceFacts): SourceFacts | undefined {
  if (!entity || !physicalRoot(entity) || !activelyParticipates(entity)) return;
  const actor = nativeSourceActor(entity);
  if (!actor) return;
  const body = actor.body && readOnlyDraftView(actor.body),
    remains = entity.remains && readOnlyDraftView(entity.remains),
    species = actor.species ?? '',
    plan = body?.plan,
    natural = !!actor.naturalStrikeIds?.length,
    alias = remains?.sourceId;
  return prior?.species === species &&
    prior.plan === plan &&
    prior.natural === natural &&
    prior.alias === alias
    ? prior
    : { species, plan, natural, alias };
}

function emptyCatalog(): Catalog {
  return {
    facts: new Map(),
    species: new Map(),
    plans: new Map(),
    natural: new Set(),
    aliases: new Map(),
  };
}
/** Copy a changed membership group once, even when a whole cohort is installed. */
function updateCatalog(
  base: Catalog,
  entities: WorldState['entities'],
  ids: Iterable<string>,
): Catalog {
  let next: Catalog | undefined;
  const owned = new Map<Membership, Map<string, Set<string>>>();
  const membership = (index: Membership, key: string | undefined, id: string, add: boolean) => {
    if (key === undefined) return;
    let groups = owned.get(index);
    if (!groups) owned.set(index, (groups = new Map()));
    let group = groups.get(key);
    if (!group) {
      chargeWork({ tests: index.get(key)?.size ?? 0 });
      groups.set(key, (group = new Set(index.get(key))));
    }
    if (add) group.add(id);
    else group.delete(id);
    if (group.size) index.set(key, group);
    else index.delete(key);
  };
  const read = readOnlyDraftView(entities);
  for (const id of ids) {
    chargeWork({ tests: 1 });
    countDomainWork('nativeDangerCatalogEntitiesVisited');
    const before = base.facts.get(id),
      after = currentFacts(entityGet(read, id), before);
    if (before === after) continue;
    if (!next) {
      chargeWork({
        tests:
          base.facts.size +
          base.species.size +
          base.plans.size +
          base.natural.size +
          base.aliases.size,
      });
      next = {
        facts: new Map(base.facts),
        species: new Map(base.species),
        plans: new Map(base.plans),
        natural: new Set(base.natural),
        aliases: new Map(base.aliases),
      };
    }
    if (before) {
      membership(next.species, before.species, id, false);
      membership(next.plans, before.plan, id, false);
      membership(next.aliases, before.alias, id, false);
      if (before.natural) next.natural.delete(id);
    }
    if (after) {
      next.facts.set(id, after);
      membership(next.species, after.species, id, true);
      membership(next.plans, after.plan, id, true);
      membership(next.aliases, after.alias, id, true);
      if (after.natural) next.natural.add(id);
    } else next.facts.delete(id);
  }
  if (next) countDomainWork('nativeDangerCatalogUpdates');
  return next ?? base;
}
function buildCatalog(world: WorldState): Catalog {
  countDomainWork('nativeDangerCatalogBuilds');
  return updateCatalog(
    emptyCatalog(),
    world.entities,
    worldRootEntities(world, true).map((entity) => entity.id),
  );
}
function catalogFor(world: WorldState): Catalog | undefined {
  // Private nested commands often use mutable bases. Their ordinary query is
  // cheaper than rebuilding class membership, and supplies no immutable reuse proof.
  if (isDraft(world) || !Object.isFrozen(world.entities)) return;
  const cached = snapshots.get(world.entities);
  if (cached) {
    if (latest?.deref() !== cached) latest = new WeakRef(cached);
    return cached.catalog;
  }
  const prior = latest?.deref();
  const changed = prior && entityChangesBetween(prior.entities, world.entities);
  const catalog = changed
    ? updateCatalog(prior!.catalog, world.entities, changed)
    : buildCatalog(world);
  const snapshot = { entities: world.entities, catalog };
  snapshots.set(world.entities, snapshot);
  latest = new WeakRef(snapshot);
  return catalog;
}

/** Immutable source membership selects candidates, never an observer's knowledge.
 * Mutable/unknown reads keep the existing live query; no cache may certify them.
 * docs/projects/first-playable-world-tech-design.md#remaining-native-preparation-measurements */
export function nativeDangerSourceIds(
  world: WorldState,
  profile: NativeResponseProfile,
  retained: ReadonlySet<string>,
): ReadonlySet<string> | undefined {
  const catalog = catalogFor(world);
  if (!catalog) return;
  const ids = new Set<string>();
  const include = (members: ReadonlySet<string> | undefined) => {
    for (const id of members ?? []) {
      chargeWork({ tests: 1 });
      ids.add(id);
    }
  };
  for (const species of profile.dangers.species) include(catalog.species.get(species));
  for (const plan of profile.dangers.bodyPlans) include(catalog.plans.get(plan));
  if (profile.dangers.currentNaturalAttack) include(catalog.natural);
  for (const id of retained) {
    chargeWork({ tests: 1 });
    ids.add(id);
    include(catalog.aliases.get(id));
  }
  return ids;
}
