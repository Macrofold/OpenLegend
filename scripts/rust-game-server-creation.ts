import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { selectedCreationProfileForCandidate } from '../packages/domain/src/index.js';
import {
  creationActivationRequestSchema,
  readCreationSourceConfig,
} from '../apps/server/src/creation-target-contracts.js';
import { WorldCreationClient } from '../apps/server/src/world-creation-client.js';
import { digest } from '../apps/server/src/content-digest.js';

const [operation, ...args] = process.argv.slice(2);
const [first, account, candidatePath, approvedDigest, deadline] = args;
const check = operation === 'check' && account && args.length <= 3;
const approve = operation === 'approve' && account && candidatePath && args.length === 5;
const activation = (operation === 'start' || operation === 'receipt') && args.length === 1;
if (!first || (!check && !approve && !activation))
  throw new Error(
    'Usage: rust-game-server-creation.ts check TARGET_ID CREATOR_ACCOUNT_ID [CANDIDATE_JSON]\n' +
      '       rust-game-server-creation.ts approve TARGET_ID CREATOR_ACCOUNT_ID CANDIDATE_JSON REVIEWED_COMPILED_DIGEST EXPIRY_UNIX_MS\n' +
      '       rust-game-server-creation.ts start APPROVED_ACTIVATION_JSON\n' +
      '       rust-game-server-creation.ts receipt APPROVED_ACTIVATION_JSON',
  );

const configuration = readCreationSourceConfig(process.env);
const client = new WorldCreationClient(configuration);
if (check || approve) {
  const candidate = candidatePath
    ? selectedCreationProfileForCandidate(JSON.parse(await readFile(candidatePath, 'utf8')))
        .candidate
    : undefined;
  const target = await client.check(first, account, candidate);
  if (approve) {
    if (!candidate || target.status !== 'ready' || target.compiledWorldDigest !== approvedDigest)
      throw new Error(
        'Check the destination and review its exact compiled opening before approval.',
      );
    const request = creationActivationRequestSchema.parse({
      sourceInstallationId: configuration.installationId,
      creatorAccountId: account,
      targetId: target.targetId,
      operationId: randomUUID(),
      approvalId: randomUUID(),
      targetGeneration: target.targetGeneration,
      targetProfileDigest: target.targetProfileDigest,
      candidateDigest: digest(candidate),
      compiledWorldDigest: approvedDigest,
      expiresAt: Number(deadline),
      candidate,
    });
    console.log(JSON.stringify(request));
  } else console.log(JSON.stringify(target));
} else {
  const request = creationActivationRequestSchema.parse(JSON.parse(await readFile(first, 'utf8')));
  if (request.sourceInstallationId !== configuration.installationId)
    throw new Error('The approved activation belongs to a different source installation.');
  const result =
    operation === 'start'
      ? await client.activate(request.creatorAccountId, request)
      : await client.receipt(request);
  console.log(JSON.stringify(result));
}
