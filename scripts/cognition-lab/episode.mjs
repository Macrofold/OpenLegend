// Repeat one declared experiment through the same native control, conversation,
// checkpoint and evidence owners as the browser. Results store receipts, never
// private model input/output. Inspect retained job IDs through the Lab.
import { randomUUID, createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { json } from '../verification-workers/files.mjs';
import { openLab } from './session.mjs';

const digest = (text) => createHash('sha256').update(text).digest('hex');
export const episodeDigest = (spec) => digest(JSON.stringify(spec));
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const string = (s) => typeof s === 'string' && s.trim().length > 0;
const fields = (value, keys) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).every((k) => keys.includes(k));

export function validateEpisode(spec) {
  if (
    !fields(spec, [
      'id',
      'checkpoint',
      'stimuli',
      'settings',
      'limits',
      'setupSeconds',
      'source',
    ]) ||
    !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(spec.id ?? '') ||
    (spec.setupSeconds !== undefined &&
      (!Number.isFinite(spec.setupSeconds) ||
        spec.setupSeconds <= 0 ||
        spec.setupSeconds >= spec.limits?.simulatedSeconds)) ||
    (spec.source !== undefined && !['opening', 'game'].includes(spec.source)) ||
    !uuid.test(spec.checkpoint) ||
    !Array.isArray(spec.stimuli) ||
    !spec.stimuli.length ||
    !fields(spec.limits, ['wallSeconds', 'simulatedSeconds', 'maxCalls']) ||
    !Number.isSafeInteger(spec.limits.maxCalls) ||
    spec.limits.maxCalls < 1 ||
    !Number.isFinite(spec.limits.simulatedSeconds) ||
    spec.limits.simulatedSeconds <= 0 ||
    !Number.isFinite(spec.limits.wallSeconds) ||
    spec.limits.wallSeconds <= 0
  )
    throw new Error(
      'Each episode needs an ID, immutable checkpoint UUID, ordered stimuli and finite positive wall/simulation/call limits.',
    );
  if (spec.settings && !fields(spec.settings, ['fastModel', 'complexModel', 'outputTokens']))
    throw new Error('The episode contains unknown model settings.');
  for (const step of spec.stimuli) {
    if (
      !fields(step, ['actor', 'target', 'focal', 'kind', 'text', 'volume']) ||
      !['say', 'act'].includes(step.kind) ||
      !string(step.text) ||
      (step.actor !== undefined && !string(step.actor)) ||
      (step.target !== undefined && !string(step.target)) ||
      (step.focal !== undefined && !string(step.focal)) ||
      (step.kind === 'say' && !string(step.target)) ||
      (step.kind === 'act' &&
        (!string(step.actor) || !string(step.focal) || step.volume !== undefined))
    )
      throw new Error(
        'Choose a current speaker, addressee and text for speech, or an NPC, focal NPC and text for an action.',
      );
  }
  return spec;
}

async function roleBindings(host, view, roles) {
  const people = view.entities.filter((e) => e.kind === 'actor' && e.id !== view.player?.id);
  const names = new Set(roles.filter(Boolean));
  const matches = new Map();
  for (const p of people) {
    // Visible contacts may all be called “person”. The signed creator inspector
    // can distinguish their authored identities without accepting a raw actor ID.
    const record = await host.request('/api/god/editor/person', { actorId: p.id });
    for (const name of names) {
      if (record.profile?.name !== name) continue;
      if (matches.has(name)) throw new Error('A declared NPC profile is ambiguous.');
      matches.set(name, p.id);
    }
  }
  if (names.size !== matches.size)
    throw new Error('A declared NPC profile is absent from the current signed view.');
  return matches;
}

async function restore(host, checkpoint, requestId, deadline) {
  await host.state();
  try {
    await host.request('/api/saves/load', { id: checkpoint, requestId });
  } catch (error) {
    if (error.code !== 'pending') throw error;
  }
  // The supervisor replaces the world and all contact handles. Poll only for
  // the exact durable load receipt, never resubmit the checkpoint operation.
  await host.waitFor(async () => {
    try {
      await host.state();
      return (await host.request('/runs')).currentLoadId === requestId;
    } catch (error) {
      if (error.status === 503 || error.status === 409 || error.code === 'scope-changed')
        return false;
      throw error;
    }
  }, deadline);
}

export async function runEpisode(spec, { address, output, execute, initializeSource = false }) {
  validateEpisode(spec);
  await mkdir(output, { mode: 0o700 });
  // Creation is exclusive. A second process cannot repeat an uncertain paid
  // attempt under a new identity after an interrupt or an ambiguous response.
  const result = {
    id: spec.id,
    episodeSha256: episodeDigest(spec),
    checkpoint: spec.checkpoint,
    loadId: randomUUID(),
    mode: execute ? 'execute' : 'prepare',
    status: 'started',
    steps: [],
  };
  const write = () => json(join(output, 'episode.json'), result);
  await write();
  let host;
  try {
    host = await openLab(address);
    const deadline = Date.now() + spec.limits.wallSeconds * 1000;
    if (initializeSource) {
      // Only a freshly provisioned worker can establish this declared origin.
      // A live operator run always restores its already existing checkpoint.
      if (!spec.source) throw new Error('A fresh native worker needs a declared origin.');
      await host.request('/prepare', { source: spec.source });
      await host.state();
      await host.request('/api/saves/create', {
        id: spec.checkpoint,
        label: spec.id,
        scenario: true,
      });
    }
    await restore(host, spec.checkpoint, result.loadId, deadline);
    await host.control();
    if (spec.settings) await host.request('/decisions/settings', spec.settings);
    result.settings = (await host.request('/decisions/settings')).settings;
    let calls = 0,
      simulated = 0;
    if (spec.setupSeconds) {
      await host.request('/decisions/control', {
        action: 'resume',
        run: {
          mode: 'advance-time',
          autonomy: 'off',
          maxCalls: 0,
          simulatedSeconds: spec.setupSeconds,
          wallSeconds: Math.max(0, (deadline - Date.now()) / 1000),
        },
      });
      const warmup = await host.waitFor(async () => {
        const { run } = await host.request('/decisions');
        return run?.mode === 'advance-time' && run.reason ? run : undefined;
      }, deadline);
      if (warmup.reason !== 'duration-complete' || warmup.calls !== 0)
        throw new Error('The native zero-call setup interval did not complete.');
      result.setupSeconds = simulated = Math.max(0, warmup.throughSim - warmup.startedAtSim);
      await write();
    }
    for (const stimulus of spec.stimuli) {
      const view = await host.state();
      const roles = await roleBindings(host, view, [
        stimulus.actor,
        stimulus.target,
        stimulus.focal,
      ]);
      const actorId = roles.get(stimulus.actor),
        targetId = roles.get(stimulus.target),
        focalActorId = roles.get(stimulus.focal);
      const step = { requestId: randomUUID(), retainedId: randomUUID() };
      result.steps.push(step);
      await write();
      const sent = actorId
        ? await host.request('/decisions/stimuli', {
            actorId,
            targetId,
            focalActorId,
            requestId: step.requestId,
            kind: stimulus.kind,
            text: stimulus.text,
            volume: stimulus.volume,
          })
        : await host.request('/api/chat', {
            requestId: step.requestId,
            npcId: targetId,
            text: stimulus.text,
            volume: stimulus.volume ?? 'normal',
          });
      if (!sent.jobId) throw new Error('The native stimulus did not produce a conversation job.');
      step.jobId = sent.jobId;
      await write();
      const prepared = await host.waitFor(async () => {
        const item = (await host.request('/decisions')).prepared;
        if (item && item.jobId !== step.jobId)
          throw new Error('Another job owns the held request.');
        return item;
      }, deadline);
      if (typeof prepared.input !== 'string')
        throw new Error('The server withheld the prepared input.');
      step.prepared = {
        attemptId: prepared.attemptId,
        stage: prepared.stage,
        model: prepared.model,
        inputSha256: digest(prepared.input),
      };
      await write();
      if (!execute) {
        await host.request('/decisions/control', {
          action: 'cancel',
          attemptId: prepared.attemptId,
        });
      } else {
        const remainingSeconds = (deadline - Date.now()) / 1000;
        if (
          remainingSeconds <= 0 ||
          calls >= spec.limits.maxCalls ||
          simulated >= spec.limits.simulatedSeconds
        )
          throw new Error('The declared episode allowance was exhausted.');
        await host.request('/decisions/control', {
          action: 'resume',
          attemptId: prepared.attemptId,
          run: {
            mode: 'one-response',
            jobId: step.jobId,
            autonomy: 'off',
            ...(focalActorId && { focalActorId }),
            wallSeconds: remainingSeconds,
            maxCalls: spec.limits.maxCalls - calls,
            simulatedSeconds: spec.limits.simulatedSeconds - simulated,
          },
        });
        const run = await host.waitFor(async () => {
          const run = (await host.request('/decisions')).run;
          return run?.reason && run.jobId === step.jobId ? run : undefined;
        }, deadline);
        calls += run.calls;
        simulated += Math.max(0, run.throughSim - run.startedAtSim);
        step.interval = { reason: run.reason, calls: run.calls };
        if (run.reason !== 'one-response')
          throw new Error('The native interval ended at ' + run.reason);
      }
      const retained = await host.waitFor(async () => {
        try {
          return (
            await host.request('/runs', {
              id: step.retainedId,
              label: spec.id,
              jobId: step.jobId,
              loadId: result.loadId,
            })
          ).run;
        } catch (error) {
          if (error.code === 'run-active') return false;
          throw error;
        }
      }, deadline);
      if (retained.originId !== spec.checkpoint || retained.loadId !== result.loadId)
        throw new Error('The retained run belongs to a different checkpoint or restore.');
      step.outcome = retained;
      await write();
    }
    result.status = 'completed';
    await write();
  } catch (error) {
    result.status = 'interrupted';
    result.reason = error.message;
    await write();
    throw error;
  } finally {
    await host?.close();
  }
  return result;
}
