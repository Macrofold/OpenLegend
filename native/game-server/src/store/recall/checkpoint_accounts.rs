//! Place exact memory and summary dependencies from canonical account rows.
//! Recovery and consolidation share the installed recognition law.

use super::recovery::Records;
use super::*;
use openlegend_simulation::experience::{AwarenessRetentionClass, PersonalSourceRef};
use openlegend_simulation::reception::{ObservationContribution, SourceRevision};
use openlegend_simulation::runtime::RuntimeRecallDecoder;
use openlegend_simulation::text::JsText;
use serde::Deserialize;
use serde_json::value::RawValue;

#[derive(Default, Deserialize)]
struct OriginalObservations {
    observation: Option<ObservationContribution>,
    #[serde(default)]
    observations: Vec<ObservationContribution>,
    recognition: Option<Recognition>,
}

impl OriginalObservations {
    fn originals(&self) -> impl Iterator<Item = &ObservationContribution> {
        self.observation.iter().chain(&self.observations)
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Recognition {
    #[serde(default)]
    learning_support: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Manifest {
    coverage_key: String,
    coverage: Vec<PersonalSourceRef>,
    observations: Box<RawValue>,
    speech: Vec<SpeechGroup>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SpeechGroup {
    support_key: String,
    sources: Vec<PersonalSourceRef>,
}

#[derive(Deserialize)]
#[serde(untagged)]
enum Support {
    Personal(PersonalSourceRef),
    Native {
        source: EvidenceSource,
        ordinal: Option<u64>,
        #[serde(default)]
        aliases: Vec<String>,
    },
}

#[derive(Deserialize)]
struct Impression {
    dependencies: Vec<Support>,
    provenance: Vec<Span>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Span {
    physical_life: u64,
    epoch: String,
    from: Position,
    through: Position,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Position {
    batch_order: u64,
    entry_index: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Body {
    id: String,
    actor_id: Option<String>,
    at: Option<f64>,
    to: Option<f64>,
    event_id: Option<String>,
    kind: Option<String>,
    source: Option<String>,
    event_type: Option<String>,
    importance: f64,
    sequence: Option<u64>,
    resolved: Option<bool>,
    summary: Option<JsText>,
    text: Option<JsText>,
    literal_references: Option<openlegend_simulation::experience::LiteralReferences>,
    #[serde(default)]
    entity_ids: Vec<String>,
    #[serde(default)]
    sources: Vec<PersonalSourceRef>,
    manifest: Option<Manifest>,
    impression: Option<Impression>,
    obligation: Option<Box<RawValue>>,
    evidence: Option<OriginalObservations>,
    #[serde(flatten)]
    observations: OriginalObservations,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Obligation {
    evidence_id: String,
    status: ObligationStatus,
    revision: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
enum ObligationStatus {
    Active,
    Overdue,
    Fulfilled,
    Cancelled,
}

pub(super) struct Placement {
    actor: String,
    id: String,
    source: String,
    exact: Vec<String>,
    learning: Vec<(PersonalSourceKind, String)>,
    places: Vec<String>,
    spans: Vec<String>,
}

impl Placement {
    pub(super) fn sql_output_bytes(&self) -> Option<usize> {
        [&self.exact, &self.places, &self.spans]
            .into_iter()
            .flatten()
            .try_fold(self.source.len().checked_add(4)?, |n, value| {
                n.checked_add(value.len())?.checked_add(1)
            })
    }

    pub(super) fn retained_bytes(&self) -> Option<usize> {
        let bytes = self
            .actor
            .capacity()
            .checked_add(self.id.capacity())?
            .checked_add(self.source.capacity())?
            .checked_add(
                self.learning
                    .capacity()
                    .checked_mul(std::mem::size_of::<(PersonalSourceKind, String)>())?,
            )?;
        [&self.exact, &self.places, &self.spans]
            .into_iter()
            .try_fold(bytes, |n, values| {
                values.iter().try_fold(
                    n.checked_add(
                        values
                            .capacity()
                            .checked_mul(std::mem::size_of::<String>())?,
                    )?,
                    |n, value| n.checked_add(value.capacity()),
                )
            })?
            .checked_add(
                self.learning
                    .iter()
                    .try_fold(0usize, |n, (_, source)| n.checked_add(source.capacity()))?,
            )
    }
}

pub(super) struct AccountImage<'a> {
    pub record: &'a str,
    pub id: &'a str,
    pub actor: &'a str,
    pub revision: &'a str,
    pub payload: &'a str,
}

struct PlacementBuilder<'a> {
    world: &'a str,
    actor: &'a str,
    kind: &'static str,
    id: &'a str,
    exact: Vec<String>,
    learning: Vec<(PersonalSourceKind, String)>,
}

impl PlacementBuilder<'_> {
    fn personal(&mut self, source: &PersonalSourceRef, key: &str) -> StoreResult<()> {
        self.edge(
            source_kind(source.kind),
            &source.id,
            &source.revision,
            key,
            -1,
            -1,
            "",
        )
    }

    fn native(
        &mut self,
        source: &EvidenceSource,
        key: &str,
        ordinal: Option<u64>,
        aliases: &[String],
    ) -> StoreResult<()> {
        if source.observer.actor_id != self.actor {
            return Err(StoreError::InvalidRecord);
        }
        let family = json_record(&source.family).map_err(|_| StoreError::InvalidRecord)?;
        let revision = json_record(&source.revision).map_err(|_| StoreError::InvalidRecord)?;
        let ordinal = ordinal.map(sql_ordinal).transpose()?.unwrap_or(-1);
        if aliases.is_empty() {
            self.edge(
                family.trim_matches('"'),
                &source.id,
                &revision,
                key,
                sql_ordinal(source.observer.physical_life)?,
                ordinal,
                "",
            )?;
        }
        for alias in aliases {
            self.edge(
                family.trim_matches('"'),
                &source.id,
                &revision,
                key,
                sql_ordinal(source.observer.physical_life)?,
                ordinal,
                alias,
            )?;
        }
        Ok(())
    }

    fn edge(
        &mut self,
        family: &str,
        id: &str,
        revision: &str,
        label: &str,
        life: i64,
        ordinal: i64,
        alias: &str,
    ) -> StoreResult<()> {
        let key = json_record(label).map_err(|_| StoreError::InvalidRecord)?;
        let key = sha256_hex(key.as_bytes());
        self.exact.push(
            json_record(&DependencyRow {
                world_id: self.world,
                actor_id: self.actor,
                derived_kind: self.kind,
                derived_id: self.id,
                source_kind: family,
                source_id: id,
                source_revision: revision,
                support_key: &key,
                source_life: life,
                facet_ordinal: ordinal,
                alias_id: alias,
            })
            .map_err(|_| StoreError::InvalidRecord)?,
        );
        Ok(())
    }
}

impl Store {
    /// Recreate selected current-format memory or summary indexes. Derived
    /// evidence follows the canonical owners and the installed recognition law.
    pub(crate) async fn rebuild_checkpoint_retained_accounts(
        &self,
        tx: &Transaction<'_>,
        world: &str,
        kind: PersonalSourceKind,
        decoder: &RuntimeRecallDecoder<'_>,
    ) -> StoreResult<()> {
        if kind == PersonalSourceKind::Awareness {
            return Err(StoreError::InvalidRecord);
        }
        let hard = sql_ordinal(decoder.hard_bytes)?;
        let mut read = Records::new(self, world, kind)?;
        loop {
            let (_wire, rows) = read.next(self, tx).await?;
            if rows.is_empty() {
                break;
            }
            let mut placements = Vec::with_capacity(rows.len());
            for row in &rows {
                placements.push(compile_placement(
                    world,
                    kind,
                    AccountImage {
                        record: row.try_get(0)?,
                        id: row.try_get(3)?,
                        actor: row.try_get(4)?,
                        revision: row.try_get(5)?,
                        payload: row.try_get(6)?,
                    },
                    decoder,
                )?);
            }
            self.insert_retained_accounts(tx, world, source_kind(kind), hard, placements.iter())
                .await?;
        }
        Ok(())
    }

    pub(super) async fn insert_retained_accounts<'a>(
        &self,
        tx: &Transaction<'_>,
        world: &str,
        kind: &str,
        hard: i64,
        rows: impl Iterator<Item = &'a Placement> + Clone,
    ) -> StoreResult<()> {
        // The compiled placement and the PostgreSQL parameter live together.
        // Keep a separate charge for the joined arrays and their wire copies.
        let wire = rows
            .clone()
            .try_fold(1024usize, |n, row| n.checked_add(row.sql_output_bytes()?))
            .and_then(|n| n.checked_mul(3))
            .ok_or(StoreError::Capacity)?;
        let _wire = self
            .budget
            .reserve(wire)
            .map_err(|_| StoreError::Capacity)?;
        let fields = array(rows.clone().map(|row| row.source.as_str()));
        tx.query_opt(&self.schema.recall.insert, &[&fields, &hard])
            .await?;
        drop(fields);
        for (table, dependent) in [
            (
                "mind_source_dependencies",
                array(
                    rows.clone()
                        .flat_map(|row| row.exact.iter().map(String::as_str)),
                ),
            ),
            (
                "recall_place_capsules",
                array(
                    rows.clone()
                        .flat_map(|row| row.places.iter().map(String::as_str)),
                ),
            ),
            (
                "mind_impression_spans",
                array(
                    rows.clone()
                        .flat_map(|row| row.spans.iter().map(String::as_str)),
                ),
            ),
        ] {
            if dependent != "[]" {
                tx.execute(&format!(
                    "INSERT INTO {table} SELECT * FROM jsonb_populate_recordset(NULL::{table},$1::text::jsonb) ON CONFLICT DO NOTHING"
                ), &[&dependent]).await?;
            }
        }
        let learning = rows
            .clone()
            .flat_map(|row| {
                row.learning.iter().map(move |(kind, source)| {
                    (*kind, row.actor.as_str(), row.id.as_str(), source.as_str())
                })
            })
            .collect::<Vec<_>>();
        Self::write_learning_dependencies(tx, world, kind, &learning).await?;
        let actors: Vec<_> = rows.clone().map(|row| row.actor.as_str()).collect();
        let ids: Vec<_> = rows.clone().map(|row| row.id.as_str()).collect();
        tx.execute(
            &self.schema.recall.reconcile,
            &[&world, &actors, &ids, &Option::<&str>::None],
        )
        .await?;
        Ok(())
    }
}

pub(super) fn compile_placement(
    world: &str,
    kind: PersonalSourceKind,
    image: AccountImage<'_>,
    decoder: &RuntimeRecallDecoder<'_>,
) -> StoreResult<Placement> {
    let data: Body = serde_json::from_str(image.payload).map_err(|_| StoreError::InvalidRecord)?;
    compile_account(world, kind, image, data, Some(decoder))
}

/// Native interpretations and commitments carry no additional direct
/// observations, recognition or place discoveries. Their exact event links,
/// impression provenance and current recall policy use the same SQL compiler.
pub(super) fn compile_memory_write(
    world: &str,
    image: AccountImage<'_>,
    kind: &str,
) -> StoreResult<Placement> {
    let data: Body =
        serde_json::from_str(image.payload).map_err(|_| StoreError::DerivedProjectionRequired)?;
    let supported = match kind {
        "impression" => {
            data.source.as_deref() == Some("inferred")
                && data.impression.is_some()
                && data.obligation.is_none()
        }
        "commitment" => {
            data.source.as_deref() == Some("observed")
                && data.impression.is_none()
                && data
                    .obligation
                    .as_ref()
                    .and_then(|value| serde_json::from_str::<Obligation>(value.get()).ok())
                    .is_some_and(|obligation| {
                        obligation.revision > 0
                            && data.event_id.as_deref() == Some(obligation.evidence_id.as_str())
                            && data.resolved
                                == Some(matches!(
                                    obligation.status,
                                    ObligationStatus::Fulfilled | ObligationStatus::Cancelled
                                ))
                    })
        }
        _ => false,
    };
    if !supported
        || data.kind.as_deref() != Some(kind)
        || data.manifest.is_some()
        || data.evidence.is_some()
        || data.observations.originals().next().is_some()
        || data.observations.recognition.is_some()
    {
        return Err(StoreError::DerivedProjectionRequired);
    }
    compile_account(world, PersonalSourceKind::Memory, image, data, None)
}

fn compile_account(
    world: &str,
    kind: PersonalSourceKind,
    image: AccountImage<'_>,
    data: Body,
    decoder: Option<&RuntimeRecallDecoder<'_>>,
) -> StoreResult<Placement> {
    let AccountImage {
        record,
        id,
        actor,
        revision,
        payload,
    } = image;
    let summary = kind == PersonalSourceKind::Summary;
    if data.id != id || (!summary && data.actor_id.as_deref() != Some(actor)) {
        return Err(StoreError::InvalidRecord);
    }
    let kind_name = source_kind(kind);
    let source = json_record(&Source {
        world_id: world,
        actor_id: actor,
        id,
        source_kind: kind_name,
        record_id: record,
        revision,
        event_id: data.event_id.as_deref(),
        memory_kind: data.kind.as_deref(),
        acquisition: data.source.as_deref(),
        event_type: data.event_type.as_deref(),
        at: (if summary { data.to } else { data.at }).ok_or(StoreError::InvalidRecord)?,
        importance: data.importance,
        required: i64::from(
            data.kind.as_deref() == Some("commitment") && !data.resolved.unwrap_or(false),
        ),
        sequence: sql_ordinal(data.sequence.unwrap_or(0))?,
        search_text: (if summary {
            data.text.as_ref()
        } else {
            data.summary.as_ref()
        })
        .ok_or(StoreError::InvalidRecord)?,
        linguistic: 0,
        preserve_literal: i64::from(
            openlegend_simulation::experience::requires_verbatim_participants(
                kind,
                actor,
                data.entity_ids.iter().map(String::as_str),
            ) || data
                .literal_references
                .as_ref()
                .is_some_and(|refs| refs.requires_verbatim(actor)),
        ),
        payload_bytes: payload.len().try_into().map_err(|_| StoreError::Capacity)?,
        retention_class: AwarenessRetentionClass::Memory,
    })
    .map_err(|_| StoreError::InvalidRecord)?;
    let mut builder = PlacementBuilder {
        world,
        actor,
        kind: kind_name,
        id,
        exact: Vec::new(),
        learning: Vec::new(),
    };
    let mut manifest_observations = Vec::new();
    if let Some(references) = &data.literal_references {
        for reference in &references.references {
            if let openlegend_simulation::experience::LiteralReference::Source { source, .. } =
                reference
            {
                builder.personal(source, "literal-reference")?;
            }
        }
    }
    if let Some(manifest) = &data.manifest {
        if summary {
            for original in &data.sources {
                builder.personal(original, "derivation")?;
            }
        }
        for original in &manifest.coverage {
            builder.personal(original, &manifest.coverage_key)?;
        }
        for speech in &manifest.speech {
            for original in &speech.sources {
                builder.personal(original, &speech.support_key)?;
            }
        }
        decoder
            .ok_or(StoreError::DerivedProjectionRequired)?
            .with_manifest_dependencies(manifest.observations.get(), |links| {
                for (source, ordinal, aliases) in links {
                    builder.native(&source, &manifest.coverage_key, ordinal, &aliases)?;
                }
                Ok::<(), StoreError>(())
            })
            .map_err(experience_error)??;
        manifest_observations = serde_json::from_str(manifest.observations.get())
            .map_err(|_| StoreError::InvalidRecord)?;
    } else if summary {
        return Err(StoreError::InvalidRecord);
    }
    let places = if let Some(decoder) = decoder {
        let observations = data
            .observations
            .originals()
            .chain(
                data.evidence
                    .iter()
                    .flat_map(OriginalObservations::originals),
            )
            .chain(&manifest_observations)
            .collect::<Vec<_>>();
        let recognition = data
            .evidence
            .as_ref()
            .and_then(|evidence| evidence.recognition.as_ref())
            .map_or(&[][..], |recognition| {
                recognition.learning_support.as_slice()
            });
        if !summary {
            for observation in &observations {
                let origin = EvidenceSource {
                    family: openlegend_simulation::reception::EvidenceFamily::NativeExposure,
                    id: observation.id.clone(),
                    revision: SourceRevision::Number(observation.revision),
                    observer: observation.observer.clone(),
                };
                builder.native(&origin, "native-origin", None, &[id.to_owned()])?;
            }
        }
        let owner = PersonalSourceRef {
            kind,
            id: id.to_owned(),
            revision: revision.to_owned(),
        };
        decoder
            .with_retained_observations(&observations, recognition, &owner, |learning, places| {
                for learned in learning {
                    match learned {
                        PersonalLearningSource::Personal { kind, id } => {
                            builder.learning.push((*kind, id.clone()))
                        }
                        PersonalLearningSource::Evidence(source) => {
                            builder.native(source, "recognition", None, &[])?
                        }
                    }
                }
                places
                    .iter()
                    .map(|place| place_row(world, actor, kind_name, id, revision, place))
                    .collect::<StoreResult<Vec<_>>>()
            })
            .map_err(experience_error)??
    } else {
        Vec::new()
    };
    let mut spans = Vec::new();
    if let Some(impression) = data.impression {
        for dependency in impression.dependencies {
            match dependency {
                Support::Personal(reference) => {
                    builder.personal(&reference, "impression-origin")?
                }
                Support::Native {
                    source,
                    ordinal,
                    aliases,
                } => builder.native(&source, "impression-origin", ordinal, &aliases)?,
            }
        }
        for span in impression.provenance {
            spans.push(json_record(&serde_json::json!({
                "world_id":world,"actor_id":actor,"owner_id":id,"owner_kind":"memory",
                "physical_life":span.physical_life,"receipt_epoch":span.epoch,
                "first_batch_order":span.from.batch_order,"first_entry":span.from.entry_index,
                "last_batch_order":span.through.batch_order,"last_entry":span.through.entry_index,
            })).map_err(|_| StoreError::InvalidRecord)?);
        }
    }
    Ok(Placement {
        actor: actor.to_owned(),
        id: id.to_owned(),
        source,
        exact: builder.exact,
        learning: builder.learning,
        places,
        spans,
    })
}

fn experience_error(error: ExperienceError) -> StoreError {
    match error {
        ExperienceError::Capacity => StoreError::Capacity,
        _ => StoreError::InvalidRecord,
    }
}
