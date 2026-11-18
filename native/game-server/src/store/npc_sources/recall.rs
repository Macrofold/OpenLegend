//! Actor-scoped recall discovery. An index hit is a selection candidate;
//! the native historical cursor still has to acquire and authorize its body.

use super::{
    Kind, PersonalSourceRef, Store, StoreError, StoreResult, admitted_query, durable_head,
};
use crate::store::sql_ordinal;
use openlegend_simulation::host::ByteReservation;
use std::mem::size_of;

// The same finite optional set and required overflow witness as
// MemoryRepository.recallCandidates, readRequired and readSelection.
const OPTIONAL_LIMIT: i64 = 300;
const REQUIRED_LIMIT: usize = 8192;

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
    _custody: ByteReservation,
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
    SELECT id,source_kind,revision,required FROM selected
    ORDER BY required DESC,importance DESC,at DESC,id,source_kind";

impl Store {
    /// Read only finite recall metadata from one actor's durable SQL snapshot.
    /// The funded result can survive the snapshot and identifies candidates for
    /// native reacquisition. Explicit live causes use their existing exact-source
    /// owner, including temporary sensory accounts that the rank excludes.
    pub(crate) async fn recall_references(
        &self,
        scope: RecallScope<'_>,
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
                        &OPTIONAL_LIMIT,
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
