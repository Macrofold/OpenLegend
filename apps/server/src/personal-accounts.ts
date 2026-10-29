import { createHash } from 'node:crypto';
import {
  receivedEventEvidence,
  receivedEventAwareness,
  temporalReceiptId,
  temporalChunkReceipt,
  TEMPORAL_CHANGE_DICTIONARY_FIELDS,
  TEMPORAL_CHANGE_DICTIONARY_ARRAY_FIELDS,
  TEMPORAL_FACET_DICTIONARY_FIELDS,
  TEMPORAL_FACET_REFERENCE_FIELDS,
  canonicalJson,
  type Awareness,
  type EventEvidence,
  type TemporalReceipt,
  type TemporalReceiptLocator,
  type TemporalValue,
  type TemporalFrameOwner,
} from '@open-legend/domain';
import type { StorySource } from './history.js';
import { temporalChunkRecordId } from './temporal-storage.js';
import { evidenceEncodedBytesSql, receivedValueSql } from './evidence-segments.js';

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
    revision: personalAccountRevision(canonicalJson(source.evidence)),
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
  const scalar = TEMPORAL_CHANGE_DICTIONARY_FIELDS.map(
    (field) => `SELECT (r.change->>'${field}')::bigint AS ordinal FROM selected r`,
  );
  const arrays = TEMPORAL_CHANGE_DICTIONARY_ARRAY_FIELDS.map(
    (field) =>
      `SELECT value::bigint AS ordinal FROM selected r CROSS JOIN LATERAL json_array_elements_text(r.change->'${field}')`,
  );
  const facets = TEMPORAL_FACET_DICTIONARY_FIELDS.map(
    (field) =>
      `SELECT (f.value->>'${field}')::bigint AS ordinal FROM selected r CROSS JOIN LATERAL json_array_elements(r.change->'facets') f(value)`,
  );
  const references = TEMPORAL_FACET_REFERENCE_FIELDS.map(
    (field) =>
      `SELECT (f.value#>>'{${field},0}')::bigint AS ordinal FROM selected r CROSS JOIN LATERAL json_array_elements(r.change->'facets') f(value)`,
  );
  return `(SELECT account.payload FROM (
    SELECT a.payload FROM mind_awareness a WHERE ${kind}='awareness'
      AND a.world_id=${alias}.world_id AND a.actor_id=${alias}.actor_id
      AND a.source_id=${alias}.event_id AND a.account_revision=${revision}
    UNION ALL
    SELECT v.payload FROM mind_source_versions v WHERE v.world_id=${alias}.world_id
      AND v.actor_id=${alias}.actor_id AND v.source_kind=${kind}
      AND v.source_id=${alias}.event_id AND v.revision=${revision}
    UNION ALL
    SELECT body.payload FROM mind_temporal_chunks c CROSS JOIN LATERAL (
      WITH selected AS MATERIALIZED (
        SELECT e.value AS change FROM mind_temporal_segments s
        CROSS JOIN LATERAL json_array_elements(s.payload::json->'values') e(value)
        WHERE s.world_id=c.world_id AND s.parent_id=c.id
          AND s.receipt_ordinals @> ARRAY[(${alias}.payload::jsonb#>>'{account,receipt,ordinal}')::bigint]
          AND e.value->>'kind'='change'
          AND (e.value->>'receipt')::bigint=(${alias}.payload::jsonb#>>'{account,receipt,ordinal}')::bigint
      ), needed AS (
        SELECT (r.change->>'frame')::bigint AS ordinal FROM selected r
        UNION ${[...scalar, ...arrays, ...facets, ...references].join(' UNION ')}
      ), dependencies AS MATERIALIZED (
        SELECT s.payload::json->'values'->(n.ordinal-s.first_ordinal)::int AS entry
        FROM needed n JOIN mind_temporal_segments s ON s.world_id=c.world_id AND s.parent_id=c.id
          AND s.first_ordinal<=n.ordinal AND s.last_ordinal>=n.ordinal
        WHERE n.ordinal IS NOT NULL
      ), entries AS (
        SELECT entry FROM dependencies UNION ALL SELECT change AS entry FROM selected
      ), selected_values AS (
        SELECT f.ordinal,${receivedValueSql('c.world_id', "d.entry#>>'{value,value}'", "(f.value#>>'{value,1}')::bigint")} AS value
        FROM selected r CROSS JOIN LATERAL json_array_elements(r.change->'facets') WITH ORDINALITY f(value,ordinal)
        JOIN dependencies d ON (d.entry->>'ordinal')::bigint=(f.value#>>'{value,0}')::bigint
      ) SELECT json_build_object('owner',json_build_object(
          'actorId',c.actor_id,'physicalLife',c.physical_life,'epoch',c.receipt_epoch,
          'entries',(SELECT json_agg(entry ORDER BY (entry->>'ordinal')::bigint) FROM entries)),
          'values',COALESCE((SELECT json_agg(value ORDER BY ordinal) FROM selected_values WHERE value->>'kind' IN ('event','sound')),'[]'::json))::text AS payload
      WHERE EXISTS (SELECT 1 FROM selected)
    ) body
      WHERE ${kind}='temporal' AND c.world_id=${alias}.world_id AND c.id=${alias}.temporal_chunk_id
      AND c.actor_id=${alias}.actor_id
      AND c.physical_life=(${alias}.payload::jsonb#>>'{account,receipt,physicalLife}')::int
      AND c.receipt_epoch=${alias}.payload::jsonb#>>'{account,receipt,epoch}'
  ) account LIMIT 1)`;
}

/** The current page header bounds preparation before body hydration. Repacking
 * may change physical addresses, so this charge must not be saved on a receipt. */
export function storyTemporalPreparationBytesSql(alias = 'p'): string {
  return `((${alias}.payload::jsonb#>>'{account,bytes}')::bigint +
    (SELECT ${evidenceEncodedBytesSql('c')} FROM mind_temporal_chunks c
      WHERE c.world_id=${alias}.world_id AND c.id=${alias}.temporal_chunk_id
        AND c.actor_id=${alias}.actor_id
        AND c.physical_life=(${alias}.payload::jsonb#>>'{account,receipt,physicalLife}')::int
        AND c.receipt_epoch=${alias}.payload::jsonb#>>'{account,receipt,epoch}'))`;
}

function temporalStorySelection(stored: StoredStorySource, body: unknown) {
  if (stored.account.kind !== 'temporal' || typeof body !== 'string')
    throw new Error('Recent personal receipt is unavailable.');
  const selected = JSON.parse(body) as { owner: TemporalFrameOwner; values: TemporalValue[] };
  const receipt = temporalChunkReceipt(selected.owner, stored.account.receipt.ordinal);
  if (!receipt) throw new Error('Recent personal receipt is unavailable.');
  return { receipt, values: selected.values };
}

function decodeTemporalStoryAccount(
  stored: StoredStorySource & { account: TemporalAccountReference },
  selected: { receipt: TemporalReceipt; values: TemporalValue[] },
): StorySource {
  if (
    !Number.isSafeInteger(stored.account.bytes) ||
    stored.account.bytes < 1 ||
    Buffer.byteLength(JSON.stringify(selected)) !== stored.account.bytes
  )
    throw new Error('Recent personal receipt byte accounting disagrees with its source.');
  const receipt = selected.receipt,
    locator = stored.account.receipt;
  if (
    receipt.actorId !== locator.actorId ||
    receipt.physicalLife !== locator.physicalLife ||
    receipt.epoch !== locator.epoch ||
    receipt.ordinal !== locator.ordinal ||
    receipt.origin?.kind !== 'occurrence' ||
    receipt.origin.eventId !== stored.id
  )
    throw new Error('Recent personal receipt has a different owner or occurrence.');
  const evidence = receivedEventEvidence(locator.actorId, selected.values);
  if (!evidence || personalAccountRevision(canonicalJson(evidence)) !== stored.account.revision)
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

export function decodeStoryAccount(payload: string, body: unknown): StorySource {
  const stored = JSON.parse(payload) as StoredStorySource;
  if (stored.account?.kind === 'temporal')
    return decodeTemporalStoryAccount(
      { ...stored, account: stored.account },
      temporalStorySelection(stored, body),
    );
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
  const selected = temporalStorySelection(stored, body);
  decodeTemporalStoryAccount({ ...stored, account: stored.account }, selected);
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
    sources: Readonly<Record<string, import('@open-legend/domain').ReceivedValueBlock>>;
  },
) {
  const source = JSON.parse(payload) as StoredStorySource;
  const account = source.account;
  if (account?.kind === 'temporal') {
    const locator = account.receipt;
    const receipt = temporal?.receipts.get(temporalReceiptId(locator));
    if (!receipt) throw new Error('Recent personal receipt is unavailable.');
    return decodeTemporalStoryAccount(
      { ...source, account },
      {
        receipt,
        values: receipt.facets
          .map((ref) => temporal!.sources[ref.blockId]?.values[ref.valueOrdinal])
          .flatMap((value) => (value?.kind === 'event' || value?.kind === 'sound' ? [value] : [])),
      },
    );
  }
  return decodeStoryAccount(
    payload,
    account &&
      accounts.get(personalAccountKey(world, actor, account.kind, source.id, account.revision)),
  );
}
