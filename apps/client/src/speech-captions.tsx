import { createRoot, type Root } from 'react-dom/client';
import type { GameView, PublicEvent, PerceivedSpeech } from '@open-legend/protocol';
import { Icon } from './design-system/components';
import { ProgressRing, progressFraction } from './design-system/progress-ring';
import {
  PresentationClock,
  createLifetime,
  activateLifetime,
  sampleLifetime,
  type PresentationLifetime,
} from './ui-lifetime';
import type { SpeechCaptionOptions } from './world-renderer';
export type CaptionPoint = { x: number; y: number; arrow?: number };
export type CaptionProjection = {
  head(id: string): CaptionPoint | null;
  direction(speech: PerceivedSpeech, width: number, height: number): CaptionPoint | null;
  neutral(index: number): CaptionPoint;
  width: number;
  height: number;
};
type Entry = {
  event: PublicEvent & { speech: PerceivedSpeech };
  chunks: string[];
  chunk: number;
  lifetime: PresentationLifetime;
  visible: boolean;
  priority: number;
  lastVisibleAt: number;
  node?: HTMLDivElement;
  width: number;
  height: number;
  ring?: SVGCircleElement;
  arrow?: HTMLElement;
};
// Queue residence is separate from the ring's reading budget. Old hidden speech remains in history.
// docs/hearing-and-speech.md#7-caption-component-and-lifetime
const MAX_DEFERRED_MS = 60_000;
const segmenter = new Intl.Segmenter('und', { granularity: 'grapheme' });
/** Chunk only authorized text; hidden wording/length cannot change a caption's duration. */
function chunks(text: string): string[] {
  const graphemes = [...segmenter.segment(text)].map((s) => s.segment);
  const result: string[] = [];
  for (let start = 0; start < graphemes.length; ) {
    let end = Math.min(graphemes.length, start + 160);
    if (end < graphemes.length) {
      for (let i = end; i > start + 100; i--)
        if (/\s/.test(graphemes[i] ?? '')) {
          end = i;
          break;
        }
    }
    result.push(graphemes.slice(start, end).join('').trim());
    start = end;
  }
  return result.length ? result : [''];
}
const captionText = (event: PublicEvent & { speech: PerceivedSpeech }) =>
  event.speech.intelligibility === 'none'
    ? event.text
    : event.speech.segments
        .map((segment) => (segment.kind === 'heard' ? segment.text : '[…]'))
        .join(' ');

/** React owns text; the existing scene callback paints positions and fractions only. */
export class SpeechCaptions {
  private readonly layer = document.createElement('div');
  private readonly root: Root;
  private clock = new PresentationClock();
  private active: Entry[] = [];
  private pending: Entry[] = [];
  private seen = new Set<string>();
  private scope = '';
  private previousEvents?: PublicEvent[];
  private view?: GameView;
  private projection?: CaptionProjection;
  private dirty = false;
  private rebase = false;
  private options: SpeechCaptionOptions = {
    enabled: true,
    paused: false,
    readingScale: 1,
    uiScale: 1,
    reducedMotion: false,
  };
  private reducedMotion = false;
  private readonly resizeObserver: ResizeObserver;
  constructor(canvas: HTMLCanvasElement) {
    this.layer.className = 'ol-speech-layer';
    canvas.after(this.layer);
    this.root = createRoot(this.layer);
    this.resizeObserver = new ResizeObserver((changes) => {
      for (const change of changes) {
        const entry = this.active.find((candidate) => candidate.node === change.target);
        if (!entry) continue;
        const size = change.borderBoxSize[0];
        entry.width = size?.inlineSize ?? (change.target as HTMLElement).offsetWidth;
        entry.height = size?.blockSize ?? (change.target as HTMLElement).offsetHeight;
      }
      this.paint();
    });
    document.addEventListener('visibilitychange', this.visibility);
  }
  private visibility = () => {
    // Resume treats the next snapshot as history, not an avalanche of missed live captions.
    this.rebase = true;
    this.pending = [];
    this.clock.sample(performance.now(), true);
  };
  setOptions(options: SpeechCaptionOptions): void {
    const enabled = options.enabled;
    const wasEnabled = this.options.enabled;
    this.reducedMotion = options.reducedMotion;
    this.layer.style.setProperty('--caption-scale', String(options.uiScale));
    this.options = { ...options, readingScale: Math.max(0.5, Math.min(3, options.readingScale)) };
    if (!enabled && wasEnabled) this.clear();
  }
  resetBaseline(): void {
    this.clear();
    this.rebase = true;
  }
  observe(view: GameView): void {
    this.view = view;
    const scope = `${view.worldId}:${view.saveTimeline}:${view.player.id}:${view.historyEpoch}`;
    if (scope !== this.scope || (this.rebase && !document.hidden)) {
      if (scope !== this.scope) this.clear();
      this.scope = scope;
      this.seen = new Set(view.events.map((e) => e.id));
      this.previousEvents = view.events;
      this.rebase = false;
      return;
    }
    if (view.events === this.previousEvents) return;
    this.previousEvents = view.events;
    for (const event of view.events) {
      if (this.seen.has(event.id)) continue;
      this.seen.add(event.id);
      if (!event.speech || !this.options.enabled || document.hidden) continue;
      const speaker = event.speech.speaker?.entityId;
      const queueSize = speaker
        ? [...this.active, ...this.pending].filter(
            (e) => e.event.speech.speaker?.entityId === speaker,
          ).length
        : 0;
      // Overflow stays available in durable World Events; these are presentation limits only.
      if (queueSize >= 3) continue;
      const priority =
        event.speech.perception === 'self' || event.targetId === view.player.id ? 1 : 0;
      if (this.pending.length >= 24) {
        const evict = this.pending.findIndex((entry) => entry.priority < priority);
        if (evict < 0) continue;
        this.pending.splice(evict, 1);
      }
      const perceived = event as Entry['event'];
      const parts = chunks(captionText(perceived));
      this.pending.push({
        event: perceived,
        visible: false,
        lastVisibleAt: this.clock.now,
        priority,
        chunks: parts,
        chunk: 0,
        width: 0,
        height: 0,
        lifetime: this.lifetime(parts[0]!),
      });
    }
    this.pending.sort((a, b) => b.priority - a.priority);
    if (this.seen.size > 1024) this.seen = new Set([...this.seen].slice(-512));
  }
  private lifetime(text: string) {
    const readingMs = Math.max(text.trim().split(/\s+/).length * 300, [...text].length * 45);
    return createLifetime(
      Math.max(4000, Math.min(12000, 2000 + readingMs)) * this.options.readingScale,
    );
  }
  update(projection: CaptionProjection): void {
    this.projection = projection;
    const paused = this.options.paused || !!this.view?.clock.paused || document.hidden;
    const before = this.clock.now;
    const now = this.clock.sample(performance.now(), paused);
    // Never-fitting labels must not occupy the bounded queue forever. Pausing this clock
    // also pauses staleness; currently visible speech always keeps its reading lifetime.
    for (let i = this.pending.length - 1; i >= 0; i--)
      if (now - this.pending[i]!.lastVisibleAt >= MAX_DEFERRED_MS) this.pending.splice(i, 1);
    for (let i = this.active.length - 1; i >= 0; i--) {
      const entry = this.active[i]!;
      if (!entry.visible && now - entry.lastVisibleAt >= MAX_DEFERRED_MS) {
        this.active.splice(i, 1);
        this.dirty = true;
      }
    }
    // Hidden by layout is not reading time. Reuse this one clock; no per-caption timer.
    for (const entry of this.active)
      if (!entry.visible && entry.lifetime.startedAt !== null)
        entry.lifetime.startedAt += now - before;
    for (const entry of [...this.active]) {
      if (sampleLifetime(entry.lifetime, now).state !== 'expired') continue;
      if (++entry.chunk < entry.chunks.length) {
        entry.lifetime = this.lifetime(entry.chunks[entry.chunk]!);
        entry.visible = false;
      } else this.active = this.active.filter((e) => e !== entry);
      this.dirty = true;
    }
    if (this.options.enabled && !document.hidden) {
      for (let i = 0; this.active.length < 8 && i < this.pending.length; ) {
        const entry = this.pending[i]!;
        const speaker = entry.event.speech.speaker?.entityId;
        if (speaker && this.active.some((e) => e.event.speech.speaker?.entityId === speaker)) {
          i++;
          continue;
        }
        this.pending.splice(i, 1);
        this.active.push(entry);
        this.dirty = true;
      }
    }
    if (this.dirty) {
      this.dirty = false;
      this.root.render(
        <>
          {this.active.map((entry) => {
            const speech = entry.event.speech;
            return (
              <div
                key={`${entry.event.id}:${entry.chunk}`}
                className="ol-speech-caption"
                role={entry.chunk === 0 ? 'status' : undefined}
                aria-label={entry.chunk === 0 ? entry.event.text : undefined}
                aria-hidden={entry.chunk > 0 ? true : undefined}
                ref={(node) => {
                  if (entry.node) this.resizeObserver.unobserve(entry.node);
                  entry.node = node ?? undefined;
                  entry.width = entry.height = 0;
                  entry.visible = false;
                  if (node) this.resizeObserver.observe(node);
                }}
              >
                <div aria-hidden="true">
                  <div className="ol-speech-caption-meta">
                    <span>
                      {speech.speaker?.nameAtTime ?? 'Someone nearby'}
                      {speech.delivery === 'whisper'
                        ? ' · Whispering'
                        : speech.delivery === 'shout'
                          ? ' · Shouting'
                          : ''}
                      {speech.intelligibility === 'partial' ? ' · Partly heard' : ''}
                      {entry.chunks.length > 1
                        ? ` · ${entry.chunk + 1}/${entry.chunks.length}`
                        : ''}
                      {speech.perception === 'seen' ? ' · Seen' : ''}
                      {speech.direction?.elevation !== 'level' && speech.direction
                        ? ` · ${speech.direction.elevation}`
                        : ''}
                    </span>
                    <span
                      className="ol-speech-arrow"
                      ref={(node) => {
                        entry.arrow = node ?? undefined;
                      }}
                    >
                      ➜
                    </span>
                  </div>
                  <div className="ol-speech-caption-text">
                    {speech.perception !== 'seen' && <Icon name="ui.speech" size={16} />}
                    {speech.intelligibility === 'none'
                      ? entry.chunks[entry.chunk]
                      : `“${entry.chunks[entry.chunk]}”`}{' '}
                    <ProgressRing
                      fraction={1}
                      ref={(node) => {
                        entry.ring =
                          node?.querySelector<SVGCircleElement>('[data-progress-value]') ??
                          undefined;
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </>,
      );
    }
    this.paint();
  }
  private paint(): void {
    if (!this.projection) return;
    const p = this.projection;
    const occupied: Array<{ x: number; y: number; w: number; h: number }> = [];
    for (const [index, entry] of this.active.entries()) {
      const node = entry.node;
      if (!node) continue;
      const speech = entry.event.speech;
      const head = speech.speaker ? p.head(speech.speaker.entityId) : null;
      const { width, height } = entry;
      let point = head ?? p.direction(speech, width, height) ?? p.neutral(index);
      if (!width || !height) continue;
      if (
        point.x - width / 2 < 8 ||
        point.x + width / 2 > p.width - 8 ||
        point.y - height < 8 ||
        point.y > p.height - 8
      )
        point = p.neutral(index);
      // Small bounded stacking, not a second layout engine or an inferred source location.
      let y = point.y;
      for (let pass = 0; pass <= occupied.length; pass++) {
        const collision = occupied.find(
          (other) =>
            Math.abs(point.x - other.x) < (width + other.w) / 2 + 8 &&
            y > other.y - other.h - 8 &&
            y - height < other.y,
        );
        if (!collision) break;
        y = collision.y - collision.h - 8;
      }
      const fits =
        y - height >= 8 &&
        y <= p.height - 8 &&
        point.x - width / 2 >= 8 &&
        point.x + width / 2 <= p.width - 8;
      entry.visible = fits;
      if (fits) {
        entry.lastVisibleAt = this.clock.now;
        activateLifetime(entry.lifetime, this.clock.now);
      }
      node.style.visibility = fits ? 'visible' : 'hidden';
      node.style.transform = `translate(${point.x}px, ${y}px) translate(-50%, -100%)`;
      if (fits) occupied.push({ x: point.x, y, w: width, h: height });
      if (entry.arrow) {
        entry.arrow.style.display = point.arrow === undefined ? 'none' : 'inline-block';
        entry.arrow.style.transform = `rotate(${point.arrow ?? 0}rad)`;
      }
      const fraction = sampleLifetime(entry.lifetime, this.clock.now).remainingFraction;
      const draw = this.reducedMotion ? Math.ceil(fraction * 4) / 4 : fraction;
      entry.ring?.setAttribute('stroke-dashoffset', String((1 - progressFraction(draw)) * 100));
    }
  }
  private clear(): void {
    this.resizeObserver.disconnect();
    this.active = [];
    this.pending = [];
    this.clock = new PresentationClock();
    this.dirty = true;
  }
  destroy(): void {
    document.removeEventListener('visibilitychange', this.visibility);
    this.clear();
    this.root.unmount();
    this.layer.remove();
  }
}
