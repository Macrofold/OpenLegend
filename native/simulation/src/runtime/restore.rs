//! Restoration alone can reconcile an inactive installation. Until a genuine
//! whole-install receipt is adopted, it cannot admit gameplay or private reads.
use super::*;
impl NativeWorldSession {
    pub fn begin_restore(&mut self, bytes: &[u8]) -> Result<CandidateKey, RuntimeError> {
        if self.active || !self.restore_installation || self.restoring.is_some() {
            return Err(failure("restore requires an unused inactive installation"));
        }
        let _decode = decode_preparation(bytes, &self.budget)?;
        let input: crate::simulation::restore::RestoreInput =
            serde_json::from_slice(bytes).map_err(failure)?;
        let key = self
            .session
            .begin_restore(input, self.history_edit_limits)
            .map_err(failure)?;
        self.restoring = Some(key);
        Ok(key)
    }
    pub fn activate_restored(
        &mut self,
        key: CandidateKey,
        receipt: RuntimeActivation,
    ) -> Result<(), RuntimeError> {
        if self.active || self.restoring != Some(key) || self.prepared_output != Some(key) {
            return Err(failure(
                "restored activation requires its actual prepared installation",
            ));
        }
        if self.session.fence().phase() != crate::host::CandidatePhase::Accepted {
            return Err(failure(
                "restored activation requires accepted whole-install settlement",
            ));
        }
        if !self
            .session
            .finish_restore(
                key,
                &receipt.world_id,
                &receipt.generation,
                receipt.revision,
                receipt.accepted_cut,
            )
            .map_err(failure)?
        {
            return Err(failure("restored installation was not accepted"));
        }
        self.prepared_output = None;
        self.restoring = None;
        self.active = true;
        Ok(())
    }
}
