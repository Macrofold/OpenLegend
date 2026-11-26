//! Personal evidence and exact accepted attack choices for contextual controls.
//! This owner never uses a body or its current action to establish recognition.
use crate::body::EncounterPolicy;
use crate::host::retained_size::{HeapBytes, heap_record};
use crate::simulation::SimulationState;
use crate::state::{Action, Entity};
use crate::values::{
    deserialize_nullable, deserialize_present_option, deserialize_safe_integer, is_safe_record_id,
};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

mod authorities;
pub(crate) use authorities::{apply_control, end_owned, field_id, receive, select_owned, withdraw};
mod maintenance;
pub(crate) use maintenance::{
    CheckedFlights, SeenAttack, expire_due, next_encounter_work_at, restore_seen_action,
    settle_seen_actions,
};
mod read;
pub(crate) use read::context;
pub use read::{EncounterContext, EncounterFamily, EncounterOperation, EncounterWords, HeldShot};

pub(crate) fn observed_preparation(entity: &Entity) -> Option<&Action> {
    let actor = entity.actor.as_ref()?;
    let action = actor.action.as_ref()?;
    (actor.alive
        && entity.actively_participates()
        && action.stage == "working"
        && (action.is_natural_contact()
            && action.strike_phase == Some(crate::contact::StrikePhase::Windup)
            || action.is_ranged_attack()))
    .then_some(action)
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PersonalEncounters {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub(crate) life: u64,
    pub(crate) pairs: IndexMap<String, PersonalEncounter>,
    pub(crate) unknown: IndexMap<String, UnidentifiedContact>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) next_at: Option<f64>,
}
heap_record!(PersonalEncounters { pairs, unknown });

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct UnidentifiedContact {
    pub(crate) at: f64,
    pub(crate) until: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub(crate) sequence: u64,
}
heap_record!(UnidentifiedContact {});

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct PersonalEncounter {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub(crate) other_life: u64,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub(crate) episode: Option<String>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub(crate) preference_revision: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub(crate) hostile_revision: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub(crate) movement_revision: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) last_cause: Option<HostileCause>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) incoming_until: Option<f64>,
    pub(crate) active: IndexMap<String, ObservedAttack>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) own: Option<OwnedOffense>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) speak: Option<SpeakPreference>,
}
heap_record!(PersonalEncounter {
    episode,
    last_cause,
    active,
    own,
    speak
});

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct HostileCause {
    pub(crate) id: String,
    pub(crate) at: f64,
    pub(crate) kind: HostileKind,
}
heap_record!(HostileCause { id });

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum HostileKind {
    Preparation,
    Release,
    Attempt,
    Contact,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum ObservedAttackKind {
    Action,
    Projectile,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ObservedAttack {
    pub(crate) kind: ObservedAttackKind,
    pub(crate) id: String,
    pub(crate) occurrence_id: String,
}
heap_record!(ObservedAttack { id, occurrence_id });

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct OwnedOffense {
    pub(crate) intention_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub(crate) revision: u64,
    pub(crate) invocation_id: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) plan_id: Option<String>,
    pub(crate) method: OffensiveMethod,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) until: Option<f64>,
}
heap_record!(OwnedOffense {
    intention_id,
    invocation_id,
    plan_id,
    method
});

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OffensiveMethod {
    #[serde(rename = "type")]
    pub kind: OffensiveKind,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub definition_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub weapon_item_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub ammo_item_id: Option<String>,
}
heap_record!(OffensiveMethod {
    definition_id,
    weapon_item_id,
    ammo_item_id
});

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum OffensiveKind {
    Strike,
    Aim,
    ShootOnce,
    Hunt,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct SpeakPreference {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub(crate) hostile_revision: u64,
    pub(crate) controller: String,
}
heap_record!(SpeakPreference { controller });

pub(crate) fn policy(state: &SimulationState) -> Option<&EncounterPolicy> {
    state
        .installed
        .body_policy
        .as_ref()?
        .value()
        .combat
        .as_ref()?
        .encounters
        .as_ref()
}

pub(crate) fn own_method(action: &Action) -> Option<OffensiveKind> {
    if action.is_natural_contact() {
        return Some(OffensiveKind::Strike);
    }
    if !action.is_ranged_attack() {
        return None;
    }
    match action.kind.as_str() {
        "aim" => Some(OffensiveKind::Aim),
        "shoot-once" => Some(OffensiveKind::ShootOnce),
        "hunt" => Some(OffensiveKind::Hunt),
        _ => None,
    }
}

pub(crate) fn episode<'a>(
    state: &'a SimulationState,
    observer: &str,
    target: &str,
) -> Option<&'a String> {
    state
        .reception
        .perception_episodes
        .as_ref()?
        .get(observer)?
        .get(target)
}

/// Call only for a pair already selected by the observer's current sight owner.
pub(crate) fn current_pair<'a>(
    state: &SimulationState,
    observer: &'a Entity,
    target: &Entity,
) -> Option<&'a PersonalEncounter> {
    let saved = observer.actor.as_ref()?.encounters.as_ref()?;
    let pair = saved.pairs.get(&target.id)?;
    (observer.physical_life() == Some(saved.life)
        && target.physical_life() == Some(pair.other_life)
        && crate::worlds::base_knowledge::subject_reference_current(
            &state.reception,
            &observer.id,
            &target.id,
            Some(&pair.episode),
        ))
    .then_some(pair)
}

/// Ordinary travel can keep a meaningful personal outcome during an actual
/// encounter. These are already received sources, which need no second sight.
pub(crate) fn has_personal_context(state: &SimulationState, observer: &Entity) -> bool {
    let Some(owner) = observer
        .actor
        .as_ref()
        .and_then(|actor| actor.encounters.as_ref())
        .filter(|owner| observer.physical_life() == Some(owner.life))
    else {
        return false;
    };
    owner
        .unknown
        .values()
        .any(|contact| contact.until > state.physical.header.sim_time)
        || owner.pairs.iter().any(|(subject, pair)| {
            (pair.last_cause.is_some() || pair.own.is_some() || !pair.active.is_empty())
                && crate::worlds::base_knowledge::subject_reference_current(
                    &state.reception,
                    &observer.id,
                    subject,
                    Some(&pair.episode),
                )
        })
}

impl PersonalEncounters {
    fn refresh_deadline(&mut self) {
        self.next_at = self.deadline();
    }

    fn deadline(&self) -> Option<f64> {
        self.pairs
            .values()
            .flat_map(|pair| {
                [
                    pair.incoming_until,
                    pair.own.as_ref().and_then(|own| own.until),
                ]
            })
            .flatten()
            .chain(self.unknown.values().map(|contact| contact.until))
            .min_by(f64::total_cmp)
    }

    pub(crate) fn valid(&self, life: u64, now: f64) -> bool {
        let time = |at: f64| at.is_finite() && at >= 0.0;
        self.life == life
            && self.next_at.is_none_or(time)
            && self.next_at == self.deadline()
            && self.pairs.iter().all(|(target, pair)| {
                is_safe_record_id(target)
                    && pair.episode.as_deref().is_none_or(is_safe_record_id)
                    && pair.incoming_until.is_none_or(time)
                    && pair.last_cause.as_ref().is_none_or(|cause| {
                        is_safe_record_id(&cause.id) && time(cause.at) && cause.at <= now
                    })
                    && pair.active.iter().all(|(key, active)| {
                        is_safe_record_id(&active.id)
                            && is_safe_record_id(&active.occurrence_id)
                            && crate::encoding::json_record(&(active.kind, &active.id))
                                .is_ok_and(|expected| expected == *key)
                    })
                    && pair.speak.as_ref().is_none_or(|speak| {
                        speak.hostile_revision == pair.hostile_revision
                            && matches!(speak.controller.as_str(), "player" | "npc" | "native")
                    })
                    && pair.own.as_ref().is_none_or(|own| {
                        is_safe_record_id(&own.intention_id)
                            && is_safe_record_id(&own.invocation_id)
                            && own.plan_id.as_deref().is_none_or(is_safe_record_id)
                            && own.until.is_none_or(time)
                            && own
                                .method
                                .definition_id
                                .as_deref()
                                .is_none_or(is_safe_record_id)
                            && own
                                .method
                                .weapon_item_id
                                .as_deref()
                                .is_none_or(is_safe_record_id)
                            && own
                                .method
                                .ammo_item_id
                                .as_deref()
                                .is_none_or(is_safe_record_id)
                    })
            })
            && self.unknown.iter().all(|(id, contact)| {
                is_safe_record_id(id)
                    && time(contact.at)
                    && contact.at <= now
                    && time(contact.until)
                    && contact.until >= contact.at
            })
    }
}
