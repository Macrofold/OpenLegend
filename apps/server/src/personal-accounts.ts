import { receivedValueAt } from '@open-legend/domain';
import { createHash } from 'node:crypto';
import {
  receivedEventEvidence,
  receivedEventAwareness,
  temporalReceiptId,
  materializeReceivedEntry,
  canonicalJson,
  type Awareness,
  type EventEvidence,
  type TemporalReceipt,
  type TemporalReceiptLocator,
  type TemporalValue,
  type TemporalPage,
} from '@open-legend/domain';
import type { StorySource } from './history.js';
import { receivedValueSql } from './temporal-page-storage.js';
import type { RecordChanges } from './world-records.js';
import type { SqlDatabase } from './store.js';
import { sqlRowBatches } from './sql-rows.js';

export const personalAccountRevision = (payload: string) =>
  createHash('sha256').update(payload).digest('hex');

/** Story evidence is an indivisible received occurrence, never a carried seed
 * or an inferred member of a broad sample. Physical block placement is irrelevant. */
export function temporalStoryReceiptInPage(
  page: TemporalPage,
  locator: TemporalReceiptLocator,
): TemporalReceipt | undefined {
  if (
    page.actorId !== locator.actorId ||
    page.physicalLife !== locator.physicalLife ||
    page.epoch !== locator.epoch
  )
    return;
  const batch = page.batches.find((batch) => batch.batchOrder === locator.batchOrder);
  const entry = batch?.entries.find((entry) => entry.entryIndex === locator.entryIndex);
  return batch && entry?.kind === 'occurrence' ? materializeReceivedEntry(batch, entry) : undefined;
}

/** Explicit correction/erasure carries exact old block predecessors. Ordinary
 * age/pressure expiry changes only the actor frontier; its collector later
 * removes obsolete perspectives alongside wholly ineligible physical blocks. */
export async function revokeTemporalStoryAccounts(
  db: SqlDatabase,
  worldId: string,
  changes: RecordChanges,
): Promise<void> {
  const edits = [...(changes.temporalEdits ?? []), ...(changes.temporal?.values() ?? [])].filter(
    (intent) => intent.replacement || intent.deleted,
  );
  const oldBlocks = new Set<string>(),
    removed = new Map<string, TemporalReceiptLocator>();
  for (const intent of edits) {
    const before = intent.before ?? (intent.deleted ? intent.after : undefined);
    if (!before) throw new Error('Temporal erasure requires its exact canonical predecessor.');
    oldBlocks.add(
      JSON.stringify([
        'world',
        'experience',
        'temporal',
        'actors',
        before.actorId,
        'pages',
        before.id,
      ]),
    );
    const retained = new Map(
      intent.deleted
        ? []
        : intent.after.batches.flatMap((batch) =>
            batch.entries.flatMap((entry) =>
              entry.kind === 'occurrence' && entry.receipt
                ? [
                    [
                      temporalReceiptId({ ...batch, entryIndex: entry.entryIndex }),
                      canonicalJson(entry.receipt),
                    ] as const,
                  ]
                : [],
            ),
          ),
    );
    for (const batch of before.batches)
      for (const entry of batch.entries)
        if (
          entry.kind === 'occurrence' &&
          entry.receipt &&
          retained.get(temporalReceiptId({ ...batch, entryIndex: entry.entryIndex })) !==
            canonicalJson(entry.receipt)
        )
          removed.set(temporalReceiptId({ ...batch, entryIndex: entry.entryIndex }), {
            actorId: before.actorId,
            physicalLife: before.physicalLife,
            epoch: before.epoch,
            batchOrder: batch.batchOrder,
            entryIndex: entry.entryIndex,
          });
  }
  for (const id of changes.deletes.get('mind_temporal_pages') ?? [])
    if (!oldBlocks.has(id))
      throw new Error('Temporal deletion has no source-revocation predecessor.');
  for (const batch of sqlRowBatches([...removed.values()].map((receipt) => [receipt])))
    await db
      .prepare(
        `DELETE FROM history_perspectives p USING jsonb_to_recordset(?::jsonb)
      q("actorId" TEXT,"physicalLife" BIGINT,epoch TEXT,"batchOrder" BIGINT,"entryIndex" BIGINT)
      WHERE p.world_id=? AND p.actor_id=q."actorId" AND p.temporal_life=q."physicalLife"
        AND p.temporal_epoch=q.epoch AND p.temporal_batch_order=q."batchOrder"
        AND p.temporal_entry_index=q."entryIndex"`,
      )
      .run(JSON.stringify(batch.map(([receipt]) => receipt)), worldId);
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
const receiptBatchSql = (alias: string) =>
  `(${alias}.payload::jsonb#>>'{account,receipt,batchOrder}')::bigint`;
const receiptEntrySql = (alias: string) =>
  `(${alias}.payload::jsonb#>>'{account,receipt,entryIndex}')::bigint`;
const receiptPositionSql = (alias: string) =>
  `(${receiptBatchSql(alias)},${receiptEntrySql(alias)},0::bigint)`;
/** Select the only possible physical container before testing sparse membership.
 * A missing receipt must not walk backwards through older retained blocks. */
function storyTemporalBlockSql(alias: string): string {
  return `(SELECT c.* FROM mind_temporal_pages c WHERE c.world_id=${alias}.world_id AND c.actor_id=${alias}.actor_id
    AND (c.first_batch_order,c.first_entry,c.first_member)<=${receiptPositionSql(alias)}
    ORDER BY c.first_batch_order DESC,c.first_entry DESC,c.first_member DESC,c.id DESC LIMIT 1)`;
}
function storyTemporalBlockEligibleSql(alias: string): string {
  return `c.physical_life=(${alias}.payload::jsonb#>>'{account,receipt,physicalLife}')::bigint
    AND c.receipt_epoch=${alias}.payload::jsonb#>>'{account,receipt,epoch}'
    AND (c.last_batch_order,c.last_entry,c.last_member)>=${receiptPositionSql(alias)}
    AND EXISTS(SELECT 1 FROM mind_temporal_actors a WHERE a.world_id=c.world_id AND a.actor_id=c.actor_id
      AND (a.expired_through_time IS NULL OR (${alias}.payload::jsonb#>>'{account,receivedAt}')::double precision>a.expired_through_time)
      AND (a.pressure_batch_order IS NULL OR ${receiptPositionSql(alias)}>(a.pressure_batch_order,a.pressure_entry,a.pressure_member)))`;
}
function storyTemporalOccurrenceSql(alias: string): string {
  return `SELECT e.value AS entry FROM jsonb_array_elements(c.payload::jsonb->'batches') b(value)
    CROSS JOIN LATERAL jsonb_array_elements(b.value->'entries') e(value)
    WHERE (b.value->>'batchOrder')::bigint=${receiptBatchSql(alias)}
      AND (e.value->>'entryIndex')::bigint=${receiptEntrySql(alias)} AND e.value->>'kind'='occurrence'
      AND e.value->'receipt' IS NOT NULL`;
}
/** The same exact account keys as body hydration, without reconstructing a
 * temporal dictionary merely to ask whether a banner still has its source. */
export function storyAccountAvailableSql(alias = 'p'): string {
  const kind = `${alias}.payload::jsonb#>>'{account,kind}'`,
    revision = `${alias}.payload::jsonb#>>'{account,revision}'`;
  return `(${narrationSourceUnrevokedSql(alias)} AND (EXISTS (SELECT 1 FROM mind_awareness a WHERE ${kind}='awareness' AND a.world_id=${alias}.world_id AND a.actor_id=${alias}.actor_id AND a.source_id=${alias}.event_id AND a.account_revision=${revision})
    OR EXISTS (SELECT 1 FROM mind_source_versions v WHERE v.world_id=${alias}.world_id AND v.actor_id=${alias}.actor_id AND v.source_kind=${kind} AND v.source_id=${alias}.event_id AND v.revision=${revision})
    OR EXISTS (SELECT 1 FROM ${storyTemporalBlockSql(alias)} c
      WHERE ${kind}='temporal' AND ${storyTemporalBlockEligibleSql(alias)}
        AND EXISTS(${storyTemporalOccurrenceSql(alias)}))))`;
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
    SELECT json_build_object('receipt',o.entry->'receipt',
      'values',COALESCE((SELECT json_agg(${receivedValueSql('c.world_id', "(f.value->'valueRef')::json")})
        FROM jsonb_array_elements(o.entry->'receipt'->'facets') f(value)
        WHERE ${receivedValueSql('c.world_id', "(f.value->'valueRef')::json")}->>'kind' IN ('event','sound')),'[]'::json))::text AS payload
      FROM ${storyTemporalBlockSql(alias)} c CROSS JOIN LATERAL (${storyTemporalOccurrenceSql(alias)}) o
      WHERE ${kind}='temporal' AND ${storyTemporalBlockEligibleSql(alias)}
  ) account LIMIT 1)`;
}

/** The current page header bounds preparation before body hydration. Repacking
 * may change physical addresses, so this charge must not be saved on a receipt. */
export function storyTemporalPreparationBytesSql(alias = 'p'): string {
  return `((${alias}.payload::jsonb#>>'{account,bytes}')::bigint +
    (SELECT c.encoded_bytes FROM ${storyTemporalBlockSql(alias)} c WHERE ${storyTemporalBlockEligibleSql(alias)}))`;
}

function temporalStorySelection(stored: StoredStorySource, body: unknown) {
  if (stored.account.kind !== 'temporal' || typeof body !== 'string')
    throw new Error('Recent personal receipt is unavailable.');
  const selected = JSON.parse(body) as { receipt: TemporalReceipt; values: TemporalValue[] };
  if (!selected.receipt) throw new Error('Recent personal receipt is unavailable.');
  return selected;
}

function decodeTemporalStoryAccount(
  stored: StoredStorySource & { account: TemporalAccountReference },
  selected: { receipt: TemporalReceipt; values: TemporalValue[] },
): StorySource {
  if (
    !Number.isSafeInteger(stored.account.bytes) ||
    stored.account.bytes < 1 ||
    !Number.isFinite(stored.account.receivedAt) ||
    stored.account.receivedAt < 0 ||
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
    receipt.batchOrder !== locator.batchOrder ||
    receipt.entryIndex !== locator.entryIndex ||
    receipt.at !== stored.account.receivedAt ||
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
): { receivedAt: number; receipt: TemporalReceiptLocator; bytes: number } | undefined {
  const stored = JSON.parse(payload) as StoredStorySource;
  return stored.account?.kind === 'temporal'
    ? {
        receivedAt: stored.account.receivedAt,
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
