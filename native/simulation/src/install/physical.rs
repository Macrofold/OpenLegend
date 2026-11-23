//! One-time physical owner assembly. Temporary JSON objects only stitch the
//! current SQL child records before strict typed admission; none is retained as
//! a writable world or used to bypass an unsupported active family.

use super::{DefinitionInput, InstallError, InstalledContent, RowImport};
use crate::activity::ActivityLimits;
use crate::experience::PersonalRootPresence;
use crate::identity::{IdentityState, MAX_SAFE_INTEGER};
use crate::simulation::PhysicalState;
use crate::state::{Entity, EntityStore, WorkState, WorldHeader};
use crate::values::{NativeValueWindow, deserialize_safe_integer};
use crate::work::{WorkBook, WorkPolicy};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use serde_json::{Map, Value};
use std::sync::Arc;
mod imported;
use imported::{install_entities, take_window, take_work};

/// Borrowed immutable meanings needed by physical admission, before root
/// content and geometry join the final InstalledWorld allocation.
pub(crate) struct PhysicalDefinitions<'a> {
    pub fire_out: Option<&'a crate::worlds::base_cognition::FireOutRule>,
    pub senses: &'a IndexMap<String, super::VerifiedDefinition<crate::reception::SenseDefinition>>,
    pub default_senses: &'a [String],
    pub response_profiles: &'a IndexMap<
        String,
        super::VerifiedDefinition<crate::native_response::NativeResponseProfile>,
    >,
    pub work_policy: Arc<crate::work::InstalledWorkPolicy>,
    pub attributes:
        &'a IndexMap<String, super::VerifiedDefinition<crate::status::AttributeDefinition>>,
    pub status_policy: &'a crate::status::StatusEffectPolicy,
    pub body_policy: Option<&'a crate::body::BodyPolicy>,
    pub ranged_installed: bool,
    pub local_avoidance: Option<(&'a crate::values::DefinitionPin, &'a crate::projectile::LocalAvoidance)>,
    pub maximum_candidates: usize,
    pub maximum_path_points: usize,
    pub epsilon: f64,
    pub population_work: &'a crate::status::StatusInstallationWork,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CanonicalInput {
    pub canonical: String,
    pub sha256: String,
}
impl CanonicalInput {
    pub(crate) fn verify_json(&self, expected: &Value) -> Result<(), InstallError> {
        if crate::encoding::sha256_hex(self.canonical.as_bytes()) != self.sha256 {
            return Err(InstallError::DefinitionPin);
        }
        let actual: Value =
            serde_json::from_str(&self.canonical).map_err(|_| InstallError::DefinitionBody)?;
        if !same_json_value(&actual, expected) {
            return Err(InstallError::DefinitionBody);
        }
        Ok(())
    }
    pub(crate) fn verify<T: serde::de::DeserializeOwned + PartialEq>(
        &self,
        expected: &T,
    ) -> Result<(), InstallError> {
        if crate::encoding::sha256_hex(self.canonical.as_bytes()) != self.sha256 {
            return Err(InstallError::DefinitionPin);
        }
        let actual: T =
            serde_json::from_str(&self.canonical).map_err(|_| InstallError::DefinitionBody)?;
        if &actual != expected {
            return Err(InstallError::DefinitionBody);
        }
        Ok(())
    }
}
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct NativeDefinitionInputs {
    pub manifest: CanonicalInput,
    pub retained: super::RetainedDefinitionInputs,
    pub attributes: Vec<DefinitionInput>,
    pub senses: Vec<DefinitionInput>,
    pub acoustics: DefinitionInput,
    pub response_profiles: Vec<DefinitionInput>,
    pub attention: DefinitionInput,
    pub event_disclosure: DefinitionInput,
    pub status_policy: CanonicalInput,
    pub work_policy: CanonicalInput,
    pub detection_support: DefinitionInput,
    pub prepared_responses: DefinitionInput,
    pub movement_policy: CanonicalInput,
    pub time_rules: CanonicalInput,
    pub account_rules: DefinitionInput,
    pub name_rules: DefinitionInput,
    pub recognition: DefinitionInput,
    pub occurrence_rules: DefinitionInput,
    pub speech_action: DefinitionInput,
    pub ordinary_actions: DefinitionInput,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub fire_care: Option<DefinitionInput>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub hearth_placement: Option<CanonicalInput>,
    pub travel_host: Option<CanonicalInput>,
    pub observation_rules: DefinitionInput,
    pub event_appraisal_rules: DefinitionInput,
    pub promises: DefinitionInput,
    pub social_defaults: CanonicalInput,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub presentation: Option<CanonicalInput>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub body_policy: Option<DefinitionInput>,
}
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct MovementSettings {
    pub skin: f64,
    pub cell_size: f64,
    pub cell_height: f64,
    pub contour_error: f64,
    pub projection_tolerance: f64,
    pub arrival_tolerance: f64,
    pub max_step_height: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub max_replans: u64,
}
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct SpatialSettings {
    pub epsilon: f64,
    pub support_tolerance: f64,
    pub max_extent: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub max_surfaces: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub max_blockers: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub max_scenery: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub max_graph_nodes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub max_path_points: u64,
}
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ResponseSettings {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub maximum_candidates: u64,
}
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct PersonalEvidencePreparationSettings {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub rows: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub bytes: u64,
}
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ExperienceSettings {
    /// The Source account-retention owner supplies this once. Native event
    /// producers must not copy its protection threshold as another default.
    pub protected_importance: f64,
}
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct NativeSetupSettings {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub encounter_batch_entries: u64,
    pub work: WorkPolicy,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub maximum_change_scopes: u64,
    pub spatial: SpatialSettings,
    pub movement: MovementSettings,
    pub time_epsilon: f64,
    pub activity: ActivityLimits,
    pub activity_learning: crate::activity::LearningLanguage,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub activity_display_bytes: u64,
    pub native_response: ResponseSettings,
    pub personal_evidence_preparation: PersonalEvidencePreparationSettings,
    pub experience: ExperienceSettings,
    pub mind: crate::cognition::MindLimits,
    pub agency: crate::plans::AgencyLimits,
    pub actor_response: crate::response::ResponseLimits,
}

impl crate::host::retained_size::HeapBytes for NativeSetupSettings {
    fn heap_bytes(&self) -> Option<usize> {
        use crate::host::retained_size::{HeapBytes, heap_sum};
        // The remaining setup fields are scalar compiled limits. These are the
        // decoded settings' dynamic owners, before their consuming installers.
        heap_sum([
            self.work.version.heap_bytes()?,
            self.activity_learning.heap_bytes()?,
            self.actor_response.heap_bytes()?,
        ])
    }
}

/// Presence is consumed only during installation by the actual child owners.
/// A null child differs from an omitted child; its owner must retain that exact
/// current-format meaning. This metadata is not a runtime world field store.
pub(crate) struct WorldChildren {
    fields: IndexMap<String, Option<bool>>,
}
impl WorldChildren {
    pub(crate) fn remaining_fields(&self) -> impl Iterator<Item = &str> {
        self.fields.keys().map(String::as_str)
    }
    pub(crate) fn take(&mut self, field: &str) -> Result<Option<bool>, InstallError> {
        self.fields
            .shift_remove(field)
            .ok_or(InstallError::CurrentFormat)
    }
    pub(crate) fn finish(self) -> Result<(), InstallError> {
        if self.fields.is_empty() {
            Ok(())
        } else {
            Err(InstallError::UnclaimedCoverage)
        }
    }
}
pub(crate) struct PhysicalInstallation {
    pub state: PhysicalState,
    pub content: InstalledContent,
    pub personal: PersonalRootPresence,
    pub archived_event_count: Option<u64>,
    pub assembly_geometry_revision: Option<u64>,
    pub story_policy_revision: Option<u64>,
    pub children: WorldChildren,
}
pub(crate) struct PhysicalRoot {
    pub gifts: Option<IndexMap<String, crate::handover::GiftOffer>>,
    pub header: WorldHeader,
    pub identity: IdentityState,
    pub content: InstalledContent,
    pub personal: PersonalRootPresence,
    pub archived_event_count: Option<u64>,
    pub assembly_geometry_revision: Option<u64>,
    pub story_policy_revision: Option<u64>,
    pub children: WorldChildren,
}

// The current SQL schema's finite root children. Keeping the list beside this
// decoder makes a new field an explicit ownership obligation at installation.
const ROOT_CHILDREN: &[(&str, bool)] = &[
    ("knowledgePolicy", false),
    ("itemHandling", false),
    ("gatheringPolicy", false),
    ("workBatchPolicy", false),
    ("socialOfferPolicy", false),
    ("hearthDefinitions", false),
    ("assemblyFamilies", false),
    ("constructionProfile", false),
    ("contentsExposureProfiles", false),
    ("dailyRainDefinitions", false),
    ("finiteRain", false),
    ("pendingNativeIntegration", false),
    ("sensory", false),
    ("participationPolicy", false),
    ("nativeStrikes", false),
    ("nativeResponseProfiles", false),
    ("nativeForagingProfiles", false),
    ("supplyOpportunities", false),
    ("foodPreparations", false),
    ("castDefinitions", false),
    ("exitExposures", false),
    ("coachingEpisodes", false),
    ("statusEffectPolicy", false),
    ("authorship", false),
    ("inventionPolicy", false),
    ("moduleManifest", false),
    ("storyPolicy", false),
    ("socialPolicy", false),
    ("cognitionPolicy", false),
    ("identity", false),
    ("map", false),
    ("entities", false),
    ("actionExperience", false),
    ("objectState", false),
    ("objectLineage", false),
    ("resourceReservations", false),
    ("projectiles", false),
    ("workState", false),
    ("outings", false),
    ("socialCompacts", false),
    ("itemDefinitions", false),
    ("recipes", false),
    ("flightRoutes", false),
    ("places", false),
    ("visiblePlaces", false),
    ("memories", false),
    ("minds", false),
    ("knowledge", false),
    ("actorKnowledge", false),
    ("knowledgeRevisions", false),
    ("observerIdentities", false),
    ("receivedValues", false),
    ("perceptionEvidence", false),
    ("mapMarkers", false),
    ("perceptionEpisodes", false),
    ("visibleObjects", false),
    ("visiblePeople", false),
    ("appraisals", false),
    ("appraisalProcesses", false),
    ("familyTree", false),
    ("responseReceipts", false),
    ("experience", false),
    ("innerWorlds", false),
    ("events", true),
    ("commandReceipts", false),
    ("declarationReceipts", false),
];

#[derive(Deserialize)]
struct Ordinal(#[serde(deserialize_with = "deserialize_safe_integer")] u64);
fn remove_optional<T: serde::de::DeserializeOwned>(
    object: &mut IndexMap<String, Box<RawValue>>,
    key: &str,
) -> Result<Option<T>, InstallError> {
    object
        .shift_remove(key)
        .map(|value| serde_json::from_str(value.get()).map_err(|_| InstallError::CurrentFormat))
        .transpose()
}
fn required<T: serde::de::DeserializeOwned>(
    object: &mut IndexMap<String, Box<RawValue>>,
    key: &str,
) -> Result<T, InstallError> {
    remove_optional(object, key)?.ok_or(InstallError::CurrentFormat)
}
fn empty_marker(value: &RawValue, array: bool) -> bool {
    // RawValue has already validated JSON syntax. Only whitespace may occur
    // between an actual empty container's delimiters.
    let text = value.get().trim();
    let (open, close) = if array { ('[', ']') } else { ('{', '}') };
    text.strip_prefix(open)
        .and_then(|text| text.strip_suffix(close))
        .is_some_and(|text| text.trim().is_empty())
}

pub(crate) fn read_physical_root(
    import: &mut RowImport,
    presentation_input: Option<&CanonicalInput>,
) -> Result<PhysicalRoot, InstallError> {
    let (row, mut root) = super::rows::take_one::<IndexMap<String, Box<RawValue>>>(
        import,
        "world_settings",
        "[]",
        "world",
        true,
    )?
    .ok_or(InstallError::CurrentFormat)?;
    if !row.extra.is_empty() {
        return Err(InstallError::CurrentFormat);
    }
    let rng = required::<Ordinal>(&mut root, "rngState")?.0;
    let next_id = required::<Ordinal>(&mut root, "nextId")?.0;
    let identity = IdentityState::install(
        u32::try_from(rng).map_err(|_| InstallError::Identity)?,
        next_id,
    )
    .map_err(|_| InstallError::Identity)?;
    // Quoted presentation text is opaque authored content. Decoding the whole
    // parent as Value would reject usable JavaScript isolated UTF-16 units.
    let presentation = root.shift_remove("presentation");
    match (presentation.as_ref(), presentation_input) {
        (None, None) => {}
        (Some(value), Some(input)) => {
            let actual: crate::records::SqlCell =
                serde_json::from_str(value.get()).map_err(|_| InstallError::DefinitionBody)?;
            input.verify(&actual)?;
        }
        _ => return Err(InstallError::DefinitionBody),
    }
    let time_policy = required(&mut root, "timePolicy")?;
    let profile = required(&mut root, "profile")?;
    let content = InstalledContent::install(presentation, time_policy, profile)?;
    let archived_event_count =
        remove_optional::<Ordinal>(&mut root, "archivedEventCount")?.map(|n| n.0);
    let assembly_geometry_revision =
        remove_optional::<Ordinal>(&mut root, "assemblyGeometryRevision")?.map(|n| n.0);
    let story_policy_revision =
        remove_optional::<Ordinal>(&mut root, "storyPolicyRevision")?.map(|n| n.0);
    let gifts = remove_optional(&mut root, "itemOffers")?;
    let mut fields = IndexMap::new();
    for &(field, array) in ROOT_CHILDREN {
        let presence = match root.shift_remove(field) {
            None => None,
            Some(value) if value.get().trim() == "null" => Some(false),
            Some(value) if empty_marker(&value, array) => Some(true),
            _ => return Err(InstallError::CurrentFormat),
        };
        fields.insert(field.to_owned(), presence);
    }
    let header = WorldHeader {
        schema_version: required::<Ordinal>(&mut root, "schemaVersion")?.0,
        id: required(&mut root, "id")?,
        seed: required::<Ordinal>(&mut root, "seed")?.0,
        sequence: required::<Ordinal>(&mut root, "sequence")?.0,
        sim_time: required(&mut root, "simTime")?,
        paused: required(&mut root, "paused")?,
        native_interval: remove_optional(&mut root, "nativeInterval")?,
    };
    if !root.is_empty() {
        return Err(InstallError::CurrentFormat);
    }
    if header.id != import.world_id()
        || !header.sim_time.is_finite()
        || header.sim_time < 0.0
        || header.sequence > MAX_SAFE_INTEGER
        || header.native_interval.as_ref().is_some_and(|i| {
            !i.remaining_seconds.is_finite()
                || i.remaining_seconds < 0.0
                || i.ends_at
                    .is_some_and(|t| !t.is_finite() || t < header.sim_time)
        })
    {
        return Err(InstallError::CurrentFormat);
    }
    let present = |name: &str, required: bool| match fields.get(name).copied().flatten() {
        Some(true) => Ok(true),
        None if !required => Ok(false),
        _ => Err(InstallError::ParentPresence),
    };
    let personal = PersonalRootPresence {
        experience: present("experience", false)?,
        memories: present("memories", true)?,
        received_values: present("receivedValues", false)?,
        events: present("events", true)?,
    };
    Ok(PhysicalRoot {
        gifts,
        header,
        identity,
        content,
        personal,
        archived_event_count,
        assembly_geometry_revision,
        story_policy_revision,
        children: WorldChildren { fields },
    })
}

pub(crate) fn install_physical(
    import: &mut RowImport,
    purpose: super::InstallPurpose,
    root: PhysicalRoot,
    installed: &PhysicalDefinitions<'_>,
    budget: &crate::host::ByteBudget,
) -> Result<PhysicalInstallation, InstallError> {
    let PhysicalRoot {
        gifts,
        header,
        identity,
        content,
        personal,
        archived_event_count,
        assembly_geometry_revision,
        story_policy_revision,
        mut children,
    } = root;
    if children.take("entities")? != Some(true) {
        return Err(InstallError::ParentPresence);
    }
    // These enabled clock/public-action writers can become active after import.
    // Refuse their unconverted feedback families now, rather than accepting a
    // world whose next ordinary interval cannot finish its actual effects.
    for definition in &installed.status_policy.definitions {
        if !definition.enabled
            || (definition.automatic_activation.is_none() && definition.actions.is_none())
        {
            continue;
        }
        for operation in &definition.while_active {
            match operation {
                crate::status::StatusOperation::Rate { change_rate, .. } => {
                    let attribute = installed
                        .attributes
                        .get(&change_rate.attribute)
                        .ok_or(InstallError::DefinitionBody)?
                        .value();
                    if !matches!(
                        attribute.implementation.as_str(),
                        "number-v1" | "native-health-v1"
                    ) {
                        return Err(InstallError::UnsupportedFamily(
                            "non-ordinary numeric rate writer",
                        ));
                    }
                }
                crate::status::StatusOperation::Every { change_every, .. } => {
                    if installed
                        .attributes
                        .get(&change_every.attribute)
                        .ok_or(InstallError::DefinitionBody)?
                        .value()
                        .implementation
                        != "native-health-v1"
                    {
                        return Err(InstallError::UnsupportedFamily(
                            "periodic ordinary-attribute feedback",
                        ));
                    }
                }
                _ => {}
            }
        }
    }
    let entities = install_entities(import, true, installed, header.sim_time, purpose, budget)?;
    installed
        .population_work
        .require_population(&entities, &installed.work_policy)
        .map_err(|_| InstallError::CurrentFormat)?;
    let optional = |presence: Option<bool>| match presence {
        None => Ok(false),
        Some(true) => Ok(true),
        Some(false) => Err(InstallError::ParentPresence),
    };
    let pending_values = take_window(
        import,
        optional(children.take("pendingNativeIntegration")?)?,
    )?;
    let work_state = take_work(import, optional(children.take("workState")?)?)?;
    let work = WorkBook::install(
        work_state,
        installed.work_policy.clone(),
        &entities,
        header.sim_time,
    )
    .map_err(|_| InstallError::CurrentFormat)?;
    if let Some(window) = &pending_values {
        let mut meanings = IndexMap::new();
        for binding in window.bindings.values() {
            if !meanings.contains_key(&binding.status_id) {
                let definition = installed
                    .status_policy
                    .definitions
                    .iter()
                    .find(|d| d.id == binding.status_id)
                    .ok_or(InstallError::DefinitionBody)?;
                meanings.insert(
                    binding.status_id.clone(),
                    crate::status::compile_arithmetic_meaning(definition, installed.attributes)
                        .map_err(|_| InstallError::DefinitionBody)?,
                );
            }
        }
        crate::values::validate_window(
            window,
            header.sim_time,
            &WindowValidation {
                entities: &entities,
                work: &work,
                meanings: &meanings,
            },
        )
        .map_err(|_| InstallError::CurrentFormat)?;
    }
    let coaching = super::ClosedCoachingState::install(import, &mut children)?;
    let bodies = crate::movement::BodyIndex::install(&entities, budget)
        .map_err(|_| InstallError::Capacity)?;
    let participation = crate::participation::ParticipationState::install(
        import,
        &mut children,
        &entities,
        budget,
    )?;
    let reservations = super::rows::take_collection(
        import, "sim_resource_reservations", "[\"world\"]",
        children.take("resourceReservations")?.unwrap_or(false), true,
    )?;
    let holds = crate::item_holds::install(reservations, &entities, budget)?;
    let projectiles = crate::projectile::ProjectileState::install(
        import, &mut children, header.sim_time, installed.ranged_installed, &entities, budget,
    )?;
    Ok(PhysicalInstallation {
        state: PhysicalState {
            gifts: crate::handover::GiftState::install(gifts, &entities, header.sim_time, budget)?,
            holds,
            participation,
            coaching,
            projectiles,
            header,
            identity,
            entities,
            bodies,
            pending_values,
            work,
        },
        content,
        personal,
        archived_event_count,
        assembly_geometry_revision,
        story_policy_revision,
        children,
    })
}

fn object(value: Value) -> Result<Map<String, Value>, InstallError> {
    match value {
        Value::Object(o) => Ok(o),
        _ => Err(InstallError::CurrentFormat),
    }
}
// JavaScript has one numeric JSON kind. Preserve usable 1.0 == 1 while exact
// string/array/map content still fences validating one presentation and loading
// another; object enumeration is not an authored presentation identity.
fn same_json_value(left: &Value, right: &Value) -> bool {
    match (left, right) {
        (Value::Number(a), Value::Number(b)) => a.as_f64() == b.as_f64(),
        (Value::Array(a), Value::Array(b)) => {
            a.len() == b.len() && a.iter().zip(b).all(|(a, b)| same_json_value(a, b))
        }
        (Value::Object(a), Value::Object(b)) => {
            a.len() == b.len()
                && a.iter().all(|(key, value)| {
                    b.get(key)
                        .is_some_and(|other| same_json_value(value, other))
                })
        }
        _ => left == right,
    }
}
struct WindowValidation<'a> {
    entities: &'a EntityStore,
    work: &'a WorkBook,
    meanings: &'a IndexMap<String, crate::values::ArithmeticMeaning>,
}
impl crate::values::NativeValueValidation for WindowValidation<'_> {
    fn is_actor(&self, id: &str) -> bool {
        self.entities.get(id).is_some_and(|e| e.actor.is_some())
    }
    fn attribute(&self, id: &str, attribute: &str) -> Option<&crate::values::AttributeState> {
        self.entities
            .get(id)?
            .actor
            .as_ref()?
            .attributes
            .as_ref()?
            .get(attribute)
    }
    fn status(&self, id: &str, status: &str) -> Option<&crate::values::StatusInstance> {
        self.entities.get(id)?.status_effects.as_ref()?.get(status)
    }
    fn invocation(&self, episode: &str) -> Option<&crate::values::WorkInvocation> {
        self.work.invocation(episode)
    }
    fn meaning(&self, _id: &str, status: &str) -> Option<&crate::values::ArithmeticMeaning> {
        self.meanings.get(status)
    }
}
fn validate_entity(
    entity: &mut Entity,
    installed: &PhysicalDefinitions<'_>,
    now: f64,
    _purpose: super::InstallPurpose,
) -> Result<(), InstallError> {
    if !crate::narration::valid_name_parts(
        &entity.name,
        entity.name_form.as_deref(),
        entity.indefinite_article.as_deref(),
    ) {
        return Err(InstallError::CurrentFormat);
    }
    let pending_family = [
        (entity.assembly.is_some(), "assembly"),
        (entity.replenisher.is_some(), "replenishment source"),
        (
            entity
                .mechanism_fields
                .as_ref()
                .is_some_and(|fields| !fields.is_empty()),
            "mechanism fields",
        ),
        (
            entity.status_effects.as_ref().is_some_and(|statuses| {
                statuses
                    .values()
                    .any(|status| status.contribution.is_some())
            }),
            "status contribution",
        ),
    ];
    if let Some((_, family)) = pending_family.into_iter().find(|(present, _)| *present) {
        return Err(InstallError::UnsupportedFamily(family));
    }
    validate_local_pose(entity, installed, now)?;
    if let Some(target) = &entity.practice_target {
        let installed_practice =
            installed
                .attributes
                .get(&target.attribute_id)
                .is_some_and(|definition| {
                    definition.value().implementation == "finite-practice-v1"
                        && definition.value().practice.is_some()
                });
        let supported = matches!(
            &entity.placement,
            Some(crate::state::Placement::World {
                support_surface_id: Some(_),
                ..
            })
        );
        if entity.actor.is_some()
            || entity.animal.is_some()
            || entity.remains.is_some()
            || entity.resource.is_some()
            || !supported
            || !installed_practice
        {
            return Err(InstallError::CurrentFormat);
        }
    }
    if let Some(heat) = entity.heat {
        let rules = installed
            .fire_out
            .ok_or(InstallError::UnsupportedFamily("ambient fire"))?;
        if !heat.fuel_seconds.is_finite()
            || heat.fuel_seconds < 0.0
            || !crate::values::is_safe_record_id(&rules.event_type)
            || rules.message.trim_is_empty()
        {
            return Err(InstallError::CurrentFormat);
        }
    }
    if entity.actor.is_some()
        && !matches!(
            entity.placement,
            Some(crate::state::Placement::World { .. })
        )
    {
        return Err(InstallError::CurrentFormat);
    }
    if let Some(retirement) = &entity.retirement {
        if !retirement.valid(now)
            || entity.item.is_some()
            || entity.placement.is_some()
            || entity.actor.is_some()
            || entity.container.is_some()
        {
            return Err(InstallError::CurrentFormat);
        }
    }
    if entity.actor.is_none() {
        validate_plain_entity(entity)?;
    }
    if let Some(values) = entity.stored_attributes() {
        for (id, state) in values {
            let definition = installed
                .attributes
                .get(id)
                .ok_or(InstallError::CurrentFormat)?
                .value();
            if definition.reservoir.is_some() {
                return Err(InstallError::UnsupportedFamily("native reservoir drain"));
            }
            if definition
                .concern
                .as_ref()
                .is_some_and(|concern| concern.mode == "latched" && concern.notify)
            {
                return Err(InstallError::UnsupportedFamily(
                    "notifying latched attribute concern",
                ));
            }
            if !matches!(
                definition.implementation.as_str(),
                "number-v1" | "category-v1"
            ) {
                return Err(InstallError::CurrentFormat);
            }
            let initial = match (&definition.schema, &state.value) {
                (
                    crate::status::AttributeSchema::Number {
                        min, max, initial, ..
                    },
                    crate::values::AttributeValue::Number(value),
                ) if value.is_finite() && value >= min && value <= max => value == initial,
                (
                    crate::status::AttributeSchema::Category { choices, initial },
                    crate::values::AttributeValue::Category(value),
                ) if choices.contains(value) => value == initial,
                _ => return Err(InstallError::CurrentFormat),
            };
            if entity.item.is_some() && !initial {
                return Err(InstallError::UnsupportedFamily("active material condition"));
            }
            let latched = definition
                .concern
                .as_ref()
                .is_some_and(|concern| concern.mode == "latched");
            if latched != state.concern_active.is_some() {
                return Err(InstallError::CurrentFormat);
            }
        }
    }
    if let Some(actor) = &entity.actor {
        if actor.evasion_ready_at.is_some_and(|at| !at.is_finite() || at < 0.0) {
            return Err(InstallError::CurrentFormat);
        }
        if let Some(conditions) = &actor.conditions {
            for (id, episode) in conditions {
                let definition = installed
                    .attributes
                    .get(id)
                    .ok_or(InstallError::CurrentFormat)?
                    .value();
                let policy = definition
                    .condition
                    .as_ref()
                    .ok_or(InstallError::CurrentFormat)?;
                if !matches!(
                    crate::status::read_attribute(entity, definition, None)
                        .map_err(|_| InstallError::CurrentFormat)?,
                    Some(crate::values::AttributeValue::Number(_))
                ) || episode.version != definition.version
                    || episode.revision == 0
                    || episode.severity > policy.bands.len() as u64
                    || episode.notified > policy.bands.len() as u64
                    || episode
                        .next_review_at
                        .is_some_and(|at| !at.is_finite() || at < 0.0)
                {
                    return Err(InstallError::CurrentFormat);
                }
            }
        }
        if actor.attack_mode_notice.as_ref().is_some_and(|notice| {
            notice.notice_sequence == 0
                || notice.notice_sequence > crate::identity::MAX_SAFE_INTEGER
                || !crate::values::is_safe_record_id(&notice.occurrence_id)
                || !notice.occurred_at.is_finite()
                || notice.occurred_at < 0.0
                || notice.occurred_at > now
        }) || actor.encounters.is_some()
            || actor.coaching_episode_id.is_some()
        {
            return Err(InstallError::CurrentFormat);
        }
        if let Some(inspection) = &actor.inventory_inspection {
            let short_id = |id: &str| !id.is_empty() && id.encode_utf16().count() <= 120;
            if inspection.scope.units_len() > 16000
                || inspection
                    .container_id
                    .as_deref()
                    .is_some_and(|id| !short_id(id))
                || inspection.after.encode_utf16().count() > 120
                || inspection.item_ids.len() > 16
                || inspection
                    .item_ids
                    .iter()
                    .enumerate()
                    .any(|(i, id)| !short_id(id) || inspection.item_ids[..i].contains(id))
                || !crate::narration::valid_name(&inspection.container_name)
                || inspection.item_names.len() != inspection.item_ids.len()
                || inspection
                    .item_names
                    .iter()
                    .any(|name| !crate::narration::valid_name(name))
                || inspection.evidence_ids.len() != inspection.item_ids.len() + 1
                || inspection.evidence_ids.iter().enumerate().any(|(i, id)| {
                    !crate::values::is_safe_record_id(id)
                        || inspection.evidence_ids[..i].contains(id)
                })
            {
                return Err(InstallError::CurrentFormat);
            }
        }
        if actor.action.as_ref().is_some_and(|a| {
            a.has_unconverted_fields()
                || a.motion_sample_remaining_metres.is_some_and(|remaining| {
                    !a.keeps_motion_sample() || !remaining.is_finite() || remaining <= 0.0
                })
                || a.attack_observers.as_ref().is_some_and(|receipts| {
                    installed.body_policy.and_then(|body| body.combat.as_ref())
                        .and_then(|combat| combat.encounters.as_ref()).is_none()
                    || !crate::reception::combat_observation::valid_observers(receipts)
                })
                || (a.strike_motion.is_some() && !a.is_natural_contact())
                || (a.follow.is_some() && !a.is_following())
                || (a.is_following()
                    && (!matches!(a.stage.as_str(), "approaching" | "working")
                        || a.target_life.is_some_and(|life| life > crate::identity::MAX_SAFE_INTEGER)
                        || (a.stage == "working" && (!a.path.is_empty() || a.navigation.is_some()))
                        || a.remaining_seconds != 0.0
                        || a.total_seconds != 0.0
                        || a.destination.is_some()))
                || (a.target_life.is_some() && !a.is_natural_contact() && !a.is_following() && !a.is_ranged_attack())
                || !a.supported_native_action()
        }) {
            return Err(InstallError::CurrentFormat);
        }
        if !actor.health.is_finite()
            || !actor.born_at.is_finite()
            || actor
                .body
                .as_ref()
                .is_some_and(|b| !b.max_health.is_finite() || b.max_health <= 0.0)
        {
            return Err(InstallError::CurrentFormat);
        }
        if let Some(body) = &actor.body {
            if installed.body_policy.is_none()
                || actor.health < 0.0
                || actor.health > body.max_health
                || ![body.conditions.wetness, body.conditions.burning]
                    .iter()
                    .all(|v| v.is_finite() && *v >= 0.0 && *v <= 100.0)
                || (!actor.alive && entity.remains.is_none() && actor.pending_death.is_none())
            {
                return Err(InstallError::CurrentFormat);
            }
            let whole = installed
                .attributes
                .values()
                .find(|d| d.value().implementation == "native-health-v1")
                .and_then(|d| d.value().native_health.as_ref())
                .is_some_and(|h| h.precision == "whole-points");
            if whole
                && [actor.health, body.max_health]
                    .iter()
                    .any(|v| v.fract() != 0.0 || *v > crate::identity::MAX_SAFE_INTEGER as f64)
            {
                return Err(InstallError::CurrentFormat);
            }
        }
        if let Some(scars) = &actor.scars {
            let policy = installed
                .body_policy
                .and_then(|p| p.reincarnation.as_ref())
                .ok_or(InstallError::CurrentFormat)?;
            if scars.iter().any(|(id, n)| {
                !policy.scars.iter().any(|scar| scar.id == *id)
                    || !n.is_finite()
                    || n.fract() != 0.0
                    || *n <= 0.0
                    || *n > crate::identity::MAX_SAFE_INTEGER as f64
            }) {
                return Err(InstallError::CurrentFormat);
            }
        }
        let senses = actor.senses.as_deref().unwrap_or(installed.default_senses);
        for (index, id) in senses.iter().enumerate() {
            if senses[..index].contains(id) {
                return Err(InstallError::CurrentFormat);
            }
            if !installed.senses.contains_key(id) {
                return Err(InstallError::DefinitionBody);
            }
        }
    }
    if let Some(animal) = &entity.animal {
        let key = crate::native_response::profile_key(&animal.profile)
            .map_err(|_| InstallError::DefinitionPin)?;
        let profile = installed
            .response_profiles
            .get(&key)
            .ok_or(InstallError::DefinitionPin)?;
        if profile.pin() != &animal.profile {
            return Err(InstallError::DefinitionPin);
        }
    }
    crate::native_response::validate_native_response(
        entity,
        installed.response_profiles,
        now,
        installed.maximum_candidates,
        installed.maximum_path_points,
        installed.epsilon,
    )
    .map_err(|_| InstallError::CurrentFormat)?;
    let body = entity.body_profile();
    if ![
        body.radius,
        body.height,
        body.eye_height,
        body.ear_height,
        body.interaction_height,
        body.max_slope,
        entity.spatial.heading,
    ]
    .iter()
    .all(|n| n.is_finite())
        || body.radius <= 0.0
        || body.height <= 0.0
        || entity
            .world_position()
            .is_some_and(|p| ![p.x, p.y, p.z].iter().all(|n| n.is_finite()))
    {
        return Err(InstallError::CurrentFormat);
    }
    Ok(())
}

fn validate_local_pose(
    entity: &mut Entity,
    installed: &PhysicalDefinitions<'_>,
    now: f64,
) -> Result<(), InstallError> {
    let Some(pose) = &entity.spatial.local_pose else {
        return Ok(());
    };
    let (pin, rules) = installed.local_avoidance.ok_or(InstallError::DefinitionPin)?;
    let height = rules
        .contracted_height(&entity.spatial.body, installed.epsilon)
        .ok_or(InstallError::CurrentFormat)?;
    let cooldown = pose.started_at + rules.cooldown_seconds;
    if &pose.profile != pin
        || !entity.actively_participates()
        || !entity.actor.as_ref().is_some_and(|actor| actor.alive)
        || entity.physical_life() != Some(pose.physical_life)
        || entity.world_support().is_none()
        || entity.spatial.flight.is_some()
        || entity.spatial.fall_velocity.is_some()
        || entity.spatial.soft_footprint.is_some()
        || !pose.started_at.is_finite()
        || pose.started_at < 0.0
        || pose.started_at > now
        || !pose.restore_at.is_finite()
        || pose.restore_at != pose.started_at + rules.hold_seconds
        || !cooldown.is_finite()
        || entity.spatial.local_avoidance_ready_at != Some(cooldown)
        || match pose.phase {
            crate::state::LocalPosePhase::Holding => pose.restore_at < now,
            crate::state::LocalPosePhase::RestoreBlocked => pose.restore_at > now,
        }
    {
        return Err(InstallError::CurrentFormat);
    }
    entity.spatial.local_pose.as_mut().expect("admitted local pose").contracted_height = height;
    Ok(())
}

/// Plain installed bodies have geometry and outward identity, without an actor
/// or an unconverted mechanical continuation. The shared component validation
/// above still owns item/heat and the other positive family refusals.
/// Reception, private place acquisition and actual player consumers share this
/// installed subset; positive mechanical families retain their own refusal:
/// docs/maintainers/native-simulation-core-coverage.md#candidate-implementation-ledger
fn validate_plain_entity(entity: &Entity) -> Result<(), InstallError> {
    if (entity.placement.is_none() && entity.retirement.is_none())
        || entity.animal.is_some()
        || entity.remains.is_some()
        || entity.sensory_progress.is_some()
        || entity
            .status_effects
            .as_ref()
            .is_some_and(|values| !values.is_empty())
        // Stored attributes on material lots use the same typed attribute
        // validation as every other entity. Active material changes still
        // require the installed exposure and condition transitions.
        || (entity.item.is_none() && entity.retirement.is_none()
            && entity
                .attributes
                .as_ref()
                .is_some_and(|values| !values.is_empty()))
        || entity.spatial.fall_velocity.is_some()
        || entity.spatial.local_avoidance_ready_at.is_some()
    {
        return Err(InstallError::UnsupportedFamily(
            "non-plain actor-less physical entity",
        ));
    }
    Ok(())
}

fn validate_body_references(
    entities: &EntityStore,
    installed: &PhysicalDefinitions<'_>,
    now: f64,
) -> Result<(), InstallError> {
    let reincarnation = installed.body_policy.and_then(|p| p.reincarnation.as_ref());
    for id in entities.ordered_ids() {
        let entity = entities.get(id).ok_or(InstallError::CurrentFormat)?;
        if let Some(remains) = &entity.remains {
            let actor = entity
                .actor
                .as_ref()
                .filter(|a| a.body.is_some() && !a.alive)
                .ok_or(InstallError::CurrentFormat)?;
            let _ = actor;
            if remains.source_id != entity.id {
                let source = entities
                    .get(&remains.source_id)
                    .ok_or(InstallError::CurrentFormat)?;
                let policy = reincarnation.ok_or(InstallError::CurrentFormat)?;
                if entity.kind != policy.corpse_kind
                    || source
                        .actor
                        .as_ref()
                        .is_none_or(|a| a.controller != policy.qualifying_controller)
                    || source.kind == policy.corpse_kind
                    || source.remains.is_some()
                {
                    return Err(InstallError::CurrentFormat);
                }
            }
            if !remains.died_at.is_finite()
                || remains.died_at < 0.0
                || remains.died_at > now
                || !matches!(remains.phase.as_str(), "fresh" | "rotting" | "removed")
                || remains
                    .rot_at
                    .is_some_and(|at| !at.is_finite() || at <= remains.died_at)
                || remains
                    .remove_at
                    .is_some_and(|at| !at.is_finite() || remains.rot_at.is_none_or(|rot| at <= rot))
                || remains.yields.iter().any(|y| y.quantity == 0)
                || (remains.phase != "fresh" && !remains.yields.is_empty())
            {
                return Err(InstallError::CurrentFormat);
            }
        }
        if let Some(actor) = &entity.actor {
            if let Some(death) = &actor.pending_death {
                let policy = reincarnation.ok_or(InstallError::CurrentFormat)?;
                if actor.controller != policy.qualifying_controller
                    || actor.alive
                    || actor.action.is_some()
                    || entity.remains.is_some()
                    || !death.at.is_finite()
                    || death.at < 0.0
                    || death.at > now
                    || ![death.position.x, death.position.y, death.position.z]
                        .iter()
                        .all(|v| v.is_finite())
                    || death.retained.iter().chain(&death.left).any(|item| {
                        item.name.is_empty()
                            || item.name.units_len() > 256
                            || item.quantity == 0
                    })
                    || entities
                        .get(&death.corpse_id)
                        .and_then(|e| e.remains.as_ref())
                        .is_none_or(|r| r.source_id != entity.id)
                {
                    return Err(InstallError::CurrentFormat);
                }
            }
        }
    }
    Ok(())
}
pub(super) fn validate_physical_item_references(
    state: &PhysicalState,
    installed: &crate::simulation::InstalledWorld,
) -> Result<(), InstallError> {
    let retained = &installed.retained;
    for id in state.entities.ordered_ids() {
        let entity = state.entities.get(id).ok_or(InstallError::CurrentFormat)?;
        if let Some(stock) = entity.resource.as_ref() {
            if !retained.items.contains_key(&stock.definition_id) {
                return Err(InstallError::DefinitionPin);
            }
            if entity.actor.is_some()
                || entity.kind != "resource"
                || !stock.work_seconds.is_finite()
                || stock.work_seconds <= 0.0
                || entity.supported_position().is_none()
            {
                return Err(InstallError::UnsupportedFamily(
                    "resource stock placement or use",
                ));
            }
            if let Some(cast) = stock.cast.as_deref() {
                if !cast.valid()
                    || !retained.casts.contains_key(&cast.definition_id)
                    || !installed.geometry.spatial.surfaces.iter()
                        .any(|surface| surface.id == cast.stance.surface_id)
                    || !retained.items.get(&stock.definition_id).is_some_and(|item| item.portable)
                {
                    return Err(InstallError::CurrentFormat);
                }
            }
        }
        validate_resource_foraging(entity, state, installed)?;
        if entity.hearth.as_ref().is_some_and(|placed| {
            !retained.hearths.get(&placed.definition.id).is_some_and(|hearth| placed.valid(entity, hearth))
        }) {
            return Err(InstallError::CurrentFormat);
        }
        if entity.actor.as_ref().and_then(|actor| actor.action.as_ref()).is_some_and(|action| {
            action.attack_execution.is_some()
                && !crate::attack_execution::valid_saved(state, installed, entity, action)
                || action.is_placing_hearth() && !crate::hearth::valid_saved(state, installed, entity, action)
                || action.is_cooking() && !crate::food_preparation::valid_saved(action, state, retained)
                || action.is_treating_scar() && !crate::body::scar_treatment::valid_saved(
                    entity, action, installed.body_policy.as_ref().map(super::VerifiedDefinition::value),
                )
                || action.is_practice_shot() && !crate::projectile::practice::valid_saved(state, installed, entity, action)
                || action.is_ranged_attack() && !crate::projectile::loadout::valid_saved(state, installed, entity, action)
                || action.is_evading() && !crate::movement::evasion::valid_saved(state, installed, entity, action)
                || action.is_guard() && !crate::contact::guard::valid_saved(state, installed, entity, action)
                || action.is_tending_fire() && !crate::fire_care::valid_saved(
                    action, state, installed.fire_care.as_ref().map(|rule| rule.value()),
                )
                || (action.kind == "follow"
                    && (!action.is_following()
                        || action.target_id.as_deref() == Some(id)
                        || action.follow.as_ref().is_none_or(|follow| {
                            !follow.valid(
                                &installed.occurrence_rules.value().response.offers.follow,
                                state.header.sim_time,
                            )
                        })))
        }) {
            return Err(InstallError::CurrentFormat);
        }
        for yielded in entity.remains.iter().flat_map(|r| r.yields.iter()).chain(
            entity
                .actor
                .iter()
                .filter_map(|a| a.body.as_ref())
                .flat_map(|b| b.harvest_yield.iter()),
        ) {
            if yielded.quantity == 0
                || retained
                    .item_definitions
                    .get(&yielded.definition_id)
                    .is_none()
            {
                return Err(InstallError::CurrentFormat);
            }
        }
    }
    Ok(())
}

fn validate_resource_foraging(
    entity: &Entity,
    state: &PhysicalState,
    installed: &crate::simulation::InstalledWorld,
) -> Result<(), InstallError> {
    let saved = entity
        .animal
        .as_ref()
        .and_then(|animal| animal.foraging.as_ref());
    let feeding = entity
        .actor
        .as_ref()
        .and_then(|actor| actor.action.as_ref())
        .filter(|action| action.kind == "feed");
    let Some(saved) = saved else {
        return if feeding.is_some() {
            Err(InstallError::CurrentFormat)
        } else {
            Ok(())
        };
    };
    let selected = &installed.retained.foraging;
    let profile = selected
        .profiles
        .get(&saved.profile.id)
        .filter(|definition| definition.pin == saved.profile)
        .ok_or(InstallError::DefinitionPin)?;
    use crate::native_response::{ForagingMode, ForagingWorkKind};
    let current = entity.actor.as_ref().and_then(|actor| actor.action.as_ref());
    let hunt = profile.profile.hunt.as_ref();
    if let Some(hunt) = hunt {
        let strike = crate::contact::profile(installed, entity, &hunt.strike_id)
            .and_then(|strike| strike.preparation_motion.as_ref())
            .ok_or(InstallError::DefinitionBody)?;
        if strike.locomotion_profile_id != hunt.locomotion_id {
            return Err(InstallError::DefinitionBody);
        }
    }
    if let Some(work) = saved.work.as_ref().filter(|work| work.kind == ForagingWorkKind::Hunt) {
        let rules = hunt.ok_or(InstallError::CurrentFormat)?;
        // A save can land after choosing a quarry but before a route returns.
        // The controller reacquires sight and prepares current routes on resume.
        let awaiting_route = match &saved.proposal {
            Some(proposal) => {
                if proposal.generation == 0
                    || proposal.candidates.len() as u64 > rules.approach.bearings
                    || work.lost_at.is_some()
                {
                    return Err(InstallError::CurrentFormat);
                }
                true
            }
            None => false,
        };
        if work.ends_at > work.started_at + rules.pursuit.game_seconds
            || work.travelled_metres > rules.pursuit.route_metres + installed.spatial.epsilon
            || work.search_index.is_some_and(|index| index > rules.lost_sight.candidate_count)
            || (!awaiting_route && !matches!(saved.mode, ForagingMode::Stalking | ForagingMode::Pursuing | ForagingMode::Searching | ForagingMode::Blocked))
            || current.is_some_and(|action| {
                action.id == work.action_id && action.kind != "move"
                    && !(action.is_natural_contact()
                        && action.definition_id.as_deref() == Some(&rules.strike_id)
                        && action.target_id == work.target_id && action.target_life == work.target_life)
            })
        {
            return Err(InstallError::CurrentFormat);
        }
    } else if saved.proposal.is_some() || matches!(saved.mode, ForagingMode::Stalking | ForagingMode::Pursuing | ForagingMode::Searching) {
        return Err(InstallError::CurrentFormat);
    }
    if let Some(work) = saved
        .work
        .as_ref()
        .filter(|work| work.kind == ForagingWorkKind::Regroup)
    {
        let policy = profile
            .profile
            .regroup
            .as_ref()
            .ok_or(InstallError::CurrentFormat)?;
        if saved.pack_id.is_none()
            || work.ends_at > work.started_at + policy.leg_game_seconds
            || work.travelled_metres > policy.leg_metres + installed.spatial.epsilon
        {
            return Err(InstallError::CurrentFormat);
        }
    } else if saved.mode == ForagingMode::Regrouping {
        return Err(InstallError::CurrentFormat);
    }
    let actor = entity.actor.as_ref().ok_or(InstallError::CurrentFormat)?;
    let meter = &profile.profile.fullness.attribute_id;
    let installed_meter = installed
        .attributes
        .get(meter)
        .ok_or(InstallError::DefinitionBody)?
        .value();
    if installed_meter.implementation != "number-v1"
        || installed_meter.reservoir.is_some()
        || !matches!(
            installed_meter.schema,
            crate::status::AttributeSchema::Number { .. }
        )
        || !actor
            .attributes
            .as_ref()
            .is_some_and(|attributes| attributes.contains_key(meter))
        || crate::worlds::base_foraging::foraging_night(&installed.status_policy.named_times, 0.0)
            .is_none()
        || !saved.valid_at(state.header.sim_time)
    {
        return Err(InstallError::CurrentFormat);
    }
    if let Some(action) = feeding {
        let binding = action.feeding.as_ref().ok_or(InstallError::CurrentFormat)?;
        // An admitted meal may lose live stock while paused. The action owner
        // checks its live target and exact stock revision before the next bite.
        let definition = selected
            .food
            .get(&binding.food.id)
            .ok_or(InstallError::DefinitionBody)?;
        let diet = profile
            .profile
            .diet_for(&definition.pin.id, binding.source.kind())
            .ok_or(InstallError::DefinitionBody)?;
        if binding.profile != saved.profile
            || binding.food != definition.pin
            || !binding.source.valid()
            || actor.controller != "native"
            || !actor.alive
            || actor.incapacitated
            || !saved.work.as_ref().is_some_and(|work| {
                work.kind == crate::native_response::ForagingWorkKind::Food
                    && work.action_id == action.id
                    && work.source_id == action.target_id
            })
            || !matches!(action.stage.as_str(), "approaching" | "working")
            || !action
                .target_id
                .as_deref()
                .is_some_and(crate::values::is_safe_record_id)
            || action.destination.is_some()
            || action.native_locomotion.is_some()
            || action.total_seconds != diet.work_seconds
            || !action.remaining_seconds.is_finite()
            || action.remaining_seconds < 0.0
            || action.remaining_seconds > action.total_seconds
        {
            return Err(InstallError::CurrentFormat);
        }
    }
    Ok(())
}
