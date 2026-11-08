//! Personal mind records. Documents and typed interpretations belong to one
//! actor; they are not another person's observed identity or body permission.

use crate::install::rows::{take_collection, validate_map_row, validate_row};
use crate::install::{InstallError, RowImport};
use crate::reception::ObserverSubject;
use crate::records::{InstalledRow, RecordSchema};
use crate::state::EntityStore;
use crate::values::{
    deserialize_nullable, deserialize_present_option, deserialize_safe_integer, is_safe_record_id,
};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

mod journal;
pub(crate) use journal::{CognitionChange, CognitionCheckpoint, CognitionJournal};
mod retained_size;
mod save;
pub(crate) use save::encode_cognition_changes;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct MindLimits {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub documents: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub words: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub document_bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub proposal_bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub records: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub thoughts: u64,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum EvidenceRelation {
    Supports,
    Contradicts,
    DerivedFrom,
    Supersedes,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct EvidenceLink {
    pub id: String,
    pub relation: EvidenceRelation,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct MindDocument {
    pub id: String,
    pub title: String,
    pub text: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    pub evidence: Vec<EvidenceLink>,
    pub protected: bool,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum InnerKind {
    Relationship,
    Belief,
    Appraisal,
    Goal,
    Concern,
    Commitment,
    Reflection,
    Dream,
    Identity,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum InnerSource {
    Inferred,
    Imagined,
    Authored,
}
#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum InnerStatus {
    Active,
    Resolved,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct InnerRecord {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    pub document_id: String,
    pub kind: InnerKind,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub subject_id: Option<ObserverSubject>,
    pub source: InnerSource,
    pub confidence: f64,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub trust: Option<f64>,
    pub status: InnerStatus,
    pub evidence: Vec<EvidenceLink>,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum ThoughtKind {
    Thought,
    Reflection,
    Dream,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum ThoughtSource {
    Inferred,
    Imagined,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct PrivateThought {
    pub decision_id: String,
    pub at: f64,
    pub text: String,
    pub kind: ThoughtKind,
    pub source: ThoughtSource,
}
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ActorMind {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    pub documents: Vec<MindDocument>,
    pub records: Vec<InnerRecord>,
    pub thoughts: Vec<PrivateThought>,
    pub last_reflection_at: f64,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub last_dream_episode: Option<String>,
}
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct InnerWorld {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    pub source_snapshot: String,
    pub publication_job_id: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub publication_body: Option<String>,
    pub evidence_ids: Vec<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub reconsideration_required: Option<bool>,
}
pub(crate) struct MindState {
    pub minds: Option<IndexMap<String, ActorMind>>,
    pub inner_worlds: Option<IndexMap<String, InnerWorld>>,
}
impl MindState {
    /// Source pins every retained individual interpretation, including resolved
    /// records. Retirement does not infer that an interpretation was forgotten.
    pub(crate) fn pinned_individuals<'a>(&'a self, actor: &str) -> impl Iterator<Item = &'a str> {
        self.minds
            .as_ref()
            .and_then(|minds| minds.get(actor))
            .into_iter()
            .flat_map(|mind| &mind.records)
            .filter_map(|record| match &record.subject_id {
                Some(ObserverSubject::Individual { individual_id }) => Some(individual_id.as_str()),
                _ => None,
            })
    }
}

fn plain_columns(
    row: &InstalledRow,
    table: &str,
    schema: &RecordSchema,
) -> Result<(), InstallError> {
    let layout = schema
        .layout(table)
        .map_err(|_| InstallError::CurrentFormat)?;
    if !layout.columns.is_empty() || !row.extra.is_empty() {
        return Err(InstallError::CurrentFormat);
    }
    Ok(())
}
fn list<T: serde::de::DeserializeOwned>(
    import: &mut RowImport,
    table: &str,
    parent: &str,
    field: &str,
    schema: &RecordSchema,
    id: impl Fn(&T, usize) -> String,
) -> Result<Vec<T>, InstallError> {
    let collection = take_collection(import, table, parent, true, true)?;
    let mut values = Vec::with_capacity(collection.rows.len());
    for (at, row) in collection.rows.into_iter().enumerate() {
        if row.position != at as u64 || row.slot != at.to_string() {
            return Err(InstallError::RowPlacement);
        }
        plain_columns(&row, table, schema)?;
        let value: T =
            serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
        let mut path: Vec<String> =
            serde_json::from_str(parent).map_err(|_| InstallError::RowIdentity)?;
        path.push(field.to_owned());
        path.push(id(&value, at));
        validate_row(
            &row,
            &path.iter().map(String::as_str).collect::<Vec<_>>(),
            parent,
            &row.slot,
            collection.coverage.next_ordinal,
        )?;
        values.push(value);
    }
    Ok(values)
}

pub(crate) fn install_minds(
    import: &mut RowImport,
    minds_present: bool,
    inner_present: bool,
    entities: &EntityStore,
    limits: &MindLimits,
    schema: &RecordSchema,
) -> Result<MindState, InstallError> {
    let owners = take_collection(import, "mind_state", "[\"world\"]", minds_present, true)?;
    let mut minds = IndexMap::with_capacity(owners.rows.len());
    for row in owners.rows {
        validate_map_row(
            &row,
            "[\"world\"]",
            "minds",
            &row.slot,
            owners.coverage.next_ordinal,
        )?;
        plain_columns(&row, "mind_state", schema)?;
        if !entities
            .get(&row.slot)
            .is_some_and(|entity| entity.actor.is_some())
        {
            return Err(InstallError::ParentPresence);
        }
        let mut mind: ActorMind =
            serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
        if !mind.documents.is_empty() || !mind.records.is_empty() || !mind.thoughts.is_empty() {
            return Err(InstallError::CurrentFormat);
        }
        mind.documents = list(
            import,
            "mind_documents",
            &row.id,
            "documents",
            schema,
            |document: &MindDocument, _| document.id.clone(),
        )?;
        mind.records = list(
            import,
            "mind_facets",
            &row.id,
            "records",
            schema,
            |record: &InnerRecord, _| record.id.clone(),
        )?;
        mind.thoughts = list(
            import,
            "mind_thoughts",
            &row.id,
            "thoughts",
            schema,
            |_: &PrivateThought, index| index.to_string(),
        )?;
        if mind.documents.len() as u64 > limits.documents
            || mind.records.len() as u64 > limits.records
            || mind.records.iter().any(|record| {
                !is_safe_record_id(&record.id)
                    || !mind
                        .documents
                        .iter()
                        .any(|document| document.id == record.document_id)
                    || record
                        .subject_id
                        .as_ref()
                        .is_some_and(|subject| !subject.validate())
            })
        {
            return Err(InstallError::CurrentFormat);
        }
        if minds.insert(row.slot, mind).is_some() {
            return Err(InstallError::DuplicateRow);
        }
    }
    let owners = take_collection(
        import,
        "mind_inner_worlds",
        "[\"world\"]",
        inner_present,
        true,
    )?;
    let mut inner = IndexMap::with_capacity(owners.rows.len());
    for row in owners.rows {
        validate_map_row(
            &row,
            "[\"world\"]",
            "innerWorlds",
            &row.slot,
            owners.coverage.next_ordinal,
        )?;
        plain_columns(&row, "mind_inner_worlds", schema)?;
        if !entities
            .get(&row.slot)
            .is_some_and(|entity| entity.actor.is_some())
        {
            return Err(InstallError::ParentPresence);
        }
        let value = serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
        if inner.insert(row.slot, value).is_some() {
            return Err(InstallError::DuplicateRow);
        }
    }
    Ok(MindState {
        minds: minds_present.then_some(minds),
        inner_worlds: inner_present.then_some(inner),
    })
}
