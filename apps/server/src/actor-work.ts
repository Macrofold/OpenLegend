import { entityGet } from '@open-legend/domain';
import {
  actorDependencies,
  dependenciesCurrent,
  hasMemory,
  type Dependency,
  type WorldState,
} from '@open-legend/domain';
import { countMetric, gaugeMetric, profilingEnabled } from './performance.js';

/** Why a character may need to reconsider. A reason is a scheduling hint for one coalesced
 * ticket, never evidence, permission or a promised model call. Evidence stays in its
 * authoritative store; the authority generation is the ticket scope (the restore generation).
 * docs/events-perception-and-reactions.md#9-reaction-intake-and-scheduling
 */
export const INTAKE_REASONS = [
  /** An interactive request addressed to this character; served by the interactive path. */
  'directed-speech',
  /** Newly committed awareness, memory or summary for this character. */
  'evidence',
  /** What the character currently perceives changed: arrival, departure, moved or changed source. */
  'exposure',
  /** An owner-private body or attribute condition episode changed. */
  'condition',
  /** Goal, plan, knowledge, mind, capability, possession or policy changed. */
  'state',
  /** A configured review deadline became due on the simulation clock. */
  'reminder',
  /** An actor-permitted action or invention result. Seam only: AG07 producers keep their
   * current path until they are wired here. */
  'result',
] as const;
export type IntakeReason = (typeof INTAKE_REASONS)[number];
/** How an inspected opportunity ended: routed toward reasoning, natively deferred (for
 * example asleep) or unchanged since its last attempt. */
export type IntakeOutcome = 'admitted' | 'deferred' | 'unchanged';
/** One trusted cause. Its evidence stays in the authoritative record (event, awareness or
 * condition episode); the ticket keeps only the coalesced cause and ordering hint. Simulation
 * deadlines come from the inspecting caller (`inspected` simAt), never from wall time. */
export interface IntakeSignal {
  reason: IntakeReason;
  /** 0–10 ordering hint from the trusted producer; never raises spending or concurrency. */
  urgency?: number;
}

export interface WorkCapture {
  generation: number;
  scope: string;
  dependencies: readonly Dependency[];
  inputs: readonly unknown[];
  /** Reasons pending when the read began; acknowledgement clears only these. */
  reasons: ReadonlySet<IntakeReason>;
  /** Identity shortcut only; an optional inspection must not retain an old world. */
  world: WeakRef<WorldState>;
}

/** Wake inputs plus the reason each position represents and the most urgent new cause. */
export interface IntakeInputs {
  values: unknown[];
  reasons: readonly IntakeReason[];
  urgency?: number;
}

interface Work {
  order: number;
  inputs: unknown[];
  dirty: boolean;
  wallAt: number;
  simAt: number;
  generation: number;
  /** Wall time this ticket first became dirty since its last acknowledgement (queue age). */
  dirtySince?: number;
  /** Coalesced pending causes; a repeated cause never creates a second entry. */
  reasons: Set<IntakeReason>;
  /** Highest producer urgency among pending causes. */
  urgency: number;
  dependencies?: readonly Dependency[];
  /** Save containing the latest relevant input change, not each subsequent poll. */
  durabilityTicket?: number;
}

export interface WorkDurability {
  capture(): number;
  current(ticket: number): boolean;
}

/** Fairness bounds for choosing which pending characters to inspect. Scheduling hints only:
 * they never raise model concurrency or spending (docs/limits/native-work.md#nw14). */
export const INTAKE_LIMITS = {
  /** Bound schedule reads before any asynchronous fan-out. */
  readsPerPass: 64,
  /** Producer urgency at or above this value is inspected before ordinary waiting work. */
  urgent: 7,
  /** Ordinary work waiting this long competes with urgent work by wait time, so a stream
   * of urgent characters cannot starve the others. */
  agingMs: 10_000,
} as const;

/** The one coalesced per-character reaction intake; no separate event queue or model loop.
 * Autonomous cognition, maintenance and interactive requests record their causes here.
 * docs/architecture.md#change-driven-exposure-and-reaction-intake
 */
export class ActorWork {
  /** Aggregate-only metric prefix; counts never name actors or private evidence. The clock
   * must be the one callers pass to `ready`, so queue age never mixes two time sources. */
  constructor(
    private readonly label = 'work',
    private readonly clock: () => number = Date.now,
    private readonly durability?: WorkDurability,
  ) {}
  private worldId?: string;
  private scope?: string;
  private nextGeneration = 0;
  private readonly tickets = new Map<string, Work>();
  private readonly readyIds = new Set<string>();
  private readonly wallDeadlines = new DeadlineIndex();
  private readonly simDeadlines = new DeadlineIndex();
  private nextOrder = 0;
  private inputs?: (id: string, world: WorldState, verify?: boolean) => IntakeInputs | unknown[];
  /** Local accounting by cause and outcome; aggregate metrics only leave this object. */
  readonly stats = {
    wakes: Object.fromEntries(INTAKE_REASONS.map((reason) => [reason, 0])) as Record<
      IntakeReason,
      number
    >,
    inspected: 0,
    inspectionFailed: 0,
    readCap: 0,
    maxWaitMs: 0,
    /** Records read above the considered-evidence cursor during inspections. */
    evidenceRead: 0,
    outcomes: { admitted: 0, deferred: 0, unchanged: 0 } as Record<IntakeOutcome, number>,
  };

  /** Release captured private inputs and deadline membership on shutdown or
   * population replacement; counters and generation allocation remain monotonic. */
  clear(): void {
    this.tickets.clear();
    this.readyIds.clear();
    this.wallDeadlines.clear();
    this.simDeadlines.clear();
    this.worldId = undefined;
    this.scope = undefined;
    this.inputs = undefined;
  }

  /** Aggregate accounting for one inspection's result; never names actors or evidence. */
  recordOutcome(outcome: IntakeOutcome, evidenceRead = 0): void {
    this.stats.outcomes[outcome]++;
    this.stats.evidenceRead += evidenceRead;
    if (profilingEnabled()) countMetric(`intake.${this.label}.${outcome}`);
    if (evidenceRead && profilingEnabled())
      countMetric(`intake.${this.label}.evidenceRead`, evidenceRead);
  }

  refresh(
    world: WorldState,
    /** `verify` reads compare only; they must not advance any change baseline. */
    inputs: (id: string, world: WorldState, verify?: boolean) => IntakeInputs | unknown[],
    scope = world.id,
    actorIds?: Iterable<string>,
    /** Changed-character reads never retire characters omitted from that subset. */
    completePopulation = true,
  ): void {
    if (this.worldId !== world.id || this.scope !== scope) {
      this.clear();
      this.worldId = world.id;
      this.scope = scope;
    }
    this.inputs = inputs;
    const present = new Set<string>();
    const now = this.clock();
    for (const id of actorIds ?? Object.keys(world.minds ?? {})) {
      const entity = entityGet(world.entities, id);
      if (!entity?.actor?.alive || !hasMemory(entity)) continue;
      present.add(id);
      const next = intakeInputs(inputs(id, world));
      const ticket = this.tickets.get(id);
      if (!ticket) {
        this.tickets.set(id, {
          order: ++this.nextOrder,
          inputs: next.values,
          dirty: true,
          dirtySince: now,
          wallAt: 0,
          simAt: Infinity,
          generation: ++this.nextGeneration,
          reasons: new Set(['state']),
          urgency: next.urgency ?? 0,
          durabilityTicket: this.durability?.capture(),
        });
        this.readyIds.add(id);
        this.stats.wakes.state++;
        continue;
      }
      let changed = next.values.length !== ticket.inputs.length;
      for (let i = 0; i < next.values.length; i++)
        if (next.values[i] !== ticket.inputs[i]) {
          changed = true;
          this.note(ticket, next.reasons[i] ?? 'state');
        }
      if (ticket.dependencies && !dependenciesCurrent(world, ticket.dependencies, scope)) {
        changed = true;
        this.note(ticket, 'state');
      }
      if (changed) {
        ticket.durabilityTicket = this.durability?.capture();
        ticket.inputs = next.values;
        ticket.urgency = Math.max(ticket.urgency, next.urgency ?? 0);
        this.markDirty(ticket, now);
        ticket.generation = ++this.nextGeneration;
        this.schedule(id, ticket);
      }
    }
    if (profilingEnabled()) countMetric(`intake.${this.label}.inputScans`, present.size);
    if (completePopulation)
      for (const id of this.tickets.keys()) if (!present.has(id)) this.retire(id);
  }

  /** Explicit subset update; the full-population refresh remains the conservative
   * route for producers whose affected-character coverage is incomplete. */
  refreshAffected(world: WorldState, ids: Iterable<string>): void {
    if (!this.inputs || !this.scope || this.worldId !== world.id)
      throw new Error('Reconcile the complete character population before a subset refresh.');
    const inputs = this.inputs;
    const scope = this.scope;
    const affected = [...ids];
    this.refresh(world, inputs, scope, affected, false);
    for (const id of affected)
      if (!entityGet(world.entities, id)?.actor?.alive || !hasMemory(entityGet(world.entities, id)))
        this.retire(id);
  }

  private retire(id: string): void {
    this.tickets.delete(id);
    this.readyIds.delete(id);
    this.wallDeadlines.delete(id);
    this.simDeadlines.delete(id);
  }

  private schedule(id: string, ticket: Work): void {
    this.readyIds.delete(id);
    this.wallDeadlines.delete(id);
    this.simDeadlines.delete(id);
    if (ticket.dirty) {
      if (ticket.wallAt > 0) this.wallDeadlines.set(id, ticket.wallAt);
      else this.readyIds.add(id);
    } else if (Number.isFinite(ticket.simAt)) this.simDeadlines.set(id, ticket.simAt);
  }

  private note(ticket: Work, reason: IntakeReason): void {
    if (!ticket.reasons.has(reason)) this.stats.wakes[reason]++;
    ticket.reasons.add(reason);
  }

  private markDirty(ticket: Work, now = this.clock()): void {
    if (!ticket.dirty || ticket.dirtySince === undefined) ticket.dirtySince = now;
    ticket.dirty = true;
  }

  /** Pending characters to inspect, most deserving first: urgent or long-waiting work by
   * wait time, then the rest by wait time. Insertion order breaks ties deterministically.
   * A ticket whose read keeps failing keeps its age and cannot hide others: the caller
   * inspects every returned character until one is admitted. */
  ready(now: number, simTime: number, eligible: (id: string) => boolean = () => true): string[] {
    for (const id of this.simDeadlines.takeDue(simTime)) {
      const ticket = this.tickets.get(id)!;
      if (now < ticket.wallAt) this.wallDeadlines.set(id, ticket.wallAt);
      else this.readyIds.add(id);
    }
    for (const id of this.wallDeadlines.takeDue(now)) this.readyIds.add(id);
    let waiting = 0,
      oldest = Infinity;
    const candidates: Array<{ id: string; rank: number; since: number; order: number }> = [];
    for (const id of this.readyIds) {
      const ticket = this.tickets.get(id)!;
      const due = !ticket.dirty && simTime >= ticket.simAt;
      if (now < ticket.wallAt || !(ticket.dirty || due) || !this.isDurable(ticket) || !eligible(id))
        continue;
      // A due deadline starts waiting now, so it ages and cannot sort behind dirty work forever.
      if (due) {
        this.note(ticket, 'reminder');
        this.markDirty(ticket, now);
      }
      const since = ticket.dirtySince ?? now;
      // Queue age counts only work that could be inspected now, not ineligible characters.
      waiting++;
      oldest = Math.min(oldest, since);
      const urgent = ticket.urgency >= INTAKE_LIMITS.urgent || now - since >= INTAKE_LIMITS.agingMs;
      candidates.push({ id, rank: urgent ? 0 : 1, since, order: ticket.order });
    }
    const wait = waiting ? Math.max(0, now - oldest) : 0;
    this.stats.maxWaitMs = Math.max(this.stats.maxWaitMs, wait);
    if (profilingEnabled()) gaugeMetric(`intake.${this.label}.waiting`, waiting);
    if (profilingEnabled()) gaugeMetric(`intake.${this.label}.oldestWaitMs`, wait);
    candidates.sort((a, b) => a.rank - b.rank || a.since - b.since || a.order - b.order);
    if (candidates.length > INTAKE_LIMITS.readsPerPass) {
      this.stats.readCap++;
      if (profilingEnabled()) countMetric(`intake.${this.label}.readCap`);
    }
    return candidates.slice(0, INTAKE_LIMITS.readsPerPass).map((candidate) => candidate.id);
  }

  /** Pending causes and queue age for one character (diagnostics and trigger selection). */
  pending(id: string): { reasons: IntakeReason[]; urgency: number; since?: number } | undefined {
    const ticket = this.tickets.get(id);
    return ticket
      ? { reasons: [...ticket.reasons], urgency: ticket.urgency, since: ticket.dirtySince }
      : undefined;
  }

  defer(id: string, wallAt: number): void {
    const ticket = this.tickets.get(id);
    if (ticket) {
      if (ticket.wallAt !== wallAt || !ticket.dirty) ticket.generation = ++this.nextGeneration;
      ticket.wallAt = wallAt;
      this.markDirty(ticket);
      this.schedule(id, ticket);
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
          reasons: new Set(ticket.reasons),
          world: new WeakRef(world),
        }
      : undefined;
  }

  /** A completed read acknowledges only its captured inputs, never a newer wake.
   * docs/projects/completed/dependency-invalidation-tech-design.md#4-revision-safe-compute-install-and-acknowledgment
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
      this.isDurable(ticket) &&
      this.scope === scope &&
      capture.scope === scope &&
      dependenciesCurrent(current, capture.dependencies, scope) &&
      !!entityGet(current.entities, id)?.actor?.alive &&
      hasMemory(entityGet(current.entities, id)) &&
      (current === capture.world.deref() || this.sameInputs(id, capture.inputs, current))
    ) {
      ticket.dependencies = capture.dependencies;
      ticket.dirty = false;
      ticket.dirtySince = undefined;
      for (const reason of capture.reasons) ticket.reasons.delete(reason);
      ticket.urgency = 0;
      ticket.simAt = simAt;
      ticket.order = ++this.nextOrder;
      this.schedule(id, ticket);
      this.tickets.delete(id);
      this.tickets.set(id, ticket);
      this.stats.inspected++;
      return true;
    }
    if (ticket) {
      this.markDirty(ticket);
      this.schedule(id, ticket);
    }
    this.stats.inspectionFailed++;
    if (profilingEnabled()) countMetric(`intake.${this.label}.inspectionFailed`);
    return false;
  }

  private sameInputs(id: string, captured: readonly unknown[], world: WorldState): boolean {
    const inputs = this.inputs && intakeInputs(this.inputs(id, world, true)).values;
    return (
      !!inputs && inputs.length === captured.length && inputs.every((v, i) => v === captured[i])
    );
  }

  /** Record a trusted cause for one character. Coalesces with any pending wake, keeps the
   * ticket's queue age and never acknowledges or discards earlier causes. */
  wake(id: string, signal: IntakeSignal = { reason: 'state' }): void {
    const ticket = this.tickets.get(id);
    if (ticket) {
      ticket.durabilityTicket = this.durability?.capture();
      this.note(ticket, signal.reason);
      ticket.urgency = Math.max(ticket.urgency, signal.urgency ?? 0);
      this.markDirty(ticket);
      ticket.generation = ++this.nextGeneration;
      this.schedule(id, ticket);
    }
  }

  private isDurable(ticket: Work): boolean {
    return (
      ticket.durabilityTicket === undefined ||
      this.durability?.current(ticket.durabilityTicket) === true
    );
  }
}

/** One indexed entry per character: replacing a deadline removes its predecessor,
 * so deferrals cannot accumulate stale heap nodes. These are derived local clocks,
 * never saved authority or another model queue. */
class DeadlineIndex {
  private readonly heap: Array<{ id: string; at: number }> = [];
  private readonly positions = new Map<string, number>();
  clear(): void {
    this.heap.length = 0;
    this.positions.clear();
  }
  set(id: string, at: number): void {
    this.delete(id);
    if (!Number.isFinite(at)) return;
    this.positions.set(id, this.heap.length);
    this.heap.push({ id, at });
    this.up(this.heap.length - 1);
  }
  delete(id: string): void {
    const index = this.positions.get(id);
    if (index === undefined) return;
    const last = this.heap.pop()!;
    this.positions.delete(id);
    if (index === this.heap.length) return;
    this.heap[index] = last;
    this.positions.set(last.id, index);
    const moved = this.up(index);
    this.down(moved);
  }
  takeDue(at: number): string[] {
    const ids: string[] = [];
    while (this.heap[0] && this.heap[0]!.at <= at) {
      const id = this.heap[0]!.id;
      this.delete(id);
      ids.push(id);
    }
    return ids;
  }
  private swap(a: number, b: number): void {
    const left = this.heap[a]!,
      right = this.heap[b]!;
    this.heap[a] = right;
    this.heap[b] = left;
    this.positions.set(left.id, b);
    this.positions.set(right.id, a);
  }
  private up(start: number): number {
    let index = start;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.heap[parent]!.at <= this.heap[index]!.at) break;
      this.swap(parent, index);
      index = parent;
    }
    return index;
  }
  private down(start: number): void {
    let index = start;
    while (index * 2 + 1 < this.heap.length) {
      let next = index * 2 + 1;
      if (next + 1 < this.heap.length && this.heap[next + 1]!.at < this.heap[next]!.at) next++;
      if (this.heap[index]!.at <= this.heap[next]!.at) break;
      this.swap(index, next);
      index = next;
    }
  }
}

function intakeInputs(value: IntakeInputs | unknown[]): IntakeInputs {
  return Array.isArray(value) ? { values: value, reasons: [] } : value;
}
