//! One optional search-index slice per ordinary background opportunity.
//! Queue claims and vector work never hold the simulation admission turn.

use crate::{
    boot::CurrentServer,
    store::{CommitError, StoreError},
    world::WorldError,
};
use openlegend_simulation::runtime::NativeWorldSession;
use openlegend_world_host::pool::HostError;
use std::{sync::Arc, time::Duration};
use tokio::sync::{Notify, watch};

// Same coalescing delay as the Source lexical projection. A later commit
// cannot extend an already scheduled slice or start an overlapping batch.
const DELAY: Duration = Duration::from_secs(1);

pub(crate) async fn run(
    game: Arc<CurrentServer>,
    wake: Arc<Notify>,
    mut stop: watch::Receiver<bool>,
) {
    let mut pending = true; // A previously committed world can have queued work.
    while !*stop.borrow() {
        if !pending {
            tokio::select! {
                _ = stop.changed() => break,
                _ = wake.notified() => {},
            }
        }
        tokio::select! {
            _ = stop.changed() => break,
            _ = tokio::time::sleep(DELAY) => {},
        }
        // Join an in-flight transaction on shutdown. A future dropped during
        // COMMIT would lose its exact result even when all work settled.
        pending = match one_batch(&game).await {
            Ok(remaining) => remaining,
            Err(WorldError::Host(HostError::Busy))
            | Err(WorldError::Storage(StoreError::StaleCut))
            | Err(WorldError::Commit(CommitError::RolledBack(StoreError::StaleCut))) => true,
            Err(error) => {
                eprintln!("Memory search background update failed: {error}");
                // A later confirmed source write can offer the work again.
                false
            }
        };
    }
}

async fn one_batch(game: &CurrentServer) -> Result<bool, WorldError> {
    let Some(pending) = game.store.pending_lexical().await? else {
        return Ok(false);
    };
    let hard = game
        .world
        .capture(NativeWorldSession::recall_hard_bytes)
        .await?;
    let language = game.language().cloned().ok_or(WorldError::ProviderKind)?;
    let budget = game.host.budget().clone();
    let prepared = game
        .host
        .compute(move || pending.prepare(&language, &budget))
        .await?
        .map_err(WorldError::Language)?;
    game.store
        .publish_lexical(prepared, hard)
        .await
        .map_err(WorldError::Commit)
}
