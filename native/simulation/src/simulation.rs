//! Concrete native owner composition. The constructor remains inside the
//! installer until every required family, current record and real consumer is
//! connected; constructing individual records is not admission of a world.

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

/// Immutable selected definitions. Their exact source canonical bodies remain
/// with their typed meanings; a digest is never used as content equality.
/// Additional selected-law owners must join this composition before install.
pub(crate) struct InstalledWorld {
    pub attributes: IndexMap<String, VerifiedDefinition<AttributeDefinition>>,
    pub senses: IndexMap<String, VerifiedDefinition<SenseDefinition>>,
    pub default_senses: Vec<String>,
    pub acoustics: VerifiedDefinition<AcousticPolicy>,
    pub response_profiles: IndexMap<String, VerifiedDefinition<NativeResponseProfile>>,
    pub status_policy: StatusEffectPolicy,
    pub capabilities: StatusCapabilities,
    pub status_policy_canonical: Arc<str>,
    pub geometry: Arc<GeometryMap>,
    pub work_policy: Arc<InstalledWorkPolicy>,
    pub event_disclosure: VerifiedDefinition<crate::worlds::InstalledEventDisclosure>,
}
impl InstalledWorld {
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
    pub generation: String,
    pub accepted_cut: u64,
    pub durable_revision: u64,
    pub installed: Arc<InstalledWorld>,
    pub physical: PhysicalState,
    pub reception: ReceptionState,
    pub experience: ExperienceState,
    pub temporal: TemporalState,
    pub occurrences: OccurrenceHistory,
}

/// The application owns its serialized admission lane. The fence is separate
/// from the writer-owned state so settlement never waits for a world lock.
/// No accepted constructor is exported while live family closure is pending.
pub(crate) struct Simulation {
    pub fence: Arc<CandidateFence>,
    pub state: SimulationState,
}
