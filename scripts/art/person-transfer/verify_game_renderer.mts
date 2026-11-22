#!/usr/bin/env node
/** Verify packaged 2-slider body family in the actual game renderer (people-study.html / PersonPreviewRenderer / PersonStudyScene) with Unreal closed. */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, artRootArg, stageDirArg, outDirArg] = process.argv.slice(2);
if (!repoArg || !artRootArg || !stageDirArg || !outDirArg) {
  throw new Error('Usage: verify_game_renderer.mts <repo> <artRoot> <stagePackageDir> <outDir>');
}

const repo = resolve(repoArg);
const artRoot = resolve(artRootArg);
const stageDir = resolve(stageDirArg);
const outDir = resolve(outDirArg);

const require = createRequire(join(repo, 'package.json'));
const { chromium } = require('/Users/mike/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const localStagePath = join(artRoot, '2026-11-11-peacock-full-transfer/study/continuation/runtime/local-stage.mts');
const { startLocalStage } = await import(pathToFileURL(localStagePath).href);

const selection = JSON.parse(await readFile(join(stageDir, 'delivery/selection.json'), 'utf8'));
const profile = JSON.parse(await readFile(join(stageDir, 'kit/profile.json'), 'utf8'));
await mkdir(outDir, { recursive: true });

const work = await startLocalStage(repo, join(stageDir, 'delivery/study-index.json'));
let browser: any;
const errors: Array<{ kind: string; path?: string; status?: number; message?: string }> = [];
const blockedExternalOrigins = new Set<string>();
const written: string[] = [];

const timer = setTimeout(() => {
  void browser?.close();
  void work.close();
}, 300_000);

try {
  browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--enable-webgl', '--disable-background-timer-throttling'],
  });
  const page = await browser.newPage({ viewport: { width: 1450, height: 1024 }, deviceScaleFactor: 1 });
  await page.route('**/*', async (route: any) => {
    const target = new URL(route.request().url());
    if (target.origin === work.url || target.protocol === 'data:' || target.protocol === 'blob:') {
      await route.continue();
    } else {
      blockedExternalOrigins.add(target.origin);
      await route.abort();
    }
  });
  await page.addInitScript('globalThis.__name = (value) => value;');
  page.on('pageerror', (error: Error) => errors.push({ kind: 'page', message: error.message }));
  page.on('response', (response: any) => {
    if (response.status() >= 400) {
      errors.push({ kind: 'response', status: response.status(), path: new URL(response.url()).pathname });
    }
  });

  const url = new URL('/people-study.html', work.url);
  const fourPresets = Array.from({ length: 4 }, (_, idx) => selection.presets[Math.min(idx, selection.presets.length - 1)]!);
  for (const preset of fourPresets) {
    url.searchParams.append('family', selection.definitionPath);
    url.searchParams.append('preset', preset);
  }
  if (selection.part) url.searchParams.append('part', selection.part);
  await page.goto(url.href, { timeout: 45_000 });
  await page.getByRole('heading', { name: 'Build a character from the kit' }).waitFor({ timeout: 60_000 });

  const motionsAvailable = await page.evaluate(async ({ selection }) => {
    const load = (p: string) => import(p);
    const [{ readAssetJson }, { PersonPreviewRenderer }, { PersonStudyScene }] = await Promise.all([
      load('/src/asset-files.ts'),
      load('/src/characters/person-preview.ts'),
      load('/src/characters/person-study-scene.ts'),
    ]);
    const definition = await readAssetJson(selection.definitionPath);
    const defaults = Object.fromEntries(definition.controls.map((c: any) => [c.id, c.defaultValue]));
    const selections = Object.fromEntries(definition.selections.map((c: any) => [c.id, c.defaultValue]));
    const makeRecipe = (controls: Record<string, number>) => ({
      family: definition.reference,
      controls: { ...defaults, ...controls },
      selections,
    });
    const makeAppearance = (controls: Record<string, number>, dressed: boolean) => ({
      recipe: makeRecipe(controls),
      definition,
      compiled: definition.compiled,
      compiledPath: definition.compiledPath,
      parts: dressed ? [selection.part] : [],
    });
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    const frames = async () => {
      await frame();
      await frame();
    };
    const wait = async (pred: () => boolean, label: string) => {
      const end = performance.now() + 20_000;
      while (!pred()) {
        if (performance.now() > end) throw new Error('Timed out waiting for ' + label);
        await frame();
      }
    };

    const canvas = document.createElement('canvas');
    canvas.id = 'family-renderer-capture';
    Object.assign(canvas.style, { position: 'fixed', left: '0', top: '0', zIndex: '10000', display: 'block' });
    document.body.append(canvas);

    let preview: any;
    let scene: any;
    let state: any;
    const layout = (w: number, h: number) => Object.assign(canvas.style, { width: `${w}px`, height: `${h}px` });
    const dispose = () => {
      preview?.destroy();
      scene?.destroy();
      preview = undefined;
      scene = undefined;
    };

    const set = async (controls: Record<string, number>, dressed: boolean, clay: boolean) => {
      const req = makeAppearance(controls, dressed);
      if (!preview) {
        dispose();
        layout(540, 860);
        preview = new PersonPreviewRenderer(canvas, req, (v: any) => {
          state = v;
        });
      } else {
        preview.setAppearance(req.recipe, req.parts, false);
      }
      await wait(() => state?.recipe === req.recipe && !state.preparing, 'appearance commit');
      if (state.error) throw new Error(state.error);
      preview.setClay(clay);
      await frames();
      return { controls: state.recipe.controls, parts: state.parts, motions: state.motions };
    };

    const view = async (angle: string) => {
      if (angle === 'rightProfile') {
        preview.setView('front');
        preview.rotate(-Math.PI / 2);
      } else if (angle === 'back') {
        preview.setView('front');
        preview.rotate(Math.PI);
      } else if (angle === 'rearQuarter') {
        preview.setView('front');
        preview.rotate((3 * Math.PI) / 4);
      } else {
        preview.setView(angle);
      }
      await frames();
    };

    const pose = async (name?: string) => {
      if (!preview.setMotion(name, false)) throw new Error('Actor rejected motion: ' + (name ?? 'Rest'));
      await frames();
    };

    const runMovementCheck = async (controlsList: Array<Record<string, number>>, dressed: boolean, movement: string) => {
      dispose();
      layout(1360, 680);
      scene = new PersonStudyScene(
        canvas,
        controlsList.map((c) => makeAppearance(c, dressed)),
        () => {},
      );
      scene.setView('quarter');
      scene.setMovement(movement);
      scene.setPaused(true);
      await wait(() => scene.diagnostics().wearers.every((w: any) => w.state === 'ready' && !w.preparing), 'study scene');
      await frames();
      scene.setPaused(false);
      await sleep(900);
      const diag = scene.diagnostics();
      scene.setPaused(true);
      await frames();
      return diag;
    };

    const init = await set({}, false, true);
    (window as any).__familyHarness = { set, view, pose, runMovementCheck, dispose };
    return init.motions as string[];
  }, { selection });

  const take = async (filename: string) => {
    const full = join(outDir, filename);
    await page.locator('#family-renderer-capture').screenshot({ path: full, timeout: 15_000 });
    written.push(filename);
    return full;
  };

  // Sample presets across clay (normals off), textured covered, unmasked shirt, raised arms, and shirt removal/restoration
  const presets: Array<{ id: string; controls: Record<string, number> }> = profile.presets;
  const angles = ['front', 'quarter', 'rightProfile', 'profile', 'rearQuarter', 'back'];

  for (const preset of presets) {
    // 1. Clay (normals off) covered body across 6 angles in rest pose
    await page.evaluate(({ controls }) => (window as any).__familyHarness.set(controls, false, true), {
      controls: preset.controls,
    });
    await page.evaluate(() => (window as any).__familyHarness.pose(undefined));
    for (const angle of angles) {
      await page.evaluate((a) => (window as any).__familyHarness.view(a), angle);
      await take(`${preset.id}-clay-rest-${angle}.png`);
    }

    // 2. Final PBR material unmasked proofShirt in rest & raised arms (front, quarter, rightProfile, back)
    await page.evaluate(({ controls }) => (window as any).__familyHarness.set(controls, true, false), {
      controls: preset.controls,
    });
    for (const poseName of [undefined, 'Raised arms']) {
      if (poseName && !motionsAvailable.includes(poseName)) continue;
      await page.evaluate((p) => (window as any).__familyHarness.pose(p), poseName);
      const tag = poseName ? 'raised' : 'rest';
      for (const angle of ['front', 'quarter', 'rightProfile', 'back']) {
        await page.evaluate((a) => (window as any).__familyHarness.view(a), angle);
        await take(`${preset.id}-shirt-${tag}-${angle}.png`);
      }
    }
  }

  // 3. Shirt removal & baseline studioShorts restoration check on extreme preset
  const lastPreset = presets[presets.length - 1]!;
  for (const [stepTag, dressed] of [
    ['01-dressed', true],
    ['02-removed-shorts-restored', false],
    ['03-shirt-reapplied', true],
  ] as const) {
    await page.evaluate(
      ({ controls, dressed }) => (window as any).__familyHarness.set(controls, dressed, false),
      { controls: lastPreset.controls, dressed },
    );
    await page.evaluate(() => (window as any).__familyHarness.pose(undefined));
    await page.evaluate(() => (window as any).__familyHarness.view('quarter'));
    await take(`${lastPreset.id}-equipment-${stepTag}.png`);
  }

  // 4. Multi-wearer movement check (Walk) in PersonStudyScene
  const sceneControls = presets.length <= 4 ? presets.map((p) => p.controls) : [presets[0]!.controls, presets[4]!.controls, presets[presets.length - 1]!.controls];
  const walkDiag = await page.evaluate(
    ({ list }) => (window as any).__familyHarness.runMovementCheck(list, true, 'walk'),
    { list: sceneControls },
  );
  await take('study-scene-shirt-walk.png');

  await page.evaluate(() => (window as any).__familyHarness.dispose());

  const fatal = errors.filter((e) => e.kind === 'page' || e.status !== 404);
  if (fatal.length || blockedExternalOrigins.size) {
    throw new Error('Game renderer errors: ' + JSON.stringify({ fatal, blocked: [...blockedExternalOrigins] }));
  }

  // Stitch compact contact sheets for visual inspection via Python PIL
  const stitchPy = `
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw
out_dir = Path(sys.argv[1])
presets = json.loads(sys.argv[2])
angles = ['front', 'quarter', 'rightProfile', 'profile', 'rearQuarter', 'back']
tw, th = 220, 350
board = Image.new('RGB', (len(angles)*(tw+6)+12, len(presets)*(th+28)+12), (24, 26, 30))
draw = ImageDraw.Draw(board)
for r, p in enumerate(presets):
    oy = 8 + r*(th+28)
    draw.text((12, oy+4), f"{p['id']} · Game renderer clay (normals off)", fill=(235, 238, 242))
    for c, a in enumerate(angles):
        ox = 8 + c*(tw+6)
        im = Image.open(out_dir / f"{p['id']}-clay-rest-{a}.png").convert('RGB').resize((tw, th))
        board.paste(im, (ox, oy+22))
board.save(out_dir / 'contact-clay-6angle.png')

s_cols = ['rest-front', 'rest-quarter', 'rest-rightProfile', 'rest-back', 'raised-front', 'raised-quarter']
s_board = Image.new('RGB', (len(s_cols)*(tw+6)+12, len(presets)*(th+28)+12), (24, 26, 30))
s_draw = ImageDraw.Draw(s_board)
for r, p in enumerate(presets):
    oy = 8 + r*(th+28)
    s_draw.text((12, oy+4), f"{p['id']} · Unmasked proofShirt (rest + raised arms)", fill=(235, 238, 242))
    for c, col in enumerate(s_cols):
        f = out_dir / f"{p['id']}-shirt-{col}.png"
        if f.is_file():
            ox = 8 + c*(tw+6)
            im = Image.open(f).convert('RGB').resize((tw, th))
            s_board.paste(im, (ox, oy+22))
s_board.save(out_dir / 'contact-shirt-rest-raised.png')
`;
  execFileSync('/Users/mike/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python', [
    '-c',
    stitchPy,
    outDir,
    JSON.stringify(presets),
  ]);

  const summary = {
    presets: presets.map((p) => p.id),
    motionsAvailable,
    capturesWritten: written.length,
    contactSheets: ['contact-clay-6angle.png', 'contact-shirt-rest-raised.png', 'study-scene-shirt-walk.png'],
    walkWearersReady: walkDiag.wearers.length,
    blockedExternalOrigins: [...blockedExternalOrigins],
    pageErrors: fatal,
  };
  await writeFile(join(outDir, 'renderer-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
} finally {
  clearTimeout(timer);
  await browser?.close();
  await work.close();
}
