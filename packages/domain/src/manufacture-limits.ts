/** Trusted manufacture bounds are data-only so definition compilation can read them
 * without initializing runtime item and recipe owners through an import cycle. */
export const MANUFACTURE_LIMITS = Object.freeze({
  inputRoles: 4,
  retainedToolRoles: 2,
  outputPorts: 4,
  unitsPerRole: 16,
});
