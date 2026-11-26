import { localLabEnvironment } from './lab-environment.mjs';
import { fileURLToPath } from 'node:url';

if (typeof process.execve !== 'function')
  throw new Error('Loading .env for pnpm dev needs Node.js 22.15 or later on a Unix host.');

// Node loads the developer's existing dotenv settings. Replace it before
// starting the world so the Rust process owns the port and shutdown signals.
const launcher = fileURLToPath(new URL('../bin/serve-rust-game.sh', import.meta.url));
process.execve('/bin/sh', ['/bin/sh', launcher, ...process.argv.slice(2)], {
  ...process.env,
  ...localLabEnvironment(process.env),
});
