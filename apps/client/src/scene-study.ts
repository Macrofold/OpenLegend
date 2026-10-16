import type { GameView } from '@open-legend/protocol';
import { WildernessScene } from './scene';
import { StudyCapture } from './study-capture';
import { initialCamera } from './world-camera';
import { candidateArt, type ArtTreatment } from './art-treatment';
import recorded from './props/art-study/starting-world.json';
import './scene-study.css';

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
const stop = () => recorded.stops.find((item) => item.id === select('place').value)!;
for (const item of recorded.stops) select('place').add(new Option(item.label, item.id));
document.querySelector('#world-source')!.textContent = recorded.source;
function treatment(): ArtTreatment {
  const route = select('route').value;
  return {
    ...candidateArt,
    mercenaryArt: select('mercenary').value as ArtTreatment['mercenaryArt'],
    sampling: route === 'shared' ? 'screen' : route === 'family' ? '60' : '96',
    sceneGrid:
      route === 'control' || route === 'surface'
        ? 'full'
        : (select('world-density').value as ArtTreatment['sceneGrid']),
    subjectDetail: route === 'family' ? 'preserve' : 'shared',
    surfaceArt: route === 'control' ? 'plain' : 'rigid',
    environment: 'study',
    prop: 'banded',
    vegetation: 'still',
    cloth: 'settled',
    actionFixture: action,
    motion: select('world-motion').value as ArtTreatment['motion'],
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
function publish(): void {
  const item = stop();
  const light = select('world-light').value;
  const original = item.view as unknown as GameView;
  view = {
    ...original,
    map: recorded.map as unknown as GameView['map'],
    clock: {
      ...original.clock,
      paused: !motion,
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
        actions: [],
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
      hover() {},
      selectionDenied(message) {
        status.textContent = message;
      },
    },
    { rememberCamera: false, notices: false, art: treatment() },
  );
  scene.setPerceptionOptions({ vision: false, hearing: false });
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
          route: select('route').value,
          viewport: [canvas.clientWidth, canvas.clientHeight],
          shadowQuality: select('world-shadows').value,
          stagedMotion: motion,
          cameraOrbit: orbit,
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
    if (now - lastPublication > 100) {
      publish();
      lastPublication = now;
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
for (const id of ['route', 'mercenary', 'world-density', 'world-motion'])
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
button('capture').onclick = () =>
  capture.image(
    'openlegend-' + stop().id + '-' + select('world-light').value + '-' + select('route').value,
  );
button('record').onclick = () => {
  // Orbit comparisons begin from the same camera, so recorded alternatives
  // can be played together without unrelated angular offsets.
  if (orbit) setCamera();
  button('record').disabled = capture.record(
    'openlegend-' + stop().id + '-' + select('world-light').value + '-' + select('route').value,
    (message) => {
      button('record').disabled = false;
      status.textContent = message;
    },
  );
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
const pauseForPreference = () => {
  if (reducedMotion.matches) {
    motion = false;
    orbit = false;
    button('orbit').setAttribute('aria-pressed', 'false');
    button('motion').setAttribute('aria-pressed', 'false');
    publish();
  }
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
