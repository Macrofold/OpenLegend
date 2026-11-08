//! Typed compact builder allocation accounting. Personal open JSON bodies are
//! immutable fresh parser/producer values; their maps are never cleared/reused.
//! This is the same supported-layout bound as normalized immutable SQL cells.

use super::*;
use crate::host::retained_size::{HeapBytes, heap_record, heap_sum, map_storage};
use crate::reception::CurrentReceivedPart;
use serde_json::Value;

macro_rules! fixed {($($ty:ty),*)=>{$(impl HeapBytes for $ty{fn heap_bytes(&self)->Option<usize>{Some(0)}})*};}
fixed!(
    ReceivedRole,
    ReceivedFieldClock,
    ReceivedClockDifference,
    ReceivedFact,
    CurrentReceivedPart
);
heap_record!(ReceivedReceiptHeader {
    subject,
    source_ids,
    subject_identity,
    context_subjects,
    availability,
    coverage_gap,
    ended_fields
});
heap_record!(TemporalAvailability { fields });
impl HeapBytes for CoverageGap {
    fn heap_bytes(&self) -> Option<usize> {
        Some(0)
    }
}
heap_record!(ReceivedSource {
    id,
    revision,
    observer
});
heap_record!(ReceivedProof { aliases });
heap_record!(ReceivedDetail { proof });
impl HeapBytes for BodyReception {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Pose { pose } => pose.heap_bytes(),
            Self::Reference { pose_ref } => pose_ref.heap_bytes(),
        }
    }
}
impl HeapBytes for ReceivedReception {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Body { pose } => pose.heap_bytes(),
            Self::Location { .. } => Some(0),
        }
    }
}
heap_record!(ReceivedField {
    value_ref,
    track,
    clock,
    original,
    support,
    detail,
    reception
});
impl HeapBytes for ReceivedOrigin {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Occurrence { event_id, .. } => event_id.heap_bytes(),
            Self::Exposure {
                episode_id,
                detector_id,
                ..
            } => heap_sum([episode_id.heap_bytes()?, detector_id.heap_bytes()?]),
        }
    }
}
heap_record!(ReceivedReceipt {
    header,
    clock,
    sources,
    frames,
    origin,
    facets
});
heap_record!(ReceivedEntry { receipt });
heap_record!(ReceivedBatch {
    actor_id,
    epoch,
    entries
});
heap_record!(ActionResultOutcome { code });
heap_record!(ActionResultValue {
    id,
    text,
    outcome,
    facts
});
impl HeapBytes for values::PersonalAccountFragment {
    fn heap_bytes(&self) -> Option<usize> {
        let data = self.data.as_ref().map_or(Some(0), |data| {
            data.iter().try_fold(
                map_storage::<String, Value>(data.len())?,
                |bytes, (key, value)| {
                    heap_sum([
                        bytes,
                        key.heap_bytes()?,
                        crate::records::save::cell_heap(value)?,
                    ])
                },
            )
        })?;
        heap_sum([
            self.id.heap_bytes()?,
            self.text.heap_bytes()?,
            self.event_type.heap_bytes()?,
            self.content.heap_bytes()?,
            data,
        ])
    }
}

heap_record!(TemporalCaptureFacet {
    value,
    preferred,
    reception,
    track,
    support,
    detail_support,
    pose_frame,
    original,
    received_from
});
heap_record!(TemporalCaptureInput {
    coverage_gap,
    ended_fields,
    availability,
    receiver_frame,
    subject,
    context_subjects,
    subject_identity,
    source_ids,
    origin,
    facets
});
impl HeapBytes for TemporalReception {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Body { pose } => pose.heap_bytes(),
            Self::Location { frame } => frame.heap_bytes(),
        }
    }
}
heap_record!(TemporalDetailSupport { proof });

heap_record!(TemporalFacetReference {
    value_ref,
    track,
    original,
    received_from,
    support,
    detail_support,
    pose_frame,
    reception
});
heap_record!(TemporalReceipt {
    header,
    locator,
    id,
    receiver_frame,
    origin,
    facets
});
heap_record!(CurrentMemberPart { kind });
heap_record!(TemporalCurrentContent { kind, value });
heap_record!(TemporalCurrentGroupCheckpoint {
    epoch,
    members,
    content,
    last_source
});
