/** Operational admission and replay retention shared by the source and native
 * response owners. These limits do not select what a character should do. */
export const RESPONSE_LIMITS = { operations: 16, bytes: 40000 } as const;
export const RESPONSE_RECEIPT_LIMIT = 300;
/** Availability checks size the same prospective activity record as the source
 * command service. This technical ID is never an issued command or authority. */
export const COMMAND_CHOICE_PREPARATION_ID = 'prepared-choice';
