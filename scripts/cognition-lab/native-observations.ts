import type { CognitionLabJson } from '@open-legend/protocol';
import { NativeSteps, EpisodeBlocked, object, type NativeMovement } from './native-steps.js';

/** Read new native history through the cold-aware owner. Some world outcomes do
 * not carry an action ID; a technical job binding is not a substitute for them. */
export async function observeNativeOutcome(
  native: NativeSteps,
  expected: {
    actorId: string;
    type: string;
    startedSim: number;
    priorHistoryIds: ReadonlySet<string>;
  },
): Promise<string | undefined> {
  for (const field of await native.api.fields(expected.actorId, 'history')) {
    if (
      expected.priorHistoryIds.has(field.id) ||
      field.label !== expected.type ||
      !field.detail?.id
    )
      continue;
    const source = await native.api.json<{ content?: { entry?: CognitionLabJson } }>(
      `/sources/${encodeURIComponent(field.detail.id)}`,
    );
    const entry = source.content?.entry;
    if (
      object(entry) &&
      entry['actorId'] === expected.actorId &&
      typeof entry['at'] === 'number' &&
      entry['at'] >= expected.startedSim
    )
      return field.id;
  }
  return undefined;
}

/** Lab and ordinary time use the same native arrival proof, independently of
 * whether the focal character chose to reply to that movement. */
export async function observeMovement(native: NativeSteps, movement: NativeMovement) {
  const { actorId, destination, startedSim, priorHistoryIds } = movement;
  const position = await native.position(actorId);
  const arrived =
    position.surfaceId === destination.surfaceId &&
    Math.hypot(position.x - destination.x, position.y - destination.y, position.z - destination.z) <
      0.16;
  const work = await native.work(actorId);
  const completedEventId = arrived
    ? await observeNativeOutcome(native, {
        actorId,
        type: native.type('moveOutcome'),
        startedSim,
        priorHistoryIds,
      })
    : undefined;
  if (!arrived && (!object(work) || work['type'] !== native.type('move')))
    throw new EpisodeBlocked('Native movement stopped before its declared arrival.');
  return {
    position,
    destination,
    work,
    arrived,
    completedEventId,
    complete: arrived && !!completedEventId && !work,
  };
}

/** Read actual participant evidence for one selected native attack. Never repeat
 * a miss to obtain a desired result or infer an injury from a spoken claim. */
export async function observeSingleAttack(
  native: NativeSteps,
  actorId: string,
  targetId: string,
  startedSim: number,
) {
  const health = async () => {
    const value = (await native.api.fields(targetId, 'body')).find(
      (field) => field.id === JSON.stringify(['meter', native.type('healthMeter')]),
    )?.value;
    if (typeof value !== 'number')
      throw new EpisodeBlocked('The target has no supported native health meter.');
    return value;
  };
  const beforeHealth = await health();
  const cached = new Map<string, CognitionLabJson>();
  let actionId: string | undefined;
  return {
    async captureAction() {
      const action = await native.work(actorId);
      if (
        object(action) &&
        action['type'] === native.type('attack') &&
        action['targetId'] === targetId &&
        typeof action['id'] === 'string'
      )
        actionId = action['id'];
    },
    async read() {
      const afterHealth = await health();
      let event: Record<string, CognitionLabJson> | undefined;
      for (const field of await native.api.fields(targetId, 'history')) {
        if (field.label !== native.type('attackOutcome') || !field.detail?.id) continue;
        let entry = cached.get(field.id);
        if (!entry) {
          const source = await native.api.json<{ content?: { entry?: CognitionLabJson } }>(
            `/sources/${encodeURIComponent(field.detail.id)}`,
          );
          entry = source.content?.entry;
          if (entry) cached.set(field.id, entry);
        }
        if (
          !object(entry) ||
          entry['actorId'] !== actorId ||
          entry['targetId'] !== targetId ||
          typeof entry['at'] !== 'number' ||
          entry['at'] < startedSim
        )
          continue;
        if (actionId && (!object(entry['data']) || entry['data']['actionId'] !== actionId))
          continue;
        event = entry;
        break;
      }
      const data = event?.['data'];
      return {
        actorId,
        targetId,
        actionId: actionId ?? null,
        beforeHealth,
        afterHealth,
        completedAttempt: !!event,
        injuryObserved:
          !!event &&
          object(data) &&
          data['contactInjury'] === true &&
          typeof data['damage'] === 'number' &&
          data['damage'] > 0 &&
          afterHealth < beforeHealth,
        participantIncluded:
          Array.isArray(event?.['audience']) && event['audience'].includes(targetId),
        nativeEvent: event ?? null,
      };
    },
  };
}

/** Native recipient acceptance is an explicit postlude, after primary capture.
 * Speech does not create an offer or constitute an inventory transfer. */
export async function acceptObservedOffer(
  native: NativeSteps,
  role: string,
  maximumWallSeconds: number,
) {
  const recipient = native.actor(role),
    donor = native.actor('focal');
  const descriptors = (
    await native.api.actions(recipient, native.type('acceptOffer'), donor)
  ).filter((choice) => {
    const command = choice.command;
    return (
      choice.available &&
      object(command) &&
      command['type'] === native.type('acceptOffer') &&
      command['handoverOperation'] === 'accept' &&
      command['targetId'] === donor
    );
  });
  const choices = [
    ...new Map(descriptors.map((choice) => [JSON.stringify(choice.command), choice])).values(),
  ];
  if (!choices.length)
    return {
      status: 'no-observed-acceptance-offer',
      providerCalls: 0,
      meaning: 'No native recipient acceptance was offered; speech alone is not a transfer.',
    };
  if (choices.length !== 1)
    throw new EpisodeBlocked('Several observed offers require an explicit recipient choice.');
  const selected = choices[0]!;
  if (
    !object(selected.command) ||
    typeof selected.command['offerId'] !== 'string' ||
    !Number.isSafeInteger(selected.command['expectedOfferRevision'])
  )
    throw new EpisodeBlocked('Native offer has no current revision identity.');
  const inventory = async (actorId: string) =>
    (await native.api.fields(actorId, 'possessions')).find(
      (field) => field.id === 'person.inventory',
    )?.value;
  const before = { recipient: await inventory(recipient), donor: await inventory(donor) };
  const beforeCalls = await native.api.nativeCallCount();
  await native.api.operation({
    kind: 'applySettings',
    settings: { policy: native.passive(recipient) },
  });
  const receipt = await native.submit(recipient, selected.command, native.passive(recipient));
  const current = await native.api.waitBoundary(maximumWallSeconds * 1000);
  if (current.run?.prepared || (await native.api.nativeCallCount()) !== beforeCalls)
    throw new EpisodeBlocked('The native acceptance postlude unexpectedly admitted model work.');
  const after = { recipient: await inventory(recipient), donor: await inventory(donor) };
  return {
    status: 'recipient-accepted-observed-offer',
    providerCalls: 0,
    selected,
    receipt,
    runId: current.run?.id,
    before,
    after,
    inventoryChanged: JSON.stringify(before) !== JSON.stringify(after),
    events: await native.api.events(),
    histories: {
      recipient: await native.api.fields(recipient, 'history'),
      donor: await native.api.fields(donor, 'history'),
    },
    meaning:
      'Completed transfer requires captured custody changes and native outcomes; the accepted command alone is insufficient.',
  };
}

/** Optional bounded transitions from the existing intake observer, never a tick
 * transcript. Disabled capture installs no callback and prepares no diagnostic. */
export function recordAdmission(
  director: import('../../apps/server/src/ai-director.js').AiDirector,
  budgetBytes: number,
) {
  if (!budgetBytes) return undefined;
  const lines: string[] = [];
  let bytes = 0,
    omitted = 0;
  const release = director.observeAdmission((event) => {
    const encoded = JSON.stringify(event);
    const size = Buffer.byteLength(encoded) + 1;
    if (size > budgetBytes - bytes) {
      omitted++;
      return;
    }
    lines.push(encoded);
    bytes += size;
  });
  return {
    stop() {
      release();
      return { events: lines.map((line) => JSON.parse(line) as unknown), bytes, omitted };
    },
  };
}
