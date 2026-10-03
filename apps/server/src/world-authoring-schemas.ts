import { z } from 'zod';
import type { StatusCondition } from '@open-legend/domain';
import { attributeBindingSchema } from './world-authoring-bindings.js';
import { attributeValueSchema } from './world-authoring-values.js';
import { commandInputSchema } from './world-service.js';

const text = (max = 256) => z.string().min(1).max(max);
const finite = z.number().finite();
const target = z.enum(['$subject', '$source', '$actionTarget']);
export const statusCapabilitySchema = z.enum(['actions', 'locomotion', 'speech', 'perception']);
// Transport shapes describe the existing native AST. Native owners still decide supported
// attributes, cycles, contribution lifetimes, admission and current-state compatibility.
export const statusConditionSchema: z.ZodType<StatusCondition> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(statusConditionSchema).min(1).max(128) }).strict(),
    z.object({ any: z.array(statusConditionSchema).min(1).max(128) }).strict(),
    z.object({ hasAttribute: z.object({ target, attribute: text() }).strict() }).strict(),
    z
      .object({
        compare: z
          .object({
            target,
            attribute: text(),
            operator: z.enum([
              'equal',
              'notEqual',
              'lessThan',
              'lessThanOrEqual',
              'greaterThanOrEqual',
            ]),
            value: finite,
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        field: z
          .object({
            target,
            name: z.enum([
              'controller',
              'alive',
              'incapacitated',
              'grounded',
              'activeWork',
              'kind',
            ]),
            operator: z.enum(['equal', 'notEqual']),
            value: z.union([z.string().max(256), z.boolean()]),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        dailyWindow: z
          .object({
            target: z.literal('$world'),
            clock: z.literal('localTime'),
            start: finite.min(0).lt(24),
            end: finite.min(0).lt(24),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        statusActive: z.object({ target, definitionId: text(), value: z.boolean() }).strict(),
      })
      .strict(),
  ]),
);
const event = z
  .object({
    emit: z.object({ target, type: z.literal('stateChanged'), narration: text(512) }).strict(),
  })
  .strict();
export const statusPolicySchema = z
  .object({
    revision: z.number().int().positive(),
    clockOffsetHours: finite.min(0).lt(24),
    namedTimes: z
      .record(
        z
          .string()
          .max(24)
          .regex(/^[a-z]+(?: [a-z]+)?$/u),
        finite.min(0).lt(24),
      )
      .refine((values) => Object.keys(values).length <= 8, 'At most eight named times.'),
    definitions: z
      .array(
        z
          .object({
            id: text(),
            type: z.literal('statusEffect'),
            target: z.literal('$subject'),
            label: text(),
            lifecycleCause: text(64).optional(),
            enabled: z.boolean(),
            requires: statusConditionSchema,
            activationCondition: statusConditionSchema.optional(),
            automaticActivation: statusConditionSchema.optional(),
            automaticDeactivation: statusConditionSchema.optional(),
            reactivationDelaySeconds: finite.min(0).max(86400),
            occupiesAction: z.boolean(),
            interruptOn: z.array(text(64)).max(32),
            whileActive: z
              .array(
                z.union([
                  z
                    .object({
                      changeRate: z
                        .object({
                          target,
                          attribute: text(),
                          amount: finite.min(-1000000).max(1000000),
                          per: z.literal('gameSecond'),
                        })
                        .strict(),
                      when: statusConditionSchema.optional(),
                    })
                    .strict(),
                  z
                    .object({
                      restrictCapabilities: z
                        .object({
                          target: z.literal('$subject'),
                          capabilities: z.array(statusCapabilitySchema).min(1).max(4),
                        })
                        .strict(),
                    })
                    .strict(),
                ]),
              )
              .min(1)
              .max(32),
            presentation: z
              .object({
                pose: z.literal('horizontal').optional(),
                particle: z
                  .object({
                    text: text(32),
                    anchor: z.literal('head'),
                    motion: z.literal('floatAway'),
                  })
                  .strict()
                  .optional(),
              })
              .strict()
              .optional(),
            onActivate: event.optional(),
            onDeactivate: event.optional(),
            actions: z
              .object({
                activate: text(),
                deactivate: text(),
                allowOther: z.boolean(),
                activateOther: z.boolean(),
              })
              .strict()
              .optional(),
            contribution: z
              .union([
                z
                  .object({
                    disclosure: z.enum(['owner', 'public']),
                    lifetime: z.enum(['explicit-removal', 'source-sustained']),
                  })
                  .strict(),
                z
                  .object({
                    disclosure: z.enum(['owner', 'public']),
                    lifetime: z.literal('fixed'),
                    seconds: finite.positive(),
                  })
                  .strict(),
              ])
              .optional(),
          })
          .strict(),
      )
      .max(128),
  })
  .strict();
export const cognitionPolicySchema = z
  .object({
    version: z.literal(1),
    revision: z.number().int().positive(),
    maxImmediateLevel: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    significantEventTypes: z.array(z.string().regex(/^[a-z-]{1,64}$/)).max(16),
    reflection: z.boolean(),
    dream: z
      .object({ statusEffectId: text(), afterSeconds: finite.positive() })
      .strict()
      .nullable(),
  })
  .strict();
const conditionPolicy = z
  .object({
    bands: z
      .array(
        z.object({ below: finite, inclusive: z.boolean().optional(), text: text(160) }).strict(),
      )
      .min(1),
    clearText: z.string().max(160),
    recoveryMargin: finite.nonnegative(),
    criticalSeverity: z.number().int().positive(),
    reviewSeconds: finite.positive(),
  })
  .strict();
const criticalPresentation = z.union([
  z
    .object({
      compare: z
        .object({
          operator: z.enum(['lessThan', 'lessThanOrEqual']),
          value: finite,
          rounding: z.enum(['none', 'nearest-integer']),
        })
        .strict(),
    })
    .strict(),
  z.object({ concernActive: z.literal(true) }).strict(),
]);
const attributeDefinition = z
  .object({
    id: text(120),
    version: z.number().int().positive(),
    name: text(64),
    meaning: z.string().max(1600).optional(),
    implementation: z.enum(['number-v1', 'reservoir-v1', 'category-v1']),
    disclosure: z.enum(['public', 'owner']),
    presentation: z.object({ icon: text(64), color: text(64) }).strict(),
    schema: z.union([
      z
        .object({
          kind: z.literal('number'),
          min: finite,
          max: finite,
          initial: finite,
          unit: text(24),
        })
        .strict(),
      z
        .object({
          kind: z.literal('category'),
          choices: z.array(text(64)).min(1),
          initial: text(64),
        })
        .strict(),
    ]),
    concern: z
      .union([
        z
          .object({
            below: finite,
            text: text(160),
            mode: z.literal('instant'),
            notify: z.boolean(),
            reconsider: z.boolean(),
          })
          .strict(),
        z
          .object({
            below: finite,
            text: text(160),
            mode: z.literal('latched'),
            notify: z.boolean(),
            reconsider: z.boolean(),
            recoveryMargin: finite.nonnegative(),
          })
          .strict(),
      ])
      .optional(),
    critical: criticalPresentation.optional(),
    editorCritical: criticalPresentation.optional(),
    condition: conditionPolicy.optional(),
    reservoir: z
      .object({
        drainPerSecond: finite.nonnegative().max(100),
        replenishPerSecond: finite.positive().max(100),
        workSeconds: finite.positive().max(3600),
        actionLabel: text(64),
      })
      .strict()
      .optional(),
  })
  .strict();
export const attributeDeclarationSchema = z.union([
  z.object({ definition: attributeDefinition }).strict(),
  z.object({ removeId: text(120) }).strict(),
]);
export const typedAuthoringPayload = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('status-effect-policy'), candidate: statusPolicySchema }).strict(),
  z.object({ kind: z.literal('cognition-policy'), candidate: cognitionPolicySchema }).strict(),
  z.object({ kind: z.literal('attribute'), candidate: attributeDeclarationSchema }).strict(),
  z.object({ kind: z.literal('attribute-bindings'), candidate: attributeBindingSchema }).strict(),
  z.object({ kind: z.literal('attribute-values'), candidate: attributeValueSchema }).strict(),
  z.object({ kind: z.literal('action'), candidate: commandInputSchema }).strict(),
]);

export const authoringCandidateSchemas = {
  'status-effect-policy': statusPolicySchema,
  'cognition-policy': cognitionPolicySchema,
  attribute: attributeDeclarationSchema,
  'attribute-bindings': attributeBindingSchema,
  'attribute-values': attributeValueSchema,
  action: commandInputSchema,
} as const;
