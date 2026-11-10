//! The source actor-history boundary creates an empty history only for a real
//! memory-capable actor. A new physical life retires the previous received
//! owner before changing its epoch; existing history and charges survive.

use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::ByteBudget;
use crate::host::retained_size::map_storage;

pub(crate) fn ensure_temporal_actor(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    let Some(entity) = core.state.physical.entities.get(actor_id) else {
        return Ok(false);
    };
    if !entity.has_memory() {
        return Ok(false);
    }
    let life = entity.physical_life().ok_or(ExecutionError::MissingActor)?;
    let previous_life = core
        .state
        .temporal
        .actor(actor_id)
        .map(|actor| actor.header.physical_life);
    if previous_life == Some(life) {
        return Ok(true);
    }
    if let Some(old_life) = previous_life {
        if core
            .state
            .reception
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(actor_id))
            .is_some_and(|owner| owner.life == old_life)
        {
            crate::reception::retire_perception_life(core, actor_id, old_life, budget)?;
        }
    }
    install_temporal_actor_life(
        &mut core.state.temporal,
        &mut core.state.physical,
        actor_id,
        life,
        previous_life,
        budget,
    )
}

// The CoreMutation wrapper above performs old-life retirement. A first personal
// knowledge admission uses this same factory only when no history owner exists.
pub(super) fn install_temporal_actor_life(
    temporal: &mut TemporalState,
    physical: &mut crate::simulation::PhysicalState,
    actor_id: &str,
    life: u64,
    previous_life: Option<u64>,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    let old_capacity = temporal.actors.capacity();
    let new_capacity = if previous_life.is_none() && temporal.actors.len() == old_capacity {
        old_capacity
            .checked_mul(2)
            .and_then(|n| n.checked_add(1))
            .ok_or(ExecutionError::Capacity)?
    } else {
        old_capacity
    };
    let existing_bytes = temporal
        .actor(actor_id)
        .map_or(0, |actor| actor.payload.len());
    let allocation = actor_id
        .len()
        .checked_mul(32)
        .and_then(|n| n.checked_add(temporal.header.namespace.len().checked_mul(16)?))
        .and_then(|n| n.checked_add(existing_bytes.checked_mul(4)?))
        .and_then(|n| n.checked_add(2048))
        .and_then(|n| {
            n.checked_add(
                map_storage::<String, TemporalActorHistory>(new_capacity)?
                    .checked_sub(map_storage::<String, TemporalActorHistory>(old_capacity)?)?,
            )
        })
        .and_then(|n| n.checked_add(std::mem::size_of::<TemporalUndo>().checked_mul(3)?))
        .ok_or(ExecutionError::Capacity)?;
    let reservation = budget.reserve(allocation)?;
    temporal.reserve_undo_slots(3, budget)?;
    if new_capacity > old_capacity {
        temporal.reserve_actor_capacity(new_capacity)?;
    }
    // All capacity admission precedes the source's one receipt-epoch allocation.
    let issued = physical.identity.allocate("receipt-epoch")?;
    let epoch = format!("{}-{}", temporal.header.namespace, issued.id);
    temporal.undo.push(TemporalUndo::Reservation(reservation));
    if previous_life.is_some() {
        let mut header = temporal
            .actors
            .get(actor_id)
            .ok_or(ExecutionError::Invariant)?
            .header
            .clone();
        header.physical_life = life;
        header.epoch = epoch;
        header.terminal_reserved_bytes = 0;
        temporal.replace_header(actor_id, header)?;
    } else {
        let header = TemporalActorHeader {
            physical_life: life,
            epoch,
            pages: [],
            bytes: 0,
            count: 0,
            terminal_reserved_bytes: 0,
            next_due: None,
            maintenance_due: false,
            released_through: None,
            frontier: None,
            recording_gap: None,
            accounts: None,
            supports: None,
        };
        let payload: Arc<str> =
            Arc::from(json_record(&header).map_err(|_| ExecutionError::Invariant)?);
        let header_storage = budget.reserve_record(
            header
                .heap_bytes()
                .and_then(|n| n.checked_add(payload.len() + 2 * std::mem::size_of::<usize>()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let supports = super::super::TemporalSupportCollection::new_empty(actor_id, budget)?;
        let next = temporal
            .actor_coverage
            .next_ordinal
            .max(temporal.actors.len() as u64 + 1);
        temporal.undo.push(TemporalUndo::CreatedActor {
            actor_id: actor_id.to_owned(),
            before_next: temporal.actor_coverage.next_ordinal,
        });
        temporal.actor_coverage.next_ordinal = next;
        temporal.actors.insert(
            actor_id.to_owned(),
            TemporalActorHistory {
                actor_storage: budget.reserve_record(
                    actor_id
                        .len()
                        .checked_mul(2)
                        .ok_or(ExecutionError::Capacity)?,
                )?,
                actor_id: actor_id.to_owned(),
                header,
                payload,
                header_storage,
                pages: BTreeMap::new(),
                complete_pages: true,
                page_order_upper_bound: physical.identity.next_id(),
                tail: ReceiptTailState::empty(),
                recent: ReceivedRecentDirectory::new(budget)?,
                pending_pages: Vec::new(),
                pending_storage: budget.reserve_backing(0)?,
                supports: Some(supports),
                page_storage: budget.reserve_backing(0)?,
            },
        );
    }
    Ok(true)
}
