//! Only finite host settings enter the serialized native writer. Application
//! authorization, presence and clock admission remain server responsibilities.
use super::*;
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ControlInput {
    paused: bool,
    speed: f64,
    manually_paused: bool,
}
impl NativeWorldSession {
    pub fn begin_control(&mut self, input: &[u8]) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let input: ControlInput = serde_json::from_slice(input).map_err(failure)?;
        self.session
            .begin_control(input.paused, input.speed, input.manually_paused)
            .map_err(failure)
    }
}
