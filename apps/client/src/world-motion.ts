import {
  distance3D,
  interpolate,
  surfaceById,
  surfaceContains,
  surfaceHeight,
  SPATIAL_LIMITS,
  type SpatialMap,
  type WorldPoint,
} from '@open-legend/spatial';
import type { ActionAnimation } from '@open-legend/protocol';

/** Display interpolation may lag a support change. Cross only a common physical seam;
 * never drop onto the underlying terrain just because it contains the interpolated XZ.
 * Missing intermediate movement after a large network jump snaps to authorized state rather
 * than inventing a path through a floor. docs/world-presentation.md#motion-and-depth
 */
export function interpolateVisualFoot(
  map: SpatialMap,
  from: WorldPoint,
  to: WorldPoint,
  fromSupport: string | null,
  toSupport: string | null,
  fraction: number,
): { point: WorldPoint; support: string | null } {
  const p = interpolate(from, to, Math.max(0, Math.min(1, fraction)));
  if (!fromSupport || !toSupport) {
    return { point: p, support: distance3D(p, to) < 1e-5 ? toSupport : null };
  }
  const a = surfaceById(map, fromSupport),
    b = surfaceById(map, toSupport);
  const snap = () => ({ point: { ...to }, support: toSupport });
  if (!a || !b) return snap();
  if (fromSupport !== toSupport) {
    const startDelta = surfaceHeight(a, from.x, from.z) - surfaceHeight(b, from.x, from.z);
    const endDelta = surfaceHeight(a, to.x, to.z) - surfaceHeight(b, to.x, to.z);
    if (Math.abs(startDelta - endDelta) > 1e-7) {
      const t = startDelta / (startDelta - endDelta),
        seam = interpolate(from, to, t);
      if (t < -1e-5 || t > 1 + 1e-5 || !surfaceContains(a, seam) || !surfaceContains(b, seam))
        return snap();
      const s = fraction < t ? a : b;
      if (!surfaceContains(s, p)) return snap();
      return { point: { ...p, y: surfaceHeight(s, p.x, p.z) }, support: s.id };
    }
    if (Math.abs(startDelta) > SPATIAL_LIMITS.supportTolerance) return snap();
  }
  const s = surfaceContains(b, p) ? b : surfaceContains(a, p) ? a : undefined;
  return s ? { point: { ...p, y: surfaceHeight(s, p.x, p.z) }, support: s.id } : snap();
}

export interface MotionSample {
  /** Game seconds of the snapshot that admitted this position. */
  time: number;
  point: WorldPoint;
  support: string | null;
}

const EASE_STEPS = 12;

/** One body's displayed travel: its admitted positions placed at their snapshot's game time and
 * played back slightly behind the newest, never ahead of it, so uneven server ticks no longer
 * pulse the displayed speed. Starts and stops are eased by averaging distance-along-path over a
 * short symmetric window with triangular weights: constant-speed travel stays exact, and instant
 * authoritative starts and stops become S-shaped speed ramps. An even average would ramp linearly
 * with abrupt corners. A position arriving longer than the caller's limit after the last snaps
 * the body there at once, never bridging unobserved movement.
 * docs/world-presentation.md#motion-and-depth */
export class MotionTrack {
  private samples: MotionSample[];
  /** Latest game time a snapshot confirmed the body still at its last sample. */
  private held: number;
  private readonly lengths: number[] = [0];
  constructor(first: MotionSample) {
    this.samples = [first];
    this.held = first.time;
  }
  get latest(): MotionSample {
    return this.samples[this.samples.length - 1]!;
  }
  /** Admit a new position; a time not after the last confirmation, or long after it, starts
   * again from it. */
  push(sample: MotionSample, longGap: number): void {
    const last = this.latest;
    if (sample.time <= this.held || sample.time - this.held > longGap) {
      this.reset(sample);
      return;
    }
    // Unchanged snapshots are not resent; the body was still until the last one confirming it.
    if (this.held > last.time) this.add({ ...last, time: this.held });
    this.add(sample);
    this.held = sample.time;
  }
  confirm(time: number): void {
    if (time > this.held) this.held = time;
  }
  reset(sample: MotionSample): void {
    this.samples = [sample];
    this.lengths.length = 1;
    this.held = sample.time;
  }
  /** True once nothing remains to play back at or after `time`. */
  settled(time: number): boolean {
    return this.samples.length === 1 || time >= this.latest.time;
  }
  /** Distance along the admitted path at game time `time`. */
  private distanceAt(time: number): number {
    const s = this.samples;
    if (time <= s[0]!.time) return 0;
    if (time >= this.latest.time) return this.lengths[s.length - 1]!;
    let i = 1;
    while (s[i]!.time < time) i++;
    const a = s[i - 1]!,
      b = s[i]!;
    return (
      this.lengths[i - 1]! +
      (this.lengths[i]! - this.lengths[i - 1]!) * ((time - a.time) / (b.time - a.time))
    );
  }
  /** Speed along the admitted path at game time `time`, metres per game second. */
  private slopeAt(time: number): number {
    const s = this.samples;
    if (time <= s[0]!.time || time >= this.latest.time) return 0;
    let i = 1;
    while (s[i]!.time < time) i++;
    return (this.lengths[i]! - this.lengths[i - 1]!) / (s[i]!.time - s[i - 1]!.time);
  }
  /** `of` averaged over ±`ease` game seconds around `time` with triangular weights. */
  private eased(of: (time: number) => number, time: number, ease: number): number {
    let sum = 0,
      total = 0;
    for (let k = 1; k < EASE_STEPS; k++) {
      const weight = Math.min(k, EASE_STEPS - k);
      sum += weight * of.call(this, time + ease * ((2 * k) / EASE_STEPS - 1));
      total += weight;
    }
    return sum / total;
  }
  /** The displayed foot at game time `time`, eased over ±`ease` game seconds. */
  evaluate(
    map: SpatialMap,
    time: number,
    ease: number,
  ): { point: WorldPoint; support: string | null } {
    const s = this.samples;
    // Drop samples the window can no longer reach, keeping one bracket before it.
    while (s.length > 2 && s[1]!.time <= time - ease) {
      s.shift();
      const first = this.lengths[1]!;
      this.lengths.shift();
      for (let i = 0; i < this.lengths.length; i++) this.lengths[i]! -= first;
    }
    if (s.length === 1) return s[0]!;
    const distance = this.eased(this.distanceAt, time, ease);
    let i = 1;
    while (i < s.length - 1 && this.lengths[i]! < distance) i++;
    const a = s[i - 1]!,
      b = s[i]!,
      span = this.lengths[i]! - this.lengths[i - 1]!;
    if (span <= 1e-9) return b;
    return interpolateVisualFoot(
      map,
      a.point,
      b.point,
      a.support,
      b.support,
      (distance - this.lengths[i - 1]!) / span,
    );
  }
  /** Displayed speed along the path at `time`, metres per game second: the same weighting of
   * the admitted segments' speeds, which is exactly how fast the eased position changes. The
   * gait paces legs with it; differencing displayed positions would add frame-time noise. */
  speed(time: number, ease: number): number {
    return this.samples.length === 1 ? 0 : this.eased(this.slopeAt, time, ease);
  }
  private add(sample: MotionSample): void {
    const previous = this.latest;
    this.samples.push(sample);
    this.lengths.push(
      this.lengths[this.lengths.length - 1]! + distance3D(previous.point, sample.point),
    );
  }
}

/** What a body's pose follows besides travel, by snapshot game time. */
export interface MotionCue {
  time: number;
  heading: number;
  action: ActionAnimation | null;
}

/** Whether two strike descriptors are the same phase of the same strike. */
function sameRun(a: ActionAnimation | null | undefined, b: ActionAnimation | null | undefined) {
  return !!a && !!b && a.id === b.id && a.phase === b.phase;
}
/** Progress per game second between two cues of one strike phase; 0 when unknown. Committed
 * progress is linear in game time, so two samples give a phase's whole course. */
function pace(from: MotionCue, to: MotionCue | undefined): number {
  if (!to || !sameRun(from.action, to.action) || to.time <= from.time) return 0;
  return Math.max(0, (to.action!.progress - from.action!.progress) / (to.time - from.time));
}

/** A body's heading and committed strike replayed on its travel's delayed clock, so it turns and
 * strikes where it is drawn rather than up to that delay early. Snapshots catch a phase at
 * arbitrary points; its own pace fills in the pose from its start to its end, so a strike
 * neither begins half done nor stops short of contact, and moves every frame.
 * docs/projects/3d-pixel-art-tech-design.md#7-animation-attachments-and-time */
export class CueTrack {
  private cues: MotionCue[];
  constructor(first: MotionCue) {
    this.cues = [first];
  }
  push(cue: MotionCue): void {
    const last = this.cues[this.cues.length - 1]!;
    if (cue.time < last.time) this.reset(cue);
    // A repeated snapshot time replaces its cue; a duplicate would read as a stalled phase.
    else if (cue.time === last.time) this.cues[this.cues.length - 1] = cue;
    else if (cue.heading !== last.heading || cue.action || last.action) this.cues.push(cue);
  }
  reset(cue: MotionCue): void {
    this.cues = [cue];
  }
  /** Heading and strike at displayed game time `time`; earlier cues are released. */
  at(time: number): { heading: number; action: ActionAnimation | null } {
    const c = this.cues;
    // Keep one cue before the current one: a phase's pace needs two of its samples.
    while (c.length > 2 && c[2]!.time <= time) c.shift();
    const i = c.length > 1 && c[1]!.time <= time ? 1 : 0;
    const now = c[i]!,
      next = c[i + 1];
    const show = (cue: MotionCue, rate: number) => ({
      heading: now.heading,
      action: {
        ...cue.action!,
        progress: Math.min(1, Math.max(0, cue.action!.progress + (time - cue.time) * rate)),
      },
    });
    // A phase first sampled at the next cue began earlier, by its own pace.
    if (next?.action && !sameRun(now.action, next.action)) {
      const rate = pace(next, c[i + 2]);
      if (rate && time >= next.time - next.action.progress / rate) return show(next, rate);
    }
    if (!now.action) return now;
    const rate = pace(now, next) || (i > 0 ? pace(c[i - 1]!, now) : 0);
    return rate ? show(now, rate) : now;
  }
}
