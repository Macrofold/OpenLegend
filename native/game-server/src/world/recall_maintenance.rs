//! Fresh selected evidence authorizes exactly the first transport poll.

use super::{HostedWorld, NpcDisclosure, NpcDisclosureTurn, WorldError};
use openlegend_simulation::runtime::{
    NativeWorldSession, RuntimeActivityLearning, RuntimeConsolidationTicket, RuntimeError,
    RuntimeMaintenancePublication, RuntimeMaintenanceRead, RuntimeMemoryIndex, RuntimeNpcConsumer,
    RuntimeNpcRead,
};
use openlegend_world_host::pool::HostError;
use std::sync::{TryLockError, atomic::Ordering};

impl NpcDisclosureTurn<'_> {
    pub(crate) fn disclose_activity_learning(
        self,
        read: &RuntimeActivityLearning,
        admission: &RuntimeMaintenanceRead,
        start: impl FnOnce(),
    ) -> Result<Result<(), NpcDisclosure>, WorldError> {
        self.world.disclose_personal(
            read.actor_id()?,
            [
                "activity-learning-source-changed",
                "activity-learning-lease-closed",
            ],
            |world| world.activity_learning_publication(read, admission),
            start,
        )
    }

    pub(crate) fn disclose_consolidation(
        self,
        ticket: &RuntimeConsolidationTicket,
        start: impl FnOnce(),
    ) -> Result<Result<(), NpcDisclosure>, WorldError> {
        self.world.disclose_personal(
            ticket.actor_id(),
            ["consolidation-source-changed", "consolidation-lease-closed"],
            |world| world.consolidation_publication(ticket),
            start,
        )
    }

    pub(crate) fn disclose_memory_index(
        self,
        read: &RuntimeMemoryIndex,
        start: impl FnOnce(),
    ) -> Result<Result<(), NpcDisclosure>, WorldError> {
        self.world.disclose_personal(
            read.actor_id(),
            ["memory-index-source-changed", "memory-index-lease-closed"],
            |world| world.memory_index_publication(read),
            start,
        )
    }

    pub(crate) fn disclose_memory_query(
        self,
        read: &RuntimeNpcRead,
        consumer: RuntimeNpcConsumer,
        start: impl FnOnce(),
    ) -> Result<Result<(), NpcDisclosure>, WorldError> {
        self.world.disclose_personal(
            read.decision_origin().actor_id,
            ["memory-query-source-changed", "memory-query-lease-closed"],
            |world| world.npc_memory_query_publication(read, consumer),
            start,
        )
    }
}

impl HostedWorld {
    /// Recheck the optional query cache while its transaction can still roll
    /// back. This only tries the native read and never waits for a world turn.
    pub(crate) fn memory_query_current(
        &self,
        read: &RuntimeNpcRead,
        consumer: RuntimeNpcConsumer,
    ) -> bool {
        matches!(
            self.disclose_personal(
                read.decision_origin().actor_id,
                ["memory-query-source-changed", "memory-query-lease-closed"],
                |world| world.npc_memory_query_publication(read, consumer),
                || (),
            ),
            Ok(Ok(()))
        )
    }

    fn disclose_personal(
        &self,
        actor: &str,
        [changed, closed]: [&'static str; 2],
        publication: impl FnOnce(
            &NativeWorldSession,
        ) -> Result<Option<RuntimeMaintenancePublication>, RuntimeError>,
        start: impl FnOnce(),
    ) -> Result<Result<(), NpcDisclosure>, WorldError> {
        let world = self;
        if world.closing.load(Ordering::Acquire) {
            return Err(HostError::Closed.into());
        }
        let pending = world
            .pending_source_edits
            .lock()
            .map_err(|_| HostError::Poisoned)?;
        if pending.contains(actor) {
            return Ok(Err(NpcDisclosure::Refused("source-edit-pending")));
        }
        let session = match world.session.try_lock() {
            Ok(session) => session,
            Err(TryLockError::WouldBlock) => return Ok(Err(NpcDisclosure::Busy)),
            Err(TryLockError::Poisoned(_)) => return Err(HostError::Poisoned.into()),
        };
        let Some(lease) = publication(&session)? else {
            return Ok(Err(NpcDisclosure::Refused(changed)));
        };
        if !lease.is_current() {
            return Ok(Err(NpcDisclosure::Refused(closed)));
        }
        start();
        drop(lease);
        Ok(Ok(()))
    }
}
