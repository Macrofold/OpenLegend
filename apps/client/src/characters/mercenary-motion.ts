import * as pc from 'playcanvas';

export type MercenaryTiming = 'smooth' | 'held8' | 'held12';

const clipNames = [
  'Idle',
  'Walk',
  'WalkHeld8',
  'WalkHeld12',
  'SharpFixtureSmooth',
  'SharpFixtureHeld',
] as const;

/** One evaluated pose feeds color, shadows, equipment and continuous fabric.
 * Travel and heading remain owned by the scene; these clips never move it.
 * docs/projects/3d-pixel-art-tech-design.md#7-animation-attachments-and-time */
export class MercenaryMotion {
  private clip: (typeof clipNames)[number] = 'Idle';
  private timing: MercenaryTiming = 'smooth';
  private fixture = false;
  constructor(
    private readonly anim: pc.AnimComponent,
    tracks: readonly pc.AnimTrack[],
  ) {
    const required = clipNames.map((name) => {
      const track = tracks.find((candidate) => candidate.name === name);
      if (!track) throw new Error('Mercenary motion clip missing: ' + name);
      return { name, track };
    });
    anim.loadStateGraph({
      layers: [
        {
          name: 'Body',
          states: [{ name: 'START' }, ...clipNames.map((name) => ({ name, loop: true }))],
          transitions: [{ from: 'START', to: 'Idle' }],
        },
      ],
      parameters: {},
    });
    for (const { name, track } of required) anim.assignAnimation(name, track);
    if (!anim.baseLayer) throw new Error('Mercenary motion layer missing');
    // The scene evaluates once before its cloth update. The engine's earlier
    // automatic animation phase would otherwise advance again or lag a pause.
    anim.playing = false;
    anim.speed = 1;
    anim.baseLayer.play('Idle');
    anim.update(0);
  }
  rest(): void {
    if (this.clip !== 'Idle') {
      this.anim.baseLayer?.play('Idle');
      this.clip = 'Idle';
    }
    this.fixture = false;
    this.anim.update(0);
  }
  update(
    dt: number,
    moving: boolean,
    paused: boolean,
    timing: MercenaryTiming,
    actionFixture: boolean,
  ): void {
    const next = actionFixture
      ? timing === 'smooth'
        ? 'SharpFixtureSmooth'
        : 'SharpFixtureHeld'
      : moving
        ? timing === 'held8'
          ? 'WalkHeld8'
          : timing === 'held12'
            ? 'WalkHeld12'
            : 'Walk'
        : 'Idle';
    if (next !== this.clip) {
      this.anim.baseLayer?.transition(next, actionFixture || this.fixture ? 0.04 : 0.1);
      this.clip = next;
    }
    this.timing = timing;
    this.fixture = actionFixture;
    // A background-tab gap must not fast-forward a cosmetic gesture. Native
    // travel still follows the current permitted position independently.
    this.anim.update(paused ? 0 : Math.min(dt, 0.1));
  }
  diagnostics() {
    return {
      clip: this.clip,
      time: this.anim.baseLayer?.activeStateCurrentTime,
      timing: this.timing,
      actionFixture: this.fixture,
      automaticUpdate: this.anim.playing,
    };
  }
}
