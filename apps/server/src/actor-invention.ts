import { z } from 'zod';
import { installedRecipeFamilies } from '@open-legend/domain';
import { declarationSchema } from './ai-schemas.js';
import { inventionMaterials } from './invention-context.js';
import type { WorldService } from './world-service.js';
import type { GameRepository } from './store.js';

export async function readActorInventionHistory(
  store: Pick<GameRepository, 'inventionJobs'>,
  worldId: string,
  actorId: string,
  timelineId: string,
) {
  return (await store.inventionJobs(worldId, actorId, undefined, { timelineId, limit: 3 })).map(
    (job) => ({
      id: job.id,
      code: job.invention?.code,
      feedback: job.message,
      candidate: job.invention?.candidate ?? job.request.invention?.candidate,
      continuedBy: job.invention?.continuedBy,
    }),
  );
}

/** A lock still preserves the actor's real prior proposal results. It does not
 * turn that history into an empty fixture or offer unsupported invention. */
export function lockedActorInvention(
  policyRevision: number,
  history: Awaited<ReturnType<typeof readActorInventionHistory>>,
) {
  return {
    enabled: false as const,
    policyRevision,
    schema: z.null(),
    instructions: 'Invention is locked; use only ordinary response operations.',
    context: JSON.stringify({ privateInventionResults: history }),
  };
}

/** Private context is read only for this actor. A response proposes; the shared gateway admits.
 * docs/architecture.md#shared-invention-workflow
 */
export async function prepareActorInvention(service: WorldService, actorId: string) {
  const enabled = !service.world.inventionPolicy.agentLocked;
  const policyRevision = service.world.inventionPolicy.revision;
  const history = await readActorInventionHistory(
    service.store,
    service.world.id,
    actorId,
    service.timelineId,
  );
  if (!enabled) return lockedActorInvention(policyRevision, history);
  return {
    enabled,
    policyRevision,
    schema: z
      .object({
        purpose: z.string().trim().min(1).max(1000),
        candidateJson: z.string().trim().min(2).max(12000),
        parentId: z.string().min(1).max(180).nullable(),
      })
      .strict()
      .nullable(),
    instructions:
      'When you choose to design a supported technique, submit it through invention, not act.proposal (which interprets an unlisted physical action). Supply your complete method as candidateJson using the supplied version-2 envelope and one installed family’s declared roles and parameters. Never supply native item components or undeclared effects. It is checked without a second model rewriting it. Keep private goals and memories out of recipe names/descriptions. Invention grants knowledge, never construction or material consumption. You may defer or stop by setting invention null; do not repeat unchanged rejected or completed methods.',
    context: JSON.stringify({
      privateInventionResults: history,
      inventionFamilies: installedRecipeFamilies(service.world).map(
        ({ definition, parameterOptions }) => ({
          id: definition.id,
          version: definition.version,
          description: definition.description,
          inputs: definition.inputs,
          guidance: definition.guidance,
          parameterOptions: parameterOptions?.(service.world),
          // A complete autonomous method has no second generation call to discover
          // the selected schema. Supply its authored scalar constraints alongside
          // field meanings without repeating every family envelope.
          parameters: definition.editor.fields.flatMap((field) => {
            const key = field.path.startsWith('parameters.') ? field.path.slice(11) : '';
            const constraint = definition.parameterSchema.properties[key];
            return constraint
              ? [
                  {
                    ...field,
                    required: definition.parameterSchema.required.includes(key),
                    constraint,
                  },
                ]
              : [];
          }),
          limitation: definition.limitation,
        }),
      ),
      candidateSchema: declarationSchema,
      inventionMaterials: inventionMaterials(service.world, service.observe(actorId)!),
      continuation: 'Set parentId to an uncontinued result ID when revising; otherwise null.',
    }),
  };
}
