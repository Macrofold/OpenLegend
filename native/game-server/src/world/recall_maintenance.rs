//! Fresh selected evidence authorizes exactly the first transport poll.

use super::{NpcDisclosure, NpcDisclosureTurn, WorldError};
use openlegend_simulation::runtime::RuntimeConsolidationTicket;
use openlegend_world_host::pool::HostError;
use std::sync::{TryLockError, atomic::Ordering};

impl NpcDisclosureTurn<'_> {
    pub(crate) fn disclose_consolidation(
        self,
        ticket: &RuntimeConsolidationTicket,
        start: impl FnOnce(),
    ) -> Result<Result<(), NpcDisclosure>, WorldError> {
        let world = self.world;
        if world.closing.load(Ordering::Acquire) {
            return Err(HostError::Closed.into());
        }
        let pending = world
            .pending_source_edits
            .lock()
            .map_err(|_| HostError::Poisoned)?;
        if pending.contains(ticket.actor_id()) {
            return Ok(Err(NpcDisclosure::Refused("source-edit-pending")));
        }
        let session = match world.session.try_lock() {
            Ok(session) => session,
            Err(TryLockError::WouldBlock) => return Ok(Err(NpcDisclosure::Busy)),
            Err(TryLockError::Poisoned(_)) => return Err(HostError::Poisoned.into()),
        };
        let Some(lease) = session.consolidation_publication(ticket)? else {
            return Ok(Err(NpcDisclosure::Refused("consolidation-source-changed")));
        };
        if !lease.is_current() {
            return Ok(Err(NpcDisclosure::Refused("consolidation-lease-closed")));
        }
        start();
        drop(lease);
        Ok(Ok(()))
    }
}
