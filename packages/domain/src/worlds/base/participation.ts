/** The bundled world's authored fallback, shared by ordinary return and playtest recovery.
 * Other worlds may supply another anchor or omit fallback; the engine never searches randomly.
 */
export const BASE_PARTICIPATION_POLICY = {
  safeReturnAnchor: { x: 11, y: 0, z: 13, surfaceId: 'terrain' },
};
