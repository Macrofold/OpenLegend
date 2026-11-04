import { receivedValueAt } from '@open-legend/domain';
import { createHash } from 'node:crypto';
import {
  receivedEventEvidence,
  receivedEventAwareness,
  temporalReceiptId,
  temporalPageReceipt,
  canonicalJson,
  type Awareness,
  type EventEvidence,
  type TemporalReceipt,
  type TemporalReceiptLocator,
  type TemporalValue,
  type TemporalPage,
} from '@open-legend/domain';
import type { StorySource } from './history.js';
import { evidenceEncodedBytesSql, receivedValueSql } from './temporal-page-storage.js';
import type { RecordChanges } from './world-records.js';
import type { SqlDatabase } from './store.js';
import { sqlRowBatches } from './sql-rows.js';

export const personalAccountRevision = (payload: string) =>
  createHash('sha256').update(payload).digest('hex');

/** Logical retirement releases personal grants now; physical chunk collection may
 * happen later. Shortened surviving pages release only their removed receipts.
 * Semantic revocation and independent retained support have their own owners. */
export async function retireTemporalStoryAccounts(
  db: SqlDatabase,
  worldId: string,
  changes: RecordChanges,
): Promise<void> {
  const removedChunks = new Set(changes.deletes.get('mind_temporal_pages') ?? []);
  const changedChunks = new Set(
    (changes.writes.get('mind_temporal_pages') ?? [])
      .filter((row) => !row.create && row.logicalRemoval !== false)
      .map((row) => row.id),
  );
  for (const id of removedChunks) changedChunks.delete(id);
  for (const rows of sqlRowBatches([...removedChunks].map((id) => [id])))
    await db
      .prepare(
        `DELETE FROM history_perspectives p USING mind_temporal_pages c
      WHERE c.world_id=? AND c.id=ANY(?::text[]) AND p.world_id=c.world_id AND p.actor_id=c.actor_id
        AND p.temporal_life=c.physical_life AND p.temporal_epoch=c.receipt_epoch
        AND p.temporal_ordinal=ANY(c.receipt_ordinals)`,
      )
      .run(
        worldId,
        rows.map(([id]) => id),
      );
  for (const rows of sqlRowBatches([...changedChunks].map((id) => [id])))
    await db
      .prepare(
        `DELETE FROM history_perspectives p
      WHERE p.world_id=? AND p.temporal_ordinal IS NOT NULL
        AND EXISTS(SELECT 1 FROM mind_temporal_pages changed WHERE changed.world_id=p.world_id AND changed.id=ANY(?::text[])
          AND changed.actor_id=p.actor_id AND changed.physical_life=p.temporal_life AND changed.receipt_epoch=p.temporal_epoch)
        AND NOT EXISTS(SELECT 1 FROM mind_temporal_pages c WHERE c.world_id=p.world_id AND c.actor_id=p.actor_id
          AND c.physical_life=p.temporal_life AND c.receipt_epoch=p.temporal_epoch
          AND c.retired_revision IS NULL AND c.receipt_ordinals @> ARRAY[p.temporal_ordinal])`,
      )
      .run(
        worldId,
        rows.map(([id]) => id),
      );
}

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
  receivedAt: number;
  pageOrder: number;
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
  temporal: NonNullable<import('./received-event-accounts.js').ReceivedEventAccount['temporal']>,
) {
  const account: TemporalAccountReference = {
    kind: 'temporal',
    revision: personalAccountRevision(canonicalJson(source.evidence)),
    receipt: temporal.receipt,
    receivedAt: temporal.receivedAt,
    pageOrder: temporal.pageOrder,
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
  };
}

/** Narration cannot present a disputed original as established fact. Historical
 * reading and personal recall retain their separate correction-warning behavior. */
export function narrationSourceUnrevokedSql(alias = 'p'): string {
  return `NOT EXISTS(SELECT 1 FROM mind_forgotten f WHERE f.world_id=${alias}.world_id
    AND f.actor_id=${alias}.actor_id AND f.source_id=${alias}.event_id)
    AND NOT EXISTS(SELECT 1 FROM mind_corrections c WHERE c.world_id=${alias}.world_id
      AND c.actor_id=${alias}.actor_id AND c.source_id=${alias}.event_id)`;
}
/** The same exact account keys as body hydration, without reconstructing a
 * temporal dictionary merely to ask whether a banner still has its source. */
export function storyAccountAvailableSql(alias = 'p'): string {
  const kind = `${alias}.payload::jsonb#>>'{account,kind}'`,
    revision = `${alias}.payload::jsonb#>>'{account,revision}'`;
  return `(${narrationSourceUnrevokedSql(alias)} AND (EXISTS (SELECT 1 FROM mind_awareness a WHERE ${kind}='awareness' AND a.world_id=${alias}.world_id AND a.actor_id=${alias}.actor_id AND a.source_id=${alias}.event_id AND a.account_revision=${revision})
    OR EXISTS (SELECT 1 FROM mind_source_versions v WHERE v.world_id=${alias}.world_id AND v.actor_id=${alias}.actor_id AND v.source_kind=${kind} AND v.source_id=${alias}.event_id AND v.revision=${revision})
    OR EXISTS (SELECT 1 FROM mind_temporal_pages c
      WHERE ${kind}='temporal' AND c.world_id=${alias}.world_id AND c.retired_revision IS NULL
        AND c.actor_id=${alias}.actor_id AND c.physical_life=(${alias}.payload::jsonb#>>'{account,receipt,physicalLife}')::bigint
        AND c.receipt_epoch=${alias}.payload::jsonb#>>'{account,receipt,epoch}'
        AND c.receipt_ordinals @> ARRAY[(${alias}.payload::jsonb#>>'{account,receipt,ordinal}')::bigint])))`;
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
    SELECT json_build_object('owner',json_build_object(
      'id',c.source_id,'actorId',c.actor_id,'physicalLife',c.physical_life,'epoch',c.receipt_epoch,
      'order',c.page_order,'operations',json_build_array(o.operation),'declarations','[]'::json),
      'values',COALESCE((SELECT json_agg(${receivedValueSql('c.world_id', "f.value->'valueRef'")})
        FROM json_array_elements(o.operation->'receipt'->'facets') f(value)
        WHERE ${receivedValueSql('c.world_id', "f.value->'valueRef'")}->>'kind' IN ('event','sound')),'[]'::json))::text AS payload
      FROM mind_temporal_pages c
      CROSS JOIN LATERAL (SELECT operation FROM json_array_elements(c.payload::json->'operations') operation
        WHERE operation->>'kind'='occurrence'
          AND (operation#>>'{receipt,ordinal}')::bigint=(${alias}.payload::jsonb#>>'{account,receipt,ordinal}')::bigint) o
      WHERE ${kind}='temporal' AND c.world_id=${alias}.world_id AND c.actor_id=${alias}.actor_id
        AND c.retired_revision IS NULL
        AND c.physical_life=(${alias}.payload::jsonb#>>'{account,receipt,physicalLife}')::int
        AND c.receipt_epoch=${alias}.payload::jsonb#>>'{account,receipt,epoch}'
        AND c.receipt_ordinals @> ARRAY[(${alias}.payload::jsonb#>>'{account,receipt,ordinal}')::bigint]
  ) account LIMIT 1)`;
}

/** The current page header bounds preparation before body hydration. Repacking
 * may change physical addresses, so this charge must not be saved on a receipt. */
export function storyTemporalPreparationBytesSql(alias = 'p'): string {
  return `((${alias}.payload::jsonb#>>'{account,bytes}')::bigint +
    (SELECT ${evidenceEncodedBytesSql('c')} FROM mind_temporal_pages c
      WHERE c.world_id=${alias}.world_id AND c.retired_revision IS NULL
        AND c.receipt_ordinals @> ARRAY[(${alias}.payload::jsonb#>>'{account,receipt,ordinal}')::bigint]
        AND c.actor_id=${alias}.actor_id
        AND c.physical_life=(${alias}.payload::jsonb#>>'{account,receipt,physicalLife}')::int
        AND c.receipt_epoch=${alias}.payload::jsonb#>>'{account,receipt,epoch}'))`;
}

function temporalStorySelection(stored: StoredStorySource, body: unknown) {
  if (stored.account.kind !== 'temporal' || typeof body !== 'string')
    throw new Error('Recent personal receipt is unavailable.');
  const selected = JSON.parse(body) as {
    owner: TemporalPage;
    values: TemporalValue[];
  };
  const receipt = temporalPageReceipt(selected.owner, stored.account.receipt.ordinal);
  if (!receipt) throw new Error('Recent personal receipt is unavailable.');
  return { receipt, values: selected.values, pageOrder: selected.owner.order };
}

function decodeTemporalStoryAccount(
  stored: StoredStorySource & { account: TemporalAccountReference },
  selected: { receipt: TemporalReceipt; values: TemporalValue[]; pageOrder: number },
): StorySource {
  if (
    !Number.isSafeInteger(stored.account.bytes) ||
    stored.account.bytes < 1 ||
    !Number.isFinite(stored.account.receivedAt) ||
    stored.account.receivedAt < 0 ||
    !Number.isSafeInteger(stored.account.pageOrder) ||
    stored.account.pageOrder < 0 ||
    Buffer.byteLength(JSON.stringify({ receipt: selected.receipt, values: selected.values })) !==
      stored.account.bytes
  )
    throw new Error('Recent personal receipt byte accounting disagrees with its source.');
  const receipt = selected.receipt,
    locator = stored.account.receipt;
  if (
    receipt.actorId !== locator.actorId ||
    receipt.physicalLife !== locator.physicalLife ||
    receipt.epoch !== locator.epoch ||
    receipt.ordinal !== locator.ordinal ||
    receipt.at !== stored.account.receivedAt ||
    selected.pageOrder !== stored.account.pageOrder ||
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

export function storyTemporalCut(
  payload: string,
):
  | { receivedAt: number; pageOrder: number; receipt: TemporalReceiptLocator; bytes: number }
  | undefined {
  const stored = JSON.parse(payload) as StoredStorySource;
  return stored.account?.kind === 'temporal'
    ? {
        receivedAt: stored.account.receivedAt,
        pageOrder: stored.account.pageOrder,
        receipt: stored.account.receipt,
        bytes: stored.account.bytes,
      }
    : undefined;
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
    pageOrders: ReadonlyMap<string, number>;
    sources: Readonly<Record<string, import('@open-legend/domain').ReceivedValue>>;
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
        pageOrder: temporal!.pageOrders.get(receipt.id)!,
        values: receipt.facets
          .map((ref) => receivedValueAt(temporal!.sources, ref))
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
