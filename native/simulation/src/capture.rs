//! Finite actor-owned read products. The application supplies its current
//! authorized scope and rechecks that scope before publishing the result. No
//! producer here exports physical authority or supplies a missing observation.

use crate::commands::SpeechTargetRole;
use crate::execution::ExecutionError;
use crate::experience::{CapturedEvidenceCut, capture_evidence_cut};
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::{CurrentBodyReadScope, ObserverSubject, OwnedCurrentFacet};
use crate::simulation::SimulationState;
use crate::worlds::{InstalledPersonalNameReader, OwnedPersonalName};
use serde::{Serialize, Serializer};
use std::mem::size_of;
mod controls;
mod definitions;
pub(crate) use definitions::write_installed_definitions;
mod metadata;
pub(crate) mod maintenance;
mod validity;
pub(crate) use validity::DecisionValidityWitness;
mod navigation;
mod npc_bindings;
mod npc_perspectives;
pub(crate) use npc_perspectives::{NpcPerspectiveEntity,NpcPerspectiveSnapshot};
mod npc_current;
pub(crate) mod npc_intake;
mod npc_references;
mod npc_subject;
pub(crate) use npc_bindings::{
    NpcAliasOrdinal, NpcActionOrdinal, NpcCatalogueSource, NpcPerspectiveOrdinal, NpcBindingMaps, NpcBindingPurpose, NpcBindingRead, NpcBindingSelection, prepare_ordinary_actions, npc_perspectives_current,
};
pub(crate) use npc_references::NpcReferenceFacts;
mod npc_history;
pub(crate) use npc_history::{NpcHistoricalScope, NpcHistoryPrefix};
mod npc_sources;
pub(crate) use npc_sources::{
    NpcSourceRows, NpcSourceSelection, NpcPersonalSelection, NpcSourcesAnswer, NpcSourcesCursor, NpcSourcesRequest,
    PreparedNpcSources,
};
mod npc_selection;
pub(crate) use npc_selection::NpcObservationSelection;
mod npc_candidates;
pub(crate) use npc_candidates::{
    NpcCandidateAnswer, NpcCandidateCursor, NpcCandidateStep, NpcDescriptionsAnswer,
    NpcDescriptionsRequest, NpcOfferCoverage, PreparedNpcCandidates,
};
mod outcomes;
mod player;
mod practice;
pub(crate) use controls::{CapturedPlayerControls, PlayerControlPreparation};
use player::{CapturedPlayerBody, CapturedPlayerPerception, OwnPlayerView, PlayerReadScope};

// The Source currentObservedFacetValues default is a finite presentation
// selection, not every field of every channel in a stored contact. In
// particular field_order holds encoded addresses, not sensory kind names.
const BODY_VALUE_KINDS: [&str; 9] = [
    "detected",
    "location",
    "body",
    "description",
    "carried",
    "pile-contents",
    "public-attributes",
    "contact",
    "association",
];

#[derive(Clone, Copy)]
pub(crate) enum ActorReadPurpose {
    PlayerView,
    NpcDecision,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PreferredName {
    #[serde(skip_serializing_if = "Option::is_none")]
    known_name: Option<crate::text::JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    nickname: Option<crate::text::JsText>,
    revision: u64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CapturedBodyBinding {
    // Routing stays server-side. Public/model text receives the shared opaque
    // reference formatter's tokens, never this private canonical ID.
    pub source_id: String,
    pub physical_life: Option<u64>,
    pub lease_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub episode: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subject: Option<ObserverSubject>,
    pub name: OwnedPersonalName,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub identity: Option<PreferredName>,
    pub actor: bool,
    pub talk_requires_ai: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    player: Option<CapturedPlayerBody>,
    #[serde(skip)]
    _player_reservation: Option<ByteReservation>,
    pub first: usize,
    pub count: usize,
}
pub(crate) struct CapturedActorPerception {
    pub world_id: String,
    pub actor_id: String,
    pub at: f64,
    pub sight_confirmed_through: Option<f64>,
    pub bodies: Vec<CapturedBodyBinding>,
    pub evidence: CapturedEvidenceCut,
    pub geometry: Option<CapturedGeometryRange>,
    player: Option<CapturedPlayerPerception>,
    npc_current: Option<npc_current::NpcCurrentCapture>,
    _reservation: ByteReservation,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CapturedGeometryRange {
    first: usize,
    count: usize,
    complete: bool,
    visited: u64,
    supported_through: f64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PerceptionProduct<'a> {
    world_id: &'a str,
    actor_id: &'a str,
    at: f64,
    sight_confirmed_through: Option<f64>,
    bodies: &'a [CapturedBodyBinding],
    cut: &'a crate::experience::EvidenceCut,
    #[serde(skip_serializing_if = "Option::is_none")]
    geometry: Option<&'a CapturedGeometryRange>,
    #[serde(skip_serializing_if = "Option::is_none")]
    player: Option<&'a CapturedPlayerPerception>,
    #[serde(skip_serializing_if = "Option::is_none")]
    npc_current: Option<&'a npc_current::NpcCurrentCapture>,
}
impl CapturedActorPerception {
    pub(crate) fn attention_presentations(&self) -> &[crate::attention::AttentionPresentation] {
        self.npc_current
            .as_ref()
            .map_or(&[], |current| current.attention.entries.as_slice())
    }
    pub(crate) fn write_json(
        &self,
        budget: &ByteBudget,
    ) -> Result<(String, ByteReservation), ExecutionError> {
        let product = PerceptionProduct {
            world_id: &self.world_id,
            actor_id: &self.actor_id,
            at: self.at,
            sight_confirmed_through: self.sight_confirmed_through,
            bodies: &self.bodies,
            cut: self.evidence.cut(),
            geometry: self.geometry.as_ref(),
            player: self.player.as_ref(),
            npc_current: self.npc_current.as_ref(),
        };
        let length =
            crate::encoding::json_record_len(&product).map_err(|_| ExecutionError::Invariant)?;
        // The JSON writer grows its byte vector before converting it to the
        // single owned string. Its capacity remains with the detached output.
        let mut reservation = budget.reserve(
            length
                .checked_mul(2)
                .map(|n| n.max(8))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let encoded =
            crate::encoding::json_record(&product).map_err(|_| ExecutionError::Invariant)?;
        reservation.resize(encoded.capacity())?;
        Ok((encoded, reservation))
    }
}

/// Synchronous internal read, called only under the simulation's accepted-read
/// gate. Names and fields come from one borrowed receiving life; that reader is
/// released before the output can cross an application await.
pub(crate) fn capture_actor_perception(
    state: &SimulationState,
    actor_id: &str,
    purpose: ActorReadPurpose,
    budget: &ByteBudget,
) -> Result<CapturedActorPerception, ExecutionError> {
    let observer = state
        .physical
        .entities
        .get(actor_id)
        .and_then(|entity| entity.actor.as_ref())
        .ok_or(ExecutionError::MissingActor)?;
    let scope = CurrentBodyReadScope::prepare(
        &state.reception,
        &state.physical.entities,
        &state.installed,
        &state.experience,
        &crate::worlds::InstalledEvidenceMeaning,
        actor_id,
    )?;
    let names = InstalledPersonalNameReader::prepare(
        &state.physical,
        &state.reception,
        &state.installed,
        &state.experience,
        actor_id,
    )?;
    let player = matches!(purpose, ActorReadPurpose::PlayerView)
        .then(|| PlayerReadScope::prepare(state, actor_id, budget))
        .transpose()?;
    let mut bytes = size_of::<CapturedActorPerception>()
        .checked_add(state.physical.header.id.len())
        .and_then(|n| n.checked_add(actor_id.len()))
        .ok_or(ExecutionError::Capacity)?;
    let mut maximum_fields = 0usize;
    let count = scope
        .as_ref()
        .map_or(0, |scope| scope.state().current.len());
    if let Some(scope) = &scope {
        for id in scope.state().current.keys() {
            let body = scope.native_body(id)?;
            if let Some(body) = body {
                maximum_fields = maximum_fields
                    .checked_add(BODY_VALUE_KINDS.len() + 1)
                    .ok_or(ExecutionError::Capacity)?;
                let individual = names.current_body_identity(id)?;
                let copied = body
                    .field
                    .local_subject
                    .heap_bytes()
                    .and_then(|n| n.checked_add(body.field.id.len()))
                    .and_then(|n| n.checked_add(id.len()))
                    .and_then(|n| {
                        n.checked_add(
                            state
                                .reception
                                .perception_episodes
                                .as_ref()
                                .and_then(|owners| owners.get(actor_id))
                                .and_then(|episodes| episodes.get(id))
                                .map_or(0, String::len),
                        )
                    })
                    .and_then(|n| {
                        n.checked_add(
                            individual
                                .and_then(|identity| identity.individual_id.as_ref())
                                .map_or(0, String::len),
                        )
                    })
                    .and_then(|n| {
                        n.checked_add(individual.map_or(0, |identity| {
                            identity.given_name.storage_bytes()
                                + identity
                                    .nickname
                                    .as_ref()
                                    .map_or(0, crate::text::JsText::storage_bytes)
                        }))
                    })
                    .ok_or(ExecutionError::Capacity)?;
                // current_body_subject's exact note key quotes the subject once;
                // both possible local/association keys and their transient JSON
                // writer growth are funded before that semantic lookup.
                bytes = bytes
                    .checked_add(
                        copied
                            .checked_mul(6)
                            .and_then(|n| n.checked_add(2 * 64))
                            .ok_or(ExecutionError::Capacity)?,
                    )
                    .ok_or(ExecutionError::Capacity)?;
            }
        }
    }
    bytes = bytes
        .checked_add(
            count
                .checked_mul(size_of::<CapturedBodyBinding>())
                .ok_or(ExecutionError::Capacity)?,
        )
        .and_then(|n| n.checked_add(maximum_fields.checked_mul(size_of::<OwnedCurrentFacet>())?))
        .ok_or(ExecutionError::Capacity)?;
    let reservation = budget.reserve(bytes)?;
    let mut bodies = Vec::new();
    bodies
        .try_reserve_exact(count)
        .map_err(|_| ExecutionError::Capacity)?;
    let mut current = Vec::new();
    current
        .try_reserve_exact(maximum_fields)
        .map_err(|_| ExecutionError::Capacity)?;
    if let Some(scope) = &scope {
        let ordered = scope.ordered_subjects(budget)?;
        for id in ordered.ids() {
            if id == actor_id {
                continue;
            }
            let Some(body) = scope.native_body(id)? else {
                continue;
            };
            let first = current.len();
            for kind in BODY_VALUE_KINDS {
                if let Some(field) = scope.capture(id, kind, budget)? {
                    current.push(field);
                }
            }
            if let Some(motion) =
                scope.capture_motion(id, state.physical.header.sim_time, budget)?
            {
                current.push(motion);
            }
            // A verified current body must have its actual permitted body
            // field among these captures. No neutral/canonical substitute.
            if !current[first..].iter().any(|field| {
                matches!(
                    field.facet().value,
                    crate::reception::SensoryFacet::Body { .. }
                )
            }) {
                return Err(ExecutionError::Invariant);
            }
            if player.is_some()
                && current[first..].iter().any(|field| {
                    matches!(&field.facet().value, crate::reception::SensoryFacet::Body { body }
                    if body.storage.is_some() || body.assembly.is_some())
                })
            {
                // These controls need real inventory/assembly reader products.
                // Refusing the positive unconverted family is safer than an
                // apparently complete contact with its controls silently gone.
                return Err(ExecutionError::UnsupportedFamily);
            }
            let subject = names.current_body_subject(id)?;
            let identity = subject
                .as_ref()
                .and_then(|subject| names.observer_individual(subject))
                .filter(|identity| identity.seed_only != Some(true))
                .map(|identity| PreferredName {
                    known_name: (!identity.given_name.is_empty())
                        .then(|| identity.given_name.clone()),
                    nickname: identity
                        .nickname
                        .as_ref()
                        .filter(|nickname| !nickname.is_empty())
                        .cloned(),
                    revision: identity.revision,
                });
            let actor = state
                .physical
                .entities
                .get(id)
                .and_then(|entity| entity.actor.as_ref());
            let (player_body, player_reservation) = player
                .as_ref()
                .map(|player| player.capture(id, &names, budget))
                .transpose()?
                .map_or((None, None), |(body, reservation)| {
                    (Some(body), Some(reservation))
                });
            bodies.push(CapturedBodyBinding {
                source_id: id.to_owned(),
                physical_life: body.grant.subject_physical_life,
                lease_id: body.field.id.clone(),
                episode: state
                    .reception
                    .perception_episodes
                    .as_ref()
                    .and_then(|owners| owners.get(actor_id))
                    .and_then(|episodes| episodes.get(id))
                    .cloned(),
                subject,
                name: names.capture_intended_name(id, SpeechTargetRole::Body, budget)?,
                identity,
                actor: actor.is_some(),
                talk_requires_ai: actor.is_some_and(|actor| actor.controller == "npc"),
                player: player_body,
                _player_reservation: player_reservation,
                first,
                count: current.len() - first,
            });
        }
    }
    // This reports the last completed sample for the same physical life. A
    // currently blocked detector removes body grants, not its measured clock.
    let sight_confirmed_through = state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(actor_id))
        .filter(|owner| owner.life == observer.physical_life.unwrap_or(0))
        .and_then(|owner| owner.visual_confirmation.as_ref())
        .map(|confirmation| confirmation.through);
    let (npc_current, current, _current_backing) =
        if matches!(purpose, ActorReadPurpose::NpcDecision) {
            let prepared = npc_current::prepare(
                state,
                actor_id,
                scope.as_ref(),
                &names,
                current.len(),
                budget,
            )?;
            let count = current
                .len()
                .checked_add(prepared.current.len())
                .ok_or(ExecutionError::Capacity)?;
            let backing = budget.reserve(
                count
                    .checked_mul(size_of::<OwnedCurrentFacet>())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let mut combined = Vec::new();
            combined
                .try_reserve_exact(count)
                .map_err(|_| ExecutionError::Capacity)?;
            combined.extend(current);
            combined.extend(prepared.current);
            (
                Some(prepared.capture),
                combined,
                Some((backing, prepared.backing)),
            )
        } else {
            (None, current, None)
        };
    drop(names);
    drop(scope);
    let (acquired, geometry) = if matches!(purpose, ActorReadPurpose::NpcDecision) {
        let read = crate::reception::current_received_geometry(state, actor_id, budget)?;
        let count = read.observations().count();
        let mut acquired = Vec::new();
        let bytes = count
            .checked_mul(size_of::<crate::reception::OwnedObservation>())
            .ok_or(ExecutionError::Capacity)?;
        // The final cut takes over each payload guard. This temporary vector's
        // own backing remains funded through the consuming cut constructor.
        let skeleton = budget.reserve(bytes)?;
        acquired
            .try_reserve_exact(count)
            .map_err(|_| ExecutionError::Capacity)?;
        for observation in read.observations() {
            acquired.push(crate::reception::capture_stored_observation(
                observation,
                budget,
            )?);
        }
        (
            Some((acquired, skeleton)),
            Some(CapturedGeometryRange {
                first: 0,
                count,
                complete: read.complete(),
                visited: read.visited(),
                supported_through: read.supported_through(),
            }),
        )
    } else {
        (None, None)
    };
    let (acquired, _acquired_backing) = acquired
        .map_or((Vec::new(), None), |(values, reservation)| {
            (values, Some(reservation))
        });
    let evidence = capture_evidence_cut(
        &state.experience,
        &state.physical.entities,
        &state.occurrences,
        actor_id,
        state.physical.header.sim_time,
        acquired,
        current,
        budget,
    )?;
    Ok(CapturedActorPerception {
        world_id: state.physical.header.id.clone(),
        actor_id: actor_id.to_owned(),
        at: state.physical.header.sim_time,
        sight_confirmed_through,
        bodies,
        evidence,
        geometry,
        npc_current,
        player: player.as_ref().map(|_| CapturedPlayerPerception {
            trade_terms: "none",
            // Physical installation admits only actors. Source exposedPlaces
            // requires a non-actor landmark; remembered sites cannot fill it.
            physical_landmarks: "absent",
            // Accepted read construction consumes SelectedInstallation, which
            // refuses the live finiteRain family before creating Simulation.
            finite_weather_cue: "absent",
        }),
        _reservation: reservation,
    })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OwnIdentity<'a> {
    id: &'a str,
    name: &'a crate::text::JsText,
    #[serde(skip_serializing_if = "Option::is_none")]
    name_form: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    indefinite_article: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    appearance: Option<&'a crate::text::JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    species: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    traits: Option<&'a [crate::state::CharacterTrait]>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OwnAction<'a> {
    id: &'a str,
    #[serde(rename = "type")]
    kind: &'a str,
    stage: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    target_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    definition_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    attribute_id: Option<&'a str>,
    total_seconds: f64,
    remaining_seconds: f64,
    preparing_navigation: bool,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OwnObserverName<'a> {
    name: crate::text::TextRef<'a>,
    #[serde(skip_serializing_if = "Option::is_none")]
    name_form: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    indefinite_article: Option<&'a str>,
}
#[derive(Serialize)]
#[serde(untagged)]
enum OwnReferenceAttribution<'a> {
    Received(&'a str),
    Sequence(u64),
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OwnNpcObservation<'a> {
    contacts: &'a Option<indexmap::IndexMap<String, crate::reception::ContactEpisode>>,
    expressions: bool,
    inventory_count: usize,
    known_recipes_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    corrections: Option<&'a indexmap::IndexMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    forgotten: Option<&'a [String]>,
    #[serde(skip_serializing_if = "Option::is_none")]
    map_marker_labels: Option<OwnNpcMapLabels<'a>>,
}
struct OwnNpcMapLabels<'a>(&'a indexmap::IndexMap<String, crate::reception::MapMarker>);
impl Serialize for OwnNpcMapLabels<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeMap;
        let mut out = serializer.serialize_map(Some(self.0.len()))?;
        for (id, marker) in self.0 {
            out.serialize_entry(id, &marker.label)?;
        }
        out.end()
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OwnActorProduct<'a> {
    world_id: &'a str,
    actor_id: &'a str,
    generation: &'a str,
    accepted_cut: u64,
    at: f64,
    sequence: u64,
    identity: OwnIdentity<'a>,
    observer_name: OwnObserverName<'a>,
    reference_attribution: OwnReferenceAttribution<'a>,
    #[serde(skip_serializing_if = "Option::is_none")]
    physical_life: Option<u64>,
    alive: bool,
    incapacitated: bool,
    position: crate::state::Point,
    heading: f64,
    support_surface_id: Option<&'a str>,
    body_profile: &'a crate::state::BodyProfile,
    attributes: &'a [crate::reception::AttributeView],
    status_effects: &'a [crate::worlds::base_observed::StatusEffectProjection],
    action_status_labels: &'a [&'a str],
    action: Option<OwnAction<'a>>,
    speech: bool,
    speech_blocked: bool,
    actions_blocked: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    agency: Option<&'a crate::state::ActorAgency>,
    #[serde(skip_serializing_if = "Option::is_none")]
    recent_result_eligibility: Option<&'a [outcomes::RequiredResult<'a>]>,
    #[serde(skip_serializing_if = "Option::is_none")]
    mind: Option<&'a crate::cognition::ActorMind>,
    #[serde(skip_serializing_if = "Option::is_none")]
    knowledge: Option<&'a indexmap::IndexMap<String, crate::knowledge::KnowledgeEntry>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    inner_world: Option<&'a crate::cognition::InnerWorld>,
    #[serde(skip_serializing_if = "Option::is_none")]
    npc: Option<OwnNpcObservation<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    player: Option<OwnPlayerView<'a>>,
}

/// First-person facts for the real player/NPC formatters. Purpose controls the
/// private mental fields; source validation stays in the native capture owner,
/// while operational account/control permission stays in the application.
pub(crate) fn write_actor_self(
    state: &SimulationState,
    actor_id: &str,
    purpose: ActorReadPurpose,
    budget: &ByteBudget,
) -> Result<(String, ByteReservation), ExecutionError> {
    use crate::status::{
        AttributeAudience, effective_body_profile, project_attributes, project_status_effects,
    };
    let entity = state
        .physical
        .entities
        .get(actor_id)
        .ok_or(ExecutionError::MissingEntity)?;
    let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
    let private = matches!(purpose, ActorReadPurpose::NpcDecision);
    if private && (!entity.has_memory() || actor.controller != "npc") {
        return Err(ExecutionError::UnsupportedFamily);
    }
    let attributes = project_attributes(
        entity,
        &state.installed.attributes,
        state.physical.pending_values.as_ref(),
        AttributeAudience::Owner,
        budget,
    )?;
    let statuses = project_status_effects(
        entity,
        &state.installed.status_policy,
        AttributeAudience::Owner,
        budget,
    )?;
    let profile = effective_body_profile(entity, budget)?;
    let count = state
        .installed
        .status_policy
        .definitions
        .iter()
        .filter(|definition| {
            definition.actions.is_some()
                && entity
                    .status_effects
                    .as_ref()
                    .and_then(|states| states.get(&definition.id))
                    .is_some_and(|state| state.active)
        })
        .count();
    let _labels = budget.reserve(
        count
            .checked_mul(size_of::<&str>())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut labels = Vec::new();
    labels
        .try_reserve_exact(count)
        .map_err(|_| ExecutionError::Capacity)?;
    for definition in &state.installed.status_policy.definitions {
        if definition.actions.is_some()
            && entity
                .status_effects
                .as_ref()
                .and_then(|states| states.get(&definition.id))
                .is_some_and(|state| state.active)
        {
            labels.push(definition.label.as_str());
        }
    }
    let mind = if private {
        Some(
            state
                .minds
                .minds
                .as_ref()
                .and_then(|minds| minds.get(actor_id))
                .ok_or(ExecutionError::UnsupportedFamily)?,
        )
    } else {
        None
    };
    let names = InstalledPersonalNameReader::prepare(
        &state.physical,
        &state.reception,
        &state.installed,
        &state.experience,
        actor_id,
    )?;
    let observer_name = names.observer_name(actor_id)?;
    let body_scope = CurrentBodyReadScope::prepare(
        &state.reception,
        &state.physical.entities,
        &state.installed,
        &state.experience,
        &crate::worlds::InstalledEvidenceMeaning,
        actor_id,
    )?;
    let own_body = body_scope
        .as_ref()
        .map(|scope| scope.native_body(actor_id))
        .transpose()?
        .flatten();
    let reference_attribution = if let Some(body) = own_body {
        OwnReferenceAttribution::Received(&body.field.id)
    } else if names.recognizes_subject(actor_id)? {
        OwnReferenceAttribution::Received("known")
    } else {
        OwnReferenceAttribution::Sequence(state.physical.header.sequence)
    };
    let inventory = state
        .inventory
        .project(&state.administration.object_membership);
    let (practice_records, _practice_guard) = if private {
        (Vec::new(), budget.reserve(0)?)
    } else {
        practice::practice_records(state, entity, budget)?
    };
    let required_results = if private {
        Some(outcomes::capture(state, actor_id, &actor.agency, budget)?)
    } else {
        None
    };
    let player_metadata = if private {
        None
    } else {
        Some(metadata::PlayerMetadata::prepare(
            state, entity, &names, budget,
        )?)
    };
    let product = OwnActorProduct {
        world_id: &state.physical.header.id,
        actor_id,
        generation: &state.generation,
        accepted_cut: state.accepted_cut,
        at: state.physical.header.sim_time,
        sequence: state.physical.header.sequence,
        identity: OwnIdentity {
            id: actor_id,
            name: &entity.name,
            name_form: entity.name_form.as_deref(),
            indefinite_article: entity.indefinite_article.as_deref(),
            appearance: entity.appearance.as_ref(),
            species: actor.species.as_deref(),
            traits: actor.traits.as_deref(),
        },
        observer_name: OwnObserverName {
            name: observer_name.name,
            name_form: observer_name.name_form,
            indefinite_article: observer_name.indefinite_article,
        },
        reference_attribution,
        physical_life: actor.physical_life,
        alive: actor.alive,
        incapacitated: actor.incapacitated,
        position: entity
            .world_position()
            .ok_or(ExecutionError::InvalidPosition)?,
        heading: entity.spatial.heading,
        support_surface_id: match entity.placement.as_ref() {
            Some(crate::state::Placement::World {
                support_surface_id, ..
            }) => support_surface_id.as_deref(),
            _ => None,
        },
        body_profile: &profile,
        attributes: attributes.rows(),
        status_effects: statuses.rows(),
        action_status_labels: &labels,
        action: actor.action.as_ref().map(|action| OwnAction {
            id: &action.id,
            kind: &action.kind,
            stage: &action.stage,
            target_id: action.target_id.as_deref(),
            definition_id: action.definition_id.as_deref(),
            attribute_id: action.attribute_id.as_deref(),
            total_seconds: action.total_seconds,
            remaining_seconds: action.remaining_seconds,
            preparing_navigation: action.navigation.is_some(),
        }),
        speech: actor
            .capabilities
            .as_ref()
            .map_or(actor.controller != "native", |capabilities| {
                capabilities.speech
            }),
        speech_blocked: state
            .installed
            .capabilities
            .capability_blocked(Some(entity), "speech")?,
        actions_blocked: state
            .installed
            .capabilities
            .capability_blocked(Some(entity), "actions")?,
        agency: private.then_some(&actor.agency),
        recent_result_eligibility: required_results
            .as_ref()
            .map(outcomes::RequiredResults::values),
        mind,
        knowledge: private
            .then(|| {
                state
                    .reception
                    .actor_knowledge
                    .as_ref()
                    .and_then(|root| root.get(actor_id))
            })
            .flatten(),
        inner_world: private
            .then(|| {
                state
                    .minds
                    .inner_worlds
                    .as_ref()
                    .and_then(|worlds| worlds.get(actor_id))
            })
            .flatten(),
        npc: private.then(|| OwnNpcObservation {
            contacts: &actor.contacts,
            expressions: actor.body.as_ref().is_some_and(|body| {
                state
                    .installed
                    .occurrence_rules
                    .value()
                    .response
                    .offers
                    .manual_work_body_plans
                    .iter()
                    .any(|plan| *plan == body.plan)
            }),
            inventory_count: inventory.held_stock.len(),
            known_recipes_count: state.learned_capabilities.known_recipes().len(),
            forgotten: state
                .experience
                .actor(actor_id)
                .map(|history| history.privacy.forgotten_ids()),
            corrections: state
                .experience
                .actor(actor_id)
                .map(|actor| actor.privacy.corrections()),
            map_marker_labels: state
                .reception
                .map_markers
                .as_ref()
                .and_then(|owners| owners.get(actor_id))
                .map(OwnNpcMapLabels),
        }),
        player: if private {
            None
        } else {
            Some(OwnPlayerView {
                can_steer: crate::time::can_steer(state, entity)?,
                seed: state.physical.header.seed,
                module_revision: state.installed.manifest.revision,
                spatial_revision: state.installed.geometry.spatial.revision,
                body: actor.body.as_ref(),
                held_stock: inventory.held_stock,
                equipped: inventory.equipped,
                knowledge_revision: state
                    .reception
                    .knowledge_revisions
                    .as_ref()
                    .and_then(|revisions| revisions.get(actor_id))
                    .copied()
                    .unwrap_or(0),
                agency: &actor.agency,
                practice: actor.practice.as_ref(),
                practice_records: &practice_records,
                participation: actor.participation.as_ref(),
                scars: actor.scars.as_ref(),
                pending_death: actor.pending_death.as_ref(),
                remains_phase: entity
                    .remains
                    .as_ref()
                    .map(|remains| remains.phase.as_str()),
                evasion_ready_at: actor.evasion_ready_at,
                combat_ready_at: actor.combat_ready_at,
                natural_strike_ids: actor.natural_strike_ids.as_deref(),
                action_animation: state
                    .installed
                    .observation_rules
                    .value()
                    .observed_action_animation(entity)?,
                senses: &player_metadata
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .senses,
                map_markers: &player_metadata
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .markers,
                communication_subjects: &player_metadata
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .communications
                    .subjects,
                known_recipes: state.learned_capabilities.known_recipes(),
            })
        },
    };
    let length =
        crate::encoding::json_record_len(&product).map_err(|_| ExecutionError::Invariant)?;
    let mut reservation = budget.reserve(
        length
            .checked_mul(2)
            .map(|bytes| bytes.max(8))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let encoded = crate::encoding::json_record(&product).map_err(|_| ExecutionError::Invariant)?;
    reservation.resize(encoded.capacity())?;
    Ok((encoded, reservation))
}
