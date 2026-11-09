/** The bundled world's gestures and private-thought presentation. The native
 * owner imports this same definition; the engine supplies structured grammar. */
export const BASE_RESPONSE_RULES = {
  thought: { source: 'self_thought', summaryPrefix: 'thought: ', importance: 5 },
  expression: {
    eventType: 'expression',
    verbs: {
      nod: { verb: 'nod', headSuffix: null, targetPrefix: ' toward ', requiresReach: false },
      smile: { verb: 'smile', headSuffix: null, targetPrefix: ' toward ', requiresReach: false },
      frown: { verb: 'frown', headSuffix: null, targetPrefix: ' toward ', requiresReach: false },
      wave: { verb: 'wave', headSuffix: null, targetPrefix: ' toward ', requiresReach: false },
      shrug: { verb: 'shrug', headSuffix: null, targetPrefix: ' toward ', requiresReach: false },
      shake_head: { verb: 'shake', headSuffix: ' head', targetPrefix: ' toward ', requiresReach: false },
      slap: { verb: 'slap', headSuffix: null, targetPrefix: ' ', requiresReach: true },
    } as Record<string, { verb: string; headSuffix: string | null; targetPrefix: string; requiresReach: boolean }>,
  },
} as const;
