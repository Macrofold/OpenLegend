//! An indexed page of the same durable personal accounts as Story. Original
//! occurrences supply the eligibility category only. Their body never leaves
//! PostgreSQL for a player history request.

use super::super::{
    DurableHead, Store, StoreError, StoreResult, durable_head, ordinal, read::admitted_query,
    recall::browse::MemorySearch, sql_ordinal,
};
use super::transcript::{VerifiedEventBody, retained_event};
use crate::{language::LanguageProvider, player_events::RetainedPlayerEvent};
use openlegend_simulation::{
    host::{ByteBudget, ByteReservation},
    received::TemporalReceiptLocator,
    records::SqlCell,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio_postgres::{Row, Transaction, types::ToSql};

mod search;

type PageFilter<'a> = [&'a (dyn ToSql + Sync); 5];

#[derive(Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub(crate) struct EventEdge {
    pub order: u64,
    pub id: String,
}
impl EventEdge {
    fn read(row: &Row) -> StoreResult<Self> {
        Ok(Self {
            order: ordinal(row.try_get(0)?)?,
            id: row.try_get(1)?,
        })
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub(crate) struct EventBoundary {
    pub watermark: EventEdge,
    pub before: EventEdge,
    pub newer: bool,
}

pub(crate) struct EventSourceQuery {
    pub kind: Option<String>,
    pub types: Vec<String>,
    pub inclusive: bool,
    pub at: Option<f64>,
    pub boundary: Option<EventBoundary>,
    pub limit: i64,
}

struct EventWindow {
    watermark: Option<EventEdge>,
    before: Option<EventEdge>,
    newer: bool,
    show_newer: bool,
    limit: usize,
}

pub(crate) struct EventFeedRows(FeedInput);

enum FeedInput {
    Raw {
        actor: String,
        rows: Vec<Row>,
        window: EventWindow,
        _transfer: ByteReservation,
    },
    Matched(EventFeed),
}

pub(crate) struct RetainedEventRow {
    pub edge: EventEdge,
    pub event: RetainedPlayerEvent,
    pub revision: String,
    pub temporal: Option<(TemporalReceiptLocator, f64)>,
}

pub(crate) struct EventFeed {
    pub events: Vec<RetainedEventRow>,
    pub older: Option<EventBoundary>,
    pub newer: Option<EventBoundary>,
    pub scanned_window: bool,
    extra_match: Option<RetainedEventRow>,
    _custody: ByteReservation,
}

impl EventFeed {
    /// A body that establishes continuation must meet the same disclosure
    /// check as displayed matches.
    pub(crate) fn proofs(&self) -> impl Iterator<Item = &RetainedEventRow> {
        self.events.iter().chain(self.extra_match.iter())
    }

    pub(crate) fn projection_bytes(&self) -> Option<usize> {
        self._custody.bytes().checked_add(4096)?.checked_mul(2)
    }
}

const EVENT_SCOPE: &str = "((e.payload::jsonb->>'scope')='external'
 OR (e.payload::jsonb->>'type') IN ('encounter','contact','attribute-concern','attribute-changed'))";

const PAGE_FILTER: &str = "FROM history_perspectives p JOIN history_events e
 ON e.world_id=p.world_id AND e.id=p.event_id
 WHERE p.world_id=$1 AND p.actor_id=$2
   AND ($3::text IS NULL OR p.event_type=$3)
   AND (p.event_type=ANY($4::text[]))=$5";

pub(crate) struct EventSourcesRows {
    actor: String,
    rows: Vec<Row>,
    _transfer: ByteReservation,
}

pub(crate) struct EventSources {
    rows: Vec<(RetainedEventRow, Option<String>)>,
    _custody: ByteReservation,
}

impl EventSources {
    pub(crate) fn source(
        &self,
        id: &str,
    ) -> Option<(&RetainedEventRow, Option<(&str, Option<&RetainedEventRow>)>)> {
        let (row, correction) = self.rows.iter().find(|(row, _)| row.edge.id == id)?;
        let qualification = correction.as_deref().map(|id| {
            (
                id,
                self.rows
                    .iter()
                    .find(|(row, _)| row.edge.id == id)
                    .map(|(row, _)| row),
            )
        });
        Some((row, qualification))
    }

    pub(crate) fn rows(&self) -> impl Iterator<Item = &RetainedEventRow> {
        self.rows.iter().map(|(row, _)| row)
    }

    pub(crate) fn projection_bytes(&self) -> Option<usize> {
        self._custody.bytes().checked_add(4096)?.checked_mul(2)
    }
}

impl Store {
    /// Capture the original keyset and the actual SQL account bodies under one
    /// fixed repeatable read cut. Decode only after the shared reader is free.
    pub(crate) async fn event_feed(
        self: &Arc<Self>,
        head: DurableHead,
        actor: String,
        options: EventSourceQuery,
        search: Option<Arc<MemorySearch>>,
    ) -> StoreResult<EventFeedRows> {
        let store = self.clone();
        if let Some(search) = search {
            self.read_isolated(move |tx| {
                Box::pin(async move {
                    store
                        .read_event_feed(tx, &head, actor, options, Some(&search))
                        .await
                })
            })
            .await
        } else {
            self.read_operational(move |tx| {
                Box::pin(
                    async move { store.read_event_feed(tx, &head, actor, options, None).await },
                )
            })
            .await
        }
    }

    /// Select the exact permitted IDs and at most one correction per ID under
    /// the same durable read cut used for the Events page. The SQL owner funds
    /// transferred rows; the caller owns the prepared bodies and final lease.
    pub(crate) async fn event_sources(
        self: &Arc<Self>,
        head: DurableHead,
        actor: String,
        ids: Vec<String>,
    ) -> StoreResult<EventSourcesRows> {
        let store = self.clone();
        self.read_operational(move |tx| {
            Box::pin(async move {
                if durable_head(tx).await?.as_ref() != Some(&head) {
                    return Err(StoreError::StaleCut);
                }
                let size = store.schema.transcript_account.len().checked_add(4096)
                    .ok_or(StoreError::Capacity)?;
                let _statement = store.budget.reserve(size).map_err(|_| StoreError::Capacity)?;
                let select = format!(
                    "WITH requested AS MATERIALIZED (SELECT DISTINCT unnest($3::text[]) AS id),
                          corrected AS MATERIALIZED (
                            SELECT r.id AS source_id, coalesce(c.correction_id, m.correction_id) AS correction_id
                              FROM requested r
                              LEFT JOIN mind_corrections c ON c.world_id=$1 AND c.actor_id=$2 AND c.source_id=r.id
                              LEFT JOIN mind_corrections m ON m.world_id=$1 AND m.actor_id=$2 AND m.source_id='memory-' || r.id
                          ), wanted AS (
                            SELECT id FROM requested UNION SELECT correction_id FROM corrected WHERE correction_id IS NOT NULL
                          )
                     SELECT p.position,p.event_id,p.payload,{} AS account,c.correction_id
                       FROM wanted w
                       JOIN history_perspectives p ON p.world_id=$1 AND p.actor_id=$2 AND p.event_id=w.id
                       JOIN history_events e ON e.world_id=p.world_id AND e.id=p.event_id
                       LEFT JOIN corrected c ON c.source_id=p.event_id
                       WHERE {EVENT_SCOPE} AND NOT EXISTS (SELECT 1 FROM mind_forgotten f WHERE f.world_id=$1
                         AND f.actor_id=$2 AND f.source_id IN (p.event_id, 'memory-' || p.event_id))",
                    store.schema.transcript_account,
                );
                let (_transfer, rows) = admitted_query(tx, &select, &[&head.world_id, &actor, &ids], &store.budget).await?;
                Ok(EventSourcesRows { actor, rows, _transfer })
            })
        }).await
    }

    async fn read_event_feed(
        &self,
        tx: &Transaction<'_>,
        head: &DurableHead,
        actor: String,
        options: EventSourceQuery,
        search: Option<&MemorySearch>,
    ) -> StoreResult<EventFeedRows> {
        if durable_head(tx).await?.as_ref() != Some(head) {
            return Err(StoreError::StaleCut);
        }
        let query_budget = self
            .schema
            .transcript_account
            .len()
            .checked_add(8192)
            .ok_or(StoreError::Capacity)?;
        let _statement = self
            .budget
            .reserve(query_budget)
            .map_err(|_| StoreError::Capacity)?;
        let params: PageFilter<'_> = [
            &head.world_id,
            &actor,
            &options.kind,
            &options.types,
            &options.inclusive,
        ];
        let watermark = if let Some(boundary) = options.boundary.as_ref() {
            Some(boundary.watermark.clone())
        } else {
            tx.query_opt(
                &format!(
                    "SELECT p.position,p.event_id {PAGE_FILTER} AND {EVENT_SCOPE}
               ORDER BY p.position DESC,p.event_id DESC LIMIT 1"
                ),
                &params,
            )
            .await?
            .as_ref()
            .map(EventEdge::read)
            .transpose()?
        };
        let Some(watermark) = watermark else {
            return Ok(EventFeedRows(FeedInput::Raw {
                actor,
                rows: Vec::new(),
                window: EventWindow {
                    watermark: None,
                    before: None,
                    newer: false,
                    show_newer: false,
                    limit: 0,
                },
                _transfer: self.budget.reserve(0).map_err(|_| StoreError::Capacity)?,
            }));
        };
        let mut newer = options
            .boundary
            .as_ref()
            .is_some_and(|boundary| boundary.newer);
        let initial_anchor = if options.boundary.is_none() {
            if let Some(at) = options.at {
                let mut filter = params.to_vec();
                filter.push(&at);
                let anchor=tx.query_opt(&format!("SELECT p.position,p.event_id {PAGE_FILTER} AND {EVENT_SCOPE}
                    AND (p.payload::jsonb->>'time')::double precision<=$6
                    ORDER BY (p.payload::jsonb->>'time')::double precision DESC,p.position DESC,p.event_id DESC LIMIT 1"),
                    &filter,
                ).await?.as_ref().map(EventEdge::read).transpose()?;
                newer = anchor.is_none();
                anchor
            } else {
                None
            }
        } else {
            None
        };
        let cutoff = options
            .boundary
            .as_ref()
            .map(|boundary| &boundary.before)
            .or(initial_anchor.as_ref());
        let include_first = options.boundary.is_none() && !newer;
        let window = EventWindow {
            watermark: Some(watermark),
            newer,
            before: cutoff.cloned(),
            show_newer: options.boundary.is_some() || options.at.is_some(),
            limit: usize::try_from(options.limit).map_err(|_| StoreError::InvalidRecord)?,
        };
        if let Some(search) = search {
            let feed = self
                .search_event_feed(tx, &params, &actor, window, include_first, search)
                .await?;
            return Ok(EventFeedRows(FeedInput::Matched(feed)));
        }
        let offered = options.limit.checked_add(1).ok_or(StoreError::Capacity)?;
        let (transfer, rows) = self
            .event_chunk(
                tx,
                &params,
                &window,
                window.before.as_ref(),
                include_first,
                offered,
            )
            .await?;
        Ok(EventFeedRows(FeedInput::Raw {
            actor,
            rows,
            window,
            _transfer: transfer,
        }))
    }

    async fn event_chunk(
        &self,
        tx: &Transaction<'_>,
        params: &PageFilter<'_>,
        window: &EventWindow,
        cutoff: Option<&EventEdge>,
        include_first: bool,
        offered: i64,
    ) -> StoreResult<(ByteReservation, Vec<Row>)> {
        let watermark = window.watermark.as_ref().ok_or(StoreError::InvalidRecord)?;
        let cutoff_order = cutoff.map(|p| sql_ordinal(p.order)).transpose()?;
        let cutoff_id = cutoff.map(|p| p.id.as_str());
        let after_mark = sql_ordinal(watermark.order)?;
        let (order, comparison) = if window.newer {
            ("ASC", ">")
        } else if include_first {
            ("DESC", "<=")
        } else {
            ("DESC", "<")
        };
        let select = format!(
            "WITH selected AS MATERIALIZED (
                SELECT p.* {PAGE_FILTER} AND {EVENT_SCOPE}
                AND (p.position,p.event_id)<=($6,$7)
                AND ($8::bigint IS NULL OR (p.position,p.event_id){comparison}($8,$9::text))
                ORDER BY p.position {order},p.event_id {order} LIMIT $10)
             SELECT p.position,p.event_id,p.payload,{} AS account FROM selected p
             ORDER BY p.position {order},p.event_id {order}",
            self.schema.transcript_account
        );
        let all = [
            params[0],
            params[1],
            params[2],
            params[3],
            params[4],
            &after_mark,
            &watermark.id,
            &cutoff_order,
            &cutoff_id,
            &offered,
        ];
        admitted_query(tx, &select, &all, &self.budget).await
    }
}

impl EventFeedRows {
    pub(crate) fn needs_preparation(&self) -> bool {
        matches!(&self.0, FeedInput::Raw { rows, .. } if !rows.is_empty())
    }

    pub(crate) fn prepare(
        self,
        language: &LanguageProvider,
        budget: &ByteBudget,
    ) -> StoreResult<EventFeed> {
        let (actor, mut rows, window, _transfer) = match self.0 {
            FeedInput::Matched(feed) => return Ok(feed),
            FeedInput::Raw {
                actor,
                rows,
                window,
                _transfer,
            } => (actor, rows, window, _transfer),
        };
        let more = rows.len() > window.limit;
        rows.truncate(window.limit);
        let mut owned = event_rows_capacity(rows.len(), budget)?;
        let mut events = Vec::with_capacity(rows.len());
        for row in rows {
            events.push(prepare_event_row(
                &row, &actor, language, budget, &mut owned,
            )?);
        }
        let continuing = if more {
            events.last().map(|row| row.edge.clone())
        } else {
            None
        };
        Ok(window.finish(events, continuing, false, None, owned))
    }
}

impl EventWindow {
    fn finish(
        self,
        mut events: Vec<RetainedEventRow>,
        continuing: Option<EventEdge>,
        scanned_window: bool,
        extra_match: Option<RetainedEventRow>,
        custody: ByteReservation,
    ) -> EventFeed {
        if !self.newer {
            events.reverse();
        }
        let low = events.first().map(|event| &event.edge);
        let high = events
            .last()
            .map(|event| &event.edge)
            .or(self.before.as_ref());
        let page = |edge: &EventEdge, newer| {
            self.watermark.as_ref().map(|watermark| EventBoundary {
                watermark: watermark.clone(),
                before: edge.clone(),
                newer,
            })
        };
        let older = if self.newer {
            low.filter(|_| self.before.is_some())
                .and_then(|edge| page(edge, false))
        } else {
            continuing.as_ref().and_then(|edge| page(edge, false))
        };
        let newer = if self.newer {
            continuing.as_ref().and_then(|edge| page(edge, true))
        } else if self.show_newer
            && high
                .zip(self.watermark.as_ref())
                .is_some_and(|(a, b)| a < b)
        {
            high.and_then(|edge| page(edge, true))
        } else {
            None
        };
        EventFeed {
            events,
            older,
            newer,
            scanned_window,
            extra_match,
            _custody: custody,
        }
    }
}

impl EventSourcesRows {
    pub(crate) fn is_empty(&self) -> bool {
        self.rows.is_empty()
    }

    pub(crate) fn prepare(
        self,
        language: &LanguageProvider,
        budget: &ByteBudget,
    ) -> StoreResult<EventSources> {
        let mut custody = event_rows_capacity(self.rows.len(), budget)?;
        let mut rows = Vec::with_capacity(self.rows.len());
        for row in &self.rows {
            let body = prepare_event_row(row, &self.actor, language, budget, &mut custody)?;
            let correction = row.try_get(4)?;
            rows.push((body, correction));
        }
        Ok(EventSources {
            rows,
            _custody: custody,
        })
    }
}

fn event_rows_capacity(rows: usize, budget: &ByteBudget) -> StoreResult<ByteReservation> {
    budget
        .reserve(2048 + rows * std::mem::size_of::<(RetainedEventRow, Option<String>)>())
        .map_err(|_| StoreError::Capacity)
}

fn prepare_event_row(
    row: &Row,
    actor: &str,
    language: &LanguageProvider,
    budget: &ByteBudget,
    custody: &mut ByteReservation,
) -> StoreResult<RetainedEventRow> {
    let edge = EventEdge::read(row)?;
    let pointer = row.try_get::<_, &str>(2)?;
    let body = row
        .try_get::<_, Option<&str>>(3)?
        .ok_or(StoreError::InvalidRecord)?;
    let charge = SqlCell::json_decode_bound(pointer)
        .and_then(|used| used.checked_add(SqlCell::json_decode_bound(body)?))
        .and_then(|used| used.checked_add(4096))
        .and_then(|used| custody.bytes().checked_add(used))
        .ok_or(StoreError::Capacity)?;
    custody.resize(charge).map_err(|_| StoreError::Capacity)?;
    let (time, revision, proof) = retained_event(
        &edge.id,
        sql_ordinal(edge.order)?,
        pointer,
        body,
        actor,
        language,
        budget,
    )?;
    let (event, temporal) = match proof {
        VerifiedEventBody::Awareness(body) => (
            RetainedPlayerEvent::awareness(edge.id.clone(), time, body, actor),
            None,
        ),
        VerifiedEventBody::Temporal {
            values,
            receipt,
            received_at,
        } => (
            RetainedPlayerEvent::temporal(edge.id.clone(), time, values, actor),
            Some((receipt, received_at)),
        ),
    };
    Ok(RetainedEventRow {
        edge,
        event: event.map_err(|_| StoreError::InvalidRecord)?,
        temporal,
        revision: revision.to_owned(),
    })
}
