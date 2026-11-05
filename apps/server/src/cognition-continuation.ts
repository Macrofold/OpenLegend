import { z } from 'zod';
import { entityGet, heardAddressedSpeech } from '@open-legend/domain';
import type { WorldService } from './world-service.js';
import type { RequestScope } from './authority.js';
import type { CognitionStageInput } from './cognition-runtime-control.js';
import { digest } from './content-digest.js';

const gatePurpose = z.string().regex(/^attempt:0:(attention:\d+|route|action-attention|generate)$/);
/** Only ordinary pure decision gates are reconstructible. Tool-bearing work and
 * gates after committed prerequisite effects deliberately have no descriptor. */
export const continuationSchema = z
  .object({
    kind: z.literal('chatDecision'),
    worldId: z.string(),
    actorId: z.string(),
    request: z
      .object({ text: z.string(), npcId: z.string(), volume: z.string().optional() })
      .strict(),
    sourceId: z.string(),
    purpose: gatePurpose,
    proof: z.string(),
    stageId: z.string().uuid(),
    inputArtifactId: z.string().uuid(),
    prerequisites: z.array(
      z
        .object({
          purpose: gatePurpose,
          stageId: z.string().uuid(),
          inputArtifactId: z.string().uuid(),
          outputArtifactId: z.string().uuid(),
        })
        .strict(),
    ),
  })
  .strict();
export type CognitionContinuationDescriptor = z.infer<typeof continuationSchema>;
export interface ReconstitutedDecision {
  descriptor: CognitionContinuationDescriptor;
  input: CognitionStageInput;
  prerequisites: Array<{
    purpose: string;
    input: CognitionStageInput;
    value: unknown;
    stageId: string;
  }>;
}

/** A proof of native source/body/installed definition bindings, independent of a
 * process-local generation, callback or publication claim. Read through disclosure owners. */
export async function continuationProof(
  service: WorldService,
  actorId: string,
  sourceId: string,
  scope: RequestScope,
): Promise<string> {
  service.assertScope(scope, 'create');
  if (!service.mayInspectPrivate(actorId, scope))
    throw new Error('This character cannot be inspected.');
  const source = await service.worldEventJson(sourceId, scope);
  const evidence = await service.awarenessEvidence(actorId, [sourceId]);
  if (
    !source.ok ||
    !evidence.some((entry) => entry.eventId === sourceId && heardAddressedSpeech(entry))
  )
    throw new Error('The original heard directed speech evidence is unavailable.');
  return digest({
    worldId: service.world.id,
    actor: entityGet(service.world.entities, actorId),
    manifest: service.world.moduleManifest,
    policy: service.world.cognitionPolicy,
    source: source.hash,
    evidence,
    forgotten: service.world.experience?.forgotten[actorId] ?? [],
    corrections: service.world.experience?.corrections?.[actorId] ?? {},
  });
}
