import { namePhrase } from '@open-legend/language';
import { createRoot, type Root } from 'react-dom/client';
import type { AttributeView, GameView } from '@open-legend/protocol';
import { reactionNotice } from './reaction-notices';
import { captionScope } from './speech-captions';
type Tone = 'gain' | 'loss' | 'neutral';
type Entry = {
  id: string;
  text: string;
  /** Gesture notices: styled apart from status text; `actor` names who acted for screen readers. */
  kind?: 'reaction';
  actor?: string;
  expires: number;
  progress?: number;
  timing?: { elapsed: number; duration: number; rate: number; at: number };
  progressNode?: HTMLSpanElement;
  progressMeter?: HTMLDivElement;
};
export type StatusPresentation = {
  text: string;
  kind?: 'reaction';
  actor?: string;
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
  private destroyed = false;
  private dirty = false;
  private project?: (id: string) => { x: number; y: number } | null;
  private anchors = new Map<string, { id: string; node: HTMLDivElement; offset: number }>();
  private projected = new Map<string, { x: number; y: number } | null>();
  private health = new Map<
    string,
    { meter: AttributeView; until: number; shown: boolean; name: string }
  >();
  private deltas = new Map<string, { value: number; until: number }>();
  constructor(canvas: HTMLCanvasElement) {
    this.layer.className = 'ol-status-layer';
    canvas.after(this.layer);
    this.root = createRoot(this.layer);
  }
  upsert(entityId: string, statusId: string, status: StatusPresentation) {
    if (this.destroyed) return;
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
      entry = {
        id: statusId,
        text: status.text,
        kind: status.kind,
        actor: status.actor,
        expires: performance.now() + 4000,
      };
      queue.entries.unshift(entry);
    }
    entry.text = status.text.slice(0, 240);
    this.dirty = true;
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
    this.dirty = true;
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
    if (this.destroyed) return;
    const previous = this.previous;
    this.previous = view;
    // A control, timeline or history change starts a new baseline so old events are not
    // replayed as live notices (docs/perceived-world-events.md#5-invalidation-and-privacy).
    if (!previous || captionScope(previous) !== captionScope(view)) {
      this.clear();
      this.seen = new Set(view.events.map((event) => event.id));
      this.activityId = null;
      this.observeMeters(view);
      this.observeActivity(view);
      return;
    }
    this.observeActivity(view);
    this.observeMeters(view, previous);
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
      'fire-lit',
      'fire-fueled',
      'fire-extinguished',
      'item-offered',
      'offer-accepted',
      'offer-declined',
      'offer-withdrawn',
      'offer-expired',
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
      const reaction = reactionNotice(view, event);
      if (reaction) {
        this.upsert(event.actorId!, `event:${event.id}`, { ...reaction, kind: 'reaction' });
        continue;
      }
      if (!event.actorId || !statusTypes.has(event.type)) continue;
      const actor =
        event.actorId === view.player.id
          ? view.player
          : view.entities.find((entity) => entity.id === event.actorId);
      if (!actor) continue;
      const actorName = (['definite', 'indefinite'] as const)
        .map((article) => namePhrase(actor, article, { capitalize: true }))
        .find((name) => event.text.startsWith(`${name} `));
      let text = actorName ? event.text.slice(actorName.length + 1) : event.text;
      if (event.type === 'crafted') text = text.replace(/^made /, 'Crafted ');
      this.enqueue(event.actorId, text.charAt(0).toUpperCase() + text.slice(1));
    }
    // Keep only a bounded deduplication horizon; older snapshots are rejected upstream.
    if (this.seen.size > 600) this.seen = new Set([...this.seen].slice(-300));
  }

  private observeMeters(view: GameView, previous?: GameView): void {
    const subjects = (state: GameView) => [state.player, ...state.entities];
    const before = new Map(subjects(previous ?? view).map((entity) => [entity.id, entity]));
    const visible = new Set<string>();
    const known = new Set<string>();
    const now = performance.now();
    for (const entity of subjects(view)) {
      for (const meter of entity.attributes ?? []) {
        if (meter.status !== 'known') continue;
        const key = `stat:${entity.id}:${meter.id}`;
        known.add(key);
        const old = before
          .get(entity.id)
          ?.attributes?.find((attribute) => attribute.id === meter.id);
        if (old && old.version !== meter.version) {
          this.remove(entity.id, key);
          this.deltas.delete(key);
        }
        if (typeof meter.value !== 'number') {
          if (
            previous &&
            old?.status === 'known' &&
            old.version === meter.version &&
            old.value !== meter.value
          )
            this.upsert(entity.id, `stat:${entity.id}:${meter.id}`, {
              text: `${meter.name}: ${String(meter.value)}`,
            });
          continue;
        }
        const delta =
          old?.status === 'known' && old.version === meter.version && typeof old.value === 'number'
            ? meter.value - old.value
            : 0;
        if (meter.bodyHealth) {
          visible.add(entity.id);
          const priorHealth = this.health.get(entity.id);
          const retained =
            priorHealth?.meter.id === meter.id && priorHealth.meter.version === meter.version
              ? priorHealth
              : undefined;
          const name = namePhrase(entity, 'definite');
          // Unrelated snapshots and movement do not change health-bar content. Visibility
          // and expiry are reconciled by update; frame painting owns its position.
          if (
            !retained ||
            retained.name !== name ||
            retained.meter.name !== meter.name ||
            retained.meter.value !== meter.value ||
            retained.meter.min !== meter.min ||
            retained.meter.max !== meter.max
          )
            this.dirty = true;
          this.health.set(entity.id, {
            meter,
            until: delta !== 0 ? now + 4000 : (retained?.until ?? 0),
            shown: retained?.shown ?? false,
            name,
          });
        }
        if (!delta || !previous) continue;
        // Reuse one notice per meter, accumulating continuous drift instead of flooding
        // the character's three transient slots with each network update.
        const pending = this.deltas.get(key);
        const total = (pending && pending.until > now ? pending.value : 0) + delta;
        const until = pending && pending.until > now ? pending.until : now + 4000;
        this.deltas.set(key, { value: total, until });
        const rounded = Math.round(Math.abs(total) * 100) / 100;
        if (!rounded) {
          this.remove(entity.id, key);
          continue;
        }
        this.upsert(entity.id, key, {
          text: `${total > 0 ? '+' : '−'}${rounded}${meter.unit ? `${meter.unit === '%' ? '' : ' '}${meter.unit}` : ''} ${meter.name}`,
        });
        const entry = this.queues.get(entity.id)?.entries.find((entry) => entry.id === key);
        if (entry) entry.expires = until;
      }
    }
    for (const id of this.health.keys())
      if (!visible.has(id)) {
        this.health.delete(id);
        this.dirty = true;
      }
    for (const [key, delta] of this.deltas)
      if (delta.until <= now || !known.has(key)) this.deltas.delete(key);
    for (const [id, queue] of this.queues)
      for (const entry of queue.entries)
        if (entry.id.startsWith('stat:') && !known.has(entry.id)) this.remove(id, entry.id);
  }

  private elapsed(entry: Entry, now: number) {
    const t = entry.timing!;
    return Math.min(t.duration, t.elapsed + (Math.max(0, now - t.at) / 1000) * t.rate);
  }
  update(project: (id: string) => { x: number; y: number } | null) {
    if (this.destroyed) return;
    this.project = project;
    const now = performance.now();
    for (const [id, q] of this.queues) {
      if (q.entries.some((e) => now >= e.expires)) {
        q.entries = q.entries.filter((e) => now < e.expires);
        this.dirty = true;
      }
      if (!q.entries.length) this.queues.delete(id);
    }
    for (const health of this.health.values()) {
      const shown =
        typeof health.meter.value === 'number' &&
        health.meter.max !== undefined &&
        (health.meter.value < health.meter.max || health.until > now);
      if (shown !== health.shown) {
        health.shown = shown;
        this.dirty = true;
      }
    }
    if (this.dirty) {
      this.dirty = false;
      this.render(now);
    }
    this.paint(now);
  }
  private anchor(key: string, id: string, node: HTMLDivElement | null, offset = 0) {
    if (this.destroyed && node) return;
    if (node) {
      this.anchors.set(key, { id, node, offset });
      this.place(node, this.project?.(id) ?? null, offset);
    } else this.anchors.delete(key);
  }
  private place(node: HTMLDivElement, point: { x: number; y: number } | null, offset: number) {
    node.hidden = !point;
    if (!point) return;
    const x = `${point.x}px`,
      y = `${point.y + offset}px`;
    if (node.style.left !== x) node.style.left = x;
    if (node.style.top !== y) node.style.top = y;
  }
  /** React owns content changes; frame callbacks only paint positions and work fractions,
   * following the existing speech-caption and status-marker presentation pattern. */
  private paint(now: number) {
    if (!this.project) return;
    const points = this.projected;
    points.clear();
    for (const { id, node, offset } of this.anchors.values()) {
      if (!points.has(id)) points.set(id, this.project(id));
      this.place(node, points.get(id) ?? null, offset);
    }
    for (const queue of this.queues.values())
      for (const entry of queue.entries) {
        if (!entry.timing || !entry.progressNode || !entry.progressMeter) continue;
        const fraction = entry.timing.duration
          ? this.elapsed(entry, now) / entry.timing.duration
          : 0;
        const scale = `scaleX(${fraction})`;
        if (entry.progressNode.style.transform !== scale)
          entry.progressNode.style.transform = scale;
        const value = String(Math.round(fraction * 100));
        if (entry.progressMeter.getAttribute('aria-valuenow') !== value)
          entry.progressMeter.setAttribute('aria-valuenow', value);
      }
  }
  private render(now: number) {
    this.root.render(
      <div aria-label="Character updates" aria-live="polite">
        {[...this.health].map(([id, { meter, shown, name }]) => {
          if (!shown || typeof meter.value !== 'number' || meter.max === undefined) return null;
          const minimum = meter.min ?? 0;
          const fraction = Math.max(
            0,
            Math.min(1, (meter.value - minimum) / (meter.max - minimum)),
          );
          return (
            <div
              key={`health:${id}`}
              className="ol-health-bar"
              ref={(node) => this.anchor(`health:${id}`, id, node)}
              role="meter"
              aria-label={`${name}: ${meter.name}`}
              aria-valuemin={minimum}
              aria-valuemax={meter.max}
              aria-valuenow={meter.value}
            >
              <span style={{ transform: `scaleX(${fraction})` }} />
            </div>
          );
        })}
        {[...this.queues].map(([id, q]) => {
          return (
            <div
              key={id}
              className="ol-status-stack"
              ref={(node) => this.anchor(`notices:${id}`, id, node, -12)}
            >
              {q.entries.map((e, index) => {
                const p = e.timing
                  ? e.timing.duration
                    ? this.elapsed(e, now) / e.timing.duration
                    : 0
                  : e.progress;
                return (
                  <div
                    key={e.id}
                    className="ol-status-line"
                    data-age={Math.min(index, 2)}
                    data-kind={e.kind}
                  >
                    {e.actor && <span className="ol-sr">{e.actor} </span>}
                    <span>{e.text}</span>
                    {p !== undefined && (
                      <div
                        className="ol-status-progress"
                        ref={(node) => {
                          e.progressMeter = node ?? undefined;
                        }}
                        role="progressbar"
                        aria-label={e.text}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(p * 100)}
                      >
                        <span
                          ref={(node) => {
                            e.progressNode = node ?? undefined;
                          }}
                          style={{ transform: `scaleX(${p})` }}
                        />
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
    this.dirty = true;
    this.queues.clear();
    this.health.clear();
    this.deltas.clear();
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.layer.remove();
    this.clear();
    this.previous = null;
    this.seen.clear();
    this.project = undefined;
    this.anchors.clear();
    this.projected.clear();
    // Scene teardown can run during the parent React root's cleanup. Remove the
    // private layer now, then release its nested root after that commit finishes.
    queueMicrotask(() => this.root.unmount());
  }
}
