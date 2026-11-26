//! A protected forgetting transaction updates the actor's current constraints
//! and the personal projections of precisely the sources the native edit
//! removed. Other observers keep their separate permitted account.

use super::checkpoint::{AcceptedPrivacy, validate_privacy};
use super::read::admitted_query;
use super::{PrefixProjection, Store, StoreError, StoreResult};
use indexmap::IndexMap;
use openlegend_simulation::encoding::{json_record, json_record_len};
use openlegend_simulation::experience::PersonalSourceKind;
use openlegend_simulation::host::ByteReservation;
use openlegend_simulation::records::{ChangedRows, SaveRows, SqlCell};
use openlegend_simulation::runtime::{RuntimeHistory, RuntimePrivacyEdit};
use std::mem::size_of;
use tokio_postgres::Transaction;

const AWARENESS: &str = "mind_awareness";
const MEMORY: &str = "mind_memories";
const SUMMARY: &str = "mind_summaries";

pub(crate) struct PreparedPrivacyEdit {
    actor_id: String,
    forgotten: Vec<String>,
    corrections: IndexMap<String, String>,
    invalidated: Vec<String>,
    principal: Option<String>,
    base_cut: u64,
    rewritten_source: Option<(PersonalSourceKind, String)>,
    _custody: ByteReservation,
}

impl PreparedPrivacyEdit {
    pub(crate) fn new(
        store: &Store,
        edit: RuntimePrivacyEdit<'_>,
        changes: &ChangedRows,
        history: &RuntimeHistory,
        rewritten_source: Option<(PersonalSourceKind, &str)>,
    ) -> StoreResult<Self> {
        let principal = history.story_principal(edit.actor_id);
        let bytes = edit
            .forgotten
            .iter()
            .map(String::as_str)
            .chain(
                edit.corrections
                    .iter()
                    .flat_map(|(id, value)| [id.as_str(), value.as_str()]),
            )
            .chain(edit.invalidated_ids())
            .chain(principal)
            .chain(rewritten_source.map(|(_, id)| id))
            .chain(std::iter::once(edit.actor_id))
            .try_fold(size_of::<Self>(), |used, value| {
                used.checked_add(value.len())?.checked_add(128)
            })
            .ok_or(StoreError::Capacity)?;
        let custody = store
            .budget
            .reserve(bytes)
            .map_err(|_| StoreError::Capacity)?;
        if history.originals().next().is_some() || history.accounts().next().is_some() {
            return Err(StoreError::DerivedProjectionRequired);
        }
        let projection = Self {
            actor_id: edit.actor_id.to_owned(),
            forgotten: edit.forgotten.to_vec(),
            corrections: edit.corrections.clone(),
            invalidated: edit.invalidated_ids().map(str::to_owned).collect(),
            principal: principal.map(str::to_owned),
            base_cut: history.base_cut(),
            rewritten_source: rewritten_source.map(|(kind, id)| (kind, id.to_owned())),
            _custody: custody,
        };
        projection.check_rows(changes)?;
        Ok(projection)
    }

    fn check_rows(&self, changes: &ChangedRows) -> StoreResult<()> {
        // A protected edit may only write the one selected canonical replacement.
        for table in [AWARENESS, MEMORY, SUMMARY] {
            let rows = changes.writes.get(table).map_or(&[][..], Vec::as_slice);
            let expected = self
                .rewritten_source
                .as_ref()
                .filter(|(kind, _)| kind.table() == table);
            match (expected, rows) {
                (None, []) => (),
                (Some((_, id)), [row]) if !row.create && row.id == *id => (),
                _ => return Err(StoreError::DerivedProjectionRequired),
            }
        }
        Ok(())
    }

    pub(crate) fn projection<'a>(&'a self, store: &'a Store) -> PrivacyProjection<'a> {
        PrivacyProjection { edit: self, store }
    }
}

pub(crate) struct PrivacyProjection<'a> {
    edit: &'a PreparedPrivacyEdit,
    store: &'a Store,
}

impl PrefixProjection for PrivacyProjection<'_> {
    async fn before_records(
        &self,
        _transaction: &Transaction<'_>,
        rows: &SaveRows,
        _revision: u64,
    ) -> StoreResult<()> {
        if self.edit.base_cut.checked_add(1) != Some(rows.through_cut) {
            return Err(StoreError::StaleCut);
        }
        self.edit.check_rows(&rows.changes)
    }

    async fn after_records(
        &self,
        transaction: &Transaction<'_>,
        rows: &SaveRows,
        _revision: u64,
    ) -> StoreResult<()> {
        self.write_ledger(transaction, &rows.world_id).await?;
        self.remove_sources(transaction, rows).await?;
        Ok(())
    }
}

impl PrivacyProjection<'_> {
    async fn write_ledger(&self, tx: &Transaction<'_>, world: &str) -> StoreResult<()> {
        let key = format!("integration:privacy-ledger:{world}");
        let vectors = format!("integration:vectors:{world}:{}", self.edit.actor_id);
        let context = json_record(&[world, self.edit.actor_id.as_str()])
            .map_err(|_| StoreError::InvalidRecord)?;
        let compaction = format!("integration:conversation-compaction:{context}");
        let (_wire, rows) = admitted_query(
            tx,
            "SELECT value FROM meta WHERE key=$1 FOR UPDATE",
            &[&key],
            &self.store.budget,
        )
        .await?;
        let prior = rows
            .first()
            .map(|row| row.try_get::<_, &str>(0))
            .transpose()?;
        let additional = self.edit._custody.bytes();
        let work = match prior {
            Some(value) => SqlCell::json_decode_bound(value).ok_or(StoreError::InvalidRecord)?,
            None => 0,
        }
        .checked_add(additional)
        .ok_or(StoreError::Capacity)?;
        let mut ownership = self
            .store
            .budget
            .reserve(work)
            .map_err(|_| StoreError::Capacity)?;
        let mut ledger = match prior {
            Some(value) => serde_json::from_str::<AcceptedPrivacy>(value)
                .map_err(|_| StoreError::InvalidRecord)?,
            None => AcceptedPrivacy {
                forgotten: IndexMap::new(),
                corrections: IndexMap::new(),
            },
        };
        validate_privacy(&ledger)?;
        let actor = &self.edit.actor_id;
        let forgotten = &self.edit.forgotten;
        let corrections = &self.edit.corrections;
        if ledger
            .forgotten
            .get(actor)
            .is_some_and(|prior| prior.iter().any(|id| !forgotten.contains(id)))
            || ledger.corrections.get(actor).is_some_and(|prior| {
                prior
                    .keys()
                    .any(|id| !forgotten.contains(id) && !corrections.contains_key(id))
            })
        {
            return Err(StoreError::InvalidRecord);
        }
        ledger.forgotten.insert(actor.clone(), forgotten.clone());
        ledger
            .corrections
            .insert(actor.clone(), corrections.clone());
        let encoded = json_record_len(&ledger).map_err(|_| StoreError::InvalidRecord)?;
        let work = encoded
            .checked_mul(3)
            .and_then(|n| n.checked_add(work))
            .ok_or(StoreError::Capacity)?;
        ownership.resize(work).map_err(|_| StoreError::Capacity)?;
        let encoded = json_record(&ledger).map_err(|_| StoreError::InvalidRecord)?;
        tx.execute(
            "INSERT INTO meta(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            &[&key,&encoded],
        ).await?;
        crate::lab::scenario::record_privacy(self.store, tx, &encoded).await?;
        tx.execute(
            "DELETE FROM meta WHERE key IN ($1,$2)",
            &[&vectors, &compaction],
        )
        .await?;
        Ok(())
    }

    async fn remove_sources(&self, tx: &Transaction<'_>, rows: &SaveRows) -> StoreResult<()> {
        let world = rows.world_id.as_str();
        let actor = self.edit.actor_id.as_str();
        let sources = self.edit.invalidated.as_slice();
        let ids = |table| {
            rows.changes
                .deletes
                .get(table)
                .map_or(&[][..], Vec::as_slice)
        };
        let awareness = ids(AWARENESS);
        let memories = ids(MEMORY);
        let summaries = ids(SUMMARY);
        let wire = sources
            .iter()
            .chain(awareness)
            .chain(memories)
            .chain(summaries)
            .try_fold(4096usize, |n, id| n.checked_add(id.len())?.checked_add(64))
            .and_then(|n| n.checked_mul(3))
            .ok_or(StoreError::Capacity)?;
        let _wire = self
            .store
            .budget
            .reserve(wire)
            .map_err(|_| StoreError::Capacity)?;
        // A dependent source can still be independently retained. Withdraw
        // its historical grant only if the accepted edit actually forgot it.
        let forgotten: Vec<&str> = sources
            .iter()
            .filter(|id| self.edit.forgotten.contains(id))
            .map(String::as_str)
            .collect();
        tx.execute(
            "WITH removed AS MATERIALIZED (
               SELECT id,source_kind FROM recall_sources WHERE world_id=$1 AND actor_id=$2
               AND ((source_kind='awareness' AND record_id=ANY($4::text[]))
                 OR (source_kind='memory' AND record_id=ANY($5::text[]))
                 OR (source_kind='summary' AND record_id=ANY($6::text[])))
             ), discarded_sources AS (
               DELETE FROM recall_sources r USING removed d WHERE r.world_id=$1 AND r.actor_id=$2
                 AND r.id=d.id AND r.source_kind=d.source_kind
             ), discarded_dependencies AS (
               DELETE FROM mind_source_dependencies r USING removed d WHERE r.world_id=$1 AND r.actor_id=$2
                 AND r.derived_id=d.id AND r.derived_kind=d.source_kind
             ), discarded_lexical AS (
               DELETE FROM memory_lexical_documents r USING removed d WHERE r.world_id=$1 AND r.actor_id=$2
                 AND r.id=d.id AND r.source_kind=d.source_kind
             ), discarded_lexical_work AS (
               DELETE FROM memory_lexical_pending r USING removed d WHERE r.world_id=$1 AND r.actor_id=$2
                 AND r.id=d.id AND r.source_kind=d.source_kind AND r.generation=$7
                 RETURNING r.bytes
             ), lexical_coverage AS (
               UPDATE memory_lexical_progress SET
                 pending_rows=greatest(0,pending_rows-(SELECT count(*) FROM discarded_lexical_work)),
                 pending_bytes=greatest(0,pending_bytes-coalesce((SELECT sum(bytes) FROM discarded_lexical_work),0))
               WHERE world_id=$1 AND generation=$7 AND EXISTS (SELECT 1 FROM discarded_lexical_work)
             ), discarded_annotations AS (
               DELETE FROM mind_source_annotations a WHERE a.world_id=$1 AND a.actor_id=$2
                 AND (a.source_id=ANY($8::text[]) OR EXISTS (
                   SELECT 1 FROM removed d WHERE d.id=a.source_id
                   AND (a.source_kind=d.source_kind OR (d.source_kind='awareness' AND a.source_kind='perspective'))))
             ), discarded_vectors AS (
               DELETE FROM memory_vectors r WHERE r.world_id=$1 AND r.actor_id=$2
                 AND (r.source_id=ANY($3::text[]) OR r.source_id IN (SELECT id FROM removed))
             ), discarded_index_work AS (
               DELETE FROM memory_index_queue r WHERE r.world_id=$1 AND r.actor_id=$2
                 AND (r.source_id=ANY($3::text[]) OR r.source_id IN (SELECT id FROM removed))
             ), discarded_vector_cache AS (
               DELETE FROM memory_vector_cache r WHERE r.world_id=$1 AND r.actor_id=$2
                 AND (r.source_id=ANY($3::text[]) OR r.source_id IN (SELECT id FROM removed))
             ), discarded_query AS (
               DELETE FROM meta WHERE key=$9
             ) DELETE FROM history_perspectives r WHERE r.world_id=$1 AND r.actor_id=$2
               AND (r.event_id=ANY($8::text[]) OR r.event_id IN (SELECT id FROM removed WHERE source_kind='awareness'))",
            &[&world,&actor,&sources,&awareness,&memories,&summaries,&rows.generation,&forgotten,
              &super::recall::semantic::query_key(world, actor)?],
        ).await?;
        if let Some(principal) = &self.edit.principal {
            self.store
                .revoke_story_sources(tx, world, principal, &forgotten)
                .await?;
        }
        Ok(())
    }
}
