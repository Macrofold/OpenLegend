import type { SqlDatabase } from './store.js';
import { searchWords } from './text-search.js';
import { countMetric, gaugeMetric, recordBackgroundFailure } from './performance.js';

const BATCH_ROWS = 128;
const BATCH_BYTES = 512 * 1024;
const PENDING_ROWS = 65536;
const PENDING_BYTES = 8 * 1024 * 1024;
const READ_WAIT_MS = 5000;
const BACKGROUND_DELAY_MS = 1000;
const lexeme = (word: string) => `'${word.replace(/['\\]/g, '\\$&')}'`;

function lexicalVector(text: string): string {
  const words = new Map<string, number[]>();
  let position = 0;
  for (const word of searchWords(text)) {
    if (Buffer.byteLength(word) >= 2047) continue;
    position = Math.min(position + 1, 16383);
    const positions = words.get(word) ?? [];
    if (positions.length < 255 && positions.at(-1) !== position) positions.push(position);
    words.set(word, positions);
  }
  return [...words].map(([word, positions]) => `${lexeme(word)}:${positions.join(',')}`).join(' ');
}

export class LexicalPreparationError extends Error {
  override readonly name = 'LexicalPreparationError';
  constructor() {
    super(
      'Memory search preparation is temporarily unavailable. Exact evidence remains saved; retry the search.',
    );
  }
}

/** Durable derived work shares the existing database writer, never world mutation
 * authority. A source reference cannot publish into a different revision/generation. */
export class LexicalProjection {
  private active?: Promise<void>;
  private scheduled?: ReturnType<typeof setTimeout>;
  private closed = false;
  private failed = false;
  private pendingKnown = true;
  private required = false;
  private backgroundAllowed = () => true;
  private derivedAdmission: (worldId: string, actors: Iterable<string>) => Promise<void> =
    async () => {};
  constructor(private readonly db: SqlDatabase) {}
  setDerivedAdmission(
    callback: (worldId: string, actors: Iterable<string>) => Promise<void>,
  ): void {
    this.derivedAdmission = callback;
  }

  setBackgroundAdmission(allowed: () => boolean): void {
    this.backgroundAllowed = allowed;
  }

  async initialize() {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_lexical_documents (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,id TEXT NOT NULL,source_kind TEXT NOT NULL,
        source_revision TEXT NOT NULL,search_vector tsvector NOT NULL,
        PRIMARY KEY(world_id,actor_id,id,source_kind));
      CREATE INDEX IF NOT EXISTS memory_lexical_vector ON memory_lexical_documents USING GIN(search_vector);
      CREATE TABLE IF NOT EXISTS memory_lexical_pending (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,id TEXT NOT NULL,source_kind TEXT NOT NULL,
        source_revision TEXT NOT NULL,generation TEXT NOT NULL,world_revision BIGINT NOT NULL,
        removing BOOLEAN NOT NULL,bytes BIGINT NOT NULL,
        PRIMARY KEY(world_id,actor_id,id,source_kind));
      CREATE INDEX IF NOT EXISTS memory_lexical_due ON memory_lexical_pending(world_id,world_revision,actor_id,id,source_kind);
      CREATE TABLE IF NOT EXISTS memory_lexical_progress (
        world_id TEXT PRIMARY KEY,generation TEXT NOT NULL,covered_revision BIGINT NOT NULL,
        pending_rows BIGINT NOT NULL,pending_bytes BIGINT NOT NULL);
    `);
  }

  /** Append after the caller's `WITH changed AS (... RETURNING exact source fields)`.
   * Metering deliberately overcounts replaced keys until drain, conservatively bounding
   * debt without another round trip or a growing COUNT scan on every world save.
   * Revoke this revision's coverage: saturation may have drained an earlier source
   * batch in the same canonical transaction before this later batch is appended. */
  enqueueSql(source: string, removing: boolean): string {
    const revision = this.db.projectionRevision ?? 'h.revision';
    return `, queued AS (
      INSERT INTO memory_lexical_pending
      SELECT s.world_id,s.actor_id,s.id,s.source_kind,s.revision,h.generation,${revision},${removing},
        octet_length(s.world_id)+octet_length(s.actor_id)+octet_length(s.id)+octet_length(s.source_kind)+octet_length(s.revision)+octet_length(h.generation)+512
      FROM ${source} s JOIN world_head h ON h.world_id=s.world_id
      ON CONFLICT(world_id,actor_id,id,source_kind) DO UPDATE SET
        source_revision=excluded.source_revision,generation=excluded.generation,world_revision=excluded.world_revision,
        removing=excluded.removing,bytes=excluded.bytes RETURNING world_id,generation,world_revision,bytes
    ) INSERT INTO memory_lexical_progress
      SELECT world_id,generation,min(world_revision)-1,count(*),sum(bytes) FROM queued GROUP BY world_id,generation
      ON CONFLICT(world_id) DO UPDATE SET
        covered_revision=least(memory_lexical_progress.covered_revision,excluded.covered_revision),
        pending_rows=memory_lexical_progress.pending_rows+excluded.pending_rows,
        pending_bytes=memory_lexical_progress.pending_bytes+excluded.pending_bytes
      RETURNING pending_rows,pending_bytes`;
  }

  async admit(progress: Record<string, unknown> | undefined) {
    if (progress && Number(progress['pending_rows']) > 0) {
      this.pendingKnown = true;
      gaugeMetric('memory.lexicalPendingRows', Number(progress['pending_rows']));
      gaugeMetric('memory.lexicalPendingBytes', Number(progress['pending_bytes']));
    }
    while (
      progress &&
      (Number(progress['pending_rows']) > PENDING_ROWS ||
        Number(progress['pending_bytes']) > PENDING_BYTES)
    ) {
      await this.batch();
      progress = await this.db
        .prepare(
          'SELECT pending_rows,pending_bytes FROM memory_lexical_progress WHERE world_id=(SELECT world_id FROM world_head WHERE id=1)',
        )
        .get();
    }
  }

  /** A different owned application session committed source work. This wakes
   * optional preparation without promoting it to a required foreground read. */
  sourcesCommitted(): void {
    this.pendingKnown = true;
    this.committed();
  }

  committed(force = false) {
    if (force) {
      this.required = true;
      this.pendingKnown = true;
      this.cancelScheduled();
    }
    if (this.closed || this.active || !this.pendingKnown) return;
    if (!force) {
      // Coalesce from the first notification, without extending the delay on each
      // subsequent commit. A read requiring this projection bypasses the timer.
      this.scheduled ??= setTimeout(() => {
        this.scheduled = undefined;
        if (this.pendingKnown) this.startDrain();
      }, BACKGROUND_DELAY_MS);
      this.scheduled.unref();
      return;
    }
    this.startDrain();
  }

  private startDrain() {
    if (this.closed || this.active || !this.pendingKnown) return;
    this.failed = false;
    let transactionEntered = false;
    const operation = new Promise<void>((resolve) => setImmediate(resolve)).then(async () => {
      let more = true;
      while (more && !this.closed) {
        transactionEntered = false;
        if (!this.required && !this.backgroundAllowed()) return;
        more = await this.db.transaction(async () => {
          transactionEntered = true;
          // The journal fence has settled and the primary writer is now held.
          // A save or command may have arrived while that fence was awaited.
          if (!this.required && !this.backgroundAllowed()) return false;
          return this.batch();
        });
      }
    });
    this.active = operation
      .catch((error: unknown) => {
        this.failed = true;
        countMetric('memory.lexicalFailures');
        recordBackgroundFailure('memory-search', error, { transactionEntered });
      })
      .finally(() => {
        this.active = undefined;
        this.required = false;
        // A source commit can enqueue just after the last batch's empty check but
        // before this promise releases ownership. Its kick must not be lost.
        if (this.pendingKnown && !this.closed && !this.failed) this.committed();
      });
  }

  async close() {
    this.closed = true;
    this.cancelScheduled();
    await this.active;
  }

  restored() {
    this.cancelScheduled();
    this.pendingKnown = true;
  }

  private cancelScheduled() {
    if (this.scheduled) clearTimeout(this.scheduled);
    this.scheduled = undefined;
  }

  private async covered(scope: { worldId: string; generation: string }): Promise<boolean> {
    const row = await this.db
      .prepare(
        `SELECT h.generation,p.covered_revision IS NOT NULL AND
        (p.covered_revision>=h.revision OR NOT EXISTS (
          SELECT 1 FROM memory_lexical_pending q WHERE q.world_id=h.world_id AND q.generation=h.generation
        )) AS ready
      FROM world_head h LEFT JOIN memory_lexical_progress p ON p.world_id=h.world_id AND p.generation=h.generation
      WHERE h.world_id=?`,
      )
      .get(scope.worldId);
    if (!row || row['generation'] !== scope.generation) throw new LexicalPreparationError();
    // A clock-only commit advances the world head without changing searchable
    // sources. Source writes and pending keys commit atomically, so an empty
    // same-generation queue proves readiness in this snapshot without a writer.
    return row['ready'] === true;
  }

  /** Never wait for the writer while retaining an older read snapshot. A caller that
   * supplied its own snapshot must prepare first or receive truthful unavailability. */
  async snapshot<T>(
    scope: { worldId: string; generation: string },
    operation: () => Promise<T>,
  ): Promise<T> {
    if (this.db.transactionActive) {
      if (!(await this.covered(scope))) throw new LexicalPreparationError();
      return operation();
    }
    const deadline = Date.now() + READ_WAIT_MS;
    for (;;) {
      if (this.closed || Date.now() >= deadline) throw new LexicalPreparationError();
      const snapshot = this.db.readTransaction?.bind(this.db) ?? this.db.transaction.bind(this.db);
      const result = await snapshot(
        async (): Promise<{ ready: false } | { ready: true; value: T }> =>
          (await this.covered(scope))
            ? { ready: true, value: await operation() }
            : { ready: false },
      );
      if (result.ready) return result.value;
      // Release the old read snapshot before asking the writer to catch up.
      this.committed(true);
      const active = this.active;
      if (this.closed || !active) throw new LexicalPreparationError();
      const remaining = deadline - Date.now();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          active,
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new LexicalPreparationError()), Math.max(0, remaining));
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
      if (this.failed || this.closed) throw new LexicalPreparationError();
    }
  }

  private async batch(): Promise<boolean> {
    const rows = await this.db
      .prepare(
        `WITH head AS MATERIALIZED (
          SELECT h.world_id,h.generation,h.revision,p.generation AS projection_generation
          FROM world_head h LEFT JOIN memory_lexical_progress p ON p.world_id=h.world_id WHERE h.id=1
        ), candidates AS MATERIALIZED (
          SELECT q.* FROM head h JOIN memory_lexical_pending q
            ON q.world_id=h.world_id AND q.generation=h.generation
          WHERE h.projection_generation=h.generation
          ORDER BY q.world_revision,q.actor_id,q.id,q.source_kind LIMIT ${BATCH_ROWS}
        ), sized AS (
          SELECT q.*,row_number() OVER batch AS ordinal,
            sum(coalesce(octet_length(r.search_text),0)) OVER batch AS source_bytes
          FROM candidates q LEFT JOIN recall_sources r ON r.world_id=q.world_id AND r.actor_id=q.actor_id
            AND r.id=q.id AND r.source_kind=q.source_kind AND r.revision=q.source_revision
          WINDOW batch AS (ORDER BY q.world_revision,q.actor_id,q.id,q.source_kind ROWS UNBOUNDED PRECEDING)
        ) SELECT h.*,q.actor_id,q.id,q.source_kind,q.source_revision,q.world_revision,q.removing,r.search_text
          FROM head h LEFT JOIN sized q ON q.ordinal=1 OR q.source_bytes<=${BATCH_BYTES}
          LEFT JOIN recall_sources r ON r.world_id=q.world_id AND r.actor_id=q.actor_id
            AND r.id=q.id AND r.source_kind=q.source_kind AND r.revision=q.source_revision
          ORDER BY q.world_revision,q.actor_id,q.id,q.source_kind`,
      )
      .all();
    const head = rows[0];
    if (!head) {
      // Startup can precede the first world commit. There is no work to own yet;
      // the first source commit will publish its normal scheduling notification.
      this.pendingKnown = false;
      return false;
    }
    const world = String(head['world_id']),
      generation = String(head['generation']);
    if (head['projection_generation'] !== generation) {
      // Unchanged exact source versions may safely survive a gameplay restore. Only
      // rebind pending work whose source still exists; obsolete work cannot publish.
      await this.db
        .prepare(
          `UPDATE memory_lexical_pending q SET generation=?,world_revision=? FROM recall_sources r
        WHERE q.world_id=? AND q.generation<>? AND r.world_id=q.world_id AND r.actor_id=q.actor_id
        AND r.id=q.id AND r.source_kind=q.source_kind AND r.revision=q.source_revision AND NOT q.removing`,
        )
        .run(generation, head['revision'], world, generation);
      await this.db
        .prepare('DELETE FROM memory_lexical_pending WHERE world_id=? AND generation<>?')
        .run(world, generation);
      await this.db
        .prepare(
          `DELETE FROM memory_lexical_documents d WHERE d.world_id=?
        AND NOT EXISTS(SELECT 1 FROM recall_sources r WHERE r.world_id=d.world_id AND r.actor_id=d.actor_id
          AND r.id=d.id AND r.source_kind=d.source_kind AND r.revision=d.source_revision)`,
        )
        .run(world);
      await this.db
        .prepare(
          `INSERT INTO memory_lexical_progress
        SELECT ?,?,0,count(*),coalesce(sum(bytes),0) FROM memory_lexical_pending WHERE world_id=?
        ON CONFLICT(world_id) DO UPDATE SET generation=excluded.generation,covered_revision=0,
        pending_rows=excluded.pending_rows,pending_bytes=excluded.pending_bytes`,
        )
        .run(world, generation, world);
      return this.batch();
    }
    const selected = rows.filter((row) => row['id'] !== null);
    // Size the bounded key prefix in SQL before transferring bodies. One already
    // admitted oversized source is still processed alone, rather than stranded.
    const claims = selected.map((row) => ({
      actor: row['actor_id'],
      id: row['id'],
      kind: row['source_kind'],
      revision: row['source_revision'],
      worldRevision: Number(row['world_revision']),
    }));
    if (selected.length) {
      countMetric('memory.lexicalSources', selected.length);
      countMetric('memory.lexicalBatches');
      const values = selected.map((row, index) => ({
        ...claims[index],
        vector:
          typeof row['search_text'] === 'string' && !row['removing']
            ? lexicalVector(row['search_text'])
            : null,
      }));
      await this.db
        .prepare(
          `INSERT INTO memory_lexical_documents
        SELECT r.world_id,r.actor_id,r.id,r.source_kind,r.revision,s.vector::tsvector
        FROM jsonb_to_recordset(?::jsonb) AS s(actor text,id text,kind text,revision text,vector text)
        JOIN recall_sources r ON r.actor_id=s.actor AND r.id=s.id AND r.source_kind=s.kind AND r.revision=s.revision
        WHERE r.world_id=? AND s.vector IS NOT NULL AND (SELECT generation FROM world_head WHERE id=1)=?
        ON CONFLICT(world_id,actor_id,id,source_kind) DO UPDATE SET source_revision=excluded.source_revision,search_vector=excluded.search_vector`,
        )
        .run(JSON.stringify(values), world, generation);
    }
    const completed = await this.db
      .prepare(
        `WITH claimed AS MATERIALIZED (
          SELECT * FROM jsonb_to_recordset(?::jsonb) AS s(actor text,id text,kind text,revision text,"worldRevision" bigint)
        ), removed_documents AS (
          DELETE FROM memory_lexical_documents d USING claimed s WHERE d.world_id=? AND d.actor_id=s.actor AND d.id=s.id AND d.source_kind=s.kind
          AND NOT EXISTS(SELECT 1 FROM recall_sources r WHERE r.world_id=d.world_id AND r.actor_id=d.actor_id AND r.id=d.id AND r.source_kind=d.source_kind)
        ), completed AS (
          DELETE FROM memory_lexical_pending q USING claimed s WHERE q.world_id=? AND q.generation=? AND q.actor_id=s.actor AND q.id=s.id
            AND q.source_kind=s.kind AND q.source_revision=s.revision AND q.world_revision=s."worldRevision"
          RETURNING q.actor_id,q.id,q.source_kind,q.bytes
        ), unresolved AS MATERIALIZED (
          SELECT 1 FROM memory_lexical_pending q WHERE q.world_id=? AND q.generation=?
          AND NOT EXISTS (SELECT 1 FROM completed c WHERE c.actor_id=q.actor_id AND c.id=q.id AND c.source_kind=q.source_kind) LIMIT 1
        ) UPDATE memory_lexical_progress SET
          covered_revision=CASE WHEN NOT EXISTS(SELECT 1 FROM unresolved) THEN ? ELSE covered_revision END,
          pending_rows=CASE WHEN NOT EXISTS(SELECT 1 FROM unresolved) THEN 0 ELSE greatest(0,pending_rows-(SELECT count(*) FROM completed)) END,
          pending_bytes=CASE WHEN NOT EXISTS(SELECT 1 FROM unresolved) THEN 0 ELSE greatest(0,pending_bytes-coalesce((SELECT sum(bytes) FROM completed),0)) END
          WHERE world_id=? AND generation=? RETURNING NOT EXISTS(SELECT 1 FROM unresolved) AS ready`,
      )
      .get(
        JSON.stringify(claims),
        world,
        world,
        generation,
        world,
        generation,
        head['revision'],
        world,
        generation,
      );
    // Data-modifying CTEs share the statement's original snapshot. Coverage must
    // explicitly subtract the exact completed keys, not rescan as if DELETE were visible.
    if (!completed) throw new Error('Search preparation lost its current progress owner.');
    await this.derivedAdmission(world, new Set(selected.map((row) => String(row['actor_id']))));
    this.pendingKnown = completed['ready'] !== true;
    return this.pendingKnown;
  }
}
