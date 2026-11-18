//! Typed, read-only inputs for the application projection of one permitted
//! player cut. Raw source IDs here are for scoped reference construction,
//! never wire IDs. The owning read remains required for final disclosure.

use super::{
    CapturedActorPerception, ContextActionWitness, OwnActorProduct, OwnPlayerView,
    OwnReferenceAttribution,
};
use crate::{
    execution::ExecutionError,
    reception::{AttributeView, CapturedCurrentFacet, ObserverSubject, SensoryFacet},
    state::{ActorAgency, BodyProfile, CharacterTrait, LivingBody, Named, Participation, Point},
    text::{JsText, TextRef},
    worlds::base_observed::{ObservedActionAnimation, StatusEffectProjection},
};
use serde::Serialize;
use std::sync::Arc;

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerIdentityFacts<'a> {
    pub id: &'a str,
    pub name: &'a JsText,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name_form: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub indefinite_article: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub appearance: Option<&'a JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub species: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub traits: Option<&'a [CharacterTrait]>,
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerActionFacts<'a> {
    pub id: &'a str,
    #[serde(rename = "type")]
    pub kind: &'a str,
    pub stage: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub definition_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attribute_id: Option<&'a str>,
    pub total_seconds: f64,
    pub remaining_seconds: f64,
    pub preparing_navigation: bool,
}

/// Self-only facts loaned inside the accepted-read lane. Detached application
/// products must reserve the bytes they retain. No NPC mind fields are exposed.
pub struct PlayerSelfFacts<'a> {
    pub world_id: &'a str,
    pub actor_id: &'a str,
    pub generation: &'a str,
    pub accepted_cut: u64,
    pub at: f64,
    pub sequence: u64,
    pub identity: PlayerIdentityFacts<'a>,
    pub observer_name: TextRef<'a>,
    pub observer_name_form: Option<&'a str>,
    pub observer_indefinite_article: Option<&'a str>,
    pub reference_attribution: PlayerSelfAttribution<'a>,
    pub physical_life: Option<u64>,
    pub alive: bool,
    pub incapacitated: bool,
    pub position: Point,
    pub heading: f64,
    pub support_surface_id: Option<&'a str>,
    pub body_profile: &'a BodyProfile,
    pub attributes: &'a [AttributeView],
    pub status_effects: &'a [StatusEffectProjection],
    pub action_status_labels: &'a [&'a str],
    pub action: Option<PlayerActionFacts<'a>>,
    pub speech: bool,
    pub speech_blocked: bool,
    pub actions_blocked: bool,
    pub can_steer: bool,
    pub seed: u64,
    pub module_revision: u64,
    pub spatial_revision: u64,
    pub body: Option<&'a LivingBody>,
    pub held_stock: &'a [(String, f64)],
    pub equipped: &'a [crate::reception::CarriedItem],
    pub knowledge_revision: u64,
    pub agency: &'a ActorAgency,
    pub practice: Option<&'a indexmap::IndexMap<String, crate::state::PracticeProgress>>,
    pub participation: Option<&'a Participation>,
    pub pending_death: Option<&'a crate::body::PendingDeath>,
    pub scars: Option<&'a indexmap::IndexMap<String, f64>>,
    pub remains_phase: Option<&'a str>,
    pub evasion_ready_at: Option<f64>,
    pub combat_ready_at: Option<f64>,
    pub natural_strike_ids: Option<&'a [String]>,
    pub action_animation: Option<&'a ObservedActionAnimation>,
    pub senses_enabled: bool,
    pub perception_blocked: bool,
    pub vision_radius: f64,
    pub vision_angle: f64,
    pub hearing_floor: Option<f64>,
    pub known_recipes: &'a [String],
    own: &'a OwnPlayerView<'a>,
}

pub enum PlayerSelfAttribution<'a> {
    Received(&'a str),
    Sequence(u64),
}

pub struct PlayerMapMarker<'a> {
    pub marker: &'a crate::reception::MapMarker,
    pub note: Option<&'a JsText>,
    pub note_revision: u64,
}

pub struct PlayerCommunicationSubject<'a> {
    pub id: &'a str,
    pub label: Option<&'a JsText>,
    pub description: Option<&'a Named>,
}

impl<'a> PlayerSelfFacts<'a> {
    pub fn communication_subjects(
        &self,
    ) -> impl ExactSizeIterator<Item = PlayerCommunicationSubject<'a>> + '_ {
        self.own.communication_subjects.iter().map(|subject| {
            let (id, label, description) = subject.projection();
            PlayerCommunicationSubject {
                id,
                label,
                description,
            }
        })
    }

    pub fn practice_records(
        &self,
    ) -> impl ExactSizeIterator<Item = (&'a str, &'a crate::activity::ActivityView)> + '_ {
        self.own
            .practice_records
            .iter()
            .map(|record| (record.key, record.view))
    }

    pub fn map_markers(&self) -> impl ExactSizeIterator<Item = PlayerMapMarker<'a>> + '_ {
        self.own.map_markers.iter().map(|marker| PlayerMapMarker {
            marker: marker.marker,
            note: marker.note,
            note_revision: marker.revision,
        })
    }
}

impl OwnActorProduct<'_> {
    pub(crate) fn player_facts(&self) -> Result<PlayerSelfFacts<'_>, ExecutionError> {
        let player = self.player.as_ref().ok_or(ExecutionError::Invariant)?;
        Ok(PlayerSelfFacts {
            world_id: self.world_id,
            actor_id: self.actor_id,
            generation: self.generation,
            accepted_cut: self.accepted_cut,
            at: self.at,
            sequence: self.sequence,
            identity: self.identity,
            observer_name: self.observer_name.name,
            observer_name_form: self.observer_name.name_form,
            observer_indefinite_article: self.observer_name.indefinite_article,
            reference_attribution: match self.reference_attribution {
                OwnReferenceAttribution::Received(id) => PlayerSelfAttribution::Received(id),
                OwnReferenceAttribution::Sequence(sequence) => {
                    PlayerSelfAttribution::Sequence(sequence)
                }
            },
            physical_life: self.physical_life,
            alive: self.alive,
            incapacitated: self.incapacitated,
            position: self.position,
            heading: self.heading,
            support_surface_id: self.support_surface_id,
            body_profile: self.body_profile,
            attributes: self.attributes,
            status_effects: self.status_effects,
            action_status_labels: self.action_status_labels,
            action: self.action,
            speech: self.speech,
            speech_blocked: self.speech_blocked,
            actions_blocked: self.actions_blocked,
            can_steer: player.can_steer,
            seed: player.seed,
            module_revision: player.module_revision,
            spatial_revision: player.spatial_revision,
            body: player.body,
            held_stock: player.held_stock,
            equipped: player.equipped,
            knowledge_revision: player.knowledge_revision,
            agency: player.agency,
            practice: player.practice,
            participation: player.participation,
            pending_death: player.pending_death,
            scars: player.scars,
            remains_phase: player.remains_phase,
            evasion_ready_at: player.evasion_ready_at,
            combat_ready_at: player.combat_ready_at,
            natural_strike_ids: player.natural_strike_ids,
            action_animation: player.action_animation.as_ref(),
            senses_enabled: player.senses.enabled,
            perception_blocked: player.senses.perception_blocked,
            vision_radius: player.senses.radius,
            vision_angle: player.senses.vision_angle,
            hearing_floor: player.senses.hearing_floor,
            known_recipes: player.known_recipes,
            own: player,
        })
    }
}

pub struct PlayerPerception<'a> {
    read: &'a CapturedActorPerception,
    pub world_id: &'a str,
    pub actor_id: &'a str,
    pub at: f64,
    pub sight_confirmed_through: Option<f64>,
    pub current_place_label: Option<&'a JsText>,
    pub trade_terms: &'static str,
    pub finite_weather_cue: &'static str,
}

/// An observed subject and the original permitted facets supporting its
/// pose, description and public details, in the capture's existing order.
pub struct PlayerObservedBody<'a> {
    pub source_id: &'a str,
    pub physical_life: Option<u64>,
    pub lease_id: &'a str,
    pub episode: Option<&'a str>,
    pub subject: Option<&'a ObserverSubject>,
    pub name: &'a Named,
    pub known_name: Option<&'a JsText>,
    pub nickname: Option<&'a JsText>,
    pub name_revision: Option<u64>,
    pub actor: bool,
    pub talk_requires_ai: bool,
    pub context: &'a ContextActionWitness,
    pub attention_preference: Option<bool>,
    pub communication_id: Option<&'a str>,
    pub trade_eligible: bool,
    current: &'a [Arc<CapturedCurrentFacet>],
}

impl<'a> PlayerObservedBody<'a> {
    pub fn facets(&self) -> impl ExactSizeIterator<Item = &'a CapturedCurrentFacet> + '_ {
        self.current.iter().map(Arc::as_ref)
    }

    pub fn body_facet(&self) -> Option<&'a CapturedCurrentFacet> {
        self.facets()
            .find(|facet| matches!(facet.value, SensoryFacet::Body { .. }))
    }
}

impl<'a> PlayerPerception<'a> {
    pub(crate) fn new(read: &'a CapturedActorPerception) -> Result<Self, ExecutionError> {
        let player = read.player.as_ref().ok_or(ExecutionError::Invariant)?;
        Ok(Self {
            read,
            world_id: &read.world_id,
            actor_id: &read.actor_id,
            at: read.at,
            sight_confirmed_through: read.sight_confirmed_through,
            current_place_label: player.current_place_label.as_ref(),
            trade_terms: player.trade_terms,
            finite_weather_cue: player.finite_weather_cue,
        })
    }

    /// A missing slot indicates invalid capture structure, so a consumer must
    /// refuse its projection rather than removing that subject from the view.
    pub fn bodies(&self) -> impl ExactSizeIterator<Item = Option<PlayerObservedBody<'a>>> + '_ {
        self.read.bodies.iter().map(|value| {
            let player = value.player.as_ref()?;
            let end = value.first.checked_add(value.count)?;
            let current = self.read.evidence.cut().current.get(value.first..end)?;
            Some(PlayerObservedBody {
                source_id: &value.source_id,
                physical_life: value.physical_life,
                lease_id: &value.lease_id,
                episode: value.episode.as_deref(),
                subject: value.subject.as_ref(),
                name: value.name.name(),
                known_name: value
                    .identity
                    .as_ref()
                    .and_then(|name| name.known_name.as_ref()),
                nickname: value
                    .identity
                    .as_ref()
                    .and_then(|name| name.nickname.as_ref()),
                name_revision: value.identity.as_ref().map(|name| name.revision),
                actor: value.actor,
                talk_requires_ai: value.talk_requires_ai,
                context: &player.context,
                attention_preference: player.attention_preference,
                communication_id: player.communication_id.as_deref(),
                trade_eligible: player.trade_eligible,
                current,
            })
        })
    }
}
