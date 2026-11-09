//! Immutable current facts and their exact encoded cache keep canonical
//! custody independently from metadata undo and batch lifetimes.
use super::*;
use crate::host::{ByteBudget, ResidentReservation};
use std::{fmt, mem::size_of, ops::Deref, sync::Arc};

fn capacity() -> crate::received::ReceivedError {
    crate::received::ReceivedError("Current record exceeds native allowance.")
}
mod metadata;
pub(super) use metadata::{CurrentOwnerPart, CurrentOwnerStorage};

#[derive(Debug)]
pub(crate) struct CurrentPayload {
    text: Box<str>,
    storage: Option<ResidentReservation>,
}
impl CurrentPayload {
    pub(super) fn decoded(text: &str) -> Arc<Self> {
        Arc::new(Self {
            text: text.into(),
            storage: None,
        })
    }
    pub(super) fn storage(&self) -> Result<&ResidentReservation, crate::received::ReceivedError> {
        self.storage.as_ref().ok_or_else(capacity)
    }
}
impl Deref for CurrentPayload {
    type Target = str;
    fn deref(&self) -> &str {
        &self.text
    }
}
impl fmt::Display for CurrentPayload {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.text)
    }
}

impl ReceptionState {
    pub(crate) fn fund_current_records(
        &mut self,
        budget: &ByteBudget,
    ) -> Result<(), crate::execution::ExecutionError> {
        for owner in self
            .perception_evidence
            .iter_mut()
            .flat_map(indexmap::IndexMap::values_mut)
        {
            owner.metadata_storage = Some(
                CurrentOwnerStorage::install(owner, budget)
                    .map_err(|_| crate::execution::ExecutionError::Capacity)?,
            );
            for contact in owner.current.values_mut() {
                contact.metadata_storage = Some(
                    budget.reserve_backing(
                        super::current_journal::contact_copy_heap(contact)
                            .map_err(|_| crate::execution::ExecutionError::Capacity)?,
                    )?,
                );
                if let Some(payload) = contact.encoded_payload.as_mut() {
                    let bytes = payload
                        .len()
                        .checked_add(size_of::<CurrentPayload>() + 2 * size_of::<usize>())
                        .ok_or(crate::execution::ExecutionError::Capacity)?;
                    let payload =
                        Arc::get_mut(payload).ok_or(crate::execution::ExecutionError::Invariant)?;
                    payload.storage = Some(budget.reserve_record(bytes)?);
                }
                for group in &mut contact.content.groups {
                    let bytes =
                        super::current_journal::received_content_copy_bytes(&group.received)
                            .map_err(|_| crate::execution::ExecutionError::Capacity)?;
                    let received = Arc::get_mut(&mut group.received)
                        .ok_or(crate::execution::ExecutionError::Invariant)?;
                    received.storage = Some(budget.reserve_record(bytes)?);
                }
            }
        }
        Ok(())
    }
}
