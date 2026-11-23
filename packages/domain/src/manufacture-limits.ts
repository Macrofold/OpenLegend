import implementation from './manufacture-implementation.json' with { type: 'json' };

/** The trusted compiler and native installer consume the same finite envelope. */
export const FIXED_TRANSFORM_IMPLEMENTATION = Object.freeze(implementation);

/** Data-only limits avoid initializing the item and recipe owners through an import cycle. */
export const MANUFACTURE_LIMITS = Object.freeze({
  inputRoles: implementation.inputRoles,
  retainedToolRoles: implementation.retainedToolRoles,
  outputPorts: implementation.outputPorts,
  unitsPerRole: implementation.unitsPerRole,
});
