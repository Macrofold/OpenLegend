//! The selected ordinary command closure proves preparation has no offensive
//! action. Actual attack/ranged occurrences remain refused before acquisition,
//! rather than being accepted with missing combat/animal consequences.
use crate::events::{AcquiredOccurrence, EventScope, WorldEvent};
use crate::execution::{CoreMutation, ExecutionError};
use crate::state::Entity;
fn receiver<'a>(
    core: &'a CoreMutation<'_>,
    event: &WorldEvent,
) -> Result<Option<&'a Entity>, ExecutionError> {
    if !core
        .state
        .installed
        .occurrence_rules
        .value()
        .native_target_events
        .contains(&event.event_type)
    {
        return Ok(None);
    }
    let Some(animal) = event
        .target_id
        .as_deref()
        .and_then(|id| core.state.physical.entities.get(id))
    else {
        return Ok(None);
    };
    if animal.animal.is_none()
        || !animal
            .actor
            .as_ref()
            .is_some_and(|actor| actor.alive && actor.controller == "native")
        || !animal.actively_participates()
    {
        return Ok(None);
    }
    if animal.threat.is_some() {
        return Err(ExecutionError::UnsupportedFamily);
    }
    if event.scope == Some(EventScope::Private) && !event.audience.contains(&animal.id) {
        return Ok(None);
    }
    Ok(Some(animal))
}
pub(crate) fn require_supported_event(
    core: &CoreMutation<'_>,
    event: &WorldEvent,
) -> Result<(), ExecutionError> {
    let installed = &core.state.installed;
    if installed
        .occurrence_rules
        .value()
        .native_target_events
        .contains(&event.event_type)
        && event.event_type != installed.ordinary_actions.value().action_started_event
    {
        return Err(ExecutionError::UnsupportedFamily);
    }
    if let Some(action) = event
        .actor_id
        .as_deref()
        .and_then(|id| core.state.physical.entities.get(id))
        .and_then(|entity| entity.actor.as_ref())
        .and_then(|actor| actor.action.as_ref())
    {
        if action.has_unconverted_fields()
            || !matches!(action.kind.as_str(), "move" | "status-effect")
        {
            return Err(ExecutionError::UnsupportedFamily);
        }
    }
    Ok(())
}
pub(crate) fn event_reception_needed(
    core: &CoreMutation<'_>,
    event: &WorldEvent,
    observer: &str,
) -> Result<bool, ExecutionError> {
    Ok(event.target_id.as_deref() == Some(observer) && receiver(core, event)?.is_some())
}
pub(crate) fn acquire_event(
    core: &mut CoreMutation<'_>,
    event: &WorldEvent,
    acquired: &AcquiredOccurrence,
) -> Result<(), ExecutionError> {
    if acquired.event_id() != event.id
        || Some(acquired.order()) != event.order
        || acquired.sequence() != event.sequence
    {
        return Err(ExecutionError::UnfinishedOccurrence);
    }
    require_supported_event(core, event)?;
    let Some(_animal) = receiver(core, event)? else {
        return Ok(());
    };
    // The only admitted native-target vocabulary here is actual action start.
    // Its source action has already passed the closed physical-family owner:
    // neither Move nor Status is attackPreparation. There is therefore no alarm
    // to acquire; actual attacks were rejected by the same gate above.
    Ok(())
}
