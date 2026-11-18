//! Presence/control authority remains at the application boundary. This owner
//! admits only the finite domain participation request into its private writer.
use super::*;

pub enum RuntimeParticipation {
    Return,
    BeginExit(String),
    Depart(String),
    ReconcileExit(String),
}

impl NativeWorldSession {
    pub fn begin_participation(&mut self, input: &[u8]) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let request: crate::participation::ParticipationRequest =
            serde_json::from_slice(input).map_err(failure)?;
        self.session.begin_participation(request).map_err(failure)
    }

    /// Check the saved player binding and current participation under the
    /// writer that will apply the selected transition.
    pub fn begin_participation_direct(
        &mut self,
        account: &str,
        actor: String,
        operation: RuntimeParticipation,
    ) -> Result<CandidateKey, RuntimeError> {
        use crate::participation::{ParticipationOperation, ParticipationRequest};
        self.require_active()?;
        let current = self.session.accepted().map_err(failure)?;
        current.player_input(account, &actor).map_err(failure)?;
        let expected_revision = current
            .state
            .physical
            .entities
            .get(&actor)
            .and_then(|body| body.actor.as_ref())
            .and_then(|actor| actor.participation.as_ref())
            .map_or(0, |participation| participation.revision);
        let operation = match operation {
            RuntimeParticipation::Return => ParticipationOperation::Return,
            RuntimeParticipation::BeginExit(attempt_id) => {
                ParticipationOperation::BeginExit { attempt_id }
            }
            RuntimeParticipation::Depart(attempt_id) => {
                ParticipationOperation::Depart { attempt_id }
            }
            RuntimeParticipation::ReconcileExit(attempt_id) => {
                ParticipationOperation::ReconcileExit { attempt_id }
            }
        };
        self.session
            .begin_participation(ParticipationRequest {
                actor_id: actor,
                expected_revision,
                operation,
            })
            .map_err(failure)
    }
}
