//! Explicit receiver allocation accounting. Scalar layout is charged by the
//! owning allocation; these walks add owned String/Vec/Box storage and selected
//! immutable source retention. JSON byte quotas are a separate gameplay cost.

use super::*;
pub(crate) use crate::host::retained_size::{HeapBytes, heap_record, heap_sum, map_storage};
use crate::received::values::{
    BodyFragment, BodyPoseFragment, FrameFragment, HeaderFragment, LocationFragment,
};
use crate::received::{ReceivedValueFragment, ReceivedValueRecord, ReceivedValueReference};
use crate::state::{Point, SurfacePoint};
use crate::values::{AttributeValue, DefinitionPin};

macro_rules! fixed { ($($ty:ty),* $(,)?)=>{$(impl HeapBytes for $ty { fn heap_bytes(&self)->Option<usize>{Some(0)} })*}; }
fixed!(FacetRole, Point);
heap_record!(VisualMeasurement { lease_id, token });
fixed!(
    EvidenceFamily,
    SurfaceEdge,
    SpeechPerception,
    Intelligibility,
    SpeechAddressing,
    AttributeDisplay,
    AttributeKnowledge,
    ChangeFeedback,
    ComparisonOperator,
    ComparisonUnit,
    ComparisonRounding,
    FeatureModality,
    ReferenceRole,
    ExperienceModality,
    TriggerKind,
    AssociationStrength,
    PossibleStrength,
    DetectedKind,
    MotionCorrespondence,
    AwarenessFamily,
    Elevation,
    Modality,
    SoundAcquisition,
    SoundKind,
    ContactDetail,
    SightTiming,
    ContactTiming,
    CurrentAvailabilityState
);
fixed!(
    crate::received::values::BodyKind,
    crate::received::values::LocationKind,
    crate::received::values::BodyPoseKind,
    crate::received::values::HeaderKind,
    crate::received::values::FrameKind
);
heap_record!(SurfacePoint { surface_id });
heap_record!(Named {
    name,
    name_form,
    indefinite_article
});
heap_record!(DefinitionPin { id, digest });
impl HeapBytes for AttributeValue {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Number(_) => Some(0),
            Self::Category(value) => value.heap_bytes(),
        }
    }
}
heap_record!(ObserverLife {
    actor_id,
    physical_life
});
impl HeapBytes for SourceRevision {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Text(v0) => heap_sum([v0.heap_bytes()?]),
            Self::Number(v0) => heap_sum([v0.heap_bytes()?]),
        }
    }
}
heap_record!(EvidenceSource {
    family,
    id,
    revision,
    observer
});
heap_record!(ObservedSurfacePatch {
    vertices,
    normal,
    error_radius,
    edges,
    frame
});
heap_record!(ReceivedSurface {
    point,
    normal,
    support
});
heap_record!(ObservedBoundary {
    a,
    b,
    error_radius,
    near_surface,
    far_surface,
    drop_lower
});
heap_record!(SpeechParticipant {
    name_at_time,
    name_form,
    indefinite_article
});
impl HeapBytes for SpeechSegment {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Heard { text } => heap_sum([text.heap_bytes()?]),
            Self::Unintelligible => Some(0),
        }
    }
}
heap_record!(PerceivedSpeech {
    perception,
    intelligibility,
    segments,
    speaker,
    addressing,
    addressee,
    delivery,
    direction,
    listener_position,
    name_claim
});
heap_record!(AttributePresentation { icon, color });
heap_record!(AttributeComparison {
    operator,
    value,
    unit,
    rounding
});
heap_record!(AttributeView {
    body_health,
    change_feedback,
    meaning,
    condition,
    id,
    version,
    name,
    display,
    presentation,
    value,
    status,
    min,
    max,
    unit,
    concern,
    critical,
    editor_critical,
    editor_critical_comparison,
    revision
});
heap_record!(ReceivedLocationSample {
    location,
    frame,
    measured_from,
    measured_through,
    acquired_at,
    confirmed_from,
    confirmed_through,
    original,
    confirmation,
    aliases
});
heap_record!(CarriedItem {
    item_kind_as_observed
});
heap_record!(ObservedPileItem {
    id,
    definition_id,
    name,
    quantity,
    portable
});
heap_record!(VersionedFamily { id, version });
heap_record!(ReceivedFeatures {
    modality,
    family,
    features,
    quality
});
impl HeapBytes for ObservedItemLocation {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::World {
                point,
                label,
                container_id,
            } => heap_sum([
                point.heap_bytes()?,
                label.heap_bytes()?,
                container_id.heap_bytes()?,
            ]),
            Self::Possession { label } => heap_sum([label.heap_bytes()?]),
        }
    }
}
impl HeapBytes for EncounterExposure {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Place {
                reported_by,
                id,
                revision,
                label,
                description,
                point,
                location_label,
                landmark_id,
                mechanism_fields,
            } => heap_sum([
                reported_by.heap_bytes()?,
                id.heap_bytes()?,
                revision.heap_bytes()?,
                label.heap_bytes()?,
                description.heap_bytes()?,
                point.heap_bytes()?,
                location_label.heap_bytes()?,
                landmark_id.heap_bytes()?,
                mechanism_fields.heap_bytes()?,
            ]),
            Self::InventoryItem {
                id,
                definition,
                label,
                description,
                introduction_key,
                inscription,
                observed_location,
                mechanism_fields,
            } => heap_sum([
                id.heap_bytes()?,
                definition.heap_bytes()?,
                label.heap_bytes()?,
                description.heap_bytes()?,
                introduction_key.heap_bytes()?,
                inscription.heap_bytes()?,
                observed_location.heap_bytes()?,
                mechanism_fields.heap_bytes()?,
            ]),
        }
    }
}
impl HeapBytes for ExposureParticipant {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Exposure { exposure } => heap_sum([exposure.heap_bytes()?]),
        }
    }
}
heap_record!(ReceivedSpeechParticipants { speaker, addressee });
heap_record!(ReceivedEventParticipant {
    reference_ordinal,
    participant
});
heap_record!(ReceivedReference { id, label, role });
impl HeapBytes for EventScalar {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Null(v0) => heap_sum([v0.heap_bytes()?]),
            Self::Text(v0) => heap_sum([v0.heap_bytes()?]),
            Self::Boolean(v0) => heap_sum([v0.heap_bytes()?]),
            Self::Number(v0) => heap_sum([v0.heap_bytes()?]),
        }
    }
}
heap_record!(SupportAlias { family, id });
impl HeapBytes for SensoryFacet {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::SurfacePatch { patch } => heap_sum([patch.heap_bytes()?]),
            Self::PhysicalBoundary { boundary } => heap_sum([boundary.heap_bytes()?]),
            Self::Detected { detected, limits } => {
                heap_sum([detected.heap_bytes()?, limits.heap_bytes()?])
            }
            Self::Location { location, frame } => {
                heap_sum([location.heap_bytes()?, frame.heap_bytes()?])
            }
            Self::Body { body } => heap_sum([body.heap_bytes()?]),
            Self::Description { text } => heap_sum([text.heap_bytes()?]),
            Self::Carried { items } => heap_sum([items.heap_bytes()?]),
            Self::PileContents { items } => heap_sum([items.heap_bytes()?]),
            Self::PublicAttributes { attributes } => heap_sum([attributes.heap_bytes()?]),
            Self::ObservedMotion {
                exposure,
                earlier,
                later,
                correspondence,
            } => heap_sum([
                exposure.heap_bytes()?,
                earlier.heap_bytes()?,
                later.heap_bytes()?,
                correspondence.heap_bytes()?,
            ]),
            Self::Contact { exposure, detail } => {
                heap_sum([exposure.heap_bytes()?, detail.heap_bytes()?])
            }
            Self::Speech {
                speech,
                participants,
            } => heap_sum([speech.heap_bytes()?, participants.heap_bytes()?]),
            Self::PerceivedFeature { sample } => heap_sum([sample.heap_bytes()?]),
            Self::Sound { sound, source } => heap_sum([sound.heap_bytes()?, source.heap_bytes()?]),
            Self::EncounterExposure { exposure } => heap_sum([exposure.heap_bytes()?]),
            Self::Event {
                event_type,
                text,
                modality,
                importance,
                sequence,
                recognized,
                intelligible,
                entity_episodes,
                trigger_kind,
                source_subject,
                urgency,
                content,
                data,
                references,
                participants,
            } => heap_sum([
                event_type.heap_bytes()?,
                text.heap_bytes()?,
                modality.heap_bytes()?,
                importance.heap_bytes()?,
                sequence.heap_bytes()?,
                recognized.heap_bytes()?,
                intelligible.heap_bytes()?,
                entity_episodes.heap_bytes()?,
                trigger_kind.heap_bytes()?,
                source_subject.heap_bytes()?,
                urgency.heap_bytes()?,
                content.heap_bytes()?,
                data.heap_bytes()?,
                references.heap_bytes()?,
                participants.heap_bytes()?,
            ]),
            Self::Association {
                subject,
                strength,
                learning_support,
            } => heap_sum([
                subject.heap_bytes()?,
                strength.heap_bytes()?,
                learning_support.heap_bytes()?,
            ]),
            Self::Claim {
                claim,
                strength,
                speaker,
                words_as_heard,
                support,
                support_aliases,
            } => heap_sum([
                claim.heap_bytes()?,
                strength.heap_bytes()?,
                speaker.heap_bytes()?,
                words_as_heard.heap_bytes()?,
                support.heap_bytes()?,
                support_aliases.heap_bytes()?,
            ]),
        }
    }
}
heap_record!(ObservationFactKey { source, ordinal });
heap_record!(ObservationExposure {
    track,
    observer,
    episode_id
});
impl HeapBytes for ObserverSubject {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Entity { entity_id } => heap_sum([entity_id.heap_bytes()?]),
            Self::Individual { individual_id } => heap_sum([individual_id.heap_bytes()?]),
        }
    }
}
impl HeapBytes for ObservedPoint {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Surface(v0) => heap_sum([v0.heap_bytes()?]),
            Self::World(v0) => heap_sum([v0.heap_bytes()?]),
        }
    }
}
impl HeapBytes for ObservedLocation {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Point {
                point,
                error_radius,
            } => heap_sum([point.heap_bytes()?, error_radius.heap_bytes()?]),
            Self::Bearing {
                from,
                sector,
                elevation,
                spread,
            } => heap_sum([
                from.heap_bytes()?,
                sector.heap_bytes()?,
                elevation.heap_bytes()?,
                spread.heap_bytes()?,
            ]),
            Self::Region { center, radius } => {
                heap_sum([center.heap_bytes()?, radius.heap_bytes()?])
            }
        }
    }
}
heap_record!(ObservationFrame {
    position_at_observation,
    forward_at_observation
});
impl HeapBytes for ObservationOrigin {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Occurrence {
                event_id,
                at,
                order,
            } => heap_sum([
                event_id.heap_bytes()?,
                at.heap_bytes()?,
                order.heap_bytes()?,
            ]),
            Self::Exposure {
                episode_id,
                detector_id,
                measured_from,
                measured_through,
                source,
            } => heap_sum([
                episode_id.heap_bytes()?,
                detector_id.heap_bytes()?,
                measured_from.heap_bytes()?,
                measured_through.heap_bytes()?,
                source.heap_bytes()?,
            ]),
        }
    }
}
heap_record!(ReceivedFacetProof {
    original,
    confirmation,
    confirmed_from,
    confirmed_through,
    aliases
});
heap_record!(DetectorIdentity { id, version });
heap_record!(ReceivedObservationHeader {
    observer,
    acquired_at,
    received_order,
    modality,
    detector,
    channel
});
impl HeapBytes for EvidenceParticipant {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Exposure { exposure } => heap_sum([exposure.heap_bytes()?]),
            Self::Individual {
                subject,
                association,
            } => heap_sum([subject.heap_bytes()?, association.heap_bytes()?]),
            Self::Described {
                description_as_heard,
            } => heap_sum([description_as_heard.heap_bytes()?]),
        }
    }
}
heap_record!(ObservedBodyPose {
    position,
    heading,
    support_surface_id
});
heap_record!(AcousticDirection { sector, elevation });
heap_record!(VisibleSoundSource {
    entity_id,
    physical_life,
    episode_id,
    description
});
heap_record!(PerceivedSound {
    kind,
    acquisition,
    physical_life,
    acquired_at,
    listener_position,
    received_level_db_spl,
    clarity_margin_db,
    detect_threshold_db,
    direction,
    visible_source
});
heap_record!(ObservedStorage { placement_revision });
heap_record!(ObservedBodyDetails {
    kind,
    appearance,
    radius,
    height,
    outward,
    activity,
    label,
    description,
    quantity,
    heat_lit,
    remains_phase,
    storage,
    assembly,
    animation,
    effects,
    body_plan,
    subtype,
    icon
});
heap_record!(ObservedBody {
    kind,
    appearance,
    radius,
    height,
    outward,
    position,
    heading,
    support_surface_id,
    activity,
    label,
    description,
    quantity,
    heat_lit,
    remains_phase,
    storage,
    assembly,
    animation,
    effects,
    body_plan,
    subtype,
    icon
});
heap_record!(ObservationContext { subjects, attended });
heap_record!(ObservationFacet {
    support,
    ordinal,
    role,
    as_of,
    measured_from,
    measured_through,
    acquired_at,
    value
});
heap_record!(ObservationContribution {
    id,
    revision,
    observer,
    origin,
    acquired_at,
    received_order,
    modality,
    channel,
    detector,
    context,
    facets
});
impl HeapBytes for FacetReception {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Body { pose_ref } => heap_sum([pose_ref.heap_bytes()?]),
            Self::Location { frame_ref } => heap_sum([frame_ref.heap_bytes()?]),
        }
    }
}
heap_record!(ReceivedFacetValue {
    kind,
    reference,
    reception
});
heap_record!(ReceivedObservationFacet {
    support,
    ordinal,
    role,
    as_of,
    measured_from,
    measured_through,
    acquired_at,
    value
});
heap_record!(ReceivedObservation {
    id,
    revision,
    origin,
    channel,
    context,
    header_ref,
    facets
});
heap_record!(CurrentAvailability { state, at });
heap_record!(CurrentDescriptionSupport {
    original,
    confirmation,
    confirmed_from,
    confirmed_through,
    aliases,
    role,
    availability,
    description_measured_from,
    description_measured_through,
    description_acquired_at
});
heap_record!(CurrentBodyPoseSupport {
    original,
    confirmation,
    confirmed_from,
    confirmed_through,
    aliases,
    role,
    availability,
    frame,
    pose_measured_from,
    pose_measured_through,
    pose_acquired_at
});
heap_record!(CapturedCurrentFacet {
    availability,
    pose_support,
    description_support,
    id,
    observer,
    body_lease_id,
    local_subject,
    exposure,
    original,
    role,
    original_aliases,
    modality,
    value,
    confirmation,
    value_measured_from,
    value_measured_through,
    value_acquired_at,
    confirmed_from,
    confirmed_through
});
impl HeapBytes for ReceivedValueReference {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Shared(v0) => heap_sum([v0.heap_bytes()?]),
            Self::Inline(v0) => heap_sum([v0.heap_bytes()?]),
        }
    }
}
heap_record!(BodyFragment { kind, body });
heap_record!(LocationFragment { kind, location });
heap_record!(BodyPoseFragment { kind, pose });
heap_record!(HeaderFragment { kind, header });
heap_record!(FrameFragment { kind, frame });
heap_record!(CurrentFacetGrant {
    subject_id,
    original,
    exposure,
    channel
});
heap_record!(CurrentStoredField {
    id,
    body_lease_id,
    local_subject,
    value
});
heap_record!(CurrentPartPartition {
    members,
    availability,
    frame_ref
});
heap_record!(CurrentReceivedContent { grant, fields });
heap_record!(DetectionLocation { value, frame });
heap_record!(DetectionSupportInput { source, channel, detector, location, continuity });
heap_record!(SupportReceipt { body, pattern_id, observation });
heap_record!(ActiveSupport { key, input });
heap_record!(SupportPattern { id, channel, detector, continuity, envelope, active, observation });
heap_record!(DetectionSupportState { policy, sources, patterns });
impl HeapBytes for std::sync::Arc<CurrentReceivedContent> {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            std::mem::size_of::<CurrentReceivedContent>(),
            self.as_ref().heap_bytes()?,
            2 * std::mem::size_of::<usize>() + std::mem::align_of::<CurrentReceivedContent>() - 1,
        ])
    }
}
impl HeapBytes for CurrentReceivedGroup {
    fn heap_bytes(&self) -> Option<usize> {
        // The fields token has its own actual Arc control block. A live batch token
        // is shared with CurrentJournal and remains charged at that single owner.
        heap_sum([
            self.recordings.heap_bytes()?,
            self.received.heap_bytes()?,
            self.metadata.heap_bytes()?,
            2 * std::mem::size_of::<usize>(),
        ])
    }
}
heap_record!(VisualConfirmation {
    channel,
    complete,
    frame_ref
});
heap_record!(CurrentSightStamp { frame_ref });
heap_record!(CurrentSightCheck { frame_ref, detail });
heap_record!(BoundsQueryCursor { pending });
heap_record!(PriorGeometryFrame { frame });
heap_record!(GeometryFragment {
    feature_id,
    observation,
    recording,
    key
});
heap_record!(ReceivedGeometryFeature {
    observation,
    recording
});
heap_record!(MotionOriginal { id });
heap_record!(MotionConfirmation { id });
heap_record!(EarlierMotion {
    value,
    original,
    confirmation,
    aliases
});
heap_record!(CurrentMotionSample { earlier });
heap_record!(ReceptionGap { episode_id });
heap_record!(ReceivedGeometryState {
    basis,
    source_basis,
    episode_id,
    frame,
    prior_frame,
    query_key,
    feature_cursor,
    fragments,
    boundaries,
    boundary_keys
});
heap_record!(ReceivedValueRecord {
    id,
    at,
    sequence,
    value,
    bytes
});
impl HeapBytes for ReceivedValueFragment {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Sensory(value) => value.heap_bytes(),
            Self::Body(value) => value.heap_bytes(),
            Self::Location(value) => value.heap_bytes(),
            Self::BodyPose(value) => value.heap_bytes(),
            Self::Header(value) => value.heap_bytes(),
            Self::Frame(value) => value.heap_bytes(),
            Self::PersonalAccount(value) => value.heap_bytes(),
            Self::ActionResult(value) => value.heap_bytes(),
        }
    }
}
