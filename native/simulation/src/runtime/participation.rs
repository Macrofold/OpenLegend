//! Presence/control authority remains at the application boundary. This owner
//! admits only the finite domain participation request into its private writer.
use super::*;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InvitationActor {
    pub actor_id: String,
    name: crate::text::JsText,
}

pub struct InvitationActors {
    pub actors: Vec<InvitationActor>,
    _custody: ByteReservation,
}

/// Owned after-startup roster of current human bodies that still need a
/// verified return or departure. It exposes only the saved bindings to the host.
pub struct RuntimeRestoredPlayers {
    pub players: Vec<(String, String)>,
    _custody: ByteReservation,
}

pub enum RuntimeParticipation {
    Return,
    BeginExit(String),
    Depart(String),
    ReconcileExit(String),
}

impl NativeWorldSession {
    /// Read the installed distinction between physical game-time exposure
    /// and application-owned elapsed departure. Only startup needs this fact.
    pub fn has_simulated_departure(&self) -> Result<bool, RuntimeError> {
        let current = self.session.accepted().map_err(failure)?;
        Ok(current
            .state
            .installed
            .retained
            .participation_read
            .as_ref()
            .and_then(|policy| policy.exit_exposure_seconds)
            .is_some())
    }

    pub fn restored_players(&self) -> Result<RuntimeRestoredPlayers, RuntimeError> {
        let current = self.session.accepted().map_err(failure)?;
        let players = || {
            let entities = &current.state.physical.entities;
            let owners = &current.state.administration.authorship.player_account_ids;
            entities.ordered_ids().filter_map(move |id| {
                let account = owners.get(id)?;
                let actor = entities.get(id)?.actor.as_ref()?;
                (actor.controller == "player"
                    && actor
                        .participation
                        .as_ref()
                        .is_none_or(|phase| phase.phase == "active"))
                .then_some((id, account))
            })
        };
        let (count, bytes) = players()
            .try_fold((0_usize, 0_usize), |(count, bytes), (actor, account)| {
                Some((
                    count.checked_add(1)?,
                    bytes
                        .checked_add(actor.len())?
                        .checked_add(account.len())?
                        .checked_add(std::mem::size_of::<(String, String)>())?,
                ))
            })
            .ok_or_else(|| failure("restored-player custody"))?;
        let custody = self.budget.reserve(bytes)?;
        let mut rows = Vec::new();
        rows.try_reserve_exact(count).map_err(failure)?;
        rows.extend(players().map(|(actor, account)| (actor.to_owned(), account.clone())));
        Ok(RuntimeRestoredPlayers {
            players: rows,
            _custody: custody,
        })
    }

    /// The operator roster needs only living unowned bodies and their names.
    /// This owned read keeps its allocation through the scoped SQL exclusion.
    pub fn invitation_actors(&self) -> Result<InvitationActors, RuntimeError> {
        self.require_active()?;
        let state = &self.session.accepted().map_err(failure)?.state;
        let eligible = || {
            state.physical.entities.ordered_ids().filter_map(|id| {
                crate::participation::invitable_actor(state, id).map(|entity| (id, entity))
            })
        };
        let (count, bytes) = eligible()
            .try_fold((0_usize, 0_usize), |(count, bytes), (id, entity)| {
                Some((
                    count.checked_add(1)?,
                    bytes
                        .checked_add(id.len())?
                        .checked_add(entity.name.storage_bytes())?,
                ))
            })
            .ok_or_else(|| failure("invitation roster capacity"))?;
        let custody = self.budget.reserve(
            bytes
                .checked_add(
                    count
                        .checked_mul(std::mem::size_of::<InvitationActor>())
                        .ok_or_else(|| failure("invitation roster capacity"))?,
                )
                .ok_or_else(|| failure("invitation roster capacity"))?,
        )?;
        let mut actors = Vec::new();
        actors.try_reserve_exact(count).map_err(failure)?;
        for (id, entity) in eligible() {
            actors.push(InvitationActor {
                actor_id: id.to_owned(),
                name: entity.name.clone(),
            });
        }
        Ok(InvitationActors {
            actors,
            _custody: custody,
        })
    }

    pub fn may_invite_actor(&self, id: &str) -> Result<bool, RuntimeError> {
        self.require_active()?;
        Ok(crate::participation::invitable_actor(
            &self.session.accepted().map_err(failure)?.state,
            id,
        )
        .is_some())
    }

    /// Only a protected Rust caller can bind a new account to a living,
    /// unowned actor and settle ordinary absence before its first entry.
    pub fn begin_invitation_enrollment(
        &mut self,
        actor: String,
        account: String,
        attempt: String,
    ) -> Result<CandidateKey, RuntimeError> {
        use crate::participation::{ParticipationOperation, ParticipationRequest, invitable_actor};
        self.require_active()?;
        let current = self.session.accepted().map_err(failure)?;
        let expected_revision = invitable_actor(&current.state, &actor)
            .and_then(|body| body.actor.as_ref())
            .and_then(|actor| actor.participation.as_ref())
            .map_or(0, |participation| participation.revision);
        self.session
            .begin_participation(ParticipationRequest {
                actor_id: actor,
                expected_revision,
                operation: ParticipationOperation::Enroll {
                    account_id: account,
                    attempt_id: attempt,
                },
            })
            .map_err(failure)
    }

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
