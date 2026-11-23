//! Own-body, movement and detector display. The application holds only the
//! fields the ordinary browser needs after the accepted capture ends.

use super::PublicArt;
use super::{PlayerScenePolicy, SceneError, observed::BodySize};
use crate::player_references::PlayerReferences;
use indexmap::IndexMap;
use openlegend_simulation::{
    capture::PlayerSelfFacts,
    host::{ByteBudget, ByteReservation},
    narration::{NameArticle, name_phrase},
    reception::{AcousticPolicy, AttributeView},
    state::{CharacterTrait, Named, Point},
    text::JsText,
    worlds::base_observed::{ObservedActionAnimation, SpeechVolume, StatusEffectProjection},
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

mod inventory;
use inventory::{EquipmentBinding, ItemBinding};
mod practice;
pub(super) mod recipes;
use practice::{PracticePolicy, PracticeView, project_practice};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OwnPolicy {
    default_appearance: JsText,
    #[serde(default)]
    portraits: IndexMap<String, PublicArt>,
    #[serde(default)]
    departure_notice: Option<Arc<str>>,
    authored_recipes: IndexMap<String, Arc<recipes::RecipeTemplate>>,
    acoustics: AcousticPolicy,
    sight_body_fractions: [f64; 3],
    #[serde(default)]
    evasion_label: Option<Arc<str>>,
    #[serde(default)]
    reincarnation: Option<ReincarnationPolicy>,
    action_wording: PublicArt,
    action: ActionPolicy,
    practice: PracticePolicy,
    melee: MeleePolicy,
    trade: TradePolicy,
}

impl OwnPolicy {
    pub(super) fn authored_recipe(&self, id: &str) -> Option<&Arc<recipes::RecipeTemplate>> {
        self.authored_recipes.get(id)
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TradePolicy {
    definitions: String,
    body_definitions: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct MeleePolicy {
    definitions: Vec<MeleeDefinition>,
    unrestricted_body_plans: Vec<String>,
    supported: bool,
    unavailable: Arc<str>,
    recovering: Arc<str>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct MeleeDefinition {
    id: Arc<str>,
    label: Arc<str>,
    required_body_plan: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ActionPolicy {
    preparing_route: Arc<str>,
    working: Arc<str>,
    status_types: Vec<String>,
    working_status_types: Vec<String>,
    no_progress_types: Vec<String>,
    labels: IndexMap<String, Arc<str>>,
    #[serde(default)]
    status_labels: IndexMap<String, Arc<str>>,
    #[serde(default)]
    replenishment_labels: IndexMap<String, Arc<str>>,
    status_type: String,
    replenishment_type: String,
    target_labels: Vec<TargetActionLabel>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TargetActionLabel {
    action: String,
    prefix: String,
    suffix: String,
    lowercase: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ReincarnationPolicy {
    message: Arc<str>,
    retained_label: Arc<str>,
    lost_label: Arc<str>,
    scars: Vec<Arc<ScarDefinition>>,
}

#[derive(Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ScarDefinition {
    id: String,
    name: String,
    description: String,
}

pub struct PreparedSelf {
    pub player: PlayerBodyView,
    pub vision: VisionGuide,
    pub hearing: HearingGuide,
    pub communication_references: Vec<CommunicationReference>,
    pub recipes: Vec<recipes::Recipe>,
    pub map_markers: Vec<Marker>,
    pub can_speak: bool,
    pub can_steer: bool,
    pub incapacitated: bool,
    pub seed: u64,
    pub trade_reader_revision: String,
    // The retained alias lookup needs only the target from the selected action.
    action_target: Option<String>,
    action_kind: Option<String>,
    _custody: ByteReservation,
}

#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerBodyView {
    #[serde(flatten)]
    name: Named,
    pub id: String,
    pub position: Point,
    support_surface_id: Option<String>,
    heading: f64,
    appearance: JsText,
    #[serde(skip_serializing_if = "Option::is_none")]
    portrait: Option<PublicArt>,
    pub knowledge_revision: u64,
    body_size: BodySize,
    attributes: Vec<AttributeView>,
    practice: Vec<PracticeView>,
    status_effects: Vec<StatusEffectProjection>,
    pub alive: bool,
    pub has_work: bool,
    life: u64,
    participation: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    departure_notice: Option<Arc<str>>,
    death: Option<Death>,
    scars: Vec<Scar>,
    #[serde(skip_serializing_if = "Option::is_none")]
    body_state: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    evasion: Option<Evasion>,
    #[serde(skip_serializing_if = "Option::is_none")]
    attack_source: Option<AttackSource>,
    pub action: Option<OwnAction>,
    action_animation: Option<ObservedActionAnimation>,
    #[serde(skip_serializing_if = "Option::is_none")]
    traits: Option<Vec<CharacterTrait>>,
    inventory: Vec<ItemBinding>,
    inventory_revision: u64,
    equipment_ports: Vec<EquipmentBinding>,
    action_attempts: Vec<Attempt>,
    #[serde(skip_serializing_if = "Option::is_none")]
    activity: Option<ActivityStatus>,
    action_wording: PublicArt,
}

#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct ActivityStatus {
    name: JsText,
    status: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<JsText>,
}

#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct Death {
    message: Arc<str>,
    fresh_world_review: bool,
    at: f64,
    corpse_id: String,
    retained_label: Arc<str>,
    lost_label: Arc<str>,
    retained: Vec<Possession>,
    left: Vec<Possession>,
}

#[derive(PartialEq, Serialize)]
struct Possession {
    name: JsText,
    quantity: u64,
}

#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct Scar {
    #[serde(flatten)]
    definition: Arc<ScarDefinition>,
    treatments_remaining: f64,
}

#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct Evasion {
    label: Arc<str>,
    ready_in: f64,
}

#[derive(PartialEq, Serialize)]
struct AttackSource {
    kind: &'static str,
    label: Arc<str>,
    enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<Arc<str>>,
    command: StrikeCommand,
}

#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct StrikeCommand {
    #[serde(rename = "type")]
    kind: &'static str,
    definition_id: Arc<str>,
}

#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OwnAction {
    id: String,
    show_status: bool,
    label: JsText,
    progress: f64,
    duration_seconds: f64,
    elapsed_seconds: f64,
    advancing: bool,
}

#[derive(PartialEq, Serialize)]
struct Attempt {
    id: String,
    description: JsText,
    mode: &'static str,
    status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    category: Option<String>,
}

#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VisionGuide {
    radius: f64,
    enabled: bool,
    field_of_view_radians: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    heading: Option<f64>,
    eye_height: f64,
    target_heights: [f64; 3],
}

#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HearingGuide {
    reference_radius: f64,
    partial_radius: f64,
    detection_radius: f64,
    enabled: bool,
    ear_height: f64,
}

#[derive(PartialEq, Serialize)]
pub struct CommunicationReference {
    id: String,
    label: JsText,
}

#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Marker {
    id: String,
    x: f64,
    z: f64,
    label: JsText,
    icon: String,
    note: MarkerNote,
}

#[derive(PartialEq, Serialize)]
struct MarkerNote {
    text: JsText,
    revision: u64,
}

impl PreparedSelf {
    pub(crate) fn pause_action(&mut self) {
        if let Some(action) = self.player.action.as_mut() {
            action.advancing = false;
        }
    }

    pub(crate) fn inactive(&self) -> bool {
        self.player.participation == "inactive"
    }

    pub(crate) fn has_death_review(&self) -> bool {
        self.player.death.is_some()
    }

    /// Apply only a name already selected in the same perception cut.
    /// Target text creates no contact or command authorization.
    pub fn name_action_target(
        &mut self,
        policy: &OwnPolicy,
        perception: &openlegend_simulation::capture::PlayerPerception<'_>,
    ) -> Result<(), SceneError> {
        let Some((id, kind)) = self
            .action_target
            .as_deref()
            .zip(self.action_kind.as_deref())
        else {
            return Ok(());
        };
        let Some(format) = policy
            .action
            .target_labels
            .iter()
            .find(|label| label.action == kind)
        else {
            return Ok(());
        };
        for target in perception.bodies() {
            let target = target.ok_or(SceneError::Capture)?;
            if target.source_id != id || target.name.name.is_empty() {
                continue;
            }
            let name = &target.name.name;
            let capacity = format
                .prefix
                .len()
                .checked_add(format.suffix.len())
                .and_then(|n| n.checked_add(name.storage_bytes().saturating_mul(4)))
                .ok_or(SceneError::Capacity)?;
            self._custody.resize(
                self._custody
                    .bytes()
                    .checked_add(capacity)
                    .ok_or(SceneError::Capacity)?,
            )?;
            let mut label: JsText = format.prefix.as_str().into();
            if format.lowercase {
                label.push_text(&name.lowercase());
            } else {
                label.push_text(name);
            }
            label.push_str(&format.suffix);
            self.player
                .action
                .as_mut()
                .ok_or(SceneError::Capture)?
                .label = label;
            break;
        }
        Ok(())
    }
}

/// Prepare a detached first-person view from the actual borrowed accepted
/// fields. No actor or history lookup is done here. The caller independently
/// keeps the originating player read for final transport authorization.
pub fn prepare_self(
    facts: PlayerSelfFacts<'_>,
    scene: &PlayerScenePolicy,
    references: &PlayerReferences<'_>,
    paused: bool,
    fresh_world_review: bool,
    budget: &ByteBudget,
) -> Result<PreparedSelf, SceneError> {
    if !references.matches_reader(facts.world_id, facts.actor_id) {
        return Err(SceneError::Capture);
    }
    let activity = facts.activity().map_err(SceneError::Unsupported)?;
    let policy = &scene.self_view;
    let output = facts.projection_bytes().ok_or(SceneError::Capacity)?;
    let output = output
        .checked_add(
            facts
                .known_recipes
                .len()
                .checked_mul(std::mem::size_of::<recipes::Recipe>())
                .ok_or(SceneError::Capacity)?,
        )
        .ok_or(SceneError::Capacity)?;
    let activity_bytes = activity.as_ref().map_or(0, |activity| {
        activity.name.storage_bytes() + activity.reason.map_or(0, JsText::storage_bytes)
    });
    let mut custody = budget.reserve(output.checked_add(activity_bytes).ok_or(SceneError::Capacity)?)?;
    let activity = activity.map(|activity| ActivityStatus {
        name: activity.name.clone(), status: activity.status, reason: activity.reason.cloned(),
    });
    let (inventory, equipment_ports) =
        inventory::prepare(&facts, &scene.observed.item_art, &mut custody)?;
    let mut recipes = Vec::with_capacity(facts.known_recipes.len());
    for recipe in facts.known_recipes {
        let template = policy.authored_recipes.get(recipe).ok_or(SceneError::Capture)?;
        recipes.push(recipes::Recipe::prepare(template, facts.craft_stock, &mut custody)?);
    }
    let practice = project_practice(&facts, &policy.practice, &mut custody)?;
    let mut attempts = Vec::new();
    attempts
        .try_reserve_exact(facts.action_attempts().len())
        .map_err(|_| SceneError::Capacity)?;
    for attempt in facts.action_attempts() {
        if attempt.has_alternative {
            return Err(SceneError::Unsupported(
                "the installed pending action alternative",
            ));
        }
        attempts.push(Attempt {
            id: attempt.id.to_owned(),
            description: attempt.description.clone(),
            mode: attempt.mode,
            status: attempt.status.to_owned(),
            reason: attempt.reason.cloned(),
            category: attempt.category.map(str::to_owned),
        });
    }
    let mut actor_references = Vec::new();
    actor_references
        .try_reserve_exact(facts.communication_subjects().len())
        .map_err(|_| SceneError::Capacity)?;
    for subject in facts.communication_subjects() {
        actor_references.push(CommunicationReference {
            id: references.person(subject.id)?,
            label: match subject.label {
                Some(label) => label.clone(),
                None => name_phrase(
                    subject.description.ok_or(SceneError::Capture)?,
                    NameArticle::None,
                    false,
                ),
            },
        });
    }
    let appearance = facts.identity.appearance;
    let portrait = appearance
        .and_then(JsText::as_unicode)
        .and_then(|key| policy.portraits.get(key))
        .cloned();
    let death = facts
        .death()
        .zip(policy.reincarnation.as_ref())
        .map(|(death, policy)| {
            let possession = |(name, quantity): (&JsText, u64)| Possession {
                name: name.clone(),
                quantity,
            };
            Death {
                message: policy.message.clone(),
                fresh_world_review,
                at: death.at,
                corpse_id: death.corpse_id.to_owned(),
                retained_label: policy.retained_label.clone(),
                lost_label: policy.lost_label.clone(),
                retained: death.retained().map(possession).collect(),
                left: death.left().map(possession).collect(),
            }
        });
    let scars = policy
        .reincarnation
        .as_ref()
        .into_iter()
        .flat_map(|policy| &policy.scars)
        .filter_map(|definition| {
            let remaining = facts.scars?.get(&definition.id).copied()?;
            (remaining != 0.0).then(|| Scar {
                definition: definition.clone(),
                treatments_remaining: remaining,
            })
        })
        .collect();
    let display = facts.action.map(|action| {
        let rules = &policy.action;
        let labels = &rules.labels;
        let label = if action.preparing_navigation {
            &rules.preparing_route
        } else if action.kind == rules.status_type {
            action
                .definition_id
                .and_then(|id| rules.status_labels.get(id))
                .or_else(|| labels.get(action.kind))
                .unwrap_or(&rules.working)
        } else if action.kind == rules.replenishment_type {
            action
                .attribute_id
                .and_then(|id| rules.replenishment_labels.get(id))
                .or_else(|| labels.get(action.kind))
                .unwrap_or(&rules.working)
        } else {
            labels.get(action.kind).unwrap_or(&rules.working)
        };
        let working = action.stage == "working";
        OwnAction {
            id: action.id.to_owned(),
            label: (&**label).into(),
            show_status: action.preparing_navigation
                || contains(&rules.status_types, action.kind)
                || (working && contains(&rules.working_status_types, action.kind)),
            progress: if action.stage == "approaching"
                || contains(&rules.no_progress_types, action.kind)
            {
                0.0
            } else if action.total_seconds == 0.0 {
                1.0
            } else {
                (1.0 - action.remaining_seconds / action.total_seconds).clamp(0.0, 1.0)
            },
            duration_seconds: action.total_seconds,
            elapsed_seconds: if working {
                action.total_seconds - action.remaining_seconds
            } else {
                0.0
            },
            advancing: !paused && working,
        }
    });
    let attack_source = facts.body.filter(|_| facts.alive).and_then(|body| {
        let policy = &policy.melee;
        let definition = policy.definitions.iter().find(|definition| {
            definition
                .required_body_plan
                .as_ref()
                .is_none_or(|plan| *plan == body.plan)
                && (contains(&policy.unrestricted_body_plans, &body.plan)
                    || facts
                        .natural_strike_ids
                        .is_some_and(|ids| contains(ids, &definition.id)))
        })?;
        let reason = if !policy.supported {
            Some(policy.unavailable.clone())
        } else if facts.combat_ready_at.is_some_and(|at| at > facts.at) {
            Some(policy.recovering.clone())
        } else {
            None
        };
        Some(AttackSource {
            kind: "melee",
            label: definition.label.clone(),
            enabled: reason.is_none(),
            reason,
            command: StrikeCommand {
                kind: "strike",
                definition_id: definition.id.clone(),
            },
        })
    });
    let trade_reader_revision = references.personal_source(&(
        "trade-reader-owner",
        &policy.trade.body_definitions,
        facts.body,
        facts.action.map(|action| (action.id, action.stage)),
        facts.held_stock,
        facts.module_revision,
        facts.spatial_revision,
        &policy.trade.definitions,
    ))?;
    let acoustic = |threshold| {
        facts.hearing_floor.map_or(0.0, |floor| {
            policy
                .acoustics
                .reach(floor, SpeechVolume::Normal, Some(threshold))
        })
    };
    Ok(PreparedSelf {
        player: PlayerBodyView {
            id: facts.actor_id.to_owned(),
            name: Named {
                name: facts.identity.name.clone(),
                name_form: facts.identity.name_form.map(str::to_owned),
                indefinite_article: facts.identity.indefinite_article.map(str::to_owned),
            },
            position: facts.position,
            support_surface_id: facts.support_surface_id.map(str::to_owned),
            heading: facts.heading,
            appearance: appearance
                .cloned()
                .unwrap_or_else(|| policy.default_appearance.clone()),
            portrait,
            knowledge_revision: facts.knowledge_revision,
            body_size: BodySize {
                width: facts.body_profile.radius * 2.0,
                height: facts.body_profile.height,
            },
            attributes: facts
                .attributes
                .iter()
                .filter(|attribute| !policy.practice.has_attribute(&attribute.id))
                .cloned()
                .collect(),
            practice,
            status_effects: facts.status_effects.to_vec(),
            alive: facts.alive,
            has_work: facts.has_work(),
            life: facts.physical_life.unwrap_or(0),
            participation: facts
                .participation
                .map_or("active", |actor| actor.phase.as_str())
                .to_owned(),
            departure_notice: policy.departure_notice.clone(),
            death,
            scars,
            body_state: (!facts.alive).then(|| match facts.remains_phase {
                Some("removed") => "removed",
                Some("rotting") => "rotting",
                _ => "dead",
            }),
            evasion: policy.evasion_label.as_ref().map(|label| Evasion {
                label: label.clone(),
                ready_in: (facts.evasion_ready_at.unwrap_or(0.0) - facts.at).max(0.0),
            }),
            attack_source,
            action: display,
            action_animation: facts.action_animation.cloned(),
            traits: facts.identity.traits.map(<[_]>::to_vec),
            inventory,
            inventory_revision: facts.inventory_revision,
            equipment_ports,
            action_attempts: attempts,
            activity,
            action_wording: policy.action_wording.clone(),
        },
        vision: VisionGuide {
            radius: if facts.perception_blocked {
                0.0
            } else {
                facts.vision_radius
            },
            enabled: facts.senses_enabled,
            field_of_view_radians: facts.vision_angle,
            heading: (facts.vision_angle < std::f64::consts::TAU).then_some(facts.heading),
            eye_height: facts.body_profile.eye_height,
            target_heights: policy
                .sight_body_fractions
                .map(|part| part * facts.body_profile.height),
        },
        hearing: HearingGuide {
            reference_radius: acoustic(policy.acoustics.thresholds_db.clear),
            partial_radius: acoustic(policy.acoustics.thresholds_db.partial),
            detection_radius: acoustic(policy.acoustics.thresholds_db.detect),
            enabled: facts.senses_enabled && facts.hearing_floor.is_some(),
            ear_height: facts.body_profile.ear_height,
        },
        communication_references: actor_references,
        recipes,
        map_markers: facts
            .map_markers()
            .map(|field| Marker {
                id: field.marker.id.clone(),
                x: field.marker.x,
                z: field.marker.z,
                label: field.marker.label.clone(),
                icon: field.marker.icon.clone(),
                note: MarkerNote {
                    text: field.note.cloned().unwrap_or_default(),
                    revision: field.note_revision,
                },
            })
            .collect(),
        can_steer: facts.can_steer,
        can_speak: facts.speech && !facts.speech_blocked,
        incapacitated: facts.incapacitated,
        seed: facts.seed,
        trade_reader_revision,
        action_target: facts
            .action
            .and_then(|action| action.target_id.map(str::to_owned)),
        action_kind: facts
            .action
            .filter(|action| !action.preparing_navigation)
            .map(|action| action.kind.to_owned()),
        _custody: custody,
    })
}
fn contains(values: &[String], value: &str) -> bool {
    values.iter().any(|candidate| candidate == value)
}

impl PlayerBodyView {
    pub(crate) fn delta<'a>(&'a self, before: &'a Self) -> BodyFields<'a> {
        BodyFields {
            before,
            after: self,
        }
    }
}

pub(crate) struct BodyFields<'a> {
    before: &'a PlayerBodyView,
    after: &'a PlayerBodyView,
}
impl BodyFields<'_> {
    pub(crate) fn removed(&self) -> Vec<&'static str> {
        use super::delta::removed;
        let Self { before, after } = self;
        removed!(before,after;
          "nameForm"=>name.name_form, "indefiniteArticle"=>name.indefinite_article,"portrait"=>portrait,
          "departureNotice"=>departure_notice,"bodyState"=>body_state,"evasion"=>evasion,
          "attackSource"=>attack_source,"traits"=>traits,"activity"=>activity,
        )
    }
    pub(crate) fn entries<S: serde::ser::SerializeMap>(&self, map: &mut S) -> Result<(), S::Error> {
        use super::delta::fields;
        let Self { before, after } = self;
        fields!(map,before,after; required {
          "id"=>id,"name"=>name.name,"position"=>position,"supportSurfaceId"=>support_surface_id,
          "heading"=>heading,"appearance"=>appearance,"knowledgeRevision"=>knowledge_revision,
          "bodySize"=>body_size,"attributes"=>attributes,"practice"=>practice,"statusEffects"=>status_effects,
          "alive"=>alive,"hasWork"=>has_work,"life"=>life,"participation"=>participation,
          "death"=>death,"scars"=>scars,"action"=>action,"actionAnimation"=>action_animation,
          "inventory"=>inventory,"inventoryRevision"=>inventory_revision,"equipmentPorts"=>equipment_ports,
          "actionAttempts"=>action_attempts,"actionWording"=>action_wording,
        } optional {
          "nameForm"=>name.name_form, "indefiniteArticle"=>name.indefinite_article,"portrait"=>portrait,
          "departureNotice"=>departure_notice,"bodyState"=>body_state,"evasion"=>evasion,
          "attackSource"=>attack_source,"traits"=>traits,"activity"=>activity,
        });
        Ok(())
    }
}
