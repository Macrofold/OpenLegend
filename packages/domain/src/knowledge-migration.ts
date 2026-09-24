import type { WorldState } from './types.js';
import { BASE_KNOWLEDGE_POLICY } from './worlds/base/knowledge.js';
import { characterCount, validateKnowledge } from './knowledge.js';

/** Preserve accepted prose without model rewriting, duplicate authorities or a world reset.
 * docs/knowledge.md#persistence-and-evolution
 */
export function migrateKnowledge(world: WorldState): void {
  world.knowledgePolicy ??= structuredClone(BASE_KNOWLEDGE_POLICY);
  world.actorKnowledge ??= {};
  world.observerIdentities ??= {};
  for (const [actorId, inner] of Object.entries(world.innerWorlds ?? {})) {
    if (Object.hasOwn(world.actorKnowledge, actorId)) continue;
    const mind = world.minds?.[actorId];
    const protectedPaths = new Set(mind?.documents.filter(d => d.protected).map(d => `${d.id}.md`) ?? ['identity.md']);
    const moved = inner.files.filter(f => !protectedPaths.has(f.path));
    const text = moved.map(f => `# ${f.path}\n${f.text}`).join('\n\n');
    if (characterCount(text) > world.knowledgePolicy.maxCharacters.general)
      throw new Error(`Knowledge migration for ${actorId} needs an owner-reviewed rewrite: ${characterCount(text)} characters exceed the general notepad limit. Stored state was not discarded.`);
    world.actorKnowledge[actorId] = text ? { general: { subjectId: null, text, revision: 1, evidenceIds: [...inner.evidenceIds] } } : {};
    if (!moved.length) continue;
    inner.files = inner.files.filter(f => protectedPaths.has(f.path));
    inner.text = inner.files.map(f => `# ${f.path}\n${f.text}`).join('\n\n');
    inner.revision++;
    if (mind) {
      mind.documents = mind.documents.filter(d => d.protected);
      mind.records = mind.records.filter(r => mind.documents.some(d => d.id === r.documentId));
      mind.revision = inner.revision;
    }
  }
  validateKnowledge(world);
}
