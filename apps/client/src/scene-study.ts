import type { ActionAnimation, GameView } from '@open-legend/protocol';
import { WildernessScene } from './scene';
import { StudyCapture } from './study-capture';
import { initialCamera } from './world-camera';
import { candidateArt, type ArtTreatment } from './art-treatment';
import { readAssetJson, installedAssetRelease } from './asset-files';
import './scene-study.css';

interface RecordedStudy {
  source: string;
  map: GameView['map'];
  stops: { id: string; label: string; view: GameView }[];
}

const recorded = await readAssetJson<RecordedStudy>(
  'apps/client/src/props/art-study/starting-world.json',
).catch((error: unknown) => {
  document.querySelector('#world-status')!.textContent =
    'The recorded study could not be loaded. Pull the selected study assets and reload this page.';
  throw error;
});

const canvas = document.querySelector<HTMLCanvasElement>('#world')!;
const status = document.querySelector<HTMLElement>('#world-status')!;
const metrics = document.querySelector<HTMLElement>('#world-metrics')!;
const select = (id: string) => document.querySelector<HTMLSelectElement>('#' + id)!;
const button = (id: string) => document.querySelector<HTMLButtonElement>('#' + id)!;
let scene: WildernessScene;
let view: GameView;
let motion = false;
let orbit = false;
let fire = true;
let action = false;
let berriesGathered = false;
let phase = 0;
let frame = 0;
let prior = 0;
let lastPublication = 0;
let nextPublication = 100;
let disposed = false;
let capture = new StudyCapture(canvas);
let measurement:
  | {
      start: number;
      lastRender: number;
      lastRenderAt: number;
      intervals: number[];
      frames: ReturnType<WildernessScene['sampleArtFrame']>[];
    }
  | undefined;
function cancelMeasurement(message: string): void {
  if (!measurement) return;
  measurement = undefined;
  scene.setArtMeasurement(false);
  button('measure').disabled = false;
  metrics.textContent = message + ' Start a new measurement for this view.';
}
function distribution(values: number[]) {
  if (!values.length) return null;
  values.sort((a, b) => a - b);
  return {
    count: values.length,
    median: values[Math.floor(values.length * 0.5)],
    p95: values[Math.floor(values.length * 0.95)],
    p99: values[Math.floor(values.length * 0.99)],
    max: values.at(-1),
  };
}
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
// The game sets this from its motion setting; the study follows the device preference.
const applyMotionPreference = () => {
  document.documentElement.dataset.reduceMotion = String(reducedMotion.matches);
};
applyMotionPreference();
const stop = () => recorded.stops.find((item) => item.id === select('place').value)!;
for (const item of recorded.stops) select('place').add(new Option(item.label, item.id));
document.querySelector('#world-source')!.textContent = recorded.source;
function treatment(): ArtTreatment {
  return {
    // These controls set only their own fields; keep the art panel's other choices.
    // `scene` is unassigned until the first mount.
    ...(scene?.artTreatment() ?? candidateArt),
    mercenaryArt: select('mercenary').value as ArtTreatment['mercenaryArt'],
    atmosphere: select('world-atmosphere').value as ArtTreatment['atmosphere'],
    groundLighting: select('world-ground-light').value as ArtTreatment['groundLighting'],
    assetSources: select('world-assets').value as ArtTreatment['assetSources'],
    groundPalette: ['natural', 'open'].includes(select('world-foliage').value)
      ? 'understory'
      : 'woodland',
    environment:
      select('world-foliage').value === 'natural'
        ? 'natural'
        : select('world-foliage').value === 'open'
          ? 'canopy'
          : 'study',
    foliageLight: select('world-foliage').value === 'original' ? 'original' : 'diffuse',
    wind: select('world-wind').value as ArtTreatment['wind'],
    actionFixture: action,
  };
}
function setCamera(): void {
  const current = scene.cameraState();
  const ordinary = initialCamera();
  // Each location is an explicit comparison composition, rather than following
  // the interpolated player while a recorded journey jumps between snapshots.
  if (current.following) scene.cameraCommand({ type: 'follow' });
  const zoom =
    select('world-framing').value === 'overview'
      ? 12
      : select('world-framing').value === 'detail'
        ? 4
        : ordinary.zoom;
  scene.cameraCommand({ type: 'zoom', delta: zoom - current.zoom });
  scene.cameraCommand({
    type: 'orbit',
    // Face across the river at the workshop; its existing bank-side tree
    // otherwise hides the work surface in the default north-facing view.
    yaw: (stop().id === 'workshop' ? Math.PI / 2 : 0) - current.yaw,
    pitch: (select('world-framing').value === 'overview' ? 0.88 : ordinary.pitch) - current.pitch,
  });
  scene.cameraCommand({
    type: 'focus',
    point: { ...view.player.position, z: view.player.position.z - 1.5 },
  });
}
/** The game-travel fixture: back and forth along x, resting at each end. Its speed is a fixture
 * choice that resembles normal-speed play at this revision; the world owns real travel. */
const TRAVEL_SPEED = 6.6;
const TRAVEL_HALF = 4;
const TRAVEL_REST = 1.5;
function travel(t: number): { x: number; heading: number } {
  const leg = (2 * TRAVEL_HALF) / TRAVEL_SPEED,
    period = 2 * (leg + TRAVEL_REST);
  const at = ((t % period) + period) % period;
  if (at < leg) return { x: -TRAVEL_HALF + at * TRAVEL_SPEED, heading: Math.PI / 2 };
  if (at < leg + TRAVEL_REST) return { x: TRAVEL_HALF, heading: Math.PI / 2 };
  if (at < 2 * leg + TRAVEL_REST)
    return { x: TRAVEL_HALF - (at - leg - TRAVEL_REST) * TRAVEL_SPEED, heading: -Math.PI / 2 };
  return { x: -TRAVEL_HALF, heading: -Math.PI / 2 };
}
/** The strike fixture: the mercenary stands and alternates club and fist strikes, described as
 * snapshots would describe them. Its wind-up and recovery times are fixture choices resembling
 * normal-speed play at this revision (docs/worlds/base/combat.md#equipped-melee); the world owns
 * real strike timing. A punch has no recovery phase. */
const STRIKE_PERIOD = 1.6;
function strike(t: number): ActionAnimation | null {
  const cycle = Math.floor(t / STRIKE_PERIOD),
    at = t - cycle * STRIKE_PERIOD,
    id = `study-strike-${cycle}`,
    direction = { x: 1, z: 0 };
  if (cycle % 2) return at < 0.5 ? { id, kind: 'punch', direction, progress: at / 0.5 } : null;
  if (at < 0.2) return { id, kind: 'melee', direction, phase: 'windup', progress: at / 0.2 };
  if (at < 0.6)
    return { id, kind: 'melee', direction, phase: 'recovery', progress: (at - 0.2) / 0.4 };
  return null;
}
function publish(): void {
  const item = stop();
  const light = select('world-light').value;
  const original = item.view as unknown as GameView;
  const travelMode = select('world-travel').value;
  const game = travelMode !== 'sway';
  view = {
    ...original,
    // The recorded view predates the projected body size; re-recording it is the real fix.
    player: {
      ...original.player,
      bodySize: original.player.bodySize ?? { width: 0.5, height: 1.75 },
    },
    map: recorded.map as unknown as GameView['map'],
    clock: {
      ...original.clock,
      // Displayed travel is placed by snapshot time, so staged snapshots advance it.
      seconds: original.clock.seconds + phase * original.clock.speed * original.clock.baseRatio,
      paused: !motion && (select('world-wind').value === 'still' || reducedMotion.matches),
      // Keep low sun visibly above twilight so its long directional shadows
      // remain a useful comparison against the separate firelit dusk study.
      hour: light === 'day' ? 10 : light === 'low' ? 16 : 19.3,
    },
    entities: original.entities.map((entity) => {
      if (berriesGathered && entity.appearance?.startsWith('study:berry-bush'))
        return { ...entity, quantity: 0, status: 'Gathered · visual comparison' };
      if (!fire && entity.heat?.lit)
        return { ...entity, heat: { lit: false }, status: 'Unlit · study light comparison' };
      if (!motion || !['actor', 'animal'].includes(entity.kind)) return entity;
      // Explicit display fixture over a recorded permitted view; never a command.
      const offset = entity.subtype === 'hare' ? 0.7 : 0;
      const t = phase + offset;
      if (travelMode === 'strikes' && entity.id === 'peacock-mercenary')
        return { ...entity, heading: Math.PI / 2, actionAnimation: strike(phase) };
      if (game) {
        // Stagger bodies so starts and stops differ; hold support at the recorded surface.
        const leg = travel(t + (entity.id.length % 5) * 0.9);
        return {
          ...entity,
          position: { ...entity.position, x: entity.position.x + leg.x },
          heading: leg.heading,
        };
      }
      return {
        ...entity,
        position: { ...entity.position, x: entity.position.x + Math.sin(t) * 0.8 },
        heading: Math.cos(t) > 0 ? Math.PI / 2 : -Math.PI / 2,
      };
    }),
  };
  if (item.id === 'camp') {
    const source = view.entities.find((entity) => entity.id === 'lookout-cache');
    if (source)
      view.entities.push({
        ...source,
        id: 'study-thin-sword',
        name: 'Thin sword · display comparison',
        appearance: 'study:sword-broad-tip',
        kind: 'item-pile',
        status: 'Display fixture · no gameplay contents or actions',
        quantity: undefined,
        contents: undefined,
        position: {
          ...view.player.position,
          x: view.player.position.x + 1.3,
          z: view.player.position.z + 0.35,
        },
      });
  }
  scene.setView(view);
}
function mount(): void {
  scene = new WildernessScene(
    canvas,
    {
      select(entity) {
        scene.select(entity?.id ?? null);
        status.textContent = entity ? entity.name + ' · ' + entity.kind : 'Ground';
      },
      move() {
        status.textContent = 'This is a visual replay. Open the game to travel.';
      },
      target(entity) {
        status.textContent = entity.name;
      },
      beginPrimaryAction(entity) {
        status.textContent = entity.name + ' · Open the game to act.';
        return null;
      },
      commitPrimaryAction() {},
      cancelPrimaryAction() {},
      hover() {},
      selectionDenied(message) {
        status.textContent = message;
      },
    },
    {
      rememberCamera: false,
      notices: false,
      art: treatment(),
      artControls: true,
      studyRelease: installedAssetRelease,
    },
  );
  scene.setPerceptionOptions({ vision: false, hearing: false });
  // Automated motion captures read the renderer's own diagnostics through this study page.
  Object.assign(globalThis, { sceneStudy: scene });
  scene.setShadowQuality(select('world-shadows').value as 'detailed' | 'economy');
  publish();
  setCamera();
  button('projection').textContent =
    scene.cameraState().projection === 'orthographic' ? 'Perspective' : 'Orthographic';
  status.textContent = stop().label + ' · source-based art comparison';
}
function update(now: number): void {
  if (disposed) return;
  const elapsed = prior ? now - prior : 0;
  prior = now;
  if (measurement && elapsed > 0) {
    const sample = scene.sampleArtFrame();
    // A browser callback can continue after a failed/stopped render. Count only
    // completed scene frames, not duplicate counters from a frozen canvas.
    if (sample.renderedFrames !== measurement.lastRender) {
      measurement.intervals.push(now - measurement.lastRenderAt);
      measurement.frames.push(sample);
      measurement.lastRenderAt = now;
      measurement.lastRender = sample.renderedFrames;
    }
    if (now - measurement.start >= 10000) {
      const frames = measurement.frames;
      metrics.textContent = JSON.stringify(
        {
          place: stop().label,
          light: select('world-light').value,
          atmosphere: select('world-atmosphere').value,
          foliage: select('world-foliage').value,
          assetSources: select('world-assets').value,
          groundLighting: select('world-ground-light').value,
          fire,
          viewport: [canvas.clientWidth, canvas.clientHeight],
          shadowQuality: select('world-shadows').value,
          stagedMotion: motion,
          cameraOrbit: orbit,
          durationMs: now - measurement.start,
          unrenderedTailMs: now - measurement.lastRenderAt,
          renderedFrameIntervals: distribution(measurement.intervals),
          frameCosts: Object.fromEntries(
            (['updateMs', 'renderSubmissionMs', 'gpuPassMs', 'draws'] as const).map((key) => [
              key,
              distribution(
                frames
                  .map((sample) => sample[key])
                  .filter((value): value is number => value !== null),
              ),
            ]),
          ),
          renderer: scene.artDiagnostics(),
          camera: scene.cameraState(),
        },
        null,
        2,
      );
      measurement = undefined;
      scene.setArtMeasurement(false);
      button('measure').disabled = false;
    }
  }
  if (motion && !document.hidden) {
    phase += Math.min(elapsed, 100) / 1000;
    if (now - lastPublication > nextPublication) {
      publish();
      lastPublication = now;
      // Game travel mimics a busy server: mostly 50 ms ticks, sometimes skipped ones.
      nextPublication =
        select('world-travel').value !== 'sway'
          ? Math.random() < 0.6
            ? 50
            : [100, 150, 200, 300][Math.floor(Math.random() * 4)]!
          : 100;
    }
  }
  if (orbit && !document.hidden)
    scene.cameraCommand({ type: 'orbit', yaw: Math.min(elapsed, 100) * 0.00012, pitch: 0 });
  frame = requestAnimationFrame(update);
}
select('place').onchange = () => {
  phase = 0;
  publish();
  setCamera();
  status.textContent = stop().label;
};
select('world-light').onchange = publish;
select('world-travel').onchange = publish;
select('world-wind').onchange = () => {
  scene.setArtTreatment(treatment());
  publish();
};
for (const id of [
  'mercenary',
  'world-ground-light',
  'world-atmosphere',
  'world-foliage',
  'world-assets',
])
  select(id).onchange = () => scene.setArtTreatment(treatment());
select('world-framing').onchange = setCamera;
select('world-shadows').onchange = () =>
  scene.setShadowQuality(select('world-shadows').value as 'detailed' | 'economy');
button('action').onclick = () => {
  action = !action;
  button('action').setAttribute('aria-pressed', String(action));
  scene.setArtTreatment(treatment());
};
button('berries').onclick = () => {
  berriesGathered = !berriesGathered;
  button('berries').setAttribute('aria-pressed', String(berriesGathered));
  publish();
};
button('projection').onclick = () => {
  scene.cameraCommand({ type: 'projection' });
  button('projection').textContent =
    scene.cameraState().projection === 'orthographic' ? 'Perspective' : 'Orthographic';
};
button('turn-left').onclick = () =>
  scene.cameraCommand({ type: 'orbit', yaw: -Math.PI / 6, pitch: 0 });
button('turn-right').onclick = () =>
  scene.cameraCommand({ type: 'orbit', yaw: Math.PI / 6, pitch: 0 });
button('orbit').onclick = () => {
  orbit = !orbit;
  button('orbit').setAttribute('aria-pressed', String(orbit));
};
button('motion').onclick = () => {
  motion = !motion;
  button('motion').setAttribute('aria-pressed', String(motion));
  publish();
};
button('fire').onclick = () => {
  fire = !fire;
  button('fire').textContent = fire ? 'Fire on' : 'Fire off';
  button('fire').setAttribute('aria-pressed', String(fire));
  publish();
};
const captureName = () =>
  [
    'openlegend',
    stop().id,
    select('world-light').value,
    select('world-atmosphere').value,
    select('world-foliage').value,
    select('world-assets').value,
    select('world-ground-light').value,
    fire ? 'fire' : 'no-fire',
  ].join('-');
button('capture').onclick = () => capture.image(captureName());
button('record').onclick = () => {
  // Orbit comparisons begin from the same camera, so recorded alternatives
  // can be played together without unrelated angular offsets.
  if (orbit) setCamera();
  button('record').disabled = capture.record(captureName(), (message) => {
    button('record').disabled = false;
    status.textContent = message;
  });
  if (button('record').disabled) status.textContent = 'Recording 8 seconds…';
};
button('measure').onclick = () => {
  scene.setArtMeasurement(true);
  const now = performance.now();
  measurement = {
    start: now,
    lastRenderAt: now,
    lastRender: scene.sampleArtFrame().renderedFrames,
    intervals: [],
    frames: [],
  };
  button('measure').disabled = true;
  metrics.textContent = 'Measuring this view for ten seconds…';
};
button('remount').onclick = () => {
  cancelMeasurement('Renderer reloaded; the interrupted measurement was discarded.');
  capture.destroy();
  capture = new StudyCapture(canvas);
  button('record').disabled = false;
  scene.destroy();
  mount();
};
const changedComparison = () =>
  cancelMeasurement('Comparison changed; the interrupted measurement was discarded.');
const controls = document.querySelector('.world-study-controls')!;
controls.addEventListener('change', changedComparison);
controls.addEventListener('click', (event) => {
  if ((event.target as HTMLElement).closest('button')) changedComparison();
});
select('world-shadows').addEventListener('change', changedComparison);
for (const event of ['pointerdown', 'wheel', 'keydown'])
  canvas.addEventListener(event, changedComparison);
document.addEventListener('visibilitychange', () => {
  if (document.hidden)
    cancelMeasurement('Study hidden; the interrupted measurement was discarded.');
});
window.addEventListener('resize', () =>
  cancelMeasurement('Viewport changed; the interrupted measurement was discarded.'),
);
const pauseForPreference = () => {
  applyMotionPreference();
  if (reducedMotion.matches) {
    cancelMeasurement('Motion preference changed; the interrupted measurement was discarded.');
    motion = false;
    orbit = false;
    button('orbit').setAttribute('aria-pressed', 'false');
    button('motion').setAttribute('aria-pressed', 'false');
  }
  publish();
};
reducedMotion.addEventListener('change', pauseForPreference);
function dispose(): void {
  if (disposed) return;
  disposed = true;
  cancelMeasurement('Study closed; the interrupted measurement was discarded.');
  cancelAnimationFrame(frame);
  capture.destroy();
  reducedMotion.removeEventListener('change', pauseForPreference);
  scene.destroy();
}
window.addEventListener('pagehide', dispose);
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) {
    // Native history restoration can restore select values after mount().
    // Apply the controls that are actually visible, as the asset inspector does.
    scene.setArtTreatment(treatment());
    scene.setShadowQuality(select('world-shadows').value as 'detailed' | 'economy');
    publish();
    setCamera();
    return;
  }
  if (!disposed) return;
  disposed = false;
  capture = new StudyCapture(canvas);
  button('record').disabled = false;
  prior = 0;
  measurement = undefined;
  button('measure').disabled = false;
  reducedMotion.addEventListener('change', pauseForPreference);
  mount();
  frame = requestAnimationFrame(update);
});
mount();
frame = requestAnimationFrame(update);
