//! Finite operational boundary for the native writer. The application schedules
//! these calls on its shared pool; provider waits and settlement retain no job.
//! Opaque products retain their actual custody rather than exposing a world.
use crate::encoding::{json_record, json_record_len};
use crate::host::{
    ByteBudget, ByteReservation, CandidateFence, CandidateKey, CapacityError, FenceError,
    ResidentReservation,
};
use crate::simulation::{
    CompletedOperation, ProviderQuestion, ProviderResponse, Session, SessionStep,
};
pub use crate::simulation::LocalFormat;
use serde::ser::{SerializeMap, SerializeSeq};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Weak};

static NEXT_GENERATION: AtomicU64 = AtomicU64::new(1);
mod account_retention;
mod control;
pub use crate::commands::{PlayerTravelDestination, PlayerTravelIntent};
pub use crate::contact::{StrikePermission, StrikeReviewOffer};
pub use crate::outings::view::{OutingViews, PlayerOuting};
pub use crate::plans::PlanMode;
pub use crate::worlds::base_outings::TravelOperation;
pub use account_retention::RuntimeAccountRetention;
pub use control::RuntimeClock;
mod direct_history;
pub use direct_history::{
    HistoryAccount, HistoryTemporal, RuntimeHistory, RuntimeHistoryCuts,
    RuntimeMetadataPersistence, RuntimeRecallDecoder, RuntimeRecallRead, metadata_rows,
};
mod handoff;
mod inspection;
pub use inspection::{RuntimeDefinitionCatalogue, RuntimeDefinitionInspection, RuntimeDefinitionKind, RuntimeWorldInspection};
mod knowledge;
pub use crate::knowledge::cartography::{MapMarkerEdit, MarkerChange};
mod learning;
mod maintenance;
pub use learning::{RuntimeActivityLearning, RuntimeActivityLearningStep};
mod startup;
pub use maintenance::{
    RuntimeConsolidationBinding, RuntimeConsolidationDream, RuntimeConsolidationGroup,
    RuntimeConsolidationReading, RuntimeConsolidationReadings, RuntimeConsolidationTicket,
    RuntimeDreamReview, RuntimeHourlyReview, RuntimeMaintenancePublication, RuntimeMaintenanceRead,
    RuntimeMemoryIndex, RuntimePreparedDream, RuntimeReflectionBinding,
    RuntimeReflectionEvidenceAlias, RuntimeReflectionFile, RuntimeReflectionFiles,
    RuntimeReflectionOpportunity, RuntimeReflectionTicket,
};
mod npc;
mod npc_intake;
pub use npc_intake::{
    NpcQueueInputs, NpcScheduleCause, NpcScheduleFacts, NpcSchedulePopulation, NpcScheduleSources,
    RuntimeNpcInspection, RuntimeNpcIntakeSelection, RuntimeNpcTrigger, ScheduleBodyInput,
    ScheduleEvidence,
};
mod npc_labels;
mod overview;
pub use overview::RuntimeOverview;
mod participation;
pub use participation::{
    InvitationActor, InvitationActors, RuntimeParticipation, RuntimeRestoredPlayer,
    RuntimeRestoredPlayers,
};
mod player;
mod player_expression;
pub use player_expression::PlayerExpressionBinding;
mod manufacture;
pub use manufacture::RuntimeManufactureOffer;
pub use crate::food_preparation::valid_inputs as valid_preparation_inputs;
mod player_places;
mod privacy;
pub use privacy::{RuntimePersonalHistory, RuntimePrivacyEdit};
mod private_history;
mod person_editor;
pub use person_editor::{PersonEditorCut, PersonMemoryEdit};
mod private_notes;
pub use private_notes::{
    RuntimeCreatorMind, RuntimeMindFile, RuntimePersonPage, RuntimePersonPosition,
    RuntimePersonRead, RuntimePrivateNotes,
};
mod reply_preview;
pub use private_history::{
    RuntimePromisePosition, RuntimePromisePresentation, RuntimePromiseSelection, RuntimePromiseView, RuntimeResidentPromise,
    RuntimeActivityInspection, RuntimePlayerTranscriptRead, RuntimePrivateHistoryPublication,
    RuntimePrivateHistoryRead,
    RuntimeRecentBrowse, RuntimeRecentPosition, RuntimeRecentReceipt, RuntimeRecentSourceRead,
    RuntimeRecordedEventRoles,
};
mod navigation;
mod read_cut;
pub use crate::capture::{
    NpcArchivedSourceRow, NpcPersonalSelection, NpcPersonalSourceRow, NpcReceiptSelection,
    NpcSourceRows, NpcSourceSelection,
};
pub use navigation::RuntimeNavigationRead;
pub use read_cut::{
    RuntimeActivityHistoryRead, RuntimeActivityRowsRead, RuntimeAppraisalOutcomesRead,
    RuntimeKnownPlaceRead, RuntimeNpcSourceRead, RuntimeSourceVersionRead,
};
mod restore;
pub use restore::{
    RestoreArchive, RestoreArchiveCategory, RestoreArchiveMatch, RestoreArchiveSelection, RestoreBinding, RestoreGrant, RestoreInput,
    RestoreMetadataInput, RestorePrivacyInput, RestoreRetentionPreparation, RuntimeRestoreArchives, RuntimeRestoreMembership,
    RuntimeRestorePlacement,
};
mod retained_values;
pub use crate::simulation::session::PreparedReadProgress as RuntimeProgress;
pub use handoff::RuntimeOutputHandoff;
mod consumer;
pub use crate::capture::npc_self::{RuntimeNpcSelf, RuntimeNpcSelfPrompt};
pub use crate::capture::{NpcActivityChoice, NpcActivityFacts};
pub use crate::time::{AdmittedWorldInput, Direction, ReleaseInput, SteeringInput};
pub use consumer::RuntimeConsumer;
pub(crate) use npc::HeldSourceProof;
pub use npc::{
    AppraisalSelection, AppraisalSourceAlias, PersonalOrdinal, RuntimeNpcAppraisalRecord,
    RuntimeNpcIdentity, RuntimeNpcBindingInput, RuntimeNpcBindingRequest, RuntimeNpcBoundaryFact, RuntimeNpcConsumer,
    RuntimeNpcDecisionFrame, RuntimeNpcDecisionOrigin, RuntimeNpcFeeling, RuntimeNpcFeelingTarget,
    RuntimeNpcFeelings, RuntimeNpcHistoryWindow, RuntimeNpcObservedBody, RuntimeNpcOffer, RuntimeNpcOperations,
    RuntimeNpcPersonalSource, RuntimeNpcPersonalSources, RuntimeNpcPreparationStep,
    RuntimeNpcPresentedBody, RuntimeNpcPublication, RuntimeNpcRead, RuntimeNpcResponseTicket,
    RuntimeNpcHistoricalPose, RuntimeNpcSeparation, RuntimeNpcSeparationEvidence,
    RuntimeNpcSubjectNote,
};
pub use player::{InspectedRecipeRecord, RuntimeWorldStorage};
pub use player::{OBJECT_HISTORY_SELECTION, RuntimeObjectHistoryEntry, RuntimeObjectHistoryRead};
pub use player::{
    RuntimeOfferCursor, RuntimeOfferPage, RuntimeOfferProblem, RuntimeOfferSelection, RuntimeOfferSource,
};
pub use player::{
    CoordinateRefusal, DirectInventory, FireOperation, InteractionMode, InventoryContainer,
    InventoryCrumb, InventoryGroup, PlayerInteractionFacts, ResolvedInventoryGroup,
    RuntimeFireChoice, RuntimeFireMenu, RuntimeFishOffer, StockGroupRefusal, StockGroupRequest, stock_group_limit_message,
    RuntimeFishTool, RuntimeFoodMenu, RuntimeGatherOffer, RuntimeHearthCatalogue,
    RuntimeHearthShape, RuntimeHeatContact, RuntimePickupLot, RuntimePickupOffer,
    RuntimePlayerCommand, RuntimePlayerInputState, RuntimePlayerPublication, RuntimePlayerRead,
    RuntimePreparation, RuntimeResourceOffer, RuntimeStatusChoice, RuntimeStatusMenu,
    RuntimeStrikeMenu, TypedWalk, VisibleFuel,
};
pub use reply_preview::{
    RuntimeReplyPreviewFacts, RuntimeReplyPreviewPublication, RuntimeReplyPreviewRead,
};

#[derive(Debug)]
pub struct RuntimeError {
    detail: String,
    refusal: Refusal,
}
#[derive(Debug)]
enum Refusal {
    Capacity,
    Busy,
    Stale(&'static str),
    ConstructionGatherNeedsAuthority,
    Other,
}
impl RuntimeError {
    /// Preserve a trusted application's reason when it cannot stage a product
    /// before Ready. The original candidate still rolls back.
    pub fn application_refused(reason: impl std::fmt::Display) -> Self {
        Self {
            detail: format!("Application refused the prepared operation: {reason}"),
            refusal: Refusal::Other,
        }
    }

    /// The application withheld admission before Ready. Keep its reason and
    /// let the host apply the resource owner's wait or recovery policy.
    pub fn application_busy(reason: impl std::fmt::Display) -> Self {
        Self {
            refusal: Refusal::Busy,
            ..Self::application_refused(reason)
        }
    }

    /// The operation exhausted its byte allowance. Callers decide whether they
    /// can defer or retry from their own acceptance and settlement state.
    pub fn is_capacity(&self) -> bool {
        matches!(self.refusal, Refusal::Capacity)
    }

    /// The runtime or its application could not admit this work.
    pub fn is_busy(&self) -> bool {
        matches!(self.refusal, Refusal::Busy)
    }

    /// A potentially authorized lot is due. Retry this unpublished offer
    /// through the protected application read and writer.
    pub fn construction_gather_needs_authority(&self) -> bool {
        matches!(self.refusal, Refusal::ConstructionGatherNeedsAuthority)
    }

    /// An exact live evidence comparison lost its authority.
    pub fn stale_reason(&self) -> Option<&'static str> {
        match self.refusal {
            Refusal::Stale(reason) => Some(reason),
            _ => None,
        }
    }
}
impl std::fmt::Display for RuntimeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.detail)
    }
}
impl std::error::Error for RuntimeError {}
impl From<CapacityError> for RuntimeError {
    fn from(error: CapacityError) -> Self {
        RuntimeError {
            refusal: Refusal::Capacity,
            ..failure(error)
        }
    }
}

fn failure(error: impl std::fmt::Debug) -> RuntimeError {
    RuntimeError {
        detail: format!("Native writer refused operation: {error:?}"),
        refusal: Refusal::Other,
    }
}

fn stale(reason: &'static str) -> RuntimeError {
    RuntimeError {
        refusal: Refusal::Stale(reason),
        ..failure(reason)
    }
}

fn fence_failure(error: FenceError) -> RuntimeError {
    if error == FenceError::Busy {
        return RuntimeError {
            refusal: Refusal::Busy,
            ..failure(error)
        };
    }
    failure(error)
}

fn session_failure(error: crate::simulation::SessionError) -> RuntimeError {
    use crate::commands::CommandOperationError;
    use crate::events::EventError;
    use crate::execution::ExecutionError;
    use crate::reception::ObserverReceptionError;
    use crate::simulation::{DriveError, SessionError};
    use crate::time::AdvanceError;

    fn allocation(error: &ExecutionError) -> bool {
        matches!(error, ExecutionError::Capacity)
            || matches!(error, ExecutionError::Received(error) if *error == crate::received::ReceivedError::TRANSIENT_CAPACITY)
    }

    if matches!(error, SessionError::Fence(FenceError::Busy)) {
        return RuntimeError {
            refusal: Refusal::Busy,
            ..failure(error)
        };
    }
    if matches!(&error, SessionError::Drive(DriveError::Semantic(
        AdvanceError::Execution(ExecutionError::ConstructionGatherNeedsAuthority)
    ))) {
        return RuntimeError { refusal: Refusal::ConstructionGatherNeedsAuthority, ..failure(error) };
    }
    let capacity = match &error {
        SessionError::Drive(DriveError::Capacity) => true,
        SessionError::Execution(error)
        | SessionError::Drive(DriveError::Semantic(
            AdvanceError::Execution(error)
            | AdvanceError::Command(
                CommandOperationError::Execution(error)
                | CommandOperationError::Event(EventError::Execution(error)),
            )
            | AdvanceError::Reception(
                ObserverReceptionError::Execution(error)
                | ObserverReceptionError::Event(EventError::Execution(error)),
            ),
        )) => allocation(error),
        _ => false,
    };
    RuntimeError {
        refusal: if capacity {
            Refusal::Capacity
        } else {
            Refusal::Other
        },
        ..failure(error)
    }
}
fn decode_preparation(bytes: &[u8], budget: &ByteBudget) -> Result<ByteReservation, RuntimeError> {
    use crate::host::retained_size::map_storage;
    use std::mem::size_of;
    let text = std::str::from_utf8(bytes).map_err(failure)?;
    let shape = crate::encoding::JsonAllocationShape::read(text).map_err(failure)?;
    // These are the finite input arrays' inline carriers. Definitions are
    // canonical/source strings; installed rows never decode into a second world.
    let element = [
        size_of::<crate::records::InstalledRow>(),
        size_of::<crate::records::OwnerCoverage>(),
        size_of::<crate::records::RecordLayout>(),
        size_of::<crate::records::SqlCell>(),
        size_of::<crate::received::ReceivedChargeDirectory>(),
        size_of::<crate::commands::NativeCommand>(),
        size_of::<crate::time::AdmittedWorldInput>(),
    ]
    .into_iter()
    .max()
    .unwrap_or(0);
    let member = map_storage::<String, Vec<crate::records::InstalledRow>>(1)
        .and_then(|a| map_storage::<String, crate::records::SqlCell>(1).map(|b| a.max(b)))
        .ok_or_else(|| failure("capacity"))?;
    let bound = shape
        .array_items
        .checked_mul(4)
        .and_then(|n| n.checked_mul(element))
        .and_then(|n| n.checked_add(shape.members.checked_mul(member)?))
        .and_then(|n| n.checked_add(bytes.len().checked_mul(12)?))
        .and_then(|n| {
            n.checked_add(
                shape
                    .strings
                    .checked_mul(8 * size_of::<u16>() + 2 * size_of::<usize>())?,
            )
        })
        .ok_or_else(|| failure("capacity"))?;
    budget.reserve(bound).map_err(failure)
}
/// The bridge transfers the existing charge for its copied UTF-8 allocation.
/// Field order keeps the String funded through its actual destruction, including
/// stale-question and malformed-answer refusal. This input grants no authority.
pub struct RuntimeProviderInput {
    body: RuntimeAnswerBody,
    custody: ByteReservation,
}
enum RuntimeAnswerBody {
    Json(String),
    Geometry(Box<crate::geometry::GeometryAnswers>),
    Utterance(Box<crate::speech::UtteranceAnswer>),
    Words(Box<crate::language::WordsAnswer>),
    Collation(Box<crate::language::CollationAnswer>),
    LocalFormat(crate::geometry::GeometryBinding, Box<LocalFormat>),
    NpcSources(Box<crate::capture::NpcSourcesAnswer>),
    KnownPlaces(Box<crate::simulation::KnownPlacesAnswer>),
    RestoreArchives(Box<crate::restore::RestoreArchivesAnswer>),
    PersonalHistory(Box<crate::experience::HistoryEditAnswer>),
    SourceVersions(Box<crate::simulation::SourceVersionsAnswer>),
    Maintenance(Box<crate::cognition::format::MaintenanceFormatAnswer>),
    ActivityHistory(Box<crate::activity::LearningHistoryAnswer>),
    AppraisalOutcomes(Box<crate::response::AppraisalCreatesAnswer>),
    ActivityLearningFormat(Box<crate::activity::LearningFormatAnswer>),
}
impl RuntimeProviderInput {
    /// The caller already admitted and owns this String's backing. Its actual
    /// capacity and host budget are checked at the continuation boundary.
    pub fn new(json: String, custody: ByteReservation) -> Self {
        Self {
            body: RuntimeAnswerBody::Json(json),
            custody,
        }
    }

    pub fn geometry(
        answers: crate::geometry::GeometryAnswers,
        mut custody: ByteReservation,
    ) -> Result<Self, RuntimeError> {
        let bytes = custody
            .bytes()
            .checked_add(std::mem::size_of::<crate::geometry::GeometryAnswers>())
            .ok_or_else(|| failure("capacity"))?;
        custody.resize(bytes).map_err(failure)?;
        Ok(Self {
            body: RuntimeAnswerBody::Geometry(Box::new(answers)),
            custody,
        })
    }

    /// Adopt the funded output of the local utterance provider. The receiving
    /// event still checks the exact ticket and validates the word offsets.
    pub fn utterance(
        binding: crate::geometry::GeometryBinding,
        words: Vec<crate::speech::SpeechWord>,
        lowercase: crate::text::JsText,
        mut custody: ByteReservation,
    ) -> Result<Self, RuntimeError> {
        use std::mem::size_of;
        let bytes = words
            .capacity()
            .checked_mul(size_of::<crate::speech::SpeechWord>())
            .and_then(|bytes| bytes.checked_add(lowercase.storage_bytes()))
            .and_then(|bytes| bytes.checked_add(size_of::<crate::speech::UtteranceAnswer>()))
            .ok_or_else(|| failure("capacity"))?;
        custody.resize(bytes)?;
        Ok(Self {
            body: RuntimeAnswerBody::Utterance(Box::new(crate::speech::UtteranceAnswer {
                binding,
                words,
                lowercase,
            })),
            custody,
        })
    }

    /// Move the provider's funded strings into the original introduction
    /// question. The receiving cursor validates their source slices.
    pub fn speech_words(
        binding: crate::geometry::GeometryBinding,
        words: Vec<Vec<crate::text::JsText>>,
        mut custody: ByteReservation,
    ) -> Result<Self, RuntimeError> {
        use crate::host::retained_size::HeapBytes;
        let bytes = words
            .heap_bytes()
            .and_then(|bytes| {
                bytes.checked_add(std::mem::size_of::<crate::language::WordsAnswer>())
            })
            .ok_or_else(|| failure("capacity"))?;
        custody.resize(bytes)?;
        Ok(Self {
            body: RuntimeAnswerBody::Words(Box::new(crate::language::WordsAnswer {
                binding,
                words,
            })),
            custody,
        })
    }

    /// Transfer the admitted order and equal groups for this exact request.
    /// The issuing cursor remains responsible for validating the permutation.
    pub fn collation(
        binding: crate::geometry::GeometryBinding,
        order: Vec<u32>,
        groups: Vec<u32>,
        mut custody: ByteReservation,
    ) -> Result<Self, RuntimeError> {
        let bytes = order.capacity().checked_add(groups.capacity())
            .and_then(|n| n.checked_mul(size_of::<u32>()))
            .and_then(|n| n.checked_add(size_of::<crate::language::CollationAnswer>()))
            .ok_or_else(|| failure("capacity"))?;
        custody.resize(bytes)?;
        Ok(Self {
            body: RuntimeAnswerBody::Collation(Box::new(crate::language::CollationAnswer {
                binding,
                order,
                groups,
            })),
            custody,
        })
    }

    /// Adopt only the formatter's own retained result. The caller funds
    /// rendering before construction and may release its other workspace.
    pub fn local_format(
        binding: crate::geometry::GeometryBinding,
        output: LocalFormat,
        mut custody: ByteReservation,
    ) -> Result<Self, RuntimeError> {
        custody.resize(output.answer_bytes().ok_or(CapacityError)?)?;
        Ok(Self {
            body: RuntimeAnswerBody::LocalFormat(binding, Box::new(output)),
            custody,
        })
    }

    /// Move the funded, actor-scoped PostgreSQL capsules to the existing
    /// place preparation. Its ticket, actor life and privacy checks still apply.
    pub fn known_places(
        binding: crate::geometry::GeometryBinding,
        capsules: Vec<crate::experience::KnownPlaceCapsule>,
        mut custody: ByteReservation,
    ) -> Result<Self, RuntimeError> {
        let answer = crate::simulation::KnownPlacesAnswer::from_rows(binding, capsules);
        custody.resize(answer.retained_bytes().ok_or(CapacityError)?)?;
        Ok(Self {
            body: RuntimeAnswerBody::KnownPlaces(Box::new(answer)),
            custody,
        })
    }

    /// Move the already funded selected rows into the existing private edit
    /// validator. No native mutation may use them without its original ticket.
    pub fn personal_history(
        rows: crate::experience::HistoryEditReadResponse,
        mut custody: ByteReservation,
    ) -> Result<Self, RuntimeError> {
        let header = custody.split_off(size_of::<crate::experience::HistoryEditAnswer>())?;
        Ok(Self {
            body: RuntimeAnswerBody::PersonalHistory(Box::new(
                crate::experience::HistoryEditAnswer::from_read(rows, custody),
            )),
            custody: header,
        })
    }

    /// Move independently admitted PostgreSQL rows to the native NPC evidence validator.
    pub fn npc_sources(
        binding: crate::geometry::GeometryBinding,
        read_serial: u64,
        rows: NpcSourceRows,
        custody: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Self, RuntimeError> {
        if !budget.owns(&custody) {
            return Err(failure("NPC source rows belong to another native budget"));
        }
        let wrapper = budget.reserve(0).map_err(failure)?;
        Ok(Self {
            body: RuntimeAnswerBody::NpcSources(Box::new(
                crate::capture::NpcSourcesAnswer::adopt(binding, read_serial, rows, custody)
                    .map_err(failure)?,
            )),
            custody: wrapper,
        })
    }

    /// Transfer only the scoped, funded prior rows. The appraisal owner
    /// validates their exact identities and current format before using them.
    /// Adopt the exact version plan built from the accepted SQL cut.
    pub fn source_versions(
        binding: crate::geometry::GeometryBinding,
        plan: crate::received::SourceVersionPlan,
        maximum: usize,
        mut storage: ByteReservation,
    ) -> Result<Self, RuntimeError> {
        let header = storage.split_off(0)?;
        let answer = crate::simulation::SourceVersionsAnswer::adopt(binding, plan, maximum, storage)
            .map_err(|error| match error {
                crate::simulation::DriveError::Capacity => CapacityError.into(),
                error => failure(error),
            })?;
        Ok(Self {
            body: RuntimeAnswerBody::SourceVersions(Box::new(answer)),
            custody: header,
        })
    }

    pub fn appraisal_outcomes(
        binding: crate::geometry::GeometryBinding,
        rows: Vec<crate::records::InstalledRow>,
        storage: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Self, RuntimeError> {
        if !budget.owns(&storage) {
            return Err(failure("prior appraisal rows belong to another native budget"));
        }
        let custody = budget.reserve(size_of::<crate::response::AppraisalCreatesAnswer>())?;
        Ok(Self {
            body: RuntimeAnswerBody::AppraisalOutcomes(Box::new(
                crate::response::AppraisalCreatesAnswer::provided(binding, rows, storage),
            )),
            custody,
        })
    }

    /// Move the actual scoped PostgreSQL rows and their custody into the
    /// existing activity learner, which still validates their identities.
    pub fn activity_history(
        binding: crate::geometry::GeometryBinding,
        rows: Vec<crate::records::InstalledRow>,
        storage: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Self, RuntimeError> {
        if !budget.owns(&storage) {
            return Err(failure("activity history belongs to another native budget"));
        }
        let custody = budget.reserve(size_of::<crate::activity::LearningHistoryAnswer>())?;
        Ok(Self {
            body: RuntimeAnswerBody::ActivityHistory(Box::new(
                crate::activity::LearningHistoryAnswer::provided(binding, rows, storage),
            )),
            custody,
        })
    }

    /// Adopt the funded facts for this exact mind-format request. The
    /// candidate still validates canonical text and all publication effects.
    pub fn maintenance_format(
        binding: crate::geometry::GeometryBinding,
        canonical: String,
        valid_paths: Vec<bool>,
        file_words: Vec<u64>,
        thought_words: Vec<u64>,
        answer_custody: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Self, RuntimeError> {
        if !budget.owns(&answer_custody) {
            return Err(failure("mind formatting belongs to another native budget"));
        }
        let custody = budget.reserve(0)?;
        let answer = crate::cognition::format::MaintenanceFormatAnswer::checked(
            binding,
            canonical,
            valid_paths,
            file_words,
            thought_words,
            answer_custody,
        )
        .map_err(failure)?;
        Ok(Self {
            body: RuntimeAnswerBody::Maintenance(Box::new(answer)),
            custody,
        })
    }
}

fn provider_response(
    answer: Option<(&RuntimeProvider, RuntimeProviderInput)>,
    budget: &ByteBudget,
) -> Result<Option<ProviderResponse>, RuntimeError> {
    answer
        .map(|(ticket, input)| {
            let question = ticket.question()?;
            if !budget.owns(&input.custody) {
                return Err(failure("provider answer belongs to another native budget"));
            }
            match input.body {
                RuntimeAnswerBody::Json(json) => {
                    ProviderResponse::new(question.kind(), question.binding(), json, input.custody)
                }
                RuntimeAnswerBody::Geometry(answer) => {
                    if question.geometry().is_none() {
                        return Err(failure(
                            "geometry answer cannot satisfy this provider request",
                        ));
                    }
                    ProviderResponse::geometry(question.binding(), answer, input.custody)
                }
                RuntimeAnswerBody::Utterance(answer) => {
                    if question.utterance().is_none() {
                        return Err(failure("speech words require the actual utterance request"));
                    }
                    ProviderResponse::utterance(question.binding(), answer, input.custody)
                }
                RuntimeAnswerBody::Collation(answer) => {
                    if question.collation().is_none() {
                        return Err(failure("collation ranks require the actual strings request"));
                    }
                    ProviderResponse::collation(question.binding(), answer, input.custody)
                }
                RuntimeAnswerBody::LocalFormat(binding, output) => {
                    if binding != question.binding() {
                        return Err(failure("local formatter answer belongs to another request"));
                    }
                    ProviderResponse::local_format(question.kind(), binding, output, input.custody)
                }
                RuntimeAnswerBody::Words(answer) => {
                    if question.words().is_none() {
                        return Err(failure(
                            "word lists require the actual introduction request",
                        ));
                    }
                    ProviderResponse::words(question.binding(), answer, input.custody)
                }
                RuntimeAnswerBody::KnownPlaces(answer) => {
                    if question.known_places().is_none() {
                        return Err(failure("place capsules require their original request"));
                    }
                    ProviderResponse::known_places(question.binding(), answer, input.custody)
                }
                RuntimeAnswerBody::SourceVersions(answer) => {
                    if question.source_versions().is_none() {
                        return Err(failure("version plan requires its original typed request"));
                    }
                    ProviderResponse::source_versions(question.binding(), answer, input.custody)
                }
                RuntimeAnswerBody::RestoreArchives(answer) => {
                    if question.restore_archives().is_none() {
                        return Err(failure("archive selection requires its original restore request"));
                    }
                    ProviderResponse::restore_archives(question.binding(), answer, input.custody)
                }
                RuntimeAnswerBody::PersonalHistory(answer) => {
                    if question.personal_history().is_none() {
                        return Err(failure("history rows require their original typed request"));
                    }
                    ProviderResponse::personal_history(question.binding(), answer, input.custody)
                }
                RuntimeAnswerBody::NpcSources(answer) => {
                    if question.kind() != crate::simulation::ProviderKind::Sources {
                        return Err(failure(
                            "NPC source answer cannot satisfy this provider request",
                        ));
                    }
                    ProviderResponse::npc_sources(question.binding(), answer, input.custody)
                }
                RuntimeAnswerBody::Maintenance(answer) => {
                    if question.maintenance().is_none() {
                        return Err(failure("mind format answer requires its typed request"));
                    }
                    ProviderResponse::maintenance(question.binding(), answer, input.custody)
                }
                RuntimeAnswerBody::AppraisalOutcomes(answer) => {
                    if question.appraisal_outcomes().is_none() {
                        return Err(failure("prior appraisal rows require their typed request"));
                    }
                    ProviderResponse::appraisal_outcomes(question.binding(), answer, input.custody)
                }
                RuntimeAnswerBody::ActivityHistory(answer) => {
                    if question.learning_history().is_none() {
                        return Err(failure("activity history requires its typed request"));
                    }
                    ProviderResponse::learning_history(question.binding(), answer, input.custody)
                }
                RuntimeAnswerBody::ActivityLearningFormat(answer) => {
                    if question.learning_format().is_none() {
                        return Err(failure("activity captions require their typed request"));
                    }
                    ProviderResponse::learning_format(question.binding(), answer, input.custody)
                }
            }
            .map_err(failure)
        })
        .transpose()
}

/// A detached immutable JSON encoding, never a writable canonical record.
/// The Node bridge must transfer both parts to the actual buffer finalizer.
pub struct RuntimeJson {
    bytes: Vec<u8>,
    custody: ByteReservation,
    handoff: Option<RuntimeOutputHandoff>,
}
impl RuntimeJson {
    /// Join already encoded semantic-owner products without constructing a
    /// second mutable graph. The final allocation is admitted before copying.
    fn join(parts: &[&[u8]], budget: &ByteBudget) -> Result<Self, RuntimeError> {
        let length = parts
            .iter()
            .try_fold(0usize, |n, part| n.checked_add(part.len()))
            .ok_or(CapacityError)?;
        let mut custody = budget.reserve(length)?;
        let mut bytes = Vec::new();
        bytes.try_reserve_exact(length).map_err(|_| CapacityError)?;
        for part in parts {
            bytes.extend_from_slice(part);
        }
        custody.resize(bytes.capacity())?;
        Ok(Self {
            bytes,
            custody,
            handoff: None,
        })
    }
    /// Reserve decoded consumer custody before the actual JavaScript parser.
    /// The result's finite value/consumer wrapper has its own carrier allowance.
    pub fn consumer(&self, budget: &ByteBudget) -> Result<RuntimeConsumer, RuntimeError> {
        consumer::prepare(&self.bytes, budget, 64 * std::mem::size_of::<u64>())
    }
    /// Count and encode a detached packet. Its reservation belongs to the
    /// returned buffer, with byte refusal distinct from a serializer error.
    fn encode(
        value: &(impl Serialize + ?Sized),
        budget: &ByteBudget,
    ) -> Result<Self, RuntimeError> {
        let length = json_record_len(value).map_err(failure)?;
        let mut custody = budget.reserve(
            length
                .checked_mul(2)
                .map(|n| n.max(8))
                .ok_or(CapacityError)?,
        )?;
        let bytes = json_record(value).map_err(failure)?.into_bytes();
        custody.resize(bytes.capacity())?;
        Ok(Self {
            bytes,
            custody,
            handoff: None,
        })
    }
    pub fn bytes(&self) -> &[u8] {
        &self.bytes
    }
    pub fn into_parts(self) -> (Vec<u8>, ByteReservation, Option<RuntimeOutputHandoff>) {
        (self.bytes, self.custody, self.handoff)
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Installation {
    records: crate::records::CurrentRecords,
    originals: Vec<crate::events::OriginalOccurrenceInput>,
    definitions: crate::install::NativeDefinitionInputs,
    settings: crate::install::NativeSetupSettings,
    storage: RuntimeStorageSettings,
    layouts: Vec<crate::records::RecordLayout>,
    cold_directories:
        Option<indexmap::IndexMap<String, Vec<crate::received::ReceivedChargeDirectory>>>,
    working_set: Option<crate::install::WorkingSetSelection>,
    accepted_cut: u64,
}

/// Build-time authored content and trusted host settings. The live database
/// supplies records and historical sources independently at each cold open.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RuntimeInstallDefinitions {
    definitions: crate::install::NativeDefinitionInputs,
    settings: crate::install::NativeSetupSettings,
    storage: RuntimeStorageSettings,
    layouts: Vec<crate::records::RecordLayout>,
}

pub struct RuntimeInstallSources {
    pub records: crate::records::CurrentRecords,
    pub originals: Vec<crate::events::OriginalOccurrenceInput>,
    pub cold_directories:
        Option<indexmap::IndexMap<String, Vec<crate::received::ReceivedChargeDirectory>>>,
    pub working_set: Option<crate::install::WorkingSetSelection>,
    pub accepted_cut: u64,
}

impl RuntimeInstallDefinitions {
    /// The caller admits the typed input before retrieval and retains its
    /// custody through installation. All installed families, rows and pins
    /// are validated by the same owner as the addon installation.
    pub fn install_current(
        self,
        sources: RuntimeInstallSources,
        database_schema: &str,
        budget: ByteBudget,
        input_custody: ByteReservation,
    ) -> Result<NativeWorldSession, RuntimeError> {
        self.install_current_for_purpose(
            sources,
            database_schema,
            budget,
            input_custody,
            crate::install::InstallPurpose::Current,
        )
    }

    /// Install the validated checkpoint as an inactive candidate. Gameplay and
    /// private reads remain closed until its exact committed restore receipt.
    pub fn install_current_for_restore(
        self,
        sources: RuntimeInstallSources,
        database_schema: &str,
        budget: ByteBudget,
        input_custody: ByteReservation,
    ) -> Result<NativeWorldSession, RuntimeError> {
        self.install_current_for_purpose(
            sources,
            database_schema,
            budget,
            input_custody,
            crate::install::InstallPurpose::Restore,
        )
    }

    fn install_current_for_purpose(
        self,
        sources: RuntimeInstallSources,
        database_schema: &str,
        budget: ByteBudget,
        input_custody: ByteReservation,
        purpose: crate::install::InstallPurpose,
    ) -> Result<NativeWorldSession, RuntimeError> {
        if !budget.owns(&input_custody) {
            return Err(failure(
                "installation input belongs to another native budget",
            ));
        }
        let result = NativeWorldSession::install_input(
            Installation {
                definitions: self.definitions,
                settings: self.settings,
                storage: self.storage,
                layouts: self.layouts,
                records: sources.records,
                originals: sources.originals,
                cold_directories: sources.cold_directories,
                working_set: sources.working_set,
                accepted_cut: sources.accepted_cut,
            },
            database_schema,
            budget.for_world(),
            purpose,
        );
        drop(input_custody);
        result
    }
}

impl Installation {
    fn decoded_text_heap(&self) -> Option<usize> {
        use crate::host::retained_size::{HeapBytes, heap_sum};
        // Definitions, layouts, originals and cold directories use the input
        // preflight's ordinary String path. These are all remaining dynamic
        // owners. Keep their actual heaps, including exact UTF16 encodings.
        heap_sum([
            self.records.normalized_intents.heap_bytes()?,
            self.records.activity_method_signatures.heap_bytes()?,
            self.records
                .tables
                .values()
                .flatten()
                .try_fold(0usize, |bytes, row| {
                    bytes.checked_add(row.extra.heap_bytes()?)
                })?,
            self.working_set.heap_bytes()?,
            self.settings.heap_bytes()?,
        ])
    }
}

pub struct RuntimeProvider {
    // Field order matters: the final Weak releases its fixed question slot
    // before the shared backing guard can return that allocation admission.
    question: Weak<ProviderQuestion>,
    _question_backing: Arc<ByteReservation>,
    _wrapper: ByteReservation,
}
impl RuntimeProvider {
    fn prepare(
        question: &Arc<ProviderQuestion>,
        budget: &ByteBudget,
    ) -> Result<Self, RuntimeError> {
        // Actual RuntimeProvider/Arc plus the same supported opaque Node class
        // carrier allowance as RuntimeConsumer. This is per wrapper, not per
        // question body or a claim about total V8/RSS memory.
        let bytes = std::mem::size_of::<Self>()
            .checked_add(2 * std::mem::size_of::<usize>() + 32 * std::mem::size_of::<u64>())
            .and_then(|n| n.checked_add(std::mem::align_of::<Self>() - 1))
            .ok_or_else(|| failure("native provider allocation overflow"))?;
        let wrapper = budget.reserve(bytes).map_err(failure)?;
        Ok(Self {
            question: Arc::downgrade(question),
            _question_backing: Arc::clone(question.backing()),
            _wrapper: wrapper,
        })
    }
    fn question(&self) -> Result<Arc<ProviderQuestion>, RuntimeError> {
        self.question
            .upgrade()
            .ok_or_else(|| failure("native provider question is no longer pending"))
    }
    /// Lend the same funded request to an in-process provider without a bridge
    /// buffer copy. The active candidate owns its body; the callback may only
    /// retain independently admitted data.
    pub fn with_request<T>(&self, use_request: impl FnOnce(&str) -> T) -> Result<T, RuntimeError> {
        let request = self.question()?;
        let json = request
            .json()
            .ok_or_else(|| failure("this request needs a typed provider"))?;
        Ok(use_request(json))
    }

    /// The pending simulator owns this immutable geometry request through the
    /// callback. A direct provider takes no bridge encoding or mutable state.
    pub fn with_geometry<T>(
        &self,
        compute: impl FnOnce(&crate::geometry::GeometryQueries) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        let request = self.question()?;
        Ok(request.geometry().map(compute))
    }

    /// Give the formatter the proposed clock scalars and exact request binding.
    /// This read cannot apply a clock change or retain any world data.
    pub fn with_control<T>(
        &self,
        format: impl FnOnce(crate::geometry::GeometryBinding, bool, f64) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        let question = self.question()?;
        Ok(question
            .control()
            .map(|request| format(request.binding, request.paused, request.speed)))
    }

    /// Render work labels from the funded selected actor/target facts. The
    /// result owns independent storage and carries the exact question binding.
    pub fn format_activity_display(
        &self,
        budget: &ByteBudget,
    ) -> Result<Option<RuntimeProviderInput>, RuntimeError> {
        let question = self.question()?;
        let Some(request) = question.display() else {
            return Ok(None);
        };
        let (view, custody) = request.format(budget).map_err(failure)?;
        Ok(Some(RuntimeProviderInput::local_format(
            request.binding,
            LocalFormat::Display(view),
            custody,
        )?))
    }

    /// Use the exact already prepared command text for canonical ordering.
    /// The plan owns the input. The formatter must fund its own result.
    pub fn with_plan_command<T>(
        &self,
        format: impl FnOnce(crate::geometry::GeometryBinding, &str) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        let question = self.question()?;
        Ok(question
            .plan_command()
            .map(|request| format(request.binding, request.command.source_encoding())))
    }

    pub fn asks_known_places(&self) -> Result<bool, RuntimeError> {
        Ok(self.question()?.known_places().is_some())
    }

    /// Borrow the immutable digest input. The cursor owns its separate
    /// comparison workspace. The formatter admits the canonical bytes it emits.
    pub fn with_digest<T>(
        &self,
        format: impl FnOnce(crate::geometry::GeometryBinding, &crate::records::SqlCell, usize) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        let question = self.question()?;
        Ok(question
            .digest()
            .map(|value| format(question.binding(), &value.value, value.bytes())))
    }

    /// Borrow the selected identities, labels and meanings, with no command
    /// bodies. The formatter must independently fund anything it returns.
    pub fn with_choice_descriptions<T>(
        &self,
        format: impl FnOnce(
            crate::geometry::GeometryBinding, &crate::capture::NpcDescriptionsRequest,
        ) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        let question = self.question()?;
        Ok(question.choice_descriptions().map(|request| format(question.binding(), request)))
    }

    /// Borrow the exact authorized speech string for local ICU preparation.
    /// Any retained result needs its own admitted storage.
    pub fn with_utterance<T>(
        &self,
        prepare: impl FnOnce(crate::geometry::GeometryBinding, &crate::text::JsText) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        let question = self.question()?;
        Ok(question
            .utterance()
            .map(|ask| prepare(ask.binding, &ask.text)))
    }

    /// Borrow the already selected, funded words request. This callback
    /// never acquires additional character knowledge or source permissions.
    pub fn with_speech_words<T>(
        &self,
        prepare: impl FnOnce(crate::geometry::GeometryBinding, &[crate::text::JsText]) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        let question = self.question()?;
        Ok(question
            .words()
            .map(|ask| prepare(ask.binding, &ask.strings)))
    }

    /// Borrow the selected strings from this pending candidate through the
    /// synchronous ICU call. The returned ranks carry independent custody.
    pub fn with_collation<T>(
        &self,
        compare: impl FnOnce(crate::geometry::GeometryBinding, &[String]) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        let question = self.question()?;
        Ok(question.collation().map(|ask| compare(ask.binding, &ask.strings)))
    }

    /// Lend the active mind publication to the pure ICU formatter. A provider
    /// can only return separately funded text facts for this exact question.
    pub fn with_maintenance_format<T>(
        &self,
        format: impl FnOnce(crate::geometry::GeometryBinding, &crate::records::SqlCell, usize) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        let question = self.question()?;
        Ok(question
            .maintenance()
            .map(|ask| format(ask.binding(), ask.publication(), ask.publication_bytes())))
    }

    /// Format the exact already-acquired activity evidence without bridge
    /// encoding. The existing learner still owns effects and claim validation.
    pub fn format_activity_learning(
        &self,
        budget: &ByteBudget,
    ) -> Result<Option<RuntimeProviderInput>, RuntimeError> {
        let question = self.question()?;
        let Some(request) = question.learning_format() else {
            return Ok(None);
        };
        let custody = budget.reserve(size_of::<crate::activity::LearningFormatAnswer>())?;
        let answer = request.format(budget).map_err(failure)?;
        Ok(Some(RuntimeProviderInput {
            body: RuntimeAnswerBody::ActivityLearningFormat(Box::new(answer)),
            custody,
        }))
    }

    pub fn json(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        let question = self.question()?;
        if let Some(geometry) = question.geometry_envelope() {
            return RuntimeJson::encode(&geometry, budget);
        }
        if let Some(control) = question.control_envelope() {
            return RuntimeJson::encode(&control, budget);
        }
        if let Some(display) = question.display_envelope() {
            return RuntimeJson::encode(&display, budget);
        }
        if let Some(command) = question.plan_command_envelope() {
            return RuntimeJson::encode(&command, budget);
        }
        if let Some(digest) = question.digest_envelope() {
            return RuntimeJson::encode(&digest, budget);
        }
        if let Some(descriptions) = question.choice_descriptions_envelope() {
            return RuntimeJson::encode(&descriptions, budget);
        }
        if let Some(utterance) = question.utterance_envelope() {
            return RuntimeJson::encode(&utterance, budget);
        }
        if let Some(words) = question.words_envelope() {
            return RuntimeJson::encode(&words, budget);
        }
        if let Some(collation) = question.collation_envelope() {
            return RuntimeJson::encode(&collation, budget);
        }
        if let Some(maintenance) = question.maintenance_envelope() {
            return RuntimeJson::encode(&maintenance, budget);
        }
        if let Some(places) = question.known_places_envelope() {
            return RuntimeJson::encode(&places, budget);
        }
        if let Some(archives) = question.restore_archives_envelope() {
            return RuntimeJson::encode(&archives, budget);
        }
        if let Some(history) = question.personal_history_envelope() {
            return RuntimeJson::encode(&history, budget);
        }
        if let Some(versions) = question.source_versions_envelope() {
            return RuntimeJson::encode(&versions, budget);
        }
        if let Some(sources) = question.npc_sources_envelope() {
            return RuntimeJson::encode(&sources, budget);
        }
        if let Some(appraisals) = question.appraisal_outcomes_envelope() {
            return RuntimeJson::encode(&appraisals, budget);
        }
        if let Some(history) = question.learning_history_envelope() {
            return RuntimeJson::encode(&history, budget);
        }
        if let Some(learning) = question.learning_format_envelope() {
            return RuntimeJson::encode(&learning, budget);
        }
        // Other provider families already own an encoded body. Copy only this
        // selected output; JavaScript buffers can never alias canonical bytes.
        let json = question
            .json()
            .ok_or_else(|| failure("missing provider request"))?;
        let mut custody = budget.reserve(json.len()).map_err(failure)?;
        let bytes = json.as_bytes().to_vec();
        custody.resize(bytes.capacity()).map_err(failure)?;
        Ok(RuntimeJson {
            bytes,
            custody,
            handoff: None,
        })
    }
}

pub struct RuntimePrepared {
    prepared: crate::simulation::session::PreparedCandidate,
    output: Option<RuntimeJson>,
    handoff: RuntimeOutputHandoff,
}
impl RuntimePrepared {
    pub fn key(&self) -> CandidateKey {
        self.prepared.key
    }
    pub fn allocation(&self) -> crate::values::WorkVector {
        self.prepared.allocation
    }
    /// The server reserves this complete allocation first. Its current input
    /// and authority check then runs immediately before fence.settle().
    pub fn ready(&self) -> Result<(), RuntimeError> {
        if self.output.is_some() || !self.handoff.is_complete() {
            return Err(failure(
                "prepared output has not transferred to the application",
            ));
        }
        self.prepared.ready().map_err(failure)
    }
    pub fn take_output(&mut self) -> Option<RuntimeJson> {
        self.output.take()
    }
}

/// A direct host stages only the borrowed products it will actually consume
/// after acceptance. The returned owned value must hold its own admission.
pub enum RuntimeDirectStep<T> {
    Continue,
    Provider(RuntimeProvider),
    Prepared(RuntimeDirectPrepared<T>),
    Preview(T),
}

pub struct RuntimeDirectPrepared<T> {
    prepared: crate::simulation::session::PreparedCandidate,
    output: T,
    protected_save: Option<RuntimeSave>,
}
impl<T> RuntimeDirectPrepared<T> {
    pub fn key(&self) -> CandidateKey {
        self.prepared.key
    }

    /// Mark Ready after all output and application preparation has succeeded.
    /// Final live authority must be checked before settling the same fence.
    pub fn ready(&self) -> Result<(), RuntimeError> {
        self.prepared.ready().map_err(failure)
    }

    pub fn output(&self) -> &T {
        &self.output
    }

    /// The exact protected prefix has independent custody throughout SQL.
    pub fn protected_save(&self) -> Option<&RuntimeSave> {
        self.protected_save.as_ref()
    }

    pub fn into_output(self) -> T {
        self.output
    }
}

pub enum RuntimeStep {
    Continue,
    Provider(RuntimeProvider),
    Prepared(RuntimePrepared),
    Preview(RuntimeJson),
}

/// One resident writer, parked between finite compute calls. The private
/// session owns every canonical mutation, rollback and accepted save suffix.
pub struct NativeWorldSession {
    // Session already admits its resident size. Carry only its owning pointer
    // across HTTP and SQL futures, which have smaller poll stacks than the
    // compute worker that builds the session.
    session: Box<Session>,
    budget: ByteBudget,
    world_work_limit: crate::work::WorkDemand,
    prepared_output: Option<CandidateKey>,
    active_response: Option<npc::ActiveNpcResponse>,
    held_receipts: npc::HeldReceiptRegistry,
    consolidation_watches: Option<Arc<maintenance::witness::ConsolidationWatches>>,
    history_policy_id: String,
    history_policy_revision: u64,
    _history_policy_custody: ResidentReservation,
    next_read_serial: u64,
    navigation: navigation::PreparedNavigationCache,
    entity_routes_pending: bool,
    pending_navigation: Option<(
        Vec<(
            crate::state::EntityHandle,
            crate::native_refuge::PendingRefugeNavigation,
        )>,
        ByteReservation,
    )>,
    active: bool,
    restore_installation: bool,
    restoring: Option<CandidateKey>,
    temporal_save_limits: crate::received::TemporalSaveLimits,
    history_edit_limits: crate::experience::HistoryEditLimits,
}
impl NativeWorldSession {
    fn prepare_provider(
        &mut self,
        key: CandidateKey,
        question: Arc<ProviderQuestion>,
    ) -> Result<RuntimeProvider, RuntimeError> {
        match RuntimeProvider::prepare(&question, &self.budget) {
            Ok(provider) => Ok(provider),
            Err(error) => {
                // No handle/key has reached Node yet. A wrapper refusal must
                // close this private checkpoint instead of stranding it.
                self.cancel(key)?;
                Err(error)
            }
        }
    }
    pub fn install(
        bytes: &[u8],
        database_schema: &str,
        budget: ByteBudget,
    ) -> Result<Self, RuntimeError> {
        Self::install_purpose(
            bytes,
            database_schema,
            budget,
            crate::install::InstallPurpose::Current,
        )
    }
    pub fn install_restore(
        bytes: &[u8],
        database_schema: &str,
        budget: ByteBudget,
    ) -> Result<Self, RuntimeError> {
        Self::install_purpose(
            bytes,
            database_schema,
            budget,
            crate::install::InstallPurpose::Restore,
        )
    }
    fn install_purpose(
        bytes: &[u8],
        database_schema: &str,
        budget: ByteBudget,
        purpose: crate::install::InstallPurpose,
    ) -> Result<Self, RuntimeError> {
        let budget = budget.for_world();
        // Parsed rows coexist with the caller's input and consuming installers.
        // This is transient preparation, not a canonical-world size policy.
        let _decode = crate::install::row_input::prepare_installation(
            bytes,
            &budget,
            std::mem::size_of::<Installation>(),
        )
        .map_err(failure)?;
        let input: Installation = serde_json::from_slice(bytes).map_err(failure)?;
        let retained_text = input
            .decoded_text_heap()
            .ok_or_else(|| failure("capacity"))?;
        let _decode = _decode
            .finish_installation(retained_text)
            .map_err(failure)?;
        Self::install_input(input, database_schema, budget, purpose)
    }

    fn install_input(
        input: Installation,
        database_schema: &str,
        budget: ByteBudget,
        purpose: crate::install::InstallPurpose,
    ) -> Result<Self, RuntimeError> {
        let restore_installation = matches!(&purpose, crate::install::InstallPurpose::Restore);
        let pending_save_budget = budget.pending_save(input.storage.pending_save_bytes);
        let temporal_save_limits = crate::received::TemporalSaveLimits {
            target_bytes: input.storage.temporal_save.target_bytes,
            row_bytes: input.storage.temporal_save.row_bytes,
            resident_bytes: input.storage.temporal_resident_bytes,
        };
        let history_edit_limits = input.storage.history_edit;
        let world_work_limit = input.settings.work.world;
        let core = crate::install::CoreInstallInput {
            purpose,
            records: input.records,
            originals: input.originals,
            definitions: input.definitions,
            settings: input.settings,
            layouts: input.layouts,
            cold_directories: input.cold_directories,
            accepted_cut: input.accepted_cut,
        };
        let installed = match input.working_set {
            Some(selection) => {
                crate::install::assemble_working_core(core, selection, database_schema, &budget)
            }
            None => crate::install::assemble_core(core, database_schema, &budget),
        }
        .map_err(failure)?;
        let history_policy_revision = installed.story_policy_revision.unwrap_or(0);
        #[derive(Deserialize)]
        struct StoryIdentity {
            id: String,
        }
        let policy = installed
            .state
            .installed
            .retained
            .story_policy
            .as_ref()
            .ok_or_else(|| failure("installed story policy is required by this proof"))?;
        let history_policy_custody = budget
            .reserve_record(policy.payload().len())
            .map_err(failure)?;
        let history_policy_id = serde_json::from_str::<StoryIdentity>(policy.payload())
            .map_err(failure)?
            .id;
        let installed = crate::install::finish_selected_installation(installed).map_err(failure)?;
        let generation = NEXT_GENERATION
            .fetch_update(Ordering::AcqRel, Ordering::Acquire, |value| {
                value
                    .checked_add(1)
                    .filter(|next| *next <= crate::identity::MAX_SAFE_INTEGER)
            })
            .map_err(failure)?;
        let held_receipts = npc::HeldReceiptRegistry::new(generation, &budget).map_err(failure)?;
        let navigation = navigation::PreparedNavigationCache::new(&budget)?;
        Ok(Self {
            session: Box::new(Session::new(
                installed,
                generation,
                budget.clone(),
                pending_save_budget,
                temporal_save_limits,
            )
            .map_err(failure)?),
            budget,
            world_work_limit,
            prepared_output: None,
            active_response: None,
            held_receipts,
            consolidation_watches: None,
            history_policy_id,
            history_policy_revision,
            _history_policy_custody: history_policy_custody,
            next_read_serial: 0,
            navigation,
            pending_navigation: None,
            entity_routes_pending: false,
            active: false,
            restore_installation,
            restoring: None,
            temporal_save_limits,
            history_edit_limits,
        })
    }
    /// A single-world application keeps its existing installed world work
    /// limit. Pending and accepted allocations must each fit that same limit.
    pub fn check_current_work(&self) -> Result<(), RuntimeError> {
        let allocation = self
            .session
            .accepted()
            .map_err(failure)?
            .state
            .work_allocation()
            .map_err(failure)?;
        crate::work::require_work(allocation, self.world_work_limit, false).map_err(failure)
    }

    pub fn fence(&self) -> Arc<CandidateFence> {
        self.session.fence()
    }
    /// Lend the immutable installed map for spatial preparation. Any derived
    /// structures kept by the provider have their own admission and revision.
    pub fn with_geometry<T>(
        &self,
        use_map: impl FnOnce(&crate::geometry::GeometryMap) -> T,
    ) -> Result<T, RuntimeError> {
        let accepted = self.session.accepted().map_err(failure)?;
        Ok(use_map(&accepted.state.installed.geometry))
    }

    /// Lend a finite current clock/header cut, excluding any tentative or
    /// rolled-back world. A capture can retain scalar values independently.
    pub fn accepted_progress(&self) -> Result<RuntimeProgress<'_>, RuntimeError> {
        let state = &self.session.accepted().map_err(session_failure)?.state;
        Ok(RuntimeProgress {
            world_id: &state.physical.header.id,
            generation: &state.generation,
            base_cut: state.accepted_cut,
            through_cut: state.accepted_cut,
            identity_through: state.physical.identity.next_id(),
            at: state.physical.header.sim_time,
            sequence: state.physical.header.sequence,
            paused: state.physical.header.paused,
        })
    }

    pub fn installation(&self) -> Result<RuntimeJson, RuntimeError> {
        RuntimeJson::encode(
            &self.session.current_installation().map_err(failure)?,
            &self.budget,
        )
    }
    /// Immutable authored setup can be prepared before SQL adoption. It never
    /// supplies an actor, current clock, private account or write capability.
    pub fn definitions(&self) -> Result<RuntimeJson, RuntimeError> {
        let simulation = self.session.accepted().map_err(failure)?;
        let (json, custody) =
            crate::capture::write_installed_definitions(&simulation.state.installed, &self.budget)
                .map_err(failure)?;
        Ok(RuntimeJson {
            bytes: json.into_bytes(),
            custody,
            handoff: None,
        })
    }
    pub fn world_id(&self) -> Result<&str, RuntimeError> {
        Ok(&self
            .session
            .accepted()
            .map_err(failure)?
            .state
            .physical
            .header
            .id)
    }
    /// The existing SQL writer returns these facts only after adopting its
    /// actual current head. Installation alone never admits gameplay work.
    pub fn activate(&mut self, receipt: RuntimeActivation) -> Result<(), RuntimeError> {
        let state = &self.session.accepted().map_err(failure)?.state;
        if self.active
            || self.restore_installation
            || self.restoring.is_some()
            || receipt.world_id != state.physical.header.id
            || receipt.generation != state.generation
            || receipt.revision != state.durable_revision
            || receipt.accepted_cut != state.accepted_cut
        {
            return Err(failure(
                "native activation does not match its adopted SQL writer",
            ));
        }
        self.active = true;
        Ok(())
    }
    fn require_active(&self) -> Result<(), RuntimeError> {
        if self.active {
            Ok(())
        } else {
            Err(failure("native installation has no adopted writer"))
        }
    }
    pub fn begin_advance(
        &mut self,
        seconds: f64,
        maximum_intervals: usize,
        input: &[u8],
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let inputs = serde_json::from_slice(input).map_err(failure)?;
        self.begin_advance_direct(seconds, maximum_intervals, inputs)
    }

    /// Accept the already funded, finite app input snapshot. The same
    /// native movement checks still own its physical use.
    pub fn begin_advance_direct(
        &mut self,
        seconds: f64,
        maximum_intervals: usize,
        inputs: Vec<AdmittedWorldInput>,
    ) -> Result<CandidateKey, RuntimeError> {
        self.begin_advance_with_materials(seconds, maximum_intervals, inputs, Default::default())
    }

    /// Settle ordinary time until a tracked material requires its actual
    /// authority. A provided snapshot enables a protected offer.
    pub fn begin_authoritative_advance(
        &mut self,
        seconds: f64,
        maximum_intervals: usize,
        inputs: Vec<AdmittedWorldInput>,
        materials: Option<Arc<crate::construction_gather::MaterialGrants>>,
    ) -> Result<CandidateKey, RuntimeError> {
        let material_gather = crate::construction_gather::ConstructionGather::for_advance(materials);
        self.begin_advance_with_materials(seconds, maximum_intervals, inputs, material_gather)
    }

    fn begin_advance_with_materials(
        &mut self,
        seconds: f64,
        maximum_intervals: usize,
        inputs: Vec<AdmittedWorldInput>,
        material_gather: crate::construction_gather::ConstructionGather,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        self.navigation.prune_actions(
            &self.session.accepted().map_err(failure)?.state.physical,
            self.session.operational_generation(),
        );
        let (prepared, _transfer) = self.navigation.take(&self.budget)?;
        let (action_routes, _actions) = self.navigation.prepare_actions(&self.budget)?;
        self.session
            .begin_advance(seconds, maximum_intervals, prepared, &action_routes, inputs, material_gather)
            .map_err(session_failure)
    }
    pub fn begin_command(
        &mut self,
        input: &[u8],
        canonical: String,
        durable_receipt: bool,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let command = serde_json::from_slice(input).map_err(failure)?;
        self.session
            .begin_command(
                command,
                canonical,
                crate::commands::CommandOptions {
                    preview: false,
                    native_controller: false,
                    native_movement: None,
                    trade_evidence: None,
                    durable_receipt,
                },
            )
            .map_err(failure)
    }
    pub fn begin_command_preview(
        &mut self,
        input: &[u8],
        canonical: String,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let command = serde_json::from_slice(input).map_err(failure)?;
        self.session
            .begin_command_preview(command, canonical)
            .map_err(failure)
    }
    pub fn step(
        &mut self,
        key: CandidateKey,
        answer: Option<(&RuntimeProvider, RuntimeProviderInput)>,
    ) -> Result<RuntimeStep, RuntimeError> {
        let step = self.step_session(key, answer, true)?;
        Ok(match step {
            SessionStep::Continue => RuntimeStep::Continue,
            SessionStep::Question(question) => {
                RuntimeStep::Provider(self.prepare_provider(key, question)?)
            }
            SessionStep::Preview(preview) => {
                RuntimeStep::Preview(RuntimeJson::encode(preview.outcome(), &self.budget)?)
            }
            SessionStep::NpcCandidates(_)
            | SessionStep::NpcSources(_)
            | SessionStep::LearningBatch(_) => {
                return Err(failure(
                    "NPC read preparation requires its originating read",
                ));
            }
            SessionStep::Prepared(prepared) => {
                if self.restoring == Some(key) {
                    if let Err(error) = self.session.prepare_restore_adoption(key) {
                        self.session.cancel(key).map_err(failure)?;
                        return Err(failure(error));
                    }
                }
                let products = self.prepared_products(key)?;
                let output = (|| {
                    let handoff = RuntimeOutputHandoff::new(&self.budget)?;
                    let mut output = RuntimeJson::encode(&products, &self.budget)?;
                    output.handoff = Some(handoff.clone());
                    Ok::<_, RuntimeError>((output, handoff))
                })();
                let (output, handoff) = match output {
                    Ok(output) => output,
                    Err(error) => {
                        self.session.cancel(key).map_err(failure)?;
                        return Err(error);
                    }
                };
                self.prepared_output = Some(key);
                RuntimeStep::Prepared(RuntimePrepared {
                    prepared,
                    output: Some(output),
                    handoff,
                })
            }
        })
    }
    fn step_session(
        &mut self,
        key: CandidateKey,
        answer: Option<(&RuntimeProvider, RuntimeProviderInput)>,
        include_actor_cuts: bool,
    ) -> Result<SessionStep, RuntimeError> {
        if self.session.is_npc_candidates(key) || self.session.is_npc_sources(key) {
            return Err(failure("NPC discovery requires its originating read"));
        }
        let answer = provider_response(answer, &self.budget)?;
        // This is the installed story policy, not a bridge-selected world law.
        self.session
            .step_with_history_cuts(
                key,
                answer,
                crate::experience::HistorySettings {
                    policy_id: &self.history_policy_id,
                    policy_revision: self.history_policy_revision,
                },
                include_actor_cuts,
            )
            .map_err(session_failure)
    }

    /// Drive the same candidate as the addon's step. The output callback runs
    /// only on a completed result, before Ready, and borrows from the actual
    /// candidate. An allocation or application preparation error rolls back.
    pub fn step_direct<T>(
        &mut self,
        key: CandidateKey,
        answer: Option<(&RuntimeProvider, RuntimeProviderInput)>,
        stage: impl FnOnce(RuntimeDirectOutput<'_>, &ByteBudget) -> Result<T, RuntimeError>,
    ) -> Result<RuntimeDirectStep<T>, RuntimeError> {
        Ok(match self.step_session(key, answer, false)? {
            SessionStep::Continue => RuntimeDirectStep::Continue,
            SessionStep::Question(question) => {
                RuntimeDirectStep::Provider(self.prepare_provider(key, question)?)
            }
            SessionStep::Preview(preview) => RuntimeDirectStep::Preview(stage(
                RuntimeDirectOutput::Preview(preview.outcome()),
                &self.budget,
            )?),
            SessionStep::Prepared(prepared) => {
                if let Err(error) =
                    crate::work::require_work(prepared.allocation, self.world_work_limit, false)
                {
                    self.cancel(key)?;
                    return Err(failure(error));
                }
                if self.restoring == Some(key) {
                    if let Err(error) = self.session.prepare_restore_adoption(key) {
                        self.cancel(key)?;
                        return Err(failure(error));
                    }
                }
                let output = match self.prepared_products(key).and_then(|products| {
                    stage(RuntimeDirectOutput::Prepared(products), &self.budget)
                }) {
                    Ok(output) => output,
                    Err(error) => {
                        self.cancel(key)?;
                        return Err(error);
                    }
                };
                let protected_save = match self.session.pin_protected_prefix(key) {
                    Ok(prefix) => prefix.map(|prefix| RuntimeSave { prefix }),
                    Err(error) => {
                        self.cancel(key)?;
                        return Err(failure(error));
                    }
                };
                self.prepared_output = Some(key);
                RuntimeDirectStep::Prepared(RuntimeDirectPrepared {
                    prepared,
                    output,
                    protected_save,
                })
            }
            SessionStep::NpcCandidates(_)
            | SessionStep::NpcSources(_)
            | SessionStep::LearningBatch(_) => {
                return Err(failure(
                    "NPC read preparation requires its originating read",
                ));
            }
        })
    }

    fn prepared_products(
        &self,
        key: CandidateKey,
    ) -> Result<RuntimePreparedProducts<'_>, RuntimeError> {
        let (
            operation,
            history,
            notices,
            records,
            personal_predecessors,
            temporal_predecessors,
            source_versions,
            protected_save,
            progress,
            state,
        ) = self.session.prepared_products(key).map_err(failure)?;
        let restore = self.session.prepared_restore_facts(key).map_err(failure)?;
        let consolidation_recall = match operation {
            CompletedOperation::Consolidation(done) if done.protected => {
                Some(RuntimeRecallDecoder::for_state(state, &self.budget)?)
            }
            _ => None,
        };
        Ok(RuntimePreparedProducts {
            operation,
            history,
            notices,
            records,
            personal_predecessors,
            temporal_predecessors,
            source_versions,
            protected_save,
            progress,
            restore,
            consolidation_recall,
            material_acquisitions: self.session.prepared_material_acquisitions(key).map_err(failure)?,
            state,
        })
    }
    /// Requires the genuine fence result, never an acceptance boolean supplied
    /// to the mutable world. All output bytes were admitted before Ready.
    pub fn finish_settlement(&mut self, key: CandidateKey) -> Result<bool, RuntimeError> {
        if self.restoring == Some(key)
            && self.session.fence().phase() != crate::host::CandidatePhase::Rejected
        {
            return Err(failure("whole-install commit requires restored activation"));
        }
        if self
            .prepared_output
            .as_ref()
            .is_none_or(|prepared| *prepared != key)
        {
            return Err(failure(FenceError::NotReady));
        }
        if let Some(watches) = &self.consolidation_watches
            && watches.active()
            && self.session.fence().phase() == crate::host::CandidatePhase::Accepted
        {
            // The fence is already irrevocably accepted. Read the exact
            // changes while the prepared owner still has them, before the
            // save acknowledgement can discard the accepted prefix.
            let (_, _, _, changes, ..) = self.session.prepared_products(key).map_err(failure)?;
            watches.observe(changes);
        }
        let accepted = self.session.finish_settlement(key).map_err(failure)?;
        self.finish_response_continuation(key, accepted.is_some());
        self.prepared_output = None;
        if self.restoring == Some(key) {
            self.restoring = None;
        }
        let accepted = match accepted {
            Some(accepted) => {
                if let CompletedOperation::Advance(advance) = accepted.result {
                    self.entity_routes_pending = advance.entity_routes_pending;
                    self.pending_navigation = Some(advance.into_navigation());
                }
                true
            }
            None => false,
        };
        Ok(accepted)
    }
    pub fn cancel(&mut self, key: CandidateKey) -> Result<(), RuntimeError> {
        // Terminal cursor errors already roll back through Session. Repeated
        // cleanup may observe that exact completed binding; it must neither
        // mask the original failure nor roll back an accepted operation.
        if self
            .session
            .fence()
            .validate_phase(key, crate::host::CandidatePhase::Idle)
            .is_ok()
        {
            self.finish_response_continuation(key, false);
            self.prepared_output = None;
            if self.restoring == Some(key) {
                self.restoring = None;
            }
            return Ok(());
        }
        self.session.cancel(key).map_err(failure)?;
        self.finish_response_continuation(key, false);
        self.prepared_output = None;
        if self.restoring == Some(key) {
            self.restoring = None;
        }
        Ok(())
    }
    pub fn save_barrier_complete(&self) -> bool {
        self.session.save_barrier_complete()
    }
    pub fn capture_save(&mut self) -> Result<RuntimeSave, RuntimeError> {
        self.session
            .capture_save()
            .map(|prefix| RuntimeSave { prefix })
            .map_err(failure)
    }
    pub fn acknowledge(&mut self, ack: RuntimeSaveAcknowledgement) -> Result<(), RuntimeError> {
        self.session
            .acknowledge(crate::records::save::SaveAcknowledgement {
                world_id: &ack.world_id,
                generation: &ack.generation,
                prefix: ack.prefix,
                base_revision: ack.base_revision,
                revision: ack.revision,
                through_cut: ack.through_cut,
                identity_through: ack.identity_through,
            })
            .map_err(failure)
    }
    pub fn finish_stop(&self) -> Result<(), RuntimeError> {
        self.session.finish_stop().map_err(failure)
    }
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RuntimeActivation {
    pub world_id: String,
    pub generation: String,
    pub revision: u64,
    pub accepted_cut: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RuntimeStorageSettings {
    temporal_resident_bytes: usize,
    temporal_save: RuntimeTemporalSaveSettings,
    pending_save_bytes: usize,
    history_edit: crate::experience::HistoryEditLimits,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RuntimeTemporalSaveSettings {
    target_bytes: usize,
    row_bytes: usize,
}
#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RuntimeSaveAcknowledgement {
    pub world_id: String,
    pub generation: String,
    pub prefix: u64,
    pub base_revision: u64,
    pub revision: u64,
    pub through_cut: u64,
    pub identity_through: u64,
}
pub struct RuntimeSave {
    prefix: Arc<crate::records::save::SavePrefix>,
}
impl RuntimeSave {
    pub fn json(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        RuntimeJson::encode(self.rows(), budget)
    }

    /// The immutable save handle owns these rows through write and ACK. A
    /// direct SQL writer binds their existing typed cells without re-encoding.
    pub fn rows(&self) -> &crate::records::SaveRows {
        self.prefix.rows()
    }

    /// Borrow exact archived-source transitions from the same detached prefix.
    /// Consecutive cuts may change the same version. The writer composes them
    /// before applying the original durable predecessor in one transaction.
    pub fn source_versions_newest_first(
        &self,
    ) -> impl Iterator<Item = crate::received::SourceVersionArchiveChange<'_>> {
        self.prefix.source_versions_newest_first()
    }
}

pub enum RuntimeDirectOutput<'a> {
    Preview(&'a crate::commands::Outcome),
    Prepared(RuntimePreparedProducts<'a>),
}

/// Borrowed data at the exact candidate cut. This neither changes gameplay
/// nor grants disclosure to an external recipient.
pub struct RuntimePreparedProducts<'a> {
    operation: &'a CompletedOperation,
    history: &'a crate::experience::CapturedHistoryInput,
    notices: &'a crate::cognition::PreparedSemanticNotices,
    records: &'a crate::records::ChangedRows,
    personal_predecessors: &'a crate::experience::PersonalPredecessors,
    temporal_predecessors: &'a crate::received::TemporalPredecessors,
    source_versions: &'a crate::received::SourceVersionPlan,
    protected_save: Option<&'a crate::records::SaveRows>,
    progress: crate::simulation::session::PreparedReadProgress<'a>,
    restore: Option<crate::simulation::session::PreparedRestoreFacts<'a>>,
    consolidation_recall: Option<RuntimeRecallDecoder<'a>>,
    material_acquisitions: &'a [Arc<crate::construction_gather::ConstructionEffect>],
    state: &'a crate::simulation::SimulationState,
}
impl RuntimePreparedProducts<'_> {
    pub fn outcome(&self) -> &crate::commands::Outcome {
        self.operation.outcome()
    }

    pub fn strike_review(&self) -> Option<&StrikeReviewOffer> {
        match self.operation {
            CompletedOperation::Command(command) => command.command.strike_review(),
            _ => None,
        }
    }

    pub fn events(&self) -> impl Iterator<Item = &crate::events::WorldEvent> + Clone {
        self.operation.events()
    }

    pub fn changes(&self) -> &crate::records::ChangedRows {
        self.records
    }

    pub fn protected_save(&self) -> Option<&crate::records::SaveRows> {
        self.protected_save
    }

    /// Borrow the exact lot facts while this private candidate still owns them.
    pub fn material_acquisitions(&self) -> &[Arc<crate::construction_gather::ConstructionEffect>] {
        self.material_acquisitions
    }

    /// The exact protected consolidation actor and its installed recall law.
    pub fn consolidation_recall(&self) -> Option<(&str, &[String], &RuntimeRecallDecoder<'_>)> {
        let CompletedOperation::Consolidation(done) = self.operation else {
            return None;
        };
        self.consolidation_recall
            .as_ref()
            .map(|law| (done.actor.as_str(), done.retired.as_slice(), law))
    }

    pub fn progress(&self) -> &RuntimeProgress<'_> {
        &self.progress
    }

    pub fn has_deferred_navigation(&self) -> bool {
        matches!(self.operation, CompletedOperation::Advance(advance) if advance.entity_routes_pending || !advance.navigation.is_empty())
    }
}

impl Serialize for RuntimePreparedProducts<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let history = self.history.serialized_value().ok_or_else(|| {
            serde::ser::Error::custom("serialized history requires a complete actor cut")
        })?;
        let mut map = serializer.serialize_map(None)?;
        map.serialize_entry("outcome", self.operation.outcome())?;
        map.serialize_entry("events", &Events(self.operation))?;
        map.serialize_entry("history", &history)?;
        map.serialize_entry("notices", self.notices)?;
        if let Some(restore) = &self.restore {
            map.serialize_entry("restore", restore)?;
            if let CompletedOperation::Restore(operation) = self.operation {
                map.serialize_entry("restoreMetadata", &operation.metadata)?;
            }
        } else {
            map.serialize_entry("records", self.records)?;
        }
        map.serialize_entry("personalPredecessors", &self.personal_predecessors.value())?;
        map.serialize_entry("temporalPredecessors", &self.temporal_predecessors.value())?;
        map.serialize_entry("sourceVersions", self.source_versions)?;
        if let Some(prefix) = self.protected_save.filter(|_| self.restore.is_none()) {
            map.serialize_entry("protectedSave", prefix)?;
        }
        map.serialize_entry("progress", &self.progress)?;
        privacy::serialize(self.operation, &mut map)?;
        map.end()
    }
}
struct Events<'a>(&'a CompletedOperation);
impl Serialize for Events<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut sequence = serializer.serialize_seq(None)?;
        for event in self.0.events() {
            sequence.serialize_element(event)?;
        }
        sequence.end()
    }
}
