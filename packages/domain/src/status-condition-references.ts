import type { BodyPolicy } from './body-policy.js';
import { isImmutableData } from './records.js';
import type { EntityReference, StatusCondition, StatusEffectDefinition } from './status-effects.js';

export interface StatusDefinitionReference {
  definitionId: string;
  sourcePath: string;
  target: EntityReference;
  value: boolean;
}

/** Walk the admitted native condition language. Both positive and negative status
 * tests require their referenced definition; prose never creates a reference. */
export function visitStatusCondition(
  condition: StatusCondition,
  sourcePath: string,
  visit: (condition: StatusCondition, sourcePath: string) => void,
): number {
  const pending = [{ condition, sourcePath }];
  for (let index = 0; index < pending.length; index++) {
    const current = pending[index]!;
    visit(current.condition, current.sourcePath);
    const group = 'all' in current.condition ? 'all' : 'any' in current.condition ? 'any' : null;
    if (!group) continue;
    const children =
      'all' in current.condition
        ? current.condition.all
        : 'any' in current.condition
          ? current.condition.any
          : [];
    for (let child = 0; child < children.length; child++)
      pending.push({
        condition: children[child]!,
        sourcePath: `${current.sourcePath}.${group}[${child}]`,
      });
  }
  return pending.length;
}

type DefinitionCondition = { condition: StatusCondition; sourcePath: string };
const conditionReferences = new WeakMap<StatusEffectDefinition, readonly DefinitionCondition[]>();
export function statusDefinitionConditions(
  definition: StatusEffectDefinition,
): readonly DefinitionCondition[] {
  const cached = conditionReferences.get(definition);
  if (cached) return cached;
  const conditions = [{ condition: definition.requires, sourcePath: 'requires' }];
  for (const key of [
    'activationCondition',
    'automaticActivation',
    'automaticDeactivation',
  ] as const) {
    const condition = definition[key];
    if (condition) conditions.push({ condition, sourcePath: key });
  }
  for (let index = 0; index < definition.whileActive.length; index++) {
    const operation = definition.whileActive[index]!;
    if ('when' in operation && operation.when)
      conditions.push({ condition: operation.when, sourcePath: `whileActive[${index}].when` });
  }
  if (isImmutableData(definition)) conditionReferences.set(definition, conditions);
  return conditions;
}

interface PreparedStatusDefinition {
  definition: StatusEffectDefinition;
  references: readonly DefinitionCondition[];
  activation?: StatusCondition;
  active: readonly StatusCondition[];
  contribution: readonly StatusCondition[];
}
interface PreparedStatusDefinitions {
  entries: readonly PreparedStatusDefinition[];
  byId: ReadonlyMap<string, PreparedStatusDefinition>;
}
const definitionStructures = new WeakMap<StatusEffectDefinition[], PreparedStatusDefinitions>();
/** Immutable rule structure is shared; bindings, predicate answers, rates and
 * deadlines remain live evaluation owned by status execution.
 * docs/projects/bookkeeping-simplification-tech-design.md#n1--invalidate-status-preparation-only-when-its-inputs-may-change */
export function prepareStatusDefinitionStructure(
  definitions: StatusEffectDefinition[],
): PreparedStatusDefinitions {
  const cached = definitionStructures.get(definitions);
  if (cached) return cached;
  const entries = definitions.map(
    (definition): PreparedStatusDefinition => ({
      definition,
      references: statusDefinitionConditions(definition),
      ...(definition.automaticActivation
        ? {
            activation: {
              all: [
                definition.requires,
                ...(definition.activationCondition ? [definition.activationCondition] : []),
                definition.automaticActivation,
              ],
            },
          }
        : {}),
      active: [
        definition.requires,
        ...(definition.automaticDeactivation ? [definition.automaticDeactivation] : []),
        ...definition.whileActive.flatMap((operation) =>
          'when' in operation && operation.when ? [operation.when] : [],
        ),
      ],
      contribution: [
        definition.requires,
        ...(definition.automaticDeactivation ? [definition.automaticDeactivation] : []),
      ],
    }),
  );
  const prepared = { entries, byId: new Map(entries.map((entry) => [entry.definition.id, entry])) };
  if (isImmutableData(definitions)) definitionStructures.set(definitions, prepared);
  return prepared;
}

export function bodyPolicyConditions(
  policy: BodyPolicy | null,
): Array<{ condition: StatusCondition; sourcePath: string }> {
  if (!policy) return [];
  const conditions: Array<{ condition: StatusCondition; sourcePath: string }> = [];
  if (policy.recovery)
    conditions.push({ condition: policy.recovery.when, sourcePath: 'recovery.when' });
  if (policy.consumption)
    conditions.push({
      condition: policy.consumption.suggestWhen,
      sourcePath: 'consumption.suggestWhen',
    });
  for (const key of [
    'maintenanceBlockedWhen',
    'commitBlockedWhen',
    'reflectionBlockedWhen',
  ] as const) {
    const condition = policy.backgroundThinking[key];
    if (condition) conditions.push({ condition, sourcePath: `backgroundThinking.${key}` });
  }
  for (let index = 0; index < policy.backgroundThinking.reconsiderationInputs.length; index++)
    conditions.push({
      condition: policy.backgroundThinking.reconsiderationInputs[index]!.when,
      sourcePath: `backgroundThinking.reconsiderationInputs[${index}].when`,
    });
  return conditions;
}
