//! An exact retained version is a read product, never a current collection row.
//! It has no placement/ordinal and cannot enter the canonical mutation APIs.
use super::*;
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ResidentReservation, SharedMemoryPin};
use std::mem::{align_of, size_of};

#[derive(Debug)]
pub(crate) struct ArchivedPersonalSourceRecord {
    payload: Arc<str>,
    header: PersonalSourceHeader,
    storage: ResidentReservation,
}
impl ArchivedPersonalSourceRecord {
    pub(crate) fn install(
        kind: PersonalSourceKind,
        actor: &str,
        payload: String,
        meaning: &impl PersonalEvidenceMeaning,
        budget: &ByteBudget,
    ) -> Result<Self, ExperienceError> {
        let body = header_input::header_input(&payload)?;
        let header = header(object(&body)?, kind, actor, &payload, meaning)?;
        if header.class == AccountClass::Sensory
            && header.expires_at.is_none_or(|at| !at.is_finite())
        {
            return Err(ExperienceError::InvalidBody("sensory expiry"));
        }
        let bytes = size_of::<Self>()
            .checked_add(2 * size_of::<usize>() + align_of::<Self>() - 1)
            .and_then(|n| n.checked_add(payload.len()))
            .and_then(|n| n.checked_add(2 * size_of::<usize>()))
            .and_then(|n| n.checked_add(header.heap_bytes()?))
            .ok_or(ExperienceError::Capacity)?;
        let storage = budget
            .reserve_record(bytes)
            .map_err(|_| ExperienceError::Capacity)?;
        Ok(Self {
            payload: Arc::from(payload),
            header,
            storage,
        })
    }
    pub(crate) fn header(&self) -> &PersonalSourceHeader {
        &self.header
    }
    pub(crate) fn payload(&self) -> &str {
        &self.payload
    }
    pub(crate) fn capture_pin(
        &self,
        budget: &ByteBudget,
    ) -> Result<Arc<SharedMemoryPin>, ExperienceError> {
        self.storage
            .capture_pin(budget)
            .map_err(|_| ExperienceError::Capacity)
    }
    pub(crate) fn capture_originals(
        &self,
        registry: &mut crate::reception::OriginalRevisionRegistry,
        through: f64,
        budget: &ByteBudget,
    ) -> Result<CapturedPersonalOriginals, crate::received::ReceivedError> {
        originals::capture_originals_payload(&self.payload, &self.header, registry, through, budget)
    }
}
