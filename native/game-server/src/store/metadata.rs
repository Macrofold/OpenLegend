//! Startup and host control use this path only when the native producer has
//! certified the candidate requires no independent derived persistence.

use super::{PrefixProjection, StoreError, StoreResult};
use openlegend_simulation::records::SaveRows;
use openlegend_simulation::runtime::{RuntimeMetadataPersistence, metadata_rows};
use tokio_postgres::Transaction;

pub struct MetadataProjection(RuntimeMetadataPersistence);

impl MetadataProjection {
    pub fn new(persistence: RuntimeMetadataPersistence) -> Self {
        Self(persistence)
    }
}

impl PrefixProjection for MetadataProjection {
    async fn before_records(
        &self,
        _transaction: &Transaction<'_>,
        rows: &SaveRows,
        _revision: u64,
    ) -> StoreResult<()> {
        let (world, generation, cut) = self.0.binding();
        if rows.world_id != world || rows.generation != generation || rows.through_cut != cut {
            return Err(StoreError::StaleCut);
        }
        // Save capture can pack more records than the original candidate.
        // Refuse that prefix unless it also consists only of host metadata.
        if !metadata_rows(&rows.changes) {
            return Err(StoreError::InvalidRecord);
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
