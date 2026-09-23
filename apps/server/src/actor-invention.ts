import { z } from 'zod';
import { DECLARATION_CONTRACT } from '@open-legend/domain';
import { declarationSchema } from './ai-schemas.js';
import { buildContext } from './context.js';
import type { WorldService } from './world-service.js';

/** Private context is read only for this actor. A response proposes; the shared gateway admits.
 * docs/architecture.md#shared-invention-workflow
 */
export async function prepareActorInvention(service: WorldService, actorId: string) {
  const enabled = !service.world.inventionPolicy.agentLocked;
  const policyRevision = service.world.inventionPolicy.revision;
  const history = (
    await service.store.inventionJobs(service.world.id, actorId, undefined, {
      timelineId: service.timelineId,
      limit: 3,
    })
  ).map((job) => ({
    id: job.id,
    code: job.invention?.code,
    feedback: job.message,
    candidate: job.invention?.candidate ?? job.request.invention?.candidate,
    continuedBy: job.invention?.continuedBy,
  }));
  return {
    enabled,
    policyRevision,
    schema: enabled
      ? z
          .object({
            purpose: z.string().trim().min(1).max(1000),
            candidateJson: z.string().trim().min(2).max(12000),
            parentId: z.string().min(1).max(180).nullable(),
          })
          .strict()
          .nullable()
      : z.null(),
    instructions: enabled
      ? 'When you choose to design a supported technique, submit it through invention, not act.proposal (which interprets an unlisted physical action). Supply your complete method as candidateJson using the supplied declaration schema; omit unused nullable components. It is checked without a second model rewriting it. Keep private goals and memories out of recipe names/descriptions. Invention grants knowledge, never construction or material consumption. You may defer or stop by setting invention null; do not repeat unchanged rejected or completed methods.'
      : 'Invention is locked; use only ordinary response operations.',
    context: JSON.stringify({
      privateInventionResults: history,
      ...(enabled
        ? {
            inventionContract: DECLARATION_CONTRACT,
            candidateSchema: declarationSchema,
            inventionMaterials: buildContext(service, actorId, '').materials,
            continuation: 'Set parentId to an uncontinued result ID when revising; otherwise null.',
          }
        : {}),
    }),
  };
}
