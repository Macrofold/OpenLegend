//! Current and archived canonical bodies share read semantics, while only a
//! genuine current row retains collection placement and mutation eligibility.
use super::*;
use crate::experience::{ArchivedPersonalSourceRecord, PersonalSourceHeader};

pub(super) fn current_record(
    state: &SimulationState,
    scope: &super::cursor::NpcPersonalScope,
    actor: &str,
    kind: PersonalSourceKind,
    row: InstalledRow,
    budget: &ByteBudget,
) -> Result<Arc<PersonalSourceRecord>, ExecutionError> {
    let _decode = budget.reserve(crate::experience::encoded_body_bound(&row.payload)?)?;
    let record =
        PersonalSourceRecord::install(kind, actor, row, &state.installed.account_law(), budget)?;
    let coverage = scope
        .coverage(kind)
        .ok_or(ExecutionError::InvalidCheckpoint)?;
    if !coverage.parent_present
        || record.position() >= coverage.next_ordinal
        || record.header().at > scope.at
    {
        return Err(ExecutionError::InvalidCheckpoint);
    }
    Ok(Arc::new(record))
}

pub(crate) enum CapturedPersonalRecord {
    Current(Arc<PersonalSourceRecord>),
    Archive(Arc<ArchivedPersonalSourceRecord>),
}
impl CapturedPersonalRecord {
    pub(crate) fn header(&self) -> &PersonalSourceHeader {
        match self {
            Self::Current(record) => record.header(),
            Self::Archive(record) => record.header(),
        }
    }
    pub(crate) fn payload(&self) -> &str {
        match self {
            Self::Current(record) => record.payload(),
            Self::Archive(record) => record.payload(),
        }
    }
    pub(super) fn capture_pin(
        &self,
        budget: &ByteBudget,
    ) -> Result<Arc<SharedMemoryPin>, ExecutionError> {
        match self {
            Self::Current(record) => record.capture_pin(budget),
            Self::Archive(record) => record.capture_pin(budget),
        }
        .map_err(ExecutionError::from)
    }
    pub(super) fn capture_originals(
        &self,
        registry: &mut OriginalRevisionRegistry,
        through: f64,
        budget: &ByteBudget,
    ) -> Result<crate::experience::CapturedPersonalOriginals, ExecutionError> {
        match self {
            Self::Current(record) => record.capture_originals(registry, through, budget),
            Self::Archive(record) => record.capture_originals(registry, through, budget),
        }
        .map_err(ExecutionError::from)
    }
}
