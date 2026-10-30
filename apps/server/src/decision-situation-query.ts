import { z } from 'zod';
import type { prepareDecision } from './decision-context.js';
import { expandSituation, situationQuerySchema, type SituationQuery } from './situation-context.js';

export const situationQueriesField = (maximum: number) =>
  z.array(situationQuerySchema).max(maximum).nullable();

export const SITUATION_QUERY_INSTRUCTIONS =
  'First choose one mode and write queries before operations. Set queries to null for a complete decision. You may make one batch of the supplied read-only situation queries when needed. For a query batch return an empty operations list, queries, and no invention. A final continuation follows only if funded; otherwise the character continues current behavior. Coordinates and geometry are received measurements, never inferred intent. Partial coverage does not prove absence.';

/** The provider chooses whether to ask before it starts writing effects. Keep the
 * same field order and mode contract on every route that offers these queries. */
export function withSituationQueries<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  maximum: number,
) {
  return z.object({ queries: situationQueriesField(maximum), ...schema.shape }).strict();
}

/** A query is a request for evidence, never permission to execute beside it. */
export function readSituationQueryResponse(value: unknown, maximum: number) {
  const parsed = z
    .object({ queries: situationQueriesField(maximum) })
    .passthrough()
    .safeParse(value);
  if (!parsed.success) throw new Error('The response did not match the situation query contract.');
  const response = parsed.data;
  if (
    response.queries?.length &&
    (!Array.isArray(response['operations']) ||
      response['operations'].length ||
      response['invention'])
  )
    throw new Error('A situation query cannot execute response operations.');
  return response;
}

/** Both model routes expand only the original received cut and extend its exact
 * source proofs before offering the newly disclosed handles to native admission. */
export async function expandDecisionSituation(
  prepared: Awaited<ReturnType<typeof prepareDecision>>,
  queries: readonly SituationQuery[],
) {
  await prepared.validateConversation();
  const expansion = await expandSituation(
    prepared.situation,
    [...queries],
    prepared.readSituationHistory,
  );
  await prepared.validateConversation(false);
  for (const id of expansion.expandedIds) {
    const body = prepared.situation.bodyBindings.get(id);
    if (!body) continue;
    const { handle, leaseId, subject, episode } = body;
    prepared.entityReferences[handle] = id;
    prepared.binding.physicalEntityReferences![handle] = id;
    prepared.binding.entityLeases![id] = leaseId;
    if (subject) (prepared.binding.identityReferences ??= {})[handle] = subject;
    if (!prepared.binding.entityIds.includes(id)) prepared.binding.entityIds.push(id);
    if (episode) (prepared.binding.entityEpisodes ??= {})[id] = episode;
  }
  const { expandedIds: _expandedIds, ...disclosed } = expansion;
  return disclosed;
}
