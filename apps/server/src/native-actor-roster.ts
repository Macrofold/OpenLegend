import type { NativeChangedRows } from '@open-legend/native-simulation';

export interface NativeActorPresence {
  readonly controller: 'player' | 'npc';
  readonly alive: boolean;
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

  constructor(rows: readonly Row[], exposures: readonly Pick<Row, 'slot'>[]) {
    for (const row of rows) this.put(actorId(row.parent), this.read(row.payload));
    for (const row of exposures) this.exposures.add(row.slot);
  }
  private read(payload: string): NativeActorPresence {
    const actor = JSON.parse(payload) as NativeActorPresence;
    return {
      controller: actor.controller,
      alive: actor.alive,
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
    return () => {
      for (const [id, actor] of actors) this.put(id, actor);
      for (const id of added) this.exposures.add(id);
      for (const id of removed) this.exposures.delete(id);
    };
  }
}
