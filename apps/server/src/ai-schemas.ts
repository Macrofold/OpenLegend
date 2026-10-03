import { recipeCandidateEnvelopeSchema } from '@open-legend/domain';
import type { JsonSchema } from '@open-legend/ai';

/** Transport envelope only. Native admission and generation use the installed selected family. */
export const declarationSchema: JsonSchema = recipeCandidateEnvelopeSchema;
