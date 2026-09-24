import { chromium } from '@playwright/test';
import fs from 'node:fs';
const out = process.env.OBS_OUT, base = 'http://127.0.0.1:' + process.env.PORT;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
const errors = [], results = { errors, viewport: { width: 800, height: 600 } };
const checkpoint = () => fs.writeFileSync(out + '/browser.json', JSON.stringify(results, null, 2));
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
try {
  await page.goto(base + '/review.html');
  await page.waitForFunction(() => window.review?.ready, {}, { timeout: 120000 });
  const post = (url, body) => page.evaluate(async ({ url, body }) => {
    const state = await (await fetch('/api/state')).json();
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-OL-Generation': state.historyEpoch.split(':')[0] }, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  }, { url, body });
  // Use the application's ordinary background-running policy and a real live connection.
  // A slow first exposure must not make a missed browser heartbeat pause just one variant.
  results.background = await post('/api/profile/preferences', { pauseWhenHidden: false });
  await page.evaluate(() => new Promise((resolve, reject) => {
    const stream = new EventSource('/api/events'); window.review.stream = stream;
    stream.onopen = () => resolve(); stream.onerror = () => reject(new Error('Live stream failed'));
  }));
  results.control = await post('/api/control', { paused: false, clientId: 'review', presenceSequence: 1 });
  results.started = await page.evaluate(() => window.review.stop().simTime);
  await page.waitForTimeout(4000);
  await page.evaluate(() => window.review.start());
  await page.waitForTimeout(20000);
  results.stress = await page.evaluate(() => window.review.stop());
  checkpoint();
  results.pause = await post('/api/control', { paused: true });
  results.aspects = [];
  for (const projection of ['orthographic', 'perspective']) for (const pitch of [.45, .88, 1.15]) {
    await page.evaluate(({ pitch, projection }) => window.review.pose(1, pitch, projection), { pitch, projection });
    await page.waitForTimeout(200);
    results.aspects.push(await page.evaluate(() => window.review.aspect()));
  }
  checkpoint();
  results.prefs = await page.evaluate(() => window.review.preferences('nearby'));
  await page.waitForTimeout(500);
  results.rebuilds = [];
  for (let i = 0; i < 3; i++) { results.rebuilds.push(await page.evaluate(() => window.review.rebuild())); await page.waitForTimeout(500); }
  checkpoint();
  // Keep the timing record even if software-rendered capture is too slow. A screenshot is
  // separate visual evidence, not a prerequisite for retaining the mixed workload data.
  await page.evaluate(() => { window.review.stream.close(); window.review.freeze(); });
  try { await page.screenshot({ path: out + '/pitched.png', timeout: 15000 }); }
  catch (error) { results.screenshotError = String(error); }
  checkpoint();
} catch (error) {
  results.failure = String(error); checkpoint(); process.exitCode = 1;
} finally { await browser.close(); }
