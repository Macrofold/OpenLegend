//! Canonical immutable personal source bodies and exact selected residency.
//!
//! The encoded current-format body is the sole source authority. Typed headers
//! are derived from that body for selection, retention and invalidation; they
//! cannot be supplied or mutated independently. Captures return actual selected
//! records, not a reconstructed world or synthetic substitute experience.

use std::collections::{BTreeMap, BTreeSet};
use std::fmt;
use std::sync::Arc;

use indexmap::{IndexMap, IndexSet};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use crate::encoding::{json_record, sha256_hex};
use crate::identity::MAX_SAFE_INTEGER;
use crate::received::TemporalReceiptLocator;
use crate::reception::EvidenceSource;
use crate::records::{InstalledRow, OwnerCoverage};
use crate::values::{deserialize_present_option, deserialize_safe_integer, is_safe_record_id};

mod awareness;
pub use awareness::*;
mod evidence;
pub use evidence::*;
mod install;
pub use install::*;

/// Completion proof from actual personally acquired result evidence. There is
/// no constructor while the result/account acquisition owner remains unjoined.
#[derive(Debug)]
pub struct AcquiredActivityResult {
    actor_id: String,
    occurrence_id: String,
    evidence: Option<crate::activity::ResultEvidence>,
}
impl AcquiredActivityResult {
    pub fn actor_id(&self) -> &str {
        &self.actor_id
    }
    pub fn occurrence_id(&self) -> &str {
        &self.occurrence_id
    }
    pub fn evidence(&self) -> Option<&crate::activity::ResultEvidence> {
        self.evidence.as_ref()
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PersonalSourceKind {
    Awareness,
    Memory,
    Summary,
}

impl PersonalSourceKind {
    pub fn table(self) -> &'static str {
        match self {
            Self::Awareness => "mind_awareness",
            Self::Memory => "mind_memories",
            Self::Summary => "mind_summaries",
        }
    }

    fn identity_field(self) -> &'static str {
        match self {
            Self::Awareness => "eventId",
            Self::Memory | Self::Summary => "id",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PersonalSourceRef {
    pub kind: PersonalSourceKind,
    pub id: String,
    pub revision: String,
}

impl PersonalSourceRef {
    pub fn validate(&self) -> bool {
        !self.id.is_empty()
            && self.revision.len() == 64
            && self
                .revision
                .bytes()
                .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AccountClass {
    Optional,
    Required,
    Speech,
    Sensory,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RetentionReason {
    Consequence,
    Learning,
    Deliberate,
    Interpretation,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AccountAfterRelease {
    Discard,
    Impression,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ExperienceRetention {
    pub reason: RetentionReason,
    pub after_release: AccountAfterRelease,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub required: Option<bool>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub receipt: Option<TemporalReceiptLocator>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ExperienceError {
    InvalidBody(&'static str),
    ForeignOwner,
    DuplicateIdentity,
    InvalidOrdinal,
    UnknownCoverage,
    StaleHydration,
    Unavailable,
    Revoked,
    Expired,
}

impl fmt::Display for ExperienceError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{self:?}")
    }
}
impl std::error::Error for ExperienceError {}

fn object(value: &Value) -> Result<&Map<String, Value>, ExperienceError> {
    value
        .as_object()
        .ok_or(ExperienceError::InvalidBody("Expected source object"))
}
fn text<'a>(body: &'a Map<String, Value>, key: &'static str) -> Result<&'a str, ExperienceError> {
    body.get(key)
        .and_then(Value::as_str)
        .ok_or(ExperienceError::InvalidBody(key))
}
fn number(body: &Map<String, Value>, key: &'static str) -> Result<f64, ExperienceError> {
    body.get(key)
        .and_then(Value::as_f64)
        .filter(|value| value.is_finite())
        .ok_or(ExperienceError::InvalidBody(key))
}
fn integer(body: &Map<String, Value>, key: &'static str) -> Result<u64, ExperienceError> {
    let value = number(body, key)?;
    if value < 0.0 || value > MAX_SAFE_INTEGER as f64 || value.fract() != 0.0 {
        return Err(ExperienceError::InvalidBody(key));
    }
    Ok(value as u64)
}
fn optional_text(
    body: &Map<String, Value>,
    key: &'static str,
) -> Result<Option<String>, ExperienceError> {
    body.get(key)
        .map(|_| text(body, key).map(str::to_owned))
        .transpose()
}
fn optional_number(
    body: &Map<String, Value>,
    key: &'static str,
) -> Result<Option<f64>, ExperienceError> {
    body.get(key).map(|_| number(body, key)).transpose()
}
fn strings(value: &Value, key: &'static str) -> Result<Vec<String>, ExperienceError> {
    value
        .as_array()
        .ok_or(ExperienceError::InvalidBody(key))?
        .iter()
        .map(|value| {
            value
                .as_str()
                .map(str::to_owned)
                .ok_or(ExperienceError::InvalidBody(key))
        })
        .collect()
}

/// This projection contains only fields actually consumed by native selection
/// and retention. Rich observation/speech/manifest content remains unchanged in
/// its immutable body, and is disclosed only with that source's current scope.
#[derive(Clone, Debug)]
pub struct PersonalSourceHeader {
    pub reference: PersonalSourceRef,
    pub actor_id: String,
    pub at: f64,
    pub sequence: Option<u64>,
    pub event_id: Option<String>,
    pub activity_id: Option<String>,
    pub source_receipt: Option<TemporalReceiptLocator>,
    pub record_kind: Option<String>,
    pub source: Option<String>,
    pub class: AccountClass,
    pub protected: bool,
    pub expires_at: Option<f64>,
    pub retention: Option<ExperienceRetention>,
    /// Owned originals are aliases only after this actual account is revoked.
    pub owned_observations: Vec<String>,
    /// Only the source's real dependency closure can revoke its descendants.
    pub dependencies: Vec<String>,
}

fn own_observations(body: &Map<String, Value>) -> Result<Vec<String>, ExperienceError> {
    let mut ids = IndexSet::new();
    for observation in body.get("observation").into_iter().chain(
        body.get("observations")
            .map(|value| {
                value
                    .as_array()
                    .ok_or(ExperienceError::InvalidBody("observations"))
            })
            .transpose()?
            .into_iter()
            .flatten(),
    ) {
        let observation = object(observation)?;
        ids.insert(text(observation, "id")?.to_owned());
    }
    if let Some(manifest) = body.get("manifest") {
        for observation in object(manifest)?
            .get("observations")
            .and_then(Value::as_array)
            .ok_or(ExperienceError::InvalidBody("manifest.observations"))?
        {
            ids.insert(text(object(observation)?, "id")?.to_owned());
        }
    }
    Ok(ids.into_iter().collect())
}

fn source_references(value: &Value) -> Result<Vec<PersonalSourceRef>, ExperienceError> {
    let values = value
        .as_array()
        .ok_or(ExperienceError::InvalidBody("source references"))?;
    values
        .iter()
        .map(|value| {
            let reference: PersonalSourceRef = serde_json::from_value(value.clone())
                .map_err(|_| ExperienceError::InvalidBody("source reference"))?;
            if !reference.validate() {
                return Err(ExperienceError::InvalidBody("source reference"));
            }
            Ok(reference)
        })
        .collect()
}

/// Selected-world recognition keeps its own supported source-key grammar. This
/// pure native compiler runs once for a changed source, never as a TS callback.
pub trait PersonalEvidenceMeaning {
    fn recognition_source_ids(&self, keys: &[String]) -> Vec<String>;
}

fn dependency_source(value: &Value, ids: &mut IndexSet<String>) -> Result<(), ExperienceError> {
    let source: EvidenceSource = serde_json::from_value(value.clone())
        .map_err(|_| ExperienceError::InvalidBody("evidence source"))?;
    source
        .validate()
        .map_err(|_| ExperienceError::InvalidBody("evidence source"))?;
    ids.insert(source.id);
    Ok(())
}

fn dependency_fact(
    value: &Value,
    ids: &mut IndexSet<String>,
    add_alias: bool,
) -> Result<(), ExperienceError> {
    let fact = object(value)?;
    let source = fact
        .get("source")
        .ok_or(ExperienceError::InvalidBody("fact source"))?;
    let ordinal = integer(fact, "ordinal")?;
    dependency_source(source, ids)?;
    if add_alias {
        ids.insert(personal_fact_alias(text(object(source)?, "id")?, ordinal)?);
    }
    Ok(())
}

fn observation_dependencies(
    value: &Value,
    ids: &mut IndexSet<String>,
    meaning: &impl PersonalEvidenceMeaning,
) -> Result<(), ExperienceError> {
    let observation = object(value)?;
    ids.insert(text(observation, "id")?.to_owned());
    let origin = object(
        observation
            .get("origin")
            .ok_or(ExperienceError::InvalidBody("observation.origin"))?,
    )?;
    if text(origin, "kind")? == "occurrence" {
        ids.insert(text(origin, "eventId")?.to_owned());
    }
    for facet in observation
        .get("facets")
        .and_then(Value::as_array)
        .ok_or(ExperienceError::InvalidBody("observation.facets"))?
    {
        let facet = object(facet)?;
        if let Some(support) = facet.get("support") {
            let support = object(support)?;
            dependency_fact(
                support
                    .get("original")
                    .ok_or(ExperienceError::InvalidBody("proof.original"))?,
                ids,
                false,
            )?;
            dependency_source(
                support
                    .get("confirmation")
                    .ok_or(ExperienceError::InvalidBody("proof.confirmation"))?,
                ids,
            )?;
            if let Some(aliases) = support.get("aliases") {
                for alias in strings(aliases, "proof.aliases")? {
                    ids.insert(alias);
                }
            }
        }
        let value = object(
            facet
                .get("value")
                .ok_or(ExperienceError::InvalidBody("facet.value"))?,
        )?;
        match text(value, "kind")? {
            "association" => {
                if let Some(keys) = value.get("learningSupport") {
                    for source in meaning.recognition_source_ids(&strings(keys, "learningSupport")?)
                    {
                        ids.insert(source);
                    }
                }
            }
            "claim" => {
                for support in value
                    .get("support")
                    .and_then(Value::as_array)
                    .ok_or(ExperienceError::InvalidBody("claim.support"))?
                {
                    dependency_fact(support, ids, false)?;
                }
                for alias in value
                    .get("supportAliases")
                    .map(|value| {
                        value
                            .as_array()
                            .ok_or(ExperienceError::InvalidBody("claim.supportAliases"))
                    })
                    .transpose()?
                    .into_iter()
                    .flatten()
                {
                    ids.insert(text(object(alias)?, "id")?.to_owned());
                }
            }
            "physical-boundary" => {
                let boundary = object(
                    value
                        .get("boundary")
                        .ok_or(ExperienceError::InvalidBody("boundary"))?,
                )?;
                for side in ["nearSurface", "farSurface"] {
                    let side = object(
                        boundary
                            .get(side)
                            .ok_or(ExperienceError::InvalidBody("boundary side"))?,
                    )?;
                    dependency_fact(
                        side.get("support")
                            .ok_or(ExperienceError::InvalidBody("boundary support"))?,
                        ids,
                        true,
                    )?;
                }
            }
            "observed-motion" => {
                for sample in ["earlier", "later"] {
                    let sample = object(
                        value
                            .get(sample)
                            .ok_or(ExperienceError::InvalidBody("motion sample"))?,
                    )?;
                    dependency_fact(
                        sample
                            .get("original")
                            .ok_or(ExperienceError::InvalidBody("motion original"))?,
                        ids,
                        false,
                    )?;
                    dependency_source(
                        sample
                            .get("confirmation")
                            .ok_or(ExperienceError::InvalidBody("motion confirmation"))?,
                        ids,
                    )?;
                    if let Some(aliases) = sample.get("aliases") {
                        for alias in strings(aliases, "motion aliases")? {
                            ids.insert(alias);
                        }
                    }
                }
            }
            _ => {}
        }
    }
    Ok(())
}

fn source_dependencies(
    body: &Map<String, Value>,
    kind: PersonalSourceKind,
    meaning: &impl PersonalEvidenceMeaning,
) -> Result<Vec<String>, ExperienceError> {
    let mut ids = IndexSet::new();
    for key in ["eventId", "activityId"] {
        if let Some(id) = optional_text(body, key)? {
            ids.insert(id);
        }
    }
    if let Some(locator) = body.get("sourceReceipt") {
        let locator: TemporalReceiptLocator = serde_json::from_value(locator.clone())
            .map_err(|_| ExperienceError::InvalidBody("sourceReceipt"))?;
        ids.insert(locator.id());
    }
    if let Some(observation) = body.get("observation") {
        ids.insert(text(object(observation)?, "id")?.to_owned());
    }
    if kind == PersonalSourceKind::Summary {
        for source in source_references(
            body.get("sources")
                .ok_or(ExperienceError::InvalidBody("sources"))?,
        )? {
            ids.insert(source.id);
        }
    }
    if let Some(manifest) = body.get("manifest") {
        let manifest = object(manifest)?;
        for source in source_references(
            manifest
                .get("coverage")
                .ok_or(ExperienceError::InvalidBody("manifest.coverage"))?,
        )? {
            ids.insert(source.id);
        }
        for receipt in manifest
            .get("receipts")
            .map(|value| {
                value
                    .as_array()
                    .ok_or(ExperienceError::InvalidBody("manifest.receipts"))
            })
            .transpose()?
            .into_iter()
            .flatten()
        {
            let locator: TemporalReceiptLocator = serde_json::from_value(receipt.clone())
                .map_err(|_| ExperienceError::InvalidBody("manifest.receipt"))?;
            ids.insert(locator.id());
        }
        for observation in manifest
            .get("observations")
            .and_then(Value::as_array)
            .ok_or(ExperienceError::InvalidBody("manifest.observations"))?
        {
            observation_dependencies(observation, &mut ids, meaning)?;
        }
    }
    if let Some(impression) = body.get("impression") {
        for dependency in object(impression)?
            .get("dependencies")
            .and_then(Value::as_array)
            .ok_or(ExperienceError::InvalidBody("impression.dependencies"))?
        {
            let dependency = object(dependency)?;
            if let Some(source) = dependency.get("source") {
                ids.insert(text(object(source)?, "id")?.to_owned());
                for alias in strings(
                    dependency
                        .get("aliases")
                        .ok_or(ExperienceError::InvalidBody("impression.aliases"))?,
                    "impression.aliases",
                )? {
                    ids.insert(alias);
                }
            } else {
                ids.insert(text(dependency, "id")?.to_owned());
            }
        }
    }
    Ok(ids.into_iter().collect())
}

fn header(
    body: &Map<String, Value>,
    kind: PersonalSourceKind,
    actor_id: &str,
    encoded: &str,
    meaning: &impl PersonalEvidenceMeaning,
) -> Result<PersonalSourceHeader, ExperienceError> {
    let id = text(body, kind.identity_field())?;
    if id.is_empty() {
        return Err(ExperienceError::InvalidBody("source identity"));
    }
    if kind != PersonalSourceKind::Summary && text(body, "actorId")? != actor_id {
        return Err(ExperienceError::ForeignOwner);
    }
    let at = number(
        body,
        if kind == PersonalSourceKind::Summary {
            "to"
        } else {
            "at"
        },
    )?;
    let sequence = body
        .get("sequence")
        .map(|_| integer(body, "sequence"))
        .transpose()?;
    let retention: Option<ExperienceRetention> = body
        .get("retention")
        .map(|value| {
            serde_json::from_value(value.clone())
                .map_err(|_| ExperienceError::InvalidBody("retention"))
        })
        .transpose()?;
    let source_receipt: Option<TemporalReceiptLocator> = body
        .get("sourceReceipt")
        .map(|value| {
            serde_json::from_value(value.clone())
                .map_err(|_| ExperienceError::InvalidBody("sourceReceipt"))
        })
        .transpose()?;
    if source_receipt
        .as_ref()
        .is_some_and(|receipt| receipt.actor_id != actor_id)
        || retention
            .as_ref()
            .and_then(|retention| retention.receipt.as_ref())
            .is_some_and(|receipt| receipt.actor_id != actor_id)
    {
        return Err(ExperienceError::ForeignOwner);
    }
    let record_kind = if kind == PersonalSourceKind::Memory {
        let value = text(body, "kind")?;
        if !matches!(
            value,
            "episode" | "belief" | "commitment" | "reflection" | "impression"
        ) {
            return Err(ExperienceError::InvalidBody("memory kind"));
        }
        Some(value.to_owned())
    } else {
        None
    };
    let source = if kind == PersonalSourceKind::Memory {
        let value = text(body, "source")?;
        if !matches!(
            value,
            "observed" | "heard" | "felt" | "internal" | "inferred" | "self_thought"
        ) {
            return Err(ExperienceError::InvalidBody("memory source"));
        }
        Some(value.to_owned())
    } else {
        None
    };
    let evidence = if kind == PersonalSourceKind::Memory {
        body.get("evidence").map(object).transpose()?
    } else {
        Some(body)
    };
    let speech = evidence
        .and_then(|body| body.get("speech"))
        .map(object)
        .transpose()?;
    let heard_speech = if let Some(speech) = speech {
        text(speech, "perception")? != "seen"
            && speech
                .get("segments")
                .and_then(Value::as_array)
                .ok_or(ExperienceError::InvalidBody("speech.segments"))?
                .iter()
                .any(|segment| segment.get("kind").and_then(Value::as_str) == Some("heard"))
    } else {
        false
    };
    let protected = if kind == PersonalSourceKind::Memory {
        let unresolved = body
            .get("resolved")
            .map(|value| {
                value
                    .as_bool()
                    .ok_or(ExperienceError::InvalidBody("resolved"))
            })
            .transpose()?
            .is_none_or(|value| !value);
        let obligation = body.get("obligation").map(object).transpose()?;
        record_kind.as_deref() == Some("commitment") && unresolved
            || obligation.is_some_and(|obligation| {
                obligation.get("status").and_then(Value::as_str) == Some("active")
            })
    } else {
        false
    };
    let sensory = if kind == PersonalSourceKind::Awareness {
        match text(body, "retentionClass")? {
            "sensory" => true,
            "memory" => false,
            _ => return Err(ExperienceError::InvalidBody("awareness retention class")),
        }
    } else {
        false
    };
    let class = if sensory {
        AccountClass::Sensory
    } else if heard_speech {
        AccountClass::Speech
    } else if protected
        || retention
            .as_ref()
            .and_then(|retention| retention.required)
            .unwrap_or(false)
    {
        AccountClass::Required
    } else {
        AccountClass::Optional
    };
    Ok(PersonalSourceHeader {
        reference: PersonalSourceRef {
            kind,
            id: id.to_owned(),
            revision: sha256_hex(encoded.as_bytes()),
        },
        actor_id: actor_id.to_owned(),
        at,
        sequence,
        event_id: optional_text(body, "eventId")?,
        activity_id: optional_text(body, "activityId")?,
        source_receipt,
        record_kind,
        source,
        class,
        protected,
        expires_at: optional_number(body, "expiresAt")?,
        retention,
        owned_observations: own_observations(body)?,
        dependencies: source_dependencies(body, kind, meaning)?,
    })
}

#[derive(Debug)]
pub struct PersonalSourceRecord {
    row_id: String,
    parent: String,
    slot: String,
    position: u64,
    payload: Arc<str>,
    columns: Arc<[Value]>,
    header: PersonalSourceHeader,
}

impl PersonalSourceRecord {
    pub fn install(
        kind: PersonalSourceKind,
        actor_id: &str,
        row: InstalledRow,
        meaning: &impl PersonalEvidenceMeaning,
    ) -> Result<Self, ExperienceError> {
        let body: Value = serde_json::from_str(&row.payload)
            .map_err(|_| ExperienceError::InvalidBody("source JSON"))?;
        let header = header(object(&body)?, kind, actor_id, &row.payload, meaning)?;
        let expected_parent = collection_owner(kind, actor_id)?;
        let mut expected_path: Vec<String> =
            serde_json::from_str(&expected_parent).map_err(|_| ExperienceError::ForeignOwner)?;
        expected_path.push(header.reference.id.clone());
        if row.parent != expected_parent
            || row.id != json_record(&expected_path).map_err(|_| ExperienceError::ForeignOwner)?
        {
            return Err(ExperienceError::ForeignOwner);
        }
        if row.position > MAX_SAFE_INTEGER {
            return Err(ExperienceError::InvalidOrdinal);
        }
        Ok(Self {
            row_id: row.id,
            parent: row.parent,
            slot: row.slot,
            position: row.position,
            payload: Arc::from(row.payload),
            columns: Arc::from(row.extra),
            header,
        })
    }

    pub fn header(&self) -> &PersonalSourceHeader {
        &self.header
    }
    pub fn payload(&self) -> &str {
        &self.payload
    }
    pub fn position(&self) -> u64 {
        self.position
    }
    pub fn row_id(&self) -> &str {
        &self.row_id
    }
    pub fn parent(&self) -> &str {
        &self.parent
    }
    pub fn slot(&self) -> &str {
        &self.slot
    }
    pub fn columns(&self) -> &[Value] {
        &self.columns
    }
}

fn collection_owner(kind: PersonalSourceKind, actor_id: &str) -> Result<String, ExperienceError> {
    let path = match kind {
        PersonalSourceKind::Memory => vec!["world", "memories", actor_id],
        PersonalSourceKind::Awareness => vec!["world", "experience", "awareness", actor_id],
        PersonalSourceKind::Summary => vec!["world", "experience", "summaries", actor_id],
    };
    json_record(&path).map_err(|_| ExperienceError::ForeignOwner)
}

#[derive(Clone, Debug)]
pub struct SourceCoverage {
    pub complete: bool,
    pub next_ordinal: u64,
    pub parent_present: bool,
}

#[derive(Debug)]
pub struct PersonalSourceCollection {
    kind: PersonalSourceKind,
    actor_id: String,
    by_ordinal: BTreeMap<u64, Arc<PersonalSourceRecord>>,
    lookup: BTreeMap<String, u64>,
    coverage: SourceCoverage,
}

impl PersonalSourceCollection {
    pub fn install(
        kind: PersonalSourceKind,
        actor_id: String,
        rows: Vec<InstalledRow>,
        coverage: OwnerCoverage,
        meaning: &impl PersonalEvidenceMeaning,
    ) -> Result<Self, ExperienceError> {
        if coverage.table != kind.table()
            || coverage.owner != collection_owner(kind, &actor_id)?
            || !is_safe_record_id(&actor_id)
            || coverage.next_ordinal > MAX_SAFE_INTEGER
        {
            return Err(ExperienceError::UnknownCoverage);
        }
        let mut installed = Self {
            kind,
            actor_id,
            by_ordinal: BTreeMap::new(),
            lookup: BTreeMap::new(),
            coverage: SourceCoverage {
                complete: coverage.complete,
                next_ordinal: coverage.next_ordinal,
                parent_present: coverage.parent_present,
            },
        };
        for row in rows {
            let record = PersonalSourceRecord::install(kind, &installed.actor_id, row, meaning)?;
            if !installed.coverage.parent_present
                || record.position >= installed.coverage.next_ordinal
                || installed.lookup.contains_key(&record.header.reference.id)
                || installed.by_ordinal.contains_key(&record.position)
            {
                return Err(ExperienceError::InvalidOrdinal);
            }
            installed
                .lookup
                .insert(record.header.reference.id.clone(), record.position);
            installed
                .by_ordinal
                .insert(record.position, Arc::new(record));
        }
        Ok(installed)
    }

    pub fn kind(&self) -> PersonalSourceKind {
        self.kind
    }
    pub fn actor_id(&self) -> &str {
        &self.actor_id
    }
    pub fn coverage(&self) -> &SourceCoverage {
        &self.coverage
    }
    pub fn records(&self) -> impl Iterator<Item = &Arc<PersonalSourceRecord>> {
        self.by_ordinal.values()
    }
    pub fn get(&self, id: &str) -> Result<Option<&Arc<PersonalSourceRecord>>, ExperienceError> {
        if let Some(position) = self.lookup.get(id) {
            return Ok(self.by_ordinal.get(position));
        }
        if self.coverage.complete {
            Ok(None)
        } else {
            Err(ExperienceError::Unavailable)
        }
    }
}

#[derive(Clone, Debug, Default)]
pub struct ActorPrivacy {
    forgotten: Vec<String>,
    forgotten_index: BTreeSet<String>,
    corrections: IndexMap<String, String>,
    revision: Option<u64>,
}

impl ActorPrivacy {
    pub fn install(
        forgotten: Vec<String>,
        corrections: IndexMap<String, String>,
        revision: Option<u64>,
    ) -> Result<Self, ExperienceError> {
        if revision.is_some_and(|revision| revision > MAX_SAFE_INTEGER)
            || forgotten.iter().any(String::is_empty)
            || corrections
                .iter()
                .any(|(id, correcting)| id.is_empty() || correcting.is_empty())
        {
            return Err(ExperienceError::InvalidBody("privacy"));
        }
        let forgotten_index = forgotten.iter().cloned().collect();
        Ok(Self {
            forgotten,
            forgotten_index,
            corrections,
            revision,
        })
    }
    pub fn revision(&self) -> u64 {
        self.revision.unwrap_or(0)
    }
    pub fn revoked(&self, id: &str) -> bool {
        self.forgotten_index.contains(id) || self.corrections.contains_key(id)
    }
    pub fn forgotten(&self) -> impl Iterator<Item = &String> {
        self.forgotten.iter()
    }
    pub fn corrections(&self) -> &IndexMap<String, String> {
        &self.corrections
    }
}

#[derive(Debug)]
pub struct PersonalHistory {
    sources: IndexMap<PersonalSourceKind, PersonalSourceCollection>,
    pub privacy: ActorPrivacy,
    pub consolidated_at: Option<f64>,
}

impl PersonalHistory {
    pub fn install(
        collections: Vec<PersonalSourceCollection>,
        privacy: ActorPrivacy,
        consolidated_at: Option<f64>,
    ) -> Result<Self, ExperienceError> {
        let mut sources = IndexMap::new();
        for collection in collections {
            let kind = collection.kind;
            if sources.insert(kind, collection).is_some() {
                return Err(ExperienceError::DuplicateIdentity);
            }
        }
        Ok(Self {
            sources,
            privacy,
            consolidated_at,
        })
    }
    pub fn collection(
        &self,
        kind: PersonalSourceKind,
    ) -> Result<&PersonalSourceCollection, ExperienceError> {
        self.sources
            .get(&kind)
            .ok_or(ExperienceError::UnknownCoverage)
    }
}

/// One actor's request-owned selected sources and original ordinals. Missing
/// residency is explicit; a cold query never masquerades as an empty result.
#[derive(Debug)]
pub struct CapturedPersonalSources {
    pub generation: String,
    pub actor_id: String,
    pub privacy_revision: u64,
    pub records: Vec<Arc<PersonalSourceRecord>>,
}

/// The current record codec stores child-owner presence here; actual actor rows
/// arrive separately. Nonempty inline children would be a different input format.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct EmptyChildOwner {}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ExperienceHeader {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub perspective_version: Option<u64>,
    pub awareness: EmptyChildOwner,
    pub summaries: EmptyChildOwner,
    pub consolidated_at: EmptyChildOwner,
    pub forgotten: EmptyChildOwner,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub privacy_revisions: Option<EmptyChildOwner>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub corrections: Option<EmptyChildOwner>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub temporal: Option<EmptyChildOwner>,
}

#[derive(Debug)]
pub struct ExperienceState {
    generation: String,
    header: ExperienceHeader,
    actors: IndexMap<String, PersonalHistory>,
}

impl ExperienceState {
    pub fn install(
        generation: String,
        header: ExperienceHeader,
        actors: IndexMap<String, PersonalHistory>,
    ) -> Result<Self, ExperienceError> {
        if header.version != 1
            || header
                .perspective_version
                .is_some_and(|version| version != 1)
        {
            return Err(ExperienceError::InvalidBody("experience version"));
        }
        if generation.is_empty() || actors.keys().any(|actor| !is_safe_record_id(actor)) {
            return Err(ExperienceError::ForeignOwner);
        }
        for (actor_id, history) in &actors {
            if history
                .sources
                .values()
                .any(|collection| &collection.actor_id != actor_id)
            {
                return Err(ExperienceError::ForeignOwner);
            }
        }
        Ok(Self {
            generation,
            header,
            actors,
        })
    }

    pub fn header(&self) -> &ExperienceHeader {
        &self.header
    }

    pub fn generation(&self) -> &str {
        &self.generation
    }

    pub fn actor(&self, actor_id: &str) -> Option<&PersonalHistory> {
        self.actors.get(actor_id)
    }

    pub fn capture(
        &self,
        actor_id: &str,
        selected: &[(PersonalSourceKind, String)],
    ) -> Result<CapturedPersonalSources, ExperienceError> {
        let actor = self
            .actors
            .get(actor_id)
            .ok_or(ExperienceError::ForeignOwner)?;
        let mut records = Vec::with_capacity(selected.len());
        let mut seen = BTreeSet::new();
        for (kind, id) in selected {
            if !seen.insert((*kind, id.as_str())) {
                continue;
            }
            if actor.privacy.revoked(id) {
                return Err(ExperienceError::Revoked);
            }
            let record = actor
                .collection(*kind)?
                .get(id)?
                .ok_or(ExperienceError::Unavailable)?;
            if record
                .header
                .event_id
                .as_ref()
                .is_some_and(|id| actor.privacy.revoked(id))
            {
                return Err(ExperienceError::Revoked);
            }
            if (*kind == PersonalSourceKind::Summary
                || record.header.record_kind.as_deref() == Some("impression"))
                && record
                    .header
                    .dependencies
                    .iter()
                    .any(|id| actor.privacy.revoked(id))
            {
                return Err(ExperienceError::Revoked);
            }
            records.push(Arc::clone(record));
        }
        Ok(CapturedPersonalSources {
            generation: self.generation.clone(),
            actor_id: actor_id.to_owned(),
            privacy_revision: actor.privacy.revision(),
            records,
        })
    }

    pub fn capture_current(&self, captured: &CapturedPersonalSources) -> bool {
        if self.generation != captured.generation {
            return false;
        }
        let Some(actor) = self.actors.get(&captured.actor_id) else {
            return false;
        };
        if actor.privacy.revision() != captured.privacy_revision {
            return false;
        }
        // Ordinary expiry/residency release does not revoke a previously captured
        // source. Explicit edits advance privacy/source fences before removal;
        // a still-resident replacement must also retain this exact body revision.
        captured.records.iter().all(|record| {
            actor
                .collection(record.header.reference.kind)
                .is_ok_and(|collection| {
                    collection
                        .lookup
                        .get(&record.header.reference.id)
                        .and_then(|position| collection.by_ordinal.get(position))
                        .is_none_or(|current| {
                            current.header.reference.revision == record.header.reference.revision
                        })
                })
        })
    }
}

pub fn personal_fact_alias(source_id: &str, ordinal: u64) -> Result<String, ExperienceError> {
    if source_id.is_empty() || ordinal > MAX_SAFE_INTEGER {
        return Err(ExperienceError::InvalidBody("fact alias"));
    }
    json_record(&("perception-fact", source_id, ordinal))
        .map_err(|_| ExperienceError::InvalidBody("fact alias encoding"))
}
