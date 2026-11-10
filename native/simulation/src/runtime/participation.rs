//! Presence/control authority remains at the application boundary. This owner
//! admits only the finite domain participation request into its private writer.
use super::*;
impl NativeWorldSession {
    pub fn begin_participation(&mut self, input: &[u8]) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let request: crate::participation::ParticipationRequest =
            serde_json::from_slice(input).map_err(failure)?;
        self.session.begin_participation(request).map_err(failure)
    }
}
