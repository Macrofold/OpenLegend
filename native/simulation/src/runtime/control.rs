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

#[derive(Debug, Clone, Copy)]
pub struct RuntimeClock {
    pub at: f64,
    pub paused: bool,
    pub manually_paused: bool,
    pub speed: f64,
    pub exit_exposure_active: bool,
}

impl NativeWorldSession {
    /// Read saved controls and time from the same accepted world. This does
    /// not prepare a view or expose any actor.
    pub fn clock(&self) -> Result<RuntimeClock, RuntimeError> {
        self.session.clock().map_err(failure)
    }

    pub fn begin_control(&mut self, input: &[u8]) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let input: ControlInput = serde_json::from_slice(input).map_err(failure)?;
        self.begin_control_direct(input.paused, input.speed, input.manually_paused)
    }

    /// The application has already selected and authorized these settings.
    /// The simulation still validates and journals them.
    pub fn begin_control_direct(
        &mut self,
        paused: bool,
        speed: f64,
        manually_paused: bool,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        self.session
            .begin_control(paused, speed, manually_paused)
            .map_err(failure)
    }
}
