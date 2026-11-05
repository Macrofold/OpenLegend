import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open, realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { entityGet } from '@open-legend/domain';
import type { CreationHostRuntime } from '../../apps/server/src/creation-host.js';
import { SAVE_FORMAT } from '../../apps/server/src/game-saves.js';
import { labSavedDataSchema } from '../../apps/server/src/cognition-lab-records.js';
import { episodeAutonomousActors, type EpisodeSpec } from './contracts.js';
import { LabCampaignClient } from './client.js';
import { EpisodeBlocked, NativeSteps, object } from './native-steps.js';

export async function validateOrigin(
  inputPath: string,
  spec: EpisodeSpec,
): Promise<{ path: string; bytes: number; sha256: string }> {
  if (isAbsolute(spec.origin.path))
    throw new EpisodeBlocked('Declare an input-relative portable origin path.');
  const path = await realpath(resolve(dirname(inputPath), spec.origin.path));
  const allowed = await realpath(
    process.env['OPENLEGEND_JOB_INPUTS'] ?? resolve(dirname(inputPath), '..'),
  );
  const child = relative(allowed, path);
  if (child === '..' || child.startsWith('..' + sep) || isAbsolute(child))
    throw new EpisodeBlocked('Origin escapes the declared input mounts.');
  const metadata = await stat(path);
  if (!metadata.isFile()) throw new EpisodeBlocked('Origin is not a portable regular bundle.');
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  const sha256 = hash.digest('hex');
  if (sha256 !== spec.origin.sha256)
    throw new EpisodeBlocked('Origin checksum differs from the frozen episode.');
  const handle = await open(path, 'r'),
    bytes = Buffer.alloc(8192);
  let header: unknown;
  try {
    const n = await handle.read(bytes, 0, bytes.length, 0);
    const text = bytes.subarray(0, n.bytesRead).toString('utf8');
    const end = text.indexOf('\n');
    if (end < 0) throw new EpisodeBlocked('Origin has no bounded Lab header.');
    header = JSON.parse(text.slice(0, end));
  } finally {
    await handle.close();
  }
  if (
    !header ||
    typeof header !== 'object' ||
    !('format' in header) ||
    header.format !== SAVE_FORMAT ||
    !('kind' in header) ||
    header.kind !== 'scenario' ||
    !('id' in header) ||
    header.id !== spec.origin.savedId
  )
    throw new EpisodeBlocked('Origin is not the selected current-format Lab scenario.');
  return { path, bytes: metadata.size, sha256 };
}

export async function prepareEpisode(
  host: CreationHostRuntime,
  api: LabCampaignClient,
  spec: EpisodeSpec,
  path: string,
) {
  const lab = host.cognitionLab;
  if (!lab) throw new EpisodeBlocked('The ordinary Lab runtime is unavailable.');
  await api.refresh();
  await api.operation({ kind: 'controlRun', action: 'hold' });
  const imported = await api.importOrigin(path);
  if (imported.savedId && imported.savedId !== spec.origin.savedId)
    throw new EpisodeBlocked('Origin import selected an unexpected saved identity.');
  // Read saved private experiment evidence only after its native world is
  // installed; importing an archive does not grant disclosure in another world.
  await api.operation({
    kind: 'loadScenario',
    savedId: spec.origin.savedId,
    keepCurrentModels: true,
  });
  const session = await host.service.store.authority!.authenticate(
    host.service.localSessionToken,
    Date.now(),
  );
  const original = await lab.withAuthority(
    host.service.localScope,
    session,
    api.connectionId,
    async () => {
      const record = await lab.records.getRecord(spec.origin.savedId, 'scenario');
      if (!record) throw new EpisodeBlocked('Imported origin is unavailable.');
      return lab.saves.readExperiment(labSavedDataSchema.parse(record.data).experimentArtifactId);
    },
  );
  const originalSettings = object(original.settings) ? original.settings : {};
  const originalModels = object(originalSettings['models']) ? originalSettings['models'] : {};
  // Auxiliary model defaults belong to the frozen origin, not the worker image.
  for (const [purpose, value] of Object.entries(originalModels)) {
    if (typeof value !== 'string') continue;
    if (purpose === 'summary') {
      host.config.summaryModel = value;
      host.config.macrofoldSummaryModel = value;
    }
    if (purpose === 'reflection') host.config.macrofoldModel = value;
  }
  for (const edit of spec.protocol.profileEdits ?? []) {
    const actorId = spec.origin.actorIds[edit.actor];
    if (!actorId) throw new EpisodeBlocked('Profile edit names an undeclared actor.');
    const fields = await api.fields(actorId, 'person');
    for (const [key, value] of Object.entries(edit.expected))
      if (fields.find((field) => field.id === `person.${key}`)?.value !== value)
        throw new EpisodeBlocked(`Origin profile ${key} differs from its frozen character source.`);
    const edits = Object.entries(edit.values).map(([key, value]) => {
      const field = fields.find((field) => field.id === `person.${key}`);
      if (!field?.owner || !field.editable)
        throw new EpisodeBlocked('A declared native profile field is unavailable.');
      return {
        actorId,
        fieldId: field.id,
        owner: field.owner,
        baseValue: field.value,
        value,
        token: field.token,
      };
    });
    if (edits.length) await api.operation({ kind: 'applyEdits', edits });
  }
  for (const actorId of new Set(Object.values(spec.origin.actorIds))) {
    if (!entityGet(lab.runtime.service.world.entities, actorId)?.actor)
      throw new EpisodeBlocked('A declared actor is missing from the imported origin.');
    if ((await api.fields(actorId, 'custom')).length)
      throw new EpisodeBlocked(
        'Historical matrix origins cannot contain model-only experimental hints.',
      );
  }
  const focal = spec.origin.actorIds['focal'],
    visitor = spec.origin.actorIds['visitor'];
  if (!focal || !visitor) throw new EpisodeBlocked('Declare focal and visitor actors.');
  await api.operation({ kind: 'setParticipants', actorIds: [visitor] });
  const auxiliary = Object.fromEntries(
    Object.entries(originalModels).filter(
      ([key, value]) => ['summary', 'reflection'].includes(key) && typeof value === 'string',
    ),
  );
  await api.operation({
    kind: 'applySettings',
    settings: {
      models: {
        ...auxiliary,
        judgment: spec.judgmentModel,
        responseFast: spec.model.model,
        responseComplex: spec.model.model,
        higherDecision: spec.model.model,
      },
      effort: spec.model.effort ?? null,
      maxOutputTokens: spec.model.maxOutputTokens,
      directoryOnlyActivities: spec.directoryOnlyActivities ?? [],
      policy: {
        mode: 'oneResponse',
        focalActorId: focal,
        autonomousActorIds: episodeAutonomousActors(spec),
        durationSeconds: spec.limits.simulationSeconds,
        maximumCalls: spec.limits.maximumCalls,
        activeWallSeconds: spec.limits.activeWallSeconds,
        stopCondition: { kind: 'nextStage' },
      },
    },
  });
  for (const id of episodeAutonomousActors(spec))
    if (!entityGet(lab.runtime.service.world.entities, id)?.actor)
      throw new EpisodeBlocked('A declared autonomous actor is absent from the origin.');
  const setup: unknown[] = [];
  const executionPolicy = (await api.refresh()).settings.policy;
  if (spec.protocol.nativeSetup?.length) {
    const native = new NativeSteps(api, spec);
    const policy = { ...native.passive(focal), durationSeconds: 0.05 };
    await api.operation({ kind: 'applySettings', settings: { policy } });
    await api.operation({ kind: 'controlRun', action: 'stop' });
    for (const step of spec.protocol.nativeSetup) {
      const before = (await api.refresh()).gameTime;
      const result = await native.perform(step, policy);
      await api.waitBoundary(spec.limits.observationWallSeconds * 1000);
      // Native setup never continues an auxiliary model capture. Close its
      // original interval before another intention or policy replacement.
      await api.operation({ kind: 'controlRun', action: 'stop' });
      setup.push({ step, before, after: (await api.refresh()).gameTime, result });
    }
    await api.operation({ kind: 'applySettings', settings: { policy: executionPolicy } });
  }
  const world = lab.runtime.service.world;
  if (spec.origin.seed !== null && world.seed !== spec.origin.seed)
    throw new EpisodeBlocked('Imported randomness differs from the declared seed.');
  return {
    importedSavedId: spec.origin.savedId,
    worldId: world.id,
    seed: world.seed,
    settings: (await api.refresh()).settings,
    auxiliaryModels: auxiliary,
    profileEdits: spec.protocol.profileEdits?.length ?? 0,
    nativeSetup: setup,
    ...(setup.length
      ? {
          nativeSetupState: {
            gameTime: world.simTime,
            actors: Object.fromEntries(
              await Promise.all(
                [focal, visitor].map(async (id) => [
                  id,
                  {
                    work: await api.fields(id, 'work'),
                    possessions: await api.fields(id, 'possessions'),
                  },
                ]),
              ),
            ),
          },
        }
      : {}),
  };
}
