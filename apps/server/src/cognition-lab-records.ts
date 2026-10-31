import { createHash, randomUUID } from 'node:crypto';
import { link, mkdir, open, opendir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { SAVE_FORMAT } from './game-saves.js';
import { CHECKPOINT_LIMITS } from './checkpoint-format.js';
import { syncDirectory } from './save-files.js';
import { insertRows } from './sql-rows.js';
import { recordBackgroundFailure } from './performance.js';
import { AuthorityError } from './authority.js';
import type { SqlDatabase } from './store.js';

/** Logical retained lab bytes; native history and financial reservations keep their owners.
 * docs/projects/cognition-lab-tech-design.md#141-capture-admission */
export const LAB_STORAGE_DEFAULTS = {
  allowanceBytes: 2 * 1024 ** 3,
  runCaptureBytes: 64 * 1024 ** 2,
  chunkBytes: 1024 ** 2,
  pageSize: 50,
  maxPageSize: 100,
  terminalBytes: 16 * 1024,
  recoveryTerminalBytes: 2 * 1024,
} as const;
const RECOVERY_RESERVATION = '00000000-0000-4000-8000-000000000001';
// Lab metadata has its own current layout; changing a lab-only index must not
// pretend an older partial index is current or invalidate native game packages.
const LAB_RECORDS_FORMAT = `${SAVE_FORMAT}:cognition-lab-saved-work`;
const SAVED_RECORD_KINDS = ['scenario', 'checkpoint', 'run', 'comparison'] as const;
const SAVED_RECORD_PREDICATE = "kind IN ('scenario','checkpoint','run','comparison')";
export type LabSavedRecordKind = (typeof SAVED_RECORD_KINDS)[number];

export type LabJson = null | boolean | number | string | LabJson[] | { [key: string]: LabJson };
/** Convert application projections to the data-only boundary while omitting absent optionals. */
export function labJson(value: unknown): LabJson {
  return jsonSchema.parse(JSON.parse(JSON.stringify(value)));
}
/** Metadata is one native-sized owner row. Long exact requests and outputs belong in
 * streamed artifacts; the overall artifact/bundle allowance remains independent. */
export function assertLabMetadataSize(value: unknown): void {
  const pending: unknown[] = [value];
  let minimum = 0;
  while (pending.length) {
    const item = pending.pop();
    if (typeof item === 'string') minimum += item.length + 2;
    else if (Array.isArray(item)) {
      minimum += item.length + 1;
      for (const child of item) pending.push(child);
    } else if (item && typeof item === 'object') {
      for (const [key, child] of Object.entries(item)) {
        if (child === undefined) continue;
        minimum += key.length + 3;
        pending.push(child);
      }
    } else
      minimum += typeof item === 'number' || typeof item === 'boolean' ? String(item).length : 4;
    if (minimum > CHECKPOINT_LIMITS.rowBytes)
      throw new LabStorageError(
        'capacity',
        'This metadata owner exceeds the 1 MiB native row work bound. Store long evidence in streamed artifacts; the whole bundle allowance is unchanged.',
      );
  }
  if (Buffer.byteLength(JSON.stringify(value)) > CHECKPOINT_LIMITS.rowBytes)
    throw new LabStorageError(
      'capacity',
      'This metadata owner exceeds the 1 MiB native row work bound. Store long evidence in streamed artifacts; the whole bundle allowance is unchanged.',
    );
}
// Validate data without rebuilding arbitrary-key objects: a record schema strips
// the valid JSON key "__proto__", silently changing exact retained payloads.
const jsonSchema: z.ZodType<LabJson> = z.custom<LabJson>((value) => {
  const pending: Array<{ value: unknown; leave?: boolean }> = [{ value }];
  const active = new Set<object>();
  while (pending.length) {
    const item = pending.pop()!;
    const selected = item.value;
    if (selected === null || typeof selected === 'string' || typeof selected === 'boolean')
      continue;
    if (typeof selected === 'number') {
      if (!Number.isFinite(selected)) return false;
      continue;
    }
    if (typeof selected !== 'object') return false;
    if (item.leave) {
      active.delete(selected);
      continue;
    }
    if (active.has(selected)) return false;
    const prototype: unknown = Object.getPrototypeOf(selected);
    if (!Array.isArray(selected) && prototype !== null && prototype !== Object.prototype)
      return false;
    active.add(selected);
    pending.push({ value: selected, leave: true });
    if (Array.isArray(selected)) {
      for (const child of selected) pending.push({ value: child });
    } else {
      for (const key of Object.keys(selected))
        pending.push({ value: (selected as Record<string, unknown>)[key] });
    }
  }
  return true;
});
const uuid = z.string().uuid();
const finiteBytes = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export interface LabExperimentSnapshot {
  settings: LabJson;
  customFields: LabJson[];
  holds: LabJson[];
  participants: string[];
  autonomy: string[];
}
export const labExperimentSnapshotSchema: z.ZodType<LabExperimentSnapshot> = z
  .object({
    settings: jsonSchema,
    customFields: z.array(jsonSchema),
    holds: z.array(jsonSchema),
    participants: z.array(z.string().min(1)),
    autonomy: z.array(z.string().min(1)),
  })
  .strict();

export type LabRecordKind =
  | 'scenario'
  | 'checkpoint'
  | 'run'
  | 'interval'
  | 'stage'
  | 'timeline'
  | 'annotation'
  | 'comparison'
  | 'workspace'
  | 'disclosure'
  | 'customField'
  | 'hold';
const recordKindSchema = z.enum([
  'scenario',
  'checkpoint',
  'run',
  'interval',
  'stage',
  'timeline',
  'annotation',
  'comparison',
  'workspace',
  'disclosure',
  'customField',
  'hold',
]);
export interface LabRecordHeader {
  id: string;
  kind: LabRecordKind;
  createdAt: string;
  name: string;
  runId?: string;
  parentId?: string;
  actorId?: string;
  sourceId?: string;
  status?: string;
  summary: LabJson;
}
export type LabManagementHeader =
  | (LabRecordHeader & { withheld: false })
  | { id: string; kind: LabRecordKind; createdAt: string; withheld: true };
/** Native host authority owns this decision; captured/imported claims grant no rights. */
export type LabManagementAuthorizer = (record: LabRecordHeader) => boolean | Promise<boolean>;
export interface LabRecord<T extends LabJson = LabJson> extends LabRecordHeader {
  data: T;
}
export const labRecordSchema: z.ZodType<LabRecord> = z
  .object({
    id: uuid,
    kind: recordKindSchema,
    createdAt: z.string().datetime(),
    name: z.string().max(500),
    runId: uuid.optional(),
    parentId: uuid.optional(),
    actorId: z.string().min(1).optional(),
    sourceId: z.string().min(1).optional(),
    status: z.string().max(100).optional(),
    summary: jsonSchema,
    data: jsonSchema,
  })
  .strict();
export interface LabNativeCheckpoint {
  id: string;
  worldId: string;
  bytes: number;
  checksum: string;
  revision?: number;
  createdAt: string;
  simTime: number;
}
export const labNativeCheckpointSchema: z.ZodType<LabNativeCheckpoint> = z
  .object({
    id: uuid,
    worldId: z.string().min(1),
    bytes: finiteBytes,
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
    revision: z.number().int().nonnegative().optional(),
    createdAt: z.string().datetime(),
    simTime: z.number().finite(),
  })
  .strict();
/** Select the lab reference from the richer trusted native manifest. */
export function labCheckpointReference(checkpoint: LabNativeCheckpoint): LabNativeCheckpoint {
  return labNativeCheckpointSchema.parse({
    id: checkpoint.id,
    worldId: checkpoint.worldId,
    bytes: checkpoint.bytes,
    checksum: checkpoint.checksum,
    createdAt: checkpoint.createdAt,
    simTime: checkpoint.simTime,
    ...(checkpoint.revision !== undefined ? { revision: checkpoint.revision } : {}),
  });
}
export interface LabSavedData {
  checkpoint: LabNativeCheckpoint;
  experimentArtifactId: string;
  origin?: string;
  scenarioRevision: number;
  runtimeGeneration: string;
  continuation?: LabJson;
}
export const labSavedDataSchema: z.ZodType<LabSavedData> = z
  .object({
    checkpoint: labNativeCheckpointSchema,
    experimentArtifactId: uuid,
    origin: z.string().optional(),
    scenarioRevision: z.number().int().nonnegative(),
    runtimeGeneration: z.string().min(1),
    continuation: jsonSchema.optional(),
  })
  .strict();
export interface LabPageOptions {
  limit?: number;
  cursor?: string;
  search?: string;
  runId?: string;
  parentId?: string;
  actorId?: string;
  sourceId?: string;
  recipientActorId?: string;
  stageRole?: 'root' | 'call';
  /** Internal exact native job selection, independent of interval/root grouping. */
  nativeJobId?: string;
  category?: string;
  categories?: readonly string[];
  nativeEvents?: 'only' | 'exclude';
  timelineScope?: { worldId: string; timeline: string };
}
export interface LabPage<T> {
  items: T[];
  nextCursor?: string;
}
export interface LabStorageUsage {
  usedBytes: number;
  reservedBytes: number;
  /** Included in reservedBytes; a persistent cleanup/allowance receipt credit. */
  recoveryReservedBytes: number;
  allowanceBytes: number;
  warning: boolean;
}
export interface LabArtifact {
  id: string;
  runId?: string;
  contentType: string;
  bytes: number;
  checksum: string;
  createdAt: string;
}
export interface LabEvidenceItem {
  id: string;
  stageId: string;
  kind: string;
  label: string;
  source?: LabJson;
  summary: LabJson;
}
export interface LabReceipt {
  commandId: string;
  fingerprint: string;
  state: 'pending' | 'completed' | 'failed' | 'interrupted';
  result?: LabJson;
  createdAt: string;
}
export type LabImportEntry =
  | {
      kind: 'record';
      record: LabRecord;
      links: Array<{ kind: 'artifact' | 'checkpoint' | 'record'; id: string }>;
      recipients?: string[];
      runAllowanceBytes?: number;
    }
  | { kind: 'evidence'; stageId: string; items: LabEvidenceItem[] }
  | {
      kind: 'attempt';
      runId: string;
      attemptId: string;
      receipt: LabJson;
      costUsd?: number;
      completionUncertain: boolean;
    };
export type LabEvidenceGuard = (scope: {
  record?: LabRecordHeader;
  artifact?: LabArtifact;
}) => void | Promise<void>;
export class LabStorageError extends Error {
  constructor(
    readonly code: 'capacity' | 'conflict' | 'missing' | 'integrity' | 'invalid',
    message: string,
  ) {
    super(message);
  }
}

function encode(value: unknown): string {
  return JSON.stringify(value);
}
function searchText(value: LabJson): string {
  if (typeof value === 'string') return value;
  if (value === null || typeof value !== 'object') return '';
  return (Array.isArray(value) ? value : Object.values(value))
    .map(searchText)
    .filter(Boolean)
    .join(' ');
}
function hash(text: string | Uint8Array): string {
  return createHash('sha256').update(text).digest('hex');
}
function number(row: Record<string, unknown>, key: string): number {
  const value = Number(row[key]);
  if (!Number.isSafeInteger(value) || value < 0)
    throw new LabStorageError('integrity', 'Stored lab byte accounting is invalid.');
  return value;
}
function header(row: Record<string, unknown>): LabRecordHeader {
  return {
    id: String(row['id']),
    kind: recordKindSchema.parse(row['kind']),
    createdAt: String(row['created_at']),
    name: String(row['name']),
    ...(row['run_id'] ? { runId: String(row['run_id']) } : {}),
    ...(row['parent_id'] ? { parentId: String(row['parent_id']) } : {}),
    ...(row['actor_id'] ? { actorId: String(row['actor_id']) } : {}),
    ...(row['source_id'] ? { sourceId: String(row['source_id']) } : {}),
    ...(row['status'] ? { status: String(row['status']) } : {}),
    summary: jsonSchema.parse(JSON.parse(String(row['summary']))),
  };
}
function artifact(row: Record<string, unknown>): LabArtifact {
  return {
    id: String(row['id']),
    ...(row['run_id'] ? { runId: String(row['run_id']) } : {}),
    contentType: String(row['content_type']),
    bytes: number(row, 'bytes'),
    checksum: String(row['checksum']),
    createdAt: String(row['created_at']),
  };
}
const HEADER_COLUMNS = 'id,kind,created_at,name,run_id,parent_id,actor_id,source_id,status,summary';

/** One lab-only metadata/retention owner, outside every native checkpoint table.
 * Calls share the existing PostgreSQL adapter and its ordered writer/read lane.
 * Public HTTP callers supply the native disclosure guard; retained bytes never grant access. */
export class CognitionLabRecords {
  readonly ready: Promise<void>;
  private readonly artifactsDirectory: string;
  private readonly guard?: LabEvidenceGuard;
  private readonly artifactReaders = new Map<string, number>();
  private readonly deletingArtifacts = new Set<string>();
  private readonly checkpointReaders = new Map<string, number>();
  private readonly deletingCheckpoints = new Set<string>();
  private readonly deferredCheckpointRemovals = new Map<string, () => Promise<void>>();
  private readonly deferredArtifactRemovals = new Set<string>();
  private readonly fileWrites = new Set<Promise<unknown>>();
  private readonly cleanupWrites = new Set<Promise<unknown>>();
  private closed = false;
  constructor(
    /** Shared native transaction boundary; record writes retain this owner's admission. */
    readonly db: SqlDatabase,
    directory: string,
    options: { allowanceBytes?: number; evidenceGuard?: LabEvidenceGuard } = {},
  ) {
    this.artifactsDirectory = join(directory, 'artifacts');
    this.guard = options.evidenceGuard;
    this.ready = this.initialize(options.allowanceBytes ?? LAB_STORAGE_DEFAULTS.allowanceBytes);
  }
  private async initialize(allowance: number) {
    finiteBytes.positive().parse(allowance);
    await mkdir(this.artifactsDirectory, { recursive: true, mode: 0o700 });
    const installed = await this.db
      .prepare("SELECT to_regclass('cognition_lab.storage') AS table_name")
      .get();
    if (installed?.['table_name']) {
      const marker = await this.db
        .prepare('SELECT format FROM cognition_lab.storage WHERE singleton=1')
        .get();
      if (!marker || marker['format'] !== LAB_RECORDS_FORMAT)
        throw new LabStorageError(
          'invalid',
          'Unsupported lab format; rebuild current development data.',
        );
      const columns = await this.db
        .prepare(
          "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='cognition_lab' AND table_name IN ('records','artifacts','evidence')",
        )
        .all();
      const available = new Set(
        columns.map((column) => JSON.stringify([column['table_name'], column['column_name']])),
      );
      for (const [table, names] of [
        [
          'records',
          [
            'id',
            'kind',
            'created_at',
            'run_id',
            'parent_id',
            'actor_id',
            'source_id',
            'status',
            'summary',
            'payload',
            'search_text',
            'stage_role',
            'category',
            'bytes',
            'link_bytes',
            'recipient_bytes',
          ],
        ],
        [
          'artifacts',
          ['id', 'run_id', 'content_type', 'bytes', 'checksum', 'created_at', 'stored_bytes'],
        ],
        [
          'evidence',
          ['id', 'stage_id', 'kind', 'label', 'source', 'summary', 'search_text', 'bytes'],
        ],
      ] as const)
        for (const name of names)
          if (!available.has(JSON.stringify([table, name])))
            throw new LabStorageError(
              'invalid',
              'Unsupported lab record layout; rebuild current development data.',
            );
    }
    await this.db.exec(`CREATE SCHEMA IF NOT EXISTS cognition_lab;
      CREATE TABLE IF NOT EXISTS cognition_lab.storage (
        singleton INTEGER PRIMARY KEY CHECK(singleton=1), format TEXT NOT NULL,
        used_bytes BIGINT NOT NULL CHECK(used_bytes>=0),
        reserved_bytes BIGINT NOT NULL CHECK(reserved_bytes>=0),
        allowance_bytes BIGINT NOT NULL CHECK(allowance_bytes>0));
      CREATE TABLE IF NOT EXISTS cognition_lab.records (
        id TEXT PRIMARY KEY, kind TEXT NOT NULL, created_at TEXT NOT NULL,
        name TEXT NOT NULL, run_id TEXT, parent_id TEXT, actor_id TEXT, source_id TEXT,
        status TEXT, summary TEXT NOT NULL, payload TEXT NOT NULL, search_text TEXT NOT NULL, stage_role TEXT, category TEXT, bytes BIGINT NOT NULL,
        link_bytes BIGINT NOT NULL, recipient_bytes BIGINT NOT NULL);
      CREATE INDEX IF NOT EXISTS cognition_lab_records_kind_time ON cognition_lab.records(kind,created_at DESC,id DESC);
      CREATE INDEX IF NOT EXISTS cognition_lab_records_run_time ON cognition_lab.records(run_id,kind,created_at DESC,id DESC);
      CREATE INDEX IF NOT EXISTS cognition_lab_records_run_order ON cognition_lab.records(run_id,created_at DESC,id DESC);
      CREATE INDEX IF NOT EXISTS cognition_lab_records_parent_time ON cognition_lab.records(parent_id,kind,created_at DESC,id DESC);
      CREATE INDEX IF NOT EXISTS cognition_lab_records_actor_time ON cognition_lab.records(actor_id,kind,created_at DESC,id DESC);
      CREATE INDEX IF NOT EXISTS cognition_lab_records_source_time ON cognition_lab.records(source_id,kind,created_at DESC,id DESC);
      CREATE INDEX IF NOT EXISTS cognition_lab_records_saved_time ON cognition_lab.records(created_at DESC,id DESC) WHERE ${SAVED_RECORD_PREDICATE};
      CREATE INDEX IF NOT EXISTS cognition_lab_records_stage_role ON cognition_lab.records(run_id,kind,stage_role,created_at DESC,id DESC);
      CREATE INDEX IF NOT EXISTS cognition_lab_records_stage_job ON cognition_lab.records(run_id,(payload::jsonb->>'nativeJobId'),created_at DESC,id DESC) WHERE kind='stage';
      CREATE INDEX IF NOT EXISTS cognition_lab_records_category ON cognition_lab.records(run_id,kind,category,created_at DESC,id DESC);
      CREATE INDEX IF NOT EXISTS cognition_lab_timeline_scope_time ON cognition_lab.records((summary::jsonb->>'worldId'),(summary::jsonb->>'timeline'),((summary::jsonb->>'gameTime')::double precision) DESC,((summary::jsonb->>'nativeOrder')::double precision) DESC,created_at DESC,id DESC) WHERE kind='timeline' AND jsonb_typeof(summary::jsonb->'gameTime')='number' AND jsonb_typeof(summary::jsonb->'nativeOrder')='number';
      CREATE INDEX IF NOT EXISTS cognition_lab_timeline_binding ON cognition_lab.records((summary::jsonb->>'worldId'),(summary::jsonb->>'timeline'),source_id,created_at DESC,id DESC) WHERE kind='timeline' AND summary::jsonb->>'nativeEvent'='true' AND run_id IS NOT NULL;
      CREATE TABLE IF NOT EXISTS cognition_lab.recipients (
        record_id TEXT NOT NULL, actor_id TEXT NOT NULL, PRIMARY KEY(record_id,actor_id));
      CREATE INDEX IF NOT EXISTS cognition_lab_recipients_actor ON cognition_lab.recipients(actor_id,record_id);
      CREATE TABLE IF NOT EXISTS cognition_lab.artifacts (
        id TEXT PRIMARY KEY, run_id TEXT, content_type TEXT NOT NULL,
        bytes BIGINT NOT NULL, checksum TEXT NOT NULL, created_at TEXT NOT NULL,
        stored_bytes BIGINT NOT NULL);
      CREATE TABLE IF NOT EXISTS cognition_lab.checkpoints (
        id TEXT PRIMARY KEY, payload TEXT NOT NULL, bytes BIGINT NOT NULL);
      CREATE TABLE IF NOT EXISTS cognition_lab.links (
        owner_id TEXT NOT NULL, target_kind TEXT NOT NULL, target_id TEXT NOT NULL,
        PRIMARY KEY(owner_id,target_kind,target_id));
      CREATE INDEX IF NOT EXISTS cognition_lab_references_target ON cognition_lab.links(target_kind,target_id);
      CREATE TABLE IF NOT EXISTS cognition_lab.reservations (
        id TEXT PRIMARY KEY, run_id TEXT, bytes BIGINT NOT NULL, created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS cognition_lab_reservations_run ON cognition_lab.reservations(run_id);
      CREATE TABLE IF NOT EXISTS cognition_lab.run_usage (
        run_id TEXT PRIMARY KEY, used_bytes BIGINT NOT NULL DEFAULT 0,
        reserved_bytes BIGINT NOT NULL DEFAULT 0, allowance_bytes BIGINT NOT NULL);
      CREATE TABLE IF NOT EXISTS cognition_lab.receipts (
        command_id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, state TEXT NOT NULL,
        result TEXT, created_at TEXT NOT NULL, bytes BIGINT NOT NULL, reservation_id TEXT);
      CREATE TABLE IF NOT EXISTS cognition_lab.evidence (
        id TEXT NOT NULL, stage_id TEXT NOT NULL, kind TEXT NOT NULL, label TEXT NOT NULL,
        source TEXT, summary TEXT NOT NULL, search_text TEXT NOT NULL, bytes BIGINT NOT NULL,
        PRIMARY KEY(stage_id,kind,id));
      CREATE INDEX IF NOT EXISTS cognition_lab_evidence_page ON cognition_lab.evidence(stage_id,kind,id);
      CREATE TABLE IF NOT EXISTS cognition_lab.attempts (
        attempt_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, cost_usd DOUBLE PRECISION,
        completion_uncertain BOOLEAN NOT NULL, payload TEXT NOT NULL, bytes BIGINT NOT NULL);
      CREATE INDEX IF NOT EXISTS cognition_lab_attempts_run ON cognition_lab.attempts(run_id,attempt_id);
      CREATE TABLE IF NOT EXISTS cognition_lab.costs (
        run_id TEXT PRIMARY KEY, known_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
        unknown_count INTEGER NOT NULL DEFAULT 0, uncertain_count INTEGER NOT NULL DEFAULT 0);
    `);
    const row = await this.db
      .prepare('SELECT format FROM cognition_lab.storage WHERE singleton=1')
      .get();
    if (row && row['format'] !== LAB_RECORDS_FORMAT)
      throw new LabStorageError(
        'invalid',
        'Unsupported lab format; rebuild current development data.',
      );
    if (!row)
      await this.db
        .prepare('INSERT INTO cognition_lab.storage VALUES (1,?,0,0,?)')
        .run(LAB_RECORDS_FORMAT, allowance);
    await this.db.transaction(async () => {
      await this.db
        .prepare(
          'INSERT INTO cognition_lab.reservations VALUES (?,NULL,0,?) ON CONFLICT(id) DO NOTHING',
        )
        .run(RECOVERY_RESERVATION, new Date().toISOString());
      await this.replenishRecovery();
    });
  }
  /** This persistent control credit is included in reserved_bytes. Capture cannot
   * consume the space needed to claim a bounded cleanup/allowance receipt. */
  private async replenishRecovery(): Promise<void> {
    const row = await this.db
      .prepare(
        'SELECT r.bytes,s.allowance_bytes-s.used_bytes-s.reserved_bytes AS available FROM cognition_lab.reservations r CROSS JOIN cognition_lab.storage s WHERE r.id=? AND s.singleton=1',
      )
      .get(RECOVERY_RESERVATION);
    if (!row) throw new LabStorageError('integrity', 'The storage recovery credit is unavailable.');
    const amount = Math.min(
      Math.max(0, number(row, 'available')),
      LAB_STORAGE_DEFAULTS.terminalBytes - number(row, 'bytes'),
    );
    if (amount <= 0) return;
    await this.db
      .prepare('UPDATE cognition_lab.storage SET reserved_bytes=reserved_bytes+? WHERE singleton=1')
      .run(amount);
    await this.db
      .prepare('UPDATE cognition_lab.reservations SET bytes=bytes+? WHERE id=?')
      .run(amount, RECOVERY_RESERVATION);
  }
  async usage(): Promise<LabStorageUsage> {
    await this.ready;
    const row = await this.db
      .prepare(
        'SELECT used_bytes,reserved_bytes,allowance_bytes,(SELECT bytes FROM cognition_lab.reservations WHERE id=?) AS recovery_bytes FROM cognition_lab.storage WHERE singleton=1',
      )
      .get(RECOVERY_RESERVATION);
    if (!row) throw new LabStorageError('integrity', 'Lab storage accounting is unavailable.');
    const result = {
      usedBytes: number(row, 'used_bytes'),
      reservedBytes: number(row, 'reserved_bytes'),
      recoveryReservedBytes: number(row, 'recovery_bytes'),
      allowanceBytes: number(row, 'allowance_bytes'),
    };
    return {
      ...result,
      warning: result.usedBytes + result.reservedBytes >= result.allowanceBytes * 0.8,
    };
  }
  async setAllowance(bytes: number): Promise<void> {
    await this.ready;
    finiteBytes.positive().parse(bytes);
    await this.db.transaction(async () => {
      const result = await this.db
        .prepare(
          'UPDATE cognition_lab.storage SET allowance_bytes=? WHERE singleton=1 AND used_bytes+reserved_bytes<=? RETURNING singleton',
        )
        .get(bytes, bytes);
      if (!result)
        throw new LabStorageError(
          'capacity',
          'The allowance cannot be smaller than retained and reserved lab bytes.',
        );
      await this.replenishRecovery();
    });
  }
  async configureRun(
    runId: string,
    allowanceBytes = LAB_STORAGE_DEFAULTS.runCaptureBytes,
  ): Promise<void> {
    await this.ready;
    uuid.parse(runId);
    finiteBytes.positive().parse(allowanceBytes);
    const row = await this.db
      .prepare(
        'INSERT INTO cognition_lab.run_usage VALUES (?,0,0,?) ON CONFLICT(run_id) DO UPDATE SET allowance_bytes=excluded.allowance_bytes WHERE cognition_lab.run_usage.used_bytes+cognition_lab.run_usage.reserved_bytes<=excluded.allowance_bytes RETURNING run_id',
      )
      .get(runId, allowanceBytes);
    if (!row) throw new LabStorageError('capacity', 'Run capture allowance is already occupied.');
  }
  /** An imported run needs quota admission before its artifacts are copied, but
   * a refused import must not retain an invisible empty configuration. */
  async discardUnpublishedRun(runId: string): Promise<void> {
    await this.ready;
    uuid.parse(runId);
    await this.db
      .prepare(
        'DELETE FROM cognition_lab.run_usage WHERE run_id=? AND used_bytes=0 AND reserved_bytes=0 AND NOT EXISTS (SELECT 1 FROM cognition_lab.records WHERE id=? OR run_id=?)',
      )
      .run(runId, runId, runId);
  }
  /** Reserve before native source acceptance or dispatch, including terminal metadata space. */
  async reserve(bytes: number, runId?: string, id = randomUUID()): Promise<string> {
    await this.ready;
    finiteBytes.positive().parse(bytes);
    uuid.parse(id);
    if (runId) uuid.parse(runId);
    await this.db.transaction(async () => {
      const prior = await this.db
        .prepare('SELECT bytes,run_id FROM cognition_lab.reservations WHERE id=?')
        .get(id);
      if (prior) {
        if (number(prior, 'bytes') !== bytes || (prior['run_id'] ?? undefined) !== runId)
          throw new LabStorageError('conflict', 'Capture reservation identity conflicts.');
        return;
      }
      if (runId) {
        const run = await this.db
          .prepare(
            'UPDATE cognition_lab.run_usage SET reserved_bytes=reserved_bytes+? WHERE run_id=? AND used_bytes+reserved_bytes+?<=allowance_bytes RETURNING run_id',
          )
          .get(bytes, runId, bytes);
        if (!run) throw new LabStorageError('capacity', 'Run capture capacity reached.');
      }
      const stored = await this.db
        .prepare(
          'UPDATE cognition_lab.storage SET reserved_bytes=reserved_bytes+? WHERE singleton=1 AND used_bytes+reserved_bytes+?<=allowance_bytes RETURNING singleton',
        )
        .get(bytes, bytes);
      if (!stored) throw new LabStorageError('capacity', 'Lab storage capacity reached.');
      await this.db
        .prepare('INSERT INTO cognition_lab.reservations VALUES (?,?,?,?)')
        .run(id, runId ?? null, bytes, new Date().toISOString());
    });
    return id;
  }
  private async adjust(bytes: number, runId?: string, reservationId?: string) {
    let reserved = 0;
    if (reservationId) {
      const row = await this.db
        .prepare('SELECT bytes,run_id FROM cognition_lab.reservations WHERE id=?')
        .get(reservationId);
      if (!row || (row['run_id'] ?? undefined) !== runId)
        throw new LabStorageError(
          'conflict',
          'Capture reservation is missing or belongs to another run.',
        );
      const remaining = number(row, 'bytes');
      reserved = Math.max(0, bytes);
      if (reserved > remaining)
        throw new LabStorageError(
          'capacity',
          'Captured evidence exceeds its admitted reservation.',
        );
    }
    const usage = await this.db
      .prepare(
        'UPDATE cognition_lab.storage SET used_bytes=used_bytes+?, reserved_bytes=reserved_bytes-? WHERE singleton=1 AND used_bytes+?>=0 AND reserved_bytes>=? AND used_bytes+reserved_bytes+?-?<=allowance_bytes RETURNING singleton',
      )
      .get(bytes, reserved, bytes, reserved, bytes, reserved);
    if (!usage) throw new LabStorageError('capacity', 'Lab storage capacity reached.');
    if (runId) {
      const row = await this.db
        .prepare(
          'UPDATE cognition_lab.run_usage SET used_bytes=used_bytes+?,reserved_bytes=reserved_bytes-? WHERE run_id=? AND used_bytes+?>=0 AND reserved_bytes>=? AND used_bytes+reserved_bytes+?-?<=allowance_bytes RETURNING run_id',
        )
        .get(bytes, reserved, runId, bytes, reserved, bytes, reserved);
      if (!row) throw new LabStorageError('capacity', 'Run capture capacity reached.');
    }
    if (reservationId)
      await this.db
        .prepare('UPDATE cognition_lab.reservations SET bytes=bytes-? WHERE id=?')
        .run(reserved, reservationId);
  }
  async release(reservationId: string): Promise<void> {
    await this.ready;
    if (reservationId === RECOVERY_RESERVATION)
      throw new LabStorageError(
        'invalid',
        'The persistent storage recovery credit cannot be released.',
      );
    await this.db.transaction(async () => {
      const row = await this.db
        .prepare('SELECT bytes,run_id FROM cognition_lab.reservations WHERE id=?')
        .get(reservationId);
      if (!row) return;
      const bytes = number(row, 'bytes');
      await this.db
        .prepare(
          'UPDATE cognition_lab.storage SET reserved_bytes=reserved_bytes-? WHERE singleton=1',
        )
        .run(bytes);
      if (row['run_id'])
        await this.db
          .prepare(
            'UPDATE cognition_lab.run_usage SET reserved_bytes=reserved_bytes-? WHERE run_id=?',
          )
          .run(bytes, row['run_id']);
      await this.db.prepare('DELETE FROM cognition_lab.reservations WHERE id=?').run(reservationId);
    });
  }
  /** The current native owner supplies exact finite response bytes; output tokens are not bytes. */
  async reserveCapture(
    inputBytes: number,
    responseBoundBytes: number,
    runId: string,
  ): Promise<string> {
    finiteBytes.parse(inputBytes);
    finiteBytes.positive().parse(responseBoundBytes);
    return this.reserve(
      inputBytes + responseBoundBytes + LAB_STORAGE_DEFAULTS.terminalBytes,
      runId,
    );
  }
  /** One explicitly named metadata owner group; never publishes a partial form. */
  async putRecordBatch(
    entries: Array<{
      record: LabRecord;
      options?: Parameters<CognitionLabRecords['putRecord']>[1];
    }>,
    beforePublish?: () => void,
  ): Promise<void> {
    if (
      entries.length > 100 ||
      new Set(entries.map((entry) => entry.record.id)).size !== entries.length
    )
      throw new LabStorageError('invalid', 'Apply at most 100 distinct retained fields together.');
    await this.ready;
    await this.db.transaction(async () => {
      for (const entry of entries) await this.putRecord(entry.record, entry.options);
      beforePublish?.();
    });
  }
  async putRecord(
    record: LabRecord,
    options: {
      reservationId?: string;
      immutable?: boolean;
      references?: { kind: 'artifact' | 'checkpoint' | 'record'; id: string }[];
      recipientActorIds?: string[];
      /** Trusted mutation owner rechecks live authority after storage waits. */
      beforePublish?: () => void;
    } = {},
  ): Promise<void> {
    await this.ready;
    assertLabMetadataSize({
      kind: 'record',
      record,
      links: options.references ?? [],
      recipients: options.recipientActorIds ?? [],
      ...(record.kind === 'run' ? { runAllowanceBytes: Number.MAX_SAFE_INTEGER } : {}),
    });
    const admitted = labRecordSchema.parse(structuredClone(record));
    const payload = encode(admitted.data),
      summary = encode(admitted.summary);
    const summaryValue =
      admitted.summary && typeof admitted.summary === 'object' && !Array.isArray(admitted.summary)
        ? admitted.summary
        : undefined;
    const rootId =
      admitted.kind === 'stage' && typeof summaryValue?.['rootId'] === 'string'
        ? uuid.parse(summaryValue['rootId'])
        : null;
    const category = typeof summaryValue?.['kind'] === 'string' ? summaryValue['kind'] : null;
    await this.db.transaction(async () => {
      const prior = await this.db
        .prepare(
          `SELECT ${HEADER_COLUMNS},bytes,link_bytes,recipient_bytes,payload FROM cognition_lab.records WHERE id=?`,
        )
        .get(admitted.id);
      if (
        prior &&
        (prior['kind'] !== admitted.kind ||
          prior['created_at'] !== admitted.createdAt ||
          (prior['parent_id'] ?? undefined) !== admitted.parentId ||
          (prior['actor_id'] ?? undefined) !== admitted.actorId ||
          (prior['source_id'] ?? undefined) !== admitted.sourceId)
      )
        throw new LabStorageError(
          'conflict',
          'A retained record cannot change its identity or scope.',
        );
      if (
        prior &&
        options.immutable &&
        (prior['payload'] !== payload || prior['summary'] !== summary)
      )
        throw new LabStorageError('conflict', 'Retained evidence is immutable.');
      if (prior && (prior['run_id'] ?? undefined) !== admitted.runId)
        throw new LabStorageError('conflict', 'A retained record cannot move to another run.');
      const linkBytes =
        options.references !== undefined
          ? Buffer.byteLength(encode(options.references))
          : prior
            ? number(prior, 'link_bytes')
            : 0;
      const recipientBytes =
        options.recipientActorIds !== undefined
          ? Buffer.byteLength(encode(options.recipientActorIds))
          : prior
            ? number(prior, 'recipient_bytes')
            : 0;
      // Reuse the encoded body for SQL and accounting rather than encoding a
      // potentially large experiment snapshot twice.
      const bytes =
        Buffer.byteLength(encode({ ...admitted, data: null })) -
        4 +
        Buffer.byteLength(payload) +
        linkBytes +
        recipientBytes;
      options.beforePublish?.();
      await this.adjust(
        bytes - (prior ? number(prior, 'bytes') : 0),
        admitted.runId,
        options.reservationId,
      );
      await this.db
        .prepare(
          `INSERT INTO cognition_lab.records (${HEADER_COLUMNS},payload,search_text,stage_role,category,bytes,link_bytes,recipient_bytes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,status=excluded.status,summary=excluded.summary,payload=excluded.payload,search_text=excluded.search_text,stage_role=excluded.stage_role,category=excluded.category,bytes=excluded.bytes,link_bytes=excluded.link_bytes,recipient_bytes=excluded.recipient_bytes`,
        )
        .run(
          admitted.id,
          admitted.kind,
          admitted.createdAt,
          admitted.name,
          admitted.runId ?? null,
          admitted.parentId ?? null,
          admitted.actorId ?? null,
          admitted.sourceId ?? null,
          admitted.status ?? null,
          summary,
          payload,
          searchText(admitted.summary),
          admitted.kind === 'stage' ? (rootId ? 'call' : 'root') : null,
          category,
          bytes,
          linkBytes,
          recipientBytes,
        );
      if (options.references) {
        await this.db.prepare('DELETE FROM cognition_lab.links WHERE owner_id=?').run(admitted.id);
        await insertRows(
          this.db,
          'cognition_lab.links (owner_id,target_kind,target_id)',
          options.references.map((reference) => [
            admitted.id,
            reference.kind,
            uuid.parse(reference.id),
          ]),
          'ON CONFLICT DO NOTHING',
        );
      }
      if (options.recipientActorIds) {
        await this.db
          .prepare('DELETE FROM cognition_lab.recipients WHERE record_id=?')
          .run(admitted.id);
        await insertRows(
          this.db,
          'cognition_lab.recipients (record_id,actor_id)',
          [...new Set(options.recipientActorIds)].map((actorId) => [
            admitted.id,
            z.string().min(1).parse(actorId),
          ]),
        );
      }
      options.beforePublish?.();
    });
  }
  async getRecord(id: string, kind?: LabRecordKind): Promise<LabRecord | undefined> {
    await this.ready;
    const row = await this.db
      .prepare(`SELECT ${HEADER_COLUMNS},payload FROM cognition_lab.records WHERE id=?`)
      .get(id);
    if (!row || (kind && row['kind'] !== kind)) return undefined;
    const selected = header(row);
    await this.guard?.({ record: selected });
    const result = { ...selected, data: jsonSchema.parse(JSON.parse(String(row['payload']))) };
    await this.guard?.({ record: selected });
    return result;
  }
  async getHeader(id: string, kind?: LabRecordKind): Promise<LabRecordHeader | undefined> {
    const result = await this.selectHeader(id, kind);
    if (result) await this.guard?.({ record: result });
    return result;
  }
  private async selectHeader(
    id: string,
    kind?: LabRecordKind,
  ): Promise<LabRecordHeader | undefined> {
    await this.ready;
    const row = await this.db
      .prepare(`SELECT ${HEADER_COLUMNS} FROM cognition_lab.records WHERE id=?`)
      .get(id);
    if (!row || (kind && row['kind'] !== kind)) return undefined;
    return header(row);
  }
  private async managementProjection(
    selected: LabRecordHeader,
    authorize: LabManagementAuthorizer,
  ): Promise<LabManagementHeader | undefined> {
    if (!SAVED_RECORD_KINDS.includes(selected.kind as LabSavedRecordKind))
      throw new LabStorageError(
        'invalid',
        'Choose a saved scenario, checkpoint, run or comparison.',
      );
    if (!(await authorize(selected))) return undefined;
    let withheld = false;
    try {
      await this.guard?.({ record: selected });
    } catch {
      withheld = true;
    }
    // Permission can be revoked during the guard's awaited native reads.
    if (!(await authorize(selected))) return undefined;
    // An owner may remove unavailable work without disclosing its historical
    // label, actor/source binding, summary or payload after forget/correction.
    return withheld
      ? { id: selected.id, kind: selected.kind, createdAt: selected.createdAt, withheld: true }
      : { ...selected, withheld: false };
  }
  async managementHeader(
    id: string,
    authorize: LabManagementAuthorizer,
  ): Promise<LabManagementHeader | undefined> {
    const selected = await this.selectHeader(id);
    return selected && this.managementProjection(selected, authorize);
  }
  async pageManagementRecords(
    kind: LabSavedRecordKind | readonly LabSavedRecordKind[],
    options: LabPageOptions,
    authorize: LabManagementAuthorizer,
  ): Promise<LabPage<LabManagementHeader>> {
    // Search only the permitted projection. Selecting historical labels first
    // would reveal a withheld record's membership through its safe tombstone.
    // The bounded scan cursor is deliberately independent of the search text;
    // a sparse page may therefore have no matches and still offer a next page.
    const page = await this.selectRecordPage(kind, { ...options, search: undefined });
    const search = options.search?.toLowerCase();
    const items: LabManagementHeader[] = [];
    for (const selected of page.items) {
      const projection = await this.managementProjection(selected, authorize);
      // Refuse rather than encoding another owner's identity/time in a page cursor.
      if (!projection) throw new LabStorageError('missing', 'These saved items are unavailable.');
      if (
        !search ||
        (!projection.withheld &&
          `${projection.name} ${searchText(projection.summary)}`.toLowerCase().includes(search))
      )
        items.push(projection);
    }
    return { items, ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}) };
  }
  /** Hydrate only IDs selected by a bounded public page, in one indexed read. */
  async recordData(ids: string[]): Promise<LabRecord[]> {
    await this.ready;
    z.array(uuid).max(LAB_STORAGE_DEFAULTS.maxPageSize).parse(ids);
    if (!ids.length) return [];
    const selected = [...new Set(ids)];
    const rows = await this.db
      .prepare(
        `SELECT ${HEADER_COLUMNS},payload FROM cognition_lab.records WHERE id IN (${selected.map(() => '?').join(',')})`,
      )
      .all(...selected);
    const values = new Map<string, LabRecord>();
    for (const row of rows) {
      const result = { ...header(row), data: jsonSchema.parse(JSON.parse(String(row['payload']))) };
      await this.guard?.({ record: result });
      values.set(result.id, result);
    }
    return ids.flatMap((id) => {
      const value = values.get(id);
      return value ? [value] : [];
    });
  }
  async pageRecords(
    kind: LabRecordKind | readonly LabRecordKind[] | undefined,
    options: LabPageOptions = {},
  ): Promise<LabPage<LabRecordHeader>> {
    const page = await this.selectRecordPage(kind, options);
    for (const item of page.items) await this.guard?.({ record: item });
    return page;
  }
  /** Guard bounded captured headers before exposing their links from a canonical
   * event. Native event visibility does not grant captured experiment visibility. */
  async timelineBindings(
    sourceIds: readonly string[],
    scope: { worldId: string; timeline: string },
  ) {
    if (!sourceIds.length) return new Map<string, { runId: string; rootId?: string }>();
    z.array(z.string().min(1)).max(50).parse(sourceIds);
    const rows = await this.db
      .prepare(
        `SELECT captured.* FROM (VALUES ${sourceIds.map(() => '(?::text)').join(',')}) wanted(source_id) CROSS JOIN LATERAL (SELECT ${HEADER_COLUMNS} FROM cognition_lab.records WHERE kind='timeline' AND summary::jsonb->>'nativeEvent'='true' AND source_id=wanted.source_id AND summary::jsonb->>'worldId'=? AND summary::jsonb->>'timeline'=? AND run_id IS NOT NULL ORDER BY created_at DESC,id DESC LIMIT 1) captured`,
      )
      .all(...sourceIds, scope.worldId, scope.timeline);
    const bindings = new Map<string, { runId: string; rootId?: string }>();
    for (const row of rows) {
      const selected = header(row);
      try {
        await this.guard?.({ record: selected });
      } catch (error) {
        if (
          (error instanceof AuthorityError && error.code === 'forbidden') ||
          (error instanceof LabStorageError && error.code === 'missing')
        )
          continue;
        throw error;
      }
      bindings.set(selected.sourceId!, {
        runId: selected.runId!,
        ...(selected.parentId ? { rootId: selected.parentId } : {}),
      });
    }
    return bindings;
  }
  private async selectRecordPage(
    kind: LabRecordKind | readonly LabRecordKind[] | undefined,
    options: LabPageOptions,
  ): Promise<LabPage<LabRecordHeader>> {
    await this.ready;
    const kinds = kind
      ? typeof kind === 'string'
        ? [recordKindSchema.parse(kind)]
        : z.array(recordKindSchema).min(1).max(recordKindSchema.options.length).parse(kind)
      : [];
    if (options.stageRole && (kinds.length !== 1 || kinds[0] !== 'stage'))
      throw new LabStorageError('invalid', 'A stage-role page requires the stage record kind.');
    if (
      options.nativeJobId !== undefined &&
      (kinds.length !== 1 || kinds[0] !== 'stage' || !options.runId)
    )
      throw new LabStorageError('invalid', 'A native-job stage page requires an exact run.');
    if (options.timelineScope && (kinds.length !== 1 || kinds[0] !== 'timeline'))
      throw new LabStorageError('invalid', 'A timeline scope requires timeline records.');
    if (!kinds.length && !options.runId && !options.parentId)
      throw new LabStorageError('invalid', 'An all-kind page requires an exact run or parent.');
    const limit = z
      .number()
      .int()
      .min(1)
      .max(LAB_STORAGE_DEFAULTS.maxPageSize)
      .parse(options.limit ?? LAB_STORAGE_DEFAULTS.pageSize);
    const savedKinds =
      kinds.length === SAVED_RECORD_KINDS.length &&
      SAVED_RECORD_KINDS.every((value) => kinds.includes(value));
    const clauses = savedKinds
      ? [SAVED_RECORD_PREDICATE]
      : kinds.length
        ? [`kind IN (${kinds.map(() => '?').join(',')})`]
        : [];
    const params: unknown[] = savedKinds ? [] : [...kinds];
    if (options.timelineScope) {
      const scope = z
        .object({ worldId: z.string().min(1), timeline: z.string().min(1) })
        .strict()
        .parse(options.timelineScope);
      // Exact current-scenario selection precedes paging and header hydration.
      // Retained run pages keep their own captured scopes and remain available.
      clauses.push(
        "kind='timeline'",
        "jsonb_typeof(summary::jsonb->'gameTime')='number'",
        "jsonb_typeof(summary::jsonb->'nativeOrder')='number'",
        "(summary::jsonb->>'worldId')=?",
        "(summary::jsonb->>'timeline')=?",
      );
      params.push(scope.worldId, scope.timeline);
    }
    if (options.stageRole) {
      clauses.push('stage_role=?');
      params.push(options.stageRole);
    }
    if (options.nativeJobId !== undefined) {
      clauses.push("kind='stage'", "(payload::jsonb->>'nativeJobId')=?");
      params.push(z.string().min(1).parse(options.nativeJobId));
    }
    if (options.category) {
      clauses.push('category=?');
      params.push(options.category);
    }
    if (options.categories) {
      clauses.push(
        options.categories.length
          ? `category IN (${options.categories.map(() => '?').join(',')})`
          : 'FALSE',
      );
      params.push(...options.categories);
    }
    if (options.nativeEvents === 'only') clauses.push("summary::jsonb->>'nativeEvent'='true'");
    if (options.nativeEvents === 'exclude')
      clauses.push("summary::jsonb->>'nativeEvent' IS DISTINCT FROM 'true'");
    for (const [key, column] of [
      ['runId', 'run_id'],
      ['parentId', 'parent_id'],
      ['actorId', 'actor_id'],
      ['sourceId', 'source_id'],
    ] as const)
      if (options[key]) {
        clauses.push(`${column}=?`);
        params.push(options[key]);
      }
    if (options.recipientActorId) {
      clauses.push('id IN (SELECT record_id FROM cognition_lab.recipients WHERE actor_id=?)');
      params.push(options.recipientActorId);
    }
    if (options.search) {
      clauses.push("(name ILIKE ? ESCAPE '\\' OR search_text ILIKE ? ESCAPE '\\')");
      const search = `%${options.search.replace(/[\\%_]/g, '\\$&')}%`;
      params.push(search, search);
    }
    if (options.cursor) {
      let cursor: unknown;
      try {
        cursor = JSON.parse(Buffer.from(options.cursor, 'base64url').toString('utf8'));
      } catch {
        throw new LabStorageError('invalid', 'Invalid lab page cursor.');
      }
      const position = (
        options.timelineScope
          ? z.tuple([z.number().finite(), z.number().finite(), z.string().datetime(), uuid])
          : z.tuple([z.string().datetime(), uuid])
      ).safeParse(cursor);
      if (!position.success) throw new LabStorageError('invalid', 'Invalid lab page cursor.');
      clauses.push(
        options.timelineScope
          ? "((summary::jsonb->>'gameTime')::double precision,(summary::jsonb->>'nativeOrder')::double precision,created_at,id)<(?,?,?,?)"
          : '(created_at,id)<(?,?)',
      );
      params.push(...position.data);
    }
    const rows = await this.db
      .prepare(
        `SELECT ${HEADER_COLUMNS} FROM cognition_lab.records WHERE ${clauses.join(' AND ')} ORDER BY ${options.timelineScope ? "(summary::jsonb->>'gameTime')::double precision DESC,(summary::jsonb->>'nativeOrder')::double precision DESC," : ''}created_at DESC,id DESC LIMIT ?`,
      )
      .all(...params, limit + 1);
    const items = rows.slice(0, limit).map(header);
    const last = items.at(-1);
    return {
      items,
      ...(rows.length > limit && last
        ? {
            nextCursor: Buffer.from(
              JSON.stringify(
                options.timelineScope
                  ? [
                      (last.summary as { gameTime: number }).gameTime,
                      (last.summary as { nativeOrder: number }).nativeOrder,
                      last.createdAt,
                      last.id,
                    ]
                  : [last.createdAt, last.id],
              ),
            ).toString('base64url'),
          }
        : {}),
    };
  }
  async putArtifact(
    data: Uint8Array | string,
    contentType: string,
    options: { id?: string; runId?: string; reservationId?: string; createdAt?: string } = {},
  ): Promise<LabArtifact> {
    const bytes = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
    return this.putArtifactStream(
      (async function* () {
        yield bytes;
      })(),
      {
        id: options.id ?? randomUUID(),
        ...(options.runId ? { runId: options.runId } : {}),
        contentType,
        bytes: bytes.length,
        checksum: hash(bytes),
        createdAt: options.createdAt ?? new Date().toISOString(),
      },
      options.reservationId,
    );
  }
  async putArtifactStream(
    chunks: AsyncIterable<Uint8Array>,
    metadata: LabArtifact,
    suppliedReservation?: string,
  ): Promise<LabArtifact> {
    if (this.closed) throw new LabStorageError('invalid', 'The lab evidence store is closing.');
    const operation = this.writeArtifactStream(chunks, metadata, suppliedReservation);
    this.fileWrites.add(operation);
    try {
      return await operation;
    } finally {
      this.fileWrites.delete(operation);
    }
  }
  private async writeArtifactStream(
    chunks: AsyncIterable<Uint8Array>,
    metadata: LabArtifact,
    suppliedReservation?: string,
  ): Promise<LabArtifact> {
    await this.ready;
    const value = z
      .object({
        id: uuid,
        runId: uuid.optional(),
        contentType: z.string().min(1).max(150),
        bytes: finiteBytes,
        checksum: z.string().regex(/^[a-f0-9]{64}$/),
        createdAt: z.string().datetime(),
      })
      .strict()
      .parse(metadata);
    const prior = await this.artifact(value.id);
    if (prior) {
      if (
        prior.checksum !== value.checksum ||
        prior.bytes !== value.bytes ||
        prior.contentType !== value.contentType ||
        prior.runId !== value.runId
      )
        throw new LabStorageError('conflict', 'Artifact identity conflicts.');
      return prior;
    }
    const charge = value.bytes + Buffer.byteLength(encode(value));
    const reservation = suppliedReservation ?? (await this.reserve(charge, value.runId));
    const pending = join(this.artifactsDirectory, `.pending-${process.pid}-${randomUUID()}`);
    let published = false,
      committed = false;
    try {
      const file = await open(pending, 'wx', 0o600);
      let bytes = 0;
      const checksum = createHash('sha256');
      try {
        for await (const chunk of chunks) {
          bytes += chunk.byteLength;
          if (bytes > value.bytes)
            throw new LabStorageError('integrity', 'Artifact exceeds its declared size.');
          checksum.update(chunk);
          await file.writeFile(chunk);
        }
        if (bytes !== value.bytes || checksum.digest('hex') !== value.checksum)
          throw new LabStorageError('integrity', 'Artifact integrity check failed.');
        await file.sync();
      } finally {
        await file.close();
      }
      await link(pending, join(this.artifactsDirectory, value.id));
      published = true;
      await rm(pending);
      await syncDirectory(this.artifactsDirectory);
      await this.db.transaction(async () => {
        await this.adjust(charge, value.runId, reservation);
        await this.db
          .prepare('INSERT INTO cognition_lab.artifacts VALUES (?,?,?,?,?,?,?)')
          .run(
            value.id,
            value.runId ?? null,
            value.contentType,
            value.bytes,
            value.checksum,
            value.createdAt,
            charge,
          );
      });
      committed = true;
      if (!suppliedReservation) await this.release(reservation);
      return value;
    } catch (error) {
      // An ambiguous acknowledgement must never erase a file whose row committed.
      const retained = committed || (published && !!(await this.artifact(value.id)));
      if (!retained)
        await rm(published ? join(this.artifactsDirectory, value.id) : pending, { force: true });
      if (!suppliedReservation) await this.release(reservation);
      throw error;
    }
  }
  async artifact(id: string): Promise<LabArtifact | undefined> {
    await this.ready;
    const row = await this.db
      .prepare('SELECT * FROM cognition_lab.artifacts WHERE id=?')
      .get(uuid.parse(id));
    return row ? artifact(row) : undefined;
  }
  /** Reverse links resolve each actual supporting actor, independent of the focal actor.
   * This deliberately bypasses this class's guard: the guard consumes these exact scopes. */
  async artifactOwners(id: string): Promise<LabRecordHeader[]> {
    await this.ready;
    const columns = HEADER_COLUMNS.split(',')
      .map((column) => `r.${column}`)
      .join(',');
    const rows = await this.db
      .prepare(
        `SELECT ${columns} FROM cognition_lab.links l JOIN cognition_lab.records r ON r.id=l.owner_id WHERE l.target_kind='artifact' AND l.target_id=? ORDER BY r.id`,
      )
      .all(uuid.parse(id));
    return rows.map(header);
  }
  async readArtifactChunk(
    id: string,
    offset = 0,
    limit = LAB_STORAGE_DEFAULTS.chunkBytes,
  ): Promise<{ artifact: LabArtifact; offset: number; bytes: Buffer; nextOffset?: number }> {
    const release = this.pinArtifact(id);
    try {
      return await this.artifactChunk(id, offset, limit);
    } finally {
      release();
    }
  }
  private pinArtifact(id: string): () => void {
    uuid.parse(id);
    if (this.deletingArtifacts.has(id))
      throw new LabStorageError('missing', 'Captured artifact is being removed.');
    this.artifactReaders.set(id, (this.artifactReaders.get(id) ?? 0) + 1);
    return () => {
      const count = (this.artifactReaders.get(id) ?? 1) - 1;
      if (count) this.artifactReaders.set(id, count);
      else {
        this.artifactReaders.delete(id);
        if (this.deferredArtifactRemovals.delete(id)) {
          const cleanup = this.removeUnreferencedArtifact(id);
          this.cleanupWrites.add(cleanup);
          void cleanup
            .catch((error: unknown) => recordBackgroundFailure('lab-retained-cleanup', error))
            .finally(() => this.cleanupWrites.delete(cleanup));
        }
      }
    };
  }
  pinRetained(kind: 'artifact' | 'checkpoint', id: string): () => void {
    if (kind === 'artifact') return this.pinArtifact(id);
    uuid.parse(id);
    if (this.deletingCheckpoints.has(id))
      throw new LabStorageError('missing', 'Native checkpoint is being removed.');
    this.checkpointReaders.set(id, (this.checkpointReaders.get(id) ?? 0) + 1);
    return () => {
      const remaining = (this.checkpointReaders.get(id) ?? 1) - 1;
      if (remaining) this.checkpointReaders.set(id, remaining);
      else {
        this.checkpointReaders.delete(id);
        const remove = this.deferredCheckpointRemovals.get(id);
        if (remove) {
          this.deferredCheckpointRemovals.delete(id);
          const cleanup = this.removeUnreferencedCheckpoint(id, remove);
          this.cleanupWrites.add(cleanup);
          void cleanup
            .catch((error: unknown) => recordBackgroundFailure('lab-retained-cleanup', error))
            .finally(() => this.cleanupWrites.delete(cleanup));
        }
      }
    };
  }
  private async artifactChunk(id: string, offset: number, limit: number) {
    const selected = await this.artifact(id);
    if (!selected) throw new LabStorageError('missing', 'Captured artifact is unavailable.');
    finiteBytes.parse(offset);
    z.number().int().positive().max(LAB_STORAGE_DEFAULTS.chunkBytes).parse(limit);
    if (offset > selected.bytes)
      throw new LabStorageError('invalid', 'Payload offset exceeds the captured content.');
    await this.guard?.({ artifact: selected });
    const file = await open(join(this.artifactsDirectory, uuid.parse(id)), 'r');
    let bytes: Buffer;
    try {
      if ((await file.stat()).size !== selected.bytes)
        throw new LabStorageError('integrity', 'Captured artifact length changed.');
      bytes = Buffer.alloc(Math.min(limit, selected.bytes - offset));
      const read = await file.read(bytes, 0, bytes.length, offset);
      if (read.bytesRead !== bytes.length)
        throw new LabStorageError('integrity', 'Captured artifact is incomplete.');
    } finally {
      await file.close();
    }
    await this.guard?.({ artifact: selected });
    const nextOffset = offset + bytes.length;
    return {
      artifact: selected,
      offset,
      bytes,
      ...(nextOffset < selected.bytes ? { nextOffset } : {}),
    };
  }
  async *streamArtifact(
    id: string,
    chunkBytes: number = LAB_STORAGE_DEFAULTS.chunkBytes,
  ): AsyncGenerator<Buffer> {
    const release = this.pinArtifact(id);
    try {
      let offset = 0;
      const checksum = createHash('sha256');
      let selected: LabArtifact | undefined;
      do {
        const chunk = await this.artifactChunk(id, offset, chunkBytes);
        selected = chunk.artifact;
        checksum.update(chunk.bytes);
        yield chunk.bytes;
        if (chunk.nextOffset === undefined) break;
        offset = chunk.nextOffset;
      } while (true);
      if (checksum.digest('hex') !== selected.checksum)
        throw new LabStorageError('integrity', 'Captured artifact integrity check failed.');
    } finally {
      release();
    }
  }
  async registerCheckpoint(checkpoint: LabNativeCheckpoint, reservationId?: string): Promise<void> {
    await this.ready;
    const selected = labNativeCheckpointSchema.parse(checkpoint),
      payload = encode(selected);
    await this.db.transaction(async () => {
      const prior = await this.db
        .prepare('SELECT payload FROM cognition_lab.checkpoints WHERE id=?')
        .get(selected.id);
      if (prior) {
        if (prior['payload'] !== payload)
          throw new LabStorageError('conflict', 'Native checkpoint identity conflicts.');
        return;
      }
      const bytes = selected.bytes + Buffer.byteLength(payload);
      await this.adjust(bytes, undefined, reservationId);
      await this.db
        .prepare('INSERT INTO cognition_lab.checkpoints VALUES (?,?,?)')
        .run(selected.id, payload, bytes);
    });
  }
  async references(kind: 'artifact' | 'checkpoint' | 'record', id: string): Promise<boolean> {
    await this.ready;
    return !!(await this.db
      .prepare('SELECT 1 FROM cognition_lab.links WHERE target_kind=? AND target_id=? LIMIT 1')
      .get(kind, id));
  }
  async recordLinks(
    id: string,
  ): Promise<Array<{ kind: 'artifact' | 'checkpoint' | 'record'; id: string }>> {
    await this.ready;
    const selected = await this.getHeader(id);
    if (!selected) throw new LabStorageError('missing', 'Retained record is unavailable.');
    const rows = await this.db
      .prepare(
        'SELECT target_kind,target_id FROM cognition_lab.links WHERE owner_id=? ORDER BY target_kind,target_id',
      )
      .all(id);
    await this.guard?.({ record: selected });
    return rows.map((row) => ({
      kind: z.enum(['artifact', 'checkpoint', 'record']).parse(row['target_kind']),
      id: String(row['target_id']),
    }));
  }
  async checkpoint(id: string): Promise<LabNativeCheckpoint | undefined> {
    await this.ready;
    const row = await this.db
      .prepare('SELECT payload FROM cognition_lab.checkpoints WHERE id=?')
      .get(id);
    return row ? labNativeCheckpointSchema.parse(JSON.parse(String(row['payload']))) : undefined;
  }
  async growReservation(id: string, bytes: number): Promise<void> {
    await this.ready;
    finiteBytes.positive().parse(bytes);
    await this.db.transaction(async () => {
      const reservation = await this.db
        .prepare('SELECT run_id FROM cognition_lab.reservations WHERE id=?')
        .get(id);
      if (!reservation) throw new LabStorageError('missing', 'Capture reservation is unavailable.');
      if (reservation['run_id']) {
        const run = await this.db
          .prepare(
            'UPDATE cognition_lab.run_usage SET reserved_bytes=reserved_bytes+? WHERE run_id=? AND used_bytes+reserved_bytes+?<=allowance_bytes RETURNING run_id',
          )
          .get(bytes, reservation['run_id'], bytes);
        if (!run) throw new LabStorageError('capacity', 'Run capture capacity reached.');
      }
      const updated = await this.db
        .prepare(
          'UPDATE cognition_lab.storage SET reserved_bytes=reserved_bytes+? WHERE singleton=1 AND used_bytes+reserved_bytes+?<=allowance_bytes RETURNING singleton',
        )
        .get(bytes, bytes);
      if (!updated) throw new LabStorageError('capacity', 'Lab storage capacity reached.');
      await this.db
        .prepare('UPDATE cognition_lab.reservations SET bytes=bytes+? WHERE id=?')
        .run(bytes, id);
    });
  }
  async removeRecord(
    id: string,
    beforePublish?: () => void,
  ): Promise<{ artifacts: string[]; checkpoints: string[] }> {
    await this.ready;
    return this.db.transaction(async () => {
      const selected = await this.db
        .prepare('SELECT kind FROM cognition_lab.records WHERE id=?')
        .get(id);
      if (!selected) return { artifacts: [], checkpoints: [] };
      const run = selected['kind'] === 'run';
      const predicate = run ? '(id=? OR run_id=?)' : 'id=?';
      const params = run ? [id, id] : [id];
      const children =
        !run &&
        (await this.db
          .prepare('SELECT 1 FROM cognition_lab.records WHERE parent_id=? LIMIT 1')
          .get(id));
      if (children)
        throw new LabStorageError(
          'conflict',
          'Remove dependent retained records before removing this record.',
        );
      const incoming = await this.db
        .prepare(
          `SELECT 1 FROM cognition_lab.links WHERE target_kind='record' AND target_id IN (SELECT id FROM cognition_lab.records WHERE ${predicate}) AND owner_id NOT IN (SELECT id FROM cognition_lab.records WHERE ${predicate}) LIMIT 1`,
        )
        .get(...params, ...params);
      if (incoming)
        throw new LabStorageError('conflict', 'That record is still required by retained work.');
      const refs = await this.db
        .prepare(
          `SELECT DISTINCT target_kind,target_id FROM cognition_lab.links WHERE owner_id IN (SELECT id FROM cognition_lab.records WHERE ${predicate})`,
        )
        .all(...params);
      const totals = await this.db
        .prepare(
          `SELECT run_id,SUM(bytes) AS bytes FROM cognition_lab.records WHERE ${predicate} GROUP BY run_id`,
        )
        .all(...params);
      beforePublish?.();
      for (const total of totals)
        await this.adjust(
          -number(total, 'bytes'),
          total['run_id'] ? String(total['run_id']) : undefined,
        );
      const evidence = await this.db
        .prepare(
          `SELECT r.run_id,SUM(e.bytes) AS bytes FROM cognition_lab.evidence e JOIN cognition_lab.records r ON r.id=e.stage_id WHERE r.id IN (SELECT id FROM cognition_lab.records WHERE ${predicate}) GROUP BY r.run_id`,
        )
        .all(...params);
      for (const total of evidence)
        await this.adjust(
          -number(total, 'bytes'),
          total['run_id'] ? String(total['run_id']) : undefined,
        );
      await this.db
        .prepare(
          `DELETE FROM cognition_lab.evidence WHERE stage_id IN (SELECT id FROM cognition_lab.records WHERE ${predicate})`,
        )
        .run(...params);
      await this.db
        .prepare(
          `DELETE FROM cognition_lab.links WHERE owner_id IN (SELECT id FROM cognition_lab.records WHERE ${predicate})`,
        )
        .run(...params);
      await this.db
        .prepare(
          `DELETE FROM cognition_lab.recipients WHERE record_id IN (SELECT id FROM cognition_lab.records WHERE ${predicate})`,
        )
        .run(...params);
      if (run) {
        const attempts = await this.db
          .prepare(
            'SELECT COALESCE(SUM(bytes),0) AS bytes FROM cognition_lab.attempts WHERE run_id=?',
          )
          .get(id);
        if (attempts) await this.adjust(-number(attempts, 'bytes'), id);
        await this.db.prepare('DELETE FROM cognition_lab.attempts WHERE run_id=?').run(id);
        await this.db.prepare('DELETE FROM cognition_lab.costs WHERE run_id=?').run(id);
      }
      await this.db.prepare(`DELETE FROM cognition_lab.records WHERE ${predicate}`).run(...params);
      const result: { artifacts: string[]; checkpoints: string[] } = {
        artifacts: [],
        checkpoints: [],
      };
      for (const ref of refs) {
        const kind = ref['target_kind'];
        if (
          (kind === 'artifact' || kind === 'checkpoint') &&
          !(await this.references(kind, String(ref['target_id'])))
        )
          result[kind === 'artifact' ? 'artifacts' : 'checkpoints'].push(String(ref['target_id']));
      }
      beforePublish?.();
      return result;
    });
  }
  /** The native deletion callback runs before releasing the checkpoint's logical byte charge. */
  async removeUnreferencedCheckpoint(id: string, remove: () => Promise<void>): Promise<boolean> {
    await this.ready;
    if (this.checkpointReaders.has(id)) {
      this.deferredCheckpointRemovals.set(id, remove);
      return false;
    }
    if (this.deletingCheckpoints.has(id)) return false;
    this.deletingCheckpoints.add(id);
    try {
      return await this.db.transaction(async () => {
        if (await this.references('checkpoint', id)) return false;
        const row = await this.db
          .prepare('SELECT bytes FROM cognition_lab.checkpoints WHERE id=?')
          .get(id);
        if (!row) return false;
        await remove();
        await this.adjust(-number(row, 'bytes'));
        await this.db.prepare('DELETE FROM cognition_lab.checkpoints WHERE id=?').run(id);
        return true;
      });
    } finally {
      this.deletingCheckpoints.delete(id);
    }
  }
  async removeUnreferencedArtifact(id: string): Promise<boolean> {
    await this.ready;
    if (this.artifactReaders.has(id)) {
      this.deferredArtifactRemovals.add(id);
      return false;
    }
    if (this.deletingArtifacts.has(id)) return false;
    this.deletingArtifacts.add(id);
    try {
      return await this.db.transaction(async () => {
        if (await this.references('artifact', id)) return false;
        const row = await this.db
          .prepare('SELECT * FROM cognition_lab.artifacts WHERE id=?')
          .get(id);
        if (!row) return false;
        const selected = artifact(row);
        await rm(join(this.artifactsDirectory, uuid.parse(id)), { force: true });
        await syncDirectory(this.artifactsDirectory);
        await this.adjust(-number(row, 'stored_bytes'), selected.runId);
        await this.db.prepare('DELETE FROM cognition_lab.artifacts WHERE id=?').run(id);
        return true;
      });
    } finally {
      this.deletingArtifacts.delete(id);
    }
  }
  async beginOperation(
    commandId: string,
    intention: LabJson,
    options: { recovery?: boolean; allowanceBytes?: number } = {},
  ): Promise<LabReceipt & { claimed: boolean }> {
    await this.ready;
    uuid.parse(commandId);
    const fingerprint = hash(encode(jsonSchema.parse(intention)));
    return this.db.transaction(async () => {
      const prior = await this.receipt(commandId);
      if (prior) {
        if (prior.fingerprint !== fingerprint)
          throw new LabStorageError(
            'conflict',
            'Command identity was already used for a different operation.',
          );
        return { ...prior, claimed: false };
      }
      const receipt: LabReceipt = {
        commandId,
        fingerprint,
        state: 'pending',
        createdAt: new Date().toISOString(),
      };
      const bytes = Buffer.byteLength(encode(receipt));
      let reservationId: string;
      if (options.recovery) {
        if (
          await this.db
            .prepare(
              "SELECT command_id FROM cognition_lab.receipts WHERE state='pending' AND reservation_id=? LIMIT 1",
            )
            .get(RECOVERY_RESERVATION)
        )
          throw new LabStorageError(
            'conflict',
            'Another storage recovery operation is pending. Inspect its receipt before continuing.',
          );
        if (options.allowanceBytes !== undefined) {
          finiteBytes.positive().parse(options.allowanceBytes);
          const raised = await this.db
            .prepare(
              'UPDATE cognition_lab.storage SET allowance_bytes=? WHERE singleton=1 AND allowance_bytes<=? RETURNING singleton',
            )
            .get(options.allowanceBytes, options.allowanceBytes);
          if (!raised)
            throw new LabStorageError(
              'capacity',
              'Storage recovery may only increase the allowance.',
            );
          await this.replenishRecovery();
        }
        const credit = await this.db
          .prepare('SELECT bytes FROM cognition_lab.reservations WHERE id=?')
          .get(RECOVERY_RESERVATION);
        if (!credit || number(credit, 'bytes') < LAB_STORAGE_DEFAULTS.recoveryTerminalBytes)
          throw new LabStorageError(
            'capacity',
            'The recovery receipt credit is occupied. Increase the storage allowance enough to replenish it.',
          );
        reservationId = RECOVERY_RESERVATION;
      } else {
        if (options.allowanceBytes !== undefined)
          throw new LabStorageError(
            'invalid',
            'Allowance recovery needs explicit recovery admission.',
          );
        reservationId = await this.reserve(LAB_STORAGE_DEFAULTS.terminalBytes);
      }
      await this.adjust(bytes, undefined, reservationId);
      await this.db
        .prepare('INSERT INTO cognition_lab.receipts VALUES (?,?,?,?,?,?,?)')
        .run(commandId, fingerprint, receipt.state, null, receipt.createdAt, bytes, reservationId);
      return { ...receipt, claimed: true };
    });
  }
  async finishOperation(
    commandId: string,
    state: 'completed' | 'failed' | 'interrupted',
    result: LabJson,
  ): Promise<LabReceipt> {
    await this.ready;
    return this.db.transaction(async () => {
      const row = await this.db
        .prepare('SELECT * FROM cognition_lab.receipts WHERE command_id=?')
        .get(commandId);
      if (!row) throw new LabStorageError('missing', 'Operation receipt does not exist.');
      const next: LabReceipt = {
        commandId,
        fingerprint: String(row['fingerprint']),
        state,
        result,
        createdAt: String(row['created_at']),
      };
      const encoded = encode(next),
        resultJson = encode(jsonSchema.parse(result));
      if (row['state'] !== 'pending') {
        if (row['state'] !== state || row['result'] !== resultJson)
          throw new LabStorageError('conflict', 'Completed operation outcome cannot change.');
        return next;
      }
      const bytes = Buffer.byteLength(encoded);
      const recovery = row['reservation_id'] === RECOVERY_RESERVATION;
      if (
        bytes >
        (recovery ? LAB_STORAGE_DEFAULTS.recoveryTerminalBytes : LAB_STORAGE_DEFAULTS.terminalBytes)
      )
        throw new LabStorageError(
          'capacity',
          'The terminal operation receipt exceeds its admitted metadata bound.',
        );
      await this.adjust(bytes - number(row, 'bytes'), undefined, String(row['reservation_id']));
      if (!recovery) await this.release(String(row['reservation_id']));
      await this.db
        .prepare(
          'UPDATE cognition_lab.receipts SET state=?,result=?,bytes=?,reservation_id=NULL WHERE command_id=?',
        )
        .run(state, resultJson, bytes, commandId);
      await this.replenishRecovery();
      return next;
    });
  }
  async receipt(commandId: string): Promise<LabReceipt | undefined> {
    await this.ready;
    const row = await this.db
      .prepare(
        'SELECT command_id,fingerprint,state,result,created_at FROM cognition_lab.receipts WHERE command_id=?',
      )
      .get(commandId);
    if (!row) return undefined;
    const state = z.enum(['pending', 'completed', 'failed', 'interrupted']).parse(row['state']);
    return {
      commandId,
      fingerprint: String(row['fingerprint']),
      state,
      createdAt: String(row['created_at']),
      ...(row['result'] !== null
        ? { result: jsonSchema.parse(JSON.parse(String(row['result']))) }
        : {}),
    };
  }

  /** Startup only, before dispatch. An exact durable replacement marker can keep
   * its owning receipt pending until native installation is reconciled; only that
   * receipt's terminal credit survives, never callbacks or capture reservations.
   * Existing native financial receipts remain untouched, including uncertain execution. */
  async recoverInterrupted(
    options: { preserveCommandIds?: readonly string[] } = {},
  ): Promise<void> {
    await this.ready;
    const preserve = new Set(options.preserveCommandIds);
    const preservedReservations = new Set<string>();
    const pending = await this.db
      .prepare("SELECT command_id,reservation_id FROM cognition_lab.receipts WHERE state='pending'")
      .all();
    for (const row of pending) {
      if (preserve.has(String(row['command_id']))) {
        if (row['reservation_id'] !== null)
          preservedReservations.add(String(row['reservation_id']));
        continue;
      }
      await this.finishOperation(String(row['command_id']), 'interrupted', {
        message:
          'The server restarted before this operation reported its outcome. Inspect native receipts before repeating it.',
      });
    }
    const reservations = await this.db.prepare('SELECT id FROM cognition_lab.reservations').all();
    for (const row of reservations)
      if (row['id'] !== RECOVERY_RESERVATION && !preservedReservations.has(String(row['id'])))
        await this.release(String(row['id']));
    await this.db.transaction(() => this.replenishRecovery());
    // A crash after exclusive file publication but before the metadata commit leaves no
    // readable record. Remove only this owner's unreferenced, exact UUID artifact files.
    for await (const entry of await opendir(this.artifactsDirectory)) {
      if (!entry.isFile()) continue;
      const pending = /^\.pending-([1-9][0-9]*)-[a-f0-9-]{36}$/.exec(entry.name);
      if (pending) {
        try {
          process.kill(Number(pending[1]), 0);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ESRCH')
            await rm(join(this.artifactsDirectory, entry.name), { force: true });
        }
        continue;
      }
      if (!uuid.safeParse(entry.name).success) continue;
      if (!(await this.artifact(entry.name)))
        await rm(join(this.artifactsDirectory, entry.name), { force: true });
    }
  }

  async putEvidence(
    stageId: string,
    items: LabEvidenceItem[],
    reservationId?: string,
    immutableDuplicates = false,
  ): Promise<void> {
    await this.ready;
    const stage = await this.getHeader(stageId, 'stage');
    if (!stage) throw new LabStorageError('missing', 'Captured stage is unavailable.');
    const seen = new Set<string>();
    const rows = items.map((item) => {
      assertLabMetadataSize({ kind: 'evidence', stageId, items: [item] });
      if (item.stageId !== stageId || !item.id || !item.kind)
        throw new LabStorageError('invalid', 'Evidence must belong to its exact captured stage.');
      const key = JSON.stringify([item.kind, item.id]);
      if (seen.has(key)) throw new LabStorageError('invalid', 'Duplicate evidence identity.');
      seen.add(key);
      const summary = encode(jsonSchema.parse(item.summary)),
        source = item.source === undefined ? null : encode(jsonSchema.parse(item.source));
      const bytes = Buffer.byteLength(encode(item));
      return [
        item.id,
        stageId,
        item.kind,
        item.label,
        source,
        summary,
        searchText(item.summary),
        bytes,
      ];
    });
    if (!rows.length) return;
    await this.db.transaction(async () => {
      let pending = rows;
      if (immutableDuplicates) {
        const existing = await this.db
          .prepare(
            `SELECT id,kind,label,source,summary FROM cognition_lab.evidence WHERE stage_id=? AND (kind,id) IN (${rows.map(() => '(?,?)').join(',')})`,
          )
          .all(stageId, ...rows.flatMap((row) => [row[2], row[0]]));
        const retained = new Map(
          existing.map((row) => [JSON.stringify([row['kind'], row['id']]), row]),
        );
        pending = rows.filter((row) => {
          const prior = retained.get(JSON.stringify([row[2], row[0]]));
          if (!prior) return true;
          if (
            prior['label'] !== row[3] ||
            prior['source'] !== row[4] ||
            prior['summary'] !== row[5]
          )
            throw new LabStorageError('conflict', 'Imported evidence identity conflicts.');
          return false;
        });
      }
      if (!pending.length) return;
      await this.adjust(
        pending.reduce<number>((sum, row) => sum + Number(row[7]), 0),
        stage.runId,
        reservationId,
      );
      await insertRows(
        this.db,
        'cognition_lab.evidence (id,stage_id,kind,label,source,summary,search_text,bytes)',
        pending,
      );
    });
  }

  async pageEvidence(
    stageId: string,
    options: { kind?: string; limit?: number; cursor?: string; search?: string } = {},
  ): Promise<LabPage<LabEvidenceItem>> {
    await this.ready;
    const stage = await this.getHeader(stageId, 'stage');
    if (!stage) throw new LabStorageError('missing', 'Captured stage is unavailable.');
    const limit = z
      .number()
      .int()
      .min(1)
      .max(LAB_STORAGE_DEFAULTS.maxPageSize)
      .parse(options.limit ?? LAB_STORAGE_DEFAULTS.pageSize);
    const clauses = ['stage_id=?'],
      params: unknown[] = [stageId];
    if (options.kind) {
      clauses.push('kind=?');
      params.push(options.kind);
    }
    if (options.search) {
      clauses.push("(label ILIKE ? ESCAPE '\\' OR search_text ILIKE ? ESCAPE '\\')");
      const search = `%${options.search.replace(/[\\%_]/g, '\\$&')}%`;
      params.push(search, search);
    }
    if (options.cursor) {
      let cursor: unknown;
      try {
        cursor = JSON.parse(Buffer.from(options.cursor, 'base64url').toString('utf8'));
      } catch {
        throw new LabStorageError('invalid', 'Invalid evidence page cursor.');
      }
      const position = z.tuple([z.string(), z.string()]).safeParse(cursor);
      if (!position.success) throw new LabStorageError('invalid', 'Invalid evidence page cursor.');
      clauses.push('(kind,id)>(?,?)');
      params.push(...position.data);
    }
    const rows = await this.db
      .prepare(
        // Fresh statistics can estimate fewer than one page and choose a whole-stage
        // bitmap scan/sort even for an identity-only projection. A LIMIT 1 range
        // lookup keeps each successive native identity indexed; recursion stops at
        // the requested page, then hydrates only those exact items.
        `SELECT e.id,e.kind,e.label,e.source,e.summary FROM (
          WITH RECURSIVE page_keys AS (
            (SELECT kind,id,1 AS position FROM cognition_lab.evidence WHERE ${clauses.join(' AND ')} ORDER BY kind,id LIMIT 1)
            UNION ALL
            SELECT next.kind,next.id,previous.position+1 FROM page_keys previous
            CROSS JOIN LATERAL (SELECT kind,id FROM cognition_lab.evidence WHERE ${clauses.join(' AND ')} AND (kind,id)>(previous.kind,previous.id) ORDER BY kind,id LIMIT 1) next
            WHERE previous.position<?
          ) SELECT kind,id FROM page_keys
        ) page CROSS JOIN LATERAL (SELECT id,kind,label,source,summary FROM cognition_lab.evidence WHERE stage_id=? AND kind=page.kind AND id=page.id OFFSET 0) e ORDER BY page.kind,page.id`,
      )
      .all(...params, ...params, limit + 1, stageId);
    const items = rows.slice(0, limit).map(
      (row): LabEvidenceItem => ({
        id: String(row['id']),
        stageId,
        kind: String(row['kind']),
        label: String(row['label']),
        summary: jsonSchema.parse(JSON.parse(String(row['summary']))),
        ...(row['source'] !== null
          ? { source: jsonSchema.parse(JSON.parse(String(row['source']))) }
          : {}),
      }),
    );
    await this.guard?.({ record: stage });
    const last = items.at(-1);
    return {
      items,
      ...(rows.length > limit && last
        ? { nextCursor: Buffer.from(JSON.stringify([last.kind, last.id])).toString('base64url') }
        : {}),
    };
  }
  async evidenceItem(
    stageId: string,
    kind: string,
    id: string,
  ): Promise<LabEvidenceItem | undefined> {
    const stage = await this.getHeader(stageId, 'stage');
    if (!stage) throw new LabStorageError('missing', 'Captured stage is unavailable.');
    const row = await this.db
      .prepare(
        'SELECT id,kind,label,source,summary FROM cognition_lab.evidence WHERE stage_id=? AND kind=? AND id=?',
      )
      .get(stageId, kind, id);
    await this.guard?.({ record: stage });
    return row
      ? {
          id: String(row['id']),
          stageId,
          kind: String(row['kind']),
          label: String(row['label']),
          summary: jsonSchema.parse(JSON.parse(String(row['summary']))),
          ...(row['source'] !== null
            ? { source: jsonSchema.parse(JSON.parse(String(row['source']))) }
            : {}),
        }
      : undefined;
  }

  /** Mirrors native settled/unknown receipt facts; never grants or rewinds spending. */
  async reconcileAttempt(
    runId: string,
    attemptId: string,
    receipt: LabJson,
    costUsd: number | undefined,
    completionUncertain: boolean,
    reservationId?: string,
  ): Promise<void> {
    await this.ready;
    assertLabMetadataSize({
      kind: 'attempt',
      runId,
      attemptId,
      receipt,
      costUsd,
      completionUncertain,
    });
    if (costUsd !== undefined) z.number().finite().nonnegative().parse(costUsd);
    const payload = encode(jsonSchema.parse(receipt)),
      bytes = Buffer.byteLength(payload) + Buffer.byteLength(attemptId);
    await this.db.transaction(async () => {
      const prior = await this.db
        .prepare('SELECT * FROM cognition_lab.attempts WHERE attempt_id=?')
        .get(attemptId);
      if (prior && prior['run_id'] !== runId)
        throw new LabStorageError('conflict', 'Native attempt already belongs to another run.');
      const previousCost =
        prior?.['cost_usd'] === null || prior?.['cost_usd'] === undefined
          ? undefined
          : Number(prior['cost_usd']);
      await this.adjust(bytes - (prior ? number(prior, 'bytes') : 0), runId, reservationId);
      await this.db
        .prepare(
          'INSERT INTO cognition_lab.attempts VALUES (?,?,?,?,?,?) ON CONFLICT(attempt_id) DO UPDATE SET cost_usd=excluded.cost_usd,completion_uncertain=excluded.completion_uncertain,payload=excluded.payload,bytes=excluded.bytes',
        )
        .run(attemptId, runId, costUsd ?? null, completionUncertain, payload, bytes);
      const knownDelta = (costUsd ?? 0) - (previousCost ?? 0);
      const unknownDelta =
        (costUsd === undefined ? 1 : 0) - (prior && previousCost === undefined ? 1 : 0);
      const uncertainDelta =
        (completionUncertain ? 1 : 0) - (prior?.['completion_uncertain'] ? 1 : 0);
      await this.db
        .prepare(
          'INSERT INTO cognition_lab.costs VALUES (?,?,?,?) ON CONFLICT(run_id) DO UPDATE SET known_usd=cognition_lab.costs.known_usd+excluded.known_usd,unknown_count=cognition_lab.costs.unknown_count+excluded.unknown_count,uncertain_count=cognition_lab.costs.uncertain_count+excluded.uncertain_count',
        )
        .run(runId, knownDelta, unknownDelta, uncertainDelta);
    });
  }

  async costs(
    runId: string,
  ): Promise<{ knownUsd: number; unknownCount: number; uncertainCount: number }> {
    await this.ready;
    const row = await this.db
      .prepare(
        'SELECT known_usd,unknown_count,uncertain_count FROM cognition_lab.costs WHERE run_id=?',
      )
      .get(runId);
    return {
      knownUsd: Number(row?.['known_usd'] ?? 0),
      unknownCount: Number(row?.['unknown_count'] ?? 0),
      uncertainCount: Number(row?.['uncertain_count'] ?? 0),
    };
  }
  async runUsage(
    runId: string,
  ): Promise<{ usedBytes: number; reservedBytes: number; allowanceBytes: number } | undefined> {
    await this.ready;
    const row = await this.db
      .prepare(
        'SELECT used_bytes,reserved_bytes,allowance_bytes FROM cognition_lab.run_usage WHERE run_id=?',
      )
      .get(runId);
    return row
      ? {
          usedBytes: number(row, 'used_bytes'),
          reservedBytes: number(row, 'reserved_bytes'),
          allowanceBytes: number(row, 'allowance_bytes'),
        }
      : undefined;
  }
  async recipients(recordId: string): Promise<string[]> {
    await this.ready;
    return (
      await this.db
        .prepare(
          'SELECT actor_id FROM cognition_lab.recipients WHERE record_id=? ORDER BY actor_id',
        )
        .all(recordId)
    ).map((row) => String(row['actor_id']));
  }
  async attempt(runId: string, attemptId: string) {
    await this.ready;
    const run = await this.getHeader(runId, 'run');
    if (!run) throw new LabStorageError('missing', 'Captured run is unavailable.');
    const row = await this.db
      .prepare('SELECT payload FROM cognition_lab.attempts WHERE run_id=? AND attempt_id=?')
      .get(runId, attemptId);
    await this.guard?.({ record: run });
    return row ? jsonSchema.parse(JSON.parse(String(row['payload']))) : undefined;
  }
  async pageAttempts(
    runId: string,
    cursor?: string,
  ): Promise<
    LabPage<{ attemptId: string; receipt: LabJson; costUsd?: number; completionUncertain: boolean }>
  > {
    await this.ready;
    const run = await this.getHeader(runId, 'run');
    if (!run) throw new LabStorageError('missing', 'Captured run is unavailable.');
    const rows = await this.db
      .prepare(
        `SELECT attempt_id,payload,cost_usd,completion_uncertain FROM cognition_lab.attempts WHERE run_id=?${cursor ? ' AND attempt_id>?' : ''} ORDER BY attempt_id LIMIT ?`,
      )
      .all(runId, ...(cursor ? [cursor] : []), LAB_STORAGE_DEFAULTS.pageSize + 1);
    await this.guard?.({ record: run });
    const items = rows.slice(0, LAB_STORAGE_DEFAULTS.pageSize).map((row) => ({
      attemptId: String(row['attempt_id']),
      receipt: jsonSchema.parse(JSON.parse(String(row['payload']))),
      ...(row['cost_usd'] !== null ? { costUsd: Number(row['cost_usd']) } : {}),
      completionUncertain: !!row['completion_uncertain'],
    }));
    const last = items.at(-1);
    return {
      items,
      ...(rows.length > LAB_STORAGE_DEFAULTS.pageSize && last
        ? { nextCursor: last.attemptId }
        : {}),
    };
  }
  /** Metadata is published together only after bounded files/native packages were validated.
   * The source is local staged data, never a client/network iterator under the writer. */
  async publishImport(entries: AsyncIterable<LabImportEntry>): Promise<void> {
    await this.ready;
    await this.db.transaction(async () => {
      for await (const entry of entries) {
        if (entry.kind === 'record') {
          if (entry.record.kind === 'run' && !(await this.runUsage(entry.record.id)))
            await this.configureRun(
              entry.record.id,
              entry.runAllowanceBytes ?? LAB_STORAGE_DEFAULTS.runCaptureBytes,
            );
          const prior = await this.getRecord(entry.record.id);
          if (prior && encode(prior) !== encode(entry.record))
            throw new LabStorageError(
              'conflict',
              'Imported record identity conflicts with retained evidence.',
            );
          await this.putRecord(entry.record, {
            immutable: true,
            references: entry.links,
            recipientActorIds: entry.recipients,
          });
        } else if (entry.kind === 'evidence')
          await this.putEvidence(entry.stageId, entry.items, undefined, true);
        else {
          // An older exported unknown receipt must not replace a newer locally settled
          // native projection. Import copies evidence; native settlement remains owner.
          const prior = await this.db
            .prepare('SELECT run_id FROM cognition_lab.attempts WHERE attempt_id=?')
            .get(entry.attemptId);
          if (prior) {
            if (prior['run_id'] !== entry.runId)
              throw new LabStorageError(
                'conflict',
                'Native attempt already belongs to another run.',
              );
            continue;
          }
          await this.reconcileAttempt(
            entry.runId,
            entry.attemptId,
            entry.receipt,
            entry.costUsd,
            entry.completionUncertain,
          );
        }
      }
    });
  }
  async close(): Promise<void> {
    this.closed = true;
    await this.settle();
  }
  async settle(): Promise<void> {
    while (this.fileWrites.size || this.cleanupWrites.size)
      await Promise.allSettled([...this.fileWrites, ...this.cleanupWrites]);
  }
}
