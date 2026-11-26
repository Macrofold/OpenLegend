//! Appraisal disclosure borrows the existing own-record and cause reads.
use super::RuntimeNpcRead;
use crate::values::DefinitionPin;

pub struct RuntimeNpcAppraisalRecord<'a> {
    pub ordinal: usize,
    pub pin: &'a DefinitionPin,
    pub revision: u64,
    pub target: Option<&'a str>,
}

impl RuntimeNpcRead {
    /// Borrow exact record identities in the same order as the own-feelings
    /// view. The holder must keep this read until the response binding moves it.
    pub fn appraisal_records(
        &self,
    ) -> Option<impl Iterator<Item = RuntimeNpcAppraisalRecord<'_>> + Clone> {
        Some(
            self.read
                .appraisal_read()?
                .records()
                .enumerate()
                .map(|(ordinal, record)| RuntimeNpcAppraisalRecord {
                    ordinal,
                    pin: &record.definition_pin,
                    revision: record.revision,
                    target: record.target_id.as_deref(),
                }),
        )
    }

    /// Borrow only this admitted personal source's coverage and acquired
    /// subject identities. The server maps them to references it already issued.
    pub fn appraisal_cause(&self, inventory: usize, row: usize) -> Option<(&str, &[String])> {
        let source = self.sources.get(inventory)?.personal.get(row)?;
        source.attribution.appraisal_facts(&source.record)
    }
}
