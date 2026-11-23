//! Only the actual target can consume directed attack or contact evidence as
//! an animal alarm. The occurrence cursor supplies its own acquired evidence.
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
use crate::state::{Action, Entity, Point};
use crate::work::WorkUnit;

fn receiver<'a>(core: &'a CoreMutation<'_>, event: &WorldEvent) -> Option<&'a Entity> {
    if !core
        .state
        .installed
        .occurrence_rules
        .value()
        .native_target_events
        .contains(&event.event_type)
    {
        return None;
    }
    let animal = core
        .state
        .physical
        .entities
        .get(event.target_id.as_deref()?)?;
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

/// Share the proved strike completion with personal reception. Incidental
/// geometric contact does not end an attack or become an offensive outcome.
pub(crate) fn contact_result_action<'a>(
    core: &CoreMutation<'_>,
    event: &'a WorldEvent,
) -> Option<&'a str> {
    let (cue, _, _) = contact_cue(core, event)?;
    (cue == ContactCue::Attempt)
        .then(|| crate::combat_encounters::field_id(event, "actionId"))
        .flatten()
}

enum ProjectileCue<'a> {
    Release {
        source: &'a Entity,
        source_life: u64,
        target_life: Option<u64>,
    },
    Contact {
        flight: &'a str,
        point: Point,
        contact_life: f64,
    },
    Passage {
        flight: &'a str,
        point: Point,
    },
}

/// Prove the event came from the current flight. Source coordinates are read
/// later and only for a receiver that actually observed the release.
fn current_projectile_event<'a>(
    core: &'a CoreMutation<'_>,
    event: &WorldEvent,
) -> Option<ProjectileCue<'a>> {
    let rules = core.state.installed.occurrence_rules.value();
    let words = rules.ranged.as_ref()?;
    if event.scope != Some(EventScope::External)
        || (event.event_type != words.shot_released
            && event.event_type != rules.projectile_contact_event
            && event.event_type != rules.projectile_passage_event)
    {
        return None;
    }
    let data = event.data.as_ref()?;
    let text = |key| match data.get(key) {
        Some(EventScalar::Text(value)) => value.as_unicode(),
        _ => None,
    };
    let row = core.state.physical.projectiles.flights.get(text("projectileId")?)?;
    let flight = &row.flight;
    if event.event_type == words.shot_released {
        let source = core.state.physical.entities.get(&flight.source_id)?;
        (event.at == flight.launched_at
            && event.actor_id.as_deref() == Some(flight.source_id.as_str())
            && event.target_id == flight.target_id
            && text("actionId") == Some(flight.action_id.as_str())
            && source.physical_life() == Some(flight.source_life))
        .then_some(ProjectileCue::Release {
            source,
            source_life: flight.source_life,
            target_life: flight.target_life,
        })
    } else if event.event_type == rules.projectile_passage_event {
        let target = event.target_id.as_deref()?;
        let animal = core.state.physical.entities.get(target)?;
        let life = animal.physical_life()?;
        (event.at == flight.advanced_at
            && event.actor_id.as_deref() == Some(target)
            && row.passages.contains(target, life))
            .then_some(ProjectileCue::Passage { flight: &flight.id, point: event.origin? })
    } else {
        let EventScalar::Number(contact_life) = data.get("contactLife")? else {
            return None;
        };
        (event.at == flight.advanced_at
            && event.origin == Some(flight.position)
            && event.target_id.is_some()
            && event.actor_id == event.target_id)
            .then_some(ProjectileCue::Contact {
                flight: &flight.id,
                point: flight.position,
                contact_life: *contact_life,
            })
    }
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
        && !crate::reception::combat_observation::current_attack_cue(core, event)
        && current_projectile_event(core, event).is_none()
    {
        return Err(ExecutionError::UnsupportedFamily);
    }
    if let Some(action) = source_action {
        if action.has_unconverted_fields() || !action.supported_native_action() {
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
    Ok(event.target_id.as_deref() == Some(observer) && receiver(core, event).is_some())
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
    let Some(animal) = receiver(core, event) else {
        return Ok(());
    };
    // Borrow the immutable occurrence's target through candidate mutation.
    let target = event
        .target_id
        .as_deref()
        .ok_or(ExecutionError::Invariant)?;
    let Some(received) = awareness
        .iter()
        .find(|received| received.actor_id == target)
    else {
        return Ok(());
    };
    let Some(evidence) = directed_evidence(core, animal, event, received)? else {
        return Ok(());
    };
    let at = event.at;
    let cause = evidence.preparation.map_or(&event.id, |action| &action.id);
    let source_bytes = evidence.source.map_or(0, |(source, _)| source.id.len());
    let region_bytes = evidence.region.as_ref().map_or(0, |region| region.id.len());
    // Fund temporary structured keys independently of the saved danger maps.
    let _keys = budget.reserve(256 + 8 * (source_bytes + cause.len() + region_bytes))?;
    let prep_key = if evidence.preparation.is_some() {
        let (source, life) = evidence.source.ok_or(ExecutionError::Invariant)?;
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
    let body = evidence
        .source
        .filter(|_| evidence.preparation.is_none())
        .map(|(source, life)| {
            let extent = source.body_profile();
            Ok::<_, ExecutionError>((
                body_danger_key(&source.id, life).map_err(|_| ExecutionError::Invariant)?,
                source,
                life,
                source
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?,
                DangerExtent {
                    radius: extent.radius,
                    height: extent.height,
                },
            ))
        })
        .transpose()?;
    let region = evidence.region;
    let cause_kind = if evidence.preparation.is_some() {
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
            .map_or(0, |(key, source, _, _, _)| key.len() + source.id.len())
        + region.as_ref().map_or(0, |region| 8 * region.id.len() + 32);
    let _write = budget.reserve(cause.len() + source_bytes + region_bytes)?;
    let region = region.map(|region| {
        let source = RegionSource {
            kind: region.kind,
            id: region.id.to_owned(),
        };
        (source, region.point, region.incoming)
    });
    let cause = cause.clone();
    let body = body
        .map(|(key, source, life, point, extent)| (key, source.id.clone(), life, point, extent));
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
    if let Some((key, source_id, life, point, extent)) = body {
        episode.dangers.insert(
            key,
            NativeDanger::Body {
                source_id,
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
    if let Some((source, point, incoming)) = region {
        episode.dangers.insert(
            region_danger_key(&source).map_err(|_| ExecutionError::Invariant)?,
            NativeDanger::Region {
                source,
                point,
                observed_at: at,
                incoming,
                inside_avoidance: None,
            },
        );
    }
    mutation.behavior_changed(target, false)
}

struct DirectedEvidence<'a> {
    preparation: Option<&'a Action>,
    source: Option<(&'a Entity, u64)>,
    region: Option<ContactRegion<'a>>,
}

struct ContactRegion<'a> {
    kind: RegionKind,
    id: &'a str,
    point: Point,
    incoming: Option<Point>,
}

/// Select the prey's own acquired evidence. An actual impact uses its local
/// position and any received direction even when the source was never seen.
fn directed_evidence<'a>(
    core: &'a CoreMutation<'_>,
    animal: &Entity,
    event: &'a WorldEvent,
    received: &Awareness,
) -> Result<Option<DirectedEvidence<'a>>, ExecutionError> {
    let observed = received.modality == ExperienceModality::Observed;
    let felt = received.modality == ExperienceModality::Felt;
    if let Some(projectile) = current_projectile_event(core, event) {
        return Ok(match projectile {
            ProjectileCue::Release {
                source,
                source_life,
                target_life,
            } if observed
                && Some(animal.id.as_str()) == received.target_id.as_deref()
                && received.source_id.as_deref() == Some(source.id.as_str())
                && animal.id != source.id
                && animal.physical_life() == target_life =>
            {
                Some(DirectedEvidence {
                    preparation: None,
                    source: Some((source, source_life)),
                    region: None,
                })
            }
            ProjectileCue::Contact {
                flight,
                point,
                contact_life,
            } if felt
                && animal
                    .physical_life()
                    .is_some_and(|life| life as f64 == contact_life) =>
            {
                Some(DirectedEvidence {
                    preparation: None,
                    source: None,
                    region: Some(ContactRegion {
                        kind: RegionKind::Projectile,
                        id: flight,
                        point,
                        incoming: incoming_bearing(received),
                    }),
                })
            }
            ProjectileCue::Passage { flight, point }
                if observed && received.target_id.as_deref() == Some(animal.id.as_str()) =>
            {
                Some(DirectedEvidence {
                    preparation: None,
                    source: None,
                    region: Some(ContactRegion {
                        kind: RegionKind::Projectile,
                        id: flight,
                        point,
                        incoming: incoming_bearing(received),
                    }),
                })
            }
            _ => None,
        });
    }

    let Some((cue, source, action)) = contact_cue(core, event) else {
        return Ok(None);
    };
    if animal.physical_life() != action.target_life {
        return Ok(None);
    }
    let seen = received.source_id.as_deref() == Some(source.id.as_str());
    let felt = cue == ContactCue::Attempt && felt;
    if !(felt || seen && observed) {
        return Ok(None);
    }
    let preparation = if cue == ContactCue::Preparation {
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
            return Ok(None);
        }
        Some(action)
    } else {
        None
    };
    // Preserve the existing natural-contact admission for this separate family.
    if animal.spatial.flight.is_some() {
        return Err(ExecutionError::UnsupportedFamily);
    }
    let source = if seen {
        Some((
            source,
            source.physical_life().ok_or(ExecutionError::Invariant)?,
        ))
    } else {
        None
    };
    let region = if felt {
        Some(ContactRegion {
            kind: RegionKind::Event,
            id: &event.id,
            point: animal
                .world_position()
                .ok_or(ExecutionError::InvalidPosition)?,
            incoming: None,
        })
    } else {
        None
    };
    Ok(Some(DirectedEvidence {
        preparation,
        source,
        region,
    }))
}

fn incoming_bearing(received: &Awareness) -> Option<Point> {
    let data = received.event_data.as_ref()?;
    let number = |key| match data.get(key) {
        Some(EventScalar::Number(value)) if value.is_finite() => Some(*value),
        _ => None,
    };
    Some(Point {
        x: number("incomingX")?,
        y: number("incomingY")?,
        z: number("incomingZ")?,
    })
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
