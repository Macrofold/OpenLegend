import { z } from 'zod';
import { FOLLOW_RULES } from '@open-legend/domain';

export const navigationInvocationSchema = z
  .object({
    family: z.enum(['move', 'follow']),
    x: z.number().finite().nullable(),
    z: z.number().finite().nullable(),
    surfaceId: z.string().min(1).max(120).nullable(),
    targetEntityId: z.string().min(1).max(120).nullable(),
    distance: z
      .number()
      .min(FOLLOW_RULES.minimumDistance)
      .max(FOLLOW_RULES.maximumDistance)
      .nullable(),
  })
  .strict();

export const NAVIGATION_INSTRUCTIONS =
  'For movement not listed in suggestions use act.kind=invoke and invocation={family:move,x,z,surfaceId,targetEntityId:null,distance:null}; coordinates are world X/Z, not height. For ordinary visible following use invocation={family:follow,x:null,z:null,surfaceId:null,targetEntityId:exactReference,distance:null}. Other act fields are null. Follow stops on lost sight, cancellation or native interruption; it does not support stealth or sunset termination. Put a request with unsupported qualifiers in kind=proposal instead, preserving its text and optional targetEntityId, so fulfillment can be reviewed. Never silently drop a requirement by choosing a direct invocation. For any non-invoke act, invocation is null.';
