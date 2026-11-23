import { createHash, randomUUID } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  entityKeys,
  isSafeRecordId,
  selectedCreationProfileForCandidate,
} from '../packages/domain/src/index.js';
import { constructionPermissionSchema } from '../apps/server/src/authority.js';
import { readAssetIndex } from '../apps/server/src/asset-configuration.js';
import { digest } from '../apps/server/src/content-digest.js';
import { prepareReviewedOpening } from '../apps/server/src/initial-world-preparation.js';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import { SAVE_FORMAT } from '../apps/server/src/checkpoint-format.js';
import { SaveFiles } from '../apps/server/src/save-files.js';
import { writeCheckpoint } from '../apps/server/src/checkpoint.js';
import { initializeCollisionRuntime } from '../packages/spatial/src/rapier.js';
import { createDisposableDatabase } from './disposable-postgres.mjs';
import { writeRustGameServerStorage } from './rust-game-server-storage.js';
import { writeOpeningRecords } from './rust-opening-records.js';

const [operation, input, account, artworkIndex, output, approved, ...rest] = process.argv.slice(2);
const review = operation === 'review' && !output && !approved;
const publish = operation === 'publish' && output && /^[a-f0-9]{64}$/.test(approved ?? '');
if (!input || !account || !artworkIndex || rest.length || (!review && !publish))
  throw new Error(
    'Usage: rust-game-server-opening.ts review CANDIDATE_JSON CONTROL_ACCOUNT ARTWORK_INDEX\n' +
      '       rust-game-server-opening.ts publish CANDIDATE_JSON CONTROL_ACCOUNT ARTWORK_INDEX NEW_RELEASE_DIRECTORY APPROVED_COMPILED_DIGEST\n' +
      'Publish requires an explicit loopback OPENLEGEND_BUILD_DATABASE_ADMIN_URL.',
  );
if (!isSafeRecordId(account) || account.length > 100 || account.includes('\0'))
  throw new Error('The reviewed opening requires a valid destination account ID.');

const candidateFile = await readFile(input, 'utf8');
const { candidate, profile } = selectedCreationProfileForCandidate(JSON.parse(candidateFile));
if (Buffer.byteLength(JSON.stringify(candidate)) > 24_000)
  throw new Error('The selected candidate exceeds the supported creation allowance.');
await initializeCollisionRuntime();
const actorId = profile.controlledActor(candidate);
const initial = profile.build(candidate, {
  creatorAccountIds: [account],
  playerAccountId: account,
});
const selectedArtwork = await readAssetIndex(artworkIndex);
const { savedWorld, ready, findings } = await prepareReviewedOpening(
  initial,
  new Map([[actorId, account]]),
  candidate,
  selectedArtwork.release,
);
if (!ready) throw new Error('Resolve the opening readiness checks before exporting it.');
const compiledWorldDigest = digest(savedWorld);
const candidateDigest = digest(candidate);
const constructionGrants = initial.constructionSeeds.map((grant) =>
  constructionPermissionSchema.parse(grant),
);
const summary = {
  worldId: candidate.worldId,
  actorId,
  controlAccountId: account,
  candidateDigest,
  compiledWorldDigest,
  entities: entityKeys(savedWorld.world.entities).length,
  constructionGrants,
  findings,
};

if (review) {
  console.log(JSON.stringify(summary));
} else {
  if (!output || approved !== compiledWorldDigest)
    throw new Error('The compiled initial world differs from the approved opening.');
  const admin = process.env['OPENLEGEND_BUILD_DATABASE_ADMIN_URL'];
  if (!admin) throw new Error('Publish requires OPENLEGEND_BUILD_DATABASE_ADMIN_URL.');
  let ownsOutput = false;
  try {
    // Reuse the first-save codec only in our own temporary database. No
    // listener, model, gameplay tick, access grant or destination writer runs.
    const temporary = await createDisposableDatabase(admin);
    let openingSha256: string;
    try {
      const seed = new PostgresDatabase(temporary.url);
      try {
        await writeOpeningRecords(seed, savedWorld);
      } finally {
        await seed.close();
      }
      // Export all release inputs and the checkpoint before dropping the same
      // immutable opening. The tool owns the directory after this succeeds.
      await writeRustGameServerStorage(output, temporary.url, selectedArtwork, true);
      ownsOutput = true;
      const records = new PostgresDatabase(temporary.url, true);
      const files = new SaveFiles(join(output, 'opening-records'));
      const slotId = randomUUID();
      try {
        await writeCheckpoint(
          records,
          files,
          {
            id: slotId,
            worldId: candidate.worldId,
            label: 'Reviewed opening',
            format: SAVE_FORMAT,
            kind: 'manual',
            sequence: 1,
          },
          { expectedRevision: 1 },
        );
      } finally {
        await records.close();
      }
      const checkpoint = await files.metadata(slotId);
      if (!checkpoint) throw new Error('The prepared opening file disappeared.');
      const descriptor = JSON.stringify({
        candidate,
        candidateDigest,
        compiledWorldDigest,
        checkpointSha256: checkpoint.checksum,
        slotId,
        worldId: candidate.worldId,
        actorId,
        controlAccountId: account,
        constructionGrants,
        findings,
      });
      await writeFile(join(output, 'opening.json'), descriptor, { flag: 'wx' });
      openingSha256 = createHash('sha256').update(descriptor).digest('hex');
    } finally {
      await temporary.close();
    }
    console.log(JSON.stringify({ openingSha256, worldId: candidate.worldId }));
  } catch (error) {
    if (ownsOutput) await rm(output, { recursive: true, force: true });
    throw error;
  }
}
