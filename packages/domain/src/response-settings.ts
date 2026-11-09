/** Operational admission and replay retention shared by the source and native
 * response owners. These limits do not select what a character should do. */
export const RESPONSE_LIMITS = { operations: 16, bytes: 40000 } as const;
export const RESPONSE_RECEIPT_LIMIT = 300;
