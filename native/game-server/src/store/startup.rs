//! The direct cold startup projection is valid only when the actual native
//! producer proves no independent derived work needs to be saved.

use super::{PrefixProjection, StoreError, StoreResult};
use openlegend_simulation::records::SaveRows;
use openlegend_simulation::runtime::{RuntimeStartupPersistence, startup_metadata_rows};
use tokio_postgres::Transaction;

pub struct StartupProjection(RuntimeStartupPersistence);

impl StartupProjection {
    pub fn new(persistence: RuntimeStartupPersistence) -> Self {
        Self(persistence)
    }
}

impl PrefixProjection for StartupProjection {
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
        if !startup_metadata_rows(&rows.changes) {
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
