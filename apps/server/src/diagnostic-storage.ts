import type { IntelligenceCall } from '@open-legend/protocol';
import { sqlTextKey } from './sql-rows.js';

/** Exact encoded text is a safe SQL key even for an isolated UTF-16 unit. The
 * canonical body and compact display projections retain the original text. */
const key = (value: string | undefined) =>
  typeof value === 'string' ? sqlTextKey(value) : undefined;
export const diagnosticSelectionPattern = (value: string) =>
  `"%${JSON.stringify(value).slice(1, -1).replaceAll('\\', '\\\\')}%"`;
const object = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
const present = (value: unknown) => value !== undefined && value !== null && value !== '';
const text = (value: unknown) =>
  value === undefined || value === null
    ? null
    : typeof value === 'string'
      ? value
      : JSON.stringify(value);

/** The same finite list/stage fields formerly selected inside PostgreSQL. Their
 * encoded display bodies stay TEXT: PostgreSQL JSON cannot decode all usable
 * JavaScript prose. No input prompt or exchange enters the routing projection. */
export function diagnosticStorage(call: IntelligenceCall) {
  const { input, output, exchanges: _exchanges, ...root } = call;
  const received = object(input),
    result = object(output);
  const selection = JSON.stringify({
    id: key(call.id),
    ownerAccountId: key(call.ownerAccountId),
    actorId: key(call.actorId),
    parentId: key(call.parentId),
    actorName: key(call.actorName),
    route: key(call.route),
    kind: key(call.kind),
    disposition: key(call.disposition),
    status: call.status,
  });
  const summary = JSON.stringify({
    ...root,
    input: { reason: received?.['reason'] ?? null, text: received?.['text'] ?? null },
    output: {
      ok: result?.['ok'] ?? null,
      code: result?.['code'] ?? null,
      message: result?.['message'] ?? null,
      reason: result?.['reason'] ?? null,
      error: result?.['error'] ?? null,
      receipt: result?.['receipt'] ?? null,
    },
    exchanges: [],
  });
  const proposed = object(received?.['proposed'])?.['operations'];
  const response = object(result?.['value'])?.['operations'];
  const stage = JSON.stringify({
    id: call.id,
    parentId: call.parentId,
    kind: call.kind,
    startedAt: call.startedAt,
    status: call.status,
    input: present(proposed) ? { proposed: { operations: proposed } } : null,
    output:
      call.kind === 'Action context' && present(output)
        ? output
        : {
            ...(present(result?.['receipt']) ? { receipt: result!['receipt'] } : {}),
            ...(present(response) ? { value: { operations: response } } : {}),
            reason: text(result?.['reason']),
            error: text(result?.['error']),
            message: text(result?.['message']),
          },
    exchanges: [],
  });
  return { selection, summary, stage };
}
