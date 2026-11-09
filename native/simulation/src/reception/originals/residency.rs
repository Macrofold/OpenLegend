//! Original custody belongs to the immutable compact source, independently of
//! the phase list, current contact, save prefix or read that happens to hold it.
use super::*;
use std::mem::align_of;

pub(super) fn body_bytes(source: &ReceivedObservation) -> Result<usize, ReceivedError> {
    heap_sum([
        size_of::<ReceivedObservation>(),
        2 * size_of::<usize>() + align_of::<ReceivedObservation>() - 1,
        source.heap_bytes().ok_or_else(capacity)?,
    ])
    .ok_or_else(capacity)
}
impl ReceivedObservation {
    pub(crate) fn capture_pin(
        &self,
        budget: &ByteBudget,
    ) -> Result<Arc<crate::host::SharedMemoryPin>, ReceivedError> {
        self.storage
            .as_ref()
            .ok_or_else(capacity)?
            .capture_pin(budget)
            .map_err(|_| capacity())
    }
    fn same_body(&self, other: &Self) -> bool {
        self.id == other.id
            && self.revision == other.revision
            && self.origin == other.origin
            && self.channel == other.channel
            && self.context == other.context
            && self.header_ref == other.header_ref
            && self.facets == other.facets
    }
    pub(super) fn copy_with_storage(&self, storage: crate::host::ResidentReservation) -> Self {
        Self {
            id: self.id.clone(),
            revision: self.revision,
            origin: self.origin.clone(),
            channel: self.channel.clone(),
            context: self.context.clone(),
            header_ref: self.header_ref.clone(),
            facets: self.facets.clone(),
            storage: Some(storage),
        }
    }
}
impl PartialEq for ReceivedObservation {
    fn eq(&self, other: &Self) -> bool {
        self.same_body(other)
    }
}
impl ReceptionState {
    /// This one consuming installation walk funds each actual decoded Arc.
    /// Runtime source creation and completion transfer their own preparation.
    pub(crate) fn fund_originals(
        &mut self,
        budget: &ByteBudget,
    ) -> Result<(), crate::execution::ExecutionError> {
        fn fund(
            source: &mut Arc<ReceivedObservation>,
            budget: &ByteBudget,
        ) -> Result<(), crate::execution::ExecutionError> {
            if source.storage.is_some() {
                return Ok(());
            }
            let bytes =
                body_bytes(source).map_err(|_| crate::execution::ExecutionError::Capacity)?;
            let storage = budget.reserve_record(bytes)?;
            Arc::get_mut(source)
                .ok_or(crate::execution::ExecutionError::Invariant)?
                .storage = Some(storage);
            Ok(())
        }
        for owner in self
            .perception_evidence
            .iter_mut()
            .flat_map(IndexMap::values_mut)
        {
            owner.original_storage = Some(
                OriginalMetadata::install(owner, budget)
                    .map_err(|_| crate::execution::ExecutionError::Capacity)?,
            );
            for source in &mut owner.received {
                fund(source, budget)?;
            }
            for contact in owner.current.values_mut() {
                for source in contact.content.originals.values_mut() {
                    fund(source, budget)?;
                }
            }
        }
        Ok(())
    }
}

#[derive(Debug)]
pub(crate) struct OriginalMetadata {
    receipt_bytes: usize,
    storage: crate::host::ResidentReservation,
    budget: ByteBudget,
}
fn metadata_bytes(
    received_capacity: usize,
    receipt_capacity: usize,
    keys: usize,
) -> Result<usize, ReceivedError> {
    heap_sum([
        received_capacity
            .checked_mul(size_of::<Arc<ReceivedObservation>>())
            .ok_or_else(capacity)?,
        map_storage::<String, u64>(receipt_capacity).ok_or_else(capacity)?,
        keys,
    ])
    .ok_or_else(capacity)
}
impl OriginalMetadata {
    pub(super) fn empty(budget: &ByteBudget) -> Result<Self, ReceivedError> {
        Ok(Self {
            receipt_bytes: 0,
            storage: budget.reserve_backing(0).map_err(|_| capacity())?,
            budget: budget.clone(),
        })
    }
    fn install(
        owner: &PerceptionEvidenceOwner,
        budget: &ByteBudget,
    ) -> Result<Self, ReceivedError> {
        let keys = owner
            .receipts
            .keys()
            .try_fold(0usize, |n, key| n.checked_add(key.capacity()))
            .ok_or_else(capacity)?;
        Ok(Self {
            receipt_bytes: keys,
            storage: budget
                .reserve_backing(metadata_bytes(
                    owner.received.capacity(),
                    owner.receipts.capacity(),
                    keys,
                )?)
                .map_err(|_| capacity())?,
            budget: budget.clone(),
        })
    }
    pub(super) fn prepare_append(
        owner: &mut PerceptionEvidenceOwner,
        key: &String,
    ) -> Result<(), ReceivedError> {
        let meta = owner.original_storage.as_mut().ok_or_else(invalid)?;
        let received = if owner.received.len() == owner.received.capacity() {
            owner
                .received
                .capacity()
                .checked_mul(2)
                .ok_or_else(capacity)?
                .max(4)
        } else {
            owner.received.capacity()
        };
        let receipts = if owner.receipts.len() == owner.receipts.capacity() {
            owner
                .receipts
                .capacity()
                .checked_mul(2)
                .and_then(|n| n.checked_add(4))
                .ok_or_else(capacity)?
        } else {
            owner.receipts.capacity()
        };
        let keys = meta
            .receipt_bytes
            .checked_add(key.capacity())
            .ok_or_else(capacity)?;
        meta.budget.resize_backing(&mut meta.storage, metadata_bytes(received, receipts, keys)?)
            .map_err(|_| capacity())?;
        owner.received.try_reserve(1).map_err(|_| capacity())?;
        owner.receipts.try_reserve(1).map_err(|_| capacity())?;
        meta.receipt_bytes = keys;
        meta.storage
            .resize(metadata_bytes(
                owner.received.capacity(),
                owner.receipts.capacity(),
                keys,
            )?)
            .map_err(|_| capacity())
    }
    pub(super) fn removed(
        owner: &mut PerceptionEvidenceOwner,
        key_bytes: usize,
    ) -> Result<(), ReceivedError> {
        let meta = owner.original_storage.as_mut().ok_or_else(invalid)?;
        meta.receipt_bytes = meta
            .receipt_bytes
            .checked_sub(key_bytes)
            .ok_or_else(invalid)?;
        meta.storage
            .resize(metadata_bytes(
                owner.received.capacity(),
                owner.receipts.capacity(),
                meta.receipt_bytes,
            )?)
            .map_err(|_| invalid())
    }
    pub(super) fn projection(
        budget: &ByteBudget,
        received: usize,
        receipts: usize,
        key_bound: usize,
    ) -> Result<Self, ReceivedError> {
        Ok(Self {
            receipt_bytes: 0,
            storage: budget
                .reserve_backing(metadata_bytes(received, receipts, key_bound)?)
                .map_err(|_| capacity())?,
            budget: budget.clone(),
        })
    }
    pub(super) fn settle(
        &mut self,
        received: usize,
        receipts: &IndexMap<String, u64>,
    ) -> Result<(), ReceivedError> {
        self.receipt_bytes = receipts
            .keys()
            .try_fold(0usize, |n, key| n.checked_add(key.capacity()))
            .ok_or_else(capacity)?;
        self.storage
            .resize(metadata_bytes(
                received,
                receipts.capacity(),
                self.receipt_bytes,
            )?)
            .map_err(|_| capacity())
    }
}
impl PartialEq for PerceptionEvidenceOwner {
    fn eq(&self, other: &Self) -> bool {
        self.visual_confirmation == other.visual_confirmation
            && self.motion_samples == other.motion_samples
            && self.motion_expires_at == other.motion_expires_at
            && self.geometry == other.geometry
            && self.attention == other.attention
            && self.life == other.life
            && self.received_at_sequence == other.received_at_sequence
            && self.observer == other.observer
            && self.next_contact == other.next_contact
            && self.received == other.received
            && self.receipts == other.receipts
            && self.current == other.current
            && self.gaps == other.gaps
            && self.support == other.support
    }
}
