import type {
  NativeChangedRows,
  NativeWorld,
  NativeWorldConsumer,
} from '@open-legend/native-simulation';
import { encodeNativeJson, releaseNativeProduct } from './native-consumer.js';

export interface NativeActorPresence {
  readonly controller: 'player' | 'npc' | 'native';
  readonly alive: boolean;
  readonly incapacitated?: boolean;
  readonly cognition?: boolean;
  readonly memory: boolean;
  readonly physicalLife: number;
  readonly participation?: {
    readonly phase: 'active' | 'exiting' | 'inactive';
    readonly revision: number;
    readonly exitAttemptId?: string;
  };
}
type Row = {
  readonly parent: string;
  readonly slot: string;
  readonly payload: string;
};
type Admission = Pick<NativeWorld, 'reserveConsumerBytes' | 'reserveConsumerJson'>;
type Identity = { readonly id: string; readonly guard: NativeWorldConsumer };
type Entry = Identity & { key?: Identity; ownsKey?: boolean };
type ActorEntry = Entry & { readonly value?: NativeActorPresence };
type NavigationEntry = Entry & { readonly pending: boolean };
export type PreparedNativeActorRoster = (() => void) & { release(): void };

// Five hash containers plus their owning class; each admitted entry includes
// backing-table growth slack, key/value slots and its private guard carrier.
const containers = (slots: number) => (6 + slots) * 32 * 8;

/** Only selected scheduling facts survive the opening/source transfer. Each
 * row's deep parse is temporary; a small independent JSON body owns retained
 * strings, so an actor fact cannot pin its original rich actor/source payload. */
export class NativeActorRoster {
  private readonly actors = new Map<string, ActorEntry>();
  private readonly humans = new Set<string>();
  private readonly npcs = new Set<string>();
  private readonly exposures = new Map<string, Entry>();
  private readonly navigation = new Map<string, Entry>();
  private released = false;
  private revision = 0;

  private constructor(
    private worldOwner: Admission | undefined,
    private capacity: number,
    private containerGuard: NativeWorldConsumer | undefined,
  ) {}

  static capture(
    world: Admission,
    rows: readonly Row[],
    exposures: readonly Pick<Row, 'slot'>[],
    episodes: readonly Row[],
  ): NativeActorRoster {
    const capacity = 2 * rows.length + exposures.length + episodes.length;
    const guard = world.reserveConsumerBytes(containers(capacity));
    let roster: NativeActorRoster | undefined;
    try {
      roster = new NativeActorRoster(world, capacity, guard);
      for (const row of rows) {
        const entry = roster.read(row);
        try {
          roster.key(roster.actors, entry);
          roster.put(entry);
        } catch (error) {
          roster.drop(entry);
          throw error;
        }
      }
      for (const row of exposures) {
        const entry = roster.identity(row.slot);
        try {
          roster.key(roster.exposures, entry);
          roster.replace(roster.exposures, entry);
        } catch (error) {
          roster.drop(entry);
          throw error;
        }
      }
      for (const row of episodes) {
        const entry = roster.readNavigation(row);
        if (entry.pending) {
          try {
            roster.key(roster.navigation, entry);
            roster.replace(roster.navigation, entry);
          } catch (error) {
            roster.drop(entry);
            throw error;
          }
        } else entry.guard.release();
      }
      return roster;
    } catch (error) {
      if (roster) roster.release();
      else guard.release();
      throw error;
    }
  }

  private live(): void {
    if (this.released) throw new Error('Native actor roster was released.');
  }
  private get world(): Admission {
    this.live();
    return this.worldOwner!;
  }

  private parse<T, R>(payload: string, select: (value: T) => R): R {
    const length = Buffer.byteLength(payload);
    const carrier = this.world.reserveConsumerBytes(length + 32 * 8);
    let decoded: NativeWorldConsumer | undefined;
    try {
      const bytes = Buffer.allocUnsafeSlow(length);
      bytes.write(payload);
      decoded = this.world.reserveConsumerJson(bytes);
      return select(JSON.parse(payload) as T);
    } finally {
      decoded?.release();
      carrier.release();
    }
  }

  private copy<T extends object>(value: T): T & Entry {
    const bytes = encodeNativeJson(this.world, value);
    let guard: NativeWorldConsumer | undefined;
    try {
      guard = this.world.reserveConsumerJson(bytes);
      const result = JSON.parse(bytes.toString('utf8')) as T & Entry;
      Object.defineProperty(result, 'guard', { value: guard });
      return result;
    } catch (error) {
      guard?.release();
      throw error;
    } finally {
      releaseNativeProduct(bytes);
    }
  }

  private identity(id: string): Entry {
    const workspace = this.world.reserveConsumerBytes(32 * 8);
    try {
      return this.copy({ id });
    } finally {
      workspace.release();
    }
  }

  private path(payload: string, at: number): Entry {
    return this.parse<string[], Entry>(payload, (path) => this.identity(path.at(at)!));
  }

  private read(row: Row): ActorEntry {
    return this.parse<string[], ActorEntry>(row.parent, (path) =>
      this.parse<
        NativeActorPresence & {
          capabilities?: { cognition?: boolean; memory?: boolean };
        },
        ActorEntry
      >(row.payload, (actor) => {
        const workspace = this.world.reserveConsumerBytes(3 * 32 * 8);
        try {
          return this.copy({
            id: path.at(-1)!,
            value: {
              controller: actor.controller,
              alive: actor.alive,
              incapacitated: actor.incapacitated === true,
              cognition: actor.capabilities?.cognition !== false,
              memory: actor.capabilities?.memory ?? actor.controller !== 'native',
              physicalLife: actor.physicalLife ?? 0,
              ...(actor.participation
                ? {
                    participation: {
                      phase: actor.participation.phase,
                      revision: actor.participation.revision,
                      ...(actor.participation.exitAttemptId
                        ? { exitAttemptId: actor.participation.exitAttemptId }
                        : {}),
                    },
                  }
                : {}),
            },
          });
        } finally {
          workspace.release();
        }
      }),
    );
  }

  private readNavigation(row: Row): NavigationEntry {
    return this.parse<string[], NavigationEntry>(row.parent, (path) =>
      this.parse<{ proposal?: { wait?: string } }, NavigationEntry>(row.payload, (episode) => {
        const workspace = this.world.reserveConsumerBytes(32 * 8);
        try {
          return this.copy({
            id: path[2]!,
            pending: episode.proposal?.wait === 'entity',
          });
        } finally {
          workspace.release();
        }
      }),
    );
  }

  // Map/Set replacement preserves the existing insertion order and key. A
  // separate tiny key body therefore survives replacement of the presence body.
  private key<T extends Entry>(map: Map<string, T>, entry: T): void {
    const before = map.get(entry.id);
    entry.key = before?.key ?? this.identity(entry.id);
    entry.ownsKey = !before;
  }
  private drop(entry: Entry): void {
    entry.guard.release();
    if (entry.ownsKey) entry.key?.guard.release();
  }
  private replace<T extends Entry>(map: Map<string, T>, entry: T): void {
    const before = map.get(entry.id);
    map.set(entry.key!.id, entry);
    entry.ownsKey = true;
    before?.guard.release();
  }
  private remove<T extends Entry>(map: Map<string, T>, id: string): void {
    const before = map.get(id);
    map.delete(id);
    if (before) this.drop(before);
  }
  private put(entry: ActorEntry): void {
    if (entry.value) {
      this.replace(this.actors, entry);
      const id = entry.key!.id;
      if (entry.value.controller === 'player') this.humans.add(id);
      else this.humans.delete(id);
      if (entry.value.controller === 'npc') this.npcs.add(id);
      else this.npcs.delete(id);
    } else {
      this.humans.delete(entry.id);
      this.npcs.delete(entry.id);
      this.remove(this.actors, entry.id);
    }
  }

  // Current consumers read these scalars before awaiting their own native read.
  get(id: string): NativeActorPresence | undefined {
    this.live();
    return this.actors.get(id)?.value;
  }
  has(id: string): boolean {
    this.live();
    return this.actors.has(id);
  }
  playerIds(): Iterable<string> {
    this.live();
    return this.humans;
  }
  npcIds(): Iterable<string> {
    this.live();
    return this.npcs;
  }
  pendingNavigationIds(): Iterable<string> {
    this.live();
    return this.navigation.keys();
  }
  get exitExposureActive(): boolean {
    this.live();
    return this.exposures.size > 0;
  }

  /** All parsing, selected copies and possible container growth are admitted
   * before Ready. Rejection releases staging; acceptance only transfers owners. */
  prepare(changes: NativeChangedRows): PreparedNativeActorRoster {
    this.live();
    const count =
      (changes.writes['sim_actors']?.length ?? 0) +
      (changes.deletes['sim_actors']?.length ?? 0) +
      (changes.deletes['sim_entities']?.length ?? 0) +
      (changes.writes['sim_exit_exposures']?.length ?? 0) +
      (changes.deletes['sim_exit_exposures']?.length ?? 0) +
      (changes.writes['sim_native_response_episodes']?.length ?? 0) +
      (changes.deletes['sim_native_response_episodes']?.length ?? 0);
    const scratch = this.world.reserveConsumerBytes(7 * 32 * 8 + count * 2 * 8);
    const actors: ActorEntry[] = [],
      added: Entry[] = [],
      removed: Entry[] = [],
      episodes: NavigationEntry[] = [],
      removedEpisodes: Entry[] = [];
    let capacityGuard: NativeWorldConsumer | undefined;
    let consumed = false;
    const revision = this.revision;
    const release = () => {
      if (consumed) return;
      consumed = true;
      for (const list of [actors, added, removed, episodes, removedEpisodes]) {
        for (const entry of list) this.drop(entry);
        list.length = 0;
      }
      capacityGuard?.release();
      capacityGuard = undefined;
      scratch.release();
    };
    try {
      for (const row of changes.writes['sim_actors'] ?? []) {
        const entry = this.read(row);
        actors.push(entry);
        this.key(this.actors, entry);
      }
      for (const id of changes.deletes['sim_actors'] ?? []) actors.push(this.path(id, -2));
      for (const id of changes.deletes['sim_entities'] ?? []) actors.push(this.path(id, -1));
      for (const row of changes.writes['sim_exit_exposures'] ?? []) {
        const entry = this.identity(row.slot);
        added.push(entry);
        this.key(this.exposures, entry);
      }
      for (const id of changes.deletes['sim_exit_exposures'] ?? []) removed.push(this.path(id, -1));
      for (const row of changes.writes['sim_native_response_episodes'] ?? []) {
        const entry = this.readNavigation(row);
        episodes.push(entry);
        if (entry.pending) this.key(this.navigation, entry);
      }
      for (const id of changes.deletes['sim_native_response_episodes'] ?? [])
        removedEpisodes.push(this.path(id, 2));
      const capacity =
        2 * (this.actors.size + actors.length) +
        this.exposures.size +
        added.length +
        this.navigation.size +
        episodes.length;
      if (capacity > this.capacity)
        capacityGuard = this.world.reserveConsumerBytes(containers(capacity));
      const accept = () => {
        if (consumed) throw new Error('Native actor roster preparation was consumed.');
        this.live();
        if (this.revision !== revision)
          throw new Error('Native actor roster preparation is stale.');
        if (capacityGuard) {
          this.containerGuard!.release();
          this.containerGuard = capacityGuard;
          capacityGuard = undefined;
          this.capacity = capacity;
        }
        for (const entry of actors) this.put(entry);
        for (const entry of added) this.replace(this.exposures, entry);
        for (const entry of removed) {
          this.remove(this.exposures, entry.id);
          entry.guard.release();
        }
        for (const entry of episodes) {
          if (entry.pending) this.replace(this.navigation, entry);
          else {
            this.remove(this.navigation, entry.id);
            entry.guard.release();
          }
        }
        for (const entry of removedEpisodes) {
          this.remove(this.navigation, entry.id);
          entry.guard.release();
        }
        for (const entry of actors)
          if (!entry.value) {
            this.remove(this.navigation, entry.id);
            entry.guard.release();
          }
        this.revision++;
        actors.length =
          added.length =
          removed.length =
          episodes.length =
          removedEpisodes.length =
            0;
        release();
      };
      return Object.assign(accept, { release });
    } catch (error) {
      release();
      throw error;
    }
  }

  release(): void {
    if (this.released) return;
    this.released = true;
    this.humans.clear();
    this.npcs.clear();
    for (const map of [this.actors, this.exposures, this.navigation]) {
      for (const entry of map.values()) this.drop(entry);
      map.clear();
    }
    this.containerGuard!.release();
    this.containerGuard = undefined;
    this.worldOwner = undefined;
  }
}
