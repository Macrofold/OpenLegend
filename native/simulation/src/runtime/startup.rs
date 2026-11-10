//! A current-world reopen restores its paused startup boundary and reconciles
//! installed hot-event progression before disclosure. Creation is separate.
use super::*;
impl NativeWorldSession {
    pub fn begin_startup(&mut self) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        self.session.begin_startup().map_err(failure)
    }
}
