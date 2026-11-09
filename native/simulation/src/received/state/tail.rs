//! The receipt cutoff uses the physical history tail, including expired blocks.
//! Eligibility directories cannot reconstruct it. A cold predecessor remains
//! explicitly missing until the fixed-cut SQL overlay supplies its real tail.
use super::*;
use crate::identity::MAX_SAFE_INTEGER;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct TemporalReceiptTail {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub batch_order: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub entry_index: u64,
}
#[derive(Clone, Copy, Debug)]
pub(super) struct ReceiptTailState {
    // Some(None) certifies an empty physical history; None requests its tail.
    last: Option<Option<TemporalReceiptTail>>,
    revision: u64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TemporalReceiptPrefix<'a> {
    pub physical_life: u64,
    pub epoch: Option<&'a str>,
    pub through_batch_order: i64,
    pub through_entry_index: i64,
    pub through_order: u64,
}
/// The enclosing accepted read binds world/generation/cut. These fields bind the
/// requested actor and its actual tail state across that read's SQL suspension.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TemporalReceiptTailRequest<'a> {
    pub actor_id: &'a str,
    pub physical_life: u64,
    pub epoch: &'a str,
    pub tail_revision: u64,
}

fn page_tail(page: &TemporalPageRecord) -> Option<TemporalReceiptTail> {
    Some(TemporalReceiptTail {
        batch_order: page.metadata().last_batch_order?,
        entry_index: page.metadata().last_entry?,
    })
}
fn maximum(tails: impl Iterator<Item = TemporalReceiptTail>) -> Option<TemporalReceiptTail> {
    tails.max_by_key(|tail| (tail.batch_order, tail.entry_index))
}
impl ReceiptTailState {
    pub(super) fn installed(
        pages: &BTreeMap<u64, Arc<TemporalPageRecord>>,
        closed_tail: bool,
    ) -> Self {
        Self {
            last: closed_tail.then(|| maximum(pages.values().filter_map(|p| page_tail(p)))),
            revision: 0,
        }
    }
    pub(super) fn empty() -> Self {
        Self {
            last: Some(None),
            revision: 0,
        }
    }
    pub(super) fn appended(self, tail: TemporalReceiptTail) -> Result<Self, ReceivedError> {
        if self.last.flatten().is_some_and(|prior| {
            (tail.batch_order, tail.entry_index) <= (prior.batch_order, prior.entry_index)
        }) {
            return Err(ReceivedError(
                "Temporal append precedes its actual history tail.",
            ));
        }
        Ok(Self {
            last: Some(Some(tail)),
            revision: self
                .revision
                .checked_add(1)
                .filter(|n| *n <= MAX_SAFE_INTEGER)
                .ok_or(ReceivedError("Temporal tail revision overflow."))?,
        })
    }
    pub(super) fn edited(
        self,
        before: &TemporalPageRecord,
        after: Option<&TemporalPageRecord>,
        actor: &TemporalActorHistory,
    ) -> Result<Self, ReceivedError> {
        let revision = self
            .revision
            .checked_add(1)
            .filter(|n| *n <= MAX_SAFE_INTEGER)
            .ok_or(ReceivedError("Temporal tail revision overflow."))?;
        let changes_tail = self.last.flatten().is_some_and(|tail| {
            page_tail(before) == Some(tail) && after.and_then(page_tail) != Some(tail)
        });
        let last = if changes_tail {
            if actor.complete_pages {
                Some(maximum(
                    actor
                        .pages
                        .values()
                        .filter(|page| page.position() != before.position())
                        .filter_map(|page| page_tail(page))
                        .chain(after.and_then(page_tail))
                        .chain(actor.pending_pages.iter().filter_map(|page| {
                            let batch = page.batch();
                            Some(TemporalReceiptTail {
                                batch_order: batch.batch_order,
                                entry_index: batch.entries.last()?.entry_index,
                            })
                        })),
                ))
            } else {
                // The old last block can be the entire loaded byte-tail. A
                // surviving recent entry is not proof of the cold predecessor.
                None
            }
        } else {
            self.last
        };
        Ok(Self { last, revision })
    }
}
impl TemporalState {
    pub(crate) fn receipt_prefix(
        &self,
        actor_id: &str,
        through_order: u64,
    ) -> Result<TemporalReceiptPrefix<'_>, TemporalReceiptTailRequest<'_>> {
        let Some(actor) = self.actors.get(actor_id) else {
            return Ok(TemporalReceiptPrefix {
                physical_life: 0,
                epoch: None,
                through_batch_order: -1,
                through_entry_index: -1,
                through_order,
            });
        };
        let Some(last) = actor.tail.last else {
            return Err(TemporalReceiptTailRequest {
                actor_id: &actor.actor_id,
                physical_life: actor.header.physical_life,
                epoch: &actor.header.epoch,
                tail_revision: actor.tail.revision,
            });
        };
        Ok(TemporalReceiptPrefix {
            physical_life: actor.header.physical_life,
            epoch: Some(&actor.header.epoch),
            through_batch_order: last.map_or(-1, |tail| tail.batch_order as i64),
            through_entry_index: last.map_or(-1, |tail| tail.entry_index as i64),
            through_order,
        })
    }

    /// Only the enclosing fixed-cut reader may call this after validating its
    /// actual indexed SQL+unsaved row projection. This changes derived residency
    /// metadata, never a saved receipt, epoch, eligibility frontier or identity.
    pub(crate) fn resolve_receipt_tail(
        &mut self,
        request: &TemporalReceiptTailRequest<'_>,
        tail: Option<TemporalReceiptTail>,
        through_order: u64,
    ) -> Result<(), ReceivedError> {
        let actor = self
            .actors
            .get_mut(request.actor_id)
            .ok_or(ReceivedError("Temporal tail owner is absent."))?;
        if !self.undo.is_empty()
            || actor.header.physical_life != request.physical_life
            || actor.header.epoch != request.epoch
            || actor.tail.revision != request.tail_revision
            || actor.tail.last.is_some()
            || through_order > MAX_SAFE_INTEGER
            || tail.is_some_and(|tail| {
                tail.batch_order >= through_order || tail.entry_index > MAX_SAFE_INTEGER
            })
        {
            return Err(ReceivedError(
                "Temporal tail witness differs from its accepted read.",
            ));
        }
        let resident = maximum(
            actor
                .pages
                .values()
                .filter_map(|page| page_tail(page))
                .chain(actor.pending_pages.iter().filter_map(|page| {
                    let batch = page.batch();
                    Some(TemporalReceiptTail {
                        batch_order: batch.batch_order,
                        entry_index: batch.entries.last()?.entry_index,
                    })
                })),
        );
        if resident.is_some_and(|resident| {
            tail.is_none_or(|tail| {
                (tail.batch_order, tail.entry_index) < (resident.batch_order, resident.entry_index)
            })
        }) {
            return Err(ReceivedError(
                "Temporal tail witness omits resident receipts.",
            ));
        }
        actor.tail.last = Some(tail);
        Ok(())
    }
}
