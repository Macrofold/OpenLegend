import type { GameView } from '@open-legend/protocol';
import { WildernessScene } from './scene';
import { StudyCapture } from './study-capture';
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
let phase = 0;
let frame = 0;
let prior = 0;
let lastPublication = 0;
let disposed = false;
let capture = new StudyCapture(canvas);
let measurement:
  | {
      start: number;
      intervals: number[];
      frames: ReturnType<WildernessScene['sampleArtFrame']>[];
    }
  | undefined;
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
    sceneGrid: route === 'control' || route === 'surface' ? 'full' : 'metres30',
    subjectDetail: route === 'family' ? 'preserve' : 'shared',
    surfaceArt: route === 'control' ? 'plain' : 'rigid',
    environment: 'study',
    prop: 'banded',
    vegetation: 'still',
    cloth: 'settled',
  };
}
function setCamera(): void {
  const current = scene.cameraState();
  const zoom =
    select('world-framing').value === 'overview'
      ? 12
      : select('world-framing').value === 'detail'
        ? 4
        : 5.5;
  scene.cameraCommand({ type: 'zoom', delta: zoom - current.zoom });
  scene.cameraCommand({ type: 'orbit', yaw: -current.yaw, pitch: 0.68 - current.pitch });
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
      hour: light === 'day' ? 10 : light === 'low' ? 17 : 19.3,
    },
    entities: original.entities.map((entity) => {
      if (!fire && entity.kind === 'station' && entity.status.startsWith('Lit'))
        return { ...entity, status: 'Unlit · study light comparison' };
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
    { rememberCamera: false, art: treatment() },
  );
  scene.setPerceptionOptions({ vision: false, hearing: false });
  publish();
  setCamera();
  status.textContent = stop().label + ' · source-based art comparison';
}
function update(now: number): void {
  if (disposed) return;
  const elapsed = prior ? now - prior : 0;
  prior = now;
  if (measurement && elapsed > 0) {
    measurement.intervals.push(elapsed);
    measurement.frames.push(scene.sampleArtFrame());
    if (now - measurement.start >= 10000) {
      const frames = measurement.frames;
      metrics.textContent = JSON.stringify(
        {
          place: stop().label,
          viewport: [canvas.clientWidth, canvas.clientHeight],
          displayedIntervals: distribution(measurement.intervals),
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
for (const id of ['route', 'mercenary'])
  select(id).onchange = () => scene.setArtTreatment(treatment());
select('world-framing').onchange = setCamera;
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
  measurement = { start: performance.now(), intervals: [], frames: [] };
  button('measure').disabled = true;
  metrics.textContent = 'Measuring this view for ten seconds…';
};
button('remount').onclick = () => {
  measurement = undefined;
  button('measure').disabled = false;
  scene.destroy();
  mount();
};
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
  cancelAnimationFrame(frame);
  capture.destroy();
  reducedMotion.removeEventListener('change', pauseForPreference);
  scene.destroy();
}
window.addEventListener('pagehide', dispose);
window.addEventListener('pageshow', (event) => {
  if (!event.persisted || !disposed) return;
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
