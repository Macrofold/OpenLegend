//! Accepted-boundary reads borrow one native authority. Detached products retain
//! their genuine evidence/byte custody; there is no writable TypeScript world.
use super::{Simulation, SimulationState};
use crate::capture::{
    ActorReadPurpose, CapturedActorPerception, capture_actor_perception, write_actor_self,
};
use crate::execution::ExecutionError;
use crate::host::{ByteBudget, ByteReservation, CandidatePhase};

#[derive(Debug)]
pub(crate) enum ActorReadError {
    Busy,
    Denied,
    Capture(ExecutionError),
}
impl From<ExecutionError> for ActorReadError {
    fn from(error: ExecutionError) -> Self {
        Self::Capture(error)
    }
}
/// This native-only product is consumed by the server's permitted formatter.
/// Private source bindings stay in perception.evidence, alongside its values.
/// A player wire response must still use the scoped public projection owner.
pub(crate) struct AcceptedActorRead {
    pub accepted_cut: u64,
    pub purpose: ActorReadPurpose,
    own_json: String,
    appraisals_json: Option<String>,
    pub perception: CapturedActorPerception,
    _own_reservation: ByteReservation,
    _appraisals_reservation: Option<ByteReservation>,
}
impl AcceptedActorRead {
    pub(crate) fn own_json(&self) -> &str {
        &self.own_json
    }
    pub(crate) fn appraisals_json(&self) -> Option<&str> {
        self.appraisals_json.as_deref()
    }
}
impl Simulation {
    pub(crate) fn from_selected(
        installation: crate::install::SelectedInstallation,
    ) -> (Self, crate::administration::InstalledHostSettings) {
        let crate::install::SelectedInstallation {
            state,
            host_settings,
        } = installation;
        (
            Self {
                fence: std::sync::Arc::new(crate::host::CandidateFence::new()),
                state,
            },
            host_settings,
        )
    }
    /// The server additionally checks the live session/grant/control lease on
    /// request and publication. Saved actor ownership is an independent gate;
    /// knowing an actor ID or being its observer never grants its private self.
    pub(crate) fn read_player(
        &self,
        account_id: &str,
        actor_id: &str,
        budget: &ByteBudget,
    ) -> Result<AcceptedActorRead, ActorReadError> {
        self.require_accepted_read()?;
        if self
            .state
            .administration
            .authorship
            .player_account_ids
            .get(actor_id)
            .is_none_or(|owner| owner != account_id)
        {
            return Err(ActorReadError::Denied);
        }
        self.capture_actor(actor_id, ActorReadPurpose::PlayerView, &[], budget)
    }
    /// Only the native decision scheduler uses this entry. It is separate from
    /// account reads so a caller cannot select private NPC purpose on the wire.
    pub(crate) fn read_npc(
        &self,
        actor_id: &str,
        required_appraisals: &[crate::appraisals::AppraisalScope],
        budget: &ByteBudget,
    ) -> Result<AcceptedActorRead, ActorReadError> {
        self.require_accepted_read()?;
        if !self
            .state
            .physical
            .entities
            .get(actor_id)
            .is_some_and(|entity| {
                entity.has_memory()
                    && entity
                        .actor
                        .as_ref()
                        .is_some_and(|actor| actor.controller == "npc")
            })
        {
            return Err(ActorReadError::Denied);
        }
        self.capture_actor(
            actor_id,
            ActorReadPurpose::NpcDecision,
            required_appraisals,
            budget,
        )
    }
    fn require_accepted_read(&self) -> Result<(), ActorReadError> {
        if self.fence.phase() != CandidatePhase::Idle {
            return Err(ActorReadError::Busy);
        }
        Ok(())
    }
    fn capture_actor(
        &self,
        actor_id: &str,
        purpose: ActorReadPurpose,
        required_appraisals: &[crate::appraisals::AppraisalScope],
        budget: &ByteBudget,
    ) -> Result<AcceptedActorRead, ActorReadError> {
        // The writer's serialized lane owns this borrow. The fence alone never
        // makes tentative state readable; capture cannot overlap a mutable borrow.
        let state: &SimulationState = &self.state;
        let (own_json, reservation) = write_actor_self(state, actor_id, purpose, budget)?;
        let perception = capture_actor_perception(state, actor_id, purpose, budget)?;
        let appraisals = if matches!(purpose, ActorReadPurpose::NpcDecision) {
            Some(crate::appraisals::write_actor_appraisals(
                state,
                actor_id,
                required_appraisals,
                budget,
            )?)
        } else {
            None
        };
        let (appraisals_json, appraisals_reservation) = match appraisals {
            Some((value, guard)) => (Some(value), Some(guard)),
            None => (None, None),
        };
        Ok(AcceptedActorRead {
            accepted_cut: state.accepted_cut,
            purpose,
            own_json,
            appraisals_json,
            perception,
            _own_reservation: reservation,
            _appraisals_reservation: appraisals_reservation,
        })
    }
}
