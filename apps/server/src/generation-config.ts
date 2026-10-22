import { z } from 'zod';

export const NPC_GENERATION_PURPOSES = ['npc_response_fast', 'npc_response_complex'] as const;
export type NpcGenerationPurpose = (typeof NPC_GENERATION_PURPOSES)[number];

const configuredNpcTargetSchema = z
  .object({
    model_binding: z
      .object({
        deployment_id: z.uuid(),
        deployment_revision_id: z.uuid().optional(),
      })
      .strict(),
    structured_output: z
      .enum(['auto', 'json_schema', 'json_object', 'prompted_json'])
      .default('auto'),
    max_output_tokens: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
  })
  .strict()
  .transform((target) =>
    Object.freeze({ ...target, model_binding: Object.freeze(target.model_binding) }),
  );

const modelTargetsConfigSchema = z
  .object({
    schema_version: z.literal(1),
    workspace_id: z.uuid(),
    purposes: z
      .object({
        npc_response_fast: configuredNpcTargetSchema.optional(),
        npc_response_complex: configuredNpcTargetSchema.optional(),
      })
      .strict()
      .refine(
        (purposes) =>
          purposes.npc_response_fast !== undefined || purposes.npc_response_complex !== undefined,
        'Configure npc_response_fast, npc_response_complex, or both.',
      )
      .transform((purposes) => Object.freeze(purposes)),
  })
  .strict()
  .transform((config) => Object.freeze(config));

/** Trusted local settings, not the Macrofold request or a gameplay-save contract. */
export type ModelTargetsConfig = z.infer<typeof modelTargetsConfigSchema>;
export type ConfiguredNpcGenerationTarget = z.infer<typeof configuredNpcTargetSchema>;

/** Offline configuration admission; a supplied invalid setting never selects the defaults. */
export function readModelTargetsConfig(raw: string | undefined): ModelTargetsConfig | undefined {
  if (raw === undefined) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('OPENLEGEND_MODEL_TARGETS_JSON must contain valid JSON.');
  }
  const parsed = modelTargetsConfigSchema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.length ? `.${issue.path.join('.')}` : '';
    throw new Error(
      `OPENLEGEND_MODEL_TARGETS_JSON${field}: ${issue?.message ?? 'Invalid model targets.'}`,
    );
  }
  return parsed.data;
}

/** Only the actual NPC producer supplies this purpose; execution tiers are shared by other work.
 * docs/projects/custom-models-tech-design.md#4-trusted-production-configuration */
export function npcGenerationTarget(
  config: ModelTargetsConfig | undefined,
  purpose: NpcGenerationPurpose,
): ConfiguredNpcGenerationTarget | undefined {
  return config?.purposes[purpose];
}

/** Each caller retains its current allowance. Capability preparation may reduce it further. */
export function npcGenerationOutputTokens(
  roleLimit: number,
  target: ConfiguredNpcGenerationTarget | undefined,
): number {
  return Math.min(roleLimit, target?.max_output_tokens ?? roleLimit);
}
