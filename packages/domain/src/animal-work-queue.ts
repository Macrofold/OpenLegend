import { takeNativeChanges } from './native-change-feed.js';
import { entityGet } from './entity-collection.js';
import { readOnlyDraftView } from './draft.js';
import { TIME_EPSILON } from './simulation-time.js';
import { countDomainWork } from './diagnostic-counters.js';
import type { WorldState } from './types.js';
import { takeAnimalWanderClockWrites } from './native-response-controller.js';

interface DueAnimal {
  id: string;
  dueAt: number;
}
export interface AnimalWorkPreparation {
  entries: readonly DueAnimal[];
  byId: ReadonlyMap<string, number>;
  relative: ReadonlySet<string>;
  roster: readonly string[];
  rosterIds: ReadonlySet<string>;
  choices: ReadonlyMap<string, number>;
  acoustics: ReadonlyMap<string, number>;
  activeForagers: ReadonlySet<string>;
  pendingRefuges: ReadonlySet<string>;
}
const compare = (a: DueAnimal, b: DueAnimal) => a.dueAt - b.dueAt || a.id.localeCompare(b.id);
/** Disposable phase selection. Authoritative waiting clocks remain on each animal.
 * A continuation shares read-only preparation and copies only when membership changes;
 * restoring or forking without that exact continuation rebuilds from current animals. */
export class AnimalWorkQueue {
  private entries: readonly DueAnimal[];
  private byId: ReadonlyMap<string, number>;
  private roster: readonly string[];
  private rosterIds: ReadonlySet<string>;
  private relative: ReadonlySet<string>;
  private choices: ReadonlyMap<string, number>;
  private acoustics: ReadonlyMap<string, number>;
  private activeForagers: ReadonlySet<string>;
  private pendingRefuges: ReadonlySet<string>;
  private owned = false;
  private nativeOwnedClocks = false;
  private captureRequired = false;
  constructor(preparation?: AnimalWorkPreparation) {
    this.entries = preparation?.entries ?? [];
    this.byId = preparation?.byId ?? new Map();
    this.roster = preparation?.roster ?? [];
    this.rosterIds = preparation?.rosterIds ?? new Set();
    this.relative = preparation?.relative ?? new Set();
    this.choices = preparation?.choices ?? new Map();
    this.acoustics = preparation?.acoustics ?? new Map();
    this.activeForagers = preparation?.activeForagers ?? new Set();
    this.pendingRefuges = preparation?.pendingRefuges ?? new Set();
  }
  /** The native owner supplies preparation only for its exact immutable input. Start
   * watching its new draft before any clock operation, so unchanged publication clocks
   * need no cold rescan. Unseeded, replaced and unowned inputs still capture completely. */
  beginNative(world: WorldState): void {
    if (this.nativeOwnedClocks) return;
    this.nativeOwnedClocks = true;
    this.captureRequired = takeAnimalWanderClockWrites(world, this, true) === undefined;
  }
  private writable() {
    if (!this.owned) {
      this.entries = [...this.entries];
      this.byId = new Map(this.byId);
      this.relative = new Set(this.relative);
      this.choices = new Map(this.choices);
      this.acoustics = new Map(this.acoustics);
      this.activeForagers = new Set(this.activeForagers);
      this.pendingRefuges = new Set(this.pendingRefuges);
      this.owned = true;
    }
    return {
      entries: this.entries as DueAnimal[],
      byId: this.byId as Map<string, number>,
      relative: this.relative as Set<string>,
      choices: this.choices as Map<string, number>,
      acoustics: this.acoustics as Map<string, number>,
      activeForagers: this.activeForagers as Set<string>,
      pendingRefuges: this.pendingRefuges as Set<string>,
    };
  }
  private update(id: string, dueAt: number | undefined) {
    const previous = this.byId.get(id);
    if (previous === dueAt) return;
    const { entries, byId } = this.writable();
    if (previous !== undefined) {
      const index = entries.findIndex((entry) => entry.id === id);
      entries.splice(index, 1);
      byId.delete(id);
    }
    if (dueAt === undefined) return;
    const entry = { id, dueAt };
    let low = 0,
      high = entries.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (compare(entries[middle]!, entry) <= 0) low = middle + 1;
      else high = middle;
    }
    entries.splice(low, 0, entry);
    byId.set(id, dueAt);
  }
  synchronize(world: WorldState, roster: readonly string[]): void {
    const writes = this.nativeOwnedClocks ? takeAnimalWanderClockWrites(world, this) : undefined;
    const rosterChanged = roster !== this.roster;
    const changedIds = !rosterChanged && !this.captureRequired ? writes : undefined;
    this.captureRequired = false;
    if (changedIds?.size === 0) return;
    const changes = new Map<string, number | undefined>();
    if (rosterChanged) {
      const current = new Set(roster);
      for (const id of this.byId.keys()) if (!current.has(id)) changes.set(id, undefined);
      for (const id of this.relative) if (!current.has(id)) this.writable().relative.delete(id);
      for (const id of this.choices.keys())
        if (!current.has(id)) {
          const owned = this.writable();
          owned.choices.delete(id);
          owned.acoustics.delete(id);
          owned.activeForagers.delete(id);
          owned.pendingRefuges.delete(id);
        }
      this.roster = roster;
      this.rosterIds = current;
    }
    const entities = readOnlyDraftView(world.entities);
    for (const id of changedIds ?? roster) {
      if (!this.rosterIds.has(id)) continue;
      countDomainWork('animalWanderQueueEntriesVisited');
      const entity = entityGet(entities, id),
        animal = entity?.animal && readOnlyDraftView(entity.animal);
      const clock = animal?.wander && readOnlyDraftView(animal.wander);
      const episode = animal?.episode && readOnlyDraftView(animal.episode),
        forage = animal?.foraging && readOnlyDraftView(animal.foraging),
        proposal = episode?.proposal ?? forage?.proposal,
        acousticAt = Math.min(
          ...Object.values(animal?.acousticPatterns ?? {}).map(
            (pattern) => readOnlyDraftView(pattern).idleExpiresAt,
          ),
        ),
        choiceAt = Math.min(episode?.reviewAt ?? forage?.reviewAt ?? Infinity, acousticAt);
      if (acousticAt === Infinity) {
        if (this.acoustics.has(id)) this.writable().acoustics.delete(id);
      } else if (this.acoustics.get(id) !== acousticAt)
        this.writable().acoustics.set(id, acousticAt);
      if (this.choices.get(id) !== choiceAt) this.writable().choices.set(id, choiceAt);
      const activeForager = !!forage?.work;
      if (activeForager !== this.activeForagers.has(id)) {
        if (activeForager) this.writable().activeForagers.add(id);
        else this.writable().activeForagers.delete(id);
      }
      if (!!proposal !== this.pendingRefuges.has(id)) {
        if (proposal) this.writable().pendingRefuges.add(id);
        else this.writable().pendingRefuges.delete(id);
      }
      const dueAt =
        animal?.episode?.reviewAt ?? (clock && 'dueAt' in clock ? clock.dueAt : undefined);
      if (dueAt !== this.byId.get(id)) changes.set(id, dueAt);
      const relative = !!clock && 'remainingSeconds' in clock && !!clock.running;
      if (relative !== this.relative.has(id)) {
        if (relative) this.writable().relative.add(id);
        else this.writable().relative.delete(id);
      }
    }
    if (changes.size > 8) {
      // A cold or busy cohort rebuilds once. Repeated array removals/insertions for
      // every simultaneous hop would otherwise make a burst quadratic in animals.
      const { byId } = this.writable();
      for (const [id, dueAt] of changes)
        if (dueAt === undefined) byId.delete(id);
        else byId.set(id, dueAt);
      this.entries = [...byId].map(([id, dueAt]) => ({ id, dueAt })).sort(compare);
    } else for (const [id, dueAt] of changes) this.update(id, dueAt);
  }
  due(world: WorldState, elapsed: number): string[] {
    let low = 0,
      high = this.entries.length;
    const endsAt = world.simTime + TIME_EPSILON;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (this.entries[middle]!.dueAt <= endsAt) low = middle + 1;
      else high = middle;
    }
    // Preserve the existing endpoint's epsilon-rounded remaining-wait order. Close
    // deadlines may share a bucket even when their raw absolute times differ.
    const due = this.entries
      .slice(0, low)
      .map((entry) => ({ id: entry.id, remaining: entry.dueAt - world.simTime }));
    for (const id of this.relative) {
      const entity = entityGet(readOnlyDraftView(world.entities), id);
      const animal = entity?.animal && readOnlyDraftView(entity.animal);
      const clock = animal?.wander && readOnlyDraftView(animal.wander);
      if (
        clock &&
        'remainingSeconds' in clock &&
        clock.running &&
        clock.remainingSeconds <= TIME_EPSILON
      )
        due.push({ id, remaining: clock.remainingSeconds });
    }
    return due
      .sort(
        (a, b) =>
          Math.round((a.remaining + elapsed) / TIME_EPSILON) -
            Math.round((b.remaining + elapsed) / TIME_EPSILON) || a.id.localeCompare(b.id),
      )
      .map((entry) => entry.id);
  }
  /** Numeric review times are scanned without loading or sorting every animal. Only
   * due choices, active hunts and actual ready route requests touch entity records. */
  choiceIds(world: WorldState, prepared?: ReadonlyMap<string, unknown>): string[] {
    const ids = new Set(this.activeForagers);
    const changed = takeNativeChanges(world, this);
    for (const id of changed ?? this.roster) if (this.rosterIds.has(id)) ids.add(id);
    for (const [id, at] of this.choices) if (at <= world.simTime) ids.add(id);
    for (const id of this.pendingRefuges) if (prepared?.has(id)) ids.add(id);
    return [...ids];
  }
  acousticDueIds(world: WorldState): string[] {
    const due: string[] = [];
    for (const [id, at] of this.acoustics) if (at <= world.simTime) due.push(id);
    return due;
  }
  /** Controller review is a private wake-up, not expiration of every body's
   * captured rates. The existing choice owner still checks actual predicates
   * at this exact boundary; its real effects invalidate native preparation. */
  nextChoiceAt(now: number): number {
    let next = Infinity;
    for (const at of this.choices.values()) if (at > now) next = Math.min(next, at);
    return next;
  }
  snapshot(): AnimalWorkPreparation {
    this.owned = false;
    return {
      entries: this.entries,
      byId: this.byId,
      roster: this.roster,
      rosterIds: this.rosterIds,
      relative: this.relative,
      choices: this.choices,
      acoustics: this.acoustics,
      activeForagers: this.activeForagers,
      pendingRefuges: this.pendingRefuges,
    };
  }
}
