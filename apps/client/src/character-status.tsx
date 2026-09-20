import { createRoot, type Root } from 'react-dom/client';
import type { GameView } from '@open-legend/protocol';
type Tone = 'gain' | 'loss' | 'neutral';
type Entry = {
  id: string;
  text: string;
  expires: number;
  progress?: number;
  timing?: { elapsed: number; duration: number; rate: number; at: number };
};
export type StatusPresentation = {
  text: string;
  progress?: number;
  timing?: { elapsedSeconds: number; durationSeconds: number; rate: number };
};
/** Scene adapter: React owns the markup; the renderer supplies public screen coordinates. */
export class CharacterStatuses {
  private readonly layer = document.createElement('div');
  private readonly root: Root;
  private queues = new Map<string, { entries: Entry[] }>();
  private previous: GameView | null = null;
  private seen = new Set<string>();
  private activityId: string | null = null;
  private hadVisibleStatuses = false;
  constructor(canvas: HTMLCanvasElement) {
    this.layer.className = 'ol-status-layer';
    canvas.after(this.layer);
    this.root = createRoot(this.layer);
  }
  upsert(entityId: string, statusId: string, status: StatusPresentation) {
    if (!status.text.trim()) return;
    if (status.progress !== undefined && status.progress >= 1) {
      this.remove(entityId, statusId);
      return;
    }
    let queue = this.queues.get(entityId);
    if (!queue) {
      queue = { entries: [] };
      this.queues.set(entityId, queue);
    }
    let entry = queue.entries.find((e) => e.id === statusId);
    if (!entry) {
      entry = { id: statusId, text: status.text, expires: performance.now() + 4000 };
      queue.entries.unshift(entry);
    }
    entry.text = status.text.slice(0, 240);
    entry.progress = status.progress;
    if (status.progress !== undefined || status.timing) {
      entry.expires = Infinity;
      if (status.timing) {
        const old = entry.timing;
        if (
          !old ||
          old.duration !== status.timing.durationSeconds ||
          old.rate !== status.timing.rate
        )
          entry.timing = {
            elapsed: old ? this.elapsed(entry, performance.now()) : status.timing.elapsedSeconds,
            duration: status.timing.durationSeconds,
            rate: status.timing.rate,
            at: performance.now(),
          };
      }
    }
    let notices = 0;
    queue.entries = queue.entries.filter((e) => !Number.isFinite(e.expires) || ++notices <= 3);
  }
  enqueue(entityId: string, text: string, _tone: Tone = 'neutral') {
    this.upsert(entityId, crypto.randomUUID(), { text });
  }
  remove(entityId: string, statusId: string) {
    const queue = this.queues.get(entityId);
    if (queue) queue.entries = queue.entries.filter((e) => e.id !== statusId);
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

  private elapsed(entry: Entry, now: number) {
    const t = entry.timing!;
    return Math.min(t.duration, t.elapsed + (Math.max(0, now - t.at) / 1000) * t.rate);
  }
  update(project: (id: string) => { x: number; y: number } | null) {
    const now = performance.now();
    for (const [id, q] of this.queues) {
      q.entries = q.entries.filter((e) => now < e.expires);
      if (!q.entries.length) this.queues.delete(id);
    }
    if (!this.queues.size && !this.hadVisibleStatuses) return;
    this.hadVisibleStatuses = this.queues.size > 0;
    this.root.render(
      <div aria-label="Character updates" aria-live="polite">
        {[...this.queues].map(([id, q]) => {
          const point = project(id);
          if (!point) return null;
          return (
            <div key={id} className="ol-status-stack" style={{ left: point.x, top: point.y - 12 }}>
              {q.entries.map((e, index) => {
                const p = e.timing
                  ? e.timing.duration
                    ? this.elapsed(e, now) / e.timing.duration
                    : 0
                  : e.progress;
                return (
                  <div key={e.id} className="ol-status-line" data-age={Math.min(index, 2)}>
                    <span>{e.text}</span>
                    {p !== undefined && (
                      <div
                        className="ol-status-progress"
                        role="progressbar"
                        aria-label={e.text}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(p * 100)}
                      >
                        <span style={{ transform: `scaleX(${p})` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>,
    );
  }
  private clear() {
    this.queues.clear();
  }
  destroy() {
    this.clear();
    this.root.unmount();
    this.layer.remove();
  }
}
