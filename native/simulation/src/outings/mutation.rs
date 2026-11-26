//! A family supplies its complete prepared record after current admission.
//! The one candidate journal transfers record custody, updates derived indexes
//! and saves the before-image before any later fallible settlement.
use super::*;
use crate::execution::CoreMutation;

impl CoreMutation<'_> {
    pub(crate) fn replace_outing(
        &mut self,
        body: SqlCell,
        allocation: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let record = OutingRecord::prepare(body, allocation, &self.state.installed, budget)?;
        let _identity = budget.reserve(record.id().len())?;
        let id = record.id().to_owned();
        self.journal
            .outings
            .replace(&mut self.state.outings, &id, Some(record))
    }

    /// Consent must be removed before its own cancellation can cause a nested
    /// reconciliation. The family still owns who may end it and which work ends.
    pub(crate) fn remove_outing(&mut self, id: &str) -> Result<(), ExecutionError> {
        self.journal
            .outings
            .replace(&mut self.state.outings, id, None)
    }
}
