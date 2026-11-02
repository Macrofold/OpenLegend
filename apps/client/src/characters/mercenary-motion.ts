import * as pc from 'playcanvas';
import type { ActionAnimation } from '@open-legend/protocol';
import { Gait, gaitStateGraph, type Stride } from './gait';

export type MercenaryTiming = 'smooth' | 'held8' | 'held12';

// The stride clips in mercenary-motion.glb with the ground speeds `art-tool.py clips` measured
// on that file; re-measure when the clips change. docs/maintainers/art/mercenary.md
const STRIDES: readonly Stride[] = [
  { name: 'Walk', groundSpeed: 1.286, seconds: 1.167 },
  { name: 'Run', groundSpeed: 5.124, seconds: 0.7 },
  { name: 'Sprint', groundSpeed: 9.531, seconds: 0.5 },
];
// Committed strikes play the matching clip with its pose taken from the native progress: the
// windup ends, and the blow lands, at `contact` of the clip. docs/targeted-actions.md#presentation
const STRIKES: Record<ActionAnimation['kind'], { clip: string; contact: number }> = {
  melee: { clip: 'Attack', contact: 0.5 },
  punch: { clip: 'Punch', contact: 0.36 },
};
const FIXTURES = ['SharpFixtureSmooth', 'SharpFixtureHeld'] as const;
// Stopping crossfades into Idle over little clip time, played slowly. The fading stride and
// the crossfade share one clock, so this keeps the legs from stepping on the spot after the
// body halts while the settle still takes about a quarter-second. No authored stop clip exists.
const SETTLE_SECONDS = 0.1;
const SETTLE_PACE = 0.4;
const clipNames = ['Idle', ...STRIDES.map((s) => s.name), 'Attack', 'Punch', ...FIXTURES] as const;

/** One evaluated pose feeds color, shadows, equipment and continuous fabric.
 * Travel and heading remain owned by the scene; these clips never move it.
 * docs/projects/3d-pixel-art-tech-design.md#7-animation-attachments-and-time */
export class MercenaryMotion {
  private clip = 'Idle';
  private timing: MercenaryTiming = 'smooth';
  private readonly gait: Gait;
  private readonly durations = new Map<string, number>();
  /** Pose time owed to the stepped (held) cadence, and what has been sampled of it. */
  private elapsed = 0;
  private sampled = 0;
  constructor(
    private readonly anim: pc.AnimComponent,
    tracks: readonly pc.AnimTrack[],
    displayScale: number,
  ) {
    const track = (name: string) => {
      const found = tracks.find((candidate) => candidate.name === name);
      if (!found) throw new Error('Mercenary motion clip missing: ' + name);
      this.durations.set(name, found.duration);
      return found;
    };
    anim.loadStateGraph(
      gaitStateGraph(STRIDES, [
        // Strike poses follow native progress, so their own playback stays still.
        ...Object.values(STRIKES).map(({ clip }) => ({ name: clip, loop: false, speed: 0 })),
        ...FIXTURES.map((name) => ({ name, loop: true })),
      ]),
    );
    for (const name of clipNames) {
      // Assigning resets a state's speed and looping, so strikes restate theirs.
      const held = Object.values(STRIKES).some((strike) => strike.clip === name);
      anim.assignAnimation(
        STRIDES.some((s) => s.name === name) ? 'Move.' + name : name,
        track(name),
        undefined,
        held ? 0 : 1,
        !held,
      );
    }
    if (!anim.baseLayer) throw new Error('Mercenary motion layer missing');
    // The scene evaluates once before its cloth update. The engine's earlier
    // automatic animation phase would otherwise advance again or lag a pause.
    anim.playing = false;
    anim.speed = 1;
    anim.baseLayer.play('Idle');
    anim.update(0);
    // Clips are measured on the source rig; the display scale lengthens every stride.
    this.gait = new Gait(STRIDES, displayScale);
  }
  rest(): void {
    // A visibility/position discontinuity cancels the whole blend. In the
    // pinned engine, play() removes clips but retains an interrupted blend's
    // previous states; the next transition can then reference missing clips.
    this.anim.baseLayer?.reset();
    this.anim.baseLayer?.play('Idle');
    this.clip = 'Idle';
    this.gait.rest();
    this.elapsed = this.sampled = 0;
    this.anim.update(0);
  }
  update(
    dt: number,
    speed: number,
    paused: boolean,
    timing: MercenaryTiming,
    actionFixture: boolean,
    action?: ActionAnimation | null,
  ): void {
    // A background-tab gap must not fast-forward a cosmetic gesture. Native
    // travel still follows the current permitted position independently.
    const step = paused ? 0 : Math.min(dt, 0.1);
    this.gait.update(step, paused ? 0 : speed);
    const strike = action ? STRIKES[action.kind] : undefined;
    const next = actionFixture
      ? timing === 'smooth'
        ? 'SharpFixtureSmooth'
        : 'SharpFixtureHeld'
      : (strike?.clip ?? (this.gait.moving ? 'Move' : 'Idle'));
    const layer = this.anim.baseLayer;
    const changed = next !== this.clip;
    if (changed) {
      layer?.transition(
        next,
        strike || next.startsWith('Sharp')
          ? 0.06
          : next === 'Move'
            ? 0.18
            : this.clip === 'Move'
              ? SETTLE_SECONDS
              : 0.25,
      );
      this.clip = next;
    }
    this.timing = timing;
    this.anim.setFloat('stride', this.gait.parameter);
    if (strike && action && layer) {
      const at =
        action.phase === 'recovery'
          ? strike.contact + action.progress * (1 - strike.contact)
          : action.progress * strike.contact;
      layer.activeStateCurrentTime = at * (this.durations.get(strike.clip) ?? 1);
    }
    // Held looks sample the smooth clips a fixed number of times a second; the scene's
    // travel stays continuous. docs/world-presentation.md#animated-character-pixels
    const settling = next === 'Idle' && !!layer?.transitioning && layer.previousState === 'Move';
    this.elapsed += step * (next === 'Move' ? this.gait.rate : settling ? SETTLE_PACE : 1);
    const frequency = timing === 'held8' ? 8 : timing === 'held12' ? 12 : 0;
    const sampled = frequency ? Math.floor(this.elapsed * frequency) / frequency : this.elapsed;
    const advance = Math.max(0, sampled - this.sampled);
    this.sampled = sampled;
    if (changed || advance > 0 || strike) this.anim.update(advance);
  }
  diagnostics() {
    return {
      clip: this.clip,
      time: this.anim.baseLayer?.activeStateCurrentTime,
      timing: this.timing,
      moving: this.gait.moving,
      speed: this.gait.speed,
      stride: this.gait.parameter,
      rate: this.gait.rate,
      automaticUpdate: this.anim.playing,
    };
  }
}
