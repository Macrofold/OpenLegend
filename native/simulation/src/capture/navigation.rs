//! The clock's preparation notice is the real navigation read. It checks all
//! non-retained refuge candidates; one immediately usable candidate cannot hide
//! a different candidate that still needs a route worker.
use super::*;
use crate::geometry::{GeometryQueries, RouteQuery};
use crate::host::retained_size::heap_sum;
use crate::native_response::{NativeRefugeProposal, NavigationWait};

pub(super) fn prepare(
    state: &SimulationState,
    queries: &mut GeometryQueries,
    budget: &ByteBudget,
) -> Result<(bool, ByteReservation), ExecutionError> {
    let mut selected = Vec::<(&crate::state::Entity, &NativeRefugeProposal)>::new();
    let mut selected_guard = budget.reserve(0)?;
    for id in state.physical.entities.ordered_ids() {
        let entity = state
            .physical
            .entities
            .get(id)
            .ok_or(ExecutionError::Invariant)?;
        if crate::time::action_navigation_pending(
            entity,
            state.physical.header.sim_time,
            state.installed.geometry.spatial.revision,
            budget,
        )? {
            return Ok((true, budget.reserve(0)?));
        }
        let Some(animal) = entity.animal.as_ref() else {
            continue;
        };
        // This live family is refused by the selected installer and has no
        // proof command writer. Never interpret a supplied proposal as absent.
        if animal.foraging.is_some() {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let Some(proposal) = animal
            .episode
            .as_ref()
            .and_then(|episode| episode.proposal.as_ref())
        else {
            continue;
        };
        if proposal.wait == Some(NavigationWait::Entity) {
            continue;
        }
        let _profile = entity
            .spatial
            .soft_footprint
            .as_ref()
            .map(|_| budget.reserve(entity.ordinary_body_profile().id.len()))
            .transpose()?;
        let pin = &animal
            .episode
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .profile_pin;
        let key_bytes = crate::encoding::json_record_len(pin)
            .map_err(|_| ExecutionError::Invariant)?
            .checked_mul(2)
            .ok_or(ExecutionError::Capacity)?;
        let _profile_key = budget.reserve(key_bytes)?;
        if !crate::native_controller::proposal_current(&state.physical, &state.installed, id)? {
            continue;
        }
        if !proposal
            .candidates
            .iter()
            .any(|candidate| candidate.retained != Some(true))
        {
            continue;
        }
        selected_guard.resize(
            selected
                .len()
                .checked_add(1)
                .and_then(|n| {
                    n.checked_mul(size_of::<(&crate::state::Entity, &NativeRefugeProposal)>())
                })
                .ok_or(ExecutionError::Capacity)?,
        )?;
        selected
            .try_reserve_exact(1)
            .map_err(|_| ExecutionError::Capacity)?;
        selected.push((entity, proposal));
    }
    let mut count = 0usize;
    let mut bytes = 0usize;
    for (entity, proposal) in &selected {
        for candidate in &proposal.candidates {
            if candidate.retained == Some(true) {
                continue;
            }
            count = count.checked_add(1).ok_or(ExecutionError::Capacity)?;
            bytes = heap_sum([
                bytes,
                size_of::<RouteQuery>(),
                proposal
                    .origin
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                candidate
                    .point
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                entity.ordinary_body_profile().id.len(),
            ])
            .ok_or(ExecutionError::Capacity)?;
        }
    }
    let guard = budget.reserve(bytes)?;
    queries
        .routes
        .try_reserve_exact(count)
        .map_err(|_| ExecutionError::Capacity)?;
    for (entity, proposal) in selected {
        for candidate in &proposal.candidates {
            if candidate.retained != Some(true) {
                queries.routes.push(RouteQuery::Surface {
                    from: proposal.origin.clone(),
                    to: candidate.point.clone(),
                    body: entity.body_profile().into_owned(),
                });
            }
        }
    }
    Ok((false, guard))
}
