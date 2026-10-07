import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const repository = resolve(process.env.OPENLEGEND_OBSERVATION_REPOSITORY || process.cwd());
export const expectedCommit = 'af369fc2c7ba55d6621d49c18cff47f7513f7bf4';
export const profileDirectory = fileURLToPath(new URL('.', import.meta.url));
export const attemptDirectory = resolve(repository, 'test-results/time-profile-attempt-01');
export const sourceManifest = fileURLToPath(new URL('source-inputs.json', import.meta.url));
export const buildManifest = fileURLToPath(new URL('compiled-inputs.json', import.meta.url));
export const traceByteLimit = 64 * 1024 * 1024;
export const finalizeMilliseconds = 20_000;
