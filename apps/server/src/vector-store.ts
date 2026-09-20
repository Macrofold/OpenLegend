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

/** Derived embeddings stay in PostgreSQL. Only source IDs and top-match scores leave it. */
export class VectorStore {
  constructor(private db: SqlDatabase) {
    db.exec(`
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
    db.exec('BEGIN');
    try {
      db.exec(`
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
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  /** Remove revoked/stale sources and return metadata only for incremental indexing. */
  reconcile(scope: VectorScope, sources: VectorSource[]): Set<string> {
    this.db
      .prepare(
        `DELETE FROM recall_vectors v WHERE scope = ? AND (
      model <> ? OR dimensions <> ? OR NOT EXISTS (
        SELECT 1 FROM jsonb_to_recordset(?::jsonb) AS s(id text, revision text)
        WHERE s.id = v.source_id AND s.revision = v.revision
      ))`,
      )
      .run(scope.key, scope.model, scope.dimensions, JSON.stringify(sources));
    return new Set(
      this.db
        .prepare(
          'SELECT source_id FROM recall_vectors WHERE scope = ? AND model = ? AND dimensions = ?',
        )
        .all(scope.key, scope.model, scope.dimensions)
        .map((row) => String(row['source_id'])),
    );
  }

  put(scope: VectorScope, sources: (VectorSource & { vector: number[] })[]): void {
    for (const source of sources) this.validate(scope, source.vector);
    this.db
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
  search(scope: VectorScope, query: number[], sources: VectorSource[], limit: number) {
    this.validate(scope, query);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new Error('Vector search limit must be between 1 and 100.');
    return this.db
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
        JSON.stringify(sources),
        scope.key,
        scope.model,
        scope.dimensions,
        JSON.stringify(query),
        limit,
      )
      .map((row) => ({ id: String(row['source_id']), score: Number(row['score']) }));
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
