//! Exact personal and receipt witnesses for the real NPC source cursor.
//! This selects storage bodies only. Native applies the original observer,
//! chronology, eligibility and current privacy checks before any disclosure.

use super::read::admitted_query;
use super::schema::Table;
use super::{Store, StoreError, StoreResult, durable_head};
use openlegend_simulation::encoding::{json_record, sha256_hex};
use openlegend_simulation::experience::{PersonalSourceKind as Kind, PersonalSourceRef};
use openlegend_simulation::geometry::GeometryBinding;
use openlegend_simulation::host::ByteReservation;
use openlegend_simulation::records::{ChangedRow, ChangedRows, InstalledRow, SqlCell};
use openlegend_simulation::runtime::{
    NpcArchivedSourceRow, NpcPersonalSourceRow, NpcSourceRows, RuntimeNpcSourceRead,
    RuntimeProviderInput,
};
use serde::Serialize;
use std::collections::{BTreeMap, BTreeSet};
use std::sync::Arc;
use tokio_postgres::Transaction;

mod pending;
mod receipts;

const KINDS: [Kind; 3] = [Kind::Awareness, Kind::Memory, Kind::Summary];

pub(crate) struct PreparedNpcSources {
    binding: GeometryBinding,
    world: String,
    generation: String,
    actor: String,
    serial: u64,
    revision: u64,
    in_flight_through: Option<u64>,
    maximum: usize,
    selection: Selection,
    detached: pending::Rows,
    suffix: pending::Rows,
    custody: ByteReservation,
}

struct Selection {
    personal: Vec<PersonalSourceRef>,
    parents: BTreeSet<String>,
    receipts: Vec<Coordinate>,
    consolidation_job: Option<String>,
}

#[derive(Serialize)]
struct Coordinate {
    ordinal: usize,
    life: u64,
    epoch: String,
    batch: u64,
    entry: u64,
}

#[derive(Serialize)]
struct ArchiveKey<'a> {
    id: &'a str,
    revision: &'a str,
}

struct Read<'a, 'tx> {
    store: &'a Arc<Store>,
    transaction: &'a Transaction<'tx>,
    world: &'a str,
    actor: &'a str,
    pending: pending::Overlay<'a>,
    custody: &'a mut ByteReservation,
}

impl Store {
    /// Pin only the actual actor's requested pending personal and temporal
    /// records before the world lane hands off this I/O. Source output is a
    /// distinct retained owner and never relies on an in-flight SQL prefix.
    pub(crate) fn prepare_npc_sources(
        &self,
        read: RuntimeNpcSourceRead<'_>,
    ) -> StoreResult<PreparedNpcSources> {
        let (detached, suffix) = read.pending_rows();
        if read.maximum_transfer_bytes == 0
            || detached.is_some() != read.in_flight_through.is_some()
        {
            return Err(StoreError::StaleCut);
        }
        let request = read.selection;
        let bytes = request
            .personal
            .iter()
            .try_fold(4096usize, |n, item| {
                n.checked_add(item.reference.id.len())?
                    .checked_add(item.reference.revision.len())?
                    .checked_add(item.through.as_ref().map_or(0, |parent| parent.id.len()))?
                    .checked_add(384)
            })
            .and_then(|bytes| {
                request.receipts.iter().try_fold(bytes, |n, item| {
                    n.checked_add(item.locator.epoch.len())?.checked_add(256)
                })
            })
            .and_then(|n| n.checked_add(read.world_id.len()))
            .and_then(|n| n.checked_add(read.generation.len()))
            .and_then(|n| n.checked_add(read.actor_id.len()))
            .and_then(|n| n.checked_add(request.consolidation_job.as_ref().map_or(0, String::len)))
            .ok_or(StoreError::Capacity)?;
        let mut custody = self
            .budget
            .reserve(bytes.checked_mul(4).ok_or(StoreError::Capacity)?)
            .map_err(|_| StoreError::Capacity)?;
        let mut selection = Selection {
            personal: request
                .personal
                .iter()
                .map(|item| item.reference.clone())
                .collect(),
            parents: request
                .personal
                .iter()
                .filter_map(|item| item.through.as_ref())
                .map(|parent| parent.id.clone())
                .collect(),
            receipts: Vec::with_capacity(request.receipts.len()),
            consolidation_job: request.consolidation_job.clone(),
        };
        for (ordinal, item) in request.receipts.iter().enumerate() {
            if item.locator.actor_id != read.actor_id {
                return Err(StoreError::InvalidRecord);
            }
            selection.receipts.push(Coordinate {
                ordinal,
                life: item.locator.physical_life,
                epoch: item.locator.epoch.clone(),
                batch: item.locator.batch_order,
                entry: item.locator.entry_index,
            });
        }
        let mut prefix_overlay = pending::Rows::default();
        let mut suffix_overlay = pending::Rows::default();
        if let Some(detached) = detached {
            prefix_overlay.merge(self, read.actor_id, &selection, detached, &mut custody)?;
            if !selection.receipts.is_empty() {
                prefix_overlay.values_from(self, detached, &mut custody)?;
            }
            prefix_overlay.archives(
                read.actor_id,
                &selection,
                read.pending_versions(true),
                &mut custody,
            )?;
        }
        suffix_overlay.merge(self, read.actor_id, &selection, suffix, &mut custody)?;
        if let Some(temporal) = read.temporal {
            suffix_overlay.merge(self, read.actor_id, &selection, temporal, &mut custody)?;
            suffix_overlay.values_from(self, suffix, &mut custody)?;
            suffix_overlay.values_from(self, temporal, &mut custody)?;
        }
        suffix_overlay.archives(
            read.actor_id,
            &selection,
            read.pending_versions(false),
            &mut custody,
        )?;
        Ok(PreparedNpcSources {
            binding: read.binding,
            world: read.world_id.to_owned(),
            generation: read.generation.to_owned(),
            actor: read.actor_id.to_owned(),
            serial: read.read_serial,
            revision: read.durable_revision,
            in_flight_through: read.in_flight_through,
            maximum: read.maximum_transfer_bytes,
            selection,
            detached: prefix_overlay,
            suffix: suffix_overlay,
            custody,
        })
    }

    /// Complete one indexed SQL snapshot and hand the admitted typed rows to
    /// the existing cursor. A passed head is usable only if it represents the
    /// exact detached owner held by this reader; the suffix stays immutable.
    pub(crate) async fn read_npc_sources(
        self: &Arc<Self>,
        prepared: PreparedNpcSources,
    ) -> StoreResult<RuntimeProviderInput> {
        let store = self.clone();
        self.read_operational(move |transaction| {
            Box::pin(async move {
                let head = durable_head(transaction)
                    .await?
                    .ok_or(StoreError::StaleCut)?;
                if head.world_id != prepared.world || head.generation != prepared.generation {
                    return Err(StoreError::StaleCut);
                }
                let detached = match head.revision.checked_sub(prepared.revision) {
                    Some(0) => Some(&prepared.detached),
                    Some(1) if prepared.in_flight_through.is_some() => None,
                    _ => return Err(StoreError::StaleCut),
                };
                let mut answer = store
                    .budget
                    .reserve(2048)
                    .map_err(|_| StoreError::Capacity)?;
                let mut read = Read {
                    store: &store,
                    transaction,
                    world: &prepared.world,
                    actor: &prepared.actor,
                    pending: pending::Overlay {
                        detached,
                        suffix: &prepared.suffix,
                    },
                    custody: &mut answer,
                };
                let (pages, values) = read.receipts(&prepared.selection.receipts).await?;
                let parents = read.parents(&prepared.selection.parents).await?;
                let personal = read.personal(&prepared.selection.personal).await?;
                let duplicate_summary = match &prepared.selection.consolidation_job {
                    None => None,
                    Some(job) => Some(read.duplicate_summary(job).await?),
                };
                if answer.bytes() > prepared.maximum {
                    return Err(StoreError::Capacity);
                }
                let rows = NpcSourceRows {
                    pages,
                    values,
                    personal,
                    parents,
                    duplicate_summary,
                };
                RuntimeProviderInput::npc_sources(
                    prepared.binding,
                    prepared.serial,
                    rows,
                    answer,
                    &store.budget,
                )
                .map_err(|_| StoreError::Capacity)
            })
        })
        .await
    }

    fn npc_table(&self, name: &str) -> StoreResult<&Table> {
        self.schema
            .tables
            .iter()
            .find(|table| table.name == name)
            .ok_or(StoreError::Schema)
    }
}

impl Read<'_, '_> {
    async fn current_accounts(
        &mut self,
        kind: Kind,
        ids: &BTreeSet<&str>,
    ) -> StoreResult<BTreeMap<String, InstalledRow>> {
        let mut current = BTreeMap::new();
        let mut missing = Vec::new();
        for id in ids {
            if let Some(pending) = self.pending.personal(kind, id) {
                if let Some(row) = pending {
                    let copied = copy_row(row, self.custody)?;
                    current.insert((*id).to_owned(), copied);
                }
            } else {
                missing.push(record_id(kind, self.actor, id)?);
            }
        }
        if !missing.is_empty() {
            let table = self.store.npc_table(kind.table())?;
            let rows = self
                .store
                .select_current_rows(
                    self.transaction,
                    table,
                    "world_id=$1 AND actor_id=$2 AND id=ANY($3)",
                    &[&self.world, &self.actor, &missing],
                    self.custody,
                )
                .await?;
            for row in rows {
                let source = projected_id(table, &row)?;
                if !ids.contains(source) || current.insert(source.to_owned(), row).is_some() {
                    return Err(StoreError::InvalidRecord);
                }
            }
        }
        Ok(current)
    }

    async fn parents(&mut self, ids: &BTreeSet<String>) -> StoreResult<Vec<InstalledRow>> {
        let ids = ids.iter().map(String::as_str).collect();
        let mut rows = self
            .current_accounts(Kind::Summary, &ids)
            .await?
            .into_values()
            .collect::<Vec<_>>();
        rows.sort_unstable_by(|left, right| {
            (left.position, &left.id).cmp(&(right.position, &right.id))
        });
        Ok(rows)
    }

    async fn personal(
        &mut self,
        selected: &[PersonalSourceRef],
    ) -> StoreResult<Vec<NpcPersonalSourceRow>> {
        grow(
            self.custody,
            selected
                .len()
                .checked_mul(2 * size_of::<NpcPersonalSourceRow>())
                .ok_or(StoreError::Capacity)?,
        )?;
        let mut result = Vec::with_capacity(selected.len());
        for kind in KINDS {
            let group: Vec<_> = selected
                .iter()
                .filter(|source| source.kind == kind)
                .collect();
            if group.is_empty() {
                continue;
            }
            let ids = group.iter().map(|source| source.id.as_str()).collect();
            let mut current = self.current_accounts(kind, &ids).await?;
            let revision: BTreeMap<_, _> = current
                .iter()
                .map(|(id, row)| (id.clone(), sha256_hex(row.payload.as_bytes())))
                .collect();
            let mut remaining = BTreeMap::new();
            for source in &group {
                *remaining.entry(source.id.as_str()).or_insert(0usize) += 1;
            }
            let mut missing = Vec::new();
            let mut archived = BTreeMap::<(String, String), String>::new();
            for source in &group {
                if revision.get(&source.id) == Some(&source.revision) {
                    continue;
                }
                match self.pending.archive(source) {
                    pending::Archived::Removed => {}
                    pending::Archived::Body(body) => {
                        grow(
                            self.custody,
                            body.len()
                                .checked_add(source.id.len())
                                .and_then(|n| n.checked_add(source.revision.len()))
                                .ok_or(StoreError::Capacity)?,
                        )?;
                        archived.insert(
                            (source.id.clone(), source.revision.clone()),
                            body.to_owned(),
                        );
                    }
                    pending::Archived::Durable => missing.push(ArchiveKey {
                        id: &source.id,
                        revision: &source.revision,
                    }),
                }
            }
            if !missing.is_empty() {
                let input = json_record(&missing).map_err(|_| StoreError::InvalidRecord)?;
                let kind = kind_name(kind);
                let (_wire, rows) = admitted_query(
                    self.transaction,
                    "SELECT v.source_id,v.revision,v.payload FROM mind_source_versions v
                     JOIN jsonb_to_recordset($1::text::jsonb) q(id text,revision text)
                     ON v.source_id=q.id AND v.revision=q.revision
                     WHERE v.world_id=$2 AND v.actor_id=$3 AND v.source_kind=$4",
                    &[&input, &self.world, &self.actor, &kind],
                    &self.store.budget,
                )
                .await?;
                for row in &rows {
                    let id: &str = row.try_get(0)?;
                    let revision: &str = row.try_get(1)?;
                    let payload: &str = row.try_get(2)?;
                    grow(
                        self.custody,
                        id.len()
                            .checked_add(revision.len())
                            .and_then(|n| n.checked_add(payload.len()))
                            .ok_or(StoreError::Capacity)?,
                    )?;
                    archived.insert((id.to_owned(), revision.to_owned()), payload.to_owned());
                }
            }
            for source in group {
                let side = remaining
                    .get_mut(source.id.as_str())
                    .ok_or(StoreError::InvalidRecord)?;
                *side = side.checked_sub(1).ok_or(StoreError::InvalidRecord)?;
                let mut current_row = || {
                    if *side == 0 {
                        Ok(current.remove(&source.id))
                    } else {
                        current
                            .get(&source.id)
                            .map(|row| copy_row(row, self.custody))
                            .transpose()
                    }
                };
                if revision.get(&source.id) == Some(&source.revision) {
                    result.push(NpcPersonalSourceRow::Current {
                        kind,
                        row: current_row()?.ok_or(StoreError::InvalidRecord)?,
                    });
                } else if let Some(payload) =
                    archived.remove(&(source.id.clone(), source.revision.clone()))
                {
                    let bytes = self
                        .world
                        .len()
                        .checked_add(self.actor.len())
                        .and_then(|n| n.checked_add(source.id.len()))
                        .and_then(|n| n.checked_add(source.revision.len()))
                        .ok_or(StoreError::Capacity)?;
                    let current = current_row()?;
                    grow(self.custody, bytes)?;
                    result.push(NpcPersonalSourceRow::Archive {
                        archive: NpcArchivedSourceRow {
                            world_id: self.world.to_owned(),
                            actor_id: self.actor.to_owned(),
                            source_kind: kind,
                            source_id: source.id.clone(),
                            revision: source.revision.clone(),
                            payload,
                        },
                        current,
                    });
                }
            }
        }
        Ok(result)
    }

    async fn duplicate_summary(&self, job: &str) -> StoreResult<bool> {
        let prefix = format!("{job}:");
        if self.pending.has_summary_job(&prefix) {
            return Ok(true);
        }
        let removed = self.pending.summary_deletions();
        let result = self
            .transaction
            .query_one(
                "SELECT EXISTS(SELECT 1 FROM mind_summaries WHERE world_id=$1 AND actor_id=$2
             AND left(source_id,length($3::text))=$3 AND NOT(source_id=ANY($4)))",
                &[&self.world, &self.actor, &prefix, &removed],
            )
            .await?;
        Ok(result.try_get(0)?)
    }
}

fn kind_name(kind: Kind) -> &'static str {
    match kind {
        Kind::Awareness => "awareness",
        Kind::Memory => "memory",
        Kind::Summary => "summary",
    }
}

fn record_id(kind: Kind, actor: &str, id: &str) -> StoreResult<String> {
    let sections: &[&str] = match kind {
        Kind::Awareness => &["world", "experience", "awareness", actor, id],
        Kind::Memory => &["world", "memories", actor, id],
        Kind::Summary => &["world", "experience", "summaries", actor, id],
    };
    json_record(sections).map_err(|_| StoreError::InvalidRecord)
}

fn column(table: &Table, name: &str) -> StoreResult<usize> {
    table
        .columns
        .iter()
        .position(|column| column.name == name)
        .ok_or(StoreError::Schema)
}

fn projected_id<'a>(table: &Table, row: &'a InstalledRow) -> StoreResult<&'a str> {
    row.extra
        .get(column(table, "source_id")?)
        .and_then(SqlCell::as_str)
        .ok_or(StoreError::InvalidRecord)
}

fn copy_row(row: &InstalledRow, custody: &mut ByteReservation) -> StoreResult<InstalledRow> {
    let bytes = row.retained_bytes().ok_or(StoreError::Capacity)?;
    grow(
        custody,
        bytes
            .checked_add(size_of::<InstalledRow>() + 128)
            .ok_or(StoreError::Capacity)?,
    )?;
    Ok(row.clone())
}

fn retain(row: &ChangedRow, custody: &mut ByteReservation) -> StoreResult<InstalledRow> {
    if row.write_columns.is_some() {
        return Err(StoreError::StaleCut);
    }
    grow(
        custody,
        row.installed_bytes()
            .ok_or(StoreError::Capacity)?
            .checked_add(size_of::<InstalledRow>() + 192)
            .ok_or(StoreError::Capacity)?,
    )?;
    Ok(InstalledRow {
        id: row.id.clone(),
        parent: row.parent.clone(),
        slot: row.slot.clone(),
        position: row.position,
        payload: row.payload.clone(),
        extra: row.extra.clone(),
    })
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
