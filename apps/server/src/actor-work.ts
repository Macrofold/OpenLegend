import { hasMemory, type WorldState } from '@open-legend/domain';

interface Work {
  inputs: unknown[];
  dirty: boolean;
  wallAt: number;
  simAt: number;
}

/** Coalesced cognitive work; see docs/architecture.md#performance-critical-path for wakeup rules. */
export class ActorWork {
  private worldId?: string;
  private readonly tickets = new Map<string, Work>();

  refresh(world: WorldState, inputs: (id: string) => unknown[]): void {
    if (this.worldId !== world.id) {
      this.tickets.clear();
      this.worldId = world.id;
    }
    // Minds are initialized by startup/spawn, so ordinary animals never enter this scan.
    const present = new Set<string>();
    for (const id of Object.keys(world.minds ?? {})) {
      const entity = world.entities[id];
      if (!entity?.actor?.alive || !hasMemory(entity)) continue;
      present.add(id);
      const next = inputs(id);
      const ticket = this.tickets.get(id);
      if (!ticket) this.tickets.set(id, { inputs: next, dirty: true, wallAt: 0, simAt: Infinity });
      else if (
        next.length !== ticket.inputs.length ||
        next.some((value, i) => value !== ticket.inputs[i])
      ) {
        ticket.inputs = next;
        ticket.dirty = true;
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
      ticket.wallAt = wallAt;
      ticket.dirty = true;
    }
  }

  inspected(id: string, simAt = Infinity): void {
    const ticket = this.tickets.get(id);
    if (ticket) {
      ticket.dirty = false;
      ticket.simAt = simAt;
    }
  }

  wake(id: string): void {
    const ticket = this.tickets.get(id);
    if (ticket) ticket.dirty = true;
  }
}
