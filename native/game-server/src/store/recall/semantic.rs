//! Scoped access to the existing personal-memory index and its durable claims.

use crate::store::{
    CommitError, Store, StoreError, StoreResult, durable_head, read::admitted_query, sql_ordinal,
};
use openlegend_simulation::{
    encoding::{json_record, json_record_len},
    experience::{PersonalSourceKind, PersonalSourceRef},
    host::{ByteBudget, ByteReservation},
};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::{mem::size_of, sync::Arc};
use tokio_postgres::Transaction;

const PAGE: i64 = 32;

pub(crate) struct SemanticScope {
    pub world: String,
    pub generation: String,
    pub actor: String,
    pub model: String,
    pub dimensions: i64,
    pub hard_bytes: u64,
    pub _custody: ByteReservation,
}

pub(crate) struct SemanticPending {
    pub sources: Vec<PersonalSourceRef>,
    pub custody: ByteReservation,
}

pub(crate) struct Embeddings {
    pub values: Vec<Vec<f64>>,
    pub _custody: ByteReservation,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct QueryVector {
    key: String,
    model: String,
    dimensions: i64,
    query: Vec<f64>,
}

pub(crate) struct SemanticQuery {
    pub encoded: String,
    _custody: ByteReservation,
}

impl SemanticQuery {
    pub(crate) fn prepare(
        mut vector: Embeddings,
        dimensions: i64,
        budget: &ByteBudget,
    ) -> StoreResult<Arc<Self>> {
        let query = vector.values.pop().ok_or(StoreError::InvalidRecord)?;
        if !vector.values.is_empty() || query.len() != dimensions as usize {
            return Err(StoreError::InvalidRecord);
        }
        let bytes = json_record_len(&query).map_err(|_| StoreError::InvalidRecord)?;
        let mut custody = budget
            .reserve(size_of::<Self>() + 96 + 2 * bytes)
            .map_err(|_| StoreError::Capacity)?;
        let encoded = json_record(&query).map_err(|_| StoreError::InvalidRecord)?;
        custody
            .resize(size_of::<Self>() + 96 + encoded.capacity())
            .map_err(|_| StoreError::Capacity)?;
        Ok(Arc::new(Self {
            encoded,
            _custody: custody,
        }))
    }
}

#[derive(Serialize)]
struct Pin<'a> {
    id: &'a str,
    kind: PersonalSourceKind,
    revision: &'a str,
}

pub(crate) struct SemanticClaim {
    pub scope: Arc<SemanticScope>,
    pub sources: Vec<PersonalSourceRef>,
    pub pins: String,
    pub _custody: ByteReservation,
}

impl SemanticClaim {
    pub(crate) fn new(
        scope: Arc<SemanticScope>,
        sources: Vec<PersonalSourceRef>,
        mut custody: ByteReservation,
    ) -> StoreResult<Arc<Self>> {
        if sources.is_empty() || sources.len() > PAGE as usize {
            return Err(StoreError::InvalidRecord);
        }
        let bytes = sources
            .iter()
            .try_fold(512usize, |n, source| {
                n.checked_add(
                    source
                        .id
                        .len()
                        .checked_add(source.revision.len())?
                        .checked_mul(12)?,
                )?
                .checked_add(size_of::<Pin<'_>>() + 256)
            })
            .ok_or(StoreError::Capacity)?;
        custody
            .resize(
                custody
                    .bytes()
                    .checked_add(bytes)
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)?;
        let pins = sources
            .iter()
            .map(|source| Pin {
                id: &source.id,
                kind: source.kind,
                revision: &source.revision,
            })
            .collect::<Vec<_>>();
        let pins = json_record(&pins).map_err(|_| StoreError::InvalidRecord)?;
        Ok(Arc::new(Self {
            scope,
            sources,
            pins,
            _custody: custody,
        }))
    }

    pub(crate) async fn current(&self, tx: &Transaction<'_>) -> StoreResult<bool> {
        let scope = &self.scope;
        if !scope.current(tx).await? {
            return Ok(false);
        }
        let count: i64 = tx.query_one(
            "SELECT count(*) FROM jsonb_to_recordset($3::text::jsonb) AS s(id text,kind text,revision text) \
             JOIN recall_sources r ON r.world_id=$1 AND r.actor_id=$2 AND r.id=s.id \
             AND r.source_kind=s.kind AND r.revision=s.revision WHERE r.eligible=1",
            &[&scope.world, &scope.actor, &self.pins],
        ).await?.try_get(0)?;
        Ok(count == self.sources.len() as i64)
    }

    /// Call inside the same transaction that admits spending. A failed
    /// payment cannot consume the source and an uncertain claim cannot retry.
    pub(crate) async fn take(&self, tx: &Transaction<'_>, request: &str) -> StoreResult<bool> {
        if !self.current(tx).await? || self.scope.available(tx).await? == 0 {
            return Ok(false);
        }
        let scope = &self.scope;
        let claimed = tx
            .execute(
                "INSERT INTO memory_index_attempts \
             SELECT $1,$2,$3,s.id,s.revision,$4,$5,$7,'dispatched' \
             FROM jsonb_to_recordset($6::text::jsonb) AS s(id text,revision text) ON CONFLICT DO NOTHING",
                &[
                    &scope.world,
                    &scope.actor,
                    &scope.generation,
                    &scope.model,
                    &scope.dimensions,
                    &self.pins,
                    &request,
                ],
            )
            .await?;
        if claimed != self.sources.len() as u64 {
            return Err(StoreError::StaleCut);
        }
        tx.execute(
            "DELETE FROM memory_index_queue q USING jsonb_to_recordset($5::text::jsonb) AS s(id text,revision text) \
             WHERE q.world_id=$1 AND q.actor_id=$2 AND q.model=$3 AND q.dimensions=$4 \
             AND q.source_id=s.id AND q.source_revision=s.revision",
            &[&scope.world, &scope.actor, &scope.model, &scope.dimensions, &self.pins],
        ).await?;
        Ok(true)
    }
}

pub(crate) fn query_key(world: &str, actor: &str) -> StoreResult<String> {
    Ok(format!(
        "integration:{}",
        json_record(&["personal-vectors", "memory-query", world, actor])
            .map_err(|_| StoreError::InvalidRecord)?
    ))
}

impl SemanticScope {
    async fn current(&self, tx: &Transaction<'_>) -> StoreResult<bool> {
        Ok(durable_head(tx)
            .await?
            .is_some_and(|head| head.world_id == self.world && head.generation == self.generation))
    }

    async fn available(&self, tx: &Transaction<'_>) -> StoreResult<u64> {
        let bytes = tx
            .query_opt(
                "SELECT bytes FROM memory_derived_usage WHERE world_id=$1 AND actor_id=$2",
                &[&self.world, &self.actor],
            )
            .await?
            .map_or(Ok(0_i64), |row| row.try_get(0))?;
        Ok(self
            .hard_bytes
            .saturating_sub(super::super::ordinal(bytes)?))
    }
}

impl Store {
    pub(crate) fn summary_memory_prefix(&self) -> &str {
        &self.schema.checkpoint.summary_memory_prefix
    }

    pub(crate) async fn cached_semantic_query(
        &self,
        scope: Arc<SemanticScope>,
        digest: String,
    ) -> StoreResult<Option<Arc<SemanticQuery>>> {
        let budget = self.budget.clone();
        self.read_operational(move |tx| {
            Box::pin(async move {
                if !scope.current(tx).await? {
                    return Err(StoreError::StaleCut);
                }
                let _key = budget
                    .reserve(1024 + 8 * (scope.world.len() + scope.actor.len()))
                    .map_err(|_| StoreError::Capacity)?;
                let (_wire, rows) = admitted_query(
                    tx,
                    "SELECT value FROM meta WHERE key=$1 AND octet_length(value)<=$2",
                    &[&query_key(&scope.world, &scope.actor)?, &128_000_i32],
                    &budget,
                )
                .await?;
                let Some(row) = rows.first() else {
                    return Ok(None);
                };
                let raw: &str = row.try_get(0)?;
                let bound = openlegend_simulation::encoding::json_tree_allocation_bound(raw)
                    .ok_or(StoreError::InvalidRecord)?;
                let mut custody = budget.reserve(bound).map_err(|_| StoreError::Capacity)?;
                let Ok(cache) = serde_json::from_str::<QueryVector>(raw) else {
                    return Ok(None);
                };
                if cache.key != digest
                    || cache.model != scope.model
                    || cache.dimensions != scope.dimensions
                    || cache.query.len() != scope.dimensions as usize
                    || !cache.query.iter().all(|value| (*value as f32).is_finite())
                    || !cache.query.iter().any(|value| *value as f32 != 0.)
                {
                    return Ok(None);
                }
                let encoded = json_record(&cache.query).map_err(|_| StoreError::InvalidRecord)?;
                drop(cache);
                custody
                    .resize(size_of::<SemanticQuery>() + 96 + encoded.capacity())
                    .map_err(|_| StoreError::Capacity)?;
                Ok(Some(Arc::new(SemanticQuery {
                    encoded,
                    _custody: custody,
                })))
            })
        })
        .await
    }

    pub(crate) async fn save_semantic_query(
        &self,
        scope: Arc<SemanticScope>,
        digest: String,
        vector: Arc<SemanticQuery>,
        live: impl Fn() -> bool + Send + Sync + 'static,
    ) -> Result<(), CommitError> {
        let budget = self.budget.clone();
        self.operational(move |tx| Box::pin(async move {
            if !live() || !scope.current(tx).await? { return Err(StoreError::StaleCut); }
            #[derive(Serialize)]
            struct Cache<'a> {
                key: &'a str,
                model: &'a str,
                dimensions: i64,
                query: &'a RawValue,
            }
            let bound = 1024 + 8 * (scope.world.len() + scope.actor.len() + scope.model.len()) + 4 * vector.encoded.len();
            let _custody = budget.reserve(bound).map_err(|_| StoreError::Capacity)?;
            let cache = Cache {
                key: &digest, model: &scope.model, dimensions: scope.dimensions,
                query: serde_json::from_str(&vector.encoded).map_err(|_| StoreError::InvalidRecord)?,
            };
            let json = json_record(&cache).map_err(|_| StoreError::InvalidRecord)?;
            tx.execute("INSERT INTO meta(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                &[&query_key(&scope.world, &scope.actor)?,&json]).await?;
            if !live() { return Err(StoreError::StaleCut); }
            Ok(())
        })).await
    }

    pub(crate) async fn semantic_due(
        &self,
        scope: Arc<SemanticScope>,
        after: Option<String>,
    ) -> StoreResult<(Vec<String>, ByteReservation)> {
        let budget = self.budget.clone();
        self.read_operational(move |tx| Box::pin(async move {
            if !scope.current(tx).await? { return Err(StoreError::StaleCut); }
            let (_wire, rows) = admitted_query(tx,
                "SELECT DISTINCT actor_id COLLATE \"C\" FROM memory_index_queue WHERE world_id=$1 AND model=$2 \
                 AND dimensions=$3 AND ($4::text IS NULL OR actor_id COLLATE \"C\">$4) ORDER BY 1 LIMIT 64",
                &[&scope.world, &scope.model, &scope.dimensions, &after], &budget,
            ).await?;
            let bytes = rows.iter().try_fold(0usize, |n, row| {
                n.checked_add(2 * size_of::<String>() + row.try_get::<_, &str>(0)?.len() * 2)
                    .ok_or(StoreError::Capacity)
            })?;
            let custody = budget.reserve(bytes).map_err(|_| StoreError::Capacity)?;
            let actors = rows.iter().map(|row| row.try_get(0)).collect::<Result<Vec<_>, _>>()?;
            Ok((actors, custody))
        })).await
    }

    /// Write only current vectors and their cache records using the existing
    /// derived-account budget. Invalid or withdrawn batches retain their claim.
    pub(crate) async fn publish_semantic(
        &self,
        claim: Arc<SemanticClaim>,
        request: String,
        embeddings: Embeddings,
        live: impl Fn() -> bool + Send + Sync + 'static,
    ) -> Result<(), CommitError> {
        let budget = self.budget.clone();
        if embeddings.values.len() != claim.sources.len() {
            return Err(CommitError::RolledBack(StoreError::InvalidRecord));
        }
        self.operational(move |tx| Box::pin(async move {
            if !live() || !claim.current(tx).await? { return Err(StoreError::StaleCut); }
            let scope = &claim.scope;
            let mut available = usize::try_from(scope.available(tx).await?).map_err(|_| StoreError::Capacity)?;
            let mut admission = budget.reserve(512 + claim.sources.len() * 160).map_err(|_| StoreError::Capacity)?;
            #[derive(Serialize)]
            struct Row<'a> { id: &'a str, revision: &'a str, embedding: String }
            let mut rows = Vec::new();
            for (source, vector) in claim.sources.iter().zip(&embeddings.values) {
                let bytes = json_record_len(vector).map_err(|_| StoreError::InvalidRecord)?;
                let common = scope.world.len() + scope.actor.len() + source.id.len() + scope.model.len() + 256;
                let required = 2 * common + 2 * source.revision.len() + scope.generation.len() + bytes + 4 * vector.len() + 16;
                if required > available { continue; }
                available -= required;
                admission.resize(admission.bytes().checked_add(bytes.checked_mul(8).ok_or(StoreError::Capacity)?).ok_or(StoreError::Capacity)?)
                    .map_err(|_| StoreError::Capacity)?;
                rows.push(Row { id: &source.id, revision: &source.revision, embedding: json_record(vector).map_err(|_| StoreError::InvalidRecord)? });
            }
            if !live() { return Err(StoreError::StaleCut); }
            if !rows.is_empty() {
                let wire = json_record(&rows).map_err(|_| StoreError::InvalidRecord)?;
                tx.execute(
                    "INSERT INTO memory_vector_cache \
                     SELECT $1,$2,s.id,s.revision,$4,$5,s.embedding \
                     FROM jsonb_to_recordset($6::text::jsonb) AS s(id text,revision text,embedding text) \
                     WHERE $3::text=(SELECT generation FROM world_head WHERE id=1) ON CONFLICT DO NOTHING",
                    &[&scope.world,&scope.actor,&scope.generation,&scope.model,&scope.dimensions,&wire],
                ).await?;
                tx.execute(
                    "INSERT INTO memory_vectors \
                     SELECT $1,$2,$3,s.id,s.revision,$4,$5,s.embedding::public.vector \
                     FROM jsonb_to_recordset($6::text::jsonb) AS s(id text,revision text,embedding text) \
                     ON CONFLICT(world_id,actor_id,source_id,model,dimensions) DO UPDATE \
                     SET generation=excluded.generation,source_revision=excluded.source_revision,embedding=excluded.embedding",
                    &[&scope.world,&scope.actor,&scope.generation,&scope.model,&scope.dimensions,&wire],
                ).await?;
            }
            tx.execute(
                "UPDATE memory_index_attempts SET state='completed' WHERE world_id=$1 AND actor_id=$2 AND generation=$3 \
                 AND model=$4 AND dimensions=$5 AND request_id=$6",
                 &[&scope.world,&scope.actor,&scope.generation,&scope.model,&scope.dimensions,&request],
            ).await?;
            if !live() { return Err(StoreError::StaleCut); }
            Ok(())
        })).await
    }

    /// Register the authored actor/model scope only when that roster changes.
    /// Further source acceptance updates the same existing pending index.
    pub(crate) async fn register_semantic(
        &self,
        scope: Arc<SemanticScope>,
    ) -> Result<(), CommitError> {
        self.operational(move |tx| Box::pin(async move {
            if !scope.current(tx).await? { return Err(StoreError::StaleCut); }
            let args: &[&(dyn tokio_postgres::types::ToSql + Sync)] = &[
                &scope.world, &scope.actor, &scope.model, &scope.dimensions,
            ];
            tx.execute("DELETE FROM memory_index_queue WHERE world_id=$1 AND actor_id=$2 AND (model<>$3 OR dimensions<>$4)",args).await?;
            tx.execute("DELETE FROM memory_index_models WHERE world_id=$1 AND actor_id=$2 AND (model<>$3 OR dimensions<>$4)",args).await?;
            let registered = tx.execute("INSERT INTO memory_index_models VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING", args).await?;
            if registered == 0 || scope.hard_bytes == 0 { return Ok(()); }
            let available = sql_ordinal(scope.available(tx).await?)?;
            tx.execute(
                "WITH pending AS MATERIALIZED (\
                   SELECT r.world_id,r.actor_id,r.id,r.revision,r.importance,r.at,\
                   sum(octet_length(r.world_id)+octet_length(r.actor_id)+octet_length(r.id)+octet_length(r.revision)+octet_length($3)+256) \
                     OVER (ORDER BY r.importance DESC,r.at DESC,r.id) AS through_bytes \
                   FROM recall_sources r WHERE r.world_id=$1 AND r.actor_id=$2 AND r.eligible=1 \
                   AND NOT EXISTS(SELECT 1 FROM memory_vectors v WHERE (v.world_id,v.actor_id,v.source_id,v.source_revision,v.model,v.dimensions)=\
                     (r.world_id,r.actor_id,r.id,r.revision,$3,$4)) \
                   AND NOT EXISTS(SELECT 1 FROM memory_index_attempts a WHERE (a.world_id,a.actor_id,a.source_id,a.source_revision,a.model,a.dimensions)=\
                     (r.world_id,r.actor_id,r.id,r.revision,$3,$4))) \
                 INSERT INTO memory_index_queue SELECT world_id,actor_id,id,revision,$3,$4,importance,at FROM pending \
                 WHERE through_bytes<=$5 ON CONFLICT DO NOTHING",
                &[&scope.world,&scope.actor,&scope.model,&scope.dimensions,&available],
            ).await?;
            Ok(())
        })).await
    }

    pub(crate) async fn pending_semantic(
        &self,
        scope: Arc<SemanticScope>,
    ) -> StoreResult<SemanticPending> {
        let budget = self.budget.clone();
        self.read_operational(move |tx| Box::pin(async move {
            if !scope.current(tx).await? { return Err(StoreError::StaleCut); }
            let (_wire, rows) = admitted_query(tx,
                "SELECT r.id,r.source_kind,r.revision FROM memory_index_queue q JOIN recall_sources r \
                 ON r.world_id=q.world_id AND r.actor_id=q.actor_id AND r.id=q.source_id AND r.revision=q.source_revision \
                 WHERE q.world_id=$1 AND q.actor_id=$2 AND q.model=$3 AND q.dimensions=$4 AND r.eligible=1 \
                 ORDER BY q.importance DESC,q.at DESC,q.source_id LIMIT $5",
                &[&scope.world,&scope.actor,&scope.model,&scope.dimensions,&PAGE],&budget).await?;
            let bytes = rows.iter().try_fold(512usize, |n, row| {
                let id: &str = row.try_get(0)?;
                let revision: &str = row.try_get(2)?;
                n.checked_add(size_of::<PersonalSourceRef>() + id.len() + revision.len()).ok_or(StoreError::Capacity)
            })?;
            let custody = budget.reserve(bytes).map_err(|_| StoreError::Capacity)?;
            let mut sources = Vec::with_capacity(rows.len());
            for row in rows {
                let source = PersonalSourceRef {
                    id: row.try_get(0)?,
                    kind: match row.try_get::<_, &str>(1)? {
                        "awareness" => PersonalSourceKind::Awareness,
                        "memory" => PersonalSourceKind::Memory,
                        "summary" => PersonalSourceKind::Summary,
                        _ => return Err(StoreError::InvalidRecord),
                    },
                    revision: row.try_get(2)?,
                };
                if !source.validate() { return Err(StoreError::InvalidRecord); }
                sources.push(source);
            }
            Ok(SemanticPending { sources, custody })
        })).await
    }
}
