//! Exact retained-source membership after the privacy reader has closed and
//! hydrated this source's selected pages. A directory range alone is no grant.
use super::*;
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::ReceivedValueLookup;
use std::mem::size_of;

struct FactAlias {
    id: String,
    ordinal: u64,
    _storage: ByteReservation,
}
fn invalid() -> ReceivedError {
    ReceivedError("Retained source membership is unavailable or exceeds its allowance.")
}
fn fact_alias(source: &str, budget: &ByteBudget) -> Result<Option<FactAlias>, ReceivedError> {
    if !source.starts_with("[\"perception-fact\",") {
        return Ok(None);
    }
    let mut storage =
        match crate::install::reserve_typed_parse::<(String, String, u64)>(source, 0, None, budget)
        {
            Ok(storage) => storage,
            Err(crate::install::InstallError::Capacity) => return Err(invalid()),
            Err(_) => return Ok(None),
        };
    let Ok((kind, id, ordinal)) = serde_json::from_str::<(String, String, u64)>(source) else {
        return Ok(None);
    };
    if kind != "perception-fact" || id.is_empty() || ordinal > crate::identity::MAX_SAFE_INTEGER {
        return Ok(None);
    }
    let _encoded = budget
        .reserve(
            crate::encoding::json_record_len(&("perception-fact", &id, ordinal))
                .map_err(|_| invalid())?
                .checked_mul(2)
                .ok_or_else(invalid)?,
        )
        .map_err(|_| invalid())?;
    if crate::experience::personal_fact_alias(&id, ordinal).map_err(|_| invalid())? != source {
        return Ok(None);
    }
    drop(kind);
    storage
        .resize(
            size_of::<FactAlias>()
                .checked_add(id.capacity())
                .ok_or_else(invalid)?,
        )
        .map_err(|_| invalid())?;
    Ok(Some(FactAlias {
        id,
        ordinal,
        _storage: storage,
    }))
}
impl TemporalState {
    /// False is meaningful only under the caller's closed privacy selection;
    /// missing unrelated lifetime pages never become a global negative proof.
    pub(crate) fn selected_source_retained(
        &self,
        actor_id: &str,
        source_id: &str,
        now: f64,
        max_age: f64,
        values: &impl ReceivedValueLookup,
        meaning: &dyn TemporalValueMeaning,
        budget: &ByteBudget,
    ) -> Result<bool, ReceivedError> {
        let Some(actor) = self.actor(actor_id) else {
            return Ok(false);
        };
        if let Some(supports) = actor.supports() {
            if !supports.coverage().complete {
                return Err(invalid());
            }
            for record in supports.records() {
                let capsule = record.capsule();
                if capsule.receipt.id == source_id {
                    return Ok(true);
                }
                let _aliases = budget
                    .reserve(
                        temporal_receipt_aliases_bound(&capsule.receipt, &capsule.values, meaning)
                            .ok_or_else(invalid)?,
                    )
                    .map_err(|_| invalid())?;
                if temporal_receipt_aliases(
                    &capsule.receipt,
                    values,
                    meaning,
                    Some(&capsule.values),
                )?
                .contains(source_id)
                {
                    return Ok(true);
                }
            }
        } else if actor.header().supports.is_some() {
            return Err(invalid());
        }
        let fact = fact_alias(source_id, budget)?;
        let _direct = budget
            .reserve(
                source_id
                    .len()
                    .checked_add(size_of::<ParsedTemporalReceiptId>())
                    .ok_or_else(invalid)?,
            )
            .map_err(|_| invalid())?;
        let direct = parse_temporal_receipt_id(fact.as_ref().map_or(source_id, |fact| &fact.id));
        let cutoff = now - max_age;
        let entry_retained =
            |batch: &ReceivedBatch, entry: &ReceivedEntry| -> Result<bool, ReceivedError> {
                if entry.received_at <= cutoff {
                    return Ok(false);
                }
                let eligible = |member_index| {
                    received_position_eligible(
                        &ReceivedPosition {
                            batch_order: batch.batch_order,
                            entry_index: entry.entry_index,
                            member_index,
                        },
                        entry.received_at,
                        actor.header().frontier.as_ref(),
                    )
                };
                if let Some(direct) = &direct {
                    if batch.epoch != direct.epoch
                        || batch.batch_order != direct.batch_order
                        || entry.entry_index != direct.entry_index
                    {
                        return Ok(false);
                    }
                    let _locator = budget
                        .reserve(
                            batch
                                .actor_id
                                .len()
                                .checked_add(batch.epoch.len())
                                .and_then(|n| n.checked_mul(8))
                                .and_then(|n| n.checked_add(512))
                                .ok_or_else(invalid)?,
                        )
                        .map_err(|_| invalid())?;
                    if !actor
                        .recent()
                        .contains(&batch.locator(entry.entry_index), cutoff)
                    {
                        return Ok(false);
                    }
                    return Ok(if let Some(fact) = &fact {
                        entry.receipt.facets.iter().any(|field| {
                            field.member_index == fact.ordinal && eligible(field.member_index)
                        })
                    } else if entry.receipt.facets.is_empty() {
                        eligible(0)
                    } else {
                        entry
                            .receipt
                            .facets
                            .iter()
                            .any(|field| eligible(field.member_index))
                    });
                }
                if !entry
                    .receipt
                    .facets
                    .iter()
                    .any(|field| eligible(field.member_index))
                {
                    return Ok(false);
                }
                let _expanded = budget
                    .reserve(selection::receipt_expansion_bound(batch, entry)?)
                    .map_err(|_| invalid())?;
                let receipt = materialize_received_receipt(batch, entry, None)?;
                let _aliases = budget
                    .reserve(
                        alias_allocation::temporal_receipt_lookup_aliases_bound(
                            &receipt, values, meaning,
                        )
                        .ok_or_else(invalid)?,
                    )
                    .map_err(|_| invalid())?;
                Ok(temporal_receipt_aliases(&receipt, values, meaning, None)?.contains(source_id))
            };
        for page in actor.pages() {
            for batch in page.batches() {
                for entry in &batch.entries {
                    if entry_retained(batch, entry)? {
                        return Ok(true);
                    }
                }
            }
        }
        for page in actor.pending_pages() {
            for entry in &page.batch().entries {
                if entry_retained(page.batch(), entry)? {
                    return Ok(true);
                }
            }
        }
        Ok(false)
    }
}
