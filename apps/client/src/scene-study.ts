import type { GameView } from '@open-legend/protocol';
import { WildernessScene } from './scene';
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
let recorder: MediaRecorder | undefined;
let recordingTimer: ReturnType<typeof setTimeout> | undefined;
let measurement: { start: number; intervals: number[] } | undefined;
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
    sceneGrid: route === 'control' ? 'full' : 'pixels2',
    subjectDetail: route === 'family' ? 'preserve' : 'shared',
    surfaceArt: 'plain',
    environment: 'study',
    prop: 'carved',
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
      if (
        !motion ||
        (entity.appearance !== 'mercenary-model' &&
          !entity.appearance.startsWith('study:') &&
          entity.subtype !== 'hare')
      )
        return entity;
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
    { rememberCamera: false },
  );
  scene.setPerceptionOptions({ vision: false, hearing: false });
  scene.setArtTreatment(treatment());
  publish();
  setCamera();
  status.textContent = stop().label + ' · source-based art comparison';
}
function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob),
    link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function update(now: number): void {
  if (disposed) return;
  const elapsed = prior ? now - prior : 0;
  prior = now;
  if (measurement && elapsed > 0) {
    measurement.intervals.push(elapsed);
    if (now - measurement.start >= 10000) {
      const values = measurement.intervals.sort((a, b) => a - b);
      metrics.textContent = JSON.stringify(
        {
          place: stop().label,
          viewport: [canvas.clientWidth, canvas.clientHeight],
          displayedIntervals: {
            count: values.length,
            median: values[Math.floor(values.length * 0.5)],
            p95: values[Math.floor(values.length * 0.95)],
          },
          renderer: scene.artDiagnostics(),
          camera: scene.cameraState(),
        },
        null,
        2,
      );
      measurement = undefined;
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
  requestAnimationFrame(() =>
    canvas.toBlob((blob) => {
      if (blob)
        download(blob, 'openlegend-' + stop().id + '-' + select('world-light').value + '.png');
    }),
  );
button('record').onclick = () => {
  if (!('MediaRecorder' in window)) {
    status.textContent = 'Video recording is unavailable in this browser.';
    return;
  }
  const stream = canvas.captureStream(30),
    chunks: Blob[] = [];
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  recorder.onstop = () => {
    stream.getTracks().forEach((track) => track.stop());
    button('record').disabled = false;
    if (!disposed)
      download(new Blob(chunks, { type: recorder!.mimeType }), 'openlegend-' + stop().id + '.webm');
    recorder = undefined;
  };
  recorder.start();
  button('record').disabled = true;
  status.textContent = 'Recording 8 seconds…';
  recordingTimer = setTimeout(() => {
    recorder?.stop();
    status.textContent = 'Recording saved.';
  }, 8000);
};
button('measure').onclick = () => {
  measurement = { start: performance.now(), intervals: [] };
  button('measure').disabled = true;
  metrics.textContent = 'Measuring this view for ten seconds…';
};
button('remount').onclick = () => {
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
  clearTimeout(recordingTimer);
  if (recorder?.state === 'recording') recorder.stop();
  reducedMotion.removeEventListener('change', pauseForPreference);
  scene.destroy();
}
window.addEventListener('pagehide', dispose);
window.addEventListener('pageshow', (event) => {
  if (!event.persisted || !disposed) return;
  disposed = false;
  prior = 0;
  measurement = undefined;
  button('measure').disabled = false;
  reducedMotion.addEventListener('change', pauseForPreference);
  mount();
  frame = requestAnimationFrame(update);
});
mount();
frame = requestAnimationFrame(update);
