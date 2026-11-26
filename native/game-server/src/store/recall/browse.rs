//! Bounded literal search over one actor's indexed recollections. A selected
//! row grants only an exact source reference for the native history reader.

use super::source_kind;
use crate::{
    language::{LanguageError, LanguageProvider},
    store::{Store, StoreError, StoreResult, durable_head, read::admitted_query, sql_ordinal},
};
use openlegend_simulation::{
    encoding::json_tree_allocation_bound,
    experience::{PersonalSourceKind, PersonalSourceRef},
    host::ByteReservation,
    text::JsText,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

mod evidence;
mod inspection;
mod person_editor;
pub(crate) mod promises;
pub(crate) mod trade;

pub(crate) const EVIDENCE_PAGE: usize = 10;
const PAGE: usize = 20;
const CHUNK: usize = 250;
const SCAN: usize = 2000;

#[derive(Clone, Serialize, Deserialize)]
pub(crate) struct MemoryPosition {
    pub(crate) at: f64,
    pub(crate) id: String,
    pub(crate) kind: PersonalSourceKind,
}

pub(crate) struct MemoryBrowseCut {
    pub(crate) world: String,
    pub(crate) generation: String,
    pub(crate) actor: String,
    pub(crate) revision: u64,
    pub(crate) privacy_revision: u64,
    pub(crate) at: f64,
    pub(crate) identity_through: u64,
    pub(crate) _custody: ByteReservation,
}

pub(crate) struct MemorySearch {
    pub(crate) words: Vec<String>,
    pub(crate) language: Arc<LanguageProvider>,
    pub(crate) _custody: ByteReservation,
}

pub(crate) struct MemoryPage {
    pub(crate) references: Vec<PersonalSourceRef>,
    pub(crate) next: Option<MemoryPosition>,
    pub(crate) scan_limited: bool,
    pub(crate) custody: ByteReservation,
}

fn decode_kind(kind: &str) -> StoreResult<PersonalSourceKind> {
    match kind {
        "awareness" => Ok(PersonalSourceKind::Awareness),
        "memory" => Ok(PersonalSourceKind::Memory),
        "summary" => Ok(PersonalSourceKind::Summary),
        _ => Err(StoreError::InvalidRecord),
    }
}

fn position(row: &tokio_postgres::Row) -> StoreResult<MemoryPosition> {
    let at: f64 = row.try_get(0)?;
    let id: &str = row.try_get(1)?;
    if !at.is_finite() || !openlegend_simulation::values::is_safe_record_id(id) {
        return Err(StoreError::InvalidRecord);
    }
    Ok(MemoryPosition {
        at,
        id: id.to_owned(),
        kind: decode_kind(row.try_get(2)?)?,
    })
}

// The replaceable search projection is normally enough. A cold projection
// reads only that exact canonical body, still in this repeatable-read cut.
const SELECT: &str = "
    SELECT r.at,r.id,r.source_kind,r.revision,r.acquisition,
        CASE WHEN $7 THEN r.search_text END,
        CASE WHEN $7 AND r.search_text='' THEN CASE r.source_kind
            WHEN 'awareness' THEN (SELECT payload FROM mind_awareness m
                WHERE m.world_id=r.world_id AND m.actor_id=r.actor_id AND m.id=r.record_id)
            WHEN 'memory' THEN (SELECT payload FROM mind_memories m
                WHERE m.world_id=r.world_id AND m.actor_id=r.actor_id AND m.id=r.record_id)
            WHEN 'summary' THEN (SELECT payload FROM mind_summaries m
                WHERE m.world_id=r.world_id AND m.actor_id=r.actor_id AND m.id=r.record_id)
        END END
    FROM recall_sources r
    WHERE r.world_id=$1 AND r.actor_id=$2 AND r.eligible=1 AND r.at<=$3
      AND (r.source_kind<>'awareness' OR r.at<$3 OR r.sequence<=$4)
      AND ($5::double precision IS NULL OR (r.at,r.id,r.source_kind)<($5,$6,$8))
    ORDER BY r.at DESC,r.id DESC,r.source_kind DESC LIMIT $9";

impl Store {
    /// Capture all selected continuation keys in a single SQL snapshot.
    /// The caller still checks the original tab and admits each displayed
    /// body against its native observer before sending a response.
    pub(crate) async fn browse_recollections(
        &self,
        cut: Arc<MemoryBrowseCut>,
        mut before: Option<MemoryPosition>,
        search: Option<MemorySearch>,
        thoughts: bool,
    ) -> StoreResult<MemoryPage> {
        let budget = self.budget.clone();
        self.read_operational(move |tx| {
            Box::pin(async move {
                let head = durable_head(tx).await?.ok_or(StoreError::StaleCut)?;
                if head.world_id != cut.world
                    || head.generation != cut.generation
                    || head.revision != cut.revision
                {
                    return Err(StoreError::StaleCut);
                }
                let identity = sql_ordinal(cut.identity_through)?;
                let mut custody = budget.reserve(4096).map_err(|_| StoreError::Capacity)?;
                let mut references = Vec::with_capacity(PAGE);
                let mut last_match = None;
                let mut remaining = if thoughts || search.is_some() {
                    SCAN
                } else {
                    PAGE
                };
                let selected_text = search.is_some();
                let limited = loop {
                    let count = remaining.min(CHUNK);
                    let final_chunk = count == remaining;
                    let limit = i64::try_from(count + usize::from(final_chunk))
                        .map_err(|_| StoreError::Capacity)?;
                    let (_transfer, rows) = admitted_query(
                        tx,
                        SELECT,
                        &[
                            &cut.world,
                            &cut.actor,
                            &cut.at,
                            &identity,
                            &before.as_ref().map(|value| value.at),
                            &before.as_ref().map(|value| value.id.as_str()),
                            &selected_text,
                            &before.as_ref().map(|value| source_kind(value.kind)),
                            &limit,
                        ],
                        &budget,
                    )
                    .await?;
                    for row in rows.iter().take(count) {
                        let family: &str = row.try_get(2)?;
                        let kind = decode_kind(family)?;
                        if thoughts
                            && (kind != PersonalSourceKind::Memory
                                || row.try_get::<_, Option<&str>>(4)? != Some("self_thought"))
                        {
                            continue;
                        }
                        if let Some(search) = &search {
                            let text: &str = row.try_get(5)?;
                            let (displayed, _body) = if text.is_empty() {
                                let payload: &str = row.try_get(6)?;
                                let held = budget
                                    .reserve(
                                        json_tree_allocation_bound(payload)
                                            .ok_or(StoreError::Capacity)?,
                                    )
                                    .map_err(|_| StoreError::Capacity)?;
                                (
                                    crate::store::known_places::source_text(family, payload)?,
                                    held,
                                )
                            } else {
                                let held = budget
                                    .reserve(text.len().saturating_mul(4) + 128)
                                    .map_err(|_| StoreError::Capacity)?;
                                (JsText::from(text), held)
                            };
                            if !search.matches(&displayed, &budget)? {
                                continue;
                            }
                        }
                        if references.len() == PAGE {
                            return Ok(MemoryPage {
                                references,
                                next: last_match,
                                scan_limited: false,
                                custody,
                            });
                        }
                        let revision: &str = row.try_get(3)?;
                        let record = position(row)?;
                        let reference = PersonalSourceRef {
                            kind,
                            id: record.id.clone(),
                            revision: revision.to_owned(),
                        };
                        if !reference.validate() {
                            return Err(StoreError::InvalidRecord);
                        }
                        custody
                            .resize(custody.bytes() + reference.id.len() * 2 + revision.len())
                            .map_err(|_| StoreError::Capacity)?;
                        references.push(reference);
                        last_match = Some(record);
                    }
                    before = rows
                        .iter()
                        .take(count)
                        .last()
                        .map(position)
                        .transpose()?
                        .or(before);
                    if final_chunk || rows.len() < count {
                        break final_chunk && rows.len() > count;
                    }
                    remaining -= count;
                };
                let scan_limited = limited && (thoughts || selected_text);
                let next = if scan_limited {
                    before
                } else if limited {
                    last_match
                } else {
                    None
                };
                Ok(MemoryPage {
                    references,
                    next,
                    scan_limited,
                    custody,
                })
            })
        })
        .await
    }
}

impl MemorySearch {
    pub(crate) fn matches(
        &self,
        text: &JsText,
        budget: &openlegend_simulation::host::ByteBudget,
    ) -> StoreResult<bool> {
        self.language
            .matches_word_prefixes(&self.words, [text], budget)
            .map_err(|error| match error {
                LanguageError::Capacity => StoreError::Capacity,
                _ => StoreError::InvalidRecord,
            })
    }
}
