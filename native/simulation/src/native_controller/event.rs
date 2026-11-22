//! Only the actual target can consume a directed contact as an animal alarm.
//! The occurrence cursor supplies the target's acquired sight or bodily contact.
use super::{begin_alarm, selected_profile};
use crate::contact::StrikePhase;
use crate::events::{AcquiredOccurrence, EventScope, WorldEvent};
use crate::execution::{CoreMutation, ExecutionError};
use crate::experience::Awareness;
use crate::host::ByteBudget;
use crate::host::retained_size::map_storage;
use crate::native_response::{
    CauseKind, DangerExtent, NativeDanger, RegionKind, RegionSource, body_danger_key,
    region_danger_key,
};
use crate::reception::{EventScalar, ExperienceModality};
use crate::state::{Action, Entity};
use crate::work::WorkUnit;

fn receiver<'a>(core: &'a CoreMutation<'_>, event: &WorldEvent) -> Option<&'a Entity> {
    let animal = event
        .target_id
        .as_deref()
        .and_then(|id| core.state.physical.entities.get(id))?;
    let state = animal.animal.as_ref()?;
    (animal
        .actor
        .as_ref()
        .is_some_and(|actor| actor.alive && actor.controller == "native")
        && animal.actively_participates()
        && !(animal
            .threat
            .as_ref()
            .is_some_and(|threat| threat.defends())
            && state.foraging.is_none())
        && (event.scope != Some(EventScope::Private) || event.audience.contains(&animal.id)))
    .then_some(animal)
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum ContactCue {
    Preparation,
    Attempt,
}

/// The public event alone grants no reaction. Confirm that it is this exact
/// action's real working windup or result, against its bound target.
fn contact_cue<'a>(
    core: &'a CoreMutation<'_>,
    event: &WorldEvent,
) -> Option<(ContactCue, &'a Entity, &'a Action)> {
    if event.scope != Some(EventScope::External) {
        return None;
    }
    let cue = if event.event_type == "struck" {
        ContactCue::Attempt
    } else if event.event_type
        == core
            .state
            .installed
            .ordinary_actions
            .value()
            .action_started_event
    {
        ContactCue::Preparation
    } else {
        return None;
    };
    let source = core
        .state
        .physical
        .entities
        .get(event.actor_id.as_deref()?)?;
    let action = source.actor.as_ref()?.action.as_ref()?;
    let expected = match cue {
        ContactCue::Preparation => StrikePhase::Windup,
        ContactCue::Attempt => StrikePhase::Recovery,
    };
    let cause = match event.data.as_ref()?.get("actionId")? {
        EventScalar::Text(value) => value.as_unicode()?,
        _ => return None,
    };
    (source.actively_participates()
        && action.is_natural_contact()
        && action.stage == "working"
        && action.strike_phase == Some(expected)
        && action.target_id.is_some()
        && action.target_id == event.target_id
        && action.id == cause)
        .then_some((cue, source, action))
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
    let contact = contact_cue(core, event).map(|(cue, _, _)| cue);
    if installed
        .occurrence_rules
        .value()
        .native_target_events
        .contains(&event.event_type)
        && event.event_type != installed.ordinary_actions.value().action_started_event
        && contact != Some(ContactCue::Attempt)
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
    Ok(event.target_id.as_deref() == Some(observer)
        && core
            .state
            .installed
            .occurrence_rules
            .value()
            .native_target_events
            .contains(&event.event_type)
        && receiver(core, event).is_some())
}

pub(crate) fn acquire_event(
    core: &mut CoreMutation<'_>,
    event: &WorldEvent,
    acquired: &AcquiredOccurrence,
    awareness: &[Awareness],
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    if acquired.event_id() != event.id
        || Some(acquired.order()) != event.order
        || acquired.sequence() != event.sequence
    {
        return Err(ExecutionError::UnfinishedOccurrence);
    }
    let Some(target) = event.target_id.as_deref() else {
        return Ok(());
    };
    if !event_reception_needed(core, event, target)? {
        return Ok(());
    }
    let Some(received) = awareness
        .iter()
        .find(|received| received.actor_id == target)
    else {
        return Ok(());
    };
    let Some((cue, source, action)) = contact_cue(core, event) else {
        return Ok(());
    };
    let animal = receiver(core, event).ok_or(ExecutionError::Invariant)?;
    if animal.physical_life() != action.target_life {
        return Ok(());
    }
    let seen = received.source_id.as_deref() == Some(source.id.as_str());
    let felt = cue == ContactCue::Attempt && received.modality == ExperienceModality::Felt;
    if !(felt || seen && received.modality == ExperienceModality::Observed) {
        return Ok(());
    }
    if cue == ContactCue::Preparation {
        let installed = &core.state.installed;
        let visible = installed
            .body_policy
            .as_ref()
            .and_then(|body| body.value().combat.as_ref())
            .and_then(|combat| combat.encounters.as_ref())
            .is_some_and(|encounter| encounter.visible_preparation);
        let state = animal.animal.as_ref().ok_or(ExecutionError::Invariant)?;
        if !visible
            || !selected_profile(installed, state)?
                .dangers
                .attack_preparation
        {
            return Ok(());
        }
    }
    if animal.spatial.flight.is_some() {
        return Err(ExecutionError::UnsupportedFamily);
    }
    let at = event.at;
    let life = source.physical_life().ok_or(ExecutionError::Invariant)?;
    let cause = if cue == ContactCue::Preparation {
        &action.id
    } else {
        &event.id
    };
    // Keep temporary key encoding funded independently of the saved maps. A
    // missing source disclosure never consults the hidden attacker's position.
    let _keys = budget.reserve(256 + 8 * (source.id.len() + cause.len()))?;
    let prep_key = if cue == ContactCue::Preparation {
        let key = crate::encoding::json_record(&(&source.id, life))
            .map_err(|_| ExecutionError::Invariant)?;
        if animal
            .animal
            .as_ref()
            .and_then(|animal| animal.episode.as_ref())
            .and_then(|episode| episode.preparations.as_ref())
            .and_then(|preparations| preparations.get(&key))
            .is_some_and(|id| id == cause)
        {
            return Ok(());
        }
        Some(key)
    } else {
        None
    };
    let body = if seen && cue == ContactCue::Attempt {
        let extent = source.body_profile();
        Some((
            body_danger_key(&source.id, life).map_err(|_| ExecutionError::Invariant)?,
            source
                .world_position()
                .ok_or(ExecutionError::InvalidPosition)?,
            DangerExtent {
                radius: extent.radius,
                height: extent.height,
            },
        ))
    } else {
        None
    };
    let region = if felt {
        // Natural contact originates on this body. Without an observed attacker
        // there is no license to look up where the blow came from.
        Some(
            animal
                .world_position()
                .ok_or(ExecutionError::InvalidPosition)?,
        )
    } else {
        None
    };
    let cause_kind = if cue == ContactCue::Preparation {
        CauseKind::Action
    } else {
        CauseKind::Event
    };
    let episode = animal
        .animal
        .as_ref()
        .and_then(|animal| animal.episode.as_ref());
    let dangers = episode.map(|value| &value.dangers);
    let preparations = episode.and_then(|value| value.preparations.as_ref());
    let allocation = map_growth(
        dangers,
        usize::from(body.is_some()) + usize::from(region.is_some()),
    )? + map_growth(preparations, usize::from(prep_key.is_some()))?
        + prep_key.as_ref().map_or(0, |key| key.len() + cause.len())
        + body
            .as_ref()
            .map_or(0, |(key, _, _)| key.len() + source.id.len())
        + region.map_or(0, |_| 8 * event.id.len() + 32);
    let _write = budget.reserve(cause.len() + body.as_ref().map_or(0, |_| source.id.len()))?;
    let cause = cause.clone();
    let source_id = body.as_ref().map(|_| source.id.clone());
    core.journal.meters.charge(&[(WorkUnit::Effects, 1)])?;
    let mut mutation = core.physical();
    mutation.reserve_response_growth(allocation)?;
    if !begin_alarm(&mut mutation, target, cause_kind, &cause, at)? {
        return Ok(());
    }
    let episode = mutation
        .snapshot_episode(target)?
        .as_mut()
        .ok_or(ExecutionError::Invariant)?;
    if let Some(key) = prep_key {
        let preparations = episode.preparations.get_or_insert_with(Default::default);
        preparations
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        preparations.insert(key, cause);
    }
    episode
        .dangers
        .try_reserve(usize::from(body.is_some()) + usize::from(region.is_some()))
        .map_err(|_| ExecutionError::Capacity)?;
    if let Some((key, point, extent)) = body {
        episode.dangers.insert(
            key,
            NativeDanger::Body {
                source_id: source_id.ok_or(ExecutionError::Invariant)?,
                physical_life: life,
                point,
                extent,
                observed_at: at,
                visible: true,
                inside_avoidance: None,
                lost_at: None,
            },
        );
    }
    if let Some(point) = region {
        let source = RegionSource {
            kind: RegionKind::Event,
            id: event.id.clone(),
        };
        episode.dangers.insert(
            region_danger_key(&source).map_err(|_| ExecutionError::Invariant)?,
            NativeDanger::Region {
                source,
                point,
                observed_at: at,
                incoming: None,
                inside_avoidance: None,
            },
        );
    }
    mutation.behavior_changed(target, false)
}

fn map_growth<V>(
    map: Option<&indexmap::IndexMap<String, V>>,
    new: usize,
) -> Result<usize, ExecutionError> {
    let (length, capacity) = map.map_or((0, 0), |map| (map.len(), map.capacity()));
    let needed = length.checked_add(new).ok_or(ExecutionError::Capacity)?;
    if needed <= capacity {
        return Ok(0);
    }
    let slots = capacity
        .checked_mul(2)
        .ok_or(ExecutionError::Capacity)?
        .max(4)
        .max(needed);
    map_storage::<String, V>(slots).ok_or(ExecutionError::Capacity)
}
