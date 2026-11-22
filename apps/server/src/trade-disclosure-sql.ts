import type { PerceivedItemOffer } from '@open-legend/domain';

// The stored personal item-offer record owns the other person's last disclosed
// lots. Its physical inventory and the active proposal are separate authority.
// docs/limits/interface.md#td01--remembered-trade-item-pages
/** Bounds for the remembered-item chooser, independent of installed world rules. */
export const TRADE_DISCLOSURE_READ = { pageRows: 6, scanRows: 200 } as const;

export const itemOfferFamily: PerceivedItemOffer['family'] = 'item-offer';
const tradeAgreementPrefix = JSON.stringify([itemOfferFamily]).slice(0, -1) + ',';
const tradeFamily = (alias: string) => `${alias}.agreement_key LIKE '${tradeAgreementPrefix}%'`;
// Agreement keys are already validated selection metadata. Guard the cast
// itself: SQL may evaluate a projection before another WHERE condition, and
// unrelated agreement bodies can contain exact text JSONB cannot represent.
// docs/performance/storage.md#storage-execution
const tradeTerms = (alias: string) =>
  `(CASE WHEN ${tradeFamily(alias)} THEN (${alias}.payload::jsonb #>> '{eventData,agreement}')::jsonb END)`;
const tradeKeys = (alias: string) => `(
  jsonb_path_query_array(${tradeTerms(alias)},'$.offererId') ||
  jsonb_path_query_array(${tradeTerms(alias)},'$.recipientId') ||
  jsonb_path_query_array(${tradeTerms(alias)},'$.offered[*].itemId') ||
  jsonb_path_query_array(${tradeTerms(alias)},'$.requested[*].itemId'))`;
const retainedTradeSource = (alias: string) => `${alias}.world_id=? AND ${alias}.actor_id=?
  AND (SELECT generation FROM world_head WHERE id=1)=? AND ${tradeFamily(alias)}
  AND CASE WHEN ${tradeFamily(alias)}
    THEN ${alias}.payload::jsonb #> '{eventData,personalAgreement}'='true'::jsonb
    ELSE FALSE END
  AND NOT EXISTS (SELECT 1 FROM mind_forgotten f WHERE f.world_id=${alias}.world_id AND f.actor_id=${alias}.actor_id AND f.source_id=${alias}.source_id)
  AND NOT EXISTS (SELECT 1 FROM mind_corrections c WHERE c.world_id=${alias}.world_id AND c.actor_id=${alias}.actor_id AND c.source_id=${alias}.source_id)`;

export const tradeDisclosureKeyIndexSql = `CREATE INDEX IF NOT EXISTS mind_trade_disclosure_keys ON mind_awareness
      USING GIN ((${tradeKeys('mind_awareness')}) jsonb_path_ops) WITH (fastupdate=off)
      WHERE ${tradeFamily('mind_awareness')}`;

/** The requested page still carries each original awareness receipt and
 * revision for the stand-alone consumer's final authorization. */
export function tradeDisclosurePageSql(before: boolean): string {
  return `WITH parties AS (SELECT ?::jsonb AS incoming,?::jsonb AS outgoing,?::jsonb AS keys),
        candidates AS MATERIALIZED (
          SELECT a.position,e.ordinality::int AS ordinal,e.lot->>'itemId' AS item_id,e.lot::text AS lot,
            a.source_id,a.account_revision,
            d.terms->'descriptions'->s.side->(e.ordinality-1)::int->>'name' AS name,
            d.terms->'descriptions'->s.side->(e.ordinality-1)::int->>'description' AS description,
            (d.terms->>'createdAt')::double precision AS disclosed_at
          FROM mind_awareness a CROSS JOIN parties p
          CROSS JOIN LATERAL (SELECT ${tradeTerms('a')} AS terms) d
          CROSS JOIN LATERAL (SELECT CASE WHEN d.terms->>'offererId'=a.actor_id THEN 'requested' ELSE 'offered' END AS side) s
          CROSS JOIN LATERAL jsonb_array_elements(d.terms->s.side) WITH ORDINALITY e(lot,ordinality)
          WHERE ${retainedTradeSource('a')} AND ${tradeKeys('a')} @> p.keys
            AND (d.terms @> p.incoming OR d.terms @> p.outgoing)
            ${before ? 'AND (a.position,e.ordinality)<(?,?)' : ''}
          ORDER BY a.position DESC,e.ordinality DESC LIMIT ?
        ), latest_sources AS MATERIALIZED (
          SELECT k.item_id,n.position FROM (SELECT DISTINCT item_id FROM candidates) k
          CROSS JOIN LATERAL (
            SELECT n.position FROM mind_awareness n CROSS JOIN parties p
            WHERE ${retainedTradeSource('n')}
              AND ${tradeKeys('n')} @> (p.keys || jsonb_build_array(k.item_id)) AND (
                ${tradeTerms('n')} @> (p.incoming || jsonb_build_object('offered',jsonb_build_array(jsonb_build_object('itemId',k.item_id)))) OR
                ${tradeTerms('n')} @> (p.outgoing || jsonb_build_object('requested',jsonb_build_array(jsonb_build_object('itemId',k.item_id))))
              )
            ORDER BY n.position DESC LIMIT 1
          ) n
        )
        SELECT c.*,c.position=l.position AS latest FROM candidates c
        JOIN latest_sources l ON l.item_id=c.item_id ORDER BY c.position DESC,c.ordinal DESC`;
}

/** Look up the exact disclosed terms for the submitted IDs, independent of
 * the page window. Admission rechecks the original receipt before mutation. */
export const tradeDisclosureReferencesSql = `SELECT q.item_id,e.lot::text AS lot,a.source_id,a.account_revision,
        d.terms->'descriptions'->s.side->(e.ordinality-1)::int->>'name' AS name,
        d.terms->'descriptions'->s.side->(e.ordinality-1)::int->>'description' AS description,
        (d.terms->>'createdAt')::double precision AS disclosed_at
        FROM jsonb_to_recordset(?::jsonb) q(item_id TEXT,keys JSONB,incoming JSONB,outgoing JSONB)
        CROSS JOIN LATERAL (
          SELECT a.payload,a.actor_id,a.agreement_key,a.source_id,a.account_revision FROM mind_awareness a
          WHERE ${retainedTradeSource('a')} AND ${tradeKeys('a')} @> q.keys
            AND (${tradeTerms('a')} @> q.incoming OR ${tradeTerms('a')} @> q.outgoing)
          ORDER BY a.position DESC LIMIT 1
        ) a
        CROSS JOIN LATERAL (SELECT ${tradeTerms('a')} AS terms) d
        CROSS JOIN LATERAL (SELECT CASE WHEN d.terms->>'offererId'=a.actor_id THEN 'requested' ELSE 'offered' END AS side) s
        CROSS JOIN LATERAL jsonb_array_elements(d.terms->s.side) WITH ORDINALITY e(lot,ordinality)
        WHERE e.lot->>'itemId'=q.item_id`;
