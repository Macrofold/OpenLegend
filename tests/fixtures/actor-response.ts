import type { AiResult, GenerateRequest } from '@open-legend/ai';

/** These simulated providers produce the current first-decision envelope. A final
 * continuation has no query field; refusals and intentionally invalid values stay intact. */
export function decisionFixtureResult<T>(
  request: GenerateRequest,
  result: AiResult<T>,
): AiResult<T> {
  const properties = request.schema['properties'] as Record<string, unknown> | undefined;
  if (
    request.task !== 'npc_response' ||
    !properties?.['queries'] ||
    result.outcome !== 'value' ||
    !result.value ||
    typeof result.value !== 'object' ||
    Array.isArray(result.value)
  )
    return result;
  return { ...result, value: { queries: null, ...result.value } };
}
