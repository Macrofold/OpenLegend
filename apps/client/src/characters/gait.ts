import * as pc from 'playcanvas';

/** One looping stride clip and the travel speed its feet imply, measured offline by
 * `scripts/art/art-tool.py clips` (its printed `groundSpeed`, metres per second). */
export interface Stride {
  readonly name: string;
  readonly groundSpeed: number;
  readonly seconds: number;
}

// Displayed speed arrives already eased (world-motion.ts); this short smoothing only steadies
// the playback clock's small pace nudges, so legs do not lag the body.
const SPEED_SMOOTHING_SECONDS = 0.03;
// A dead band between starting and stopping, so a body easing to a halt does not flicker
// between walking and standing.
const START_SPEED = 0.35;
const STOP_SPEED = 0.15;
// Below the slowest stride the legs slow down only so far before sliding is the better
// failure; above the fastest (accelerated clocks) cycles may be visually abbreviated.
// docs/projects/3d-pixel-art-tech-design.md#7-animation-attachments-and-time
const MIN_RATE = 0.55;
const MAX_RATE = 1.6;

/** Chooses and paces locomotion from the speed a body is displayed travelling at: a 1D blend
 * of stride clips keyed by their ground speeds, played at the rate that makes the blended
 * stride cover the displayed distance, so feet keep pace with travel instead of sliding.
 * Clips stay in place; the scene alone moves the body. */
export class Gait {
  private smoothed = 0;
  moving = false;
  /** `scale` converts clip metres to displayed metres for a model shown larger or smaller. */
  constructor(
    readonly strides: readonly Stride[],
    private readonly scale = 1,
  ) {
    if (!strides.length) throw new Error('A gait needs at least one stride clip.');
  }
  update(dt: number, displayedSpeed: number): void {
    this.smoothed +=
      (displayedSpeed - this.smoothed) * (1 - Math.exp(-dt / SPEED_SMOOTHING_SECONDS));
    if (this.moving ? this.smoothed < STOP_SPEED : this.smoothed > START_SPEED)
      this.moving = !this.moving;
  }
  rest(): void {
    this.smoothed = 0;
    this.moving = false;
  }
  /** Smoothed displayed speed, metres per second. */
  get speed(): number {
    return this.smoothed;
  }
  /** Blend-tree parameter, in the clips' own metres per second. */
  get parameter(): number {
    const first = this.strides[0]!.groundSpeed,
      last = this.strides[this.strides.length - 1]!.groundSpeed;
    return pc.math.clamp(this.smoothed / this.scale, first, last);
  }
  /** Playback multiplier for the stride blend. With synced durations the blend's stride
   * length and cycle time both mix linearly, so its own speed is their ratio. */
  get rate(): number {
    const at = this.parameter;
    let length = 0,
      seconds = 0;
    for (const [stride, weight] of this.weights(at)) {
      length += weight * stride.groundSpeed * stride.seconds;
      seconds += weight * stride.seconds;
    }
    const own = (length / seconds) * this.scale;
    return pc.math.clamp(this.smoothed / own, MIN_RATE, MAX_RATE);
  }
  /** The 1D blend's weights at `at`, matching PlayCanvas' linear interpolation between points. */
  private *weights(at: number): Generator<[Stride, number]> {
    const s = this.strides;
    for (let i = 0; i < s.length - 1; i++) {
      const a = s[i]!,
        b = s[i + 1]!;
      if (at <= b.groundSpeed) {
        const t = (at - a.groundSpeed) / (b.groundSpeed - a.groundSpeed);
        yield [a, 1 - t];
        yield [b, t];
        return;
      }
    }
    yield [s[s.length - 1]!, 1];
  }
}

/** The state-graph layer for a gait: Idle, a synced stride blend named Move, and the caller's
 * other states (gestures, fixtures). Callers transition between them. */
export function gaitStateGraph(
  strides: readonly Stride[],
  others: readonly { name: string; loop: boolean; speed?: number }[],
) {
  return {
    layers: [
      {
        name: 'Body',
        states: [
          { name: 'START' },
          { name: 'Idle', loop: true },
          {
            name: 'Move',
            loop: true,
            blendTree: {
              type: pc.ANIM_BLEND_1D,
              parameter: 'stride',
              syncAnimations: true,
              children: strides.map((stride) => ({ name: stride.name, point: stride.groundSpeed })),
            },
          },
          ...others,
        ],
        transitions: [{ from: 'START', to: 'Idle' }],
      },
    ],
    parameters: {
      stride: { name: 'stride', type: pc.ANIM_PARAMETER_FLOAT, value: strides[0]!.groundSpeed },
    },
  };
}
