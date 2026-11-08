import {
  buildReceivedRecentDirectory,
  defaultStoryPolicy,
  receivedEventEvidence,
  receivedEventAwareness,
  type Awareness,
  type ReceivedChargeDirectory,
  type ReceivedFrontier,
  type StoryPolicy,
  type StorySubject,
  type TemporalReceipt,
  type TemporalValue,
  type WorldEvent,
} from '@open-legend/domain';
import type { HistoryAccountCut, HistoryProjection } from './history-preparation.js';
import { personalEventEvidence } from './personal-accounts.js';
import type { ReceivedEventAccount } from './received-event-accounts.js';

/** The native occurrence owner certifies these are new allocated originals.
 * Rich personal bytes remain actor-scoped, immutable inputs to the same actual
 * history formatters; they are never repaired from objective event data. */
export interface NativeHistoryInput {
  readonly worldId: string;
  readonly generation: string;
  readonly baseCut: number;
  readonly policyRevision: number;
  readonly policyPayload?: string;
  readonly principals: readonly { actorId: string; ownerId: string }[];
  readonly changed: readonly { eventId: string; payload: string }[];
  readonly accounts: readonly {
    eventId: string;
    actorId: string;
    awarenessPayload?: string;
    temporal?: { receipt: TemporalReceipt; values: TemporalValue[]; bytes: number };
  }[];
  readonly cuts: readonly {
    actorId: string;
    at: number;
    maxAgeSeconds: number;
    forgotten: readonly string[];
    corrected: readonly string[];
    frontier?: ReceivedFrontier;
    recentPresent: boolean;
    recentDirectories: readonly ReceivedChargeDirectory[];
    recentBytes: number;
    recentCount: number;
  }[];
  readonly subjects: readonly StorySubject[];
}

/** Consume an actual native append capture through the existing evidence and
 * history writer contracts. Privacy edits/restore are separate semantic deltas;
 * this function cannot certify those operations or manufacture their changes. */
export function nativeAppendHistoryProjection(input: NativeHistoryInput): HistoryProjection {
  const changed = input.changed.map(({ eventId, payload }) => {
    const event = JSON.parse(payload) as WorldEvent;
    if (event.id !== eventId) throw new Error('Native history original identity disagrees.');
    return event;
  });
  const indexed = new Map(changed.map((event) => [event.id, event]));
  if (indexed.size !== changed.length) throw new Error('Duplicate native history original.');
  const accounts = new Map<string, Map<string, ReceivedEventAccount>>();
  const cuts = nativeHistoryAccountCuts(input.cuts);
  const accountCuts = new Map<string, HistoryAccountCut>();
  const forgotten = new Map<string, ReadonlySet<string>>();
  const personalText = new Map<string, ReadonlyMap<string, string>>();
  for (const event of changed) {
    accounts.set(event.id, new Map());
    personalText.set(event.id, new Map());
  }
  for (const source of input.accounts) {
    const event = indexed.get(source.eventId);
    const cut = cuts.get(source.actorId);
    if (!event?.audience.includes(source.actorId) || !cut)
      throw new Error('Native history account lacks its original audience and actor cut.');
    const selected = accounts.get(event.id)!;
    if (selected.has(source.actorId)) throw new Error('Duplicate native personal history account.');
    if (source.awarenessPayload !== undefined) {
      if (source.temporal) throw new Error('Native history account has two source authorities.');
      const awareness = JSON.parse(source.awarenessPayload) as Awareness;
      if (awareness.actorId !== source.actorId || awareness.eventId !== event.id)
        throw new Error('Native personal history source identity disagrees.');
      selected.set(source.actorId, { awareness, evidence: personalEventEvidence(awareness) });
    } else if (source.temporal) {
      const { receipt, values, bytes } = source.temporal;
      if (
        receipt.actorId !== source.actorId ||
        receipt.origin?.kind !== 'occurrence' ||
        receipt.origin.eventId !== event.id
      )
        throw new Error('Native temporal history source identity disagrees.');
      const evidence = receivedEventEvidence(source.actorId, values);
      const { actorId, physicalLife, epoch, batchOrder, entryIndex } = receipt;
      const locator = { actorId, physicalLife, epoch, batchOrder, entryIndex };
      const projected = receivedEventAwareness(source.actorId, receipt.origin, values, locator);
      if (!evidence || !projected)
        throw new Error('Native temporal history has no actual received event.');
      selected.set(source.actorId, {
        evidence,
        projected,
        temporal: {
          receipt: locator,
          receivedAt: receipt.at,
          bytes,
        },
      });
    } else throw new Error('Native history account has no acquired personal source.');
  }
  for (const event of changed)
    for (const actor of event.audience) {
      const cut = cuts.get(actor);
      if (!cut) throw new Error('Native history is missing an original audience cut.');
      if (!accountCuts.has(actor)) {
        accountCuts.set(actor, cut);
        forgotten.set(actor, cut.forgotten);
      }
    }
  const policy = (
    input.policyPayload === undefined ? undefined : JSON.parse(input.policyPayload)
  ) as StoryPolicy | null | undefined;
  return {
    worldId: input.worldId,
    initial: false,
    restore: false,
    policy: policy ?? defaultStoryPolicy(),
    policyRevision: input.policyRevision,
    policyChanged: false,
    principals: input.principals,
    fastAppend: true,
    changed,
    removed: [],
    newEventIds: new Set(indexed.keys()),
    accounts,
    accountCuts,
    personalText,
    subjects: new Map(input.subjects.map((subject) => [subject.id, subject])),
    forgotten,
    forgottenChanges: new Map(),
    awarenessChanges: new Map(),
    correctedEvents: new Map(),
  };
}

/** Rebuild the existing recent-directory read projection from actual complete
 * metadata at one fixed native cut. Used again when a pending save is captured
 * after later privacy or retention changes, without rebuilding old accounts. */
export function nativeHistoryAccountCuts(
  input: NativeHistoryInput['cuts'],
): ReadonlyMap<string, HistoryAccountCut> {
  const cuts = new Map<string, HistoryAccountCut>();
  for (const cut of input) {
    if (cuts.has(cut.actorId)) throw new Error('Duplicate native history actor cut.');
    const recent = cut.recentPresent
      ? buildReceivedRecentDirectory(cut.recentDirectories, cut.frontier)
      : undefined;
    if (
      (recent?.bytes ?? 0) !== cut.recentBytes ||
      (recent?.count ?? 0) !== cut.recentCount ||
      (!cut.recentPresent && cut.recentDirectories.length)
    )
      throw new Error('Native history recent metadata disagrees with its canonical cut.');
    cuts.set(cut.actorId, {
      actorId: cut.actorId,
      at: cut.at,
      maxAgeSeconds: cut.maxAgeSeconds,
      forgotten: new Set(cut.forgotten),
      corrected: new Set(cut.corrected),
      frontier: cut.frontier,
      recent: recent?.recent,
    });
  }
  return cuts;
}
