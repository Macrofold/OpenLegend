//! The activity learner reads one actor's canonical rows at its accepted cut.
//! PostgreSQL bounds the merged pending/durable prefix before returning bodies.

use super::read::{admitted_query, retain_pending_row};
use super::{Store, StoreError, StoreResult, durable_head};
use openlegend_simulation::{
    encoding::{json_record, json_record_len},
    host::ByteReservation,
    records::{ChangedRows, InstalledRow, SqlCell},
    runtime::{RuntimeActivityHistoryRead, RuntimeActivityRowsRead, RuntimeProviderInput},
};
use serde::Serialize;
use std::{collections::BTreeMap, mem::size_of, sync::Arc};

const TABLE: &str = "activity_occurrences";
type Overlay = BTreeMap<String, Option<InstalledRow>>;

pub(crate) struct PreparedActivityHistory {
    binding: openlegend_simulation::geometry::GeometryBinding,
    rows: PreparedActivityRows,
}

pub(crate) struct PreparedActivityRows {
    world_id: String,
    generation: String,
    actor_id: String,
    after: i64,
    ids: Option<Vec<String>>,
    maximum_rows: usize,
    maximum_bytes: usize,
    revision: u64,
    in_flight: Option<u64>,
    detached: Overlay,
    suffix: Overlay,
    custody: ByteReservation,
}

impl Store {
    /// Capture the actual selected pending rows before releasing the native
    /// read. The result is the independently funded database input.
    pub(crate) fn prepare_activity_history(
        &self,
        read: RuntimeActivityHistoryRead<'_>,
    ) -> StoreResult<PreparedActivityHistory> {
        Ok(PreparedActivityHistory {
            binding: read.request.binding,
            rows: self.prepare_activity_rows(read.rows())?,
        })
    }

    /// Retain only this reader's selected occurrence writes and deletion
    /// masks. The caller must copy them before the accepted turn ends.
    pub(crate) fn prepare_activity_rows(
        &self,
        request: RuntimeActivityRowsRead<'_>,
    ) -> StoreResult<PreparedActivityRows> {
        if request.detached.is_some() != request.in_flight_through.is_some() {
            return Err(StoreError::StaleCut);
        }
        let mut custody = self
            .budget
            .reserve(
                size_of::<PreparedActivityRows>()
                    + 4096
                    + 8 * (request.world_id.len()
                        + request.generation.len()
                        + request.actor_id.len())
                    + request
                        .ids
                        .into_iter()
                        .flatten()
                        .map(|id| size_of::<String>() + id.len())
                        .sum::<usize>(),
            )
            .map_err(|_| StoreError::Capacity)?;
        let table = self
            .schema
            .tables
            .iter()
            .find(|table| table.name == TABLE)
            .ok_or(StoreError::Schema)?;
        let column = |name| {
            table
                .columns
                .iter()
                .position(|column| column.name == name)
                .ok_or(StoreError::Schema)
        };
        let fields = [column("actor_id")?, column("source_id")?];
        let parent = json_record(&[
            "world",
            "actionExperience",
            "occurrences",
            request.actor_id,
        ])
        .map_err(|_| StoreError::InvalidRecord)?;
        let detached = request.detached
            .map(|changes| retain_overlay(changes, &request, &parent, fields, &mut custody))
            .transpose()?
            .unwrap_or_default();
        let suffix = retain_overlay(request.suffix, &request, &parent, fields, &mut custody)?;
        Ok(PreparedActivityRows {
            world_id: request.world_id.to_owned(),
            generation: request.generation.to_owned(),
            actor_id: request.actor_id.to_owned(),
            after: request.after,
            ids: request.ids.map(<[String]>::to_vec),
            maximum_rows: request.maximum_rows,
            maximum_bytes: request.maximum_bytes,
            revision: request.durable_revision,
            in_flight: request.in_flight_through,
            detached,
            suffix,
            custody,
        })
    }

    pub(crate) async fn read_activity_history(
        self: &Arc<Self>,
        prepared: PreparedActivityHistory,
    ) -> StoreResult<RuntimeProviderInput> {
        let (rows, admission) = self.read_activity_rows(prepared.rows).await?;
        RuntimeProviderInput::activity_history(prepared.binding, rows, admission, &self.budget)
            .map_err(|_| StoreError::Capacity)
    }

    pub(crate) async fn read_activity_rows(
        self: &Arc<Self>,
        mut prepared: PreparedActivityRows,
    ) -> StoreResult<(Vec<InstalledRow>, ByteReservation)> {
        let store = self.clone();
        self.read_simulation_cut(move |tx| {
            Box::pin(async move {
                let (rows, mut admission) = {
                    let head = durable_head(tx).await?.ok_or(StoreError::StaleCut)?;
                    if head.world_id != prepared.world_id || head.generation != prepared.generation {
                        return Err(StoreError::StaleCut);
                    }
                    let mut detached = prepared.detached;
                    match head.revision.checked_sub(prepared.revision) {
                        Some(0) => detached.append(&mut prepared.suffix),
                        Some(1) if prepared.in_flight.is_some() => detached = prepared.suffix,
                        _ => return Err(StoreError::StaleCut),
                    }
                    let mut admission = prepared.custody;
                    grow(&mut admission, detached.len() * 128 + 2048)?;
                    let masked = detached.keys().map(String::as_str).collect::<Vec<_>>();
                    #[derive(Serialize)]
                    struct Pending<'a> {
                        id: &'a str,
                        position: u64,
                        bytes: usize,
                    }
                    let selected_pending = detached
                        .values()
                        .filter_map(Option::as_ref)
                        .map(|row| Pending {
                            id: &row.id,
                            position: row.position,
                            bytes: row.payload.len(),
                        })
                        .collect::<Vec<_>>();
                    let bytes = json_record_len(&selected_pending)
                        .map_err(|_| StoreError::InvalidRecord)?;
                    grow(
                        &mut admission,
                        bytes.checked_mul(4).ok_or(StoreError::Capacity)?,
                    )?;
                    let positions =
                        json_record(&selected_pending).map_err(|_| StoreError::InvalidRecord)?;
                    // Only row keys and sizes cross this selection. The pending
                    // canonical bodies are already owned by this exact reader.
                    let (_wire, rows) = admitted_query(
                        tx,
                        "WITH whole AS (
                   SELECT id,position,octet_length(payload) AS bytes FROM activity_occurrences
                   WHERE world_id=$1 AND actor_id=$2 AND NOT(id=ANY($5::text[]))
                     AND (CASE WHEN $3::text[] IS NULL THEN position>$4 ELSE source_id=ANY($3) END)
                   UNION ALL SELECT id,position,bytes FROM jsonb_to_recordset($6::text::jsonb)
                     AS pending(id text,position bigint,bytes integer)
                 ), page AS MATERIALIZED (
                   SELECT id,position,bytes FROM whole ORDER BY position,id LIMIT $7
                 ), bounded AS (
                   SELECT id,position,sum(bytes) OVER (ORDER BY position,id) AS bytes FROM page
                 ) SELECT id FROM bounded WHERE bytes<=$8 ORDER BY position,id",
                        &[
                            &prepared.world_id,
                            &prepared.actor_id,
                            &prepared.ids,
                            &prepared.after,
                            &masked,
                            &positions,
                            &i64::try_from(prepared.maximum_rows)
                                .map_err(|_| StoreError::Capacity)?,
                            &i64::try_from(prepared.maximum_bytes)
                                .map_err(|_| StoreError::Capacity)?,
                        ],
                        &store.budget,
                    )
                    .await?;
                    let workspace = rows.iter().try_fold(0usize, |bytes, row| {
                        let id: &str = row.try_get(0)?;
                        bytes
                            .checked_add(size_of::<InstalledRow>() + id.len() + 256)
                            .ok_or(StoreError::Capacity)
                    })?;
                    grow(&mut admission, workspace)?;
                    let ids = rows
                        .iter()
                        .map(|row| row.try_get::<_, &str>(0))
                        .collect::<Result<Vec<_>, _>>()?;
                    let durable_ids = ids
                        .iter()
                        .copied()
                        .filter(|id| !detached.contains_key(*id))
                        .collect::<Vec<_>>();
                    let mut ready = BTreeMap::new();
                    if !durable_ids.is_empty() {
                        let table = store
                            .schema
                            .tables
                            .iter()
                            .find(|table| table.name == TABLE)
                            .ok_or(StoreError::Schema)?;
                        for row in store
                            .select_current_rows(
                                tx,
                                table,
                                "world_id=$1 AND actor_id=$2 AND id=ANY($3)",
                                &[&prepared.world_id, &prepared.actor_id, &durable_ids],
                                &mut admission,
                            )
                            .await?
                        {
                            ready.insert(row.id.clone(), row);
                        }
                    }
                    let rows = ids
                        .iter()
                        .map(|id| {
                            detached
                                .remove(*id)
                                .flatten()
                                .or_else(|| ready.remove(*id))
                                .ok_or(StoreError::StaleCut)
                        })
                        .collect::<StoreResult<Vec<_>>>()?;
                    (rows, admission)
                };
                let retained = rows.iter().try_fold(
                    rows.capacity() * size_of::<InstalledRow>(),
                    |bytes, row| {
                        bytes
                            .checked_add(row.retained_bytes().ok_or(StoreError::Capacity)?)
                            .ok_or(StoreError::Capacity)
                    },
                )?;
                admission
                    .resize(retained)
                    .map_err(|_| StoreError::Capacity)?;
                Ok((rows, admission))
            })
        })
        .await
    }
}

fn retain_overlay(
    changes: &ChangedRows,
    request: &RuntimeActivityRowsRead<'_>,
    parent: &str,
    [actor, source]: [usize; 2],
    custody: &mut ByteReservation,
) -> StoreResult<Overlay> {
    if changes
        .deletes
        .get("activity_occurrences_owners")
        .is_some_and(|owners| owners.iter().any(|owner| owner == parent))
    {
        return Err(StoreError::StaleCut);
    }
    let mut rows = Overlay::new();
    for id in changes
        .deletes
        .get(TABLE)
        .into_iter()
        .flatten()
        .chain(changes.expired.get(TABLE).into_iter().flatten())
    {
        if id
            .strip_prefix(&parent[..parent.len() - 1])
            .is_some_and(|rest| rest.starts_with(','))
        {
            grow(custody, id.len() + 128)?;
            rows.insert(id.clone(), None);
        }
    }
    for row in changes
        .writes
        .get(TABLE)
        .into_iter()
        .flatten()
        .filter(|row| row.parent == parent)
    {
        let field = |at| {
            row.extra
                .get(at)
                .and_then(SqlCell::as_str)
                .ok_or(StoreError::InvalidRecord)
        };
        if field(actor)? != request.actor_id {
            return Err(StoreError::InvalidRecord);
        }
        let source = field(source)?;
        let selected = match &request.ids {
            Some(ids) => ids.iter().any(|id| id == source),
            None => i64::try_from(row.position).map_err(|_| StoreError::Capacity)? > request.after,
        };
        if selected {
            grow(custody, row.id.len() + 128)?;
            rows.insert(row.id.clone(), Some(retain_pending_row(row, custody)?));
        }
    }
    Ok(rows)
}

fn grow(custody: &mut ByteReservation, additional: usize) -> StoreResult<()> {
    custody
        .resize(
            custody
                .bytes()
                .checked_add(additional)
                .ok_or(StoreError::Capacity)?,
        )
        .map_err(|_| StoreError::Capacity)
}
