//! Read-only historical expansion borrows receipts admitted under the NPC's
//! original cut. Neither a historical subject nor a receipt grants a target.
use super::{CallFailure, RuntimeNpcBindingRequest, RuntimeNpcRead, capacity};
use crate::npc::decide::prepare;
use crate::world::HostedWorld;
use openlegend_simulation::{
    encoding::json_record_len,
    host::{ByteBudget, ByteReservation},
    received::TemporalChange,
    records::SqlCell,
};
use serde::Serialize;
use serde_json::Value;
use std::{collections::VecDeque, mem::size_of, sync::Arc};

mod value;

#[derive(Clone, Copy, PartialEq)]
struct Range {
    from: f64,
    through: f64,
}

struct HistoryRead {
    range: Range,
    source: Option<usize>,
    incomplete: bool,
    limit: u64,
    operations: u64,
}

pub(in crate::npc::decide) struct HistoryReads {
    reads: Vec<HistoryRead>,
    _custody: ByteReservation,
}

impl HistoryReads {
    pub(in crate::npc::decide) fn requested(questions: &[SqlCell]) -> bool {
        questions.iter().any(is_history)
    }

    pub(in crate::npc::decide) fn empty(budget: &ByteBudget) -> Result<Self, CallFailure> {
        Ok(Self {
            reads: Vec::new(),
            _custody: budget.reserve(0).map_err(super::super::response_capacity)?,
        })
    }

    /// The first response already chose one finite batch. A repeated range
    /// shares one exact read even if the questions ask about different subjects.
    pub(in crate::npc::decide) async fn prepare(
        world: &Arc<HostedWorld>,
        mut original: Box<RuntimeNpcRead>,
        current: &RuntimeNpcRead,
        binding: &RuntimeNpcBindingRequest,
        questions: &[SqlCell],
        budget: &ByteBudget,
    ) -> Result<(Box<RuntimeNpcRead>, Self), CallFailure> {
        let mut reads = Vec::<HistoryRead>::new();
        let mut custody = budget.reserve(0).map_err(super::super::response_capacity)?;
        for question in questions.iter().filter(|question| is_history(question)) {
            let Some((range, _)) = selection(question, &original, current, binding)? else {
                continue;
            };
            if reads.iter().any(|read| read.range == range) {
                continue;
            }
            custody
                .resize((reads.len() + 1) * size_of::<HistoryRead>())
                .map_err(super::super::response_capacity)?;
            reads.try_reserve_exact(1).map_err(|_| capacity())?;
            let (next, source, incomplete, limit, operations) = world
                .read_npc_history(original, range.from, range.through)
                .await
                .map_err(|error| prepare::binding_failure(error).at("situation-history-storage"))?;
            original = next;
            reads.push(HistoryRead {
                range,
                source,
                incomplete,
                limit,
                operations,
            });
        }
        Ok((
            original,
            Self {
                reads,
                _custody: custody,
            },
        ))
    }

    pub(super) fn answer(
        &self,
        original: &RuntimeNpcRead,
        current: &RuntimeNpcRead,
        binding: &RuntimeNpcBindingRequest,
        question: &SqlCell,
        budget: &ByteBudget,
        scope: &str,
        frame: &prepare::ReceivedFrame,
        maximum: usize,
    ) -> Result<HistoryPage, CallFailure> {
        let Some((range, subject)) = selection(question, original, current, binding)? else {
            return Ok(HistoryPage {
                status: Some("unavailable"),
                coverage: None,
                entries: None,
            });
        };
        let read = self
            .reads
            .iter()
            .find(|read| read.range == range)
            .ok_or(CallFailure::Invalid)?;
        let mut incomplete = read.incomplete;
        let mut entries = VecDeque::new();
        if let Some(inventory) = read.source {
            let (rows, unavailable) = original
                .query_receipts(inventory)
                .map_err(prepare::packet_failure)?;
            incomplete |= unavailable;
            let mut bytes = 0usize;
            let mut operations = read.operations;
            for (ordinal, selected) in rows.enumerate() {
                let receipt = selected.receipt();
                if receipt.at < range.from
                    || receipt.at > range.through
                    || subject.is_some_and(|track| {
                        receipt.header.subject != track
                            && !receipt
                                .header
                                .context_subjects
                                .as_ref()
                                .is_some_and(|others| others.iter().any(|value| value == track))
                    })
                {
                    continue;
                }
                let work = receipt.facets.len().max(1) as u64;
                if entries.len() as u64 == read.limit || work > operations {
                    incomplete = true;
                    break;
                }
                operations -= work;
                // The native source capture has its own custody. One proposed
                // row may allocate relative values and quoted text before it
                // can be measured against the remaining wire allowance.
                let row_bound = selected
                    .bytes()
                    .map_err(prepare::packet_failure)?
                    .checked_mul(16)
                    .and_then(|bytes| bytes.checked_add(512))
                    .ok_or_else(capacity)?;
                let mut storage = budget
                    .reserve(row_bound)
                    .map_err(super::super::response_capacity)?;
                let data = value::row(&selected, frame, scope, inventory, ordinal)?;
                let encoded = json_record_len(&data).map_err(|_| CallFailure::Invalid)?;
                let charge = encoded
                    .checked_add(usize::from(!entries.is_empty()))
                    .ok_or_else(capacity)?;
                if charge > maximum.saturating_sub(bytes) {
                    incomplete = true;
                    break;
                }
                // A strong custody stays with the row and any deque growth.
                storage
                    .resize(
                        row_bound
                            .checked_add(2 * size_of::<HistoryRow>())
                            .ok_or_else(capacity)?,
                    )
                    .map_err(super::super::response_capacity)?;
                entries.try_reserve(1).map_err(|_| capacity())?;
                bytes += charge;
                incomplete |= receipt.facets.is_empty()
                    && !matches!(
                        receipt.header.change,
                        TemporalChange::Occurrence | TemporalChange::ReceiverFrame
                    );
                entries.push_front(HistoryRow {
                    data,
                    inventory,
                    ordinal,
                    encoded,
                    _custody: storage,
                });
            }
        }
        Ok(HistoryPage {
            status: None,
            coverage: Some(if incomplete {
                "partial"
            } else {
                "selected-retained"
            }),
            entries: Some(entries),
        })
    }
}

fn is_history(value: &SqlCell) -> bool {
    value
        .as_object()
        .and_then(|item| item.get("kind"))
        .and_then(SqlCell::as_str)
        == Some("history")
}

fn selection<'a>(
    question: &SqlCell,
    original: &'a RuntimeNpcRead,
    current: &RuntimeNpcRead,
    binding: &RuntimeNpcBindingRequest,
) -> Result<Option<(Range, Option<&'a str>)>, CallFailure> {
    let fields = question.as_object().ok_or(CallFailure::Invalid)?;
    let time = |key| {
        fields
            .get(key)
            .and_then(SqlCell::as_f64)
            .ok_or(CallFailure::Invalid)
    };
    let mut range = Range {
        from: time("from")?,
        through: time("through")?,
    };
    if range.from > range.through {
        return Ok(None);
    }
    range.through = range.through.min(original.decision_origin().at);
    let track = match fields.get("subject").and_then(SqlCell::as_str) {
        None => None,
        Some(reference) => {
            let Some(track) = binding.received_history_track(original, current, reference) else {
                return Ok(None);
            };
            Some(track)
        }
    };
    Ok(Some((range, track)))
}

#[derive(Serialize)]
pub(super) struct HistoryPage {
    #[serde(skip_serializing_if = "Option::is_none")]
    status: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    coverage: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    entries: Option<VecDeque<HistoryRow>>,
}

#[derive(Serialize)]
struct HistoryRow {
    #[serde(flatten)]
    data: Value,
    #[serde(skip)]
    inventory: usize,
    #[serde(skip)]
    ordinal: usize,
    #[serde(skip)]
    encoded: usize,
    #[serde(skip)]
    _custody: ByteReservation,
}

impl HistoryPage {
    /// Keep the newest complete rows rather than emit an older partial quote.
    pub(super) fn trim(&mut self, mut excess: usize) -> usize {
        let Some(rows) = &mut self.entries else {
            return excess;
        };
        if self.coverage == Some("selected-retained") {
            excess = excess.saturating_sub("selected-retained".len() - "partial".len());
            self.coverage = Some("partial");
        }
        while excess != 0 {
            let Some(row) = rows.pop_front() else { break };
            excess = excess.saturating_sub(row.encoded + usize::from(!rows.is_empty()));
        }
        excess
    }

    pub(super) fn bind(&self, binding: &mut RuntimeNpcBindingRequest) -> Result<(), CallFailure> {
        for row in self.entries.iter().flatten() {
            let reference = row.data["reference"].as_str().ok_or(CallFailure::Invalid)?;
            binding
                .bind_query_receipt(reference, row.inventory, row.ordinal)
                .map_err(prepare::packet_failure)?;
        }
        Ok(())
    }
}
