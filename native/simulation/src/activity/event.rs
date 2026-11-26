//! Event-time activity eligibility and a bound address into the actual retained
//! occurrence. Receiver callbacks may replace the active action meanwhile.
use super::*;
use crate::attention::ActivityRecordingContext;
use crate::host::{ByteBudget, ByteReservation};
use std::mem::size_of;

pub(crate) struct EventActivity {
    pub(super) actor_id: String,
    pub(super) occurrence_id: String,
    command_type: String,
    status: ActivityStatus,
    bound: bool,
    effects: bool,
    outputs: bool,
    spending: bool,
    outcome: Option<(bool, String)>,
    _reservation: ByteReservation,
}
impl EventActivity {
    pub(crate) fn actor_id(&self) -> &str {
        &self.actor_id
    }
    pub(crate) fn context(&self) -> ActivityRecordingContext<'_> {
        ActivityRecordingContext {
            command_type: &self.command_type,
            status: self.status,
            bound: self.bound,
            effects: self.effects,
            outputs: self.outputs,
            spending: self.spending,
            outcome: self.outcome.as_ref().map(|(ok, code)| (*ok, code.as_str())),
        }
    }
}
impl ActivityState {
    pub(crate) fn capture_event_activity(
        &self,
        cause: &str,
        budget: &ByteBudget,
    ) -> Result<Option<EventActivity>, ActivityError> {
        let Some(reference) = self.active.get(cause) else {
            return Ok(None);
        };
        let entry = &self
            .collections
            .get(&reference.actor_id)
            .ok_or(ActivityError::InvalidStructure)?
            .get(&reference.occurrence_id)?
            .ok_or(ActivityError::InvalidStructure)?
            .occurrence;
        let context = ActivityRecordingContext::from_occurrence(entry);
        let bytes = size_of::<EventActivity>()
            .checked_add(reference.actor_id.len())
            .and_then(|bytes| bytes.checked_add(reference.occurrence_id.len()))
            .and_then(|bytes| bytes.checked_add(context.command_type.len()))
            .and_then(|bytes| bytes.checked_add(context.outcome.map_or(0, |(_, code)| code.len())))
            .ok_or(ActivityError::Capacity)?;
        let reservation = budget.reserve(bytes).map_err(|_| ActivityError::Capacity)?;
        Ok(Some(EventActivity {
            actor_id: reference.actor_id.clone(),
            occurrence_id: reference.occurrence_id.clone(),
            command_type: context.command_type.into(),
            status: context.status,
            bound: context.bound,
            effects: context.effects,
            outputs: context.outputs,
            spending: context.spending,
            outcome: context.outcome.map(|(ok, code)| (ok, code.into())),
            _reservation: reservation,
        }))
    }
}
