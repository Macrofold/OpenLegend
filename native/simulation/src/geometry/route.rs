//! Allocation custody for a finite physical route answer. Readiness and route
//! scoring consume this same provider product without granting movement.
use super::RoutePlan;
use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use std::mem::size_of;

pub(crate) struct GuardedRoutePlan(pub RoutePlan, pub ByteReservation);

pub(crate) fn route_plan(
    plan: RoutePlan,
    budget: &ByteBudget,
) -> Result<GuardedRoutePlan, ExecutionError> {
    let bytes = match &plan {
        RoutePlan::Reached { path, .. } => path.heap_bytes(),
        RoutePlan::Pending { request, .. } => heap_sum([
            request.from.heap_bytes().ok_or(ExecutionError::Capacity)?,
            request
                .destinations
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            request.body.id.capacity(),
            request.wait.heap_bytes().ok_or(ExecutionError::Capacity)?,
        ]),
        _ => Some(0),
    }
    .ok_or(ExecutionError::Capacity)?;
    let guard = budget.reserve(
        size_of::<RoutePlan>()
            .checked_add(bytes)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    Ok(GuardedRoutePlan(plan, guard))
}
