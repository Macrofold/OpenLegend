//! Observer-owned source identity and independently measured facts. These types
//! preserve current perception-values/current/sound storage meanings; knowing a
//! source's routing identity never supplies an observer with personal knowledge.

pub use crate::state::Named;
use crate::state::Point;
use crate::values::AttributeValue;
use crate::values::DefinitionPin;
use crate::values::{
    deserialize_nullable, deserialize_present_option, deserialize_safe_integer, is_safe_record_id,
};
pub use crate::worlds::InstalledAcousticPolicy as AcousticPolicy;
pub use crate::worlds::InstalledVoiceFeatures as VoiceFeatures;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

mod text_decode;

mod source_encoding;
pub(crate) use source_encoding::event_references_view;
mod current;
pub use current::*;
mod geometry;
pub use geometry::*;
mod support;
pub use support::*;
mod state;
pub use state::*;
mod materialize;
pub use materialize::*;
mod sensors;
mod visual;
pub(crate) use visual::{
    CompletedObserverReception, ObserverReceptionAnswer, ObserverReceptionCursor,
    ObserverReceptionError, ObserverReceptionStep,
};
mod phase;
mod visual_source;
pub(crate) use phase::begin_perception_phase;
pub use sensors::*;
pub(crate) use visual::{
    CompletedNativeVisual, PersonalVisualAnswer, PersonalVisualCursor, PersonalVisualStep,
    ReceivedPersonalVisual, VisualNotice, VisualOpportunity, receive_native_visual,
};
mod sound;
pub use sound::*;
mod audience;
pub(crate) use audience::*;
mod event;
pub(crate) use event::*;
mod capture;
pub(crate) mod retained_size;
pub use capture::*;
mod acquisition;
pub(crate) use acquisition::*;
mod attention_control;
mod current_journal;
pub(crate) use attention_control::{
    AttentionSelection, AttentionUpdate, evaluate_attention_relations, prune_withdrawn_attention,
    update_attention,
};
mod cohort;
pub(crate) use cohort::{
    CurrentCohort, ReceivingMutation, attended_event_participants, reconcile_current_cohort,
};
mod body_meaning;
mod current_admission;
mod current_write;
use current_admission::*;
mod current_recording;
use current_recording::*;
mod retirement;
pub(crate) use retirement::{
    EndedCurrentEvidence, RetiredPerceptionLife, end_current_evidence, retire_perception_life,
};
mod warning;
pub(crate) use warning::acquire_ordinary_warning;
mod current_lifetime;
use current_lifetime::CurrentReceptionLifetime;
mod receiving;
pub(crate) use current_journal::{CurrentCheckpoint, CurrentContactBatchLease, CurrentJournal};
use current_write::{
    CurrentFacetAddress, CurrentFacetInput, current_facet_set, materialize_current_checks,
};
pub(crate) use current_write::{
    CurrentGroupCoverage, CurrentGroupIdentity, CurrentGroupRecordingUpdate, CurrentGroupSelection,
    CurrentReceptionStamp, current_confirm_groups, current_facet_membership,
    current_groups_set_recording, current_set_unchecked,
};
pub(crate) use receiving::{ReceivingCursor, ReceivingStep};
mod originals;
pub(crate) use originals::*;
mod current_read;
pub use current_read::*;
mod sensory;
pub use sensory::*;
mod episodes;
pub(crate) use episodes::*;
mod validate_state;
mod validation;
pub(crate) use validation::*;
mod import;
pub(crate) use import::{ReceptionRoots, read_reception_rows};
mod save;
pub(crate) use save::encode_perception_owner_changes;
mod storage;
pub use storage::*;
mod current_scope;
pub(crate) use current_scope::CurrentBodyReadScope;
pub use current_scope::OwnedCurrentFacet;
pub(crate) use current_scope::{
    BodyGeometry, BodyMotion, GeometrySample, LocationGeometrySample, OwnedSceneBody,
    ReceivedSceneBody, ReceivedSceneRead,
};

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ObserverLife {
    pub actor_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub physical_life: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum EvidenceFamily {
    Awareness,
    Memory,
    ActionResult,
    PrivateCondition,
    NativeExposure,
    NativeResponse,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum SourceRevision {
    Text(String),
    Number(#[serde(deserialize_with = "deserialize_safe_integer")] u64),
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvidenceSource {
    pub family: EvidenceFamily,
    pub id: String,
    pub revision: SourceRevision,
    pub observer: ObserverLife,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ReceptionError {
    SourceBinding,
    FamilyRevision,
    ChangedSourceFamily,
    ForeignObserver,
    ObservationOrigin,
    LocationPrecision,
    SoundFields,
    VisibleSoundSource,
    PackedTimes,
    SamplingGrid,
    Facet,
    FacetProof,
    TrackIdentity,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SurfaceEdge {
    CoverageLimit,
    PhysicalBoundary,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ObservedSurfacePatch {
    pub vertices: [Point; 4],
    pub normal: Point,
    pub error_radius: f64,
    pub edges: [SurfaceEdge; 4],
    pub frame: ObservationFrame,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ReceivedSurface {
    pub point: Point,
    pub normal: Point,
    pub support: ObservationFactKey,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ObservedBoundary {
    pub a: Point,
    pub b: Point,
    pub error_radius: f64,
    pub near_surface: ReceivedSurface,
    pub far_surface: ReceivedSurface,
    pub drop_lower: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SpeechParticipant {
    pub name_at_time: crate::text::JsText,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub name_form: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub indefinite_article: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(tag = "kind", rename_all = "kebab-case", deny_unknown_fields)]
pub enum SpeechSegment {
    Heard { text: crate::text::JsText },
    Unintelligible,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SpeechPerception {
    Heard,
    Seen,
    #[serde(rename = "self")]
    SelfBody,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Intelligibility {
    None,
    Partial,
    Clear,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SpeechAddressing {
    Ambient,
    Directed,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PerceivedSpeech {
    pub perception: SpeechPerception,
    pub intelligibility: Intelligibility,
    pub segments: Vec<SpeechSegment>,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub addressing: Option<SpeechAddressing>,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub addressee: Option<SpeechParticipant>,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub speaker: Option<SpeechParticipant>,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub delivery: Option<crate::worlds::base_observed::SpeechVolume>,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub direction: Option<AcousticDirection>,
    pub listener_position: Point,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub name_claim: Option<crate::text::JsText>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AttributeDisplay {
    Meter,
    Category,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AttributeKnowledge {
    Known,
    Unknown,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ChangeFeedback {
    Effects,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AttributePresentation {
    pub icon: String,
    pub color: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum ComparisonOperator {
    #[serde(rename = "lessThan")]
    LessThan,
    #[serde(rename = "lessThanOrEqual")]
    LessThanOrEqual,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum ComparisonUnit {
    #[serde(rename = "fractionOfRange")]
    FractionOfRange,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ComparisonRounding {
    None,
    NearestInteger,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AttributeComparison {
    pub operator: ComparisonOperator,
    pub value: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub unit: Option<ComparisonUnit>,
    pub rounding: ComparisonRounding,
}

/// Field order follows `world-modules.ts::projectAttributeInput` and its owner
/// additions: the exact JSON participates in received sharing and novelty.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AttributeView {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    pub name: String,
    pub display: AttributeDisplay,
    pub presentation: AttributePresentation,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub change_feedback: Option<ChangeFeedback>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub body_health: Option<bool>,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub value: Option<AttributeValue>,
    pub status: AttributeKnowledge,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub critical: Option<bool>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub editor_critical: Option<bool>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub min: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub max: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub unit: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub editor_critical_comparison: Option<AttributeComparison>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub meaning: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub condition: Option<crate::text::JsText>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub concern: Option<crate::text::JsText>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedLocationSample {
    pub location: ObservedLocation,
    pub frame: ObservationFrame,
    pub measured_from: f64,
    pub measured_through: f64,
    pub acquired_at: f64,
    pub confirmed_from: f64,
    pub confirmed_through: f64,
    pub original: ObservationFactKey,
    pub confirmation: EvidenceSource,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub aliases: Option<Vec<String>>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CarriedItem {
    pub item_kind_as_observed: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ObservedPileItem {
    pub id: String,
    pub definition_id: String,
    pub name: String,
    pub quantity: f64,
    pub portable: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct VersionedFamily {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum FeatureModality {
    Sight,
    Hearing,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedFeatures {
    pub modality: FeatureModality,
    pub family: VersionedFamily,
    pub features: IndexMap<String, crate::worlds::base_recognition::RecognitionInterval>,
    pub quality: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum ObservedItemLocation {
    World {
        point: crate::state::SurfacePoint,
        label: String,
        container_id: String,
    },
    Possession {
        label: String,
    },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum EncounterExposure {
    Place {
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        reported_by: Option<String>,
        id: String,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        revision: u64,
        label: String,
        description: String,
        point: crate::state::SurfacePoint,
        location_label: String,
        landmark_id: String,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        mechanism_fields: Option<IndexMap<String, IndexMap<String, f64>>>,
    },
    InventoryItem {
        id: String,
        definition: VersionedFamily,
        label: String,
        description: String,
        introduction_key: String,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        inscription: Option<String>,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        observed_location: Option<ObservedItemLocation>,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        mechanism_fields: Option<IndexMap<String, IndexMap<String, f64>>>,
    },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case", deny_unknown_fields)]
pub enum ExposureParticipant {
    Exposure { exposure: ObservationExposure },
}

impl ExposureParticipant {
    pub fn exposure(&self) -> &ObservationExposure {
        match self {
            Self::Exposure { exposure } => exposure,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedSpeechParticipants {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub speaker: Option<ExposureParticipant>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub addressee: Option<ExposureParticipant>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedEventParticipant {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub reference_ordinal: u64,
    pub participant: ExposureParticipant,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ReferenceRole {
    Actor,
    Target,
    Participant,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ReceivedReference {
    pub id: String,
    pub label: crate::text::JsText,
    pub role: ReferenceRole,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ExperienceModality {
    Heard,
    Observed,
    Felt,
    Internal,
}
impl ExperienceModality {
    pub(crate) fn as_str(self) -> &'static str {
        match self {
            Self::Heard => "heard",
            Self::Observed => "observed",
            Self::Felt => "felt",
            Self::Internal => "internal",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TriggerKind {
    AddressedSpeech,
    OverheardSpeech,
    SelfEvent,
    DirectedAction,
    ObservedEvent,
}
impl TriggerKind {
    pub(crate) fn as_str(self) -> &'static str {
        match self {
            Self::AddressedSpeech => "addressed_speech",
            Self::OverheardSpeech => "overheard_speech",
            Self::SelfEvent => "self_event",
            Self::DirectedAction => "directed_action",
            Self::ObservedEvent => "observed_event",
        }
    }
}

/// Only scalar fields already admitted at acquisition are supported by the
/// current event facet. Nested raw world/event records cannot deserialize here.
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(untagged)]
pub enum EventScalar {
    Null(()),
    Text(crate::text::JsText),
    Boolean(bool),
    Number(f64),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AssociationStrength {
    Supported,
    Possible,
    Ambiguous,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PossibleStrength {
    Possible,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum DetectedKind {
    Signal,
    Surface,
    Body,
    Impact,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum MotionCorrespondence {
    UnambiguousReceivedContinuity,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AwarenessFamily {
    Awareness,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SupportAlias {
    pub family: AwarenessFamily,
    pub id: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum SensoryFacet {
    SurfacePatch {
        patch: ObservedSurfacePatch,
    },
    PhysicalBoundary {
        boundary: ObservedBoundary,
    },
    Detected {
        detected: DetectedKind,
        limits: Vec<String>,
    },
    Location {
        location: ObservedLocation,
        frame: ObservationFrame,
    },
    Body {
        body: ObservedBody,
    },
    Description {
        text: crate::text::JsText,
    },
    Carried {
        items: Vec<CarriedItem>,
    },
    PileContents {
        items: Vec<ObservedPileItem>,
    },
    PublicAttributes {
        attributes: Vec<AttributeView>,
    },
    ObservedMotion {
        exposure: ObservationExposure,
        earlier: ReceivedLocationSample,
        later: ReceivedLocationSample,
        correspondence: MotionCorrespondence,
    },
    Contact {
        exposure: ObservationExposure,
        detail: ContactDetail,
    },
    Speech {
        speech: PerceivedSpeech,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        participants: Option<ReceivedSpeechParticipants>,
    },
    PerceivedFeature {
        sample: ReceivedFeatures,
    },
    Sound {
        sound: PerceivedSound,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        source: Option<ExposureParticipant>,
    },
    EncounterExposure {
        exposure: EncounterExposure,
    },
    Event {
        event_type: String,
        text: crate::text::JsText,
        modality: ExperienceModality,
        importance: f64,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        sequence: u64,
        recognized: bool,
        intelligible: bool,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        entity_episodes: Option<IndexMap<String, String>>,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        trigger_kind: Option<TriggerKind>,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        source_subject: Option<ObserverSubject>,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        urgency: Option<f64>,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        content: Option<crate::text::JsText>,
        data: IndexMap<String, EventScalar>,
        references: Vec<ReceivedReference>,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        participants: Option<Vec<ReceivedEventParticipant>>,
    },
    Association {
        subject: ObserverSubject,
        strength: AssociationStrength,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        learning_support: Option<Vec<String>>,
    },
    Claim {
        claim: crate::worlds::base_observed::ObservationClaim,
        strength: PossibleStrength,
        speaker: EvidenceParticipant,
        words_as_heard: crate::text::JsText,
        support: Vec<ObservationFactKey>,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        support_aliases: Option<Vec<SupportAlias>>,
    },
}

impl SensoryFacet {
    pub fn kind(&self) -> &'static str {
        match self {
            Self::SurfacePatch { .. } => "surface-patch",
            Self::PhysicalBoundary { .. } => "physical-boundary",
            Self::Detected { .. } => "detected",
            Self::Location { .. } => "location",
            Self::Body { .. } => "body",
            Self::Description { .. } => "description",
            Self::Carried { .. } => "carried",
            Self::PileContents { .. } => "pile-contents",
            Self::PublicAttributes { .. } => "public-attributes",
            Self::ObservedMotion { .. } => "observed-motion",
            Self::Contact { .. } => "contact",
            Self::Speech { .. } => "speech",
            Self::PerceivedFeature { .. } => "perceived-feature",
            Self::Sound { .. } => "sound",
            Self::EncounterExposure { .. } => "encounter-exposure",
            Self::Event { .. } => "event",
            Self::Association { .. } => "association",
            Self::Claim { .. } => "claim",
        }
    }

    pub fn validate(&self) -> Result<(), ReceptionError> {
        let valid = match self {
            Self::SurfacePatch { patch } => {
                patch.vertices.iter().all(finite_point)
                    && unit_normal(&patch.normal)
                    && patch.error_radius.is_finite()
                    && patch.error_radius >= 0.0
                    && patch.frame.validate()
            }
            Self::PhysicalBoundary { boundary } => {
                finite_point(&boundary.a)
                    && finite_point(&boundary.b)
                    && boundary.error_radius.is_finite()
                    && boundary.error_radius >= 0.0
                    && boundary.drop_lower.is_finite()
                    && [&boundary.near_surface, &boundary.far_surface]
                        .into_iter()
                        .all(|surface| {
                            finite_point(&surface.point)
                                && unit_normal(&surface.normal)
                                && surface.support.source.validate().is_ok()
                        })
            }
            Self::EncounterExposure { exposure } => exposure.validate(),
            Self::Detected { .. } | Self::Description { .. } => true,
            Self::Location { location, frame } => location.validate().is_ok() && frame.validate(),
            Self::Body { body } => body.validate(),
            Self::Carried { items } => items
                .iter()
                .all(|item| !crate::encoding::js_trim(&item.item_kind_as_observed).is_empty()),
            Self::PileContents { items } => items
                .iter()
                .all(|item| item.quantity.is_finite() && item.quantity > 0.0),
            Self::PublicAttributes { attributes } => attributes.iter().all(AttributeView::validate),
            Self::ObservedMotion {
                exposure,
                earlier,
                later,
                ..
            } => {
                exposure.validate().is_ok()
                    && [earlier, later].into_iter().all(|sample| {
                        sample.location.validate().is_ok()
                            && matches!(sample.location, ObservedLocation::Point { .. })
                            && sample.frame.validate()
                            && sample.original.source.validate().is_ok()
                            && sample.confirmation.validate().is_ok()
                            && [
                                sample.measured_from,
                                sample.measured_through,
                                sample.acquired_at,
                                sample.confirmed_from,
                                sample.confirmed_through,
                            ]
                            .into_iter()
                            .all(f64::is_finite)
                            && sample.measured_from == sample.measured_through
                            && sample.measured_through <= sample.acquired_at
                            && sample.confirmed_from <= sample.confirmed_through
                            && sample.aliases.as_ref().is_none_or(|aliases| {
                                aliases.iter().all(|id| is_safe_record_id(id))
                            })
                            && sample.original.source.observer == exposure.observer
                            && sample.confirmation.observer == exposure.observer
                    })
                    && earlier.measured_through < later.measured_from
                    && earlier.acquired_at <= later.acquired_at
                    && earlier.confirmation.id == later.confirmation.id
            }
            Self::Speech {
                speech,
                participants,
            } => {
                speech.validate().is_ok()
                    && participants.as_ref().is_none_or(|participants| {
                        [&participants.speaker, &participants.addressee]
                            .into_iter()
                            .flatten()
                            .all(|value| value.exposure().validate().is_ok())
                    })
            }
            Self::PerceivedFeature { sample } => sample.validate(),
            Self::Sound { sound, source } => {
                sound.validate().is_ok()
                    && source
                        .as_ref()
                        .is_none_or(|value| value.exposure().validate().is_ok())
            }
            Self::Association {
                subject,
                learning_support,
                ..
            } => {
                subject.validate()
                    && learning_support.as_ref().is_none_or(|keys| {
                        keys.iter()
                            .all(|key| crate::worlds::base_recognition::valid_support_key(key))
                    })
            }
            Self::Contact { exposure, .. } => exposure.validate().is_ok(),
            Self::Event {
                importance,
                entity_episodes,
                source_subject,
                urgency,
                data,
                references,
                participants,
                ..
            } => {
                let mut ordinals = std::collections::BTreeSet::new();
                importance.is_finite()
                    && (0.0..=10.0).contains(importance)
                    && source_subject
                        .as_ref()
                        .is_none_or(ObserverSubject::validate)
                    && entity_episodes.as_ref().is_none_or(|episodes| {
                        episodes.iter().all(|(id, episode)| {
                            !episode.is_empty()
                                && references.iter().any(|reference| reference.id == *id)
                        })
                    })
                    && urgency
                        .is_none_or(|value| value.is_finite() && (0.0..=10.0).contains(&value))
                    && data.values().all(|value| match value {
                        EventScalar::Number(number) => number.is_finite(),
                        _ => true,
                    })
                    && participants.as_ref().is_none_or(|participants| {
                        participants.len() <= references.len()
                            && participants.iter().all(|entry| {
                                ordinals.insert(entry.reference_ordinal)
                                    && usize::try_from(entry.reference_ordinal)
                                        .is_ok_and(|ordinal| ordinal < references.len())
                                    && entry.participant.exposure().validate().is_ok()
                            })
                    })
            }
            Self::Claim {
                claim,
                speaker,
                words_as_heard,
                support,
                support_aliases,
                ..
            } => {
                claim.validate()
                    && !words_as_heard.trim_is_empty()
                    && support.len() >= 2
                    && support
                        .iter()
                        .all(|support| support.source.validate().is_ok())
                    && support_aliases
                        .as_ref()
                        .is_none_or(|aliases| aliases.iter().all(|alias| !alias.id.is_empty()))
                    && match speaker {
                        EvidenceParticipant::Individual { subject, .. } => subject.validate(),
                        EvidenceParticipant::Exposure { exposure } => exposure.validate().is_ok(),
                        EvidenceParticipant::Described { .. } => true,
                    }
            }
        };
        if valid {
            Ok(())
        } else {
            Err(ReceptionError::Facet)
        }
    }

    /// Scope validation is separate from fact shape. A retained participant may
    /// never borrow another observer's independently acquired body association.
    pub fn validate_participant_observers(
        &self,
        observer: &ObserverLife,
    ) -> Result<(), ReceptionError> {
        let own = |exposure: &ObservationExposure| &exposure.observer == observer;
        let valid = match self {
            Self::Event { participants, .. } => participants.as_ref().is_none_or(|entries| {
                entries
                    .iter()
                    .all(|entry| own(entry.participant.exposure()))
            }),
            Self::Speech { participants, .. } => participants.as_ref().is_none_or(|participants| {
                [&participants.speaker, &participants.addressee]
                    .into_iter()
                    .flatten()
                    .all(|participant| own(participant.exposure()))
            }),
            Self::Sound { source, .. } => {
                source.as_ref().is_none_or(|source| own(source.exposure()))
            }
            Self::Contact { exposure, .. } => own(exposure),
            Self::Claim {
                speaker: EvidenceParticipant::Exposure { exposure },
                ..
            } => own(exposure),
            Self::ObservedMotion {
                exposure,
                earlier,
                later,
                ..
            } => {
                own(exposure)
                    && &earlier.original.source.observer == observer
                    && &later.original.source.observer == observer
            }
            _ => true,
        };
        if valid {
            Ok(())
        } else {
            Err(ReceptionError::ForeignObserver)
        }
    }
}

fn unit_normal(point: &Point) -> bool {
    finite_point(point) && (point.x.hypot(point.y).hypot(point.z) - 1.0).abs() <= 1e-6
}

impl EvidenceSource {
    pub fn validate(&self) -> Result<(), ReceptionError> {
        if self.id.is_empty() {
            return Err(ReceptionError::SourceBinding);
        }
        match (&self.family, &self.revision) {
            (
                EvidenceFamily::Awareness | EvidenceFamily::Memory | EvidenceFamily::ActionResult,
                SourceRevision::Text(revision),
            ) if !revision.is_empty() => Ok(()),
            (EvidenceFamily::PrivateCondition, SourceRevision::Text(revision))
                if !revision.is_empty() =>
            {
                Ok(())
            }
            (
                EvidenceFamily::PrivateCondition
                | EvidenceFamily::NativeExposure
                | EvidenceFamily::NativeResponse,
                SourceRevision::Number(revision),
            ) if *revision >= 1 => Ok(()),
            _ => Err(ReceptionError::FamilyRevision),
        }
    }

    /// A successful common check can replace its selected identity while keeping
    /// the actual family's revision representation and receiver scope.
    pub fn with_identity(
        &self,
        identity: Option<&Self>,
        minimum_revision: u64,
    ) -> Result<Self, ReceptionError> {
        if identity.is_some_and(|value| value.family != self.family) {
            return Err(ReceptionError::ChangedSourceFamily);
        }
        let mut source = self.clone();
        if let Some(identity) = identity {
            source.id.clone_from(&identity.id);
            source.observer.clone_from(&identity.observer);
        }
        match (&source.family, &mut source.revision) {
            (
                EvidenceFamily::NativeExposure
                | EvidenceFamily::NativeResponse
                | EvidenceFamily::PrivateCondition,
                SourceRevision::Number(revision),
            ) => *revision = (*revision).max(minimum_revision),
            _ => {}
        }
        Ok(source)
    }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ObservationFactKey {
    pub source: EvidenceSource,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub ordinal: u64,
}
// These two source factories intentionally use different property orders.
// Keep the generic evidence/temporal DTO serializer unchanged; only the actual
// original-fact string owner uses contributionFactKey's authored order.
#[derive(Serialize)]
struct OriginalFactSource<'a> {
    family: EvidenceFamily,
    observer: &'a ObserverLife,
    id: &'a str,
    revision: &'a SourceRevision,
}
#[derive(Serialize)]
pub(crate) struct OriginalFact<'a> {
    source: OriginalFactSource<'a>,
    ordinal: u64,
}
pub(crate) fn original_fact_view(fact: &ObservationFactKey) -> OriginalFact<'_> {
    OriginalFact {
        source: OriginalFactSource {
            family: fact.source.family,
            observer: &fact.source.observer,
            id: &fact.source.id,
            revision: &fact.source.revision,
        },
        ordinal: fact.ordinal,
    }
}
pub(crate) fn original_fact_json(
    fact: &ObservationFactKey,
) -> Result<String, crate::received::ReceivedError> {
    crate::encoding::json_record(&original_fact_view(fact))
        .map_err(|_| crate::received::ReceivedError("Original fact encoding failed."))
}
pub(crate) fn original_fact_json_len(
    fact: &ObservationFactKey,
) -> Result<usize, crate::received::ReceivedError> {
    crate::encoding::json_record_len(&original_fact_view(fact))
        .map_err(|_| crate::received::ReceivedError("Original fact encoding failed."))
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ObservationExposure {
    pub observer: ObserverLife,
    pub episode_id: String,
    pub track: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum ObserverSubject {
    Entity { entity_id: String },
    Individual { individual_id: String },
}

impl ObserverSubject {
    pub fn validate(&self) -> bool {
        is_safe_record_id(match self {
            Self::Entity { entity_id } => entity_id,
            Self::Individual { individual_id } => individual_id,
        })
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Elevation {
    Above,
    Level,
    Below,
}

/// Current acquired locations can retain a known support surface. Preserve this
/// observed-only extension without weakening canonical physical positions.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ObservedPoint {
    Surface(crate::state::SurfacePoint),
    World(Point),
}

impl ObservedPoint {
    pub fn position(&self) -> Point {
        match self {
            Self::Surface(point) => point.point(),
            Self::World(point) => *point,
        }
    }
}

impl From<Point> for ObservedPoint {
    fn from(point: Point) -> Self {
        Self::World(point)
    }
}

impl From<crate::state::SurfacePoint> for ObservedPoint {
    fn from(point: crate::state::SurfacePoint) -> Self {
        Self::Surface(point)
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum ObservedLocation {
    Point {
        point: ObservedPoint,
        error_radius: f64,
    },
    Bearing {
        from: ObservedPoint,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        sector: u64,
        elevation: Elevation,
        spread: f64,
    },
    Region {
        center: ObservedPoint,
        radius: f64,
    },
}

impl ObservedLocation {
    pub fn validate(&self) -> Result<(), ReceptionError> {
        let valid = match self {
            Self::Point {
                point,
                error_radius,
            } => {
                finite_point(&point.position()) && error_radius.is_finite() && *error_radius >= 0.0
            }
            Self::Region { center, radius } => {
                finite_point(&center.position()) && radius.is_finite() && *radius >= 0.0
            }
            Self::Bearing {
                from,
                sector,
                spread,
                ..
            } => {
                finite_point(&from.position()) && *sector < 8 && spread.is_finite() && *spread > 0.0
            }
        };
        if valid {
            Ok(())
        } else {
            Err(ReceptionError::LocationPrecision)
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ObservationFrame {
    pub position_at_observation: Point,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub forward_at_observation: Option<f64>,
}

impl ObservationFrame {
    pub fn validate(&self) -> bool {
        finite_point(&self.position_at_observation)
            && self.forward_at_observation.is_none_or(f64::is_finite)
    }
}

impl ObservationExposure {
    pub fn validate(&self) -> Result<(), ReceptionError> {
        if self.observer.actor_id.is_empty() || self.episode_id.is_empty() {
            return Err(ReceptionError::TrackIdentity);
        }
        let parts: (String, String, u64, String) =
            serde_json::from_str(&self.track).map_err(|_| ReceptionError::TrackIdentity)?;
        if parts.0 != self.episode_id
            || !is_safe_record_id(&parts.1)
            || parts.2 == 0
            || parts.2 > crate::identity::MAX_SAFE_INTEGER
            || parts.3.is_empty()
            || parts.3.encode_utf16().count() > 128
            || crate::encoding::json_record(&parts).map_err(|_| ReceptionError::TrackIdentity)?
                != self.track
        {
            return Err(ReceptionError::TrackIdentity);
        }
        Ok(())
    }
}

impl ReceivedFacetProof {
    pub fn validate(&self, observer: &ObserverLife, through: f64) -> Result<(), ReceptionError> {
        self.original.source.validate()?;
        self.confirmation.validate()?;
        if !self.confirmed_from.is_finite()
            || !self.confirmed_through.is_finite()
            || self.confirmed_from > self.confirmed_through
            || self.confirmed_through > through
            || &self.original.source.observer != observer
            || &self.confirmation.observer != observer
            || self
                .aliases
                .as_ref()
                .is_some_and(|aliases| aliases.iter().any(|id| !is_safe_record_id(id)))
        {
            return Err(ReceptionError::FacetProof);
        }
        Ok(())
    }
}

impl PerceivedSpeech {
    pub fn validate(&self) -> Result<(), ReceptionError> {
        let label = |label: &SpeechParticipant| {
            crate::narration::valid_name_parts(
                &label.name_at_time,
                label.name_form.as_deref(),
                label.indefinite_article.as_deref(),
            )
        };
        if self.speaker.as_ref().is_some_and(|value| !label(value))
            || self.addressee.as_ref().is_some_and(|value| !label(value))
            || (self.perception == SpeechPerception::Seen
                && (self.addressing.is_some() || !self.segments.is_empty()))
            || (self.perception != SpeechPerception::Seen && self.addressing.is_none())
            || self
                .direction
                .is_some_and(|direction| direction.sector >= 8)
            || !finite_point(&self.listener_position)
            || self
                .name_claim
                .as_ref()
                .is_some_and(|name| name.trim_is_empty() || name.character_count() > 120)
        {
            return Err(ReceptionError::Facet);
        }
        Ok(())
    }
}

impl ReceivedFeatures {
    pub fn validate(&self) -> bool {
        !self.family.id.is_empty()
            && self.family.version > 0
            && self.quality.is_finite()
            && (0.0..=1.0).contains(&self.quality)
            && crate::worlds::base_recognition::valid_received_features(&self.features)
    }
}

impl AttributeView {
    pub fn validate(&self) -> bool {
        if !is_safe_record_id(&self.id)
            || self.version == 0
            || self.name.is_empty()
            || self.presentation.icon.is_empty()
            || self.presentation.color.is_empty()
        {
            return false;
        }
        match (&self.status, &self.display, &self.value) {
            (AttributeKnowledge::Unknown, _, None) => {}
            (
                AttributeKnowledge::Known,
                AttributeDisplay::Meter,
                Some(AttributeValue::Number(value)),
            ) if value.is_finite() => {}
            (
                AttributeKnowledge::Known,
                AttributeDisplay::Category,
                Some(AttributeValue::Category(_)),
            ) => {}
            _ => return false,
        }
        if self.display == AttributeDisplay::Meter
            && !matches!((self.min, self.max, &self.unit), (Some(min), Some(max), Some(_)) if min.is_finite() && max.is_finite() && min < max)
        {
            return false;
        }
        self.editor_critical_comparison
            .as_ref()
            .is_none_or(|comparison| comparison.value.is_finite())
    }
}

impl EncounterExposure {
    pub fn validate(&self) -> bool {
        let text = |text: &str, max| {
            !crate::encoding::js_trim(text).is_empty() && text.encode_utf16().count() <= max
        };
        let (id, label, description, fields) = match self {
            Self::Place {
                id,
                label,
                description,
                mechanism_fields,
                ..
            }
            | Self::InventoryItem {
                id,
                label,
                description,
                mechanism_fields,
                ..
            } => (id, label, description, mechanism_fields),
        };
        if !is_safe_record_id(id)
            || !text(label, 160)
            || !text(description, 8000)
            || fields.as_ref().is_some_and(|owners| {
                owners.iter().any(|(owner, fields)| {
                    !is_safe_record_id(owner)
                        || fields
                            .iter()
                            .any(|(key, value)| !is_safe_record_id(key) || !value.is_finite())
                })
            })
        {
            return false;
        }
        match self {
            Self::Place {
                revision,
                point,
                location_label,
                landmark_id,
                reported_by,
                ..
            } => {
                *revision > 0
                    && finite_point(&point.point())
                    && is_safe_record_id(&point.surface_id)
                    && text(location_label, 160)
                    && is_safe_record_id(landmark_id)
                    && reported_by.as_ref().is_none_or(|value| text(value, 200))
            }
            Self::InventoryItem {
                definition,
                introduction_key,
                inscription,
                observed_location,
                ..
            } => {
                is_safe_record_id(&definition.id)
                    && definition.version > 0
                    && inscription.as_ref().is_none_or(|value| text(value, 600))
                    && (introduction_key == &format!("inventory-item:{id}")
                        || introduction_key == &format!("inventory-definition:{}", definition.id))
                    && observed_location
                        .as_ref()
                        .is_none_or(|location| match location {
                            ObservedItemLocation::World {
                                point,
                                label,
                                container_id,
                            } => {
                                finite_point(&point.point())
                                    && is_safe_record_id(&point.surface_id)
                                    && text(label, 160)
                                    && is_safe_record_id(container_id)
                            }
                            ObservedItemLocation::Possession { label } => text(label, 160),
                        })
            }
        }
    }
}

impl ObservedBodyDetails {
    pub fn validate(&self) -> bool {
        body_details_valid(
            self.radius,
            self.height,
            self.quantity,
            self.activity.as_deref(),
            self.label.as_ref(),
            self.assembly.as_ref(),
            self.animation.as_ref().and_then(Option::as_ref),
        )
    }
}

impl ObservedBodyPose {
    pub fn validate(&self) -> bool {
        finite_point(&self.position) && self.heading.is_finite()
    }
}

impl ObservedBody {
    pub fn validate(&self) -> bool {
        finite_point(&self.position)
            && self.heading.is_finite()
            && body_details_valid(
                self.radius,
                self.height,
                self.quantity,
                self.activity.as_deref(),
                self.label.as_ref(),
                self.assembly.as_ref(),
                self.animation.as_ref().and_then(Option::as_ref),
            )
    }
}

fn body_details_valid(
    radius: f64,
    height: f64,
    quantity: Option<f64>,
    activity: Option<&str>,
    label: Option<&Named>,
    assembly: Option<&crate::worlds::base_observed::ObservedAssembly>,
    animation: Option<&crate::worlds::base_observed::ObservedActionAnimation>,
) -> bool {
    radius.is_finite()
        && radius >= 0.0
        && height.is_finite()
        && height > 0.0
        && quantity.is_none_or(|value| value.is_finite() && value >= 0.0)
        && activity.is_none_or(|value| value.encode_utf16().count() <= 2048)
        && label.is_none_or(|value| !value.name.is_empty())
        && assembly.is_none_or(|value| value.validate())
        && animation.is_none_or(|value| value.validate())
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum ObservationOrigin {
    Occurrence {
        event_id: String,
        at: f64,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        order: u64,
    },
    Exposure {
        episode_id: String,
        detector_id: String,
        measured_from: f64,
        measured_through: f64,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        source: Option<EvidenceSource>,
    },
}

impl ObservationOrigin {
    pub fn validate(
        &self,
        observer: &ObserverLife,
        acquired_at: f64,
    ) -> Result<(), ReceptionError> {
        match self {
            Self::Occurrence { event_id, at, .. } => {
                if event_id.is_empty() || !at.is_finite() || *at < 0.0 || *at > acquired_at {
                    return Err(ReceptionError::ObservationOrigin);
                }
            }
            Self::Exposure {
                episode_id,
                detector_id,
                measured_from,
                measured_through,
                source,
            } => {
                if episode_id.is_empty()
                    || detector_id.is_empty()
                    || !measured_from.is_finite()
                    || !measured_through.is_finite()
                    || *measured_from < 0.0
                    || measured_through < measured_from
                    || *measured_through > acquired_at
                {
                    return Err(ReceptionError::ObservationOrigin);
                }
                if let Some(source) = source {
                    source.validate()?;
                    if &source.observer != observer {
                        return Err(ReceptionError::ForeignObserver);
                    }
                }
            }
        }
        Ok(())
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedFacetProof {
    pub original: ObservationFactKey,
    pub confirmation: EvidenceSource,
    pub confirmed_from: f64,
    pub confirmed_through: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub aliases: Option<Vec<String>>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Modality {
    Sight,
    Hearing,
    Touch,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DetectorIdentity {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedObservationHeader {
    pub observer: ObserverLife,
    pub acquired_at: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub received_order: u64,
    pub modality: Modality,
    pub detector: DetectorIdentity,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub channel: Option<DefinitionPin>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum EvidenceParticipant {
    Exposure {
        exposure: ObservationExposure,
    },
    Individual {
        subject: ObserverSubject,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        association: Option<ObservationFactKey>,
    },
    Described {
        description_as_heard: String,
    },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ObservedBodyPose {
    pub position: Point,
    pub heading: f64,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub support_surface_id: Option<String>,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CurrentFacetTimes {
    pub value_measured_from: f64,
    pub value_measured_through: f64,
    pub value_acquired_at: f64,
    pub confirmed_from: f64,
    pub confirmed_through: f64,
}

/// Trailing inherited times are absent; interior nulls inherit the first time.
/// The independent five clocks retain their original meanings on every read.
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(transparent)]
pub struct CurrentGroupTimes(Vec<Option<f64>>);

impl<'de> Deserialize<'de> for CurrentGroupTimes {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let values = Vec::<Option<f64>>::deserialize(deserializer)?;
        if values.is_empty() || values.len() > 5 || values[0].is_none() {
            return Err(serde::de::Error::custom("Invalid packed current clocks."));
        }
        Ok(Self(values))
    }
}

impl CurrentGroupTimes {
    pub fn pack(times: CurrentFacetTimes) -> Self {
        let at = times.value_measured_through;
        let inherit = |value| if value == at { None } else { Some(value) };
        let mut values = vec![
            Some(at),
            inherit(times.value_measured_from),
            inherit(times.value_acquired_at),
            inherit(times.confirmed_from),
            inherit(times.confirmed_through),
        ];
        while values.len() > 1 && values.last() == Some(&None) {
            values.pop();
        }
        Self(values)
    }

    pub(crate) fn is_canonically_packed(&self) -> bool {
        self.0.last().is_some_and(Option::is_some)
    }
    pub fn expanded(&self) -> CurrentFacetTimes {
        // The private representation's constructor/deserializer establishes the
        // first time once; expansion is a pure trusted internal read.
        let at = self.0[0].expect("current clock constructor retains its first time");
        let value = |index| self.0.get(index).copied().flatten().unwrap_or(at);
        CurrentFacetTimes {
            value_measured_through: at,
            value_measured_from: value(1),
            value_acquired_at: value(2),
            confirmed_from: value(3),
            confirmed_through: value(4),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AcousticDirection {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub sector: u64,
    pub elevation: Elevation,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct VisibleSoundSource {
    pub entity_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub physical_life: u64,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub episode_id: Option<String>,
    pub description: Named,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SoundAcquisition {
    #[serde(rename = "self")]
    SelfBody,
    External,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SoundKind {
    VoiceLike,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PerceivedSound {
    pub acquisition: SoundAcquisition,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub physical_life: u64,
    pub acquired_at: f64,
    pub listener_position: Point,
    pub received_level_db_spl: f64,
    pub clarity_margin_db: f64,
    pub detect_threshold_db: f64,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub direction: Option<AcousticDirection>,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub visible_source: Option<VisibleSoundSource>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub kind: Option<SoundKind>,
}

impl PerceivedSound {
    pub fn validate(&self) -> Result<(), ReceptionError> {
        if !self.acquired_at.is_finite()
            || self.acquired_at < 0.0
            || !finite_point(&self.listener_position)
            || !self.received_level_db_spl.is_finite()
            || !self.clarity_margin_db.is_finite()
            || !self.detect_threshold_db.is_finite()
            || self.clarity_margin_db < self.detect_threshold_db
            || self.direction.is_some_and(|direction| direction.sector > 7)
            || (self.acquisition == SoundAcquisition::SelfBody
                && (self.direction.is_some() || self.visible_source.is_some()))
        {
            return Err(ReceptionError::SoundFields);
        }
        if let Some(source) = &self.visible_source {
            if !is_safe_record_id(&source.entity_id)
                || source
                    .episode_id
                    .as_ref()
                    .is_some_and(|id| !is_safe_record_id(id))
                || source.description.name.trim_is_empty()
                || !matches!(
                    source.description.name_form.as_deref(),
                    Some("count" | "mass" | "plural")
                )
                || source
                    .description
                    .indefinite_article
                    .as_ref()
                    .is_some_and(|article| !matches!(article.as_str(), "a" | "an"))
            {
                return Err(ReceptionError::VisibleSoundSource);
            }
        }
        Ok(())
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ContactDetail {
    Present,
    Moving,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ContactEpisode {
    pub id: String,
    pub sense_id: String,
    pub detail: ContactDetail,
    pub entered_at: f64,
    pub changed_at: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SampleProgress {
    pub definitions: String,
    pub epoch_at: f64,
    pub next_at: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub life: u64,
    pub suspended: bool,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SensoryProgress {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub routine_sight: Option<SampleProgress>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub incidental_contact: Option<SampleProgress>,
}

impl SampleProgress {
    /// A changed installed definition resets its grid at the next observation;
    /// restoring it never invents a new sighting or moves an unchanged anchor.
    pub fn validate(
        &self,
        sim_time: f64,
        channel_key: Option<&str>,
        seconds: Option<f64>,
    ) -> Result<(), ReceptionError> {
        if self.definitions.is_empty()
            || self.definitions.encode_utf16().count() > 128
            || !self.epoch_at.is_finite()
            || self.epoch_at < 0.0
            || self.epoch_at > sim_time
            || !self.next_at.is_finite()
            || self.next_at <= self.epoch_at
        {
            return Err(ReceptionError::SamplingGrid);
        }
        if channel_key == Some(self.definitions.as_str())
            && let Some(seconds) = seconds
        {
            let ordinal = ((self.next_at - self.epoch_at) / seconds).round();
            if !ordinal.is_finite()
                || ordinal < 1.0
                || ordinal > crate::identity::MAX_SAFE_INTEGER as f64
                || self.next_at != self.epoch_at + ordinal * seconds
                || self.next_at > next_sample_at(self.epoch_at, seconds, sim_time)
            {
                return Err(ReceptionError::SamplingGrid);
            }
        }
        Ok(())
    }
}

/// Keep the existing mathematical grid rather than repeatedly adding a period.
pub fn next_sample_at(epoch_at: f64, seconds: f64, now: f64) -> f64 {
    let ordinal = ((now - epoch_at) / seconds).floor() + 1.0;
    let next_at = epoch_at + ordinal * seconds;
    if next_at > now {
        next_at
    } else {
        epoch_at + (ordinal + 1.0) * seconds
    }
}

fn finite_point(point: &Point) -> bool {
    point.x.is_finite() && point.y.is_finite() && point.z.is_finite()
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SightTiming {
    Boundary,
    Cadence,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ContactTiming {
    Crossing,
    Sampled,
}

/// Trusted supported detector families, independent of authored sense IDs.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(
    tag = "implementation",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum SenseDefinition {
    #[serde(rename = "vision-geometry-v1")]
    VisionGeometry {
        id: String,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        version: u64,
        routine_timing: SightTiming,
        radius: f64,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        sample_seconds: Option<f64>,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        detail_sample_seconds: Option<f64>,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        field_of_view_radians: Option<f64>,
    },
    #[serde(rename = "body-contact-v1")]
    BodyContact {
        id: String,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        version: u64,
        radius: f64,
        awareness_timing: ContactTiming,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        sample_seconds: Option<f64>,
    },
    #[serde(rename = "hearing-db-v1")]
    HearingDb {
        id: String,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        version: u64,
        hearing_floor_db_spl: f64,
    },
}

impl SenseDefinition {
    pub fn id(&self) -> &str {
        match self {
            Self::VisionGeometry { id, .. }
            | Self::BodyContact { id, .. }
            | Self::HearingDb { id, .. } => id,
        }
    }

    pub fn version(&self) -> u64 {
        match self {
            Self::VisionGeometry { version, .. }
            | Self::BodyContact { version, .. }
            | Self::HearingDb { version, .. } => *version,
        }
    }

    pub fn implementation(&self) -> &'static str {
        match self {
            Self::VisionGeometry { .. } => "vision-geometry-v1",
            Self::BodyContact { .. } => "body-contact-v1",
            Self::HearingDb { .. } => "hearing-db-v1",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ObservedStorage {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub placement_revision: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ObservedBodyDetails {
    pub kind: String,
    pub appearance: crate::text::JsText,
    pub radius: f64,
    pub height: f64,
    pub outward: [String; 4],
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub activity: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub animation: Option<Option<crate::worlds::base_observed::ObservedActionAnimation>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub effects: Option<Vec<crate::worlds::base_observed::StatusEffectProjection>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub body_plan: Option<crate::worlds::base_observed::BodyPlan>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub subtype: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub icon: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub label: Option<Named>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub assembly: Option<crate::worlds::base_observed::ObservedAssembly>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub quantity: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub heat_lit: Option<bool>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub remains_phase: Option<crate::worlds::base_observed::RemainsPhase>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub storage: Option<ObservedStorage>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub description: Option<crate::text::JsText>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ObservedBody {
    pub kind: String,
    pub appearance: crate::text::JsText,
    pub radius: f64,
    pub height: f64,
    pub outward: [String; 4],
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub activity: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub animation: Option<Option<crate::worlds::base_observed::ObservedActionAnimation>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub effects: Option<Vec<crate::worlds::base_observed::StatusEffectProjection>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub body_plan: Option<crate::worlds::base_observed::BodyPlan>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub subtype: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub icon: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub label: Option<Named>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub assembly: Option<crate::worlds::base_observed::ObservedAssembly>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub quantity: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub heat_lit: Option<bool>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub remains_phase: Option<crate::worlds::base_observed::RemainsPhase>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub storage: Option<ObservedStorage>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub description: Option<crate::text::JsText>,
    pub position: Point,
    pub heading: f64,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub support_surface_id: Option<String>,
}

impl SenseDefinition {
    /// Exact current trusted detector-family domain. These are installation
    /// constraints from world-modules.ts, not the bundled world's chosen rates.
    pub(crate) fn validate(&self) -> bool {
        let namespace = |id: &str| {
            let part = |part: &str, maximum: usize| {
                !part.is_empty()
                    && part.len() <= maximum
                    && part.as_bytes()[0].is_ascii_lowercase()
                    && part.bytes().skip(1).all(|byte| {
                        byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-'
                    })
            };
            id.split_once(':')
                .is_some_and(|(owner, name)| part(owner, 40) && part(name, 60))
        };
        if !namespace(self.id()) || self.version() != 1 {
            return false;
        }
        match self {
            Self::VisionGeometry {
                routine_timing,
                radius,
                sample_seconds,
                detail_sample_seconds,
                field_of_view_radians,
                ..
            } => {
                radius.is_finite()
                    && *radius > 0.0
                    && *radius <= 32.0
                    && (*routine_timing != SightTiming::Cadence || sample_seconds.is_some())
                    && sample_seconds.is_none_or(|seconds| seconds.is_finite() && seconds > 0.0)
                    && detail_sample_seconds.is_none_or(|seconds| {
                        seconds.is_finite()
                            && seconds > 0.0
                            && sample_seconds.is_some_and(|broad| seconds <= broad)
                    })
                    && field_of_view_radians.is_none_or(|radians| {
                        radians.is_finite()
                            && radians > 0.0
                            && radians <= 2.0 * std::f64::consts::PI
                    })
            }
            Self::BodyContact {
                radius,
                awareness_timing,
                sample_seconds,
                ..
            } => {
                radius.is_finite()
                    && *radius == 0.0
                    && (*awareness_timing != ContactTiming::Sampled
                        || sample_seconds
                            .is_some_and(|seconds| seconds.is_finite() && seconds > 0.0))
            }
            Self::HearingDb {
                hearing_floor_db_spl,
                ..
            } => {
                hearing_floor_db_spl.is_finite() && (-120.0..=200.0).contains(hearing_floor_db_spl)
            }
        }
    }
}
