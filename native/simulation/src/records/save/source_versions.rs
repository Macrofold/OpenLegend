//! Immutable plan custody, not another archive catalogue. The application SQL
//! writer consumes this same plan; its bodies stay funded until exact prefix ACK.
use super::*;
use crate::host::retained_size::HeapBytes;
use crate::received::SourceVersionPlan;

pub(crate) struct SourceVersionCustody {
    pub(super) value: SourceVersionPlan,
    previous: Option<Arc<Self>>,
    _storage: ByteReservation,
}
impl Drop for SourceVersionCustody {
    fn drop(&mut self) {
        // A pending suffix may contain many small accepted plans. Release its
        // private chain iteratively rather than recursively exhausting a stack.
        let mut previous = self.previous.take();
        while let Some(owner) = previous {
            match Arc::try_unwrap(owner) {
                Ok(mut owner) => previous = owner.previous.take(),
                Err(_) => break,
            }
        }
    }
}
impl SaveJournal {
    pub(crate) fn fund_source_versions(
        &self,
        value: SourceVersionPlan,
    ) -> Result<Arc<SourceVersionCustody>, SaveError> {
        let storage = self
            .budget
            .reserve(
                value
                    .heap_bytes()
                    .and_then(|n| {
                        n.checked_add(size_of::<SourceVersionCustody>() + 2 * size_of::<usize>())
                    })
                    .ok_or(SaveError::Capacity)?,
            )
            .map_err(|_| SaveError::Capacity)?;
        Ok(Arc::new(SourceVersionCustody {
            value,
            previous: self.suffix_versions.clone(),
            _storage: storage,
        }))
    }
    pub(crate) fn prepared_source_versions(
        &self,
        prepared: &PreparedSaveAppend,
    ) -> Result<&SourceVersionPlan, SaveError> {
        self.validate_prepared(prepared)?;
        Ok(&self
            .pending_append
            .as_ref()
            .ok_or(SaveError::Binding)?
            .source_versions
            .value)
    }
}
