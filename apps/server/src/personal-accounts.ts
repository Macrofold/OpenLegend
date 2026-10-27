import { createHash } from 'node:crypto';
import {
  receivedEventEvidence,
  receivedEventAwareness,
  temporalReceiptId,
  type Awareness,
  type EventEvidence,
  type TemporalReceipt,
  type TemporalReceiptLocator,
  type TemporalValue,
} from '@open-legend/domain';
import type { StorySource } from './history.js';
import { temporalChunkRecordId } from './temporal-storage.js';

export const personalAccountRevision = (payload: string) =>
  createHash('sha256').update(payload).digest('hex');

export function personalEventEvidence(awareness: EventEvidence): EventEvidence {
  const {
    retentionClass,
    expiresAt,
    sound,
    actorId,
    eventData,
    references,
    eventType,
    text,
    content,
    modality,
    sourceId,
    targetId,
    speech,
    importance,
    urgency,
    exposure,
    observation,
    observations,
    sourceSubject,
    sourceBody,
    recognition,
    receivedFeatures,
  } = awareness;
  return {
    retentionClass,
    expiresAt,
    sound,
    actorId,
    eventData,
    references,
    eventType,
    text,
    content,
    modality,
    sourceId,
    targetId,
    speech,
    importance,
    urgency,
    exposure,
    observation,
    observations,
    sourceSubject,
    sourceBody,
    recognition,
    receivedFeatures,
  };
}

interface PersonalAccountReference {
  kind: 'awareness' | 'perspective';
  revision: string;
}
interface TemporalAccountReference {
  kind: 'temporal';
  revision: string;
  receipt: TemporalReceiptLocator;
  bytes: number;
}
type AccountReference = PersonalAccountReference | TemporalAccountReference;
type StoredStorySource = Pick<StorySource, 'id' | 'revision' | 'time' | 'order' | 'type'> & {
  account: AccountReference;
};

/** Current awareness owns the ordinary body; an independently rephrased historical
 * account owns a separate exact version, never a modified copy of another witness. */
export function encodeStoryAccount(source: StorySource, awareness?: Awareness) {
  const canonical =
    awareness &&
    JSON.stringify(personalEventEvidence(awareness)) === JSON.stringify(source.evidence);
  const body = JSON.stringify(canonical ? awareness : source.evidence);
  const account: AccountReference = {
    kind: canonical ? 'awareness' : 'perspective',
    revision: personalAccountRevision(body),
  };
  const stored: StoredStorySource = {
    id: source.id,
    revision: source.revision,
    time: source.time,
    order: source.order,
    type: source.type,
    account,
  };
  return { payload: JSON.stringify(stored), account, body: canonical ? undefined : body };
}

export function encodeTemporalStoryAccount(
  source: StorySource,
  temporal: { chunkId: string; receipt: TemporalReceiptLocator; bytes: number },
) {
  const account: TemporalAccountReference = {
    kind: 'temporal',
    revision: personalAccountRevision(JSON.stringify(source.evidence)),
    receipt: temporal.receipt,
    bytes: temporal.bytes,
  };
  const stored: StoredStorySource = {
    id: source.id,
    revision: source.revision,
    time: source.time,
    order: source.order,
    type: source.type,
    account,
  };
  return {
    payload: JSON.stringify(stored),
    account,
    body: undefined,
    chunkRecordId: temporalChunkRecordId(temporal.receipt.actorId, temporal.chunkId),
  };
}

/** One correlated indexed body lookup per already-selected perspective. Exact actor,
 * source family and revision prevent two witnesses or record kinds sharing a body.
 * New/current rows and archived versions are disjointly addressed by the same hash. */
export function storyAccountSql(alias = 'p'): string {
  const revision = `${alias}.payload::jsonb #>> '{account,revision}'`;
  const kind = `${alias}.payload::jsonb #>> '{account,kind}'`;
  return `(SELECT account.payload FROM (
    SELECT a.payload FROM mind_awareness a WHERE ${kind}='awareness'
      AND a.world_id=${alias}.world_id AND a.actor_id=${alias}.actor_id
      AND a.source_id=${alias}.event_id AND a.account_revision=${revision}
    UNION ALL
    SELECT v.payload FROM mind_source_versions v WHERE v.world_id=${alias}.world_id
      AND v.actor_id=${alias}.actor_id AND v.source_kind=${kind}
      AND v.source_id=${alias}.event_id AND v.revision=${revision}
    UNION ALL
    SELECT '{"receipt":'||r.receipt::text||',"values":['||(
      SELECT string_agg((s.payload::json->'values'->(f.value->>'valueOrdinal')::int)::text,',' ORDER BY f.ordinal)
      FROM json_array_elements(r.receipt->'facets') WITH ORDINALITY f(value,ordinal)
      JOIN mind_temporal_sources s ON s.world_id=${alias}.world_id AND s.source_id=f.value->>'blockId'
      WHERE s.payload::json->'values'->(f.value->>'valueOrdinal')::int->>'kind' IN ('event','sound')
    )||']}' FROM mind_temporal_chunks c
      CROSS JOIN LATERAL json_array_elements(c.payload::json->'receipts') r(receipt)
      WHERE ${kind}='temporal' AND c.world_id=${alias}.world_id AND c.id=${alias}.temporal_chunk_id
      AND c.actor_id=${alias}.actor_id
      AND c.physical_life=(${alias}.payload::jsonb#>>'{account,receipt,physicalLife}')::int
      AND c.receipt_epoch=${alias}.payload::jsonb#>>'{account,receipt,epoch}'
      AND r.receipt->>'actorId'=${alias}.actor_id
      AND (r.receipt->>'ordinal')::int=(${alias}.payload::jsonb#>>'{account,receipt,ordinal}')::int
  ) account LIMIT 1)`;
}

export function decodeStoryAccount(payload: string, body: unknown): StorySource {
  const stored = JSON.parse(payload) as StoredStorySource;
  if (stored.account?.kind === 'temporal') {
    if (typeof body !== 'string') throw new Error('Recent personal receipt is unavailable.');
    if (
      !Number.isSafeInteger(stored.account.bytes) ||
      stored.account.bytes < 1 ||
      Buffer.byteLength(body) !== stored.account.bytes
    )
      throw new Error('Recent personal receipt byte accounting disagrees with its source.');
    const selected = JSON.parse(body) as { receipt: TemporalReceipt; values: TemporalValue[] };
    const receipt = selected.receipt,
      locator = stored.account.receipt;
    if (
      !receipt ||
      receipt.actorId !== locator.actorId ||
      receipt.physicalLife !== locator.physicalLife ||
      receipt.epoch !== locator.epoch ||
      receipt.ordinal !== locator.ordinal ||
      receipt.origin?.kind !== 'occurrence' ||
      receipt.origin.eventId !== stored.id
    )
      throw new Error('Recent personal receipt has a different owner or occurrence.');
    const evidence = receivedEventEvidence(locator.actorId, selected.values);
    if (!evidence || personalAccountRevision(JSON.stringify(evidence)) !== stored.account.revision)
      throw new Error('Recent personal event disagrees with its retained receipt.');
    return {
      id: stored.id,
      revision: stored.revision,
      time: stored.time,
      order: stored.order,
      type: stored.type,
      text: evidence.text,
      evidence,
      ...(evidence.content !== undefined ? { content: evidence.content } : {}),
    };
  }
  if (
    !stored.account ||
    !['awareness', 'perspective'].includes(stored.account.kind) ||
    !/^[a-f0-9]{64}$/.test(stored.account.revision) ||
    typeof body !== 'string' ||
    personalAccountRevision(body) !== stored.account.revision
  )
    throw new Error('Historical personal account is missing or mismatched; recovery refused.');
  const evidence = personalEventEvidence(JSON.parse(body) as EventEvidence);
  return {
    id: stored.id,
    revision: stored.revision,
    time: stored.time,
    order: stored.order,
    type: stored.type,
    text: evidence.text,
    evidence,
    ...(evidence.content !== undefined ? { content: evidence.content } : {}),
  };
}

/** The same receipt-backed occurrence can feed a semantic trigger without being
 * inserted into autobiographical memory or a second recall source table. */
export function temporalStoryAwareness(payload: string, body: unknown): Awareness | undefined {
  const stored = JSON.parse(payload) as StoredStorySource;
  if (stored.account?.kind !== 'temporal') return;
  decodeStoryAccount(payload, body);
  const selected = JSON.parse(body as string) as {
    receipt: TemporalReceipt;
    values: TemporalValue[];
  };
  if (selected.receipt.origin?.kind !== 'occurrence') return;
  return receivedEventAwareness(
    stored.account.receipt.actorId,
    selected.receipt.origin,
    selected.values,
    stored.account.receipt,
  );
}

export function storyTemporalReceipt(payload: string): TemporalReceiptLocator | undefined {
  const stored = JSON.parse(payload) as StoredStorySource;
  return stored.account?.kind === 'temporal' ? stored.account.receipt : undefined;
}

export function storyTemporalBytes(payload: string): number | undefined {
  const stored = JSON.parse(payload) as StoredStorySource;
  return stored.account?.kind === 'temporal' ? stored.account.bytes : undefined;
}

export function storySourceRow(row: Record<string, unknown>, field = 'payload'): StorySource {
  return decodeStoryAccount(String(row[field]), row['account_payload']);
}

export const personalAccountKey = (
  world: string,
  actor: string,
  kind: string,
  id: string,
  revision: string,
) => JSON.stringify([world, actor, kind, id, revision]);

/** Restore has complete records already; resolve references without another query. */
export function storedStoryAccount(
  payload: string,
  world: string,
  actor: string,
  accounts: ReadonlyMap<string, string>,
  temporal?: {
    receipts: ReadonlyMap<string, TemporalReceipt>;
    sources: Readonly<Record<string, import('@open-legend/domain').TemporalSourceBlock>>;
  },
) {
  const source = JSON.parse(payload) as StoredStorySource;
  const account = source.account;
  if (account?.kind === 'temporal') {
    const locator = account.receipt;
    const receipt = temporal?.receipts.get(temporalReceiptId(locator));
    return decodeStoryAccount(
      payload,
      receipt
        ? JSON.stringify({
            receipt,
            values: receipt.facets
              .map((ref) => temporal!.sources[ref.blockId]?.values[ref.valueOrdinal])
              .filter((value) => value?.kind === 'event' || value?.kind === 'sound'),
          })
        : undefined,
    );
  }
  return decodeStoryAccount(
    payload,
    account &&
      accounts.get(personalAccountKey(world, actor, account.kind, source.id, account.revision)),
  );
}
