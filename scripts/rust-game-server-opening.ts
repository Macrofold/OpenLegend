import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { selectedCreationProfileForCandidate } from '../packages/domain/src/index.js';
import { digest } from '../apps/server/src/content-digest.js';
import { CreationTargetRepository } from '../apps/server/src/creation-target.js';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import { SAVE_FORMAT } from '../apps/server/src/game-saves.js';
import { SaveFiles } from '../apps/server/src/save-files.js';
import { writeCheckpoint } from '../apps/server/src/checkpoint.js';
import { WorldRecords } from '../apps/server/src/world-records.js';
import { prepareOpeningReadiness } from '../apps/server/src/world-opening-authoring.js';
import { initializeCollisionRuntime } from '../packages/spatial/src/rapier.js';

// Publish build-time data from the actual, independently reviewed fresh
// opening. This never initializes or writes the server's destination DB.
const [databaseUrl, reviewedCandidate, output, approvedDigest, ...rest] = process.argv.slice(2);
if (
  !databaseUrl ||
  !reviewedCandidate ||
  !output ||
  !/^[a-f0-9]{64}$/.test(approvedDigest ?? '') ||
  rest.length
)
  throw new Error(
    'Usage: node --import tsx scripts/rust-game-server-opening.ts PREPARED_BUILD_DB CANDIDATE_JSON RELEASE_DIRECTORY APPROVED_COMPILED_DIGEST',
  );

const candidateFile = await readFile(reviewedCandidate, 'utf8');
const { candidate, profile } = selectedCreationProfileForCandidate(JSON.parse(candidateFile));
if (Buffer.byteLength(JSON.stringify(candidate)) > 24_000)
  throw new Error('The selected candidate exceeds the supported creation allowance.');
const actorId = profile.controlledActor(candidate);
const database = new PostgresDatabase(databaseUrl, true);
try {
  await initializeCollisionRuntime();
  const records = new WorldRecords(database);
  const initial = await database.readTransaction(async () => {
    // The Source activation records the digest before the SQL codec reorders
    // object fields. A reconstructed world cannot reproduce that byte digest.
    const approved = await new CreationTargetRepository(database).activation();
    const current = await records.load(true);
    if (
      !approved ||
      approved.candidateDigest !== digest(candidate) ||
      approved.compiledWorldDigest !== approvedDigest ||
      approved.worldId !== candidate.worldId ||
      !current ||
      current.revision !== 1 ||
      current.state.world.id !== candidate.worldId ||
      current.state.world.simTime !== 0 ||
      !current.state.manuallyPaused ||
      !current.state.world.paused
    )
      throw new Error('Prepare the exact approved paused opening before exporting it.');
    const world = current.state.world;
    const account = world.authorship.playerAccountIds[actorId];
    if (
      !account ||
      account !== approved.controlAccountId ||
      account !== approved.creatorAccountIdAtDestination ||
      Object.keys(world.authorship.playerAccountIds).length !== 1 ||
      (
        await database
          .prepare(
            'SELECT EXISTS(SELECT 1 FROM auth_construction_grants UNION ALL SELECT 1 FROM auth_camp_asset_grants) AS initial',
          )
          .get()
      )?.initial
    )
      throw new Error('This opening needs destination construction or camp asset provisioning.');
    const grant = await database
      .prepare('SELECT account_id FROM auth_grants WHERE world_id=? AND actor_id=?')
      .get(world.id, actorId);
    if (grant?.account_id !== account)
      throw new Error('The prepared world and its reviewed initial account disagree.');
    return { world, account };
  });
  const readiness = await prepareOpeningReadiness(candidate, initial.world);
  if (readiness.findings.some((finding) => finding.status !== 'ready'))
    throw new Error('Resolve the opening readiness checks before exporting it.');
  const files = new SaveFiles(join(output, 'opening-records'));
  const slotId = randomUUID();
  await writeCheckpoint(
    database,
    files,
    {
      id: slotId,
      worldId: initial.world.id,
      label: 'Reviewed opening',
      format: SAVE_FORMAT,
      kind: 'manual',
      sequence: 1,
    },
    { expectedRevision: 1 },
  );
  const checkpoint = await files.metadata(slotId);
  if (!checkpoint) throw new Error('The prepared opening file disappeared.');
  const descriptor = JSON.stringify({
    candidate,
    candidateDigest: digest(candidate),
    compiledWorldDigest: approvedDigest,
    checkpointSha256: checkpoint.checksum,
    slotId,
    worldId: initial.world.id,
    actorId,
    controlAccountId: initial.account,
    findings: readiness.findings.map((finding) => finding.message),
  });
  await writeFile(join(output, 'opening.json'), descriptor, { flag: 'wx' });
  console.log(
    JSON.stringify({
      openingSha256: createHash('sha256').update(descriptor).digest('hex'),
      worldId: initial.world.id,
    }),
  );
} finally {
  await database.close();
}
