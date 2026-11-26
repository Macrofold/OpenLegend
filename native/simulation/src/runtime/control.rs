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
    pub maintenance: bool,
    pub maintenance_revision: u64,
}

impl NativeWorldSession {
    /// Read saved controls and time from the same accepted world. This does
    /// not prepare a view or expose any actor.
    pub fn clock(&self) -> Result<RuntimeClock, RuntimeError> {
        self.session.clock().map_err(session_failure)
    }

    /// Captured application work retains this host epoch independently of
    /// ordinary gameplay writes and the saved recovery generation.
    pub fn work_generation(&self) -> u64 {
        self.session.operational_generation()
    }

    /// Safe at the actual send/effect boundary under the accepted world turn.
    pub fn work_is_current(&self, generation: u64) -> bool {
        !self.session.operator_maintenance_active() && self.work_generation() == generation
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

    /// Operational maintenance uses the ordinary protected native clock.
    /// Its revision invalidates captured public controls and work across a hold.
    pub fn begin_operator_maintenance(
        &mut self,
        paused: bool,
        speed: f64,
        manually_paused: bool,
        maintenance: bool,
        revision: u64,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        self.session
            .begin_operator_maintenance(paused, speed, manually_paused, maintenance, revision)
            .map_err(failure)
    }

    /// Install the trusted application owner's exact art choice under the
    /// same protected cut as other host settings. Gameplay is untouched.
    pub fn begin_presentation_release(
        &mut self,
        reference: Box<serde_json::value::RawValue>,
        expected_revision: u64,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        self.session
            .begin_presentation_release(reference, expected_revision)
            .map_err(failure)
    }
}
