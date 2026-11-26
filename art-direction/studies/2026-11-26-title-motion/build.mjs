// Rebuild the complete, dependency-free HTML from the readable source files.
// Run: node build.mjs
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
const source = (name) => readFile(new URL('./src/' + name, import.meta.url), 'utf8');
const css =
  (await source('gallery.css')).replace('.stage .word{position:', '.word{position:') +
  '\n' +
  (await source('original-effects.css'));
const names = [
  'engine.js',
  'winter-pack.js',
  'dark-pack.js',
  'mythic-pack.js',
  'original-effects.js',
  'gallery.js',
];
const scripts = (await Promise.all(names.map(source))).join('\n\n');
const html = (await source('shell.html'))
  .replace('/*STYLES*/', css)
  .replace('/*SCRIPTS*/', scripts);
await mkdir(new URL('./dist/', import.meta.url), { recursive: true });
await writeFile(new URL('./dist/index.html', import.meta.url), html);
await writeFile(new URL('./dist/open-legend-title-atlas.html', import.meta.url), html);
await copyFile(
  new URL('./src/originals.html', import.meta.url),
  new URL('./dist/originals.html', import.meta.url),
);
console.log('Built 48 title studies in ' + new URL('./dist/', import.meta.url).pathname);
