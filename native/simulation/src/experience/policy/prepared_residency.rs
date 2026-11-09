//! Actual allocations owned by the immutable selected policy fields.
use super::*;
use crate::host::retained_size::{HeapBytes, heap_record};
heap_record!(PreparedResponseRelevance {
    question,
    uncertain,
    relevant,
    irrelevant
});
heap_record!(PreparedResponsePurposeData {
    id,
    label,
    meaning,
    requires,
    means
});
impl HeapBytes for PreparedSpeechAudience {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Person => Some(0),
            Self::PossibleHearer => Some(0),
        }
    }
}
impl HeapBytes for PreparedSpeechAddressee {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Involved => Some(0),
            Self::Beneficiary => Some(0),
        }
    }
}
heap_record!(PreparedSpeechData {
    id,
    text,
    purposes,
    requires,
    audience,
    addressee
});
heap_record!(PreparedAppraisalData {
    definition_id,
    meaning,
    amounts
});
heap_record!(PreparedObservationImportance {
    importance,
    urgency
});
heap_record!(PreparedObservationData {
    range_role,
    ordinary,
    entered_reach
});
heap_record!(PreparedResponseLimits {
    pursuit_seconds,
    pursuit_radius,
    hold_seconds,
    assessment_seconds,
    range_margin,
    stable_seconds
});
heap_record!(PreparedResponseProfile {
    id,
    version,
    instructions,
    relevance,
    purposes,
    speech,
    appraisals,
    observations,
    limits
});

crate::install::definition_layout!(PreparedResponseProfile; arrays [PreparedResponsePurposeData, PreparedSpeechData, PreparedAppraisalData, String, f64]; maps []);
