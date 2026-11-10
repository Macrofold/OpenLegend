//! The director can inspect a finite native wakeup cut. The opaque handle is
//! the freshness witness; restoring its JSON cannot acknowledge an inspection.
use super::*;
pub struct RuntimeNpcTrigger {
    read: crate::capture::npc_intake::NpcIntakeCapture,
}
impl RuntimeNpcTrigger {
    pub fn packet(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        let raw: &serde_json::value::RawValue =
            serde_json::from_str(self.read.json()).map_err(failure)?;
        RuntimeJson::encode(raw, budget)
    }
}
impl NativeWorldSession {
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
