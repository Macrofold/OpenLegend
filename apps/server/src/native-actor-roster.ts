import type { NativeChangedRows } from '@open-legend/native-simulation';

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
type Row = { readonly parent: string; readonly slot: string; readonly payload: string };
const actorId = (parent: string) => (JSON.parse(parent) as string[]).at(-1)!;

/** Only host scheduling facts are retained here. Native owns the actor and its
 * participation; accepted sparse rows update this derived roster before any
 * connection, clock or controller can observe the new cut. */
export class NativeActorRoster {
  private readonly actors = new Map<string, NativeActorPresence>();
  private readonly humans = new Set<string>();
  private readonly npcs = new Set<string>();
  private readonly exposures = new Set<string>();
  private readonly navigation = new Set<string>();

  constructor(
    rows: readonly Row[],
    exposures: readonly Pick<Row, 'slot'>[],
    episodes: readonly Row[],
  ) {
    for (const row of rows) this.put(actorId(row.parent), this.read(row.payload));
    for (const row of exposures) this.exposures.add(row.slot);
    for (const row of episodes) this.putNavigation(row);
  }
  private read(payload: string): NativeActorPresence {
    const actor = JSON.parse(payload) as NativeActorPresence & {
      capabilities?: { cognition?: boolean; memory?: boolean };
    };
    return {
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
    };
  }
  private put(id: string, actor: NativeActorPresence | undefined): void {
    if (actor) this.actors.set(id, actor);
    else this.actors.delete(id);
    if (actor?.controller === 'player') this.humans.add(id);
    else this.humans.delete(id);
    if (actor?.controller === 'npc') this.npcs.add(id);
    else this.npcs.delete(id);
  }
  get(id: string): NativeActorPresence | undefined {
    return this.actors.get(id);
  }
  has(id: string): boolean {
    return this.actors.has(id);
  }
  playerIds(): Iterable<string> {
    return this.humans;
  }
  npcIds(): Iterable<string> {
    return this.npcs;
  }
  pendingNavigationIds(): Iterable<string> {
    return this.navigation;
  }
  private putNavigation(row: Row): void {
    const [id, pending] = this.readNavigation(row);
    if (pending) this.navigation.add(id);
    else this.navigation.delete(id);
  }
  private readNavigation(row: Row): readonly [string, boolean] {
    const id = (JSON.parse(row.parent) as string[])[2]!;
    const episode = JSON.parse(row.payload) as { proposal?: { wait?: string } };
    return [id, episode.proposal?.wait === 'entity'];
  }
  get exitExposureActive(): boolean {
    return this.exposures.size > 0;
  }
  prepare(changes: NativeChangedRows): () => void {
    const actors: [string, NativeActorPresence | undefined][] = [];
    for (const row of changes.writes['sim_actors'] ?? [])
      actors.push([actorId(row.parent), this.read(row.payload)]);
    for (const id of changes.deletes['sim_actors'] ?? [])
      actors.push([(JSON.parse(id) as string[]).at(-2)!, undefined]);
    for (const id of changes.deletes['sim_entities'] ?? [])
      actors.push([(JSON.parse(id) as string[]).at(-1)!, undefined]);
    const added = (changes.writes['sim_exit_exposures'] ?? []).map((row) => row.slot);
    const removed = (changes.deletes['sim_exit_exposures'] ?? []).map(
      (id) => (JSON.parse(id) as string[]).at(-1)!,
    );
    const episodes = (changes.writes['sim_native_response_episodes'] ?? []).map((row) =>
      this.readNavigation(row),
    );
    const removedEpisodes = (changes.deletes['sim_native_response_episodes'] ?? []).map(
      (id) => (JSON.parse(id) as string[])[2]!,
    );
    return () => {
      for (const [id, actor] of actors) this.put(id, actor);
      for (const id of added) this.exposures.add(id);
      for (const id of removed) this.exposures.delete(id);
      for (const [id, pending] of episodes) {
        if (pending) this.navigation.add(id);
        else this.navigation.delete(id);
      }
      for (const id of removedEpisodes) this.navigation.delete(id);
      for (const [id, actor] of actors) if (!actor) this.navigation.delete(id);
    };
  }
}
