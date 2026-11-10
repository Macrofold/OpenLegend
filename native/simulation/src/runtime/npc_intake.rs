//! The director can inspect a finite native wakeup cut. The opaque handle is
//! the freshness witness; restoring its JSON cannot acknowledge an inspection.
use super::*;
pub struct RuntimeNpcTrigger {
    read: crate::capture::npc_intake::NpcIntakeCapture,
}
pub struct RuntimeNpcInspection {
    _lease: crate::host::PublicationLease,
    fence: Arc<CandidateFence>,
    _storage: ByteReservation,
}
impl RuntimeNpcInspection {
    pub fn is_current(&self) -> bool {
        self.fence.phase() == crate::host::CandidatePhase::Publishing
            && !self.fence.stop_requested()
    }
}
impl RuntimeNpcTrigger {
    pub(crate) fn copy_semantic_causes_for(
        &self,
        world: &str,
        generation: &str,
        actor: &str,
        life: u64,
        budget: &ByteBudget,
    ) -> Result<(Vec<crate::response::ResponseSemanticCause>, ByteReservation), RuntimeError> {
        self.read
            .copy_semantic_causes_for(world, generation, actor, life, budget)
            .map_err(failure)
    }

    pub fn inputs(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        let raw: &serde_json::value::RawValue =
            serde_json::from_str(self.read.inputs_json()).map_err(failure)?;
        RuntimeJson::encode(raw, budget)
    }

    pub fn packet(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        let raw: &serde_json::value::RawValue =
            serde_json::from_str(self.read.json()).map_err(failure)?;
        RuntimeJson::encode(raw, budget)
    }
}
impl NativeWorldSession {
    /// The short gate spans only synchronous queue acknowledgement. It is
    /// released before schedule SQL, model dispatch or any other async work.
    pub fn inspect_npc_trigger(
        &self,
        trigger: &RuntimeNpcTrigger,
    ) -> Result<Option<RuntimeNpcInspection>, RuntimeError> {
        if !self.npc_trigger_current(trigger)? {
            return Ok(None);
        }
        let storage = self
            .budget
            .reserve(std::mem::size_of::<RuntimeNpcInspection>())
            .map_err(failure)?;
        let fence = self.session.fence();
        let lease = fence.begin_publication().map_err(failure)?;
        Ok(Some(RuntimeNpcInspection {
            _lease: lease,
            fence,
            _storage: storage,
        }))
    }
    pub fn read_npc_trigger(&self, input: &[u8]) -> Result<RuntimeNpcTrigger, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let request = serde_json::from_slice(input).map_err(failure)?;
        let state = &self.session.accepted().map_err(failure)?.state;
        let read =
            crate::capture::npc_intake::capture(state, request, &self.budget).map_err(failure)?;
        Ok(RuntimeNpcTrigger { read })
    }
    pub fn npc_trigger_current(&self, trigger: &RuntimeNpcTrigger) -> Result<bool, RuntimeError> {
        self.require_active()?;
        let state = &self.session.accepted().map_err(failure)?.state;
        trigger.read.current(state, &self.budget).map_err(failure)
    }
    pub fn begin_npc_intake(&mut self, input: &[u8]) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let request = serde_json::from_slice(input).map_err(failure)?;
        self.session.begin_npc_intake(request).map_err(failure)
    }
}
