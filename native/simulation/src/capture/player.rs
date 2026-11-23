//! Player contact controls depend on a small set of genuine private facts.
//! They are detached with the acquired body cut, never recovered by a Node
//! Entity/WorldState mirror after capture.

use super::*;
use crate::experience::PersonalSourceKind;
use crate::host::retained_size::tree_node_bound;
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EncounterPreference<Text = String> {
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub actor_life: u64,
    pub target_id: Text,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub target_life: u64,
    pub episode: Option<Text>,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub revision: u64,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub hostile_revision: u64,
}
impl<T: AsRef<str>> EncounterPreference<T> {
    pub(crate) fn valid(&self) -> bool {
        use crate::values::is_safe_record_id;
        is_safe_record_id(self.target_id.as_ref())
            && self
                .episode
                .as_ref()
                .is_none_or(|episode| is_safe_record_id(episode.as_ref()))
    }
}
impl EncounterPreference<String> {
    pub(crate) fn borrowed(&self) -> EncounterPreference<&str> {
        EncounterPreference {
            actor_life: self.actor_life,
            target_id: &self.target_id,
            target_life: self.target_life,
            episode: self.episode.as_deref(),
            revision: self.revision,
            hostile_revision: self.hostile_revision,
        }
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextActionWitness {
    pub module_revision: u64,
    pub actor_life: Option<u64>,
    pub target_life: Option<u64>,
    pub encounter: Option<EncounterPreference>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub encounter_family: Option<crate::combat_encounters::EncounterFamily>,
    // Installed live coaching/ranged records are explicitly unsupported. These
    // nulls are proven absence at their semantic owner, not unknown witnesses.
    coaching: Option<()>,
    pub combat_ready: bool,
    pub ranged_ready: Option<bool>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct CapturedPlayerBody {
    pub(super) context: ContextActionWitness,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(super) attention_preference: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(super) communication_id: Option<String>,
    pub(super) trade_eligible: bool,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub(super) gift_heads: Vec<crate::handover::GiftHead>,
}
impl CapturedPlayerBody {
    pub(super) fn heap_bytes(&self) -> Option<usize> {
        self.communication_id
            .heap_bytes()?
            .checked_add(self.gift_heads.iter().try_fold(
                self.gift_heads.capacity().checked_mul(std::mem::size_of::<crate::handover::GiftHead>())?,
                |bytes, gift| bytes.checked_add(gift.id.capacity()),
            )?)?
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
    pub(super) actor: &'a crate::state::Entity,
    gifts: crate::handover::ReceivedGifts,
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
        if own.coaching_episode_id.is_some()
            || own
                .action
                .as_ref()
                .is_some_and(|action| (action.guard.is_some() && !action.is_guard())
                        || (action.ranged.is_some() && !action.is_projectile_action()))
        {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let gifts = crate::handover::ReceivedGifts::from_player(state, actor_id, budget)?;
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
            gifts,
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
        let communication = names
            .current_body_association(id)?
            .and_then(|subject| names.observer_individual(subject))
            .and_then(|individual| individual.canonical_id.as_deref());
        let encounter = crate::combat_encounters::context(self.state, self.actor, target);
        let bytes = communication
            .map_or(0, str::len)
            .checked_add(if let Some(encounter) = &encounter {
                id.len()
                    .checked_add(encounter.binding.episode.map_or(0, str::len))
                    .ok_or(ExecutionError::Capacity)?
            } else {
                0
            })
            .ok_or(ExecutionError::Capacity)?;
        let bytes = self.gifts.with_party(id).try_fold(bytes, |bytes, gift| {
            bytes.checked_add(std::mem::size_of::<crate::handover::GiftHead>())?
                .checked_add(gift.offer.id.len())
        }).ok_or(ExecutionError::Capacity)?;
        let mut reservation = budget.reserve(bytes)?;
        let captured = CapturedPlayerBody {
            context: ContextActionWitness {
                module_revision: self.state.installed.manifest.revision,
                actor_life: own.physical_life,
                target_life: other.and_then(|actor| actor.physical_life),
                encounter: encounter.as_ref().map(|read| EncounterPreference {
                    actor_life: read.binding.actor_life,
                    target_id: read.binding.target_id.to_owned(),
                    target_life: read.binding.target_life,
                    episode: read.binding.episode.map(str::to_owned),
                    revision: read.binding.revision,
                    hostile_revision: read.binding.hostile_revision,
                }),
                encounter_family: encounter.as_ref().map(|read| read.family),
                coaching: None,
                combat_ready: own.combat_ready_at.unwrap_or(0.0)
                    > self.state.physical.header.sim_time,
                ranged_ready: encounter.and_then(|read| read.held.map(|shot| shot.ready)),
            },
            attention_preference: self.attention.get(id).copied(),
            communication_id: communication.map(str::to_owned),
            gift_heads: self.gifts.with_party(id).map(|gift| crate::handover::GiftHead {
                id: gift.offer.id.clone(), revision: gift.offer.revision,
            }).collect(),
            trade_eligible: self.state.installed.retained.social_offer_read.is_some()
                && crate::handover::gift_participant(self.state, target)?,
        };
        reservation.resize(captured.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        Ok((captured, reservation))
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct OwnPlayerView<'a> {
    pub can_steer: bool,
    pub seed: u64,
    pub module_revision: u64,
    pub spatial_revision: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<&'a crate::state::LivingBody>,
    pub inventory_revision: u64,
    pub inventory: &'a [crate::install::OwnedItem<'a>],
    pub held_stock: &'a [(&'a str, f64)],
    #[serde(skip)]
    pub craft_stock: &'a indexmap::IndexMap<&'a str, u64>,
    pub equipped: &'a [crate::install::OwnedItem<'a>],
    #[serde(skip)]
    pub ranged_source: Option<super::PlayerRangedSource<'a>>,
    #[serde(skip)]
    pub melee_source: Option<super::PlayerMeleeSource<'a>>,
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
    pub attack_mode_notice: Option<&'a crate::state::AttackModeNotice>,
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
    pub current_place_label: Option<crate::text::JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub weather: Option<crate::weather::LocalWeather>,
}
