import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, cp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { fixedCaptureSource } from './stable-variants.mjs';

const execFile = promisify(execFileCallback);
const source = dirname(fileURLToPath(import.meta.url));
const geometryPath = process.argv[2],
  outputPath = process.argv[3];
const probe = Number(process.argv[4] ?? 192);
const stable = ['stable', 'cold'].includes(process.argv[5]);
const cold = process.argv[5] === 'cold';
const sampleCount = stable ? 36 : 60;
if (!geometryPath || !outputPath || ![96, 192, 384].includes(probe))
  throw new Error(
    'Usage: node scripts/art/texel-splatting/run.mjs geometry.json output-directory [96|192|384] [stable|cold]',
  );
const upstreamCommit = '394d350f91842779ed4c45760bd4ea9a07ce5c4c';
const work = await mkdtemp(join(tmpdir(), 'openlegend-texel-e07-'));
const upstream = join(work, 'upstream');
await execFile('git', [
  'clone',
  '--quiet',
  'https://github.com/dylanebert/texel-splatting.git',
  upstream,
]);
await execFile('git', ['-C', upstream, 'checkout', '--quiet', upstreamCommit]);
for (const path of ['experiment.mjs', 'stable-variants.mjs', 'surface-grid.mjs'])
  await cp(join(source, path), join(work, path));
const geometryText = await readFile(resolve(geometryPath), 'utf8');
const geometry = JSON.parse(geometryText);
if (!Array.isArray(geometry.meshes) || !geometry.camera)
  throw new Error('Missing exported starting-scene geometry/camera.');
const vertexCount = geometry.meshes.reduce((sum, mesh) => sum + mesh.positions.length / 3, 0);
if (!vertexCount || vertexCount > 65535) throw new Error('E07 requires 1–65535 static vertices.');
for (const mesh of geometry.meshes) {
  if (
    mesh.positions.length % 3 ||
    mesh.normals.length !== mesh.positions.length ||
    ![...mesh.positions, ...mesh.normals].every(Number.isFinite) ||
    mesh.indices.length % 3 ||
    !mesh.indices.every(
      (index) => Number.isInteger(index) && index >= 0 && index < mesh.positions.length / 3,
    )
  )
    throw new Error(`Invalid static triangle geometry: ${mesh.name}`);
}
await writeFile(join(work, 'geometry.json'), geometryText);
// Change only sample density in a temporary source copy; preserve the MIT notice.
const upstreamHashes = {};
for (const path of ['src/splat.ts', 'src/lighting.ts', 'demo/direct.ts', 'LICENSE']) {
  const contents = await readFile(join(upstream, path), 'utf8');
  upstreamHashes[path] = createHash('sha256').update(contents).digest('hex');
  if (path === 'src/splat.ts') {
    const sampled = contents.replace('const PROBE_SIZE = 384;', `const PROBE_SIZE = ${probe};`);
    await writeFile(join(upstream, path), sampled);
    await writeFile(join(upstream, 'src/fixed-splat.ts'), fixedCaptureSource(sampled));
  }
}
await writeFile(
  join(work, 'index.html'),
  '<!doctype html><style>body{margin:0;background:#142019}canvas{width:1280px;height:720px;image-rendering:pixelated}output{display:block;color:white}</style><canvas></canvas><output>Preparing E07</output><script type="module" src="/experiment.mjs"></script>',
);
await mkdir(resolve(outputPath), { recursive: true });
const server = await createServer({
  configFile: false,
  root: work,
  server: { host: '127.0.0.1', port: 0, hmr: false },
  appType: 'spa',
});
let browser;
try {
  await server.listen();
  const address = server.httpServer.address();
  if (!address || typeof address === 'string') throw new Error('Missing E07 loopback listener.');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 760 },
    deviceScaleFactor: 1,
    recordVideo: { dir: resolve(outputPath), size: { width: 1280, height: 760 } },
  });
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${address.port}/?probe=${probe}${stable ? '&stable' : ''}`);
  await page.waitForFunction(() => !!window.e07, undefined, { timeout: 120000 });
  const base = geometry.camera,
    target = base.target,
    eye = base.position;
  const deck = geometry.meshes.find((mesh) => mesh.name === 'Lookout deck');
  const detailTarget = deck
    ? [0, 1, 2].map((axis) => {
        const values = deck.positions.filter((_, i) => i % 3 === axis);
        return (Math.min(...values) + Math.max(...values)) / 2;
      })
    : target;
  const paths = {
    within: (t) => ({ eye: [Math.round(eye[0]) - 0.2 + t * 0.4, eye[1], eye[2]], target }),
    boundary: (t) => ({ eye: [Math.round(eye[0]) + 0.3 + t * 0.4, eye[1], eye[2]], target }),
    orbit: (t) => {
      const angle = (t - 0.5) * 0.7,
        x = eye[0] - target[0],
        z = eye[2] - target[2];
      return {
        eye: [
          target[0] + x * Math.cos(angle) + z * Math.sin(angle),
          eye[1],
          target[2] - x * Math.sin(angle) + z * Math.cos(angle),
        ],
        target,
      };
    },
    zoom: (t) => ({ eye, target, fov: 70 - t * 35 }),
    light: (t) => ({ eye, target, elevation: 8 + t * 62 }),
    thin: (t) => ({
      eye: [detailTarget[0] + 1.7 + t * 0.4, detailTarget[1] + 2.2, detailTarget[2] + 5.5],
      target: detailTarget,
    }),
    disocclusion: (t) => ({
      eye: [detailTarget[0] - 2 + t * 4, detailTarget[1] + 0.7, detailTarget[2] + 5.5],
      target: detailTarget,
    }),
  };
  if (stable) paths.still = () => ({ eye, target });
  const selectedPaths = cold ? { boundary: paths.boundary } : paths;
  const runs = [];
  let visualTime = 0;
  for (const projection of stable ? ['perspective', 'orthographic'] : ['perspective'])
    for (const [path, at] of Object.entries(selectedPaths))
      for (const mode of stable ? ['direct', 'splat', 'fixed', 'surface'] : ['direct', 'splat']) {
        const options = (t) => ({
          ...at(t),
          projection,
          orthoHeight:
            2 *
            Math.hypot(...at(t).eye.map((v, i) => v - at(t).target[i])) *
            Math.tan(((at(t).fov ?? 60) * Math.PI) / 360),
        });
        // Preserve monotonically increasing probe time and settle the preceding
        // path's cell transition before taking measurements of a new path.
        let firstFrame;
        for (let i = 0; i < (cold ? 1 : 36); i++) {
          const result = await page.evaluate((options) => window.e07.frame(options), {
            ...options(0),
            captureOrigin: i === 0 ? at(0).eye : undefined,
            mode,
            time: (visualTime += 1 / 60),
          });
          if (i === 0) firstFrame = result;
        }
        const samples = [],
          images = [];
        for (let i = 0; i < (cold ? 1 : sampleCount); i++) {
          samples.push(
            await page.evaluate((options) => window.e07.frame(options), {
              ...options(i / (sampleCount - 1)),
              mode,
              time: (visualTime += 1 / 60),
            }),
          );
          await page.evaluate(() => new Promise(requestAnimationFrame));
          if ([0, Math.floor(sampleCount / 2), sampleCount - 1].includes(i)) {
            const filename = `${probe}-${projection}-${path}-${mode}-${i}.png`;
            const image = await page
              .locator('canvas')
              .screenshot({ path: join(resolve(outputPath), filename) });
            images.push({
              frame: i,
              file: filename,
              sha256: createHash('sha256').update(image).digest('hex'),
            });
          }
        }
        runs.push({ path, mode, projection, firstFrame, samples, images });
      }
  const details = await page.evaluate(() => ({
    geometry: window.e07.geometry,
    memory: window.e07.memory,
    coldPreparationMs: window.e07.coldPreparationMs,
    adapter: window.e07.adapter,
    settings: window.e07.settings,
    gpuErrors: window.e07.errors,
  }));
  const destruction = await page.evaluate(() => window.e07.destroy());
  const result = {
    upstreamCommit,
    profile: cold ? 'stable-first-capture' : stable ? 'stable-revisit' : 'original',
    adapterSha256: createHash('sha256')
      .update(await readFile(join(source, 'experiment.mjs')))
      .digest('hex'),
    fixedSourceSha256: createHash('sha256')
      .update(await readFile(join(upstream, 'src/fixed-splat.ts')))
      .digest('hex'),
    upstreamHashes,
    geometrySha256: createHash('sha256').update(geometryText).digest('hex'),
    work,
    recordedAt: new Date().toISOString(),
    browserVersion: browser.version(),
    userAgent: await page.evaluate(() => navigator.userAgent),
    videoPath: await page.video().path(),
    ...details,
    runs,
    browserErrors,
    destruction,
    providerCostUsd: 0,
  };
  await writeFile(join(resolve(outputPath), `e07-${probe}.json`), JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify({ output: resolve(outputPath), work, ...details, browserErrors, destruction }),
  );
} finally {
  await browser?.close();
  await server.close();
}
