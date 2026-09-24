import type { WorldState } from '@open-legend/domain';
import type { SqlDatabase } from './store.js';

/** Query rows are a transactional projection of committed state, never another writable mind.
 * docs/knowledge.md#persistence-and-evolution
 */
export class KnowledgeStore {
  constructor(private db: SqlDatabase) {}
  async initialize() {
    await this.db.exec(`CREATE TABLE IF NOT EXISTS knowledge_documents (
      world_id TEXT NOT NULL, actor_id TEXT NOT NULL, document_id TEXT NOT NULL,
      subject_id TEXT, revision BIGINT NOT NULL, payload TEXT NOT NULL,
      PRIMARY KEY(world_id, actor_id, document_id)
    ); CREATE INDEX IF NOT EXISTS knowledge_subject ON knowledge_documents(world_id, actor_id, subject_id);`);
  }
  async project(before: WorldState | undefined, after: WorldState, restore = false) {
    if (restore)
      await this.db.prepare('DELETE FROM knowledge_documents WHERE world_id=?').run(after.id);
    const old = restore ? undefined : before?.actorKnowledge;
    if (old === after.actorKnowledge) return;
    const actors = new Set([...Object.keys(old ?? {}), ...Object.keys(after.actorKnowledge ?? {})]);
    for (const actorId of actors) {
      const prior = old?.[actorId];
      const next = after.actorKnowledge?.[actorId];
      if (prior === next) continue;
      for (const id of Object.keys(prior ?? {}))
        if (!next?.[id])
          await this.db
            .prepare(
              'DELETE FROM knowledge_documents WHERE world_id=? AND actor_id=? AND document_id=?',
            )
            .run(after.id, actorId, id);
      for (const [id, doc] of Object.entries(next ?? {})) {
        if (prior?.[id] === doc) continue;
        await this.db
          .prepare(
            `INSERT INTO knowledge_documents VALUES (?,?,?,?,?,?)
          ON CONFLICT(world_id,actor_id,document_id) DO UPDATE SET subject_id=excluded.subject_id,revision=excluded.revision,payload=excluded.payload`,
          )
          .run(after.id, actorId, id, doc.subjectId, doc.revision, JSON.stringify(doc));
      }
    }
  }
  async verify(world: WorldState) {
    const rows = await this.db
      .prepare('SELECT actor_id,document_id,payload FROM knowledge_documents WHERE world_id=?')
      .all(world.id);
    const expected = new Map(
      Object.entries(world.actorKnowledge ?? {}).flatMap(([actor, docs]) =>
        Object.entries(docs).map(([id, doc]) => [`${actor}\0${id}`, JSON.stringify(doc)] as const),
      ),
    );
    if (
      rows.length !== expected.size ||
      rows.some(
        (row) => expected.get(`${row['actor_id']}\0${row['document_id']}`) !== row['payload'],
      )
    )
      throw new Error(
        'Accepted knowledge rows disagree with their world commit; reconcile before starting.',
      );
  }
}
