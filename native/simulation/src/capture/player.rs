//! Player contact controls depend on a small set of genuine private facts.
//! They are detached with the acquired body cut, never recovered by a Node
//! Entity/WorldState mirror after capture.

use super::*;
use crate::experience::PersonalSourceKind;
use crate::host::retained_size::tree_node_bound;
use std::collections::{BTreeMap, BTreeSet};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EncounterPreference {
    actor_life: u64,
    target_id: String,
    target_life: u64,
    episode: Option<String>,
    revision: u64,
    hostile_revision: u64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ContextActionWitness {
    module_revision: u64,
    actor_life: Option<u64>,
    target_life: Option<u64>,
    encounter: Option<EncounterPreference>,
    // Installed live coaching/ranged records are explicitly unsupported. These
    // nulls are proven absence at their semantic owner, not unknown witnesses.
    coaching: Option<()>,
    combat_ready: bool,
    ranged_ready: Option<bool>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct CapturedPlayerBody {
    context: ContextActionWitness,
    #[serde(skip_serializing_if = "Option::is_none")]
    attention_preference: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    communication_id: Option<String>,
    trade_eligible: bool,
}
impl CapturedPlayerBody {
    pub(super) fn heap_bytes(&self) -> Option<usize> {
        self.communication_id
            .heap_bytes()?
            .checked_add(
                self.context
                    .encounter
                    .as_ref()
                    .map_or(Some(0), |encounter| {
                        encounter
                            .target_id
                            .heap_bytes()?
                            .checked_add(encounter.episode.heap_bytes()?)
                    })?,
            )
    }
}

pub(super) struct PlayerReadScope<'a> {
    state: &'a SimulationState,
    actor: &'a crate::state::Entity,
    attention: BTreeMap<&'a str, bool>,
    _reservation: ByteReservation,
}
impl<'a> PlayerReadScope<'a> {
    pub(super) fn prepare(
        state: &'a SimulationState,
        actor_id: &str,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let actor = state
            .physical
            .entities
            .get(actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let own = actor.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
        if own.encounters.is_some()
            || own.coaching_episode_id.is_some()
            || own
                .action
                .as_ref()
                .is_some_and(|action| action.ranged.is_some() || action.guard.is_some())
        {
            return Err(ExecutionError::UnsupportedFamily);
        }
        // Source trade knowledge is acquired awareness, not the live offer map.
        // Complete coverage proves the empty supported branch. Never turn a
        // cold/partial collection or unconverted agreement into an empty menu.
        if let Some(collection) = state
            .experience
            .optional_collection(actor_id, PersonalSourceKind::Awareness)?
        {
            let privacy = &state
                .experience
                .actor(actor_id)
                .ok_or(ExecutionError::Invariant)?
                .privacy;
            let law = state.installed.account_law();
            if collection.may_have_current_trade_terms()?
                && collection.records().any(|record| {
                    let header = record.header();
                    header.agreement_body
                        && (header.personal_agreement
                            || header
                                .event_type
                                .as_deref()
                                .is_some_and(|event| law.agreement_event(event)))
                        && header
                            .event_id
                            .as_ref()
                            .is_some_and(|id| !privacy.revoked(id))
                })
            {
                return Err(ExecutionError::UnsupportedFamily);
            }
        }
        let attention = state
            .reception
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(actor_id))
            .and_then(|owner| owner.attention.as_ref());
        let count = attention.map_or(0, |attention| attention.annotations.len());
        let explicit_count = attention.map_or(0, |attention| attention.explicit.len());
        let bytes = count
            .checked_mul(tree_node_bound::<&str, bool>().ok_or(ExecutionError::Capacity)?)
            .and_then(|n| {
                n.checked_add(explicit_count.checked_mul(tree_node_bound::<&str, ()>()?)?)
            })
            .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bytes)?;
        let mut selected = BTreeMap::new();
        if let Some(attention) = attention {
            let explicit = attention
                .explicit
                .iter()
                .map(String::as_str)
                .collect::<BTreeSet<_>>();
            // Map construction matches Source's last annotation for a source.
            for (key, annotation) in &attention.annotations {
                selected.insert(
                    annotation.source_id.as_str(),
                    explicit.contains(key.as_str()),
                );
            }
        }
        Ok(Self {
            state,
            actor,
            attention: selected,
            _reservation: reservation,
        })
    }
    pub(super) fn capture(
        &self,
        id: &str,
        names: &InstalledPersonalNameReader<'_>,
        budget: &ByteBudget,
    ) -> Result<(CapturedPlayerBody, ByteReservation), ExecutionError> {
        let target = self
            .state
            .physical
            .entities
            .get(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let own = self
            .actor
            .actor
            .as_ref()
            .ok_or(ExecutionError::MissingActor)?;
        let other = target.actor.as_ref();
        if other.is_some_and(|actor| actor.encounters.is_some()) {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let communication = names
            .current_body_association(id)?
            .and_then(|subject| names.observer_individual(subject))
            .and_then(|individual| individual.canonical_id.as_deref());
        let episode = self
            .state
            .reception
            .perception_episodes
            .as_ref()
            .and_then(|owners| owners.get(&self.actor.id))
            .and_then(|episodes| episodes.get(id));
        let encounter = self
            .state
            .installed
            .body_policy
            .as_ref()
            .and_then(|policy| policy.value().combat.as_ref())
            .and_then(|combat| combat.encounters.as_ref())
            .is_some()
            && own.alive
            && other.is_some_and(|actor| actor.alive)
            && self.actor.id != id
            && self.actor.actively_participates()
            && target.actively_participates();
        let bytes = communication
            .map_or(0, str::len)
            .checked_add(if encounter {
                id.len()
                    .checked_add(episode.map_or(0, String::len))
                    .ok_or(ExecutionError::Capacity)?
            } else {
                0
            })
            .ok_or(ExecutionError::Capacity)?;
        let mut reservation = budget.reserve(bytes)?;
        let captured = CapturedPlayerBody {
            context: ContextActionWitness {
                module_revision: self.state.installed.manifest.revision,
                actor_life: own.physical_life,
                target_life: other.and_then(|actor| actor.physical_life),
                encounter: encounter.then(|| EncounterPreference {
                    actor_life: own.physical_life.unwrap_or(0),
                    target_id: id.to_owned(),
                    target_life: other.and_then(|actor| actor.physical_life).unwrap_or(0),
                    episode: episode.cloned(),
                    revision: 0,
                    hostile_revision: 0,
                }),
                coaching: None,
                combat_ready: own.combat_ready_at.unwrap_or(0.0)
                    > self.state.physical.header.sim_time,
                ranged_ready: None,
            },
            attention_preference: self.attention.get(id).copied(),
            communication_id: communication.map(str::to_owned),
            trade_eligible: other.is_some_and(|actor| actor.alive)
                && self
                    .state
                    .installed
                    .retained
                    .item_handling_read
                    .can_handle(&target.spatial.body.id),
        };
        reservation.resize(captured.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        Ok((captured, reservation))
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct OwnPlayerView<'a> {
    pub seed: u64,
    pub module_revision: u64,
    pub spatial_revision: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<&'a crate::state::LivingBody>,
    pub held_stock: &'a [(String, f64)],
    pub equipped: &'a [crate::reception::CarriedItem],
    pub knowledge_revision: u64,
    pub agency: &'a crate::state::ActorAgency,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub practice: Option<&'a indexmap::IndexMap<String, crate::state::PracticeProgress>>,
    pub practice_records: &'a [super::practice::PracticeRecord<'a>],
    #[serde(skip_serializing_if = "Option::is_none")]
    pub participation: Option<&'a crate::state::Participation>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scars: Option<&'a indexmap::IndexMap<String, f64>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pending_death: Option<&'a crate::body::PendingDeath>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remains_phase: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub evasion_ready_at: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub combat_ready_at: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub natural_strike_ids: Option<&'a [String]>,
    pub action_animation: Option<crate::worlds::base_observed::ObservedActionAnimation>,
    pub senses: &'a super::metadata::OwnSenses,
    pub map_markers: &'a [super::metadata::OwnMarker<'a>],
    pub communication_subjects: &'a [crate::worlds::CommunicationSubject<'a>],
    pub known_recipes: &'a [String],
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct CapturedPlayerPerception {
    pub trade_terms: &'static str,
    pub physical_landmarks: &'static str,
    pub finite_weather_cue: &'static str,
}
