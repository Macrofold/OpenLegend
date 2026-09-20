import type { GameView } from '@open-legend/protocol';

type Tone = 'gain' | 'loss' | 'neutral';
type Entry = {
  id: string;
  element: HTMLElement;
  label: HTMLElement;
  bar?: HTMLElement;
  expires: number;
  timing?: { elapsed: number; duration: number; rate: number; at: number };
};
export type StatusPresentation = {
  text: string;
  progress?: number;
  timing?: { elapsedSeconds: number; durationSeconds: number; rate: number };
};

/** Presentation-only, per-character notification queues. Producers may enqueue
 * plain text; only permitted public observations are ingested here. */
export class CharacterStatuses {
  private readonly layer = document.createElement('div');
  private queues = new Map<string, { element: HTMLElement; entries: Entry[] }>();
  private previous: GameView | null = null;
  private seen = new Set<string>();
  private activityId: string | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.layer.className = 'character-status-layer';
    this.layer.setAttribute('aria-live', 'polite');
    this.layer.setAttribute('aria-label', 'Character updates');
    canvas.after(this.layer);
  }

  /** Stable IDs allow any entity's producer to update progress without reordering. */
  upsert(entityId: string, statusId: string, status: StatusPresentation): void {
    if (!status.text.trim()) return;
    if (status.progress !== undefined && status.progress >= 1) {
      this.remove(entityId, statusId);
      return;
    }
    let queue = this.queues.get(entityId);
    if (!queue) {
      const element = document.createElement('div');
      element.className = 'character-status-stack';
      element.hidden = true;
      this.layer.append(element);
      queue = { element, entries: [] };
      this.queues.set(entityId, queue);
    }
    let entry = queue.entries.find((candidate) => candidate.id === statusId);
    if (!entry) {
      const element = document.createElement('div');
      element.className = 'character-status-line';
      const label = document.createElement('span');
      element.append(label);
      const transient = queue.entries.filter((candidate) => Number.isFinite(candidate.expires));
      entry = {
        id: statusId,
        element,
        label,
        expires: Math.max(performance.now() + 4000, (transient[0]?.expires ?? 0) + 900),
      };
      queue.entries.unshift(entry);
      queue.element.prepend(element);
      // Only transient notices are evictable; active work is removed by its producer.
      for (const excess of transient.slice(11)) {
        excess.element.remove();
        queue.entries = queue.entries.filter((candidate) => candidate !== excess);
      }
    }
    const text = status.text.slice(0, 240);
    if (entry.label.textContent !== text) entry.label.textContent = text;
    if (status.progress !== undefined || status.timing) {
      if (!entry.bar) {
        const track = document.createElement('div');
        track.className = 'status-progress';
        track.setAttribute('role', 'progressbar');
        track.setAttribute('aria-valuemin', '0');
        track.setAttribute('aria-valuemax', '100');
        entry.bar = document.createElement('i');
        track.append(entry.bar);
        entry.element.append(track);
      }
      const progress =
        status.progress !== undefined && Number.isFinite(status.progress)
          ? Math.max(0, Math.min(1, status.progress))
          : 0;
      if (status.timing) {
        const now = performance.now();
        const previous = entry.timing;
        // Keep one continuous time origin between snapshots. Rebase only when
        // the clock rate changes (pause/resume/speed), without snapping the fill.
        if (
          !previous ||
          previous.duration !== status.timing.durationSeconds ||
          previous.rate !== status.timing.rate
        ) {
          entry.timing = {
            elapsed: previous ? this.elapsed(entry, now) : status.timing.elapsedSeconds,
            duration: Math.max(0, status.timing.durationSeconds),
            rate: Math.max(0, status.timing.rate),
            at: now,
          };
        }
      } else {
        entry.timing = undefined;
        entry.bar.style.transform = `scaleX(${progress})`;
      }
      entry.bar.parentElement!.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
      entry.bar.parentElement!.setAttribute('aria-label', status.text);
      entry.expires = progress < 1 ? Infinity : Math.min(entry.expires, performance.now());
    }
  }

  enqueue(entityId: string, text: string, _tone: Tone = 'neutral'): void {
    this.upsert(entityId, crypto.randomUUID(), { text });
  }

  /** Cancellation/removal is explicit; inactivity alone never expires progress. */
  remove(entityId: string, statusId: string): void {
    const queue = this.queues.get(entityId);
    if (!queue) return;
    const entry = queue.entries.find((candidate) => candidate.id === statusId);
    if (entry) {
      entry.element.remove();
      queue.entries = queue.entries.filter((candidate) => candidate !== entry);
    }
  }

  private observeActivity(view: GameView): void {
    const action = view.player.action?.showStatus ? view.player.action : null;
    const id = action ? `activity:${action.id}` : null;
    if (this.activityId && this.activityId !== id) this.remove(view.player.id, this.activityId);
    this.activityId = id;
    if (action && id)
      this.upsert(view.player.id, id, {
        text: action.label,
        progress: action.progress,
        timing: {
          elapsedSeconds: action.elapsedSeconds,
          durationSeconds: action.durationSeconds,
          rate: action.advancing ? view.clock.baseRatio * view.clock.speed : 0,
        },
      });
  }

  observe(view: GameView): void {
    const previous = this.previous;
    this.previous = view;
    if (!previous || previous.worldId !== view.worldId) {
      this.clear();
      this.seen = new Set(view.events.map((event) => event.id));
      this.activityId = null;
      this.observeActivity(view);
      return;
    }
    this.observeActivity(view);
    const inventory = (state: GameView) => {
      const result = new Map<string, { name: string; quantity: number }>();
      for (const item of state.player.inventory) {
        const existing = result.get(item.definitionId);
        result.set(item.definitionId, {
          name: item.name,
          quantity: (existing?.quantity ?? 0) + item.quantity,
        });
      }
      return result;
    };
    const before = inventory(previous),
      after = inventory(view);
    for (const id of new Set([...before.keys(), ...after.keys()])) {
      const delta = (after.get(id)?.quantity ?? 0) - (before.get(id)?.quantity ?? 0);
      if (delta)
        this.enqueue(
          view.player.id,
          `${delta > 0 ? '+' : '−'}${Math.abs(delta)} ${after.get(id)?.name ?? before.get(id)!.name}`,
          delta > 0 ? 'gain' : 'loss',
        );
    }
    const statusTypes = new Set([
      'harvested',
      'crafted',
      'prepared',
      'cooked',
      'ate',
      'recovered',
      'equipped',
      'action-stopped',
      'incapacitated',
      'death',
      'taught',
      'shot',
      'character-status',
    ]);
    for (const event of view.events) {
      if (this.seen.has(event.id)) continue;
      this.seen.add(event.id);
      if (!event.actorId || !statusTypes.has(event.type)) continue;
      const actor =
        event.actorId === view.player.id
          ? view.player
          : view.entities.find((entity) => entity.id === event.actorId);
      if (!actor) continue;
      let text = event.text.startsWith(`${actor.name} `)
        ? event.text.slice(actor.name.length + 1)
        : event.text;
      if (event.type === 'crafted') text = text.replace(/^made /, 'Crafted ');
      this.enqueue(event.actorId, text.charAt(0).toUpperCase() + text.slice(1));
    }
    // Keep only a bounded deduplication horizon; older snapshots are rejected upstream.
    if (this.seen.size > 600) this.seen = new Set([...this.seen].slice(-300));
  }

  private elapsed(entry: Entry, now: number): number {
    const timing = entry.timing!;
    return Math.min(
      timing.duration,
      timing.elapsed + (Math.max(0, now - timing.at) / 1000) * timing.rate,
    );
  }

  update(project: (characterId: string) => { x: number; y: number } | null): void {
    const now = performance.now();
    for (const [id, queue] of this.queues) {
      queue.entries = queue.entries.filter((entry) => {
        if (entry.timing && entry.bar) {
          const progress =
            entry.timing.duration > 0 ? this.elapsed(entry, now) / entry.timing.duration : 0;
          entry.bar.style.transform = `scaleX(${progress})`;
          entry.bar.parentElement!.setAttribute(
            'aria-valuenow',
            String(Math.round(progress * 100)),
          );
        }
        if (now >= entry.expires + 600) {
          entry.element.remove();
          return false;
        }
        entry.element.classList.toggle('fading', now >= entry.expires);
        return true;
      });
      if (!queue.entries.length) {
        queue.element.remove();
        this.queues.delete(id);
        continue;
      }
      const point = project(id);
      queue.element.hidden = !point;
      if (point) {
        queue.element.style.left = `${point.x}px`;
        queue.element.style.top = `${point.y - 12}px`;
      }
      let offset = 0;
      for (const entry of [...queue.entries].reverse()) {
        const height = entry.bar ? 29 : 20;
        offset += height;
        entry.element.style.transform = `translate(-50%, ${-offset}px)`;
        offset += 5;
      }
    }
  }
  private clear(): void {
    for (const queue of this.queues.values()) queue.element.remove();
    this.queues.clear();
  }
  destroy(): void {
    this.clear();
    this.layer.remove();
  }
}
