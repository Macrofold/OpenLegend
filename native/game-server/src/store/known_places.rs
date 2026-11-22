//! The remembered-place provider reads the actor's original accepted cut. A
//! SQL row is evidence only while its exact owner remains admitted.

use super::{Store, StoreError, StoreResult, durable_head, ordinal, sql_ordinal};
use openlegend_simulation::encoding::json_record;
use openlegend_simulation::experience::{PersonalSourceKind, PersonalSourceRef};
use openlegend_simulation::geometry::GeometryBinding;
use openlegend_simulation::host::ByteReservation;
use openlegend_simulation::records::ChangedRows;
use openlegend_simulation::runtime::{RuntimeKnownPlaceRead, RuntimeProviderInput};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::borrow::Cow;
use tokio_postgres::types::ToSql;

mod support;
mod view;
pub(super) use support::place_capsule_key;
use support::{PendingSupports, SqlSupports};
pub(crate) use view::{KnownPlaceViewPage, PlaceViewRequest, PlaceViewSearch};
pub(super) use view::source_text;

/// Own the exact read inputs independently of the active provider or save
/// acknowledgement. The native preparation remains the final owner of place
/// validity; this product cannot disclose or mutate any actor's knowledge.
pub struct PreparedKnownPlaceRead {
    binding: GeometryBinding,
    world: String,
    generation: String,
    actor: String,
    revision: u64,
    in_flight_through: Option<u64>,
    maximum_rows: u64,
    maximum_bytes: u64,
    detached_changes_owner: bool,
    suffix_changes_owner: bool,
    detached_supports: Option<PendingSupports>,
    suffix_supports: PendingSupports,
    revoked: Vec<String>,
    history: Option<view::HistoricalFilter>,
    _custody: ByteReservation,
}

const SOURCE_TABLES: [(&str, usize); 7] = [
    ("mind_awareness", 3),
    ("mind_awareness_owners", 3),
    ("mind_memories", 2),
    ("mind_memories_owners", 2),
    ("mind_summaries", 3),
    ("mind_summaries_owners", 3),
    ("mind_temporal_actors", 4),
];

impl Store {
    /// Select only saved changes that affect the actual actor's capsule index.
    /// This runs synchronously with the accepted save owners still borrowed.
    pub fn prepare_known_place_read(
        &self,
        read: RuntimeKnownPlaceRead<'_>,
    ) -> StoreResult<PreparedKnownPlaceRead> {
        self.prepare_places(read, false)
    }

    /// The historical reader includes corrected originals only for their
    /// correction notice. Its executable sibling still excludes them.
    pub(crate) fn prepare_known_place_view_read(
        &self,
        read: RuntimeKnownPlaceRead<'_>,
    ) -> StoreResult<PreparedKnownPlaceRead> {
        self.prepare_places(read, true)
    }

    fn prepare_places(
        &self,
        read: RuntimeKnownPlaceRead<'_>,
        historical: bool,
    ) -> StoreResult<PreparedKnownPlaceRead> {
        if read.durable_cut > read.binding.base_cut
            || read
                .in_flight_through
                .is_some_and(|cut| cut <= read.durable_cut || cut > read.binding.base_cut)
            || read.detached.is_some() != read.in_flight_through.is_some()
        {
            return Err(StoreError::StaleCut);
        }
        let ids = || {
            read.privacy
                .forgotten()
                .chain(read.privacy.corrections().keys())
        };
        let bytes = ids()
            .try_fold(
                512 + read.actor_id.len() + read.world_id.len() + read.generation.len(),
                |n, id| n.checked_add(48)?.checked_add(id.len().checked_mul(2)?),
            )
            .and_then(|size| {
                if historical {
                    read.privacy
                        .corrections()
                        .values()
                        .try_fold(size, |bytes, id| {
                            bytes.checked_add(80)?.checked_add(id.len())
                        })
                } else {
                    Some(size)
                }
            })
            .ok_or(StoreError::Capacity)?;
        let custody = self
            .budget
            .reserve(bytes)
            .map_err(|_| StoreError::Capacity)?;
        let detached_changes_owner = read
            .detached
            .map(|changes| self.changes_place_owner(read.actor_id, changes))
            .transpose()?
            .unwrap_or(false);
        let suffix_changes_owner = self.changes_place_owner(read.actor_id, read.suffix)?;
        Ok(PreparedKnownPlaceRead {
            binding: read.binding,
            world: read.world_id.to_owned(),
            generation: read.generation.to_owned(),
            actor: read.actor_id.to_owned(),
            revision: read.durable_revision,
            in_flight_through: read.in_flight_through,
            maximum_rows: read.maximum_rows,
            maximum_bytes: read.maximum_bytes,
            detached_changes_owner,
            suffix_changes_owner,
            detached_supports: read
                .detached
                .map(|changes| PendingSupports::prepare(self, read.actor_id, changes))
                .transpose()?,
            suffix_supports: PendingSupports::prepare(self, read.actor_id, read.suffix)?,
            revoked: ids().cloned().collect(),
            history: historical.then(|| view::HistoricalFilter {
                forgotten_count: read.privacy.forgotten().count(),
                corrections: read.privacy.corrections().clone(),
                privacy_revision: read.privacy.revision(),
            }),
            _custody: custody,
        })
    }

    fn changes_place_owner(&self, actor: &str, changes: &ChangedRows) -> StoreResult<bool> {
        if [
            "data_world",
            "world_settings",
            "experience_state",
            "mind_temporal_state",
        ]
        .iter()
        .any(|table| changes.deletes.contains_key(*table))
        {
            return Ok(true);
        }
        for (name, actor_at) in SOURCE_TABLES {
            // Updating a parent retains its children. Its removal can hide
            // additional indexed rows beyond explicit leaf writes/deletes.
            if !name.ends_with("_owners")
                && name != "mind_temporal_actors"
                && let Some(writes) = changes.writes.get(name)
            {
                let table = self
                    .schema
                    .tables
                    .iter()
                    .find(|table| table.name == name)
                    .ok_or(StoreError::Schema)?;
                let actor_column = table
                    .columns
                    .iter()
                    .position(|column| column.name == "actor_id");
                for row in writes {
                    if let Some(id) = actor_column
                        .and_then(|at| row.extra.get(at))
                        .and_then(|value| value.as_str())
                    {
                        if id == actor {
                            return Ok(true);
                        }
                    } else if row_owner(&self.budget, &row.id, actor_at, actor)? {
                        return Ok(true);
                    }
                }
            }
            for id in changes.deletes.get(name).into_iter().flatten() {
                if row_owner(&self.budget, id, actor_at, actor)? {
                    return Ok(true);
                }
            }
        }
        Ok(false)
    }

    /// Read complete canonical capsules from one repeatable SQL snapshot. The
    /// first indexed selection measures transfer and proves completeness; a
    /// validated empty result needs no second selection.
    pub async fn read_known_places(
        &self,
        read: PreparedKnownPlaceRead,
    ) -> StoreResult<RuntimeProviderInput> {
        // The operation still owns the world turn. If its place projection
        // needs a pending save, let the owner roll back this attempt and keep
        // elapsed time. Holding the turn until that save would block its capture.
        if read.suffix_changes_owner {
            return Err(StoreError::KnownPlacesPendingSave);
        }
        let budget = self.budget.clone();
        self.read_simulation_cut(move |transaction| {
            Box::pin(async move {
                let head = durable_head(transaction).await?.ok_or(StoreError::StaleCut)?;
                if head.world_id != read.world || head.generation != read.generation {
                    return Err(StoreError::StaleCut);
                }
                let detached_durable = match head.revision.checked_sub(read.revision) {
                    Some(0) => false,
                    Some(1) if read.in_flight_through.is_some() => true,
                    _ => return Err(StoreError::StaleCut),
                };
                // A divergent pending owner requires the corresponding derived
                // capsule overlay. Do not silently fill that hole from older SQL.
                if !detached_durable && read.detached_changes_owner {
                    return Err(StoreError::KnownPlacesPendingSave);
                }
                let sentinel = sql_ordinal(read.maximum_rows.checked_add(1).ok_or(StoreError::Capacity)?)?;
                let older = read.detached_supports.as_ref().filter(|_| !detached_durable);
                let overlay = SqlSupports::prepare(&budget, older, &read.suffix_supports)?;
                    let select = candidate_places(overlay.has_changes(), false);
                let mut params: Vec<&(dyn ToSql + Sync)> = vec![&read.world, &read.actor, &read.revoked, &sentinel];
                if overlay.has_changes() { params.extend(overlay.parameters()); }
                let size = transaction.query_one(&format!(
                    "{select} SELECT count(*), COALESCE(sum(octet_length(capsule)),0)::bigint, \
                     COALESCE(sum(octet_length(owner_id)+octet_length(owner_kind)+octet_length(owner_revision)),0)::bigint FROM retained_places"
                ), &params).await?;
                let count = ordinal(size.try_get(0)?)?;
                let bytes = ordinal(size.try_get(1)?)?;
                let metadata = ordinal(size.try_get(2)?)?;
                if count > read.maximum_rows || bytes > read.maximum_bytes {
                    return Err(StoreError::Capacity);
                }
                let bound = bytes.checked_add(metadata).and_then(|bytes| bytes.checked_mul(12))
                    .and_then(|bytes| bytes.checked_add(count.checked_mul(1024)?))
                    .and_then(|bytes| bytes.checked_add(512)).and_then(|bytes| usize::try_from(bytes).ok())
                    .ok_or(StoreError::Capacity)?;
                let mut custody = budget.reserve(bound).map_err(|_| StoreError::Capacity)?;
                let rows = if count == 0 { Vec::new() } else { transaction.query(&format!(
                    "{select} SELECT owner_id,owner_kind,owner_revision,capsule FROM retained_places ORDER BY place_id"
                ), &params).await? };
                if rows.len() as u64 != count { return Err(StoreError::StaleCut); }
                let mut capsules: Vec<&RawValue> = Vec::with_capacity(rows.len());
                for row in &rows {
                    let owner: &str = row.try_get(0)?;
                    let kind: &str = row.try_get(1)?;
                    let revision: &str = row.try_get(2)?;
                    let body: &str = row.try_get(3)?;
                    validate_capsule(body, &read.actor, owner, kind, revision)?;
                    capsules.push(serde_json::from_str(body).map_err(|_| StoreError::InvalidRecord)?);
                }
                #[derive(Serialize)]
                struct Answer<'a> { binding: GeometryBinding, capsules: &'a [&'a RawValue] }
                let output = json_record(&Answer { binding: read.binding, capsules: &capsules }).map_err(|_| StoreError::InvalidRecord)?;
                drop(capsules);
                drop(rows);
                custody.resize(output.capacity()).map_err(|_| StoreError::Capacity)?;
                Ok(RuntimeProviderInput::new(output, custody))
            })
        }).await
    }
}

fn row_owner(
    budget: &openlegend_simulation::host::ByteBudget,
    id: &str,
    actor_at: usize,
    actor: &str,
) -> StoreResult<bool> {
    let bytes = id
        .len()
        .checked_mul(20)
        .and_then(|bytes| bytes.checked_add(256))
        .ok_or(StoreError::Capacity)?;
    let _storage = budget.reserve(bytes).map_err(|_| StoreError::Capacity)?;
    let path: Vec<String> = serde_json::from_str(id).map_err(|_| StoreError::InvalidRecord)?;
    Ok(path.get(actor_at).ok_or(StoreError::InvalidRecord)? == actor)
}

fn validate_capsule(
    body: &str,
    actor: &str,
    owner: &str,
    kind: &str,
    revision: &str,
) -> StoreResult<()> {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Header<'a> {
        #[serde(borrow)]
        source: Source<'a>,
        personal_source: Option<PersonalSourceRef>,
    }
    #[derive(Deserialize)]
    struct Source<'a> {
        #[serde(borrow)]
        observer: Observer<'a>,
    }
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Observer<'a> {
        #[serde(borrow)]
        actor_id: Cow<'a, str>,
    }
    let body: Header<'_> = serde_json::from_str(body).map_err(|_| StoreError::InvalidRecord)?;
    if body.source.observer.actor_id != actor {
        return Err(StoreError::InvalidRecord);
    }
    match (kind, body.personal_source) {
        ("support", None) => Ok(()),
        (kind, Some(reference))
            if reference.id == owner
                && reference.revision == revision
                && match reference.kind {
                    PersonalSourceKind::Awareness => kind == "awareness",
                    PersonalSourceKind::Memory => kind == "memory",
                    PersonalSourceKind::Summary => kind == "summary",
                } =>
        {
            Ok(())
        }
        _ => Err(StoreError::InvalidRecord),
    }
}

// Same indexed seek, tie order, exact current source/support and retirement
// checks as MemoryRepository.retainedPlaces. The actor's accepted privacy
// owner already includes the cutoff's unsaved correction/forgetting.
fn candidate_places(support_overlay: bool, history: bool) -> String {
    let hidden = if support_overlay {
        "AND (p.support_record_id IS NULL OR p.support_record_id<>ALL($5::text[]))"
    } else {
        ""
    };
    let pending = if support_overlay {
        "UNION ALL SELECT q.owner_id,'support',q.owner_revision,q.place_id,q.observed_at,q.observed_order,
         q.source_event_id,q.native_source_id,q.fact_alias,q.capsule FROM
         unnest($6::text[],$7::text[],$8::text[],$9::double precision[],$10::bigint[],$11::text[],
                $12::text[],$13::text[],$14::text[])
         q(owner_id,owner_revision,place_id,observed_at,observed_order,source_event_id,native_source_id,fact_alias,capsule)"
    } else {
        ""
    };
    let direct = if history { "$5" } else { "$3" };
    let range = if history {
        "AND ($6::text IS NULL OR p.place_id>$6) AND ($7::text IS NULL OR p.place_id=$7)"
    } else {
        ""
    };
    let selected = format!("FROM available p
        WHERE (p.source_event_id IS NULL OR p.source_event_id<>ALL({direct}::text[]))
           AND p.native_source_id<>ALL({direct}::text[]) AND p.fact_alias<>ALL({direct}::text[]) {range}");
    let order = "ORDER BY p.place_id,p.observed_at DESC,p.observed_order DESC,p.owner_id DESC,p.owner_kind DESC LIMIT 1";
    format!("WITH RECURSIVE available AS NOT MATERIALIZED (
        SELECT p.owner_id,p.owner_kind,p.owner_revision,p.place_id,p.observed_at,p.observed_order,
          p.source_event_id,p.native_source_id,p.fact_alias,p.capsule FROM recall_place_capsules p
        WHERE p.world_id=$1 AND p.actor_id=$2 {hidden}
          AND (EXISTS (SELECT 1 FROM recall_sources r WHERE p.owner_kind<>'support'
            AND r.world_id=p.world_id AND r.actor_id=p.actor_id AND r.id=p.owner_id
            AND r.source_kind=p.owner_kind AND r.revision=p.owner_revision AND r.eligible=1
            AND (r.source_kind<>'summary' OR NOT EXISTS (
              SELECT 1 FROM mind_source_dependencies d WHERE d.world_id=p.world_id AND d.actor_id=p.actor_id
                AND d.derived_kind=r.source_kind AND d.derived_id=r.id
                AND (d.source_id=ANY($3::text[]) OR d.alias_id=ANY($3::text[])))))
          OR (p.owner_kind='support' AND EXISTS (SELECT 1 FROM mind_temporal_supports s
            WHERE s.world_id=p.world_id AND s.id=p.support_record_id AND s.account_revision=p.owner_revision)))
        {pending}
      ), retained_places AS (
        (SELECT p.*,1::bigint AS place_step {selected} {order})
        UNION ALL SELECT next.* FROM retained_places previous CROSS JOIN LATERAL (
          SELECT p.*,previous.place_step+1 {selected} AND p.place_id>previous.place_id AND previous.place_step<$4 {order}
        ) next
      )")
}
