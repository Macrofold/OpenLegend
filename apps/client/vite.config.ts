import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const workspace = fileURLToPath(new URL('../..', import.meta.url));
export default defineConfig({
  root,
  server: { fs: { allow: [workspace] } },
  build: { outDir: `${workspace}/dist/client`, emptyOutDir: true, target: 'es2022' },
});
