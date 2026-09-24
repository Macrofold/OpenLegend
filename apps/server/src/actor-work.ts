import { hasMemory, type WorldState } from '@open-legend/domain';

interface Work {
  inputs: unknown[];
  dirty: boolean;
  wallAt: number;
  simAt: number;
  version: number;
}

/** Existing coalesced intake; no separate event queue or model loop.
 * docs/architecture.md#change-driven-exposure-and-reaction-intake
 */
export class ActorWork {
  private worldId?: string;
  private lastWorld?: WorldState;
  private context?: unknown;
  private nextVersion = 0;
  private readonly tickets = new Map<string, Work>();

  refresh(world: WorldState, inputs: (id: string) => unknown[], context?: unknown): void {
    // Diagnostics and repeated scheduler checks of one snapshot are not new stimuli.
    if (this.lastWorld === world && this.context === context) return;
    this.lastWorld = world;
    this.context = context;
    if (this.worldId !== world.id) {
      this.tickets.clear();
      this.worldId = world.id;
    }
    const present = new Set<string>();
    for (const id of Object.keys(world.minds ?? {})) {
      const entity = world.entities[id];
      if (!entity?.actor?.alive || !hasMemory(entity)) continue;
      present.add(id);
      const next = inputs(id);
      const ticket = this.tickets.get(id);
      if (!ticket) this.tickets.set(id, { inputs: next, dirty: true, wallAt: 0,
        simAt: Infinity, version: ++this.nextVersion });
      else if (next.length !== ticket.inputs.length || next.some((value, i) => value !== ticket.inputs[i])) {
        ticket.inputs = next;
        ticket.dirty = true;
        ticket.version = ++this.nextVersion;
      }
    }
    for (const id of this.tickets.keys()) if (!present.has(id)) this.tickets.delete(id);
  }

  ready(now: number, simTime: number, eligible: (id: string) => boolean = () => true): string[] {
    const ready: string[] = [];
    for (const [id, ticket] of this.tickets) {
      if (now >= ticket.wallAt && (ticket.dirty || simTime >= ticket.simAt) && eligible(id)) ready.push(id);
      if (ready.length === 64) break; // Bound schedule reads before any asynchronous fan-out.
    }
    return ready;
  }
  version(id: string): number | undefined { return this.tickets.get(id)?.version; }

  defer(id: string, wallAt: number): void {
    const ticket = this.tickets.get(id);
    if (ticket) { ticket.wallAt = wallAt; ticket.dirty = true; }
  }

  inspected(id: string, simAt = Infinity, version = this.version(id)): void {
    const ticket = this.tickets.get(id);
    // A wake arriving during awaited work cannot be cleared by an older inspection.
    if (ticket && ticket.version === version) {
      ticket.dirty = false;
      ticket.simAt = simAt;
      this.tickets.delete(id);
      this.tickets.set(id, ticket);
    }
  }

  wake(id: string): void {
    const ticket = this.tickets.get(id);
    if (ticket) { ticket.dirty = true; ticket.version = ++this.nextVersion; }
  }
}
