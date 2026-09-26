import type { SqlDatabase } from './store.js';

export interface VectorSource {
  id: string;
  revision: string;
}
export interface VectorScope {
  key: string;
  model: string;
  dimensions: number;
}

// Callers may include text or vectors; SQL scope joins need only identity/revision pins.
// docs/architecture.md#bounded-invention-history-and-recovery
function sourcePins(sources: VectorSource[]): string {
  return JSON.stringify(sources.map(({ id, revision }) => ({ id, revision })));
}

/** Derived embeddings stay in PostgreSQL. Only source IDs and top-match scores leave it. */
export class VectorStore {
  constructor(private db: SqlDatabase) {}
  async initialize() {
    await this.db.exec(`
      CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
      CREATE TABLE IF NOT EXISTS recall_vectors (
        scope TEXT NOT NULL, model TEXT NOT NULL, dimensions INTEGER NOT NULL,
        source_id TEXT NOT NULL, revision TEXT NOT NULL, embedding public.vector NOT NULL,
        PRIMARY KEY (scope, model, dimensions, source_id),
        CHECK (public.vector_dims(embedding) = dimensions)
      );
    `);
    // Convert the previous JSON caches inside the database, without reading vectors
    // into Node or paying to embed them again. Preserve the small query caches.
    await this.db.transaction(async () => {
      await this.db.exec(`
        INSERT INTO recall_vectors (scope, model, dimensions, source_id, revision, embedding)
        SELECT substring(m.key FROM 13), m.value::jsonb->>'model',
          (m.value::jsonb->>'dimensions')::integer, e.key, e.value->>'revision',
          (e.value->'vector')::text::public.vector
        FROM meta m CROSS JOIN LATERAL jsonb_each(m.value::jsonb->'entries') e
        WHERE m.key LIKE 'integration:vectors:%'
        ON CONFLICT DO NOTHING;
        UPDATE meta SET value = (value::jsonb - 'entries')::text
        WHERE key LIKE 'integration:vectors:%' AND value::jsonb->'entries' IS NOT NULL;
      `);
    });
  }

  /** Return current rows within this decision's allowed source set. Candidate windows
   * never evict durable vectors; explicit game mutations own invalidation.
   */
  async reconcile(scope: VectorScope, sources: VectorSource[]): Promise<Set<string>> {
    return new Set(
      (
        await this.db
          .prepare(
            `SELECT v.source_id FROM recall_vectors v
             JOIN jsonb_to_recordset(?::jsonb) AS s(id text, revision text)
               ON s.id = v.source_id AND s.revision = v.revision
             WHERE v.scope = ? AND v.model = ? AND v.dimensions = ?`,
          )
          .all(sourcePins(sources), scope.key, scope.model, scope.dimensions)
      ).map((row) => String(row['source_id'])),
    );
  }

  /** Forgetting, correction and creator edits are authoritative invalidation events. */
  async invalidate(scope: string, sourceIds: string[]): Promise<void> {
    if (!sourceIds.length) return;
    await this.db
      .prepare(
        `DELETE FROM recall_vectors
         WHERE scope = ? AND source_id IN (SELECT value FROM jsonb_array_elements_text(?::jsonb))`,
      )
      .run(scope, JSON.stringify([...new Set(sourceIds)]));
  }

  async put(scope: VectorScope, sources: (VectorSource & { vector: number[] })[]): Promise<void> {
    for (const source of sources) this.validate(scope, source.vector);
    await this.db
      .prepare(
        `INSERT INTO recall_vectors (scope, model, dimensions, source_id, revision, embedding)
      SELECT ?, ?, ?, s.id, s.revision, s.vector::text::public.vector
      FROM jsonb_to_recordset(?::jsonb) AS s(id text, revision text, vector jsonb)
      ON CONFLICT (scope, model, dimensions, source_id)
      DO UPDATE SET revision = excluded.revision, embedding = excluded.embedding
    `,
      )
      .run(scope.key, scope.model, scope.dimensions, JSON.stringify(sources));
  }

  /** Filter permission/revision scope BEFORE exact top-N ranking; never return vectors.
   * Exact search avoids approximate-index post-filtering losing an actor's matches.
   */
  async search(scope: VectorScope, query: number[], sources: VectorSource[], limit: number) {
    this.validate(scope, query);
    if (!Number.isSafeInteger(limit) || limit < 1)
      throw new Error('Vector search limit must be a positive integer.');
    return (
      await this.db
        .prepare(
          `
      SELECT v.source_id, 1 - (v.embedding OPERATOR(public.<=>) ?::public.vector) AS score
      FROM recall_vectors v
      JOIN jsonb_to_recordset(?::jsonb) AS s(id text, revision text)
        ON s.id = v.source_id AND s.revision = v.revision
      WHERE v.scope = ? AND v.model = ? AND v.dimensions = ?
      ORDER BY v.embedding OPERATOR(public.<=>) ?::public.vector, v.source_id
      LIMIT ?
    `,
        )
        .all(
          JSON.stringify(query),
          sourcePins(sources),
          scope.key,
          scope.model,
          scope.dimensions,
          JSON.stringify(query),
          limit,
        )
    ).map((row) => ({ id: String(row['source_id']), score: Number(row['score']) }));
  }

  private validate(scope: VectorScope, vector: number[]): void {
    if (
      vector.length !== scope.dimensions ||
      !vector.every(Number.isFinite) ||
      !vector.some((value) => value !== 0)
    )
      throw new Error('Embedding must be finite, nonzero and match configured dimensions.');
  }
}
