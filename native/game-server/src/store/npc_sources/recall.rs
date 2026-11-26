//! Actor-scoped recall discovery. An index hit is a selection candidate;
//! the native historical cursor still has to acquire and authorize its body.

use super::{
    Kind, PersonalSourceRef, Store, StoreError, StoreResult, admitted_query, durable_head,
};
use crate::store::recall::semantic::{SemanticQuery, SemanticScope};
use crate::store::sql_ordinal;
use openlegend_simulation::host::ByteReservation;
use std::mem::size_of;
use std::sync::Arc;

// The same finite optional set and required overflow witness as
// MemoryRepository.recallCandidates, readRequired and readSelection.
const OPTIONAL_LIMIT: i64 = 300;
const REQUIRED_LIMIT: usize = 8192;

#[derive(Clone, Copy)]
pub(crate) struct RecallScope<'a> {
    pub(crate) world: &'a str,
    pub(crate) generation: &'a str,
    pub(crate) actor: &'a str,
    pub(crate) at: f64,
    pub(crate) identity_through: u64,
}

pub(crate) struct RecallReferences {
    pub(crate) required: Vec<PersonalSourceRef>,
    pub(crate) optional: Vec<PersonalSourceRef>,
    pub(crate) fills_direct_limit: bool,
    _custody: ByteReservation,
}

impl RecallReferences {
    /// Release the optional keys before attempting the same required sources.
    pub(crate) fn discard_optional(&mut self) {
        let optional_bytes = self
            .optional
            .iter()
            .map(|reference| {
                size_of::<PersonalSourceRef>() + reference.id.len() + reference.revision.len()
            })
            .sum::<usize>();
        self.optional = Vec::new();
        self.fills_direct_limit = false;
        self._custody
            .resize(self._custody.bytes() - optional_bytes)
            .expect("release only the already funded optional reference bytes");
    }
}

// Awareness uses the occurrence allocation order (identityThrough). Personal
// memories and summaries can use other sequence clocks. Their at and exact
// revisions travel to the historical cursor instead of comparing clocks here.
const SELECTION: &str = "
    WITH required_keys AS MATERIALIZED (
      SELECT id,source_kind FROM recall_sources
      WHERE world_id=$1 AND actor_id=$2 AND eligible=1 AND required=1 AND at<=$3
        AND (source_kind<>'awareness' OR at<$3 OR sequence<=$4)
      UNION
      SELECT r.id,r.source_kind FROM recall_sources r
      JOIN (
        SELECT source_id FROM mind_corrections WHERE world_id=$1 AND actor_id=$2
        UNION SELECT correction_id FROM mind_corrections WHERE world_id=$1 AND actor_id=$2
      ) c ON c.source_id=r.id
      WHERE r.world_id=$1 AND r.actor_id=$2 AND r.eligible=1 AND r.at<=$3
        AND (r.source_kind<>'awareness' OR r.at<$3 OR r.sequence<=$4)
      LIMIT $5
    ), optional_rows AS MATERIALIZED (
      SELECT id,source_kind,revision,at,importance
      FROM recall_sources
      WHERE world_id=$1 AND actor_id=$2 AND eligible=1 AND at<=$3
        AND (source_kind<>'awareness' OR at<$3 OR sequence<=$4)
      ORDER BY importance DESC,at DESC,id,source_kind LIMIT $6
    ), selected AS (
      SELECT r.id,r.source_kind,r.revision,r.at,r.importance,true AS required
      FROM required_keys k JOIN recall_sources r
        ON r.world_id=$1 AND r.actor_id=$2 AND r.id=k.id AND r.source_kind=k.source_kind
      UNION ALL
      SELECT o.*,false FROM optional_rows o
      WHERE NOT EXISTS (SELECT 1 FROM required_keys k WHERE k.id=o.id AND k.source_kind=o.source_kind)
    )
    SELECT id,source_kind,revision,required,(SELECT count(*)=$6 FROM optional_rows) FROM selected
    ORDER BY required DESC,importance DESC,at DESC,id,source_kind";

impl Store {
    pub(crate) async fn semantic_query_needed(
        &self,
        scope: Arc<SemanticScope>,
        at: f64,
        identity: u64,
    ) -> StoreResult<bool> {
        let identity = sql_ordinal(identity)?;
        self.read_operational(move |tx| Box::pin(async move {
            let head = durable_head(tx).await?.ok_or(StoreError::StaleCut)?;
            if head.world_id != scope.world || head.generation != scope.generation {
                return Err(StoreError::StaleCut);
            }
            Ok(tx.query_opt(
                "SELECT 1 FROM recall_sources WHERE world_id=$1 AND actor_id=$2 AND eligible=1 AND at<=$3 \
                 AND (source_kind<>'awareness' OR at<$3 OR sequence<=$4) OFFSET $5 LIMIT 1",
                &[&scope.world,&scope.actor,&at,&identity,&OPTIONAL_LIMIT],
            ).await?.is_some())
        })).await
    }

    /// Rank only current eligible source versions inside this actor and read
    /// cut. Returns IDs only; the native reader still grants each body.
    pub(crate) async fn semantic_recall(
        &self,
        scope: Arc<SemanticScope>,
        at: f64,
        identity: u64,
        query: Arc<SemanticQuery>,
    ) -> StoreResult<(Vec<PersonalSourceRef>, ByteReservation)> {
        let identity = sql_ordinal(identity)?;
        let budget = self.budget.clone();
        self.read_operational(move |tx| Box::pin(async move {
            let head = durable_head(tx).await?.ok_or(StoreError::StaleCut)?;
            if head.world_id != scope.world || head.generation != scope.generation {
                return Err(StoreError::StaleCut);
            }
            let (_wire, rows) = admitted_query(tx,
                "SELECT r.id,r.source_kind,r.revision FROM memory_vectors v \
                 JOIN recall_sources r ON r.world_id=v.world_id AND r.actor_id=v.actor_id AND r.id=v.source_id AND r.revision=v.source_revision \
                 WHERE v.world_id=$1 AND v.actor_id=$2 AND v.generation=$3 AND v.model=$4 AND v.dimensions=$5 \
                 AND r.eligible=1 AND r.at<=$6 AND (r.source_kind<>'awareness' OR r.at<$6 OR r.sequence<=$7) \
                 ORDER BY v.embedding OPERATOR(public.<=>) $8::text::public.vector,r.id,r.source_kind LIMIT $9",
                &[&scope.world,&scope.actor,&scope.generation,&scope.model,&scope.dimensions,&at,&identity,&query.encoded,&OPTIONAL_LIMIT], &budget,
            ).await?;
            let bytes = rows.iter().try_fold(0usize, |bytes, row| {
                let id: &str = row.try_get(0)?;
                let revision: &str = row.try_get(2)?;
                bytes.checked_add(size_of::<PersonalSourceRef>() + id.len() + revision.len()).ok_or(StoreError::Capacity)
            })?;
            let storage = budget.reserve(bytes).map_err(|_| StoreError::Capacity)?;
            Ok((rows.iter().map(decode_reference).collect::<Result<_, _>>()?, storage))
        })).await
    }

    /// Read only finite recall metadata from one actor's durable SQL snapshot.
    /// The funded result can survive the snapshot and identifies candidates for
    /// native reacquisition. Explicit live causes use their existing exact-source
    /// owner, including temporary sensory accounts that the rank excludes.
    pub(crate) async fn recall_references(
        &self,
        scope: RecallScope<'_>,
    ) -> StoreResult<RecallReferences> {
        self.recall_references_with_limit(scope, OPTIONAL_LIMIT)
            .await
    }

    /// Reuse the same indexed commitment and correction read after optional
    /// discovery exceeds transfer capacity. Its required overflow still fails.
    pub(crate) async fn required_recall_references(
        &self,
        scope: RecallScope<'_>,
    ) -> StoreResult<RecallReferences> {
        self.recall_references_with_limit(scope, 0).await
    }

    async fn recall_references_with_limit(
        &self,
        scope: RecallScope<'_>,
        optional_limit: i64,
    ) -> StoreResult<RecallReferences> {
        if scope.world.is_empty()
            || scope.generation.is_empty()
            || scope.actor.is_empty()
            || !scope.at.is_finite()
            || scope.at < 0.0
        {
            return Err(StoreError::InvalidRecord);
        }
        let identity = sql_ordinal(scope.identity_through)?;
        let required_limit = i64::try_from(REQUIRED_LIMIT + 1).map_err(|_| StoreError::Capacity)?;
        // read_operational's closure cannot borrow inputs across its transaction
        // lifetime. Copy only its keys and retain independent custody until return.
        let bytes = scope
            .world
            .len()
            .checked_add(scope.generation.len())
            .and_then(|n| n.checked_add(scope.actor.len()))
            .ok_or(StoreError::Capacity)?;
        let _input = self
            .budget
            .reserve(bytes)
            .map_err(|_| StoreError::Capacity)?;
        let world = scope.world.to_owned();
        let generation = scope.generation.to_owned();
        let actor = scope.actor.to_owned();
        let at = scope.at;
        let budget = self.budget.clone();
        self.read_operational(move |transaction| {
            Box::pin(async move {
                let head = durable_head(transaction)
                    .await?
                    .ok_or(StoreError::StaleCut)?;
                if head.world_id != world || head.generation != generation {
                    return Err(StoreError::StaleCut);
                }
                let (_wire, rows) = admitted_query(
                    transaction,
                    SELECTION,
                    &[
                        &world,
                        &actor,
                        &at,
                        &identity,
                        &required_limit,
                        &optional_limit,
                    ],
                    &budget,
                )
                .await?;
                let mut required_count = 0;
                let mut bytes = 0usize;
                for row in &rows {
                    let id: &str = row.try_get(0)?;
                    let revision: &str = row.try_get(2)?;
                    required_count += usize::from(row.try_get::<_, bool>(3)?);
                    bytes = bytes
                        .checked_add(size_of::<PersonalSourceRef>())
                        .and_then(|n| n.checked_add(id.len()))
                        .and_then(|n| n.checked_add(revision.len()))
                        .ok_or(StoreError::Capacity)?;
                }
                if required_count > REQUIRED_LIMIT {
                    return Err(StoreError::Capacity);
                }
                let mut result = RecallReferences {
                    required: Vec::new(),
                    optional: Vec::new(),
                    fills_direct_limit: optional_limit > 0
                        && rows.first().map_or(Ok(false), |row| row.try_get(4))?,
                    _custody: budget.reserve(bytes).map_err(|_| StoreError::Capacity)?,
                };
                result
                    .required
                    .try_reserve_exact(required_count)
                    .map_err(|_| StoreError::Capacity)?;
                result
                    .optional
                    .try_reserve_exact(rows.len() - required_count)
                    .map_err(|_| StoreError::Capacity)?;
                for row in rows {
                    let reference = decode_reference(&row)?;
                    if row.try_get(3)? {
                        result.required.push(reference);
                    } else {
                        result.optional.push(reference);
                    }
                }
                Ok(result)
            })
        })
        .await
    }
}

fn decode_reference(row: &tokio_postgres::Row) -> StoreResult<PersonalSourceRef> {
    let kind = match row.try_get::<_, &str>(1)? {
        "awareness" => Kind::Awareness,
        "memory" => Kind::Memory,
        "summary" => Kind::Summary,
        _ => return Err(StoreError::InvalidRecord),
    };
    let reference = PersonalSourceRef {
        kind,
        id: row.try_get(0)?,
        revision: row.try_get(2)?,
    };
    if !reference.validate() {
        return Err(StoreError::InvalidRecord);
    }
    Ok(reference)
}
