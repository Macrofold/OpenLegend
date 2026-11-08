//! The actual appendTemporalReceipt call boundary. A standalone receiving lease
//! flushes before personal placement/support/recognition continues; an existing
//! actor acquisition is borrowed and retains its original frame and batching.

use crate::execution::{CoreMutation, ExecutionError};
use crate::received::{TemporalCaptureInput, TemporalReceiptLocator};
use std::sync::Arc;

pub(super) fn append_personal_receipt(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    physical_life: u64,
    input: TemporalCaptureInput,
) -> Result<Option<TemporalReceiptLocator>, ExecutionError> {
    let installed = Arc::clone(&core.state.installed);
    let policy = &installed.attention.value().retention;
    let values = core
        .state
        .reception
        .received_values
        .as_mut()
        .ok_or(ExecutionError::UnsupportedFamily)?;
    core.journal.acquisitions.append_receipt(
        &mut core.state.temporal,
        values,
        &mut core.state.physical.identity,
        &installed.account_law(),
        &mut core.journal.meters,
        actor_id,
        physical_life,
        core.state.physical.header.sim_time,
        core.state.physical.header.sequence,
        input,
        &policy.recent,
        policy.maintenance_headroom,
    )
}
