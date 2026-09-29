import {
  actorDependencies,
  dependenciesCurrent,
  hasMemory,
  type Dependency,
  type WorldState,
} from '@open-legend/domain';

export interface WorkCapture {
  generation: number;
  scope: string;
  dependencies: readonly Dependency[];
  inputs: readonly unknown[];
  world: WorldState;
}

interface Work {
  inputs: unknown[];
  dirty: boolean;
  wallAt: number;
  simAt: number;
  generation: number;
  dependencies?: readonly Dependency[];
}

/** Existing coalesced intake; no separate event queue or model loop.
 * docs/architecture.md#change-driven-exposure-and-reaction-intake
 */
export class ActorWork {
  private worldId?: string;
  private scope?: string;
  private nextGeneration = 0;
  private readonly tickets = new Map<string, Work>();
  private inputs?: (id: string, world: WorldState) => unknown[];

  refresh(
    world: WorldState,
    inputs: (id: string, world: WorldState) => unknown[],
    scope = world.id,
    actorIds?: Iterable<string>,
  ): void {
    this.inputs = inputs;
    if (this.worldId !== world.id || this.scope !== scope) {
      this.tickets.clear();
      this.worldId = world.id;
      this.scope = scope;
    }
    const present = new Set<string>();
    for (const id of actorIds ?? Object.keys(world.minds ?? {})) {
      const entity = world.entities[id];
      if (!entity?.actor?.alive || !hasMemory(entity)) continue;
      present.add(id);
      const next = inputs(id, world);
      const ticket = this.tickets.get(id);
      if (!ticket)
        this.tickets.set(id, {
          inputs: next,
          dirty: true,
          wallAt: 0,
          simAt: Infinity,
          generation: ++this.nextGeneration,
        });
      else if (
        next.length !== ticket.inputs.length ||
        next.some((value, i) => value !== ticket.inputs[i]) ||
        (ticket.dependencies && !dependenciesCurrent(world, ticket.dependencies, scope))
      ) {
        ticket.inputs = next;
        ticket.dirty = true;
        ticket.generation = ++this.nextGeneration;
      }
    }
    for (const id of this.tickets.keys()) if (!present.has(id)) this.tickets.delete(id);
  }

  ready(now: number, simTime: number, eligible: (id: string) => boolean = () => true): string[] {
    const ready: string[] = [];
    for (const [id, ticket] of this.tickets) {
      if (now >= ticket.wallAt && (ticket.dirty || simTime >= ticket.simAt) && eligible(id))
        ready.push(id);
      if (ready.length === 64) break; // Bound schedule reads before any asynchronous fan-out.
    }
    return ready;
  }

  defer(id: string, wallAt: number): void {
    const ticket = this.tickets.get(id);
    if (ticket) {
      if (ticket.wallAt !== wallAt || !ticket.dirty) ticket.generation = ++this.nextGeneration;
      ticket.wallAt = wallAt;
      ticket.dirty = true;
    }
  }

  generation(id: string): number | undefined {
    return this.tickets.get(id)?.generation;
  }
  capture(world: WorldState, id: string): WorkCapture | undefined {
    const ticket = this.tickets.get(id);
    return ticket && this.scope
      ? {
          generation: ticket.generation,
          scope: this.scope,
          // Wake on semantic bands/visible membership, not every pose or need-rate
          // update anywhere in the world. Action admission keeps its full fences.
          dependencies: actorDependencies(world, id, this.scope).filter(
            (dependency) =>
              dependency.kind !== 'existence' &&
              !(dependency.kind === 'membership' && dependency.family === 'spatial-candidates'),
          ),
          inputs: ticket.inputs,
          world,
        }
      : undefined;
  }

  /** A completed read acknowledges only its captured inputs, never a newer wake.
   * docs/projects/dependency-invalidation-tech-design.md#4-revision-safe-compute-install-and-acknowledgment
   */
  inspected(
    id: string,
    simAt: number,
    capture: WorkCapture | undefined,
    current: WorldState,
    scope: string,
  ): boolean {
    const ticket = this.tickets.get(id);
    // No await between checking sources and swapping subscriptions. Old subscriptions
    // survive failed installation; a newer generation is never acknowledged here.
    if (
      ticket &&
      capture &&
      ticket.generation === capture.generation &&
      this.scope === scope &&
      capture.scope === scope &&
      dependenciesCurrent(current, capture.dependencies, scope) &&
      !!current.entities[id]?.actor?.alive &&
      hasMemory(current.entities[id]) &&
      (current === capture.world || this.sameInputs(id, capture.inputs, current))
    ) {
      ticket.dependencies = capture.dependencies;
      ticket.dirty = false;
      ticket.simAt = simAt;
      this.tickets.delete(id);
      this.tickets.set(id, ticket);
      return true;
    }
    if (ticket) ticket.dirty = true;
    return false;
  }

  private sameInputs(id: string, captured: readonly unknown[], world: WorldState): boolean {
    const inputs = this.inputs?.(id, world);
    return (
      !!inputs && inputs.length === captured.length && inputs.every((v, i) => v === captured[i])
    );
  }

  wake(id: string): void {
    const ticket = this.tickets.get(id);
    if (ticket) {
      ticket.dirty = true;
      ticket.generation = ++this.nextGeneration;
    }
  }
}
