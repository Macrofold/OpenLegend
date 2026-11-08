//! One-time physical owner assembly. Temporary JSON objects only stitch the
//! current SQL child records before strict typed admission; none is retained as
//! a writable world or used to bypass an unsupported active family.

use super::{DefinitionInput, InstallError, InstalledContent, RowImport};
use crate::activity::ActivityLimits;
use crate::experience::PersonalRootPresence;
use crate::identity::{IdentityState, MAX_SAFE_INTEGER};
use crate::simulation::{InstalledWorld, PhysicalState};
use crate::state::{Entity, EntityStore, WorkState, WorldHeader};
use crate::values::{NativeValueWindow, deserialize_safe_integer};
use crate::work::{WorkBook, WorkPolicy};
use indexmap::IndexMap;
use serde::Deserialize;
use serde_json::{Map, Value};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CanonicalInput {
    pub canonical: String,
    pub sha256: String,
}
impl CanonicalInput {
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
    pub attributes: Vec<DefinitionInput>,
    pub senses: Vec<DefinitionInput>,
    pub acoustics: DefinitionInput,
    pub response_profiles: Vec<DefinitionInput>,
    pub attention: DefinitionInput,
    pub event_disclosure: DefinitionInput,
    pub status_policy: CanonicalInput,
    pub work_policy: CanonicalInput,
}
#[derive(Debug, Deserialize)]
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
#[derive(Debug, Deserialize)]
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
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct NativeSetupSettings {
    pub work: WorkPolicy,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub maximum_change_scopes: u64,
    pub spatial: SpatialSettings,
    pub movement: MovementSettings,
    pub time_epsilon: f64,
    pub activity: ActivityLimits,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub activity_display_bytes: u64,
    pub native_response: ResponseSettings,
}

/// Presence is consumed only during installation by the actual child owners.
/// A null child differs from an omitted child; its owner must retain that exact
/// current-format meaning. This metadata is not a runtime world field store.
pub(crate) struct WorldChildren {
    fields: IndexMap<String, Option<bool>>,
}
impl WorldChildren {
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
    object: &mut Map<String, Value>,
    key: &str,
) -> Result<Option<T>, InstallError> {
    object
        .remove(key)
        .map(|value| serde_json::from_value(value).map_err(|_| InstallError::CurrentFormat))
        .transpose()
}
fn required<T: serde::de::DeserializeOwned>(
    object: &mut Map<String, Value>,
    key: &str,
) -> Result<T, InstallError> {
    remove_optional(object, key)?.ok_or(InstallError::CurrentFormat)
}
fn empty_marker(value: &Value, array: bool) -> bool {
    if array {
        value.as_array().is_some_and(Vec::is_empty)
    } else {
        value.as_object().is_some_and(Map::is_empty)
    }
}

pub(crate) fn install_physical(
    import: &mut RowImport,
    installed: &InstalledWorld,
) -> Result<PhysicalInstallation, InstallError> {
    let (row, mut root) =
        super::rows::take_one::<Map<String, Value>>(import, "world_settings", "[]", "world", true)?
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
    let presentation = remove_optional(&mut root, "presentation")?;
    let time_policy = required(&mut root, "timePolicy")?;
    let profile = required(&mut root, "profile")?;
    let content = InstalledContent::install(presentation, time_policy, profile)?;
    let archived_event_count =
        remove_optional::<Ordinal>(&mut root, "archivedEventCount")?.map(|n| n.0);
    let assembly_geometry_revision =
        remove_optional::<Ordinal>(&mut root, "assemblyGeometryRevision")?.map(|n| n.0);
    let story_policy_revision =
        remove_optional::<Ordinal>(&mut root, "storyPolicyRevision")?.map(|n| n.0);
    // This optional live map has no selected command/clock owner yet. A real
    // pending offer must be refused, rather than vanish into static metadata.
    if let Some(offers) = root.remove("itemOffers") {
        if !empty_marker(&offers, false) {
            return Err(InstallError::CurrentFormat);
        }
    }
    let mut fields = IndexMap::new();
    for &(field, array) in ROOT_CHILDREN {
        let presence = match root.remove(field) {
            None => None,
            Some(Value::Null) => Some(false),
            Some(value) if empty_marker(&value, array) => Some(true),
            _ => return Err(InstallError::CurrentFormat),
        };
        fields.insert(field.to_owned(), presence);
    }
    let header: WorldHeader =
        serde_json::from_value(Value::Object(root)).map_err(|_| InstallError::CurrentFormat)?;
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
    let present = |name: &str| fields.get(name).copied().flatten() == Some(true);
    let personal = PersonalRootPresence {
        experience: present("experience"),
        memories: present("memories"),
        received_values: present("receivedValues"),
        events: present("events"),
    };
    let entities = install_entities(import, present("entities"), installed)?;
    let pending_values = take_window(import, present("pendingNativeIntegration"))?;
    let work_state = take_work(import, present("workState"))?;
    let work = WorkBook::install(
        work_state,
        installed.work_policy.clone(),
        &entities,
        header.sim_time,
    )
    .map_err(|_| InstallError::CurrentFormat)?;
    let bodies = crate::movement::BodyIndex::install(&entities);
    fields.shift_remove("entities");
    fields.shift_remove("pendingNativeIntegration");
    fields.shift_remove("workState");
    Ok(PhysicalInstallation {
        state: PhysicalState {
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
        children: WorldChildren { fields },
    })
}

fn object(value: Value) -> Result<Map<String, Value>, InstallError> {
    match value {
        Value::Object(o) => Ok(o),
        _ => Err(InstallError::CurrentFormat),
    }
}
fn child_present(
    parent: &Map<String, Value>,
    field: &str,
    array: bool,
) -> Result<bool, InstallError> {
    match parent.get(field) {
        None | Some(Value::Null) => Ok(false),
        Some(value) if empty_marker(value, array) => Ok(true),
        _ => Err(InstallError::CurrentFormat),
    }
}
fn one(
    import: &mut RowImport,
    parent: &mut Map<String, Value>,
    parent_id: &str,
    field: &str,
    table: &str,
    join: fn(&mut RowImport, &mut Map<String, Value>, &str) -> Result<(), InstallError>,
) -> Result<(), InstallError> {
    let present = child_present(parent, field, false)?;
    if let Some((row, mut value)) =
        super::rows::take_one::<Map<String, Value>>(import, table, parent_id, field, present)?
    {
        if table != "sim_placements" && !row.extra.is_empty() {
            return Err(InstallError::CurrentFormat);
        }
        join(import, &mut value, &row.id)?;
        parent.insert(field.to_owned(), Value::Object(value));
    }
    Ok(())
}
fn plain(
    _import: &mut RowImport,
    _parent: &mut Map<String, Value>,
    _id: &str,
) -> Result<(), InstallError> {
    Ok(())
}
fn collection(
    import: &mut RowImport,
    parent: &mut Map<String, Value>,
    parent_id: &str,
    field: &str,
    table: &str,
    list: bool,
    keyed: bool,
    join: fn(&mut RowImport, &mut Map<String, Value>, &str) -> Result<(), InstallError>,
) -> Result<(), InstallError> {
    let present = child_present(parent, field, list)?;
    let input = super::rows::take_collection(import, table, parent_id, present, true)?;
    if !present {
        return Ok(());
    }
    let mut map = Map::new();
    let mut array = Vec::new();
    let mut positions = std::collections::BTreeSet::new();
    for row in input.rows {
        if !positions.insert(row.position) || !row.extra.is_empty() {
            return Err(InstallError::RowPlacement);
        }
        let path: Vec<String> =
            serde_json::from_str(&row.id).map_err(|_| InstallError::RowIdentity)?;
        let key = if keyed {
            path.last().ok_or(InstallError::RowIdentity)?.as_str()
        } else {
            row.slot.as_str()
        };
        if list {
            let mut expected: Vec<String> =
                serde_json::from_str(parent_id).map_err(|_| InstallError::RowIdentity)?;
            expected.push(field.to_owned());
            expected.push(key.to_owned());
            if row.id
                != crate::encoding::json_record(&expected).map_err(|_| InstallError::RowIdentity)?
                || row.parent != parent_id
                || row.position >= input.coverage.next_ordinal
            {
                return Err(InstallError::RowPlacement);
            }
        } else {
            super::rows::validate_map_row(
                &row,
                parent_id,
                field,
                key,
                input.coverage.next_ordinal,
            )?;
        }
        let mut value =
            object(serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?)?;
        join(import, &mut value, &row.id)?;
        if list {
            array.push(Value::Object(value));
        } else if map.insert(key.to_owned(), Value::Object(value)).is_some() {
            return Err(InstallError::DuplicateRow);
        }
    }
    parent.insert(
        field.to_owned(),
        if list {
            Value::Array(array)
        } else {
            Value::Object(map)
        },
    );
    Ok(())
}
fn agency(
    import: &mut RowImport,
    value: &mut Map<String, Value>,
    id: &str,
) -> Result<(), InstallError> {
    collection(import, value, id, "goals", "sim_goals", true, true, plain)?;
    one(import, value, id, "plan", "sim_plans", plan)?;
    collection(
        import,
        value,
        id,
        "history",
        "sim_plan_history",
        true,
        false,
        plain,
    )?;
    collection(
        import,
        value,
        id,
        "attempts",
        "sim_intentions",
        true,
        true,
        plain,
    )
}
fn plan(
    import: &mut RowImport,
    value: &mut Map<String, Value>,
    id: &str,
) -> Result<(), InstallError> {
    collection(
        import,
        value,
        id,
        "steps",
        "sim_plan_steps",
        true,
        true,
        plain,
    )
}
fn actor(
    import: &mut RowImport,
    value: &mut Map<String, Value>,
    id: &str,
) -> Result<(), InstallError> {
    one(import, value, id, "action", "sim_processes", plain)?;
    one(import, value, id, "agency", "sim_agency", agency)?;
    collection(
        import,
        value,
        id,
        "attributes",
        "sim_actor_attributes",
        false,
        false,
        plain,
    )?;
    collection(
        import,
        value,
        id,
        "practice",
        "sim_actor_practice",
        false,
        false,
        plain,
    )?;
    one(
        import,
        value,
        id,
        "encounters",
        "sim_personal_encounters",
        encounters,
    )?;
    collection(
        import,
        value,
        id,
        "conditions",
        "sim_actor_conditions",
        false,
        false,
        plain,
    )?;
    collection(
        import,
        value,
        id,
        "traits",
        "sim_actor_traits",
        true,
        true,
        plain,
    )
}
fn encounters(
    import: &mut RowImport,
    value: &mut Map<String, Value>,
    id: &str,
) -> Result<(), InstallError> {
    collection(
        import,
        value,
        id,
        "pairs",
        "sim_encounter_pairs",
        false,
        false,
        plain,
    )?;
    collection(
        import,
        value,
        id,
        "unknown",
        "sim_unknown_dangers",
        false,
        false,
        plain,
    )
}
fn animal(
    import: &mut RowImport,
    value: &mut Map<String, Value>,
    id: &str,
) -> Result<(), InstallError> {
    collection(
        import,
        value,
        id,
        "acousticPatterns",
        "sim_native_acoustic_patterns",
        false,
        false,
        plain,
    )?;
    one(
        import,
        value,
        id,
        "episode",
        "sim_native_response_episodes",
        episode,
    )
}
fn episode(
    import: &mut RowImport,
    value: &mut Map<String, Value>,
    id: &str,
) -> Result<(), InstallError> {
    collection(
        import,
        value,
        id,
        "dangers",
        "sim_native_response_dangers",
        false,
        false,
        plain,
    )?;
    collection(
        import,
        value,
        id,
        "preparations",
        "sim_native_attack_preparations",
        false,
        false,
        plain,
    )
}
fn entity(
    import: &mut RowImport,
    value: &mut Map<String, Value>,
    id: &str,
) -> Result<(), InstallError> {
    for (field, table) in [
        ("placement", "sim_placements"),
        ("assembly", "sim_assemblies"),
        ("item", "sim_items"),
        ("container", "sim_containers"),
        ("declaredOwner", "sim_declared_owners"),
        ("retirement", "sim_object_retirements"),
        ("spatial", "sim_entity_geometry"),
        ("threat", "sim_territorial_threat"),
        ("resource", "sim_resources"),
        ("remains", "sim_remains"),
        ("heat", "sim_heat"),
        ("replenisher", "sim_reservoirs"),
    ] {
        one(import, value, id, field, table, plain)?;
    }
    one(import, value, id, "actor", "sim_actors", actor)?;
    one(import, value, id, "animal", "sim_animal_behavior", animal)?;
    collection(
        import,
        value,
        id,
        "statusEffects",
        "sim_status_effects",
        false,
        false,
        plain,
    )?;
    collection(
        import,
        value,
        id,
        "attributes",
        "sim_attributes",
        false,
        false,
        plain,
    )?;
    // A mechanism field value is a plain numeric map rather than an object
    // family. No selected body has one; preserve/refuse its explicit presence.
    collection(
        import,
        value,
        id,
        "mechanismFields",
        "sim_mechanism_fields",
        false,
        false,
        plain,
    )
}
fn install_entities(
    import: &mut RowImport,
    present: bool,
    installed: &InstalledWorld,
) -> Result<EntityStore, InstallError> {
    if !present {
        return Err(InstallError::ParentPresence);
    }
    let input = super::rows::take_collection(import, "sim_entities", "[\"world\"]", true, true)?;
    let ordering = import.take_entity_ordering()?;
    let mut orders: IndexMap<String, String> = ordering
        .entries
        .into_iter()
        .map(|e| (e.id, e.key))
        .collect();
    let mut entries = Vec::with_capacity(input.rows.len());
    for row in input.rows {
        let mut value: Map<String, Value> =
            serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
        let id = value
            .get("id")
            .and_then(Value::as_str)
            .ok_or(InstallError::Identity)?
            .to_owned();
        super::rows::validate_map_row(
            &row,
            "[\"world\"]",
            "entities",
            &id,
            input.coverage.next_ordinal,
        )?;
        let extra = serde_json::json!([id, value.get("kind"), value.get("name")]);
        if Value::Array(row.extra) != extra {
            return Err(InstallError::CurrentFormat);
        }
        entity(import, &mut value, &row.id)?;
        let entity: Entity = serde_json::from_value(Value::Object(value))
            .map_err(|_| InstallError::CurrentFormat)?;
        validate_entity(&entity, installed)?;
        let order = orders.shift_remove(&id).ok_or(InstallError::Identity)?;
        entries.push((order, entity));
    }
    if !orders.is_empty() {
        return Err(InstallError::Identity);
    }
    EntityStore::install(entries, ordering.next_insertion).map_err(|_| InstallError::Identity)
}
fn validate_entity(entity: &Entity, installed: &InstalledWorld) -> Result<(), InstallError> {
    if entity.hearth.is_some()
        || entity.practice_target.is_some()
        || entity.threat.is_some()
        || entity.assembly.is_some()
        || entity.inventory_revision.is_some()
        || entity.item.is_some()
        || entity.container.is_some()
        || entity.declared_owner.is_some()
        || entity.retirement.is_some()
        || entity
            .mechanism_fields
            .as_ref()
            .is_some_and(|f| !f.is_empty())
        || entity.spatial.flight.is_some()
        || entity.spatial.local_pose.is_some()
    {
        return Err(InstallError::CurrentFormat);
    }
    if let Some(actor) = &entity.actor {
        if actor.attack_mode_notice.is_some()
            || actor.encounters.is_some()
            || actor.coaching_episode_id.is_some()
            || actor.pending_death.is_some()
            || actor.inventory_inspection.is_some()
            || actor.agency.plan.is_some()
            || actor.agency.suspended.is_some()
            || !actor.agency.history.is_empty()
            || !actor.agency.attempts.is_empty()
        {
            return Err(InstallError::CurrentFormat);
        }
        if actor
            .action
            .as_ref()
            .is_some_and(|a| !matches!(a.kind.as_str(), "move" | "status-effect"))
        {
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
        for id in actor.senses.as_deref().unwrap_or(&installed.default_senses) {
            if !installed.senses.contains_key(id) {
                return Err(InstallError::DefinitionBody);
            }
        }
    }
    if let Some(animal) = &entity.animal {
        if animal.foraging.is_some() {
            return Err(InstallError::CurrentFormat);
        }
        let profile = installed
            .response_profiles
            .get(&animal.profile.id)
            .ok_or(InstallError::DefinitionPin)?;
        if profile.pin() != &animal.profile {
            return Err(InstallError::DefinitionPin);
        }
    }
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
fn take_window(
    import: &mut RowImport,
    present: bool,
) -> Result<Option<NativeValueWindow>, InstallError> {
    let Some((row, mut value)) = super::rows::take_one::<Map<String, Value>>(
        import,
        "sim_native_values",
        "[\"world\"]",
        "pendingNativeIntegration",
        present,
    )?
    else {
        return Ok(None);
    };
    if !row.extra.is_empty() {
        return Err(InstallError::CurrentFormat);
    }
    collection(
        import,
        &mut value,
        &row.id,
        "bindings",
        "sim_native_value_bindings",
        false,
        false,
        plain,
    )?;
    // byEntity values are arrays of IDs, so decode them at their actual owner.
    let is_present = child_present(&value, "byEntity", false)?;
    let collection = super::rows::take_collection(
        import,
        "sim_native_value_subjects",
        &row.id,
        is_present,
        true,
    )?;
    let mut subjects = Map::new();
    for child in collection.rows {
        super::rows::validate_map_row(
            &child,
            &row.id,
            "byEntity",
            &child.slot,
            collection.coverage.next_ordinal,
        )?;
        if !child.extra.is_empty() {
            return Err(InstallError::CurrentFormat);
        }
        let ids: Vec<String> =
            serde_json::from_str(&child.payload).map_err(|_| InstallError::CurrentFormat)?;
        subjects.insert(
            child.slot,
            serde_json::to_value(ids).map_err(|_| InstallError::CurrentFormat)?,
        );
    }
    if is_present {
        value.insert("byEntity".to_owned(), Value::Object(subjects));
    }
    serde_json::from_value(Value::Object(value))
        .map(Some)
        .map_err(|_| InstallError::CurrentFormat)
}
fn take_work(import: &mut RowImport, present: bool) -> Result<Option<WorkState>, InstallError> {
    let Some((row, mut value)) = super::rows::take_one::<Map<String, Value>>(
        import,
        "sim_work_state",
        "[\"world\"]",
        "workState",
        present,
    )?
    else {
        return Ok(None);
    };
    if !row.extra.is_empty() {
        return Err(InstallError::CurrentFormat);
    }
    collection(
        import,
        &mut value,
        &row.id,
        "invocations",
        "sim_work_invocations",
        false,
        false,
        plain,
    )?;
    serde_json::from_value(Value::Object(value))
        .map(Some)
        .map_err(|_| InstallError::CurrentFormat)
}
