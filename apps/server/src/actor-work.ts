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
}

interface Work {
  inputs: unknown[];
  dirty: boolean;
  wallAt: number;
  simAt: number;
  generation: number;
  dependencies?: readonly Dependency[];
}

/** Coalesced cognitive work; see docs/architecture.md#performance-critical-path for wakeup rules. */
export class ActorWork {
  private worldId?: string;
  private scope?: string;
  private nextGeneration = 0;
  private readonly tickets = new Map<string, Work>();

  refresh(world: WorldState, inputs: (id: string) => unknown[], scope = world.id): void {
    if (this.worldId !== world.id || this.scope !== scope) {
      this.tickets.clear();
      this.worldId = world.id;
      this.scope = scope;
    }
    // Minds are initialized by startup/spawn, so ordinary animals never enter this scan.
    const present = new Set<string>();
    for (const id of Object.keys(world.minds ?? {})) {
      const entity = world.entities[id];
      if (!entity?.actor?.alive || !hasMemory(entity)) continue;
      present.add(id);
      const next = inputs(id);
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

  ready(now: number, simTime: number): string[] {
    return [...this.tickets]
      .filter(([, t]) => now >= t.wallAt && (t.dirty || simTime >= t.simAt))
      .map(([id]) => id);
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
          dependencies: actorDependencies(world, id, this.scope),
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
      dependenciesCurrent(current, capture.dependencies, scope)
    ) {
      ticket.dependencies = capture.dependencies;
      ticket.dirty = false;
      ticket.simAt = simAt;
      return true;
    }
    if (ticket) ticket.dirty = true;
    return false;
  }

  wake(id: string): void {
    const ticket = this.tickets.get(id);
    if (ticket) {
      ticket.dirty = true;
      ticket.generation = ++this.nextGeneration;
    }
  }
}
