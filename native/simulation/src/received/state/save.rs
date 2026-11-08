//! Changed header/support selection follows the actual temporal inverse journal.
//! Physical page packing belongs to the fixed save cut, not simulation steps.

use super::*;
use crate::host::ByteBudget;
use crate::host::retained_size::map_storage;
use crate::records::{RecordEncodingError, RecordLedger, RecordPlacement, RowEffects, RowEncoder};
use indexmap::IndexSet;
mod packing;
pub(crate) use packing::{TemporalSaveLimits, pack_temporal_save};

fn error() -> RecordEncodingError {
    RecordEncodingError("Temporal save requires exact current row ownership and byte allowance.")
}
pub(crate) fn encode_temporal_changes(
    state: &TemporalState,
    ledger: &RecordLedger,
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
    identity_through: u64,
) -> Result<(), RecordEncodingError> {
    if identity_through > crate::identity::MAX_SAFE_INTEGER {
        return Err(error());
    }
    let _selected = budget
        .reserve(
            map_storage::<&str, ()>(state.undo.len())
                .and_then(|bytes| {
                    bytes.checked_add(map_storage::<(&str, &str), bool>(state.undo.len())?)
                })
                .ok_or_else(error)?,
        )
        .map_err(|_| error())?;
    let mut actors = IndexSet::new();
    actors.try_reserve(state.undo.len()).map_err(|_| error())?;
    let mut supports = IndexMap::new();
    supports
        .try_reserve(state.undo.len())
        .map_err(|_| error())?;
    for operation in &state.undo {
        match operation {
            TemporalUndo::Header { actor_id, .. } => {
                actors.insert(actor_id.as_str());
            }
            TemporalUndo::Support {
                actor_id,
                id,
                before,
                ..
            } => {
                supports
                    .entry((actor_id.as_str(), id.as_str()))
                    .or_insert(before.is_some());
            }
            TemporalUndo::PendingAppend { .. } | TemporalUndo::Reservation(_) => {}
        }
    }
    for actor_id in actors {
        let actor = state.actors.get(actor_id).ok_or_else(error)?;
        let _temporary = budget
            .reserve(
                actor_id
                    .len()
                    .checked_mul(8)
                    .and_then(|bytes| bytes.checked_add(512))
                    .ok_or_else(error)?,
            )
            .map_err(|_| error())?;
        let id = json_record(&["world", "experience", "temporal", "actors", actor_id])
            .map_err(|_| error())?;
        let placement = ledger
            .placement("mind_temporal_actors", &id)
            .ok_or_else(error)?;
        let header = &actor.header;
        let pressure = header
            .frontier
            .as_ref()
            .and_then(|frontier| frontier.pressure_through.as_ref());
        let columns = [
            Value::from(actor_id),
            Value::from(header.next_due),
            Value::from(
                header
                    .frontier
                    .as_ref()
                    .and_then(|frontier| frontier.expired_through_time),
            ),
            Value::from(pressure.map(|pressure| pressure.address.batch_order)),
            Value::from(pressure.map(|pressure| pressure.address.entry_index)),
            Value::from(pressure.map(|pressure| pressure.address.member_index)),
            Value::from(pressure.map(|pressure| pressure.received_at)),
            Value::from(pressure.map(|pressure| pressure.order)),
            Value::from(header.bytes),
            Value::from(header.count),
        ]
        .map(Into::into);
        output.write_encoded(
            "mind_temporal_actors",
            placement,
            &actor.payload,
            &columns,
            false,
            RowEffects::default(),
        )?;
        output.observe_owner(&OwnerCoverage {
            table: "mind_temporal_pages".to_owned(),
            owner: id,
            complete: actor.complete_pages,
            next_ordinal: identity_through,
            parent_present: true,
        })?;
    }
    for ((actor_id, id), original) in supports {
        let actor = state.actors.get(actor_id).ok_or_else(error)?;
        let collection = actor.supports.as_ref().ok_or_else(error)?;
        output.observe_owner(&collection.coverage)?;
        let _temporary = budget
            .reserve(
                actor_id
                    .len()
                    .checked_add(id.len())
                    .and_then(|bytes| bytes.checked_mul(16))
                    .and_then(|bytes| bytes.checked_add(1024))
                    .ok_or_else(error)?,
            )
            .map_err(|_| error())?;
        if let Some(record) = collection.records.get(id) {
            let placement = RecordPlacement {
                id: record.row_id().to_owned(),
                parent: record.parent().to_owned(),
                slot: record.slot().to_owned(),
                position: record.position(),
            };
            let new =
                match ledger.presence("mind_temporal_supports", &placement.id, &placement.parent) {
                    Some(present) => !present,
                    None => {
                        if original {
                            return Err(error());
                        }
                        true
                    }
                };
            let capsule = record.capsule();
            let locator = &capsule.receipt.locator;
            let columns = [
                Value::from(actor_id),
                Value::from(id),
                Value::from(capsule.bytes),
                Value::from(u64::from(capsule.required)),
                Value::from(crate::encoding::sha256_hex(record.payload().as_bytes())),
                Value::from(locator.physical_life),
                Value::from(locator.epoch.clone()),
                Value::from(locator.batch_order),
                Value::from(locator.entry_index),
            ]
            .map(Into::into);
            output.write_encoded(
                "mind_temporal_supports",
                &placement,
                record.payload(),
                &columns,
                new,
                RowEffects::default(),
            )?;
        } else {
            let row_id = json_record(&[
                "world",
                "experience",
                "temporal",
                "actors",
                actor_id,
                "supports",
                id,
            ])
            .map_err(|_| error())?;
            output.delete("mind_temporal_supports", &row_id, false)?;
        }
    }
    Ok(())
}
