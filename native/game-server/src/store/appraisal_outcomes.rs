//! Read only the prior outcomes requested by the native appraisal owner.
//! A missing result certifies absence at the candidate's accepted cut.

use super::read::{
    admitted_query_bounded, append_current_record_fields, installed_row, retain_pending_row,
};
use super::{Store, StoreError, StoreResult, durable_head};
use openlegend_simulation::{
    encoding::json_record,
    geometry::GeometryBinding,
    host::ByteReservation,
    records::{ChangedRows, InstalledRow},
    runtime::{RuntimeAppraisalOutcomesRead, RuntimeProviderInput},
};
use std::{
    collections::{BTreeMap, BTreeSet},
    mem::size_of,
    sync::Arc,
};

const TABLE: &str = "mind_appraisals";
type Overlay = BTreeMap<String, Option<InstalledRow>>;

pub(crate) struct PreparedAppraisalOutcomes {
    binding: GeometryBinding,
    world: String,
    generation: String,
    parent: String,
    ids: BTreeSet<String>,
    revision: u64,
    in_flight: Option<u64>,
    maximum: usize,
    detached: Overlay,
    suffix: Overlay,
    custody: ByteReservation,
}

impl Store {
    /// Pin only selected pending writes or deletion masks before the
    /// candidate releases its read to PostgreSQL. The copy survives save ACK.
    pub(crate) fn prepare_appraisal_outcomes(
        &self,
        read: RuntimeAppraisalOutcomesRead<'_>,
    ) -> StoreResult<PreparedAppraisalOutcomes> {
        if read.detached.is_some() != read.in_flight_through.is_some() {
            return Err(StoreError::StaleCut);
        }
        let actor_bound = 6usize
            .checked_mul(read.actor_id.len())
            .and_then(|bytes| bytes.checked_add(128))
            .ok_or(StoreError::Capacity)?;
        let bytes = read
            .ids
            .iter()
            .try_fold(
                size_of::<PreparedAppraisalOutcomes>()
                    + 1024
                    + actor_bound
                    + read.world_id.len()
                    + read.generation.len(),
                |bytes, id| {
                    bytes
                        .checked_add(id.len().checked_mul(6)?)?
                        .checked_add(actor_bound)
                },
            )
            .ok_or(StoreError::Capacity)?;
        let mut custody = self
            .budget
            .reserve(bytes)
            .map_err(|_| StoreError::Capacity)?;
        let parent = json_record(&["world", "appraisals", read.actor_id])
            .map_err(|_| StoreError::InvalidRecord)?;
        let ids = read
            .ids
            .iter()
            .map(|id| {
                json_record(&["world", "appraisals", read.actor_id, id])
                    .map_err(|_| StoreError::InvalidRecord)
            })
            .collect::<StoreResult<BTreeSet<_>>>()?;
        let detached = read
            .detached
            .map(|changes| capture_overlay(changes, &parent, &ids, &mut custody))
            .transpose()?
            .unwrap_or_default();
        let suffix = capture_overlay(read.suffix, &parent, &ids, &mut custody)?;
        Ok(PreparedAppraisalOutcomes {
            binding: read.binding,
            world: read.world_id.to_owned(),
            generation: read.generation.to_owned(),
            parent,
            ids,
            revision: read.durable_revision,
            in_flight: read.in_flight_through,
            maximum: read.maximum_transfer_bytes,
            detached,
            suffix,
            custody,
        })
    }

    pub(crate) async fn read_appraisal_outcomes(
        self: &Arc<Self>,
        mut read: PreparedAppraisalOutcomes,
    ) -> StoreResult<RuntimeProviderInput> {
        let store = self.clone();
        self.read_simulation_cut(move |tx| {
            Box::pin(async move {
                let head = durable_head(tx).await?.ok_or(StoreError::StaleCut)?;
                if head.world_id != read.world || head.generation != read.generation {
                    return Err(StoreError::StaleCut);
                }
                let overlay = match head.revision.checked_sub(read.revision) {
                    Some(0) => {
                        read.detached.append(&mut read.suffix);
                        read.detached
                    }
                    Some(1) if read.in_flight.is_some() => read.suffix,
                    _ => return Err(StoreError::StaleCut),
                };
                // Keep the existing transfer allowance for a complete answer,
                // including the visible pending rows and the SQL transfer.
                let mut remaining = read.maximum.checked_sub(1024).ok_or(StoreError::Capacity)?;
                for row in overlay.values().flatten() {
                    remaining = remaining
                        .checked_sub(row.retained_bytes().ok_or(StoreError::Capacity)?)
                        .ok_or(StoreError::Capacity)?;
                }
                grow(
                    &mut read.custody,
                    read.ids
                        .len()
                        .checked_mul(size_of::<InstalledRow>() + size_of::<&str>())
                        .ok_or(StoreError::Capacity)?,
                )?;
                let ids = read
                    .ids
                    .iter()
                    .filter(|id| !overlay.contains_key(*id))
                    .map(String::as_str)
                    .collect::<Vec<_>>();
                let mut rows = Vec::with_capacity(read.ids.len());
                if !ids.is_empty() {
                    let table = store
                        .schema
                        .tables
                        .iter()
                        .find(|table| table.name == TABLE)
                        .ok_or(StoreError::Schema)?;
                    let mut sql = String::from("SELECT ");
                    append_current_record_fields(&mut sql, table, "");
                    sql.push_str(
                        " FROM mind_appraisals WHERE world_id=$1 AND parent_id=$2 AND id=ANY($3::text[])",
                    );
                    let (_wire, durable) = admitted_query_bounded(
                        tx,
                        &sql,
                        &[&read.world, &read.parent, &ids],
                        &store.budget,
                        Some(&mut remaining),
                    )
                    .await?;
                    for sql_row in durable {
                        let row = installed_row(table, sql_row)?;
                        grow(
                            &mut read.custody,
                            row.retained_bytes().ok_or(StoreError::Capacity)?,
                        )?;
                        rows.push(row);
                    }
                }
                drop(ids);
                rows.extend(overlay.into_values().flatten());
                rows.sort_unstable_by(|a, b| a.position.cmp(&b.position).then(a.id.cmp(&b.id)));
                drop(read.ids);
                drop(read.parent);
                drop(read.world);
                drop(read.generation);
                let retained = rows
                    .iter()
                    .try_fold(rows.capacity() * size_of::<InstalledRow>(), |bytes, row| {
                        bytes.checked_add(row.retained_bytes()?)
                    })
                    .ok_or(StoreError::Capacity)?;
                read.custody
                    .resize(retained)
                    .map_err(|_| StoreError::Capacity)?;
                RuntimeProviderInput::appraisal_outcomes(
                    read.binding,
                    rows,
                    read.custody,
                    &store.budget,
                )
                .map_err(|_| StoreError::Capacity)
            })
        })
        .await
    }
}

fn capture_overlay(
    changes: &ChangedRows,
    parent: &str,
    ids: &BTreeSet<String>,
    custody: &mut ByteReservation,
) -> StoreResult<Overlay> {
    let removals = |table| {
        changes
            .deletes
            .get(table)
            .into_iter()
            .flatten()
            .chain(changes.expired.get(table).into_iter().flatten())
    };
    if removals("mind_appraisals_owners").any(|id| id == parent) {
        return Err(StoreError::StaleCut);
    }
    let mut rows = Overlay::new();
    for id in removals(TABLE).filter(|id| ids.contains(*id)) {
        grow(custody, id.len() + size_of::<InstalledRow>() + 128)?;
        rows.insert(id.clone(), None);
    }
    for row in changes.writes.get(TABLE).into_iter().flatten() {
        if !ids.contains(&row.id) {
            continue;
        }
        if row.parent != parent {
            return Err(StoreError::InvalidRecord);
        }
        grow(custody, row.id.len() + size_of::<InstalledRow>() + 128)?;
        rows.insert(row.id.clone(), Some(retain_pending_row(row, custody)?));
    }
    Ok(rows)
}

fn grow(custody: &mut ByteReservation, bytes: usize) -> StoreResult<()> {
    custody
        .resize(
            custody
                .bytes()
                .checked_add(bytes)
                .ok_or(StoreError::Capacity)?,
        )
        .map_err(|_| StoreError::Capacity)
}
