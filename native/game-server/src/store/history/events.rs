//! An indexed page of the same durable personal accounts as Story. Original
//! occurrences supply the eligibility category only. Their body never leaves
//! PostgreSQL for a player history request.

use super::super::{
    DurableHead, Store, StoreError, StoreResult, durable_head, ordinal, read::admitted_query,
    sql_ordinal,
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

pub(crate) struct EventFeedRows {
    actor: String,
    rows: Vec<Row>,
    watermark: Option<EventEdge>,
    newer: bool,
    before: Option<EventEdge>,
    show_newer: bool,
    limit: usize,
    _transfer: ByteReservation,
}

pub(crate) struct EventFeed {
    pub events: Vec<(
        EventEdge,
        RetainedPlayerEvent,
        Option<(TemporalReceiptLocator, f64)>,
    )>,
    pub older: Option<EventBoundary>,
    pub newer: Option<EventBoundary>,
    _custody: ByteReservation,
}

impl EventFeed {
    pub(crate) fn projection_bytes(&self) -> Option<usize> {
        self._custody.bytes().checked_add(4096)?.checked_mul(2)
    }
}

const JOIN:&str="FROM history_perspectives p JOIN history_events e
 ON e.world_id=p.world_id AND e.id=p.event_id
 WHERE p.world_id=$1 AND p.actor_id=$2
   AND ((e.payload::jsonb->>'scope')='external'
     OR (e.payload::jsonb->>'type') IN ('encounter','contact','attribute-concern','attribute-changed'))
   AND ($3::text IS NULL OR p.event_type=$3)
   AND (p.event_type=ANY($4::text[]))=$5";

impl Store {
    /// Capture the original keyset and the actual SQL account bodies under one
    /// fixed repeatable read cut. Decode only after the shared reader is free.
    pub(crate) async fn event_feed(
        self: &Arc<Self>,
        head: DurableHead,
        actor: String,
        options: EventSourceQuery,
    ) -> StoreResult<EventFeedRows> {
        let store = self.clone();
        self.read_operational(move |tx| {
            Box::pin(async move {
                if durable_head(tx).await?.as_ref() != Some(&head) {
                    return Err(StoreError::StaleCut);
                }
                store.read_event_feed(tx, &head, actor, options).await
            })
        })
        .await
    }

    async fn read_event_feed(
        &self,
        tx: &Transaction<'_>,
        head: &DurableHead,
        actor: String,
        options: EventSourceQuery,
    ) -> StoreResult<EventFeedRows> {
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
        let params: [&(dyn ToSql + Sync); 5] = [
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
                    "SELECT p.position,p.event_id {JOIN}
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
            return Ok(EventFeedRows {
                actor,
                rows: Vec::new(),
                watermark: None,
                newer: false,
                before: None,
                show_newer: false,
                limit: 0,
                _transfer: self.budget.reserve(0).map_err(|_| StoreError::Capacity)?,
            });
        };
        let mut newer = options
            .boundary
            .as_ref()
            .is_some_and(|boundary| boundary.newer);
        let initial_anchor = if options.boundary.is_none() {
            if let Some(at) = options.at {
                let mut filter = params.to_vec();
                filter.push(&at);
                let anchor=tx.query_opt(&format!("SELECT p.position,p.event_id {JOIN}
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
        let show_newer = options.boundary.is_some() || options.at.is_some();
        let before = cutoff.cloned();
        let cutoff_order = cutoff.map(|p| sql_ordinal(p.order)).transpose()?;
        let cutoff_id = cutoff.map(|p| p.id.as_str());
        let after_mark = sql_ordinal(watermark.order)?;
        let offered = options.limit.checked_add(1).ok_or(StoreError::Capacity)?;
        let order = if newer { "ASC" } else { "DESC" };
        let comparison = if options
            .boundary
            .as_ref()
            .is_some_and(|boundary| boundary.newer)
        {
            ">"
        } else if options.boundary.is_some() {
            "<"
        } else {
            "<="
        };
        let select = format!(
            "WITH selected AS MATERIALIZED (
                SELECT p.* {JOIN}
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
        let (transfer, rows) = admitted_query(tx, &select, &all, &self.budget).await?;
        Ok(EventFeedRows {
            actor,
            rows,
            watermark: Some(watermark),
            newer,
            before,
            show_newer,
            limit: usize::try_from(options.limit).map_err(|_| StoreError::InvalidRecord)?,
            _transfer: transfer,
        })
    }
}

impl EventFeedRows {
    pub(crate) fn prepare(
        self,
        language: &LanguageProvider,
        budget: &ByteBudget,
    ) -> StoreResult<EventFeed> {
        let Self {
            actor,
            mut rows,
            watermark,
            newer,
            before,
            show_newer,
            limit,
            _transfer,
        } = self;
        let more = rows.len() > limit;
        rows.truncate(limit);
        let mut owned = budget
            .reserve(2048 + rows.len() * std::mem::size_of::<(EventEdge, RetainedPlayerEvent)>())
            .map_err(|_| StoreError::Capacity)?;
        let mut events = Vec::with_capacity(rows.len());
        for row in rows {
            let edge = EventEdge::read(&row)?;
            let pointer = row.try_get::<_, &str>(2)?;
            let body = row
                .try_get::<_, Option<&str>>(3)?
                .ok_or(StoreError::InvalidRecord)?;
            let charge = SqlCell::json_decode_bound(pointer)
                .and_then(|used| used.checked_add(SqlCell::json_decode_bound(body)?))
                .and_then(|used| used.checked_add(4096))
                .and_then(|used| owned.bytes().checked_add(used))
                .ok_or(StoreError::Capacity)?;
            owned.resize(charge).map_err(|_| StoreError::Capacity)?;
            let (time, proof) = retained_event(
                &edge.id,
                sql_ordinal(edge.order)?,
                pointer,
                body,
                &actor,
                language,
                budget,
            )?;
            let (event, temporal) = match proof {
                VerifiedEventBody::Awareness(body) => (
                    RetainedPlayerEvent::awareness(edge.id.clone(), time, body, &actor),
                    None,
                ),
                VerifiedEventBody::Temporal {
                    values,
                    receipt,
                    received_at,
                } => (
                    RetainedPlayerEvent::temporal(edge.id.clone(), time, values, &actor),
                    Some((receipt, received_at)),
                ),
            };
            events.push((
                edge,
                event.map_err(|_| StoreError::InvalidRecord)?,
                temporal,
            ));
        }
        if !newer {
            events.reverse();
        }
        let low = events.first().map(|event| &event.0);
        let high = events.last().map(|event| &event.0).or(before.as_ref());
        let page = |edge: &EventEdge, newer| {
            watermark.as_ref().map(|watermark| EventBoundary {
                watermark: watermark.clone(),
                before: edge.clone(),
                newer,
            })
        };
        let older = if (newer && before.is_some()) || (!newer && more) {
            low.and_then(|edge| page(edge, false))
        } else {
            None
        };
        let newest = if (newer && more)
            || (!newer && show_newer && high.zip(watermark.as_ref()).is_some_and(|(a, b)| a < b))
        {
            high.and_then(|edge| page(edge, true))
        } else {
            None
        };
        Ok(EventFeed {
            events,
            older,
            newer: newest,
            _custody: owned,
        })
    }
}
