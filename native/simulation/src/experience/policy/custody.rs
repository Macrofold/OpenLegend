//! Saved cognition guidance is one immutable canonical body, independent of a
//! Node setup copy or a candidate's temporary parsing/capture allowance.
use super::*;
use crate::host::retained_size::{HeapBytes, heap_record, heap_sum};
use crate::host::{ByteBudget, ResidentReservation};
use std::{
    mem::{align_of, size_of},
    ops::Deref,
};
heap_record!(GuidanceCriteria { yes, no });
heap_record!(ActionGuidance {
    reasons,
    consideration,
    selection,
    criteria
});
heap_record!(CognitionRecording {
    action_result_importance,
    exposure_importance
});
heap_record!(DreamPolicy {
    status_effect_id,
    after_seconds
});
heap_record!(CognitionPolicy {
    prepared_responses,
    action_guidance,
    recording,
    dream,
    version,
    revision,
    max_immediate_level,
    significant_event_types,
    reflection
});

pub(crate) struct InstalledCognitionPolicy {
    value: CognitionPolicy,
    _storage: ResidentReservation,
}
impl Deref for InstalledCognitionPolicy {
    type Target = CognitionPolicy;
    fn deref(&self) -> &Self::Target {
        &self.value
    }
}
impl Serialize for InstalledCognitionPolicy {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.value.serialize(serializer)
    }
}
impl InstalledCognitionPolicy {
    pub(super) fn parse(
        source: &str,
        selected_prepared: Option<&VerifiedDefinition<PreparedResponseProfile>>,
        statuses: &StatusEffectPolicy,
        budget: &ByteBudget,
    ) -> Result<Arc<Self>, InstallError> {
        // The only collection in this finite schema is Vec<String>; guidance,
        // criteria, dream and definition-pin fields are fixed records.
        let mut workspace = crate::install::reserve_typed_parse::<CognitionPolicy>(
            source,
            size_of::<String>(),
            None,
            budget,
        )?;
        let value: CognitionPolicy =
            serde_json::from_str(source).map_err(|_| InstallError::CurrentFormat)?;
        value.validate(selected_prepared, statuses)?;
        let bytes = heap_sum([
            size_of::<Self>() + 2 * size_of::<usize>() + align_of::<Self>() - 1,
            value.heap_bytes().ok_or(InstallError::Capacity)?,
        ])
        .ok_or(InstallError::Capacity)?;
        let storage = workspace
            .split_off(bytes)
            .map_err(|_| InstallError::Capacity)?;
        let storage = budget
            .adopt_record(storage)
            .map_err(|_| InstallError::Capacity)?;
        Ok(Arc::new(Self {
            value,
            _storage: storage,
        }))
    }
}
