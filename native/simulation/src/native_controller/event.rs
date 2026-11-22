//! Selected directly targeted animal consequences. A body impact does not
//! authorize an unfinished reaction owner to accept the same event.
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
    if animal
        .threat
        .as_ref()
        .is_some_and(|threat| threat.defends())
        && animal
            .animal
            .as_ref()
            .is_none_or(|state| state.foraging.is_none())
    {
        return Ok(None);
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
    let source_action = event
        .actor_id
        .as_deref()
        .and_then(|id| core.state.physical.entities.get(id))
        .and_then(|entity| entity.actor.as_ref())
        .and_then(|actor| actor.action.as_ref());
    let supported_contact = event.event_type == "struck"
        && source_action.is_some_and(|action| action.is_natural_contact())
        && receiver(core, event)?.is_none();
    if installed
        .occurrence_rules
        .value()
        .native_target_events
        .contains(&event.event_type)
        && event.event_type != installed.ordinary_actions.value().action_started_event
        && !supported_contact
    {
        return Err(ExecutionError::UnsupportedFamily);
    }
    if let Some(action) = source_action {
        if action.has_unconverted_fields()
            || (!action.has_ground_motion()
                && !action.is_natural_contact()
                && action.kind != "status-effect")
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
    // Natural contact against people has no animal receiver. An actual attack
    // against a native receiver requires that receiver's unfinished response.
    Ok(())
}
