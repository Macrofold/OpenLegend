//! Finite territorial behavior over admitted sight and ordinary ground movement.
//! The installed world supplies every trigger, distance, deadline and message.
use crate::{
    host::retained_size::{HeapBytes, heap_sum},
    state::{Entity, SurfacePoint},
    text::JsText,
    values::{deserialize_present_option, deserialize_safe_integer, is_safe_record_id},
};
use serde::{Deserialize, Serialize};

mod choice;
pub(crate) use choice::{Intention, Notice, Review, refused};

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum Mode {
    Idle,
    Pursuit,
    Search,
    Return,
}

impl Mode {
    pub(crate) fn chases(self) -> bool {
        matches!(self, Self::Pursuit | Self::Search)
    }
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
enum Activation {
    FeedingOrResting,
}

#[derive(Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Policy {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    activation: Option<Activation>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) pursuit_metres: Option<f64>,
    id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    version: u64,
    pub(crate) home: SurfacePoint,
    pub(crate) refuge: SurfacePoint,
    entry_radius: f64,
    pub(crate) territory_radius: f64,
    arrival_radius: f64,
    pursuit_seconds: f64,
    reentry_after_timeout: bool,
    search_seconds: f64,
    review_seconds: f64,
    refresh_seconds: f64,
    refresh_displacement: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    detours: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    relinquish_health_fraction: Option<f64>,
    strike_definition_id: String,
    attack_range: f64,
    pub(crate) movement_factor: f64,
    target_controllers: Vec<String>,
    target_body_plans: Vec<String>,
    windup_text: JsText,
    withdrawal_text: JsText,
    stop_text: JsText,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Life {
    id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    life: u64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Progress {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) travelled_metres: Option<f64>,
    pub(crate) mode: Mode,
    relinquished: bool,
    review_at: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    episode_until: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    search_until: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    target_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    target_life: Option<u64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    exhausted_target: Option<Life>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    last_seen: Option<SurfacePoint>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub(crate) detours_spent: u64,
    repath_at: f64,
}

#[derive(Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Threat {
    pub(crate) policy: Policy,
    #[serde(flatten)]
    pub(crate) progress: Progress,
}

impl HeapBytes for Progress {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.target_id.heap_bytes()?,
            self.last_seen.heap_bytes()?,
            self.exhausted_target
                .as_ref()
                .map_or(0, |target| target.id.capacity()),
        ])
    }
}

impl Policy {
    pub(crate) fn attack_range(&self) -> f64 { self.attack_range }

    pub(crate) fn authored_bytes(&self) -> Option<usize> {
        heap_sum([
            self.id.heap_bytes()?,
            self.strike_definition_id.heap_bytes()?,
            self.target_controllers.heap_bytes()?,
            self.target_body_plans.heap_bytes()?,
            self.windup_text.heap_bytes()?,
            self.withdrawal_text.heap_bytes()?,
            self.stop_text.heap_bytes()?,
        ])
    }

    pub(crate) fn place_bytes(&self) -> Option<usize> {
        self.home
            .heap_bytes()?
            .checked_add(self.refuge.heap_bytes()?)
    }
}

fn finite_position(point: &SurfacePoint) -> bool {
    [point.x, point.y, point.z]
        .iter()
        .all(|value| value.is_finite())
        && is_safe_record_id(&point.surface_id)
}

fn known_choices(choices: &[String], allowed: &[&str]) -> bool {
    !choices.is_empty()
        && choices.iter().enumerate().all(|(at, choice)| {
            allowed.contains(&choice.as_str()) && !choices[..at].contains(choice)
        })
}

impl Threat {
    pub(crate) fn strike_definition(&self) -> &str {
        &self.policy.strike_definition_id
    }

    pub(crate) fn windup_text(&self) -> &JsText {
        &self.policy.windup_text
    }

    pub(crate) fn needs_feeding_location(&self) -> bool {
        self.policy.activation.is_some()
    }

    pub(crate) fn use_current_place(&self, entity: &Entity) -> bool {
        self.needs_feeding_location()
            && self.progress.mode == Mode::Idle
            && entity
                .actor
                .as_ref()
                .is_some_and(|actor| match actor.action.as_ref() {
                    Some(action) => action.kind == "feed",
                    None => entity
                        .animal
                        .as_ref()
                        .and_then(|animal| animal.foraging.as_ref())
                        .is_some_and(|forage| {
                            forage.mode == crate::native_response::ForagingMode::Resting
                        }),
                })
    }

    pub(crate) fn stop_pursuit(progress: &mut Progress) {
        progress.mode = Mode::Idle;
        progress.target_id = None;
        progress.target_life = None;
        progress.last_seen = None;
        progress.search_until = None;
        progress.episode_until = None;
        progress.detours_spent = 0;
    }

    pub(crate) fn defends(&self) -> bool {
        !self.progress.relinquished
    }

    pub(crate) fn remaining_pursuit_distance(&self) -> Option<f64> {
        self.progress
            .mode
            .chases()
            .then(|| {
                self.policy
                    .pursuit_metres
                    .zip(self.progress.travelled_metres)
            })
            .flatten()
            .map(|(limit, travelled)| (limit - travelled).max(0.0))
    }

    pub(crate) fn valid(
        &self,
        entity: &Entity,
        strikes: &indexmap::IndexMap<String, crate::worlds::base_decision_offers::NativeStrikeRead>,
    ) -> bool {
        let law = &self.policy;
        let state = &self.progress;
        let Some(body) = entity.actor.as_ref().and_then(|actor| actor.body.as_ref()) else {
            return false;
        };
        if law.activation.is_some()
            && entity
                .animal
                .as_ref()
                .is_none_or(|animal| animal.foraging.is_none())
        {
            return false;
        }
        law.version == 1
            && is_safe_record_id(&law.id)
            && strikes
                .get(&law.strike_definition_id)
                .is_some_and(|strike| {
                    strike.required_body_plan.as_deref() == Some(body.plan.as_str())
                        && strike.range == law.attack_range
                })
            && finite_position(&law.home)
            && finite_position(&law.refuge)
            && law.entry_radius <= law.territory_radius
            && [
                law.entry_radius,
                law.territory_radius,
                law.arrival_radius,
                law.pursuit_seconds,
                law.search_seconds,
                law.review_seconds,
                law.refresh_seconds,
                law.refresh_displacement,
                law.movement_factor,
            ]
            .iter()
            .all(|distance| distance.is_finite() && *distance > 0.0)
            && law.detours <= 16
            && state.detours_spent <= law.detours + 1
            && law
                .relinquish_health_fraction
                .is_none_or(|fraction| fraction > 0.0 && fraction < 1.0)
            && law.pursuit_metres.is_none_or(|distance| {
                distance.is_finite()
                    && distance > 0.0
                    && state
                        .travelled_metres
                        .is_some_and(|value| value.is_finite() && value >= 0.0)
            })
            && known_choices(&law.target_controllers, &["player", "npc", "native"])
            && known_choices(&law.target_body_plans, &["biped", "quadruped", "avian"])
            && [
                Some(state.review_at),
                Some(state.repath_at),
                state.episode_until,
                state.search_until,
            ]
            .into_iter()
            .flatten()
            .all(|deadline| deadline.is_finite() && deadline >= 0.0)
            && state.last_seen.as_ref().is_none_or(finite_position)
            && state.target_id.as_deref().is_none_or(is_safe_record_id)
            && state.target_id.is_some() == state.target_life.is_some()
            && state
                .target_life
                .is_none_or(|life| life <= crate::identity::MAX_SAFE_INTEGER)
            && (!state.mode.chases() || state.target_id.is_some() && state.episode_until.is_some())
            && (state.mode != Mode::Search || state.search_until.is_some())
            && state
                .exhausted_target
                .as_ref()
                .is_none_or(|target| is_safe_record_id(&target.id))
            && [&law.windup_text, &law.withdrawal_text, &law.stop_text]
                .iter()
                .all(|text| (1..=500).contains(&text.units_len()))
    }

    pub(crate) fn review_at(&self, entity: &Entity, now: f64) -> Option<f64> {
        let actor = entity.actor.as_ref()?;
        if actor.controller != "native"
            || !actor.alive
            || actor.incapacitated
            || !entity.actively_participates()
            || (self.needs_feeding_location()
                && entity
                    .animal
                    .as_ref()
                    .is_some_and(|animal| animal.episode.is_some()))
            || self.progress.relinquished && self.progress.mode == Mode::Idle
        {
            return None;
        }
        let state = &self.progress;
        let mut next = state.review_at;
        if state.mode.chases() {
            if self
                .policy
                .pursuit_metres
                .zip(state.travelled_metres)
                .is_some_and(|(limit, travelled)| travelled >= limit)
            {
                return Some(now);
            }
            if let Some(at) = state.episode_until {
                next = next.min(at);
            }
            if let (Mode::Search, Some(at)) = (state.mode, state.search_until) {
                next = next.min(at);
            }
        }
        Some(next)
    }

    pub(crate) fn detour_available(&self) -> bool {
        self.progress.mode == Mode::Idle
            || self.progress.detours_spent
                < self.policy.detours + u64::from(self.progress.mode == Mode::Return)
    }
}
