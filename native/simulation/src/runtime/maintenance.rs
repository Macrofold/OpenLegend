//! Bounded actor IDs come from the host's actual due-header index. The semantic
//! owner checks current due state again under its ordinary native checkpoint.
use super::*;
mod consolidation;
mod index;
mod reflection;
pub(super) mod witness;
pub use consolidation::{
    RuntimeConsolidationBinding, RuntimeConsolidationDream, RuntimeConsolidationGroup,
    RuntimeConsolidationReading, RuntimeConsolidationReadings, RuntimeConsolidationTicket,
    RuntimePreparedDream,
};
pub use index::RuntimeMemoryIndex;
pub use reflection::{
    RuntimeReflectionBinding, RuntimeReflectionEvidenceAlias, RuntimeReflectionFile,
    RuntimeReflectionFiles, RuntimeReflectionOpportunity, RuntimeReflectionTicket,
};
pub struct RuntimeMaintenanceRead {
    pub(crate) read: Arc<crate::capture::maintenance::MaintenanceCapture>,
    host_generation: u64,
}
pub struct RuntimeDreamReview {
    pub world_id: String,
    pub generation: String,
    pub accepted_cut: u64,
    pub at: f64,
    pub ready_at: f64,
    pub available: bool,
    pub episode: String,
    _storage: ByteReservation,
}
pub struct RuntimeHourlyReview {
    pub world_id: String,
    pub generation: String,
    pub accepted_cut: u64,
    pub at: f64,
    pub available: bool,
    _storage: ByteReservation,
}
pub struct RuntimeMaintenancePublication {
    _lease: crate::host::PublicationLease,
    fence: Arc<CandidateFence>,
    _storage: ByteReservation,
}
impl RuntimeMaintenancePublication {
    pub(super) fn admit(
        fence: Arc<CandidateFence>,
        storage: ByteReservation,
    ) -> Result<Self, RuntimeError> {
        let lease = fence.begin_publication().map_err(failure)?;
        Ok(Self { _lease: lease, fence, _storage: storage })
    }

    pub fn is_current(&self) -> bool {
        self.fence.phase() == crate::host::CandidatePhase::Publishing
            && !self.fence.stop_requested()
    }
}
impl RuntimeMaintenanceRead {
    pub fn inner_revision(&self) -> Option<u64> {
        self.read.inner_revision
    }

    pub fn packet(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        let packet = self
            .read
            .packet()
            .ok_or_else(|| failure("maintenance has no bridge packet"))?;
        let raw: &serde_json::value::RawValue = serde_json::from_str(packet).map_err(failure)?;
        RuntimeJson::encode(raw, budget)
    }
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RecentInput {
    actor_ids: Vec<String>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SupportInput {
    actor_ids: Vec<String>,
    preparation: crate::received::SupportPreparation,
}

impl NativeWorldSession {
    /// Read the current actor and installed maintenance opportunity. The
    /// scheduler still needs an exact, separately admitted source selection.
    pub fn hourly_review(&self, actor: &str) -> Result<Option<RuntimeHourlyReview>, RuntimeError> {
        use crate::capture::maintenance::{MaintenancePurpose, available};

        self.require_active()?;
        let state = &self.session.accepted().map_err(failure)?.state;
        if state.physical.entities.get(actor).is_none_or(|entity| {
            !entity.has_memory()
                || entity.actor.as_ref().is_none_or(|body| {
                    !body.alive
                        || body.controller != "npc"
                        || body.capabilities.as_ref().is_some_and(|rules| !rules.inner_world)
                })
        }) {
            return Ok(None);
        }
        let world_id = &state.physical.header.id;
        let generation = &state.generation;
        let storage = self.budget.reserve(
            std::mem::size_of::<RuntimeHourlyReview>() + world_id.len() + generation.len(),
        )?;
        Ok(Some(RuntimeHourlyReview {
            world_id: world_id.clone(),
            generation: generation.clone(),
            accepted_cut: state.accepted_cut,
            at: state.physical.header.sim_time,
            available: !state.physical.header.paused
                && available(state, actor, MaintenancePurpose::Maintenance).map_err(failure)?,
            _storage: storage,
        }))
    }

    /// Read just the installed continuous sleep opportunity for one actor.
    /// Holds no personal history body or permission to spend on inference.
    pub fn dream_review(&self, actor: &str) -> Result<Option<RuntimeDreamReview>, RuntimeError> {
        use crate::capture::maintenance::{MaintenancePurpose, available, dream_status};

        self.require_active()?;
        let state = &self.session.accepted().map_err(failure)?.state;
        let Some((episode, elapsed, after)) = dream_status(state, actor) else {
            return Ok(None);
        };
        let world = &state.physical.header.id;
        let generation = &state.generation;
        let at = state.physical.header.sim_time;
        let ready_at = at + (after - elapsed).max(0.);
        let bytes = std::mem::size_of::<RuntimeDreamReview>()
            .checked_add(world.len())
            .and_then(|n| n.checked_add(generation.len()))
            .and_then(|n| n.checked_add(episode.len()))
            .ok_or_else(|| failure("capacity"))?;
        let storage = self.budget.reserve(bytes).map_err(failure)?;
        Ok(Some(RuntimeDreamReview {
            world_id: world.clone(),
            generation: generation.clone(),
            accepted_cut: state.accepted_cut,
            at,
            ready_at,
            available: !state.physical.header.paused
                && available(state, actor, MaintenancePurpose::Maintenance).map_err(failure)?,
            episode: episode.to_owned(),
            _storage: storage,
        }))
    }

    pub fn maintenance_population(&self) -> Result<RuntimeJson, RuntimeError> {
        self.require_active()?;
        RuntimeJson::encode(
            &crate::capture::maintenance::population(
                &self.session.accepted().map_err(failure)?.state,
            ),
            &self.budget,
        )
    }
    pub fn maintenance_pressure(&self, input: &[u8]) -> Result<RuntimeJson, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let thresholds = serde_json::from_slice(input).map_err(failure)?;
        let pressure = crate::capture::maintenance::resident_pressure(
            &self.session.accepted().map_err(failure)?.state,
            &thresholds,
        )
        .map_err(failure)?;
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Pressure {
            resident_pressure: bool,
        }
        RuntimeJson::encode(
            &Pressure {
                resident_pressure: pressure,
            },
            &self.budget,
        )
    }
    pub fn maintenance_inputs_current(
        &self,
        read: &RuntimeMaintenanceRead,
    ) -> Result<bool, RuntimeError> {
        self.require_active()?;
        if !self.work_is_current(read.host_generation) {
            return Ok(false);
        }
        read.read
            .inputs_current(
                &self.session.publication_read().map_err(failure)?.state,
                &self.budget,
            )
            .map_err(failure)
    }
    pub fn read_maintenance(&self, input: &[u8]) -> Result<RuntimeMaintenanceRead, RuntimeError> {
        let _decode = decode_preparation(input, &self.budget)?;
        let request = serde_json::from_slice(input).map_err(failure)?;
        self.require_active()?;
        let read = crate::capture::maintenance::MaintenanceCapture::capture(
            &self.session.accepted().map_err(failure)?.state,
            request,
            &self.budget,
        )
        .map_err(failure)?;
        Ok(RuntimeMaintenanceRead {
            read: Arc::new(read),
            host_generation: self.work_generation(),
        })
    }
    pub fn read_maintenance_direct(
        &self,
        actor_id: String,
    ) -> Result<RuntimeMaintenanceRead, RuntimeError> {
        self.require_active()?;
        let read = crate::capture::maintenance::MaintenanceCapture::capture_consolidation(
            &self.session.accepted().map_err(failure)?.state,
            actor_id,
            &self.budget,
        )
        .map_err(failure)?;
        Ok(RuntimeMaintenanceRead {
            read: Arc::new(read),
            host_generation: self.work_generation(),
        })
    }
    /// This method is deliberately synchronous and accepts the existing
    /// Publishing fence. Node calls it immediately before actual fetch start.
    pub fn maintenance_current(
        &self,
        read: &RuntimeMaintenanceRead,
        input: &[u8],
    ) -> Result<bool, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let admission = serde_json::from_slice(input).map_err(failure)?;
        if !self.work_is_current(read.host_generation) {
            return Ok(false);
        }
        read.read
            .current(
                &self.session.publication_read().map_err(failure)?.state,
                &admission,
            )
            .map_err(failure)
    }
    pub fn maintenance_files(
        &self,
        read: &RuntimeMaintenanceRead,
    ) -> Result<RuntimeJson, RuntimeError> {
        self.require_active()?;
        let (json, storage) = read
            .read
            .files(
                &self.session.accepted().map_err(failure)?.state,
                &self.budget,
            )
            .map_err(failure)?;
        Ok(RuntimeJson {
            bytes: json.into_bytes(),
            custody: storage,
            handoff: None,
        })
    }
    pub fn maintenance_raw_times(
        &self,
        read: &RuntimeMaintenanceRead,
    ) -> Result<RuntimeJson, RuntimeError> {
        self.require_active()?;
        if !read
            .read
            .scope_current(&self.session.accepted().map_err(failure)?.state)
        {
            return Err(failure("maintenance admission changed"));
        }
        let (json, storage) = crate::capture::maintenance::raw_times(
            &self.session.accepted().map_err(failure)?.state,
            &read.read.request.actor_id,
            &self.budget,
        )
        .map_err(failure)?;
        Ok(RuntimeJson {
            bytes: json.into_bytes(),
            custody: storage,
            handoff: None,
        })
    }
    pub fn maintenance_publication(
        &self,
        read: &RuntimeMaintenanceRead,
        input: &[u8],
    ) -> Result<Option<RuntimeMaintenancePublication>, RuntimeError> {
        self.session.accepted().map_err(failure)?;
        if !self.maintenance_current(read, input)? {
            return Ok(None);
        }
        let storage = self
            .budget
            .reserve(std::mem::size_of::<RuntimeMaintenancePublication>())
            .map_err(failure)?;
        let fence = self.session.fence();
        let lease = fence.begin_publication().map_err(failure)?;
        Ok(Some(RuntimeMaintenancePublication {
            _lease: lease,
            fence,
            _storage: storage,
        }))
    }
    pub fn begin_support_retention(&mut self, input: &[u8]) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let input: SupportInput = serde_json::from_slice(input).map_err(failure)?;
        self.session
            .begin_support_retention(input.actor_ids, input.preparation)
            .map_err(failure)
    }
    pub fn begin_knowledge_retention(
        &mut self,
        input: &[u8],
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let input: RecentInput = serde_json::from_slice(input).map_err(failure)?;
        self.session
            .begin_knowledge_retention(input.actor_ids)
            .map_err(failure)
    }
    pub fn begin_recent_retention(&mut self, input: &[u8]) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let input: RecentInput = serde_json::from_slice(input).map_err(failure)?;
        self.session
            .begin_recent_retention(input.actor_ids)
            .map_err(failure)
    }
}
