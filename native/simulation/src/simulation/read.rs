//! Accepted-boundary reads borrow one native authority. Detached products retain
//! their genuine evidence/byte custody; there is no writable TypeScript world.
use super::{Simulation, SimulationState};
use crate::capture::{
    ActorReadPurpose, CapturedActorPerception, capture_actor_perception, write_actor_self,
};
use crate::execution::ExecutionError;
use crate::host::{ByteBudget, ByteReservation, CandidatePhase};
mod interaction;
pub(crate) use interaction::InteractionMode;

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
    pub(crate) native_validity: Option<crate::capture::DecisionValidityWitness>,
    pub accepted_cut: u64,
    pub purpose: ActorReadPurpose,
    own_json: String,
    appraisals: Option<crate::appraisals::CapturedActorAppraisals>,
    pub perception: CapturedActorPerception,
    _own_reservation: ByteReservation,
    actor_life: u64,
    actor_alive: bool,
    actor_participating: bool,
    self_body_lease: Option<String>,
    _self_body_reservation: Option<ByteReservation>,
}
impl AcceptedActorRead {
    pub(crate) fn appraisal_read(&self) -> Option<&crate::appraisals::CapturedActorAppraisals> {
        self.appraisals.as_ref()
    }
    pub(crate) fn own_json(&self) -> &str {
        &self.own_json
    }
    pub(crate) fn appraisals_json(&self) -> Option<&str> {
        self.appraisals
            .as_ref()
            .map(|appraisals| appraisals.json.as_str())
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
        self.require_player_read(account_id, actor_id)?;
        self.capture_actor(actor_id, ActorReadPurpose::PlayerView, &[], budget)
    }
    fn require_player_read(&self, account_id: &str, actor_id: &str) -> Result<(), ActorReadError> {
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
        Ok(())
    }
    /// Source inventory availability is evaluated after asynchronous view
    /// preparation. The application supplies its actual current pause/control
    /// facts; actor restrictions come from this accepted native authority.
    pub(crate) fn player_inventory_available(
        &self,
        account_id: &str,
        actor_id: &str,
        paused: bool,
        controlling: bool,
    ) -> Result<bool, ActorReadError> {
        self.require_player_read(account_id, actor_id)?;
        let Some(entity) = self.state.physical.entities.get(actor_id) else {
            return Ok(false);
        };
        let Some(actor) = entity.actor.as_ref() else {
            return Ok(false);
        };
        Ok(!paused
            && actor.alive
            && !actor.incapacitated
            && actor
                .participation
                .as_ref()
                .is_none_or(|state| state.phase != "inactive")
            && controlling
            && !self
                .state
                .installed
                .capabilities
                .capability_blocked(Some(entity), "actions")
                .map_err(|error| ActorReadError::Capture(error.into()))?)
    }
    pub(crate) fn read_player_events(
        &self,
        account_id: &str,
        actor_id: &str,
        event_window: usize,
        budget: &ByteBudget,
    ) -> Result<crate::experience::CapturedPlayerEvents, ActorReadError> {
        self.require_player_read(account_id, actor_id)?;
        crate::experience::capture_player_events(&self.state, actor_id, event_window, budget)
            .map_err(|error| ActorReadError::Capture(error.into()))
    }
    pub(crate) fn player_events_still_permitted(
        &self,
        account_id: &str,
        actor_id: &str,
        read: &crate::experience::CapturedPlayerEvents,
        selected_event_ids: &[String],
        budget: &ByteBudget,
    ) -> Result<bool, ActorReadError> {
        self.require_player_read(account_id, actor_id)?;
        read.still_permitted(&self.state, actor_id, selected_event_ids, budget)
            .map_err(|error| ActorReadError::Capture(error.into()))
    }
    /// Match the Source asynchronous view fence: unrelated accepted changes do
    /// not revoke an earlier view, but receiving-life/participation or one of
    /// its displayed current body leases may not disappear before publication.
    pub(crate) fn player_read_still_permitted(
        &self,
        account_id: &str,
        actor_id: &str,
        read: &AcceptedActorRead,
    ) -> Result<bool, ActorReadError> {
        self.require_player_read(account_id, actor_id)?;
        if !matches!(read.purpose, ActorReadPurpose::PlayerView)
            || read.perception.actor_id != actor_id
            || read.perception.world_id != self.state.physical.header.id
            || read.perception.evidence.generation() != self.state.generation
        {
            return Ok(false);
        }
        let Some(entity) = self.state.physical.entities.get(actor_id) else {
            return Ok(false);
        };
        let Some(actor) = entity.actor.as_ref() else {
            return Ok(false);
        };
        if actor.physical_life.unwrap_or(0) != read.actor_life
            || actor.alive != read.actor_alive
            || entity.actively_participates() != read.actor_participating
        {
            return Ok(false);
        }
        let scope = crate::reception::CurrentBodyReadScope::prepare(
            &self.state.reception,
            &self.state.physical.entities,
            &self.state.installed,
            &self.state.experience,
            &crate::worlds::InstalledEvidenceMeaning,
            actor_id,
        )
        .map_err(|error| ActorReadError::Capture(error.into()))?;
        if let Some(lease) = &read.self_body_lease {
            let current = scope
                .as_ref()
                .map(|scope| scope.native_body(actor_id))
                .transpose()
                .map_err(|error| ActorReadError::Capture(error.into()))?
                .flatten();
            if current.is_none_or(|body| body.field.id != *lease) {
                return Ok(false);
            }
        }
        for body in &read.perception.bodies {
            let Some(entity) = self.state.physical.entities.get(&body.source_id) else {
                return Ok(false);
            };
            let Some(current) = scope
                .as_ref()
                .map(|scope| scope.native_body(&body.source_id))
                .transpose()
                .map_err(|error| ActorReadError::Capture(error.into()))?
                .flatten()
            else {
                return Ok(false);
            };
            if current.field.id != body.lease_id
                || entity
                    .actor
                    .as_ref()
                    .and_then(|actor| actor.physical_life)
                    .unwrap_or(0)
                    != body.physical_life.unwrap_or(0)
            {
                return Ok(false);
            }
        }
        Ok(true)
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
        let entity = state
            .physical
            .entities
            .get(actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
        let (self_body_lease, self_body_reservation) =
            if matches!(purpose, ActorReadPurpose::PlayerView) {
                let scope = crate::reception::CurrentBodyReadScope::prepare(
                    &state.reception,
                    &state.physical.entities,
                    &state.installed,
                    &state.experience,
                    &crate::worlds::InstalledEvidenceMeaning,
                    actor_id,
                )
                .map_err(|error| ActorReadError::Capture(error.into()))?;
                let body = scope
                    .as_ref()
                    .map(|scope| scope.native_body(actor_id))
                    .transpose()
                    .map_err(|error| ActorReadError::Capture(error.into()))?
                    .flatten();
                if let Some(body) = body {
                    let guard = budget
                        .reserve(body.field.id.len())
                        .map_err(|error| ActorReadError::Capture(error.into()))?;
                    (Some(body.field.id.clone()), Some(guard))
                } else {
                    (None, None)
                }
            } else {
                (None, None)
            };
        let (own_json, reservation) = write_actor_self(state, actor_id, purpose, budget)?;
        let perception = capture_actor_perception(state, actor_id, purpose, budget)?;
        let appraisals = if matches!(purpose, ActorReadPurpose::NpcDecision) {
            Some(crate::appraisals::capture_actor_appraisals(
                state,
                actor_id,
                required_appraisals,
                budget,
            )?)
        } else {
            None
        };
        Ok(AcceptedActorRead {
            native_validity: if matches!(purpose, ActorReadPurpose::NpcDecision) {
                Some(crate::capture::DecisionValidityWitness::capture(
                    state,
                    actor_id,
                    required_appraisals,
                    budget,
                )?)
            } else {
                None
            },
            accepted_cut: state.accepted_cut,
            purpose,
            own_json,
            appraisals,
            perception,
            _own_reservation: reservation,
            actor_life: actor.physical_life.unwrap_or(0),
            actor_alive: actor.alive,
            actor_participating: entity.actively_participates(),
            self_body_lease,
            _self_body_reservation: self_body_reservation,
        })
    }
}
