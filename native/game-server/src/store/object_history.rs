//! The inventory history reader merges only the selected accepted lineage cut.

use super::{Store, StoreError, StoreResult, durable_head, read::admitted_query};
use openlegend_simulation::{
    host::ByteReservation,
    runtime::{OBJECT_HISTORY_SELECTION, RuntimeObjectHistoryEntry, RuntimeObjectHistoryRead},
};
use std::sync::Arc;

pub(crate) struct ObjectHistoryRows {
    pub entries: Vec<RuntimeObjectHistoryEntry>,
    pub more: bool,
    _custody: ByteReservation,
}

impl Store {
    /// Keep the accepted overlay live while an independent read-only snapshot
    /// observes the matching durable prefix. This path never requests a save.
    pub(crate) async fn read_object_history(
        self: &Arc<Self>,
        mut read: RuntimeObjectHistoryRead,
        after: String,
        object: Option<String>,
    ) -> StoreResult<(RuntimeObjectHistoryRead, ObjectHistoryRows)> {
        let store = self.clone();
        self.read_isolated(move |tx| {
            Box::pin(async move {
                let head = durable_head(tx).await?.ok_or(StoreError::StaleCut)?;
                if head.world_id != read.world_id || head.generation != read.generation {
                    return Err(StoreError::StaleCut);
                }
                let revision = head.revision.checked_sub(read.durable_revision);
                if revision != Some(0) && !(revision == Some(1) && read.detached.is_some()) {
                    return Err(StoreError::StaleCut);
                }

                // Match the Source custody index and page by canonical slot.
                // Generated slot IDs use ASCII. The explicit collation also
                // fixes the order used to combine pending rows on this host.
                let (mut custody, rows) = admitted_query(
                    tx,
                    "SELECT l.slot,l.payload,e.payload AS entity
                     FROM sim_object_lineage l
                     JOIN sim_entities e ON e.world_id=l.world_id AND e.entity_id=l.source_id
                     WHERE l.world_id=$1 AND (l.payload::jsonb ->> 'custodianId')=$2
                       AND l.slot COLLATE \"C\">$3
                       AND ($4::text IS NULL OR l.source_id=$4 OR l.target_id=$4)
                     ORDER BY l.slot COLLATE \"C\" LIMIT $5",
                    &[
                        &read.world_id,
                        &read.actor_id,
                        &after,
                        &object,
                        &(OBJECT_HISTORY_SELECTION as i64),
                    ],
                    &store.budget,
                )
                .await?;
                // The same admission covers driver rows and their decoded
                // presentation. The accepted overlay has its own reservation.
                let detached = (revision == Some(0))
                    .then(|| read.detached.take())
                    .flatten();
                let capacity =
                    rows.len() + read.suffix.len() + detached.as_ref().map_or(0, Vec::len);
                custody
                    .resize(
                        custody
                            .bytes()
                            .checked_add(capacity * size_of::<RuntimeObjectHistoryEntry>())
                            .ok_or(StoreError::Capacity)?,
                    )
                    .map_err(|_| StoreError::Capacity)?;
                let mut entries = Vec::with_capacity(capacity);
                for row in rows {
                    entries.push(
                        RuntimeObjectHistoryEntry::from_storage(
                            row.try_get(0)?,
                            row.try_get(1)?,
                            row.try_get(2)?,
                            &read.actor_id,
                            object.as_deref(),
                            read.at,
                        )
                        .map_err(|_| StoreError::InvalidRecord)?,
                    );
                }
                entries.extend(detached.into_iter().flatten());
                entries.append(&mut read.suffix);
                entries.sort_unstable_by(|left, right| left.id.cmp(&right.id));
                if entries.windows(2).any(|pair| pair[0].id == pair[1].id) {
                    return Err(StoreError::StaleCut);
                }
                let limit = OBJECT_HISTORY_SELECTION - 1;
                let more = entries.len() > limit;
                entries.truncate(limit);

                Ok((
                    read,
                    ObjectHistoryRows {
                        entries,
                        more,
                        _custody: custody,
                    },
                ))
            })
        })
        .await
    }
}
