//! One-time consuming installation of actual personal and chronological owners.
//! No absent transport collection is inferred from a resident row tail.

use super::{
    ActorPrivacy, EmptyChildOwner, ExperienceError, ExperienceHeader, ExperienceState,
    PersonalEvidenceMeaning, PersonalHistory, PersonalOwnerMap, PersonalSourceCollection,
    PersonalSourceKind,
};
use crate::activity::ActivityDisplayLimits;
use crate::encoding::json_record;
use crate::events::{OccurrenceHistory, OriginalOccurrenceInput};
use crate::install::rows::{
    take_collection, take_one, validate_map_row, validate_marker, validate_row,
};
use crate::install::{InstallError, RowImport};
use crate::received::{
    ReceivedChargeDirectory, ReceivedError, ReceivedValueRecord, ReceivedValues, TemporalState,
    TemporalValueMeaning,
};
use crate::reception::ReceptionState;
use crate::records::ChildShape;
use crate::values::deserialize_safe_integer;
use indexmap::IndexMap;
use serde::Deserialize;
use serde_json::Value;
use std::sync::Arc;

#[derive(Clone, Copy, Debug)]
pub struct PersonalRootPresence {
    pub experience: bool,
    pub memories: bool,
    pub received_values: bool,
    pub events: bool,
}

#[derive(Debug)]
pub enum PersonalInstallError {
    Records(InstallError),
    Experience(ExperienceError),
    Received(ReceivedError),
    Missing(&'static str),
}
impl From<InstallError> for PersonalInstallError {
    fn from(e: InstallError) -> Self {
        Self::Records(e)
    }
}
impl From<ExperienceError> for PersonalInstallError {
    fn from(e: ExperienceError) -> Self {
        Self::Experience(e)
    }
}
impl From<ReceivedError> for PersonalInstallError {
    fn from(e: ReceivedError) -> Self {
        Self::Received(e)
    }
}
impl std::fmt::Display for PersonalInstallError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Records(e) => e.fmt(f),
            Self::Experience(e) => e.fmt(f),
            Self::Received(e) => e.fmt(f),
            Self::Missing(owner) => write!(
                f,
                "Native personal installation requires actual {owner} ownership."
            ),
        }
    }
}
impl std::error::Error for PersonalInstallError {}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ValueRoot {
    sources: EmptyChildOwner,
}
#[derive(Deserialize)]
struct Ordinal(#[serde(deserialize_with = "deserialize_safe_integer")] u64);

/// Called before receiver installation, which moves the one actual pool into
/// ReceptionState. Absent source state remains absent, including inline-only
/// originals; this does not manufacture a writable empty pool.
pub(crate) fn install_received_values(
    import: &mut RowImport,
    present: bool,
    through: f64,
    sequence: u64,
    limits: Arc<ActivityDisplayLimits>,
) -> Result<Option<ReceivedValues>, PersonalInstallError> {
    let Some((root, header)) = take_one::<ValueRoot>(
        import,
        "mind_perception_value_state",
        "[\"world\"]",
        "receivedValues",
        present,
    )?
    else {
        return Ok(None);
    };
    let _ = &header.sources;
    if !root.extra.is_empty() {
        return Err(InstallError::CurrentFormat.into());
    }
    let sources = take_collection(import, "mind_perception_values", &root.id, true, true)?;
    let mut values = Vec::with_capacity(sources.rows.len());
    for row in sources.rows {
        let record: ReceivedValueRecord =
            serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
        validate_row(
            &row,
            &["world", "receivedValues", "sources", &record.id],
            &root.id,
            &record.id,
            sources.coverage.next_ordinal,
        )?;
        if row.extra.len() != 3
            || row.extra[0] != Value::from(record.id.clone())
            || crate::encoding::json_record(&row.extra[1])
                .map_err(|_| InstallError::CurrentFormat)?
                != json_record(&record.at).map_err(|_| InstallError::CurrentFormat)?
            || (!row.extra[2].is_null()
                && crate::encoding::json_record(&row.extra[2])
                    .ok()
                    .and_then(|encoded| serde_json::from_str::<Ordinal>(&encoded).ok())
                    .is_none())
        {
            return Err(InstallError::CurrentFormat.into());
        }
        values.push(record);
    }
    Ok(Some(ReceivedValues::install(
        values, through, sequence, limits,
    )?))
}

pub(crate) struct PersonalInstallation {
    pub experience: ExperienceState,
    pub temporal: Option<TemporalState>,
    pub occurrences: OccurrenceHistory,
}

pub(crate) struct PersonalInstallContext<'a> {
    pub budget: &'a crate::host::ByteBudget,
    pub presence: PersonalRootPresence,
    pub through: f64,
    pub archived_event_count: Option<u64>,
    pub reception: &'a ReceptionState,
    /// Complete indexed directories at the captured database cut. Required for
    /// a partial cold page tail; resident bodies alone never imply completeness.
    pub cold_directories: Option<&'a IndexMap<String, Vec<ReceivedChargeDirectory>>>,
    pub original_revisions: &'a mut crate::reception::OriginalRevisionRegistry,
}

pub(crate) fn install_personal<M: PersonalEvidenceMeaning + TemporalValueMeaning>(
    import: &mut RowImport,
    originals: Vec<OriginalOccurrenceInput>,
    context: PersonalInstallContext<'_>,
    meaning: &M,
) -> Result<PersonalInstallation, PersonalInstallError> {
    let generation = import.generation().to_owned();
    let Some((experience_row, header)) = take_one::<ExperienceHeader>(
        import,
        "experience_state",
        "[\"world\"]",
        "experience",
        context.presence.experience,
    )?
    else {
        return Err(PersonalInstallError::Missing("experience creation"));
    };
    if !experience_row.extra.is_empty() {
        return Err(InstallError::CurrentFormat.into());
    }
    let mut actors: IndexMap<String, ActorSources> = IndexMap::new();
    let mut owner_maps = IndexMap::new();
    let memory_owners = install_sources(
        import,
        &mut actors,
        PersonalSourceKind::Memory,
        "mind_memories_owners",
        "[\"world\"]",
        "memories",
        context.presence.memories,
        meaning,
        context.budget,
    )?;
    owner_maps.insert(PersonalSourceKind::Memory, memory_owners);
    let awareness_owners = install_sources(
        import,
        &mut actors,
        PersonalSourceKind::Awareness,
        "mind_awareness_owners",
        &experience_row.id,
        "awareness",
        true,
        meaning,
        context.budget,
    )?;
    owner_maps.insert(PersonalSourceKind::Awareness, awareness_owners);
    let summary_owners = install_sources(
        import,
        &mut actors,
        PersonalSourceKind::Summary,
        "mind_summaries_owners",
        &experience_row.id,
        "summaries",
        true,
        meaning,
        context.budget,
    )?;
    owner_maps.insert(PersonalSourceKind::Summary, summary_owners);
    install_forgotten(import, &mut actors, &experience_row.id)?;
    install_corrections(
        import,
        &mut actors,
        &experience_row.id,
        header.corrections.is_some(),
    )?;
    install_scalars(
        import,
        &mut actors,
        &experience_row.id,
        "mind_privacy_revisions",
        "privacyRevisions",
        header.privacy_revisions.is_some(),
        true,
    )?;
    install_scalars(
        import,
        &mut actors,
        &experience_row.id,
        "mind_consolidation",
        "consolidatedAt",
        true,
        false,
    )?;
    let mut histories = IndexMap::new();
    for (actor_id, source) in actors {
        for collection in &source.collections {
            for record in collection.records() {
                record.validate_originals(context.original_revisions, context.through)?;
            }
        }
        let privacy = ActorPrivacy::install(
            source.forgotten,
            source.corrections,
            source.privacy_revision,
        )?;
        histories.insert(
            actor_id,
            PersonalHistory::install(source.collections, privacy, source.consolidated_at)?,
        );
    }
    let temporal = crate::received::install_temporal(
        import,
        header.temporal.is_some(),
        context.through,
        context.reception,
        context.cold_directories,
        meaning,
    )?;
    let experience = ExperienceState::install(
        generation,
        header,
        experience_row.payload,
        histories,
        owner_maps,
        context.budget,
    )?;
    let events = take_collection(
        import,
        "world_hot_events",
        "[\"world\"]",
        context.presence.events,
        false,
    )?;
    let occurrences = OccurrenceHistory::install(
        events.rows,
        originals,
        events.coverage,
        context.archived_event_count,
    )
    .map_err(|_| InstallError::CurrentFormat)?;
    Ok(PersonalInstallation {
        experience,
        temporal,
        occurrences,
    })
}

#[derive(Default)]
struct ActorSources {
    collections: Vec<PersonalSourceCollection>,
    forgotten: Vec<String>,
    corrections: IndexMap<String, String>,
    privacy_revision: Option<u64>,
    consolidated_at: Option<f64>,
}

fn install_sources(
    import: &mut RowImport,
    actors: &mut IndexMap<String, ActorSources>,
    kind: PersonalSourceKind,
    owner_table: &str,
    parent: &str,
    field: &str,
    present: bool,
    meaning: &impl PersonalEvidenceMeaning,
    budget: &crate::host::ByteBudget,
) -> Result<PersonalOwnerMap, PersonalInstallError> {
    let owners = take_collection(import, owner_table, parent, present, true)?;
    let mut placements = IndexMap::new();
    for owner in owners.rows {
        validate_map_row(
            &owner,
            parent,
            field,
            &owner.slot,
            owners.coverage.next_ordinal,
        )?;
        validate_marker(&owner, ChildShape::Array)?;
        let child = take_collection(import, kind.table(), &owner.id, true, false)?;
        let collection = PersonalSourceCollection::install(
            kind,
            owner.slot.clone(),
            child.rows,
            child.coverage,
            meaning,
            budget,
        )?;
        placements.insert(owner.slot.clone(), owner.position);
        actors
            .entry(owner.slot)
            .or_default()
            .collections
            .push(collection);
    }
    Ok(PersonalOwnerMap::install(
        kind,
        owners.coverage,
        placements,
    )?)
}

fn install_forgotten(
    import: &mut RowImport,
    actors: &mut IndexMap<String, ActorSources>,
    parent: &str,
) -> Result<(), PersonalInstallError> {
    let owners = take_collection(import, "mind_forgotten_owners", parent, true, true)?;
    for owner in owners.rows {
        validate_map_row(
            &owner,
            parent,
            "forgotten",
            &owner.slot,
            owners.coverage.next_ordinal,
        )?;
        validate_marker(&owner, ChildShape::Array)?;
        let child = take_collection(import, "mind_forgotten", &owner.id, true, true)?;
        let actor = actors.entry(owner.slot.clone()).or_default();
        let parent_path: Vec<String> =
            serde_json::from_str(&owner.id).map_err(|_| InstallError::RowIdentity)?;
        for row in child.rows {
            let mut path = parent_path.clone();
            path.push(row.slot.clone());
            let borrowed: Vec<&str> = path.iter().map(String::as_str).collect();
            validate_row(
                &row,
                &borrowed,
                &owner.id,
                &row.slot,
                child.coverage.next_ordinal,
            )?;
            let id: String =
                serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
            if row.extra != [Value::from(owner.slot.clone()), Value::from(id.clone())] {
                return Err(InstallError::CurrentFormat.into());
            }
            actor.forgotten.push(id);
        }
    }
    Ok(())
}

fn install_corrections(
    import: &mut RowImport,
    actors: &mut IndexMap<String, ActorSources>,
    parent: &str,
    present: bool,
) -> Result<(), PersonalInstallError> {
    let owners = take_collection(import, "mind_corrections_owners", parent, present, true)?;
    for owner in owners.rows {
        validate_map_row(
            &owner,
            parent,
            "corrections",
            &owner.slot,
            owners.coverage.next_ordinal,
        )?;
        validate_marker(&owner, ChildShape::Object)?;
        let child = take_collection(import, "mind_corrections", &owner.id, true, true)?;
        let actor = actors.entry(owner.slot.clone()).or_default();
        for row in child.rows {
            validate_map_row(&row, &owner.id, "", &row.slot, child.coverage.next_ordinal)?;
            let correcting: String =
                serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
            if row.extra
                != [
                    Value::from(owner.slot.clone()),
                    Value::from(row.slot.clone()),
                    Value::from(correcting.clone()),
                ]
                || actor.corrections.insert(row.slot, correcting).is_some()
            {
                return Err(InstallError::CurrentFormat.into());
            }
        }
    }
    Ok(())
}

fn install_scalars(
    import: &mut RowImport,
    actors: &mut IndexMap<String, ActorSources>,
    parent: &str,
    table: &str,
    field: &str,
    present: bool,
    ordinal: bool,
) -> Result<(), PersonalInstallError> {
    let rows = take_collection(import, table, parent, present, true)?;
    for row in rows.rows {
        validate_map_row(&row, parent, field, &row.slot, rows.coverage.next_ordinal)?;
        if !row.extra.is_empty() {
            return Err(InstallError::CurrentFormat.into());
        }
        let actor = actors.entry(row.slot).or_default();
        if ordinal {
            let Ordinal(value) =
                serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
            actor.privacy_revision = Some(value);
        } else {
            let value: f64 =
                serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
            if !value.is_finite() {
                return Err(InstallError::CurrentFormat.into());
            }
            actor.consolidated_at = Some(value);
        }
    }
    Ok(())
}
