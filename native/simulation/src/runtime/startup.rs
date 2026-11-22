//! A current-world reopen restores its paused startup boundary and reconciles
//! installed hot-event progression before disclosure. Creation is separate.
use super::*;
impl NativeWorldSession {
    /// Confirm the destination-approved controller exists in the exact inactive
    /// initial world. This validates a binding without creating a session or a lease.
    pub fn check_initial_player(&self, account: &str, actor: &str) -> Result<(), RuntimeError> {
        let simulation = self.session.accepted().map_err(failure)?;
        let entity = simulation.state.physical.entities.get(actor);
        if self.active
            || !simulation.state.physical.header.paused
            || !entity.is_some_and(|entity| {
                entity
                    .actor
                    .as_ref()
                    .is_some_and(|actor| actor.alive && actor.controller == "player")
            })
        {
            return Err(failure(
                "The creation route requires a paused initial world with its intended playable character",
            ));
        }
        simulation
            .require_player_owner(account, actor)
            .map_err(failure)
    }

    pub fn begin_startup(&mut self) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        self.session.begin_startup().map_err(failure)
    }
}
