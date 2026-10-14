/** Separate each owned record and opaque identity; punctuation inside a supplied
 * ID must not retarget a retained edit or an in-flight read.
 * docs/identity-and-references.md#contract
 */
export function authoringKey(
  kind: string,
  worldId: string,
  audience: string,
  ...identity: Array<string | number | null>
): string {
  return `open-legend:authoring:${JSON.stringify([kind, worldId, audience, ...identity])}`;
}
