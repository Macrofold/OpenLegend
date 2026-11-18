//! The direct writer consumes acquired personal accounts and their exact
//! references. SQL recall eligibility and lexical admission share the Source
//! repository's generated statements and the current schema.

use super::{Store, StoreError, StoreResult, sql_ordinal};
use openlegend_simulation::{
    encoding::{json_record, sha256_hex},
    experience::{
        Awareness, ExperienceError, KnownPlaceCapsule, PersonalLearningSource, PersonalSourceKind,
        personal_fact_alias,
    },
    host::ByteReservation,
    narration::native_text,
    reception::{EvidenceSource, Intelligibility, SpeechPerception},
    records::SaveRows,
    runtime::RuntimeRecallRead,
};
use serde::Serialize;
use std::collections::HashSet;
use tokio_postgres::Transaction;

pub(crate) mod activity_results;
mod checkpoint_accounts;
mod recovery;

const TABLE: &str = "mind_awareness";
const BATCH: usize = 100;

/// Same serialized string digest as the Source dependency index. Both the
/// writer and the protected correction selection use this exact witness.
pub(super) fn native_origin_dependency_key() -> String {
    sha256_hex(b"\"native-origin\"")
}

pub struct PreparedRecall {
    world: String,
    generation: String,
    through: u64,
    hard_bytes: i64,
    revision_column: usize,
    rows: Vec<AccountRow>,
    _custody: ByteReservation,
}

struct AccountRow {
    record_id: String,
    actor: String,
    id: String,
    revision: String,
    source: String,
    dependencies: Vec<Dependency>,
    place: Option<String>,
}

struct Dependency {
    family: String,
    id: String,
    revision: Option<String>,
    life: i64,
    owned_original: bool,
}

#[derive(Serialize)]
struct Source<'a> {
    world_id: &'a str,
    actor_id: &'a str,
    id: &'a str,
    source_kind: &'static str,
    record_id: &'a str,
    revision: &'a str,
    event_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    memory_kind: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    acquisition: Option<&'a str>,
    event_type: Option<&'a str>,
    at: f64,
    importance: f64,
    required: i64,
    sequence: i64,
    search_text: &'a openlegend_simulation::text::JsText,
    linguistic: i64,
    payload_bytes: i64,
    retention_class: openlegend_simulation::experience::AwarenessRetentionClass,
}

impl Store {
    /// Prebuild only actual accepted awareness rows, with the same current
    /// cut and selected law as the pending canonical prefix. Rust takes
    /// custody of the small SQL projections independently of those rows.
    pub fn prepare_recall(
        &self,
        read: RuntimeRecallRead<'_>,
    ) -> StoreResult<Option<PreparedRecall>> {
        let Some(rows) = read.changes.writes.get(TABLE) else {
            return Ok(None);
        };
        if rows.is_empty() {
            return Ok(None);
        }
        let columns = self
            .schema
            .tables
            .iter()
            .find(|table| table.name == TABLE)
            .ok_or(StoreError::Schema)?;
        let index = |key: &str| {
            columns
                .columns
                .iter()
                .position(|column| column.name == key)
                .ok_or(StoreError::Schema)
        };
        let actor_index = index("actor_id")?;
        let source_index = index("source_id")?;
        let revision_index = index("account_revision")?;
        let bytes = rows
            .iter()
            .try_fold(
                2048usize + read.world_id.len() + read.generation.len(),
                |size, row| {
                    size.checked_add(row.id.len().checked_mul(4)?)?
                        .checked_add(row.payload.len().checked_mul(14)?)?
                        .checked_add(2048)
                },
            )
            .ok_or(StoreError::Capacity)?;
        let mut custody = self
            .budget
            .reserve(bytes)
            .map_err(|_| StoreError::Capacity)?;
        let mut prepared = Vec::new();
        prepared
            .try_reserve_exact(rows.len())
            .map_err(|_| StoreError::Capacity)?;
        for row in rows {
            if !row.create {
                return Err(StoreError::DerivedProjectionRequired);
            }
            let field = |index| {
                row.extra
                    .get(index)
                    .and_then(|value: &openlegend_simulation::records::SqlCell| value.as_str())
                    .ok_or(StoreError::InvalidRecord)
            };
            let actor = field(actor_index)?;
            let id = field(source_index)?;
            let revision = field(revision_index)?;
            prepared.push(
                read.with_awareness(row, revision, |awareness, learning, place| {
                    AccountRow::prepare(
                        read.world_id,
                        &row.id,
                        row.payload.len(),
                        actor,
                        id,
                        revision,
                        awareness,
                        learning,
                        place,
                    )
                })
                .map_err(|error| match error {
                    ExperienceError::Capacity => StoreError::Capacity,
                    _ => StoreError::InvalidRecord,
                })??,
            );
        }
        let actual = prepared
            .iter()
            .try_fold(
                2048 + read.world_id.len() + read.generation.len(),
                |size, row| size.checked_add(row.resident_bytes()?),
            )
            .ok_or(StoreError::Capacity)?;
        custody.resize(actual).map_err(|_| StoreError::Capacity)?;
        Ok(Some(PreparedRecall {
            world: read.world_id.to_owned(),
            generation: read.generation.to_owned(),
            through: read.through,
            hard_bytes: sql_ordinal(read.hard_bytes)?,
            revision_column: revision_index,
            rows: prepared,
            _custody: custody,
        }))
    }

    pub(super) async fn write_recall(
        &self,
        transaction: &Transaction<'_>,
        save: &SaveRows,
        prepared: &PreparedRecall,
    ) -> StoreResult<()> {
        if (
            prepared.world.as_str(),
            prepared.generation.as_str(),
            prepared.through,
        ) != (
            save.world_id.as_str(),
            save.generation.as_str(),
            save.through_cut,
        ) {
            return Err(StoreError::StaleCut);
        }
        let rows = save.changes.writes.get(TABLE).ok_or(StoreError::StaleCut)?;
        if rows.len() != prepared.rows.len()
            || rows.iter().zip(&prepared.rows).any(|(saved, row)| {
                !saved.create
                    || saved.id != row.record_id
                    || saved
                        .extra
                        .get(prepared.revision_column)
                        .and_then(|cell| cell.as_str())
                        != Some(row.revision.as_str())
            })
        {
            return Err(StoreError::StaleCut);
        }
        self.write_awareness_rows(
            transaction,
            save.world_id.as_str(),
            prepared.hard_bytes,
            &prepared.rows,
        )
        .await
    }

    async fn write_awareness_rows(
        &self,
        transaction: &Transaction<'_>,
        world: &str,
        hard_bytes: i64,
        rows: &[AccountRow],
    ) -> StoreResult<()> {
        for batch in rows.chunks(BATCH) {
            let bytes = batch
                .iter()
                .try_fold(16384usize, |size, row| {
                    size.checked_add(row.resident_bytes()?)
                })
                .and_then(|size| size.checked_mul(3))
                .ok_or(StoreError::Capacity)?;
            let _sql = self
                .budget
                .reserve(bytes)
                .map_err(|_| StoreError::Capacity)?;
            let rows = batch.iter().map(|row| row.source.as_str());
            let input = array(rows);
            transaction
                .query_opt(&self.schema.recall.insert, &[&input, &hard_bytes])
                .await?;
            drop(input);
            Self::write_dependencies(transaction, world, batch).await?;
            let places = array(batch.iter().filter_map(|row| row.place.as_deref()));
            if places != "[]" {
                transaction.execute(
                    "INSERT INTO recall_place_capsules
                     SELECT * FROM jsonb_populate_recordset(NULL::recall_place_capsules,$1::text::jsonb)", &[&places],
                ).await?;
            }
        }
        // All awareness and dependency placements are visible before the
        // common eligibility/vector closure evaluates any linked old entry.
        for batch in rows.chunks(BATCH) {
            let bytes = batch
                .iter()
                .try_fold(8192usize, |size, row| {
                    size.checked_add(row.actor.len() * 8 + row.id.len() * 8 + 256)
                })
                .ok_or(StoreError::Capacity)?;
            let _sql = self
                .budget
                .reserve(bytes)
                .map_err(|_| StoreError::Capacity)?;
            let actors: Vec<_> = batch.iter().map(|row| row.actor.as_str()).collect();
            let ids: Vec<_> = batch.iter().map(|row| row.id.as_str()).collect();
            transaction
                .execute(&self.schema.recall.reconcile, &[&world, &actors, &ids])
                .await?;
        }
        Ok(())
    }

    async fn write_dependencies(
        transaction: &Transaction<'_>,
        world: &str,
        rows: &[AccountRow],
    ) -> StoreResult<()> {
        let mut native = Vec::new();
        let mut personal = Vec::new();
        for row in rows {
            for dependency in &row.dependencies {
                if dependency.revision.is_some() {
                    native.push((row, dependency));
                } else {
                    personal.push((row, dependency));
                }
            }
        }
        let recognition = sha256_hex(b"\"recognition\"");
        let origin = native_origin_dependency_key();
        if !native.is_empty() {
            let input = native
                .iter()
                .map(|(row, dep)| DependencyRow {
                    world_id: world,
                    actor_id: &row.actor,
                    derived_kind: "awareness",
                    derived_id: &row.id,
                    source_kind: &dep.family,
                    source_id: &dep.id,
                    source_revision: dep.revision.as_deref().expect("native dependency"),
                    support_key: if dep.owned_original {
                        &origin
                    } else {
                        &recognition
                    },
                    source_life: dep.life,
                    facet_ordinal: -1,
                    alias_id: if dep.owned_original { &row.id } else { "" },
                })
                .collect::<Vec<_>>();
            let json = json_record(&input).map_err(|_| StoreError::InvalidRecord)?;
            transaction.execute("INSERT INTO mind_source_dependencies SELECT * FROM
                jsonb_populate_recordset(NULL::mind_source_dependencies,$1::text::jsonb) ON CONFLICT DO NOTHING", &[&json]).await?;
        }
        let personal = personal
            .into_iter()
            .map(|(row, dependency)| {
                let kind = match dependency.family.as_str() {
                    "awareness" => PersonalSourceKind::Awareness,
                    "memory" => PersonalSourceKind::Memory,
                    "summary" => PersonalSourceKind::Summary,
                    _ => return Err(StoreError::InvalidRecord),
                };
                Ok((
                    kind,
                    row.actor.as_str(),
                    row.id.as_str(),
                    dependency.id.as_str(),
                ))
            })
            .collect::<StoreResult<Vec<_>>>()?;
        Self::write_learning_dependencies(transaction, world, "awareness", &personal).await
    }

    async fn write_learning_dependencies(
        transaction: &Transaction<'_>,
        world: &str,
        derived_kind: &str,
        personal: &[(PersonalSourceKind, &str, &str, &str)],
    ) -> StoreResult<()> {
        let recognition = sha256_hex(b"\"recognition\"");
        for kind in [
            PersonalSourceKind::Awareness,
            PersonalSourceKind::Memory,
            PersonalSourceKind::Summary,
        ] {
            let family = source_kind(kind);
            let selected: Vec<_> = personal
                .iter()
                .filter(|(source_kind, ..)| *source_kind == kind)
                .collect();
            if selected.is_empty() {
                continue;
            }
            let actor: Vec<_> = selected.iter().map(|(_, actor, ..)| *actor).collect();
            let id: Vec<_> = selected.iter().map(|(_, _, id, _)| *id).collect();
            let source: Vec<_> = selected.iter().map(|(_, _, _, source)| *source).collect();
            let query = format!("WITH requested AS MATERIALIZED (
                  SELECT q.*,binding.revision FROM unnest($3::text[],$4::text[],$5::text[]) q(actor_id,derived_id,source_id)
                  CROSS JOIN LATERAL (
                     SELECT account_revision AS revision,0 AS access,0 AS retired FROM {} WHERE world_id=$1 AND actor_id=q.actor_id AND source_id=q.source_id
                     UNION ALL SELECT revision,1 AS access,-retired_revision AS retired FROM mind_source_versions
                      WHERE world_id=$1 AND actor_id=q.actor_id AND source_kind=$2 AND source_id=q.source_id
                     ORDER BY access,retired LIMIT 1
                  ) binding
                ), placed AS (INSERT INTO mind_source_dependencies
                   SELECT $1,actor_id,'{derived_kind}',derived_id,$2,source_id,revision,$6,-1,-1,source_id FROM requested
                   ON CONFLICT DO NOTHING)
                SELECT count(*) FROM requested", kind.table());
            let bound: i64 = transaction
                .query_one(
                    &query,
                    &[&world, &family, &actor, &id, &source, &recognition],
                )
                .await?
                .try_get(0)?;
            if bound != selected.len() as i64 {
                return Err(StoreError::InvalidRecord);
            }
        }
        Ok(())
    }
}

#[derive(Serialize)]
struct DependencyRow<'a> {
    world_id: &'a str,
    actor_id: &'a str,
    derived_kind: &'static str,
    derived_id: &'a str,
    source_kind: &'a str,
    source_id: &'a str,
    source_revision: &'a str,
    support_key: &'a str,
    source_life: i64,
    facet_ordinal: i64,
    alias_id: &'a str,
}

impl AccountRow {
    fn prepare(
        world: &str,
        record_id: &str,
        payload_bytes: usize,
        actor: &str,
        id: &str,
        revision: &str,
        awareness: &Awareness,
        learning: &[PersonalLearningSource],
        place: Option<&KnownPlaceCapsule>,
    ) -> StoreResult<Self> {
        if awareness.actor_id != actor || awareness.event_id != id {
            return Err(StoreError::InvalidRecord);
        }
        let event_type = awareness
            .event_type
            .as_deref()
            .ok_or(StoreError::InvalidRecord)?;
        let text = native_text(&awareness.text);
        let linguistic = awareness.speech.as_ref().is_some_and(|speech| {
            speech.perception != SpeechPerception::Seen
                && speech.intelligibility != Intelligibility::None
        });
        let source = json_record(&Source {
            world_id: world,
            actor_id: actor,
            id,
            source_kind: "awareness",
            record_id,
            revision,
            event_id: Some(id),
            memory_kind: None,
            acquisition: None,
            event_type: Some(event_type),
            at: awareness.at,
            importance: awareness.importance,
            required: 0,
            sequence: sql_ordinal(awareness.sequence)?,
            search_text: &text,
            linguistic: i64::from(linguistic),
            payload_bytes: i64::try_from(payload_bytes).map_err(|_| StoreError::Capacity)?,
            retention_class: awareness.retention_class,
        })
        .map_err(|_| StoreError::InvalidRecord)?;
        let mut seen = HashSet::new();
        let mut dependencies = Vec::new();
        for observation in awareness
            .observation
            .iter()
            .chain(awareness.observations.iter().flatten())
        {
            if seen.insert((&observation.id, observation.revision)) {
                dependencies.push(Dependency {
                    family: "native-exposure".to_owned(),
                    id: observation.id.clone(),
                    revision: Some(
                        json_record(&observation.revision)
                            .map_err(|_| StoreError::InvalidRecord)?,
                    ),
                    life: sql_ordinal(observation.observer.physical_life)?,
                    owned_original: true,
                });
            }
        }
        for source in learning {
            dependencies.push(match source {
                PersonalLearningSource::Personal { kind, id } => Dependency {
                    family: source_kind(*kind).to_owned(),
                    id: id.clone(),
                    revision: None,
                    life: -1,
                    owned_original: false,
                },
                PersonalLearningSource::Evidence(EvidenceSource {
                    family,
                    id,
                    revision,
                    observer,
                }) => {
                    if observer.actor_id != actor {
                        return Err(StoreError::InvalidRecord);
                    }
                    Dependency {
                        family: json_record(family)
                            .map_err(|_| StoreError::InvalidRecord)?
                            .trim_matches('"')
                            .to_owned(),
                        id: id.clone(),
                        revision: Some(
                            json_record(revision).map_err(|_| StoreError::InvalidRecord)?,
                        ),
                        life: sql_ordinal(observer.physical_life)?,
                        owned_original: false,
                    }
                }
            });
        }
        Ok(Self {
            record_id: record_id.to_owned(),
            actor: actor.to_owned(),
            id: id.to_owned(),
            revision: revision.to_owned(),
            source,
            dependencies,
            place: place
                .map(|place| place_row(world, actor, "awareness", id, revision, place))
                .transpose()?,
        })
    }

    fn resident_bytes(&self) -> Option<usize> {
        let initial = std::mem::size_of::<Self>()
            .checked_add(self.record_id.capacity())?
            .checked_add(self.actor.capacity())?
            .checked_add(self.id.capacity())?
            .checked_add(self.revision.capacity())?
            .checked_add(self.source.capacity())?
            .checked_add(self.place.as_ref().map_or(0, String::capacity))?
            .checked_add(
                self.dependencies
                    .capacity()
                    .checked_mul(std::mem::size_of::<Dependency>())?,
            )?;
        self.dependencies.iter().try_fold(initial, |bytes, dep| {
            bytes
                .checked_add(dep.family.capacity())?
                .checked_add(dep.id.capacity())?
                .checked_add(dep.revision.as_ref().map_or(0, String::capacity))
        })
    }
}

fn source_kind(kind: PersonalSourceKind) -> &'static str {
    match kind {
        PersonalSourceKind::Awareness => "awareness",
        PersonalSourceKind::Memory => "memory",
        PersonalSourceKind::Summary => "summary",
    }
}

fn array<'a>(rows: impl Iterator<Item = &'a str>) -> String {
    let mut result = String::from("[");
    for row in rows {
        if result.len() > 1 {
            result.push(',');
        }
        result.push_str(row);
    }
    result.push(']');
    result
}

fn place_row(
    world: &str,
    actor: &str,
    kind: &str,
    owner: &str,
    revision: &str,
    place: &KnownPlaceCapsule,
) -> StoreResult<String> {
    json_record(&serde_json::json!({
        "world_id": world, "actor_id": actor, "owner_id": owner, "owner_kind":kind, "owner_revision":revision,
        "place_id":place.place_id, "observed_at":place.observed_at, "observed_order":place.observed_order,
        "source_event_id":place.source_event_id, "native_source_id":place.source.id,
        "fact_alias":personal_fact_alias(&place.source.id, place.facet_ordinal).map_err(|_| StoreError::InvalidRecord)?,
        "capsule_key":super::known_places::place_capsule_key(place)?,
        "capsule":json_record(place).map_err(|_| StoreError::InvalidRecord)?, "account_owner_kind":kind,
    })).map_err(|_| StoreError::InvalidRecord)
}
