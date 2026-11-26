//! Exact sparse-support replacement for a remembered-place SQL cut. Keep
//! each detached/suffix owner independent until the reader sees its snapshot.

use super::{Store, StoreError, StoreResult, row_owner, sql_ordinal};
use openlegend_simulation::encoding::{json_record, json_record_len};
use openlegend_simulation::experience::{
    ExperienceError, KnownPlaceCapsule, OwnedPlaceCapsules, personal_fact_alias,
    stored_support_place_capsules,
};
use openlegend_simulation::host::{ByteBudget, ByteReservation};
use openlegend_simulation::reception::{EvidenceFamily, ObserverLife, SourceRevision};
use openlegend_simulation::records::{ChangedRows, InstalledRow, SqlCell};
use serde::Serialize;
use std::collections::BTreeMap;
use tokio_postgres::Transaction;
use tokio_postgres::types::ToSql;

const SUPPORT_TABLE: &str = "mind_temporal_supports";

pub(super) struct PendingSupports {
    rows: BTreeMap<String, Option<SupportPlacement>>,
    _custody: ByteReservation,
}

struct SupportPlacement {
    actor: String,
    owner: String,
    revision: String,
    capsules: OwnedPlaceCapsules,
}

impl PendingSupports {
    pub(super) fn prepare(store: &Store, actor: &str, changes: &ChangedRows) -> StoreResult<Self> {
        let writes = changes
            .writes
            .get(SUPPORT_TABLE)
            .map_or(&[][..], Vec::as_slice);
        let deletes = changes
            .deletes
            .get(SUPPORT_TABLE)
            .map_or(&[][..], Vec::as_slice);
        Self::from_rows(
            store,
            Some(actor),
            writes
                .iter()
                .map(|row| (row.id.as_str(), row.payload.as_str(), row.extra.as_slice())),
            deletes,
        )
    }

    fn from_rows<'a>(
        store: &Store,
        actor: Option<&str>,
        writes: impl ExactSizeIterator<Item = (&'a str, &'a str, &'a [SqlCell])>,
        deletes: &[String],
    ) -> StoreResult<Self> {
        let mut result = Self {
            rows: BTreeMap::new(),
            _custody: store.budget.reserve(0).map_err(|_| StoreError::Capacity)?,
        };
        if writes.len() == 0 && deletes.is_empty() {
            return Ok(result);
        }
        let table = store
            .schema
            .tables
            .iter()
            .find(|table| table.name == SUPPORT_TABLE)
            .ok_or(StoreError::Schema)?;
        let column = |name: &str| {
            table
                .columns
                .iter()
                .position(|column| column.name == name)
                .ok_or(StoreError::Schema)
        };
        let (actor_column, source_column, revision_column) = (
            column("actor_id")?,
            column("source_id")?,
            column("account_revision")?,
        );
        for (record, payload, extra) in writes {
            let value = |index| extra.get(index).and_then(SqlCell::as_str);
            let owner_actor = value(actor_column).ok_or(StoreError::InvalidRecord)?;
            if actor.is_some_and(|actor| owner_actor != actor) {
                continue;
            }
            let owner = value(source_column).ok_or(StoreError::InvalidRecord)?;
            let revision = value(revision_column).ok_or(StoreError::InvalidRecord)?;
            let bytes = record
                .len()
                .checked_add(owner.len())
                .and_then(|bytes| bytes.checked_add(owner_actor.len()))
                .and_then(|bytes| bytes.checked_add(revision.len()))
                .ok_or(StoreError::Capacity)?;
            result.fund(bytes)?;
            let capsules = stored_support_place_capsules(payload, owner_actor, &store.budget)
                .map_err(|error| match error {
                    ExperienceError::Capacity => StoreError::Capacity,
                    _ => StoreError::InvalidRecord,
                })?;
            result.rows.insert(
                record.to_owned(),
                Some(SupportPlacement {
                    actor: owner_actor.to_owned(),
                    owner: owner.to_owned(),
                    revision: revision.to_owned(),
                    capsules,
                }),
            );
        }
        for id in deletes {
            if let Some(actor) = actor
                && row_owner(&store.budget, id, 4, actor)?
            {
                result.fund(id.len())?;
                result.rows.insert(id.clone(), None);
            }
        }
        Ok(result)
    }

    fn fund(&mut self, strings: usize) -> StoreResult<()> {
        // Current B-tree node, permit and three small owned identifiers.
        self._custody
            .resize(
                self._custody
                    .bytes()
                    .checked_add(strings)
                    .and_then(|bytes| bytes.checked_add(2048))
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)
    }
}

pub(super) struct SqlSupports<'a> {
    hidden: Vec<&'a str>,
    owner: Vec<&'a str>,
    revision: Vec<&'a str>,
    place: Vec<&'a str>,
    at: Vec<f64>,
    order: Vec<i64>,
    event: Vec<Option<&'a str>>,
    native: Vec<&'a str>,
    alias: Vec<String>,
    body: Vec<String>,
    _custody: ByteReservation,
}

// canonicalJson([source, ordinal]) has this fixed order for the
// current finite EvidenceSource schema keys.
#[derive(Serialize)]
struct CapsuleKey<'a> {
    family: EvidenceFamily,
    id: &'a str,
    observer: &'a ObserverLife,
    revision: &'a SourceRevision,
}
fn capsule_key_input(capsule: &KnownPlaceCapsule) -> (CapsuleKey<'_>, u64) {
    let source = &capsule.source;
    (
        CapsuleKey {
            family: source.family,
            id: &source.id,
            observer: &source.observer,
            revision: &source.revision,
        },
        capsule.facet_ordinal,
    )
}
pub(in crate::store) fn place_capsule_key(capsule: &KnownPlaceCapsule) -> StoreResult<String> {
    json_record(&capsule_key_input(capsule)).map_err(|_| StoreError::InvalidRecord)
}

impl Store {
    /// Rebuild only the derived place capsules of canonical supports actually
    /// written by this prefix. Canonical deletion cascades close its old rows.
    pub(in crate::store) async fn project_support_places(
        &self,
        transaction: &Transaction<'_>,
        world: &str,
        changes: &ChangedRows,
    ) -> StoreResult<()> {
        let Some(writes) = changes.writes.get(SUPPORT_TABLE) else {
            return Ok(());
        };
        for chunk in writes.chunks(128) {
            let pending = PendingSupports::from_rows(
                self,
                None,
                chunk
                    .iter()
                    .map(|row| (row.id.as_str(), row.payload.as_str(), row.extra.as_slice())),
                &[],
            )?;
            self.place_support_rows(transaction, world, &pending)
                .await?;
        }
        Ok(())
    }

    /// Rebuild place placement from all actual installed checkpoint support
    /// bodies. Each page borrows the current-format checkpoint storage.
    pub(in crate::store) async fn project_checkpoint_support_places(
        &self,
        tx: &Transaction<'_>,
        world: &str,
        rows: &[InstalledRow],
    ) -> StoreResult<()> {
        for chunk in rows.chunks(128) {
            let pending = PendingSupports::from_rows(
                self,
                None,
                chunk
                    .iter()
                    .map(|row| (row.id.as_str(), row.payload.as_str(), row.extra.as_slice())),
                &[],
            )?;
            self.place_support_rows(tx, world, &pending).await?;
        }
        Ok(())
    }

    async fn place_support_rows(
        &self,
        transaction: &Transaction<'_>,
        world: &str,
        pending: &PendingSupports,
    ) -> StoreResult<()> {
        let mut output = SqlSupports::prepare(&self.budget, None, pending)?;
        let mut key = Vec::with_capacity(output.body.len());
        let mut actor = Vec::with_capacity(output.body.len());
        let mut record = Vec::with_capacity(output.body.len());
        for (id, placement) in &pending.rows {
            let Some(placement) = placement else {
                continue;
            };
            for capsule in placement.capsules.capsules() {
                let input = capsule_key_input(capsule);
                let bound = json_record_len(&input).map_err(|_| StoreError::InvalidRecord)?;
                output.fund(
                    bound
                        .checked_mul(6)
                        .and_then(|bytes| bytes.checked_add(256))
                        .ok_or(StoreError::Capacity)?,
                )?;
                key.push(json_record(&input).map_err(|_| StoreError::InvalidRecord)?);
                actor.push(placement.actor.as_str());
                record.push(id.as_str());
            }
        }
        transaction.execute(
            "DELETE FROM recall_place_capsules WHERE world_id=$1 AND support_record_id=ANY($2::text[])",
            &[&world, &output.hidden],
        ).await?;
        if !record.is_empty() {
            // Reuse the actual prepared support arrays; the saved key and
            // scope are the only fields for durable placement alone.
            transaction.execute(
                "INSERT INTO recall_place_capsules
                   (world_id,actor_id,owner_id,owner_kind,owner_revision,place_id,observed_at,observed_order,
                    source_event_id,native_source_id,fact_alias,capsule_key,capsule,account_owner_kind,support_record_id)
                 SELECT $1,q.actor,q.owner,'support',q.revision,q.place,q.at,q.position,q.event,q.native,q.alias,q.key,q.body,NULL,q.record
                 FROM unnest($2::text[],$3::text[],$4::text[],$5::double precision[],$6::bigint[],$7::text[],
                             $8::text[],$9::text[],$10::text[],$11::text[],$12::text[],$13::text[])
                 q(owner,revision,place,at,position,event,native,alias,body,key,actor,record)",
                &[&world, &output.owner, &output.revision, &output.place, &output.at, &output.order,
                  &output.event, &output.native, &output.alias, &output.body, &key, &actor, &record],
            ).await?;
        }
        Ok(())
    }
}

impl<'a> SqlSupports<'a> {
    /// Prepare only pending supports that still precede the fixed SQL snapshot.
    /// The exact current bodies and non-transport parts remain separately owned.
    pub(super) fn prepare(
        budget: &ByteBudget,
        detached: Option<&'a PendingSupports>,
        suffix: &'a PendingSupports,
    ) -> StoreResult<Self> {
        let count = detached
            .map_or(0, |old| old.rows.len())
            .checked_add(suffix.rows.len())
            .ok_or(StoreError::Capacity)?;
        let custody = budget
            .reserve(count.checked_mul(128).ok_or(StoreError::Capacity)?)
            .map_err(|_| StoreError::Capacity)?;
        let pending = detached
            .into_iter()
            .flat_map(|old| {
                old.rows
                    .iter()
                    .filter(|(id, _)| !suffix.rows.contains_key(*id))
            })
            .chain(&suffix.rows);
        let mut result = Self {
            hidden: Vec::with_capacity(count),
            owner: Vec::new(),
            revision: Vec::new(),
            place: Vec::new(),
            at: Vec::new(),
            order: Vec::new(),
            event: Vec::new(),
            native: Vec::new(),
            alias: Vec::new(),
            body: Vec::new(),
            _custody: custody,
        };
        for (id, placement) in pending {
            result.hidden.push(id);
            // The input PostgreSQL array owns another copy through transfer.
            result.fund(id.len().checked_mul(4).ok_or(StoreError::Capacity)?)?;
            let Some(placement) = placement else {
                continue;
            };
            for capsule in placement.capsules.capsules() {
                result.add(placement, capsule)?;
            }
        }
        Ok(result)
    }

    fn add(
        &mut self,
        placement: &'a SupportPlacement,
        capsule: &'a KnownPlaceCapsule,
    ) -> StoreResult<()> {
        let encoded = json_record_len(capsule).map_err(|_| StoreError::InvalidRecord)?;
        self.fund(
            encoded
                .checked_mul(10)
                .and_then(|bytes| bytes.checked_add(2048))
                .ok_or(StoreError::Capacity)?,
        )?;
        self.owner.push(&placement.owner);
        self.revision.push(&placement.revision);
        self.place.push(&capsule.place_id);
        self.at.push(capsule.observed_at);
        self.order.push(sql_ordinal(capsule.observed_order)?);
        self.event.push(capsule.source_event_id.as_deref());
        self.native.push(&capsule.source.id);
        self.alias.push(
            personal_fact_alias(&capsule.source.id, capsule.facet_ordinal)
                .map_err(|_| StoreError::InvalidRecord)?,
        );
        self.body
            .push(json_record(capsule).map_err(|_| StoreError::InvalidRecord)?);
        Ok(())
    }

    fn fund(&mut self, bytes: usize) -> StoreResult<()> {
        self._custody
            .resize(
                self._custody
                    .bytes()
                    .checked_add(bytes)
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)
    }

    pub(super) fn has_changes(&self) -> bool {
        !self.hidden.is_empty()
    }

    pub(super) fn parameters(&self) -> [&(dyn ToSql + Sync); 10] {
        [
            &self.hidden,
            &self.owner,
            &self.revision,
            &self.place,
            &self.at,
            &self.order,
            &self.event,
            &self.native,
            &self.alias,
            &self.body,
        ]
    }
}
