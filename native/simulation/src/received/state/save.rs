//! Changed header/support selection follows the actual temporal inverse journal.
//! Physical page packing belongs to the fixed save cut, not simulation steps.

use super::*;
use crate::host::ByteBudget;
use crate::host::retained_size::map_storage;
use crate::records::{RecordEncodingError, RecordLedger, RecordPlacement, RowEffects, RowEncoder};
use indexmap::IndexSet;
mod packing;
pub(crate) use packing::{TemporalSaveLimits, pack_temporal_save, preview_temporal_rows};

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
    let projected_count = state
        .undo
        .iter()
        .try_fold(0usize, |n, operation| {
            n.checked_add(match operation {
                TemporalUndo::HydratedPages { projected, .. } => projected.len(),
                _ => 0,
            })
        })
        .ok_or_else(error)?;
    let page_count = state
        .undo
        .len()
        .checked_add(projected_count)
        .ok_or_else(error)?;
    let _selected = budget
        .reserve(
            map_storage::<&str, ()>(state.undo.len())
                .and_then(|bytes| {
                    bytes.checked_add(map_storage::<(&str, &str), bool>(state.undo.len())?)
                })
                .and_then(|bytes| {
                    bytes.checked_add(map_storage::<(&str, &str), (Option<u64>, bool)>(
                        page_count,
                    )?)
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
    let mut pages = IndexMap::new();
    pages.try_reserve(page_count).map_err(|_| error())?;
    let created = state
        .undo
        .iter()
        .any(|operation| matches!(operation, TemporalUndo::CreatedActor { .. }));
    for operation in &state.undo {
        match operation {
            TemporalUndo::Header { actor_id, .. } | TemporalUndo::CreatedActor { actor_id, .. } => {
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
            TemporalUndo::PendingAppend { .. } | TemporalUndo::Reservation(_) | TemporalUndo::Namespace { .. }
            | TemporalUndo::RecentRetirement { .. } => {}
            TemporalUndo::HydratedPages {
                actor_id,
                projected,
                ..
            } => {
                let actor = state.actors.get(actor_id).ok_or_else(error)?;
                for row_id in projected {
                    let position = actor
                        .pages
                        .values()
                        .find(|page| page.row_id() == row_id)
                        .map(|page| page.position());
                    pages
                        .entry((actor_id.as_str(), row_id.as_str()))
                        .or_insert((position, false));
                }
            }
            TemporalUndo::PageEdit {
                actor_id,
                before,
                after_position,
                ..
            } => {
                pages.insert(
                    (actor_id.as_str(), before.row_id()),
                    (*after_position, true),
                );
            }
        }
    }
    if state.undo.iter().any(|change|matches!(change,TemporalUndo::Namespace{..})) {
        let placement=ledger.placement("mind_temporal_state","[\"world\",\"experience\",\"temporal\"]").ok_or_else(error)?;
        output.write("mind_temporal_state",placement,&state.header,&[],false,RowEffects::default())?;
    }
    // Ordinary Source map insertion can shift existing numeric-key positions.
    // This finite owner is complete; no page or cold-body scan is involved.
    let _order = budget
        .reserve(
            state
                .actors
                .len()
                .checked_mul(std::mem::size_of::<&str>())
                .ok_or_else(error)?,
        )
        .map_err(|_| error())?;
    let mut ordered = Vec::new();
    ordered
        .try_reserve_exact(state.actors.len())
        .map_err(|_| error())?;
    ordered.extend(state.actors.keys().map(String::as_str));
    ordered.sort_by(|a, b| crate::encoding::js_property_cmp(a, b));
    if created {
        output.observe_owner(&state.actor_coverage)?;
    }
    for (position, actor_id) in ordered.into_iter().enumerate() {
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
        let prior = ledger.placement("mind_temporal_actors", &id);
        let placement;
        let placement = if created {
            placement = RecordPlacement {
                id: id.clone(),
                parent: state.actor_coverage.owner.clone(),
                slot: actor_id.to_owned(),
                position: position as u64,
            };
            &placement
        } else {
            prior.ok_or_else(error)?
        };
        if !actors.contains(actor_id)
            && prior.is_some_and(|prior| prior.position == placement.position)
        {
            continue;
        }
        let new = prior.is_none();
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
            new,
            RowEffects::default(),
        )?;
        output.observe_owner(&OwnerCoverage {
            table: "mind_temporal_pages".to_owned(),
            owner: id,
            complete: actor.complete_pages,
            next_ordinal: identity_through,
            parent_present: true,
        })?;
        if new {
            output.observe_owner(&actor.supports.as_ref().ok_or_else(error)?.coverage)?;
        }
    }
    let _support_actor_keys = budget
        .reserve(map_storage::<&str, ()>(supports.len()).ok_or_else(error)?)
        .map_err(|_| error())?;
    let support_actors = supports
        .keys()
        .map(|(actor, _)| *actor)
        .collect::<IndexSet<_>>();
    for actor_id in support_actors {
        let actor = state.actors.get(actor_id).ok_or_else(error)?;
        let collection = actor.supports.as_ref().ok_or_else(error)?;
        output.observe_owner(&collection.coverage)?;
        let ordered = crate::records::OrderedMapRows::new(&collection.records, budget)?;
        for (ordinal, id, record) in ordered.iter() {
            let original = supports.get(&(actor_id, id)).copied();
            let prior = ledger.placement("mind_temporal_supports", record.row_id());
            let position = if collection.coverage.complete {
                ordinal
            } else {
                prior.ok_or_else(error)?.position
            };
            if original.is_none() && prior.is_some_and(|prior| prior.position == position) {
                continue;
            }
            let _temporary = budget
                .reserve(
                    actor_id
                        .len()
                        .checked_add(id.len())
                        .and_then(|n| n.checked_mul(16))
                        .and_then(|n| n.checked_add(1024))
                        .ok_or_else(error)?,
                )
                .map_err(|_| error())?;
            let placement = RecordPlacement {
                id: record.row_id().to_owned(),
                parent: record.parent().to_owned(),
                slot: record.slot().to_owned(),
                position,
            };
            let new =
                match ledger.presence("mind_temporal_supports", &placement.id, &placement.parent) {
                    Some(present) => !present,
                    None if original == Some(false) => true,
                    None => return Err(error()),
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
        }
        for ((_, id), _) in supports.iter().filter(|((owner, _), _)| *owner == actor_id) {
            if !collection.records.contains_key(*id) {
                let _temporary = budget
                    .reserve(
                        actor_id
                            .len()
                            .checked_add(id.len())
                            .and_then(|n| n.checked_mul(8))
                            .and_then(|n| n.checked_add(128))
                            .ok_or_else(error)?,
                    )
                    .map_err(|_| error())?;
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
    }
    for ((actor_id, row_id), (position, logical_removal)) in pages {
        let actor = state.actors.get(actor_id).ok_or_else(error)?;
        if let Some(position) = position {
            let page = actor
                .pages
                .get(&position)
                .filter(|page| page.row_id() == row_id)
                .ok_or_else(error)?;
            let _temporary = budget
                .reserve(
                    row_id
                        .len()
                        .checked_mul(3)
                        .and_then(|n| n.checked_add(page.parent().len()))
                        .ok_or_else(error)?,
                )
                .map_err(|_| error())?;
            let placement = RecordPlacement {
                id: row_id.to_owned(),
                parent: page.parent().to_owned(),
                slot: page.slot().to_owned(),
                position,
            };
            let create = !ledger
                .presence("mind_temporal_pages", row_id, page.parent())
                .ok_or_else(error)?;
            output.write_encoded(
                "mind_temporal_pages",
                &placement,
                page.payload(),
                page.columns(),
                create,
                RowEffects {
                    logical_removal: Some(logical_removal),
                    ..RowEffects::default()
                },
            )?;
        } else {
            output.delete("mind_temporal_pages", row_id, false)?;
        }
    }
    Ok(())
}
