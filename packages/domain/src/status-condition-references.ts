import type { BodyPolicy } from './body-policy.js';
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

export function statusDefinitionConditions(
  definition: StatusEffectDefinition,
): Array<{ condition: StatusCondition; sourcePath: string }> {
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
    if ('changeRate' in operation && operation.when)
      conditions.push({ condition: operation.when, sourcePath: `whileActive[${index}].when` });
  }
  return conditions;
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
