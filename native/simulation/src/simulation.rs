//! Concrete native owner composition. The constructor remains inside the
//! installer until every required family, current record and real consumer is
//! connected; constructing individual records is not admission of a world.

use crate::activity::ActivityState;
use crate::events::OccurrenceHistory;
use crate::experience::ExperienceState;
use crate::geometry::GeometryMap;
use crate::host::CandidateFence;
use crate::identity::IdentityState;
use crate::install::VerifiedDefinition;
use crate::movement::BodyIndex;
use crate::native_response::NativeResponseProfile;
use crate::received::TemporalState;
use crate::reception::{AcousticPolicy, ReceptionState, SenseDefinition};
use crate::state::{EntityStore, WorldHeader};
use crate::status::{AttributeDefinition, StatusCapabilities, StatusEffectPolicy};
use crate::values::NativeValueWindow;
use crate::work::{InstalledWorkPolicy, WorkBook};
use indexmap::IndexMap;
use std::sync::Arc;
mod read;
pub(crate) use read::{AcceptedActorRead, ActorReadError};
mod save;
pub(crate) use save::{encode_candidate_changes, encode_root_changes};
mod publication;
pub(crate) use publication::{PreparedPublication, PublicationError};
mod driver;
mod session;
pub(crate) use driver::{
    CompletedOperation, DriveError, DriveStep, OperationDriver, ProviderKind, ProviderQuestion,
    ProviderResponse,
};
pub(crate) use session::{Session, SessionError, SessionStep};

/// Immutable selected definitions. Their exact source canonical bodies remain
/// with their typed meanings; a digest is never used as content equality.
/// Additional selected-law owners must join this composition before install.
pub(crate) struct InstalledWorld {
    pub encounter_batch_entries: usize,
    pub manifest: crate::install::AuthoredManifest,
    pub retained: crate::install::RetainedDefinitions,
    pub schema: Arc<crate::records::RecordSchema>,
    pub content: crate::install::InstalledContent,
    pub attributes: IndexMap<String, VerifiedDefinition<AttributeDefinition>>,
    pub senses: IndexMap<String, VerifiedDefinition<SenseDefinition>>,
    pub default_senses: Vec<String>,
    pub acoustics: VerifiedDefinition<AcousticPolicy>,
    pub response_profiles: IndexMap<String, VerifiedDefinition<NativeResponseProfile>>,
    pub status_policy: StatusEffectPolicy,
    pub capabilities: StatusCapabilities,
    pub status_policy_canonical: Arc<str>,
    pub status_work: IndexMap<String, crate::status::CompiledStatusWork>,
    pub population_work: crate::status::StatusInstallationWork,
    pub status_rosters: crate::status::StatusRosters,
    pub geometry: Arc<GeometryMap>,
    pub work_policy: Arc<InstalledWorkPolicy>,
    pub event_disclosure: VerifiedDefinition<crate::worlds::InstalledEventDisclosure>,
    pub attention: VerifiedDefinition<crate::attention::AttentionPolicy>,
    pub cognition: Arc<crate::experience::CognitionPolicy>,
    pub prepared_responses: VerifiedDefinition<crate::experience::PreparedResponseProfile>,
    pub name_rules: VerifiedDefinition<crate::worlds::InstalledPersonalNameRules>,
    pub recognition: VerifiedDefinition<crate::worlds::InstalledRecognitionPolicy>,
    pub social: crate::install::SocialSettings,
    pub speech_action: VerifiedDefinition<crate::worlds::InstalledSpeechAction>,
    pub ordinary_actions: VerifiedDefinition<crate::worlds::InstalledOrdinaryActionRules>,
    pub promises: VerifiedDefinition<crate::worlds::InstalledPromiseRules>,
    pub event_appraisal_rules: VerifiedDefinition<crate::worlds::InstalledEventAppraisalRules>,
    pub observation_rules: VerifiedDefinition<crate::worlds::InstalledObservationRules>,
    pub account_rules: VerifiedDefinition<crate::worlds::InstalledAccountRules>,
    pub occurrence_rules: VerifiedDefinition<crate::worlds::InstalledOccurrenceRules>,
    pub detection_support: VerifiedDefinition<crate::reception::DetectionSupportPolicy>,
    pub maximum_change_scopes: usize,
    pub movement: crate::worlds::InstalledMovementPolicy,
    pub time_rules: crate::worlds::InstalledTimeRules,
    pub body_policy: Option<VerifiedDefinition<crate::body::BodyPolicy>>,
    pub spatial: crate::install::SpatialSettings,
    pub movement_settings: crate::install::MovementSettings,
    pub time_epsilon: f64,
    pub response_settings: crate::install::ResponseSettings,
    pub personal_evidence_preparation: crate::install::PersonalEvidencePreparationSettings,
    pub mind_limits: crate::cognition::MindLimits,
    pub agency_limits: crate::plans::AgencyLimits,
    pub actor_response_limits: crate::response::ResponseLimits,
}
impl InstalledWorld {
    pub(crate) fn movement_speed(
        &self,
        entity: &crate::state::Entity,
    ) -> Result<f64, crate::execution::ExecutionError> {
        self.movement.speed(
            entity,
            &self.response_profiles,
            crate::body::scar_factor(
                self.body_policy.as_ref().map(VerifiedDefinition::value),
                entity,
                crate::body::ScarEffect::Movement,
            ),
        )
    }
    pub(crate) fn account_law(&self) -> crate::worlds::InstalledAccountLaw<'_> {
        crate::worlds::InstalledAccountLaw::new(self.account_rules.value(), &self.cognition)
    }
    pub(crate) fn status_read<'a>(
        &'a self,
        physical: &'a PhysicalState,
    ) -> crate::status::StatusRead<'a> {
        crate::status::StatusRead {
            entities: &physical.entities,
            attributes: &self.attributes,
            window: physical.pending_values.as_ref(),
            policy: &self.status_policy,
            sim_time: physical.header.sim_time,
        }
    }
}

/// All physical and arithmetic mutation targets, once. This owner does not
/// derive Clone and does not expose a bridge-visible writable-world getter.
pub(crate) struct PhysicalState {
    pub coaching: crate::install::ClosedCoachingState,
    pub actor_only_families: crate::install::ActorOnlyPhysicalFamilies,
    pub header: WorldHeader,
    pub identity: IdentityState,
    pub entities: EntityStore,
    pub bodies: BodyIndex,
    pub pending_values: Option<NativeValueWindow>,
    pub work: WorkBook,
}

/// Receiver and history owners retain their independent chronology/privacy
/// metadata. They are not reconstructed from a physical snapshot for reads.
pub(crate) struct SimulationState {
    pub records: crate::records::RecordLedger,
    pub generation: String,
    pub accepted_cut: u64,
    pub durable_revision: u64,
    pub installed: Arc<InstalledWorld>,
    pub physical: PhysicalState,
    pub reception: ReceptionState,
    pub experience: ExperienceState,
    pub temporal: TemporalState,
    pub occurrences: OccurrenceHistory,
    pub activity: ActivityState,
    pub commands: crate::commands::CommandState,
    pub responses: crate::response::ResponseState,
    pub minds: crate::cognition::MindState,
    pub administration: crate::administration::AdministrationState,
    pub inventory: crate::install::ClosedInventory,
    pub learned_capabilities: crate::install::LearnedCapabilities,
    pub appraisals: crate::appraisals::AppraisalState,
}

impl SimulationState {
    /// The same live and installed commitments admitted by HostWork, without
    /// rebuilding a world or visiting every unchanged actor at acceptance.
    pub(crate) fn work_allocation(
        &self,
    ) -> Result<crate::values::WorkVector, crate::work::WorkError> {
        crate::work::add_work(
            crate::work::add_work(
                self.physical.work.allocations(),
                self.inventory.work_allocation(),
            )?,
            self.installed
                .population_work
                .live_allocation(self.physical.bodies.root_count())?,
        )
    }
}

/// The application owns its serialized admission lane. The fence is separate
/// from the writer-owned state so settlement never waits for a world lock.
/// No accepted constructor is exported while live family closure is pending.
pub(crate) struct Simulation {
    pub fence: Arc<CandidateFence>,
    pub state: SimulationState,
}
