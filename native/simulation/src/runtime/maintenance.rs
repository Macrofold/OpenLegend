//! Bounded actor IDs come from the host's actual due-header index. The semantic
//! owner checks current due state again under its ordinary native checkpoint.
use super::*;
mod consolidation;
mod reflection;
pub use consolidation::{RuntimeConsolidationDream, RuntimeConsolidationTicket};
pub use reflection::RuntimeReflectionTicket;
pub struct RuntimeMaintenanceRead {
    pub(crate) read: Arc<crate::capture::maintenance::MaintenanceCapture>,
}
pub struct RuntimeMaintenancePublication {
    _lease: crate::host::PublicationLease,
    fence: Arc<CandidateFence>,
    _storage: ByteReservation,
}
impl RuntimeMaintenancePublication {
    pub fn is_current(&self) -> bool {
        self.fence.phase() == crate::host::CandidatePhase::Publishing
            && !self.fence.stop_requested()
    }
}
impl RuntimeMaintenanceRead {
    pub fn packet(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        let raw: &serde_json::value::RawValue =
            serde_json::from_str(self.read.packet()).map_err(failure)?;
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
        read.read
            .inputs_current(
                &self.session.publication_read().map_err(failure)?.state,
                &self.budget,
            )
            .map_err(failure)
    }
    pub fn read_maintenance(&self, input: &[u8]) -> Result<RuntimeMaintenanceRead, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let request = serde_json::from_slice(input).map_err(failure)?;
        let read = crate::capture::maintenance::MaintenanceCapture::capture(
            &self.session.accepted().map_err(failure)?.state,
            request,
            &self.budget,
        )
        .map_err(failure)?;
        Ok(RuntimeMaintenanceRead {
            read: Arc::new(read),
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
