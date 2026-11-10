//! The actual elapsed cursor yields purpose-specific provider work. Its existing
//! child cursors remain the only owners of effects and sealed completions.
use crate::activity::ActivityView;
use crate::commands::{
    ActivityDisplayAnswer, ActivityDisplayCursor, ActivityDisplayStep, CommandOperation,
    CommandOperationAnswer, CommandOperationError, CommandOperationStep, CompletedActivityDisplay,
    CompletedCommandOperation,
};
use crate::events::{CompletedEvent, EventAnswer, EventCursor, EventStep};
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::{GeometryAnswers, GeometryBinding};
use crate::host::{ByteBudget, ByteReservation};
use crate::language::{CollationAnswer, WordsAnswer};
use crate::plans::{CompletedPlanRun, PlanRunAnswer, PlanRunCursor, PlanRunStep};
use crate::reception::{
    CompletedHeldReception, CompletedNativeExposure, CompletedObserverReception,
    CompletedPerception, GeometryReceptionAnswer, HeldReceptionCursor, HeldReceptionStep,
    NativeExposureCursor, NativeExposureStep, ObserverReceptionAnswer, ObserverReceptionCursor,
    ObserverReceptionStep, PerceptionAnswer, PerceptionCursor, PerceptionStep,
    PersonalVisualAnswer,
};
use crate::speech::SpeechWord;
use crate::state::SurfacePoint;
use crate::text::JsText;
use crate::time::{AdvanceAnswer, AdvanceCursor, AdvanceError, AdvanceStep, CompletedAdvance};
use serde::{Deserialize, Serialize};
use std::{mem::size_of, sync::Arc};
mod participation;
use participation::{ParticipationReply, poll_participation};
mod restore;
use restore::poll_restore;
mod consolidation;
use consolidation::{ConsolidationReply, poll_consolidation};
mod reflection;
use reflection::{ReflectionReply, poll_reflection};

pub(super) mod source_versions;
use source_versions::{Finalizer as SourceVersionFinalizer, SourceVersionsAnswer};
mod learning;
use learning::LearningReply;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum ProviderKind {
    Geometry,
    Utterance,
    Collation,
    Words,
    Display,
    Canonical,
    Normalization,
    Digest,
    History,
    Control,
    Sources,
    #[serde(rename = "appraisal-outcomes")]
    AppraisalOutcomes,
    #[serde(rename = "choice-descriptions")]
    ChoiceDescriptions,
    #[serde(rename = "typed-actions")]
    TypedActions,
    #[serde(rename = "maintenance-format")]
    MaintenanceFormat,
    #[serde(rename = "consolidation-format")]
    ConsolidationFormat,
    #[serde(rename = "activity-history")]
    ActivityHistory,
    #[serde(rename = "activity-learning-format")]
    ActivityLearningFormat,
    #[serde(rename = "restore-archives")]
    RestoreArchives,
    #[serde(rename = "support-membership")]
    SupportMembership,
    #[serde(rename = "source-versions")]
    SourceVersions,
}
#[derive(Debug)]
pub(crate) enum DriveError {
    StaleResponse,
    MalformedResponse,
    Capacity,
    Encoding,
    Semantic(AdvanceError),
}
impl From<ExecutionError> for DriveError {
    fn from(e: ExecutionError) -> Self {
        Self::Semantic(e.into())
    }
}
impl From<AdvanceError> for DriveError {
    fn from(e: AdvanceError) -> Self {
        Self::Semantic(e)
    }
}
impl From<CommandOperationError> for DriveError {
    fn from(e: CommandOperationError) -> Self {
        Self::Semantic(e.into())
    }
}
impl From<crate::events::EventError> for DriveError {
    fn from(e: crate::events::EventError) -> Self {
        Self::Semantic(CommandOperationError::Event(e).into())
    }
}
impl From<crate::reception::ObserverReceptionError> for DriveError {
    fn from(e: crate::reception::ObserverReceptionError) -> Self {
        Self::Semantic(e.into())
    }
}
impl From<crate::experience::HistoryPreparationError> for DriveError {
    fn from(error: crate::experience::HistoryPreparationError) -> Self {
        use crate::experience::HistoryPreparationError as E;
        match error {
            E::StaleResponse => Self::StaleResponse,
            E::MalformedResponse => Self::MalformedResponse,
            E::Capacity => Self::Capacity,
            E::Owner(error) => Self::from(error),
        }
    }
}

/// The pending driver owns the question body. Detached provider jobs receive
/// independently funded encoded/decoded copies, rather than keeping this body
/// alive after consumption. Weak tickets retain only its fixed Arc backing.
pub(crate) struct ProviderQuestion {
    kind: ProviderKind,
    binding: GeometryBinding,
    json: String,
    _reservation: ByteReservation,
    backing: Arc<ByteReservation>,
}
impl ProviderQuestion {
    pub(crate) fn kind(&self) -> ProviderKind {
        self.kind
    }
    pub(crate) fn binding(&self) -> GeometryBinding {
        self.binding
    }
    pub(crate) fn json(&self) -> &str {
        &self.json
    }
    pub(crate) fn backing(&self) -> &Arc<ByteReservation> {
        &self.backing
    }
    fn prepare<T: Serialize + ?Sized>(
        kind: ProviderKind,
        binding: GeometryBinding,
        value: &T,
        budget: &ByteBudget,
    ) -> Result<Arc<Self>, DriveError> {
        #[derive(Serialize)]
        struct Envelope<'a, T: ?Sized> {
            kind: ProviderKind,
            binding: GeometryBinding,
            value: &'a T,
        }
        let envelope = Envelope {
            kind,
            binding,
            value,
        };
        let bytes =
            crate::encoding::json_record_len(&envelope).map_err(|_| DriveError::Encoding)?;
        // The serializer's growing UTF8 buffer and its final String can coexist.
        // This is allocation admission; measured resident costs remain separate.
        let bound = bytes
            .checked_mul(4)
            .and_then(|n| n.checked_add(64))
            .ok_or(DriveError::Capacity)?;
        let mut reservation = budget.reserve(bound).map_err(|_| DriveError::Capacity)?;
        // Arc keeps its whole fixed slot until the last Weak drops, even after
        // the String/body owner ends. The shared guard also funds its own Arc.
        let backing_bytes = size_of::<Self>()
            .checked_add(2 * size_of::<usize>())
            .and_then(|n| n.checked_add(size_of::<ByteReservation>() + 2 * size_of::<usize>()))
            .ok_or(DriveError::Capacity)?;
        let backing = Arc::new(
            budget
                .reserve(backing_bytes)
                .map_err(|_| DriveError::Capacity)?,
        );
        let json = crate::encoding::json_record(&envelope).map_err(|_| DriveError::Encoding)?;
        reservation
            .resize(json.capacity())
            .map_err(|_| DriveError::Capacity)?;
        Ok(Arc::new(Self {
            kind,
            binding,
            json,
            _reservation: reservation,
            backing,
        }))
    }
}
/// The host funds construction of this incoming String before moving it here.
/// Its original allowance remains live through typed consumption or refusal.
pub(crate) struct ProviderResponse {
    kind: ProviderKind,
    binding: GeometryBinding,
    json: String,
    _reservation: ByteReservation,
}
impl ProviderResponse {
    pub(crate) fn new(
        kind: ProviderKind,
        binding: GeometryBinding,
        json: String,
        reservation: ByteReservation,
    ) -> Result<Self, DriveError> {
        if reservation.bytes() < json.capacity() {
            return Err(DriveError::Capacity);
        }
        Ok(Self {
            kind,
            binding,
            json,
            _reservation: reservation,
        })
    }
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Utterance {
    binding: GeometryBinding,
    words: Vec<SpeechWord>,
    lowercase: JsText,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Formatted {
    binding: GeometryBinding,
    view: ActivityView,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Canonical {
    binding: GeometryBinding,
    canonical: String,
}
use crate::encoding::{JsonAllocationShape as DecodeShape, JsonShapeError};
impl From<JsonShapeError> for DriveError {
    fn from(error: JsonShapeError) -> Self {
        match error {
            JsonShapeError::Capacity => Self::Capacity,
            JsonShapeError::MalformedResponse => Self::MalformedResponse,
        }
    }
}
impl DecodeShape {
    fn bound(&self, kind: ProviderKind, wire: usize) -> Result<usize, DriveError> {
        use crate::host::retained_size::map_storage;
        use crate::{
            activity::{ActivityDetail, ActivityFact},
            geometry::*,
        };
        // A newly decoded Vec grows to at most four slots per live element
        // (including its minimum non-byte capacity). These are every supported
        // response array's largest inline elements, rather than a byte multiplier.
        let element = match kind {
            ProviderKind::Geometry => [
                size_of::<RoutePlan>(),
                size_of::<NavigationAnswer>(),
                size_of::<Option<PhysicalFeature>>(),
                size_of::<PhysicalFeatureAnswer>(),
                size_of::<ConvexViewAnswer>(),
                size_of::<Option<StandingSelection>>(),
                size_of::<Option<SurfacePoint>>(),
                size_of::<Option<SurfaceLineAnswer>>(),
                size_of::<SightSweep>(),
                size_of::<BodySweepAnswer>(),
            ]
            .into_iter()
            .max()
            .unwrap_or(0),
            ProviderKind::Display => [
                size_of::<ActivityView>(),
                size_of::<ActivityFact>(),
                size_of::<ActivityDetail>(),
            ]
            .into_iter()
            .max()
            .unwrap_or(0),
            ProviderKind::SupportMembership => size_of::<usize>(),
            ProviderKind::Utterance => size_of::<SpeechWord>(),
            ProviderKind::Words => size_of::<Vec<JsText>>().max(size_of::<JsText>()),
            ProviderKind::Collation => size_of::<u32>(),
            ProviderKind::Canonical
            | ProviderKind::Digest
            | ProviderKind::History
            | ProviderKind::Control
            | ProviderKind::Sources
            | ProviderKind::AppraisalOutcomes
            | ProviderKind::MaintenanceFormat
            | ProviderKind::ConsolidationFormat
            | ProviderKind::ActivityHistory
            | ProviderKind::ActivityLearningFormat
            | ProviderKind::RestoreArchives
            | ProviderKind::SourceVersions => 0,
            ProviderKind::Normalization => {
                size_of::<JsText>().max(size_of::<Option<crate::language::FreeTypedActionSyntax>>())
            }
            ProviderKind::ChoiceDescriptions => size_of::<JsText>(),
            ProviderKind::TypedActions => crate::response::TypedActionAnswer::array_element_bytes(),
        };
        let arrays = self
            .array_items
            .checked_mul(4)
            .and_then(|n| n.checked_mul(element))
            .ok_or(DriveError::Capacity)?;
        // Tagged route enums temporarily buffer map members before constructing
        // their typed fields. Activity detail fields additionally keep both their
        // raw-entry and typed maps until each level has completed. One-entry map
        // allocation bounds each entry of these fresh (never sparse) maps.
        let map_entry = if matches!(kind, ProviderKind::Display) {
            map_storage::<JsText, ActivityDetail>(1)
                .ok_or(DriveError::Capacity)?
                .checked_add(
                    map_storage::<JsText, Box<serde_json::value::RawValue>>(1)
                        .ok_or(DriveError::Capacity)?,
                )
                .ok_or(DriveError::Capacity)?
        } else if matches!(kind, ProviderKind::Geometry) {
            4 * size_of::<(String, serde_json::Value)>()
        } else {
            0
        };
        let maps = self
            .members
            .checked_mul(map_entry)
            .ok_or(DriveError::Capacity)?;
        // JsText may coexist with its original raw text, Unicode trial/scratch,
        // a growing u16 buffer, and growing/final immutable quoted text. Raw
        // ActivityDetail parsing retains at most its owning raw value plus five
        // current levels (depth 0..4). This funds preparation, not resident size.
        let text_copies = 1 + 2 + 2 * size_of::<u16>() + 2 + 2 + 1;
        let raw_levels = if matches!(kind, ProviderKind::Display) {
            6
        } else {
            0
        };
        let text = wire
            .checked_mul(text_copies + raw_levels)
            .and_then(|n| {
                n.checked_add(
                    self.strings
                        .checked_mul(8 * size_of::<u16>() + 2 * size_of::<usize>())?,
                )
            })
            .ok_or(DriveError::Capacity)?;
        size_of::<Answer>()
            .checked_add(arrays)
            .and_then(|n| n.checked_add(maps))
            .and_then(|n| n.checked_add(text))
            .ok_or(DriveError::Capacity)
    }
}
enum Answer {
    Geometry(GeometryAnswers),
    Utterance(Utterance),
    Collation(CollationAnswer),
    Words(WordsAnswer),
    Display(Formatted),
    Canonical(Canonical),
    Normalization(crate::language::AttemptNormalizationAnswer),
    TypedActions(crate::response::TypedActionAnswer),
    MaintenanceFormat(crate::cognition::format::MaintenanceFormatAnswer),
    ConsolidationFormat(crate::experience::consolidation::ConsolidationFormatAnswer),
    Digest(crate::language::CanonicalJsonAnswer),
    History(crate::experience::HistoryEditAnswer),
    Control(super::host_control::ControlAnswer),
    Sources(crate::capture::NpcSourcesAnswer),
    ActivityHistory(crate::activity::LearningHistoryAnswer),
    ActivityLearningFormat(crate::activity::LearningFormatAnswer),
    AppraisalOutcomes(crate::response::AppraisalCreatesAnswer),
    ChoiceDescriptions(crate::capture::NpcDescriptionsAnswer),
    RestoreArchives(crate::restore::RestoreArchivesAnswer),
    SupportMembership(crate::received::SupportMembershipAnswer),
    SourceVersions(SourceVersionsAnswer),
}
impl Answer {
    fn decode(input: &ProviderResponse, budget: &ByteBudget) -> Result<Self, DriveError> {
        let parse = |error: serde_json::Error| {
            drop(error);
            DriveError::MalformedResponse
        };
        let value = match input.kind {
            ProviderKind::SourceVersions => {
                Self::SourceVersions(SourceVersionsAnswer::decode(&input.json, budget)?)
            }
            ProviderKind::SupportMembership => {
                Self::SupportMembership(serde_json::from_str(&input.json).map_err(parse)?)
            }
            ProviderKind::Geometry => {
                Self::Geometry(serde_json::from_str(&input.json).map_err(parse)?)
            }
            ProviderKind::Utterance => {
                Self::Utterance(serde_json::from_str(&input.json).map_err(parse)?)
            }
            ProviderKind::Collation => {
                Self::Collation(serde_json::from_str(&input.json).map_err(parse)?)
            }
            ProviderKind::Words => Self::Words(serde_json::from_str(&input.json).map_err(parse)?),
            ProviderKind::Normalization => {
                Self::Normalization(serde_json::from_str(&input.json).map_err(parse)?)
            }
            ProviderKind::Display => {
                Self::Display(serde_json::from_str(&input.json).map_err(parse)?)
            }
            ProviderKind::Canonical => {
                Self::Canonical(serde_json::from_str(&input.json).map_err(parse)?)
            }
            ProviderKind::Digest => Self::Digest(serde_json::from_str(&input.json).map_err(parse)?),
            ProviderKind::Control => {
                Self::Control(serde_json::from_str(&input.json).map_err(parse)?)
            }
            ProviderKind::Sources => Self::Sources(crate::capture::NpcSourcesAnswer::decode(
                &input.json,
                budget,
            )?),
            ProviderKind::AppraisalOutcomes => Self::AppraisalOutcomes(
                crate::response::AppraisalCreatesAnswer::decode(&input.json, budget)?,
            ),
            ProviderKind::ChoiceDescriptions => {
                Self::ChoiceDescriptions(serde_json::from_str(&input.json).map_err(parse)?)
            }
            ProviderKind::TypedActions => {
                Self::TypedActions(serde_json::from_str(&input.json).map_err(parse)?)
            }
            ProviderKind::MaintenanceFormat => Self::MaintenanceFormat(
                crate::cognition::format::MaintenanceFormatAnswer::decode(&input.json, budget)?,
            ),
            ProviderKind::ActivityHistory => Self::ActivityHistory(
                crate::activity::LearningHistoryAnswer::decode(&input.json, budget)?,
            ),
            ProviderKind::ActivityLearningFormat => Self::ActivityLearningFormat(
                crate::activity::LearningFormatAnswer::decode(&input.json, budget)?,
            ),
            ProviderKind::ConsolidationFormat => Self::ConsolidationFormat(
                crate::experience::consolidation::ConsolidationFormatAnswer::decode(
                    &input.json,
                    budget,
                )?,
            ),
            ProviderKind::History => Self::History(crate::experience::HistoryEditAnswer::decode(
                &input.json,
                budget,
            )?),
            ProviderKind::RestoreArchives => Self::RestoreArchives(
                crate::restore::RestoreArchivesAnswer::decode(&input.json, budget)?,
            ),
        };
        if value.binding(input.binding.geometry_revision) != input.binding {
            return Err(DriveError::StaleResponse);
        }
        Ok(value)
    }
    fn binding(&self, geometry_revision: u64) -> GeometryBinding {
        match self {
            Self::SourceVersions(v) => v.binding,
            Self::SupportMembership(v) => v.binding,
            Self::Geometry(v) => v.binding,
            Self::Utterance(v) => v.binding,
            Self::Collation(v) => v.binding,
            Self::Words(v) => v.binding,
            Self::Display(v) => v.binding,
            Self::Canonical(v) => v.binding,
            Self::Normalization(v) => v.binding,
            Self::Digest(v) => v.binding,
            Self::History(v) => v.provider_binding(geometry_revision),
            Self::Control(v) => v.binding,
            Self::Sources(v) => v.binding(),
            Self::AppraisalOutcomes(v) => v.binding,
            Self::ChoiceDescriptions(v) => v.binding,
            Self::TypedActions(v) => v.binding,
            Self::MaintenanceFormat(v) => v.binding,
            Self::ConsolidationFormat(v) => v.binding,
            Self::ActivityHistory(v) => v.binding,
            Self::ActivityLearningFormat(v) => v.binding,
            Self::RestoreArchives(v) => v.provider_binding(geometry_revision),
        }
    }
    fn kind(&self) -> ProviderKind {
        match self {
            Self::SourceVersions(_) => ProviderKind::SourceVersions,
            Self::SupportMembership(_) => ProviderKind::SupportMembership,
            Self::Geometry(_) => ProviderKind::Geometry,
            Self::Utterance(_) => ProviderKind::Utterance,
            Self::Collation(_) => ProviderKind::Collation,
            Self::Words(_) => ProviderKind::Words,
            Self::Display(_) => ProviderKind::Display,
            Self::Canonical(_) => ProviderKind::Canonical,
            Self::Normalization(_) => ProviderKind::Normalization,
            Self::Digest(_) => ProviderKind::Digest,
            Self::History(_) => ProviderKind::History,
            Self::Control(_) => ProviderKind::Control,
            Self::Sources(_) => ProviderKind::Sources,
            Self::AppraisalOutcomes(_) => ProviderKind::AppraisalOutcomes,
            Self::ChoiceDescriptions(_) => ProviderKind::ChoiceDescriptions,
            Self::TypedActions(_) => ProviderKind::TypedActions,
            Self::MaintenanceFormat(_) => ProviderKind::MaintenanceFormat,
            Self::ConsolidationFormat(_) => ProviderKind::ConsolidationFormat,
            Self::ActivityHistory(_) => ProviderKind::ActivityHistory,
            Self::ActivityLearningFormat(_) => ProviderKind::ActivityLearningFormat,
            Self::RestoreArchives(_) => ProviderKind::RestoreArchives,
        }
    }
}
// Only the real, finite cursor tree is routable. In particular, replaying
// step(None) on an awaiting leaf is not a read: several owners prepare a new
// request there. Retain that exact leaf route when the original question yields.
#[derive(Clone, Copy)]
enum EventReply {
    Geometry,
    Utterance,
    Collation,
    Words,
}
#[derive(Clone, Copy)]
enum DisplayReply {
    Geometry,
    Format,
}
#[derive(Clone, Copy)]
enum CommandReply {
    Geometry,
    Event(EventReply),
    Display(DisplayReply),
}
#[derive(Clone, Copy)]
enum PlanReply {
    Geometry,
    Canonical,
    Command(CommandReply),
}
#[derive(Clone, Copy)]
enum HeldReply {
    Geometry,
    Language,
}
#[derive(Clone, Copy)]
enum NativeReply {
    Geometry,
}
#[derive(Clone, Copy)]
enum HumanReply {
    Geometry,
    Language,
    Event(EventReply),
}
#[derive(Clone, Copy)]
enum PerceptionReply {
    Geometry,
    Held(HeldReply),
    Native(NativeReply),
    Human(HumanReply),
}
#[derive(Clone, Copy)]
enum AdvanceReply {
    Participation(ParticipationReply),
    Geometry,
    Collation,
    Event(EventReply),
    Command(CommandReply),
    Plan(PlanReply),
    Perception(PerceptionReply),
}
enum Poll<T, R> {
    Continue,
    Question(Arc<ProviderQuestion>, R),
    Complete(T),
}
fn question<T: Serialize + ?Sized, V, R>(
    answer: &Option<Answer>,
    kind: ProviderKind,
    binding: GeometryBinding,
    value: &T,
    budget: &ByteBudget,
    route: R,
) -> Result<Poll<V, R>, DriveError> {
    if answer.is_some() {
        return Err(DriveError::StaleResponse);
    }
    Ok(Poll::Question(
        ProviderQuestion::prepare(kind, binding, value, budget)?,
        route,
    ))
}
fn direct(answer: &mut Option<Answer>, kind: ProviderKind) -> Result<Answer, DriveError> {
    if answer.as_ref().is_none_or(|a| a.kind() != kind) {
        return Err(DriveError::StaleResponse);
    }
    answer.take().ok_or(DriveError::StaleResponse)
}

/// Complete semantic owners share the external preparation boundary. Their
/// sealed completions remain distinct; there is no synthetic completion input.
pub(crate) enum CompletedOperation {
    Startup(super::startup::CompletedStartup),
    Reflection(crate::cognition::publication::CompletedReflection),
    Consolidation(crate::cognition::consolidation::CompletedConsolidation),
    ActivityLearning(crate::activity::CompletedActivityLearning),
    Restore(super::restore::CompletedRestore),
    Participation(crate::participation::CompletedParticipation),
    Advance(CompletedAdvance),
    Command(CompletedCommandOperation),
    Response(crate::response::CompletedResponse),
    RecallEdit(crate::experience::CompletedRecallEdit),
    RecentRetention(crate::received::CompletedRecentRetention),
    KnowledgeRetention(crate::received::CompletedKnowledgeRetention),
    AccountRetention(crate::experience::CompletedAccountRetention),
    SupportRetention(crate::received::CompletedSupportRetention),
    HostControl(super::host_control::CompletedHostControl),
    NpcIntake(super::npc_intake::CompletedNpcIntake),
}
impl CompletedOperation {
    pub(crate) fn outcome(&self) -> &crate::commands::Outcome {
        match self {
            Self::Startup(value) => &value.outcome,
            Self::Reflection(value) => &value.outcome,
            Self::Consolidation(value) => &value.outcome,
            Self::ActivityLearning(value) => &value.outcome,
            Self::Restore(value) => &value.outcome,
            Self::Participation(value) => &value.outcome,
            Self::Advance(a) => &a.outcome,
            Self::Command(c) => c.command.outcome(),
            Self::Response(r) => &r.outcome,
            Self::RecallEdit(f) => f.outcome(),
            Self::RecentRetention(r) => &r.outcome,
            Self::KnowledgeRetention(r) => &r.outcome,
            Self::AccountRetention(r) => &r.outcome,
            Self::SupportRetention(r) => &r.outcome,
            Self::HostControl(r) => &r.outcome,
            Self::NpcIntake(r) => &r.outcome,
        }
    }
    pub(crate) fn events(&self) -> impl Iterator<Item = &crate::events::WorldEvent> + Clone {
        let (advance, command, response, participation) = match self {
            Self::Advance(a) => (Some(a), None, None, None),
            Self::Command(c) => (None, Some(c), None, None),
            Self::Response(r) => (None, None, Some(r), None),
            Self::Participation(value) => (None, None, None, Some(value)),
            Self::Startup(_)
            | Self::Reflection(_)
            | Self::Consolidation(_)
            | Self::ActivityLearning(_)
            | Self::Restore(_)
            | Self::RecallEdit(_)
            | Self::SupportRetention(_)
            | Self::AccountRetention(_)
            | Self::KnowledgeRetention(_)
            | Self::RecentRetention(_)
            | Self::HostControl(_)
            | Self::NpcIntake(_) => (None, None, None, None),
        };
        advance
            .into_iter()
            .flat_map(|a| a.events())
            .chain(command.into_iter().flat_map(|c| c.events.iter()))
            .chain(response.into_iter().flat_map(|r| r.events.iter()))
            .chain(
                participation
                    .into_iter()
                    .flat_map(|value| value.events.iter()),
            )
            .chain(
                match self {
                    Self::Reflection(value) => Some(value.events.iter()),
                    _ => None,
                }
                .into_iter()
                .flatten(),
            )
    }
    pub(crate) fn take_continuation(&mut self) -> Option<crate::time::AdvanceContinuation> {
        match self {
            Self::Advance(a) => a.continuation.take(),
            Self::Startup(_)
            | Self::Reflection(_)
            | Self::Consolidation(_)
            | Self::ActivityLearning(_)
            | Self::Restore(_) => None,
            Self::Command(_)
            | Self::Response(_)
            | Self::RecallEdit(_)
            | Self::SupportRetention(_)
            | Self::AccountRetention(_)
            | Self::KnowledgeRetention(_)
            | Self::RecentRetention(_)
            | Self::HostControl(_)
            | Self::NpcIntake(_) => None,
            Self::Participation(_) => None,
        }
    }
}
#[derive(Clone, Copy)]
enum OperationReply {
    Reflection(ReflectionReply),
    Consolidation(ConsolidationReply),
    LearningPrepare(LearningReply),
    LearningPublish(LearningReply),
    Restore(restore::RestoreReply),
    Participation(ParticipationReply),
    Advance(AdvanceReply),
    Command(CommandReply),
    Response(ResponseReply),
    Forget(ForgetReply),
    NpcCandidates(NpcCandidateReply),
    HostControl,
    SupportRetention,
    NpcSources,
    SourceVersions,
}
enum OperationCursor {
    Startup(super::startup::StartupCursor),
    Reflection(crate::cognition::publication::ReflectionCursor),
    Consolidation(crate::cognition::consolidation::ConsolidationCursor),
    LearningPrepare(crate::activity::LearningPreparationCursor),
    LearningPublish(crate::activity::LearningPublicationCursor),
    Restore(super::restore::RestoreReconcileCursor),
    Participation(crate::participation::ParticipationCursor),
    Advance(AdvanceCursor),
    Command(CommandOperation),
    Response(crate::response::ResponseCursor),
    RecallEdit(crate::experience::RecallEditCursor),
    NpcCandidates(crate::capture::NpcCandidateCursor),
    RecentRetention(crate::received::RecentRetentionCursor),
    KnowledgeRetention(crate::received::KnowledgeRetentionCursor),
    AccountRetention(crate::experience::AccountRetentionCursor),
    SupportRetention(crate::received::SupportRetentionCursor),
    HostControl(super::host_control::HostControlCursor),
    NpcIntake(super::npc_intake::NpcIntakeCursor),
    NpcSources(crate::capture::NpcSourcesCursor),
}
impl<T, R> Poll<T, R> {
    fn map<V, S>(self, completed: fn(T) -> V, route: fn(R) -> S) -> Poll<V, S> {
        match self {
            Self::Continue => Poll::Continue,
            Self::Question(q, r) => Poll::Question(q, route(r)),
            Self::Complete(value) => Poll::Complete(completed(value)),
        }
    }
}
impl OperationCursor {
    fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        match self {
            Self::Reflection(cursor) => cursor.abort(core),
            Self::Consolidation(cursor) => cursor.abort(core),
            Self::Restore(cursor) => cursor.abort(core),
            Self::Advance(a) => a.abort(core),
            Self::Command(c) => c.abort(core),
            Self::Response(r) => r.abort(core),
            Self::RecallEdit(f) => f.abort(core),
            Self::NpcCandidates(cursor) => cursor.abort(core),
            Self::LearningPrepare(_)
            | Self::LearningPublish(_)
            | Self::Startup(_)
            | Self::SupportRetention(_)
            | Self::AccountRetention(_)
            | Self::KnowledgeRetention(_)
            | Self::RecentRetention(_)
            | Self::HostControl(_)
            | Self::NpcIntake(_)
            | Self::NpcSources(_) => Ok(()),
            Self::Participation(_) => Ok(()),
        }
    }
    fn poll(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: &mut Option<Answer>,
        route: Option<OperationReply>,
        budget: &ByteBudget,
    ) -> Result<Poll<DriverCompletion, OperationReply>, DriveError> {
        match self {
            Self::LearningPrepare(cursor) => {
                let route = match route {
                    None => None,
                    Some(OperationReply::LearningPrepare(r)) => Some(r),
                    _ => return Err(DriveError::StaleResponse),
                };
                Ok(learning::prepare(cursor, core, answer, route, budget)?.map(
                    DriverCompletion::LearningBatch,
                    OperationReply::LearningPrepare,
                ))
            }
            Self::LearningPublish(cursor) => {
                let route = match route {
                    None => None,
                    Some(OperationReply::LearningPublish(r)) => Some(r),
                    _ => return Err(DriveError::StaleResponse),
                };
                Ok(learning::publish(cursor, core, answer, route, budget)?.map(
                    |v| DriverCompletion::Operation(CompletedOperation::ActivityLearning(v)),
                    OperationReply::LearningPublish,
                ))
            }
            Self::Startup(cursor) => {
                if route.is_some() || answer.is_some() {
                    return Err(DriveError::StaleResponse);
                }
                Ok(Poll::Complete(DriverCompletion::Operation(
                    CompletedOperation::Startup(cursor.complete(core)?),
                )))
            }
            Self::Consolidation(cursor) => {
                let route = match route {
                    None => None,
                    Some(OperationReply::Consolidation(route)) => Some(route),
                    _ => return Err(DriveError::StaleResponse),
                };
                Ok(
                    poll_consolidation(cursor, core, answer, route, budget)?.map(
                        |value| {
                            DriverCompletion::Operation(CompletedOperation::Consolidation(value))
                        },
                        OperationReply::Consolidation,
                    ),
                )
            }
            Self::Reflection(cursor) => {
                let route = match route {
                    None => None,
                    Some(OperationReply::Reflection(route)) => Some(route),
                    _ => return Err(DriveError::StaleResponse),
                };
                Ok(poll_reflection(cursor, core, answer, route, budget)?.map(
                    |value| DriverCompletion::Operation(CompletedOperation::Reflection(value)),
                    OperationReply::Reflection,
                ))
            }
            Self::Restore(cursor) => {
                let route = match route {
                    None => None,
                    Some(OperationReply::Restore(route)) => Some(route),
                    _ => return Err(DriveError::StaleResponse),
                };
                Ok(poll_restore(cursor, core, answer, route, budget)?.map(
                    |value| DriverCompletion::Operation(CompletedOperation::Restore(value)),
                    OperationReply::Restore,
                ))
            }
            Self::Participation(cursor) => {
                let route = match route {
                    None => None,
                    Some(OperationReply::Participation(route)) => Some(route),
                    _ => return Err(DriveError::StaleResponse),
                };
                Ok(
                    poll_participation(cursor, core, answer, route, budget)?.map(
                        |value| {
                            DriverCompletion::Operation(CompletedOperation::Participation(value))
                        },
                        OperationReply::Participation,
                    ),
                )
            }
            Self::Advance(cursor) => {
                let route = match route {
                    None => None,
                    Some(OperationReply::Advance(r)) => Some(r),
                    _ => return Err(DriveError::StaleResponse),
                };
                Ok(poll_advance(cursor, core, answer, route, budget)?.map(
                    |value| DriverCompletion::Operation(CompletedOperation::Advance(value)),
                    OperationReply::Advance,
                ))
            }
            Self::Command(cursor) => {
                let route = match route {
                    None => None,
                    Some(OperationReply::Command(r)) => Some(r),
                    _ => return Err(DriveError::StaleResponse),
                };
                Ok(poll_command(cursor, core, answer, route, budget)?.map(
                    |value| DriverCompletion::Operation(CompletedOperation::Command(value)),
                    OperationReply::Command,
                ))
            }
            Self::Response(cursor) => {
                let route = match route {
                    None => None,
                    Some(OperationReply::Response(r)) => Some(r),
                    _ => return Err(DriveError::StaleResponse),
                };
                Ok(poll_response(cursor, core, answer, route, budget)?.map(
                    |value| DriverCompletion::Operation(CompletedOperation::Response(value)),
                    OperationReply::Response,
                ))
            }
            Self::RecallEdit(cursor) => {
                let route = match route {
                    None => None,
                    Some(OperationReply::Forget(route)) => Some(route),
                    _ => return Err(DriveError::StaleResponse),
                };
                Ok(poll_forget(cursor, core, answer, route, budget)?.map(
                    |value| DriverCompletion::Operation(CompletedOperation::RecallEdit(value)),
                    OperationReply::Forget,
                ))
            }
            Self::NpcCandidates(cursor) => {
                let route = match route {
                    None => None,
                    Some(OperationReply::NpcCandidates(route)) => Some(route),
                    _ => return Err(DriveError::StaleResponse),
                };
                Ok(
                    poll_npc_candidates(cursor, core, answer, route, budget)?.map(
                        DriverCompletion::NpcCandidates,
                        OperationReply::NpcCandidates,
                    ),
                )
            }
            Self::NpcSources(cursor) => match route {
                None => {
                    let request = cursor.request();
                    question(
                        answer,
                        ProviderKind::Sources,
                        request.binding,
                        request,
                        budget,
                        OperationReply::NpcSources,
                    )
                }
                Some(OperationReply::NpcSources) => {
                    let Answer::Sources(reply) = direct(answer, ProviderKind::Sources)? else {
                        return Err(DriveError::StaleResponse);
                    };
                    Ok(Poll::Complete(DriverCompletion::NpcSources(
                        cursor.complete(core, reply, budget)?,
                    )))
                }
                _ => Err(DriveError::StaleResponse),
            },
            Self::HostControl(cursor) => match route {
                None => {
                    let kind = cursor.kind();
                    let request = cursor.format(core)?;
                    question(
                        answer,
                        kind,
                        request.binding,
                        request,
                        budget,
                        OperationReply::HostControl,
                    )
                }
                Some(OperationReply::HostControl) => {
                    let Answer::Control(reply) = direct(answer, ProviderKind::Control)? else {
                        return Err(DriveError::StaleResponse);
                    };
                    Ok(Poll::Complete(DriverCompletion::Operation(
                        CompletedOperation::HostControl(cursor.complete(reply, budget)?),
                    )))
                }
                _ => Err(DriveError::StaleResponse),
            },
            Self::NpcIntake(cursor) => {
                if route.is_some() || answer.is_some() {
                    return Err(DriveError::StaleResponse);
                }
                Ok(Poll::Complete(DriverCompletion::Operation(
                    CompletedOperation::NpcIntake(cursor.complete(core, budget)?),
                )))
            }
            Self::SupportRetention(cursor) => {
                let supplied = match route {
                    None if answer.is_none() => None,
                    Some(OperationReply::SupportRetention) => {
                        let Answer::SupportMembership(value) =
                            direct(answer, ProviderKind::SupportMembership)?
                        else {
                            return Err(DriveError::StaleResponse);
                        };
                        Some(value)
                    }
                    _ => return Err(DriveError::StaleResponse),
                };
                match cursor.step(core, supplied, budget)? {
                    crate::received::SupportRetentionStep::Continue => Ok(Poll::Continue),
                    crate::received::SupportRetentionStep::Membership(request) => question(
                        answer,
                        ProviderKind::SupportMembership,
                        request.binding,
                        request,
                        budget,
                        OperationReply::SupportRetention,
                    ),
                    crate::received::SupportRetentionStep::Complete(done) => Ok(Poll::Complete(
                        DriverCompletion::Operation(CompletedOperation::SupportRetention(done)),
                    )),
                }
            }
            Self::AccountRetention(cursor) => {
                if route.is_some() || answer.is_some() {
                    return Err(DriveError::StaleResponse);
                }
                Ok(Poll::Complete(DriverCompletion::Operation(
                    CompletedOperation::AccountRetention(cursor.step(core, budget)?),
                )))
            }
            Self::KnowledgeRetention(cursor) => {
                if route.is_some() || answer.is_some() {
                    return Err(DriveError::StaleResponse);
                }
                Ok(match cursor.step(core, budget)? {
                    Some(done) => Poll::Complete(DriverCompletion::Operation(
                        CompletedOperation::KnowledgeRetention(done),
                    )),
                    None => Poll::Continue,
                })
            }
            Self::RecentRetention(cursor) => {
                if route.is_some() || answer.is_some() {
                    return Err(DriveError::StaleResponse);
                }
                Ok(match cursor.step(core, budget)? {
                    Some(done) => Poll::Complete(DriverCompletion::Operation(
                        CompletedOperation::RecentRetention(done),
                    )),
                    None => Poll::Continue,
                })
            }
        }
    }
}
enum DriverCompletion {
    LearningBatch(Arc<crate::activity::PreparedActivityLearning>),
    Operation(CompletedOperation),
    NpcCandidates(crate::capture::PreparedNpcCandidates),
    NpcSources(crate::capture::PreparedNpcSources),
}
pub(crate) enum DriveStep {
    LearningBatch(Arc<crate::activity::PreparedActivityLearning>),
    Continue,
    Question(Arc<ProviderQuestion>),
    Complete(CompletedOperation),
    NpcCandidates(crate::capture::PreparedNpcCandidates),
    NpcSources(crate::capture::PreparedNpcSources),
}
pub(crate) struct OperationDriver {
    cursor: OperationCursor,
    pending: Option<(Arc<ProviderQuestion>, OperationReply)>,
    installed: Arc<crate::simulation::InstalledWorld>,
    base_cut: u64,
    generation: String,
    done: bool,
    completed: Option<CompletedOperation>,
    source_finalizer: Option<SourceVersionFinalizer>,
    source_versions: Option<SourceVersionsAnswer>,
    _reservation: ByteReservation,
}
impl OperationDriver {
    pub(crate) fn learning_prepare(
        core: &mut CoreMutation<'_>,
        cursor: crate::activity::LearningPreparationCursor,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        Self::new(core, OperationCursor::LearningPrepare(cursor), budget)
    }
    pub(crate) fn learning_publish(
        core: &mut CoreMutation<'_>,
        cursor: crate::activity::LearningPublicationCursor,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        Self::new(core, OperationCursor::LearningPublish(cursor), budget)
    }
    pub(crate) fn is_learning_prepare(&self) -> bool {
        matches!(self.cursor, OperationCursor::LearningPrepare(_))
    }
    pub(crate) fn startup(
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        let cursor = super::startup::StartupCursor::new(budget)?;
        Self::new(core, OperationCursor::Startup(cursor), budget)
    }
    pub(crate) fn consolidation(
        core: &mut CoreMutation<'_>,
        cursor: crate::cognition::consolidation::ConsolidationCursor,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        Self::new(core, OperationCursor::Consolidation(cursor), budget)
    }
    pub(crate) fn reflection(
        core: &mut CoreMutation<'_>,
        cursor: crate::cognition::publication::ReflectionCursor,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        Self::new(core, OperationCursor::Reflection(cursor), budget)
    }
    pub(crate) fn restore(
        core: &mut CoreMutation<'_>,
        cursor: super::restore::RestoreReconcileCursor,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        Self::new(core, OperationCursor::Restore(cursor), budget)
    }
    pub(crate) fn participation(
        core: &mut CoreMutation<'_>,
        cursor: crate::participation::ParticipationCursor,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        Self::new(core, OperationCursor::Participation(cursor), budget)
    }
    pub(crate) fn npc_intake(
        core: &mut CoreMutation<'_>,
        cursor: super::npc_intake::NpcIntakeCursor,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        Self::new(core, OperationCursor::NpcIntake(cursor), budget)
    }
    pub(crate) fn host_control(
        core: &mut CoreMutation<'_>,
        cursor: super::host_control::HostControlCursor,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        Self::new(core, OperationCursor::HostControl(cursor), budget)
    }
    pub(crate) fn support_retention(
        core: &mut CoreMutation<'_>,
        cursor: crate::received::SupportRetentionCursor,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        Self::new(core, OperationCursor::SupportRetention(cursor), budget)
    }
    pub(crate) fn account_retention(
        core: &mut CoreMutation<'_>,
        cursor: crate::experience::AccountRetentionCursor,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        Self::new(core, OperationCursor::AccountRetention(cursor), budget)
    }
    pub(crate) fn knowledge_retention(
        core: &mut CoreMutation<'_>,
        cursor: crate::received::KnowledgeRetentionCursor,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        Self::new(core, OperationCursor::KnowledgeRetention(cursor), budget)
    }
    pub(crate) fn recent_retention(
        core: &mut CoreMutation<'_>,
        cursor: crate::received::RecentRetentionCursor,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        Self::new(core, OperationCursor::RecentRetention(cursor), budget)
    }
    pub(crate) fn advance(
        core: &mut CoreMutation<'_>,
        cursor: AdvanceCursor,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        Self::new(core, OperationCursor::Advance(cursor), budget)
    }
    pub(crate) fn command(
        core: &mut CoreMutation<'_>,
        cursor: CommandOperation,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        Self::new(core, OperationCursor::Command(cursor), budget)
    }
    pub(crate) fn response(
        core: &mut CoreMutation<'_>,
        cursor: crate::response::ResponseCursor,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        Self::new(core, OperationCursor::Response(cursor), budget)
    }
    pub(crate) fn npc_candidates(
        core: &mut CoreMutation<'_>,
        cursor: crate::capture::NpcCandidateCursor,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        Self::new(core, OperationCursor::NpcCandidates(cursor), budget)
    }
    pub(crate) fn is_npc_candidates(&self) -> bool {
        matches!(self.cursor, OperationCursor::NpcCandidates(_))
    }
    pub(crate) fn npc_sources(
        core: &mut CoreMutation<'_>,
        cursor: crate::capture::NpcSourcesCursor,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        Self::new(core, OperationCursor::NpcSources(cursor), budget)
    }
    pub(crate) fn is_npc_sources(&self) -> bool {
        matches!(self.cursor, OperationCursor::NpcSources(_))
    }
    pub(crate) fn recall_edit(
        core: &mut CoreMutation<'_>,
        cursor: crate::experience::RecallEditCursor,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        Self::new(core, OperationCursor::RecallEdit(cursor), budget)
    }
    fn new(
        core: &mut CoreMutation<'_>,
        mut cursor: OperationCursor,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        let reservation = match budget.reserve(size_of::<Self>() + core.state.generation.len()) {
            Ok(reservation) => reservation,
            Err(_) => {
                cursor.abort(core)?;
                return Err(DriveError::Capacity);
            }
        };
        Ok(Self {
            cursor,
            pending: None,
            installed: core.state.installed.clone(),
            base_cut: core.state.accepted_cut,
            generation: core.state.generation.clone(),
            done: false,
            completed: None,
            source_finalizer: None,
            source_versions: None,
            _reservation: reservation,
        })
    }
    pub(crate) fn pending(&self) -> Option<&Arc<ProviderQuestion>> {
        self.pending.as_ref().map(|(question, _)| question)
    }
    pub(crate) fn take_source_versions(
        &mut self,
    ) -> Option<(crate::received::SourceVersionPlan, ByteReservation)> {
        self.source_versions
            .take()
            .map(SourceVersionsAnswer::into_parts)
    }
    pub(crate) fn request_advance_publication(&mut self) {
        if let OperationCursor::Advance(cursor) = &mut self.cursor {
            cursor.request_publication();
        }
    }
    pub(crate) fn finished(&self) -> bool {
        self.done
    }
    pub(crate) fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), DriveError> {
        if self.completed.is_none() {
            self.cursor.abort(core)?;
        }
        self.completed = None;
        self.source_finalizer = None;
        self.pending = None;
        self.done = true;
        Ok(())
    }
    pub(crate) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        input: Option<ProviderResponse>,
        key: crate::host::CandidateKey,
        finalize_sources: bool,
        budget: &ByteBudget,
    ) -> Result<DriveStep, DriveError> {
        if self.done
            || core.state.accepted_cut != self.base_cut
            || core.state.generation != self.generation
            || !Arc::ptr_eq(&self.installed, &core.state.installed)
        {
            return Err(DriveError::StaleResponse);
        }
        if input.is_none() {
            if let Some((question, _)) = &self.pending {
                return Ok(DriveStep::Question(question.clone()));
            }
        }
        if let Some(input) = &input {
            if self
                .pending
                .as_ref()
                .is_none_or(|(q, _)| q.kind != input.kind || q.binding != input.binding)
            {
                return Err(DriveError::StaleResponse);
            }
        }
        // Shape counting allocates nothing, including for malformed/lone-unit
        // text. The current typed family then validates under funded preparation.
        let decoded_guard = input
            .as_ref()
            .map(|v| {
                if !v._reservation.shares_owner(&self._reservation) {
                    return Err(DriveError::StaleResponse);
                }
                if matches!(
                    v.kind,
                    ProviderKind::History
                        | ProviderKind::Sources
                        | ProviderKind::AppraisalOutcomes
                        | ProviderKind::SourceVersions
                ) {
                    return Ok(None);
                }
                let bytes = DecodeShape::read(&v.json)?.bound(v.kind, v.json.len())?;
                budget
                    .reserve(bytes)
                    .map(Some)
                    .map_err(|_| DriveError::Capacity)
            })
            .transpose()?;
        let mut answer = input
            .as_ref()
            .map(|input| Answer::decode(input, budget))
            .transpose()?;
        let route = input
            .as_ref()
            .and_then(|_| self.pending.as_ref().map(|(_, route)| *route));
        let result = if self.source_finalizer.is_some() {
            (|| {
                let Answer::SourceVersions(value) =
                    direct(&mut answer, ProviderKind::SourceVersions)?
                else {
                    return Err(DriveError::StaleResponse);
                };
                self.source_versions = Some(
                    self.source_finalizer
                        .as_ref()
                        .expect("pending source finalizer")
                        .finish(core, value, budget)?,
                );
                self.source_finalizer = None;
                Ok(Poll::Complete(DriverCompletion::Operation(
                    self.completed.take().ok_or(ExecutionError::Invariant)?,
                )))
            })()
        } else {
            self.cursor.poll(core, &mut answer, route, budget)
        };
        drop(answer);
        drop(decoded_guard);
        drop(input);
        match result {
            Ok(Poll::Continue) => {
                self.pending = None;
                Ok(DriveStep::Continue)
            }
            Ok(Poll::Question(q, route)) => {
                self.pending = Some((q.clone(), route));
                Ok(DriveStep::Question(q))
            }
            Ok(Poll::Complete(mut done)) => {
                self.pending = None;
                if let DriverCompletion::Operation(CompletedOperation::Restore(operation)) =
                    &mut done
                {
                    self.source_versions = operation.source_versions.take();
                }
                if finalize_sources && self.source_versions.is_none() {
                    if let DriverCompletion::Operation(ref operation) = done {
                        if !matches!(operation, CompletedOperation::Restore(_)) {
                            match SourceVersionFinalizer::prepare(core, key, None, budget) {
                                Ok(Some(finalizer)) => {
                                    let question = Arc::clone(&finalizer.question);
                                    let DriverCompletion::Operation(operation) = done else {
                                        unreachable!()
                                    };
                                    self.completed = Some(operation);
                                    self.source_finalizer = Some(finalizer);
                                    self.pending = Some((
                                        Arc::clone(&question),
                                        OperationReply::SourceVersions,
                                    ));
                                    return Ok(DriveStep::Question(question));
                                }
                                Ok(None) => {}
                                Err(error) => {
                                    self.done = true;
                                    return Err(error);
                                }
                            }
                        }
                    }
                }
                self.done = true;
                Ok(match done {
                    DriverCompletion::Operation(done) => DriveStep::Complete(done),
                    DriverCompletion::LearningBatch(done) => DriveStep::LearningBatch(done),
                    DriverCompletion::NpcCandidates(done) => DriveStep::NpcCandidates(done),
                    DriverCompletion::NpcSources(done) => DriveStep::NpcSources(done),
                })
            }
            Err(DriveError::Semantic(error)) => {
                self.abort(core)?;
                Err(DriveError::Semantic(error))
            }
            Err(error @ (DriveError::Capacity | DriveError::Encoding)) => {
                // A valid answer may already have advanced its real child before
                // preparation of the following question fails. The prior query
                // cannot be replayed against that later continuation.
                self.abort(core)?;
                Err(error)
            }
            Err(error) => Err(error),
        }
    }
}

fn poll_event(
    cursor: &mut EventCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    mut route: Option<EventReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedEvent, EventReply>, DriveError> {
    let mut supplied = None;
    if matches!(route, Some(EventReply::Geometry)) {
        route = None;
        let Answer::Geometry(v) = direct(answer, ProviderKind::Geometry)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(EventAnswer::Geometry(v));
    }
    if matches!(route, Some(EventReply::Utterance)) {
        route = None;
        let Answer::Utterance(v) = direct(answer, ProviderKind::Utterance)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(EventAnswer::Utterance {
            binding: v.binding,
            words: v.words,
            lowercase: v.lowercase,
        });
    }
    if matches!(route, Some(EventReply::Collation)) {
        route = None;
        let Answer::Collation(v) = direct(answer, ProviderKind::Collation)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(EventAnswer::Collation(v));
    }
    if matches!(route, Some(EventReply::Words)) {
        route = None;
        let Answer::Words(v) = direct(answer, ProviderKind::Words)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(EventAnswer::Words(v));
    }
    loop {
        match cursor.step(core, supplied.take(), budget)? {
            EventStep::Continue => return Ok(Poll::Continue),
            EventStep::Complete(done) => return Ok(Poll::Complete(done)),
            EventStep::Geometry(q) => {
                return question(
                    answer,
                    ProviderKind::Geometry,
                    q.binding,
                    q,
                    budget,
                    EventReply::Geometry,
                );
            }
            EventStep::Utterance { binding, text } => {
                #[derive(Serialize)]
                struct Request<'a> {
                    binding: GeometryBinding,
                    text: &'a JsText,
                }
                return question(
                    answer,
                    ProviderKind::Utterance,
                    binding,
                    &Request { binding, text },
                    budget,
                    EventReply::Utterance,
                );
            }
            EventStep::Collation(q) => {
                return question(
                    answer,
                    ProviderKind::Collation,
                    q.binding(),
                    q,
                    budget,
                    EventReply::Collation,
                );
            }
            EventStep::Words(q) => {
                return question(
                    answer,
                    ProviderKind::Words,
                    q.binding(),
                    q,
                    budget,
                    EventReply::Words,
                );
            }
        }
    }
}

#[derive(Clone, Copy)]
enum ForgetReply {
    History,
    Collation,
}
fn privacy_reply(
    answer: &mut Option<Answer>,
    route: Option<ForgetReply>,
) -> Result<Option<crate::experience::PrivacyEditAnswer>, DriveError> {
    use crate::experience::PrivacyEditAnswer as Reply;
    Ok(match route {
        None => None,
        Some(ForgetReply::History) => {
            let Answer::History(value) = direct(answer, ProviderKind::History)? else {
                return Err(DriveError::StaleResponse);
            };
            Some(Reply::History(value))
        }
        Some(ForgetReply::Collation) => {
            let Answer::Collation(value) = direct(answer, ProviderKind::Collation)? else {
                return Err(DriveError::StaleResponse);
            };
            Some(Reply::Collation(value))
        }
    })
}
fn poll_forget(
    cursor: &mut crate::experience::RecallEditCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    route: Option<ForgetReply>,
    budget: &ByteBudget,
) -> Result<Poll<crate::experience::CompletedRecallEdit, ForgetReply>, DriveError> {
    use crate::experience::RecallEditStep as Step;
    let supplied = privacy_reply(answer, route)?;
    match cursor.step(core, supplied, budget)? {
        Step::Complete(done) => Ok(Poll::Complete(done)),
        Step::Collation(request) => question(
            answer,
            ProviderKind::Collation,
            request.binding(),
            request,
            budget,
            ForgetReply::Collation,
        ),
        Step::History(request) => question(
            answer,
            ProviderKind::History,
            request
                .request()
                .provider_binding(core.state.installed.geometry.spatial.revision),
            request.request(),
            budget,
            ForgetReply::History,
        ),
    }
}

fn poll_display(
    cursor: &mut ActivityDisplayCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    mut route: Option<DisplayReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedActivityDisplay, DisplayReply>, DriveError> {
    let mut supplied = None;
    if matches!(route, Some(DisplayReply::Geometry)) {
        route = None;
        let Answer::Geometry(v) = direct(answer, ProviderKind::Geometry)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(ActivityDisplayAnswer::Geometry(v));
    }
    if matches!(route, Some(DisplayReply::Format)) {
        route = None;
        let Answer::Display(v) = direct(answer, ProviderKind::Display)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(ActivityDisplayAnswer::Formatted {
            binding: v.binding,
            view: v.view,
        });
    }
    loop {
        match cursor.step(core, supplied.take(), budget)? {
            ActivityDisplayStep::Complete(done) => return Ok(Poll::Complete(done)),
            ActivityDisplayStep::Geometry(q) => {
                return question(
                    answer,
                    ProviderKind::Geometry,
                    q.binding,
                    q,
                    budget,
                    DisplayReply::Geometry,
                );
            }
            ActivityDisplayStep::Format(q) => {
                return question(
                    answer,
                    ProviderKind::Display,
                    q.binding,
                    q,
                    budget,
                    DisplayReply::Format,
                );
            }
        }
    }
}

fn poll_command(
    cursor: &mut CommandOperation,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    mut route: Option<CommandReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedCommandOperation, CommandReply>, DriveError> {
    let mut supplied = None;
    if matches!(route, Some(CommandReply::Geometry)) {
        route = None;
        let Answer::Geometry(v) = direct(answer, ProviderKind::Geometry)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(CommandOperationAnswer::Geometry(v));
    }
    loop {
        match cursor.step(core, supplied.take(), budget)? {
            CommandOperationStep::Complete(done) => return Ok(Poll::Complete(done)),
            CommandOperationStep::Geometry(q) => {
                return question(
                    answer,
                    ProviderKind::Geometry,
                    q.binding,
                    q,
                    budget,
                    CommandReply::Geometry,
                );
            }
            CommandOperationStep::Event(child) => {
                let child_route = match route.take() {
                    Some(CommandReply::Event(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_event(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(CommandOperationAnswer::Event(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => return Ok(Poll::Question(q, CommandReply::Event(r))),
                }
            }
            CommandOperationStep::Display(child) => {
                let child_route = match route.take() {
                    Some(CommandReply::Display(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_display(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(CommandOperationAnswer::Display(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => return Ok(Poll::Question(q, CommandReply::Display(r))),
                }
            }
        }
    }
}

fn poll_plan(
    cursor: &mut PlanRunCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    mut route: Option<PlanReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedPlanRun, PlanReply>, DriveError> {
    let mut supplied = None;
    if matches!(route, Some(PlanReply::Geometry)) {
        route = None;
        let Answer::Geometry(v) = direct(answer, ProviderKind::Geometry)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(PlanRunAnswer::Geometry(v));
    }
    if matches!(route, Some(PlanReply::Canonical)) {
        route = None;
        let Answer::Canonical(v) = direct(answer, ProviderKind::Canonical)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(PlanRunAnswer::Canonical {
            binding: v.binding,
            canonical: v.canonical,
        });
    }
    loop {
        match cursor.step(core, supplied.take(), budget)? {
            PlanRunStep::Complete(done) => return Ok(Poll::Complete(done)),
            PlanRunStep::Geometry(q) => {
                return question(
                    answer,
                    ProviderKind::Geometry,
                    q.binding,
                    q,
                    budget,
                    PlanReply::Geometry,
                );
            }
            PlanRunStep::Canonical(q) => {
                return question(
                    answer,
                    ProviderKind::Canonical,
                    q.binding,
                    q,
                    budget,
                    PlanReply::Canonical,
                );
            }
            PlanRunStep::Command(child) => {
                let child_route = match route.take() {
                    Some(PlanReply::Command(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_command(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(PlanRunAnswer::Command(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => return Ok(Poll::Question(q, PlanReply::Command(r))),
                }
            }
        }
    }
}

fn poll_held(
    cursor: &mut HeldReceptionCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    mut route: Option<HeldReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedHeldReception, HeldReply>, DriveError> {
    let mut supplied = None;
    if matches!(route, Some(HeldReply::Geometry)) {
        route = None;
        let Answer::Geometry(v) = direct(answer, ProviderKind::Geometry)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(GeometryReceptionAnswer::Geometry(v));
    }
    if matches!(route, Some(HeldReply::Language)) {
        route = None;
        let Answer::Collation(v) = direct(answer, ProviderKind::Collation)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(GeometryReceptionAnswer::Language(v));
    }
    loop {
        match cursor.step(core, supplied.take(), budget)? {
            HeldReceptionStep::Complete(done) => return Ok(Poll::Complete(done)),
            HeldReceptionStep::Geometry(q) => {
                return question(
                    answer,
                    ProviderKind::Geometry,
                    q.binding,
                    q,
                    budget,
                    HeldReply::Geometry,
                );
            }
            HeldReceptionStep::Language(q) => {
                return question(
                    answer,
                    ProviderKind::Collation,
                    q.binding(),
                    q,
                    budget,
                    HeldReply::Language,
                );
            }
        }
    }
}

fn poll_native(
    cursor: &mut NativeExposureCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    mut route: Option<NativeReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedNativeExposure, NativeReply>, DriveError> {
    let mut supplied = None;
    if matches!(route, Some(NativeReply::Geometry)) {
        route = None;
        let Answer::Geometry(v) = direct(answer, ProviderKind::Geometry)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(v);
    }
    loop {
        match cursor.step(core, supplied.take(), budget)? {
            NativeExposureStep::Complete(done) => return Ok(Poll::Complete(done)),
            NativeExposureStep::Geometry(q) => {
                return question(
                    answer,
                    ProviderKind::Geometry,
                    q.binding,
                    q,
                    budget,
                    NativeReply::Geometry,
                );
            }
        }
    }
}

fn poll_human(
    cursor: &mut ObserverReceptionCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    mut route: Option<HumanReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedObserverReception, HumanReply>, DriveError> {
    let mut supplied = None;
    if matches!(route, Some(HumanReply::Geometry)) {
        route = None;
        let Answer::Geometry(v) = direct(answer, ProviderKind::Geometry)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(ObserverReceptionAnswer::Visual(
            PersonalVisualAnswer::Geometry(v),
        ));
    }
    if matches!(route, Some(HumanReply::Language)) {
        route = None;
        let Answer::Collation(v) = direct(answer, ProviderKind::Collation)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(ObserverReceptionAnswer::Visual(
            PersonalVisualAnswer::Language(v),
        ));
    }
    loop {
        match cursor.step(core, supplied.take(), budget)? {
            ObserverReceptionStep::Complete(done) => return Ok(Poll::Complete(done)),
            ObserverReceptionStep::Geometry(q) => {
                return question(
                    answer,
                    ProviderKind::Geometry,
                    q.binding,
                    q,
                    budget,
                    HumanReply::Geometry,
                );
            }
            ObserverReceptionStep::Language(q) => {
                return question(
                    answer,
                    ProviderKind::Collation,
                    q.binding(),
                    q,
                    budget,
                    HumanReply::Language,
                );
            }
            ObserverReceptionStep::Event(child) => {
                let child_route = match route.take() {
                    Some(HumanReply::Event(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_event(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(ObserverReceptionAnswer::Event(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => return Ok(Poll::Question(q, HumanReply::Event(r))),
                }
            }
        }
    }
}

fn poll_perception(
    cursor: &mut PerceptionCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    mut route: Option<PerceptionReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedPerception, PerceptionReply>, DriveError> {
    let mut supplied = None;
    if matches!(route, Some(PerceptionReply::Geometry)) {
        route = None;
        let Answer::Geometry(v) = direct(answer, ProviderKind::Geometry)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(PerceptionAnswer::Geometry(v));
    }
    loop {
        match cursor.step(core, supplied.take(), budget)? {
            PerceptionStep::Continue => return Ok(Poll::Continue),
            PerceptionStep::Complete(done) => return Ok(Poll::Complete(done)),
            PerceptionStep::Geometry(q) => {
                return question(
                    answer,
                    ProviderKind::Geometry,
                    q.binding,
                    q,
                    budget,
                    PerceptionReply::Geometry,
                );
            }
            PerceptionStep::Held(child) => {
                let child_route = match route.take() {
                    Some(PerceptionReply::Held(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_held(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(PerceptionAnswer::Held(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => return Ok(Poll::Question(q, PerceptionReply::Held(r))),
                }
            }
            PerceptionStep::Native(child) => {
                let child_route = match route.take() {
                    Some(PerceptionReply::Native(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_native(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(PerceptionAnswer::Native(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => {
                        return Ok(Poll::Question(q, PerceptionReply::Native(r)));
                    }
                }
            }
            PerceptionStep::Human(child) => {
                let child_route = match route.take() {
                    Some(PerceptionReply::Human(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_human(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(PerceptionAnswer::Human(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => {
                        return Ok(Poll::Question(q, PerceptionReply::Human(r)));
                    }
                }
            }
        }
    }
}

fn poll_advance(
    cursor: &mut AdvanceCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    mut route: Option<AdvanceReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedAdvance, AdvanceReply>, DriveError> {
    let mut supplied = None;
    if matches!(route, Some(AdvanceReply::Geometry)) {
        route = None;
        let Answer::Geometry(v) = direct(answer, ProviderKind::Geometry)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(AdvanceAnswer::Geometry(v));
    }
    if matches!(route, Some(AdvanceReply::Collation)) {
        route = None;
        let Answer::Collation(v) = direct(answer, ProviderKind::Collation)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(AdvanceAnswer::Collation(v));
    }
    loop {
        match cursor.step(core, supplied.take(), budget)? {
            AdvanceStep::Participation(child) => {
                let route = match route.take() {
                    None => None,
                    Some(AdvanceReply::Participation(route)) => Some(route),
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_participation(child, core, answer, route, budget)? {
                    Poll::Complete(done) => supplied = Some(AdvanceAnswer::Participation(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(question, route) => {
                        return Ok(Poll::Question(question, AdvanceReply::Participation(route)));
                    }
                }
            }
            AdvanceStep::Continue => return Ok(Poll::Continue),
            AdvanceStep::Complete(done) => return Ok(Poll::Complete(done)),
            AdvanceStep::Geometry(q) => {
                return question(
                    answer,
                    ProviderKind::Geometry,
                    q.binding,
                    q,
                    budget,
                    AdvanceReply::Geometry,
                );
            }
            AdvanceStep::Collation(q) => {
                return question(
                    answer,
                    ProviderKind::Collation,
                    q.binding(),
                    q,
                    budget,
                    AdvanceReply::Collation,
                );
            }
            AdvanceStep::Event(child) => {
                let child_route = match route.take() {
                    Some(AdvanceReply::Event(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_event(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(AdvanceAnswer::Event(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => return Ok(Poll::Question(q, AdvanceReply::Event(r))),
                }
            }
            AdvanceStep::Command(child) => {
                let child_route = match route.take() {
                    Some(AdvanceReply::Command(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_command(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(AdvanceAnswer::Command(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => return Ok(Poll::Question(q, AdvanceReply::Command(r))),
                }
            }
            AdvanceStep::Plan(child) => {
                let child_route = match route.take() {
                    Some(AdvanceReply::Plan(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_plan(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(AdvanceAnswer::Plan(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => return Ok(Poll::Question(q, AdvanceReply::Plan(r))),
                }
            }
            AdvanceStep::Perception(child) => {
                let child_route = match route.take() {
                    Some(AdvanceReply::Perception(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_perception(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(AdvanceAnswer::Perception(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => {
                        return Ok(Poll::Question(q, AdvanceReply::Perception(r)));
                    }
                }
            }
        }
    }
}

#[derive(Clone, Copy)]
enum ResponseReply {
    AppraisalCreates,
    Sources,
    Digest,
    Normalization,
    TypedActions,
    Geometry,
    Display(DisplayReply),
    Command(CommandReply),
    Event(EventReply),
}
fn poll_response(
    cursor: &mut crate::response::ResponseCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    mut route: Option<ResponseReply>,
    budget: &ByteBudget,
) -> Result<Poll<crate::response::CompletedResponse, ResponseReply>, DriveError> {
    use crate::response::{ResponseAnswer, ResponseStep};
    let mut supplied = match route {
        Some(ResponseReply::AppraisalCreates) => {
            route = None;
            let Answer::AppraisalOutcomes(value) = direct(answer, ProviderKind::AppraisalOutcomes)?
            else {
                return Err(DriveError::StaleResponse);
            };
            Some(ResponseAnswer::AppraisalCreates(value))
        }
        Some(ResponseReply::Sources) => {
            route = None;
            let Answer::Sources(value) = direct(answer, ProviderKind::Sources)? else {
                return Err(DriveError::StaleResponse);
            };
            Some(ResponseAnswer::Sources(value))
        }
        Some(ResponseReply::Digest) => {
            route = None;
            let Answer::Digest(value) = direct(answer, ProviderKind::Digest)? else {
                return Err(DriveError::StaleResponse);
            };
            Some(ResponseAnswer::Digest(value))
        }
        Some(ResponseReply::Normalization) => {
            route = None;
            let Answer::Normalization(value) = direct(answer, ProviderKind::Normalization)? else {
                return Err(DriveError::StaleResponse);
            };
            Some(ResponseAnswer::Normalization(value))
        }
        Some(ResponseReply::TypedActions) => {
            route = None;
            let Answer::TypedActions(value) = direct(answer, ProviderKind::TypedActions)? else {
                return Err(DriveError::StaleResponse);
            };
            Some(ResponseAnswer::Typed(value))
        }
        Some(ResponseReply::Geometry) => {
            route = None;
            let Answer::Geometry(value) = direct(answer, ProviderKind::Geometry)? else {
                return Err(DriveError::StaleResponse);
            };
            Some(ResponseAnswer::Geometry(value))
        }
        _ => None,
    };
    loop {
        match cursor.step(core, supplied.take())? {
            ResponseStep::AppraisalCreates(q) => {
                return question(
                    answer,
                    ProviderKind::AppraisalOutcomes,
                    q.binding,
                    q,
                    budget,
                    ResponseReply::AppraisalCreates,
                );
            }
            ResponseStep::Sources(q) => {
                return question(
                    answer,
                    ProviderKind::Sources,
                    q.binding,
                    q,
                    budget,
                    ResponseReply::Sources,
                );
            }
            ResponseStep::Complete(value) => return Ok(Poll::Complete(value)),
            ResponseStep::Typed(q) => {
                return question(
                    answer,
                    ProviderKind::TypedActions,
                    q.binding,
                    q,
                    budget,
                    ResponseReply::TypedActions,
                );
            }
            ResponseStep::Digest(q) => {
                return question(
                    answer,
                    ProviderKind::Digest,
                    q.binding,
                    q,
                    budget,
                    ResponseReply::Digest,
                );
            }
            ResponseStep::Normalization(q) => {
                return question(
                    answer,
                    ProviderKind::Normalization,
                    q.binding,
                    q,
                    budget,
                    ResponseReply::Normalization,
                );
            }
            ResponseStep::Geometry(q) => {
                return question(
                    answer,
                    ProviderKind::Geometry,
                    q.binding,
                    q,
                    budget,
                    ResponseReply::Geometry,
                );
            }
            ResponseStep::Display(child) => {
                let child_route = match route.take() {
                    Some(ResponseReply::Display(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_display(child, core, answer, child_route, budget)? {
                    Poll::Complete(value) => supplied = Some(ResponseAnswer::Display(value)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => {
                        return Ok(Poll::Question(q, ResponseReply::Display(r)));
                    }
                }
            }
            ResponseStep::Command(child) => {
                let child_route = match route.take() {
                    Some(ResponseReply::Command(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_command(child, core, answer, child_route, budget)? {
                    Poll::Complete(value) => supplied = Some(ResponseAnswer::Command(value)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => {
                        return Ok(Poll::Question(q, ResponseReply::Command(r)));
                    }
                }
            }
            ResponseStep::Event(child) => {
                let child_route = match route.take() {
                    Some(ResponseReply::Event(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_event(child, core, answer, child_route, budget)? {
                    Poll::Complete(value) => supplied = Some(ResponseAnswer::Event(value)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => return Ok(Poll::Question(q, ResponseReply::Event(r))),
                }
            }
        }
    }
}

#[derive(Clone, Copy)]
enum NpcCandidateReply {
    Descriptions,
    Geometry,
    Display(DisplayReply),
}
fn poll_npc_candidates(
    cursor: &mut crate::capture::NpcCandidateCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    mut route: Option<NpcCandidateReply>,
    budget: &ByteBudget,
) -> Result<Poll<crate::capture::PreparedNpcCandidates, NpcCandidateReply>, DriveError> {
    use crate::capture::{NpcCandidateAnswer as Reply, NpcCandidateStep as Step};
    let mut supplied = None;
    if matches!(route, Some(NpcCandidateReply::Descriptions)) {
        route = None;
        let Answer::ChoiceDescriptions(value) = direct(answer, ProviderKind::ChoiceDescriptions)?
        else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(Reply::Descriptions(value));
    }
    if matches!(route, Some(NpcCandidateReply::Geometry)) {
        route = None;
        let Answer::Geometry(value) = direct(answer, ProviderKind::Geometry)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(Reply::Geometry(value));
    }
    loop {
        match cursor.step(core, supplied.take())? {
            Step::Descriptions(request) => {
                return question(
                    answer,
                    ProviderKind::ChoiceDescriptions,
                    request.binding,
                    request,
                    budget,
                    NpcCandidateReply::Descriptions,
                );
            }
            Step::Complete(done) => return Ok(Poll::Complete(done)),
            Step::Geometry(request) => {
                return question(
                    answer,
                    ProviderKind::Geometry,
                    request.binding,
                    request,
                    budget,
                    NpcCandidateReply::Geometry,
                );
            }
            Step::Display(child) => {
                let child_route = match route.take() {
                    None => None,
                    Some(NpcCandidateReply::Display(route)) => Some(route),
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_display(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(Reply::Display(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(question, route) => {
                        return Ok(Poll::Question(question, NpcCandidateReply::Display(route)));
                    }
                }
            }
        }
    }
}
