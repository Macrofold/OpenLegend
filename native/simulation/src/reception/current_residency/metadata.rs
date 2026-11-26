//! Each receiver keeps its actual current directory and independently mutable
//! metadata. Rich immutable current bodies/originals have separate shared guards.
use super::*;
use crate::host::ByteReservation;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};

#[derive(Clone, Copy)]
pub(in super::super) enum CurrentOwnerPart {
    Sight,
    Motion,
    Geometry,
    Attention,
    Observer,
    Gaps,
    Support,
    Current,
}
const PARTS: [CurrentOwnerPart; 8] = [
    CurrentOwnerPart::Sight,
    CurrentOwnerPart::Motion,
    CurrentOwnerPart::Geometry,
    CurrentOwnerPart::Attention,
    CurrentOwnerPart::Observer,
    CurrentOwnerPart::Gaps,
    CurrentOwnerPart::Support,
    CurrentOwnerPart::Current,
];

#[derive(Debug)]
pub(crate) struct CurrentOwnerStorage {
    parts: [usize; 8],
    current_keys: usize,
    storage: ResidentReservation,
    budget: ByteBudget,
}

fn bytes(owner: &PerceptionEvidenceOwner, part: CurrentOwnerPart, keys: usize) -> Option<usize> {
    match part {
        CurrentOwnerPart::Sight => owner.visual_confirmation.heap_bytes(),
        CurrentOwnerPart::Motion => owner.motion_samples.heap_bytes(),
        CurrentOwnerPart::Geometry => owner.geometry.heap_bytes(),
        CurrentOwnerPart::Attention => owner.attention.heap_bytes(),
        CurrentOwnerPart::Observer => owner.observer.heap_bytes(),
        CurrentOwnerPart::Gaps => owner.gaps.heap_bytes(),
        CurrentOwnerPart::Support => owner.support.heap_bytes(),
        CurrentOwnerPart::Current => {
            map_storage::<String, CurrentContact>(owner.current.capacity())?.checked_add(keys)
        }
    }
}

impl CurrentOwnerStorage {
    pub(in super::super) fn install(
        owner: &PerceptionEvidenceOwner,
        budget: &ByteBudget,
    ) -> Result<Self, crate::received::ReceivedError> {
        let current_keys = owner
            .current
            .keys()
            .try_fold(0usize, |n, k| n.checked_add(k.capacity()))
            .ok_or_else(capacity)?;
        let mut parts = [0; 8];
        for part in PARTS {
            parts[part as usize] = bytes(owner, part, current_keys).ok_or_else(capacity)?;
        }
        let total = heap_sum(parts).ok_or_else(capacity)?;
        Ok(Self {
            parts,
            current_keys,
            storage: budget.reserve_backing(total).map_err(|_| capacity())?,
            budget: budget.clone(),
        })
    }

    pub(in super::super) fn settle(
        owner: &mut PerceptionEvidenceOwner,
        part: CurrentOwnerPart,
        from: &mut ByteReservation,
        restoring: bool,
    ) -> Result<(), crate::received::ReceivedError> {
        let before = owner.metadata_storage.as_ref().ok_or_else(capacity)?;
        let after = bytes(owner, part, before.current_keys).ok_or_else(capacity)?;
        let storage = owner.metadata_storage.as_mut().ok_or_else(capacity)?;
        let total = storage
            .storage
            .bytes()
            .checked_sub(storage.parts[part as usize])
            .and_then(|n| n.checked_add(after))
            .ok_or_else(capacity)?;
        if total > storage.storage.bytes() {
            let growth = from
                .split_off(total - storage.storage.bytes())
                .map_err(|_| capacity())?;
            if restoring {
                storage.budget.restore_backing(&mut storage.storage, growth)
            } else {
                storage.budget.fund_backing(&mut storage.storage, growth)
            }
            .map_err(|_| capacity())?;
        }
        storage.storage.resize(total).map_err(|_| capacity())?;
        storage.parts[part as usize] = after;
        Ok(())
    }

    pub(in super::super) fn key_change(
        owner: &mut PerceptionEvidenceOwner,
        removed: usize,
        added: usize,
    ) -> Result<(), crate::received::ReceivedError> {
        let storage = owner.metadata_storage.as_mut().ok_or_else(capacity)?;
        storage.current_keys = storage
            .current_keys
            .checked_sub(removed)
            .and_then(|n| n.checked_add(added))
            .ok_or_else(capacity)?;
        Ok(())
    }
}
