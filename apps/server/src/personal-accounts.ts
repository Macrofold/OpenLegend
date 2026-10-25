import { createHash } from 'node:crypto';
import type { Awareness, EventEvidence } from '@open-legend/domain';
import type { StorySource } from './history.js';

export const personalAccountRevision = (payload: string) =>
  createHash('sha256').update(payload).digest('hex');

export function personalEventEvidence(awareness: EventEvidence): EventEvidence {
  const {
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
  } = awareness;
  return {
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
  };
}

interface AccountReference {
  kind: 'awareness' | 'perspective';
  revision: string;
}
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
  ) account LIMIT 1)`;
}

export function decodeStoryAccount(payload: string, body: unknown): StorySource {
  const stored = JSON.parse(payload) as StoredStorySource;
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
) {
  const source = JSON.parse(payload) as StoredStorySource;
  const account = source.account;
  return decodeStoryAccount(
    payload,
    account &&
      accounts.get(personalAccountKey(world, actor, account.kind, source.id, account.revision)),
  );
}
