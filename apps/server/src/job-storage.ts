import type { JobRecord } from './store.js';
import { sqlTextKey } from './sql-rows.js';

/** Encode SQL keys and display text without exposing isolated UTF-16 units to
 * PostgreSQL's JSON decoder. */
const storedText = (value: string | undefined) =>
  typeof value === 'string' ? sqlTextKey(value) : undefined;

/** Rebuildable job routing and display fields. The canonical request remains TEXT. */
export function jobSelection(job: JobRecord): string {
  const invention = job.request.invention,
    decision = job.decision,
    owner = job.authority;
  return JSON.stringify({
    kind: job.kind,
    status: job.status,
    completedAt: job.completedAt,
    playerSpeechEventId: storedText(job.playerSpeechEventId),
    npcId: job.kind === 'thought' ? storedText(job.request.npcId) : undefined,
    displayOwner: owner
      ? { accountId: storedText(owner.accountId), actorId: storedText(owner.actorId) }
      : null,
    // The actual private content of a thought is never part of the status display.
    displayMessage: job.kind === 'thought' ? undefined : storedText(job.message),
    queueLatencyMs: job.queueLatencyMs,
    totalLatencyMs: job.totalLatencyMs,
    request: invention
      ? {
          invention: {
            worldId: storedText(invention.worldId),
            actorId: storedText(invention.actorId),
            timelineId: storedText(invention.timelineId),
          },
        }
      : undefined,
    decision: decision
      ? {
          worldId: storedText(decision.worldId),
          actorId: storedText(decision.actorId),
          timelineId: storedText(decision.timelineId),
          phase: decision.phase,
          higher: decision.higher ? { state: decision.higher.state } : undefined,
        }
      : undefined,
  });
}

/** Completion is the final member of this current storage factory. Encode the
 * remaining body once so an atomic upsert can preserve an older completedAt
 * without parsing or sending another copy of arbitrary quoted data. Whole-job
 * member order has no fingerprint consumer; nested request order stays intact. */
export function jobPayloadPrefix(job: JobRecord): string {
  const { completedAt: _completedAt, ...body } = job;
  return JSON.stringify(body).slice(0, -1);
}

// Identity admission and completed-work protection remain one statement. Only
// the finite projection is parsed by PostgreSQL; the canonical body stays TEXT.
export const JOB_UPSERT_SQL = `WITH incoming AS (
  SELECT ?::text AS id,?::text AS fingerprint,?::text AS prefix,?::jsonb AS selection,?::bigint AS created_at
), encoded AS (
  SELECT id,fingerprint,prefix || CASE WHEN selection->'completedAt' IS NOT NULL
    THEN ',"completedAt":' || (selection->'completedAt')::text ELSE '' END || '}' AS payload,
    selection,created_at FROM incoming
)
INSERT INTO jobs(id,fingerprint,payload,selection,created_at)
SELECT id,fingerprint,payload,selection,created_at FROM encoded
ON CONFLICT(id) DO UPDATE SET
  payload=CASE
    WHEN jobs.selection->>'status'='completed' AND excluded.selection->>'status'<>'completed' THEN jobs.payload
    WHEN jobs.selection->>'status'='completed' AND jobs.selection->'completedAt' IS NOT NULL
      THEN (SELECT prefix FROM incoming) || ',"completedAt":' || (jobs.selection->'completedAt')::text || '}'
    ELSE excluded.payload END,
  selection=CASE
    WHEN jobs.selection->>'status'='completed' AND excluded.selection->>'status'<>'completed' THEN jobs.selection
    ELSE excluded.selection || CASE
      WHEN jobs.selection->>'status'='completed' AND jobs.selection->'completedAt' IS NOT NULL
        THEN jsonb_build_object('completedAt',jobs.selection->'completedAt')
      ELSE '{}'::jsonb END END
WHERE jobs.fingerprint=excluded.fingerprint RETURNING fingerprint`;
