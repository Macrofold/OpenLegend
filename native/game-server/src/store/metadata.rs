//! Startup and host control use this path only when the native producer has
//! certified the candidate requires no independent derived persistence.

use super::{PrefixProjection, StoreError, StoreResult};
use crate::authority::{AuthorizedScope, assert_saved_grant};
use openlegend_simulation::records::SaveRows;
use openlegend_simulation::runtime::{RuntimeMetadataPersistence, metadata_rows};
use std::sync::Arc;
use tokio_postgres::Transaction;

pub struct MetadataProjection {
    persistence: RuntimeMetadataPersistence,
    clock_creator: Option<Arc<AuthorizedScope>>,
}

impl MetadataProjection {
    pub fn new(persistence: RuntimeMetadataPersistence) -> Self {
        Self { persistence, clock_creator: None }
    }

    /// A speed change also checks its originally selected creator inside
    /// the writer transaction. An ordinary pause has no creator dependency.
    pub(crate) fn with_clock_creator(mut self, creator: Option<Arc<AuthorizedScope>>) -> Self {
        self.clock_creator = creator;
        self
    }
}

impl PrefixProjection for MetadataProjection {
    async fn before_records(
        &self,
        transaction: &Transaction<'_>,
        rows: &SaveRows,
        _revision: u64,
    ) -> StoreResult<()> {
        let (world, generation, cut) = self.persistence.binding();
        if rows.world_id != world || rows.generation != generation || rows.through_cut != cut {
            return Err(StoreError::StaleCut);
        }
        // Save capture can pack more records than the original candidate.
        // Refuse that prefix unless it also consists only of host metadata.
        if !metadata_rows(&rows.changes) {
            return Err(StoreError::InvalidRecord);
        }
        if let Some(creator) = &self.clock_creator {
            if rows.world_id != creator.scope.world_id {
                return Err(StoreError::StaleCut);
            }
            assert_saved_grant(transaction, &creator.scope, "create").await?;
        }
        Ok(())
    }

    async fn after_records(
        &self,
        _transaction: &Transaction<'_>,
        _rows: &SaveRows,
        _revision: u64,
    ) -> StoreResult<()> {
        Ok(())
    }
}
