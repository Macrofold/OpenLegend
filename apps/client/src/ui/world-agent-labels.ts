import type { WorldAuthoringKind } from '@open-legend/protocol';

export const worldAgentKindLabel: Record<WorldAuthoringKind, string> = {
  recipe: 'Recipe',
  'world-opening': 'World opening',
  attribute: 'Characteristic definition',
  'attribute-bindings': 'Character characteristics',
  'attribute-values': 'Character characteristic values',
  'status-effect-policy': 'Status rules',
  'cognition-policy': 'Rules for character thought',
  action: 'Action definition',
};
