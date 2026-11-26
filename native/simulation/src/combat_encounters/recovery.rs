//! A committed combat or evasion deadline can outlive the action. Keep its
//! one private observation on the actor's existing encounter record.
use super::PersonalEncounters;
use crate::execution::{CoreMutation, ExecutionError, StagedOccurrence};
use crate::host::{
    ByteBudget,
    retained_size::{HeapBytes, heap_record},
};
use crate::state::{Entity, EntityHandle};
use crate::values::{DefinitionPin, deserialize_present_option};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Recovery {
    pub(super) definition: DefinitionPin,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub(super) combat_until: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub(super) evasion_until: Option<f64>,
}
heap_record!(Recovery { definition });

fn selected(person: &Entity, profile: &DefinitionPin, now: f64) -> bool {
    let Some(actor) = &person.actor else {
        return false;
    };
    [actor.agency.plan.as_ref(), actor.agency.suspended_plan()]
        .into_iter()
        .flatten()
        .any(|plan| {
            matches!(
                plan.status,
                crate::plans::PlanStatus::Active | crate::plans::PlanStatus::Blocked
            ) && plan.activity.as_ref().is_some_and(|work| {
                work.request
                    .as_ref()
                    .and_then(|r| r.chosen_purpose.as_ref())
                    .is_some_and(|p| &p.definition == profile)
                    && work.control.as_ref().is_some_and(|control| {
                        control
                            .get("kind")
                            .and_then(crate::records::SqlCell::as_str)
                            == Some("finite")
                            && control
                                .get("deadline")
                                .and_then(crate::records::SqlCell::as_f64)
                                .is_some_and(|at| at > now)
                    })
            })
        })
}
impl Recovery {
    fn clock(&mut self, evasion: bool) -> &mut Option<f64> {
        if evasion {
            &mut self.evasion_until
        } else {
            &mut self.combat_until
        }
    }
}

pub(crate) fn arm(
    core: &mut CoreMutation<'_>,
    id: &str,
    evasion: bool,
) -> Result<(), ExecutionError> {
    let installed = core.state.installed.clone();
    let Some(profile) = installed.cognition.prepared_responses.as_ref() else {
        return Ok(());
    };
    let person = core
        .state
        .physical
        .entities
        .get(id)
        .ok_or(ExecutionError::MissingActor)?;
    let actor = person.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
    let now = core.state.physical.header.sim_time;
    if !person.has_memory()
        || super::policy(core.state).is_none()
        || (!selected(person, profile, now)
            && !actor
                .encounters
                .as_ref()
                .is_some_and(|owner| !owner.pairs.is_empty()))
    {
        return Ok(());
    }
    let Some(until) = (if evasion {
        actor.evasion_ready_at
    } else {
        actor.combat_ready_at
    })
    .filter(|at| *at > now) else {
        return Ok(());
    };
    if actor
        .encounters
        .as_ref()
        .and_then(|owner| owner.recovery.as_ref())
        .and_then(|recovery| {
            if evasion {
                recovery.evasion_until
            } else {
                recovery.combat_until
            }
        })
        .is_some_and(|at| at >= until)
    {
        return Ok(());
    }
    core.physical().edit_personal_encounters(
        id,
        profile.heap_bytes().ok_or(ExecutionError::Capacity)?,
        |owner| {
            let recovery = owner.recovery.get_or_insert_with(|| Recovery {
                definition: profile.clone(),
                combat_until: None,
                evasion_until: None,
            });
            *recovery.clock(evasion) = Some(until);
            owner.refresh_deadline();
            Ok(())
        },
    )
}

fn held(entity: &Entity) -> Option<&PersonalEncounters> {
    entity.actor.as_ref()?.encounters.as_deref()
}
pub(crate) fn due(entity: &Entity, now: f64) -> bool {
    held(entity)
        .and_then(|owner| owner.recovery.as_ref())
        .is_some_and(|r| {
            r.combat_until.is_some_and(|until| until <= now)
                || r.evasion_until.is_some_and(|until| until <= now)
        })
}

/// Consume at most one due deadline so the ordinary event cursor can finish
/// and journal its private receipt before observing the other deadline.
pub(crate) fn observe_due(
    core: &mut CoreMutation<'_>,
    handle: EntityHandle,
    budget: &ByteBudget,
) -> Result<Option<StagedOccurrence>, ExecutionError> {
    use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope};
    use crate::reception::EventScalar;
    let person = core
        .state
        .physical
        .entities
        .resolve(handle)
        .ok_or(ExecutionError::MissingActor)?;
    let now = core.state.physical.header.sim_time;
    let Some(recovery) = held(person).and_then(|o| o.recovery.as_ref()) else {
        return Ok(None);
    };
    let evasion = !recovery.combat_until.is_some_and(|until| until <= now);
    let actor = person.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
    let later = (if evasion {
        actor.evasion_ready_at
    } else {
        actor.combat_ready_at
    })
    .filter(|until| *until > now);
    let installed = core.state.installed.clone();
    let profile = &installed.prepared_responses;
    let relevant = person.actively_participates()
        && person.has_memory()
        && actor.alive
        && !actor.incapacitated
        && installed.cognition.prepared_responses.as_ref() == Some(&recovery.definition)
        && (selected(person, profile.pin(), now)
            || super::has_personal_context(core.state, person));
    let _temporary = budget.reserve(person.id.len() * 5 + 2048)?;
    let id = person.id.clone();
    core.physical().edit_personal_encounters(&id, 0, |owner| {
        let recovery = owner.recovery.as_mut().ok_or(ExecutionError::Invariant)?;
        *recovery.clock(evasion) = later;
        if recovery.combat_until.is_none() && recovery.evasion_until.is_none() {
            owner.recovery = None;
        }
        owner.refresh_deadline();
        Ok(())
    })?;
    if !relevant || later.is_some() {
        return Ok(None);
    }
    let importance = &profile.value().observations.ordinary;
    let message = crate::worlds::base_cognition::recovery_observation(evasion);
    let event = core.stage_event(EventEmissionIntent {
        event_type: "response-observation".into(),
        text: EmissionText::Literal(message.into()),
        scope: EventScope::Private,
        audience: AudienceSelection::Explicit(vec![id.clone()]),
        source_id: Some(id),
        target_id: None,
        origin: None,
        exposure: None,
        data: Some(indexmap::IndexMap::from([
            ("semanticTrigger".into(), EventScalar::Boolean(true)),
            (
                "importance".into(),
                EventScalar::Number(importance.importance),
            ),
            ("urgency".into(), EventScalar::Number(importance.urgency)),
        ])),
    })?;
    Ok(Some(event))
}
