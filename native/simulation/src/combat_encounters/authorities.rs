//! Intake from real observer acquisition and accepted action boundaries.
use super::*;
use crate::events::WorldEvent;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::ByteBudget;
use crate::host::retained_size::{heap_sum, map_storage};
use crate::reception::EventScalar;

pub(super) fn increment(before: u64) -> Result<u64, ExecutionError> {
    before
        .checked_add(1)
        .filter(|after| *after <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or(ExecutionError::Invariant)
}

fn participating_memory(entity: &Entity) -> bool {
    entity.actively_participates()
        && entity.has_memory()
        && entity.actor.as_ref().is_some_and(|actor| actor.alive)
}

pub(super) fn pair_for<'a>(
    state: &'a mut PersonalEncounters,
    target: &str,
    life: u64,
    episode: Option<String>,
    current: bool,
) -> Result<&'a mut PersonalEncounter, ExecutionError> {
    if !current {
        state
            .pairs
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        state.pairs.insert(
            target.to_owned(),
            PersonalEncounter {
                other_life: life,
                episode,
                preference_revision: 0,
                hostile_revision: 0,
                movement_revision: 0,
                last_cause: None,
                incoming_until: None,
                active: IndexMap::new(),
                own: None,
                speak: None,
            },
        );
    }
    state.pairs.get_mut(target).ok_or(ExecutionError::Invariant)
}

/// Retain signed-off acquisition only. The caller independently proved this
/// source was seen by the recipient; absent source never becomes a known pair.
pub(crate) fn receive(
    core: &mut CoreMutation<'_>,
    observer: &str,
    event: &WorldEvent,
    kind: HostileKind,
    source: Option<&str>,
    concluded_action: Option<&str>,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let Some(policy) = policy(core.state) else {
        return Ok(());
    };
    let until = event.at + policy.recent_seconds;
    let sequence = event.order.unwrap_or(event.sequence);
    let Some(recipient) = core
        .state
        .physical
        .entities
        .get(observer)
        .filter(|entity| participating_memory(entity))
    else {
        return Ok(());
    };
    let Some((target, target_life)) = source
        .filter(|source| *source != observer)
        .and_then(|source| core.state.physical.entities.get(source))
        .and_then(|target| target.physical_life().map(|life| (target, life)))
    else {
        if kind != HostileKind::Contact
            || recipient
                .actor
                .as_ref()
                .and_then(|actor| actor.encounters.as_ref())
                .is_some_and(|owner| owner.unknown.contains_key(&event.id))
        {
            return Ok(());
        }
        return core
            .physical()
            .edit_personal_encounters(observer, event.id.len(), |state| {
                state
                    .unknown
                    .try_reserve(1)
                    .map_err(|_| ExecutionError::Capacity)?;
                state.unknown.insert(
                    event.id.clone(),
                    UnidentifiedContact {
                        at: event.at,
                        until,
                        sequence,
                    },
                );
                state.refresh_deadline();
                Ok(())
            });
    };
    let source = target.id.as_str();
    let current = current_pair(core.state, recipient, target);
    if current.is_some_and(|pair| {
        pair.last_cause
            .as_ref()
            .is_some_and(|cause| cause.id == event.id)
    }) {
        return Ok(());
    }
    let episode = episode(core.state, observer, source);
    let active = match kind {
        HostileKind::Preparation => {
            field_id(event, "actionId").map(|id| (ObservedAttackKind::Action, id))
        }
        HostileKind::Release => {
            field_id(event, "projectileId").map(|id| (ObservedAttackKind::Projectile, id))
        }
        HostileKind::Attempt | HostileKind::Contact => None,
    };
    let new_bytes = heap_sum([
        source.len(),
        event.id.len(),
        usize::from(active.is_some()) * event.id.len(),
        episode.map_or(0, String::len),
        active.map_or(0, |(_, id)| 8 * id.len() + 32),
        if active.is_some() {
            map_storage::<String, ObservedAttack>(
                current
                    .map_or(0, |pair| pair.active.capacity())
                    .saturating_mul(2)
                    .max(4),
            )
            .ok_or(ExecutionError::Capacity)?
        } else {
            0
        },
    ])
    .ok_or(ExecutionError::Capacity)?;
    // The actor and recognition cut are borrowed from the same accepted turn.
    let _owned = budget.reserve(source.len() + episode.map_or(0, String::len))?;
    let source = source.to_owned();
    let episode = episode.cloned();
    let known_pair = current.is_some();
    core.physical()
        .edit_personal_encounters(observer, new_bytes, |state| {
            let pair = pair_for(state, &source, target_life, episode, known_pair)?;
            pair.preference_revision = increment(pair.preference_revision)?;
            pair.hostile_revision = increment(pair.hostile_revision)?.max(sequence);
            pair.last_cause = Some(HostileCause {
                id: event.id.clone(),
                at: event.at,
                kind,
            });
            pair.incoming_until = Some(until);
            pair.speak = None;
            if let Some(action) = concluded_action {
                let count = pair.active.len();
                pair.active.retain(|_, observed| {
                    observed.kind != ObservedAttackKind::Action || observed.id != action
                });
                if pair.active.len() != count {
                    pair.movement_revision = increment(pair.movement_revision)?;
                }
            }
            if let Some((kind, id)) = active {
                let key = crate::encoding::json_record(&(kind, id))
                    .map_err(|_| ExecutionError::Invariant)?;
                pair.active
                    .try_reserve(1)
                    .map_err(|_| ExecutionError::Capacity)?;
                pair.active.insert(
                    key,
                    ObservedAttack {
                        kind,
                        id: id.to_owned(),
                        occurrence_id: event.id.clone(),
                    },
                );
            }
            state.refresh_deadline();
            Ok(())
        })
}

pub(crate) fn field_id<'a>(event: &'a WorldEvent, field: &str) -> Option<&'a str> {
    match event.data.as_ref()?.get(field)? {
        EventScalar::Text(value) => value.as_unicode(),
        _ => None,
    }
}

/// Bind only committed ordinary offensive work. An exact target/life and the
/// same live observation used by the admitted command are required.
pub(crate) fn select_owned(
    core: &mut CoreMutation<'_>,
    observer: &str,
    command_id: &str,
    invocation: &str,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    if policy(core.state).is_none() {
        return Ok(());
    }
    let state = &*core.state;
    let Some(actor) = state
        .physical
        .entities
        .get(observer)
        .filter(|actor| participating_memory(actor))
    else {
        return Ok(());
    };
    let Some(action) = actor
        .actor
        .as_ref()
        .and_then(|actor| actor.action.as_ref())
        .filter(|action| action.id == invocation)
    else {
        return Ok(());
    };
    let Some((kind, target, life)) = own_method(action)
        .zip(action.target_id.as_deref())
        .zip(action.target_life)
        .map(|((kind, target), life)| (kind, target, life))
    else {
        return Ok(());
    };
    let Some(subject) = state.physical.entities.get(target).filter(|subject| {
        subject.physical_life() == Some(life)
            && state
                .reception
                .visible_people
                .as_ref()
                .and_then(|owners| owners.get(observer))
                .is_some_and(|people| people.iter().any(|id| id == target))
    }) else {
        return Ok(());
    };
    let current = current_pair(state, actor, subject).is_some();
    let plan = actor
        .actor
        .as_ref()
        .and_then(|actor| actor.agency.plan.as_ref())
        .filter(|plan| plan.steps.iter().any(|step| step.id == command_id));
    let episode = episode(state, observer, target);
    let bytes = heap_sum([
        target.len(),
        command_id.len(),
        invocation.len(),
        episode.map_or(0, String::len),
        plan.map_or(0, |plan| plan.id.len()),
        action.definition_id.as_ref().map_or(0, String::len),
        action.weapon_item_id.as_ref().map_or(0, String::len),
        action.ammo_item_id.as_ref().map_or(0, String::len),
    ])
    .ok_or(ExecutionError::Capacity)?;
    let _owned = budget.reserve(bytes)?;
    let method = OffensiveMethod {
        kind,
        definition_id: action.definition_id.clone(),
        weapon_item_id: action.weapon_item_id.clone(),
        ammo_item_id: action.ammo_item_id.clone(),
    };
    let plan_id = plan.map(|plan| plan.id.clone());
    let target = target.to_owned();
    let episode = episode.cloned();
    core.physical()
        .edit_personal_encounters(observer, target.len(), |state| {
            let pair = pair_for(state, &target, life, episode, current)?;
            let revision = increment(pair.own.as_ref().map_or(0, |own| own.revision))?;
            pair.preference_revision = increment(pair.preference_revision)?;
            pair.own = Some(OwnedOffense {
                intention_id: command_id.to_owned(),
                revision,
                invocation_id: invocation.to_owned(),
                plan_id,
                method,
                until: None,
            });
            pair.speak = None;
            state.refresh_deadline();
            Ok(())
        })
}

pub(crate) fn end_owned(
    core: &mut CoreMutation<'_>,
    observer: &str,
    action_id: &str,
) -> Result<(), ExecutionError> {
    let Some(owner) = core
        .state
        .physical
        .entities
        .get(observer)
        .and_then(|actor| actor.actor.as_ref())
        .and_then(|actor| actor.encounters.as_ref())
    else {
        return Ok(());
    };
    let matches = |own: &OwnedOffense| own.invocation_id == action_id && own.until.is_none();
    if !owner
        .pairs
        .values()
        .any(|pair| pair.own.as_ref().is_some_and(matches))
    {
        return Ok(());
    }
    let policy = policy(core.state).ok_or(ExecutionError::Invariant)?;
    let until = core.state.physical.header.sim_time + policy.recent_seconds;
    core.physical()
        .edit_personal_encounters(observer, 0, |state| {
            for own in state
                .pairs
                .values_mut()
                .filter_map(|pair| pair.own.as_mut())
                .filter(|own| matches(own))
            {
                own.until = Some(until);
            }
            state.refresh_deadline();
            Ok(())
        })
}

pub(crate) fn withdraw(
    core: &mut CoreMutation<'_>,
    observer: &str,
    mut affected: impl FnMut(&str) -> bool,
) -> Result<(), ExecutionError> {
    let Some(owner) = core
        .state
        .physical
        .entities
        .get(observer)
        .and_then(|actor| actor.actor.as_ref())
        .and_then(|actor| actor.encounters.as_ref())
    else {
        return Ok(());
    };
    if !owner.pairs.values().any(|pair| {
        pair.last_cause
            .as_ref()
            .is_some_and(|cause| affected(&cause.id))
            || pair
                .active
                .values()
                .any(|active| affected(&active.occurrence_id))
    }) && !owner.unknown.keys().any(|id| affected(id))
    {
        return Ok(());
    }
    core.physical()
        .edit_personal_encounters(observer, 0, |state| {
            for pair in state.pairs.values_mut() {
                let before = pair.active.len();
                pair.active
                    .retain(|_, active| !affected(&active.occurrence_id));
                let latest = pair
                    .last_cause
                    .as_ref()
                    .is_some_and(|cause| affected(&cause.id));
                if latest || pair.active.len() != before {
                    pair.preference_revision = increment(pair.preference_revision)?;
                }
                if latest {
                    pair.last_cause = None;
                    pair.incoming_until = None;
                    pair.speak = None;
                }
            }
            state.unknown.retain(|id, _| !affected(id));
            state.refresh_deadline();
            Ok(())
        })
}

pub(crate) fn apply_control(
    core: &mut CoreMutation<'_>,
    observer: &str,
    selected: &crate::capture::EncounterPreference,
    operation: EncounterOperation,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let state = &*core.state;
    let source = state
        .physical
        .entities
        .get(observer)
        .and_then(|entity| entity.actor.as_ref())
        .ok_or(ExecutionError::MissingActor)?;
    let controller = (operation == EncounterOperation::Speak).then(|| source.controller.as_str());
    let _workspace = budget.reserve(
        controller.map_or(0, str::len) + selected.episode.as_ref().map_or(0, String::len),
    )?;
    let controller = controller.map(str::to_owned);
    let episode = selected.episode.clone();
    let has_pair = source
        .encounters
        .as_ref()
        .and_then(|owner| owner.pairs.get(&selected.target_id))
        .is_some_and(|pair| {
            pair.preference_revision == selected.revision && pair.other_life == selected.target_life
        });
    let bytes = selected.target_id.len();
    core.physical()
        .edit_personal_encounters(observer, bytes, |state| {
            let pair = pair_for(
                state,
                &selected.target_id,
                selected.target_life,
                episode,
                has_pair,
            )?;
            if let Some(controller) = controller {
                pair.speak = Some(SpeakPreference {
                    hostile_revision: pair.hostile_revision,
                    controller,
                });
            } else {
                pair.own = None;
            }
            pair.preference_revision = increment(pair.preference_revision)?;
            state.refresh_deadline();
            Ok(())
        })
}
