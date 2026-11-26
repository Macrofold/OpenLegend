//! The existing actor-scoped commitment index supplies one durable page.

use super::*;
use openlegend_simulation::runtime::RuntimePromisePosition;

pub(crate) const PROMISE_PAGE: usize = 20;

pub(crate) struct PastPromises {
    pub rows: Vec<SavedPromise>,
    pub custody: ByteReservation,
}

pub(crate) struct SavedPromise {
    pub position: RuntimePromisePosition,
    pub payload: String,
}

impl Store {
    /// Select one page at the original durable head. Transfer a canonical
    /// body only for a partially installed collection and a promise that
    /// the request has not already pinned in Rust. A complete accepted
    /// collection can have retired a row before its ordinary SQL save.
    /// The private-history owner validates the saved bodies at publication.
    /// This user-opened history read has its own connection so a slow page
    /// cannot hold up command receipts on the shared operational reader.
    pub(crate) async fn browse_resolved_promises(
        &self,
        cut: Arc<MemoryBrowseCut>,
        before: Option<MemoryPosition>,
        resident: Vec<String>,
        complete: bool,
    ) -> StoreResult<PastPromises> {
        let budget = self.budget.clone();
        self.read_isolated(move |tx| {
            Box::pin(async move {
                let head = durable_head(tx).await?.ok_or(StoreError::StaleCut)?;
                if head.world_id != cut.world
                    || head.generation != cut.generation
                    || head.revision != cut.revision
                {
                    return Err(StoreError::StaleCut);
                }
                let limit = (PROMISE_PAGE + 1) as i64;
                let (_transfer, selected) = admitted_query(
                    tx,
                    "SELECT p.at,p.id,p.revision,m.payload
                     FROM (
                        SELECT r.at,r.id,r.revision,r.record_id
                        FROM recall_sources r
                        WHERE r.world_id=$1 AND r.actor_id=$2 AND r.at<=$3 AND r.eligible=1
                          AND r.source_kind='memory' AND r.memory_kind='commitment' AND r.required=0
                          AND ($4::double precision IS NULL OR (r.at,r.id)<($4,$5))
                        ORDER BY r.at DESC,r.id DESC LIMIT $6
                     ) p
                     LEFT JOIN mind_memories m ON NOT $8 AND NOT (p.id=ANY($7::text[]))
                       AND m.world_id=$1 AND m.actor_id=$2 AND m.id=p.record_id
                       AND m.account_revision=p.revision
                     ORDER BY p.at DESC,p.id DESC",
                    &[
                        &cut.world,
                        &cut.actor,
                        &cut.at,
                        &before.as_ref().map(|value| value.at),
                        &before.as_ref().map(|value| value.id.as_str()),
                        &limit,
                        &resident,
                        &complete,
                    ],
                    &budget,
                )
                .await?;
                let mut custody = budget
                    .reserve(512 + selected.len() * std::mem::size_of::<SavedPromise>())
                    .map_err(|_| StoreError::Capacity)?;
                let mut rows = Vec::with_capacity(selected.len());
                for row in &selected {
                    let id: &str = row.try_get(1)?;
                    if complete || resident.iter().any(|known| known == id) {
                        continue;
                    }
                    let revision: &str = row.try_get(2)?;
                    let payload: &str = row.try_get(3)?;
                    custody
                        .resize(custody.bytes() + id.len() + revision.len() + payload.len())
                        .map_err(|_| StoreError::Capacity)?;
                    let at: f64 = row.try_get(0)?;
                    if !at.is_finite() {
                        return Err(StoreError::InvalidRecord);
                    }
                    let source = PersonalSourceRef {
                        kind: PersonalSourceKind::Memory,
                        id: id.to_owned(),
                        revision: revision.to_owned(),
                    };
                    if !source.validate() {
                        return Err(StoreError::InvalidRecord);
                    }
                    rows.push(SavedPromise {
                        position: RuntimePromisePosition { at, source },
                        payload: payload.to_owned(),
                    });
                }
                Ok(PastPromises { rows, custody })
            })
        })
        .await
    }
}
