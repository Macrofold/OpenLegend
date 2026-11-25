//! Enter through a verified identity. A player claim uses the same protected
//! world save as embodiment; the invitation is consumed inside that save.

use super::{AccessRoutes, IdentityMode, access_failure, redirect, start_oidc};
use crate::{
    authority::{
        AccessError, Authority,
        invites::{Claim, ClaimOutcome, EnrollmentProjection, InviteError, Role, invite_hash},
    },
    boot::CurrentServer,
    live_save::{LiveSaves, ProtectedGameplaySave},
    oidc::LoginCompletion,
    store::{CommitError, StoreError},
    world::{ProtectedCommit, WorldError},
};
use axum::{
    extract::{Query, State},
    response::Response,
};
use openlegend_simulation::{
    host::ByteReservation,
    runtime::{RuntimeDirectOutput, RuntimeError},
};
use serde::Deserialize;
use std::{mem::size_of, sync::Arc};

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct InviteQuery {
    token: Option<String>,
}

pub(super) async fn landing(
    State(state): State<AccessRoutes>,
    Query(query): Query<InviteQuery>,
) -> Response {
    if let IdentityMode::Oidc(oidc) = &state.identity
        && let Some(hash) = query.token.as_deref().and_then(invite_hash)
    {
        match state.authority.invite_landing(hash).await {
            Ok(true) => return start_oidc(oidc, false, Some(hash), None).await,
            Ok(false) => (),
            Err(_) => return access_failure(AccessError::Availability),
        }
    }
    redirect("/?entry=invite-unavailable", &[])
}

#[derive(Clone)]
pub(crate) struct Enrollment {
    pub(crate) game: Arc<CurrentServer>,
    pub(crate) saves: Arc<LiveSaves>,
    // Release this after the last enrollment reference to the world. Axum
    // can finish serving before Hyper drops the connection's router state.
    pub(crate) _request_owner: tokio::sync::watch::Sender<()>,
}

pub(super) async fn complete(
    authority: &Arc<Authority>,
    enrollment: Option<&Enrollment>,
    login: &LoginCompletion,
) -> &'static str {
    let Some(hash) = login.invitation else {
        return "/";
    };
    let claim = match authority
        .prepare_claim(&login.token, hash, login.deadline, login.expires_at)
        .await
    {
        Ok(Ok(claim)) => claim,
        Ok(Err(outcome)) => return location(outcome),
        Err(InviteError::Access(AccessError::Session | AccessError::Changed)) => {
            return location(ClaimOutcome::Unavailable);
        }
        Err(_) => return "/?entry=storage",
    };
    let result = if claim.actor().is_none() {
        authority
            .claim_characterless(claim)
            .await
            .map_err(|error| match error {
                InviteError::Access(AccessError::Changed | AccessError::Session) => None,
                _ => Some("/?entry=storage"),
            })
    } else if let Some(enrollment) = enrollment {
        enrollment
            .claim_player(authority, claim, login.deadline)
            .await
            .map_err(|error| match error {
                WorldError::Access(AccessError::Changed | AccessError::Session)
                | WorldError::Commit(crate::store::CommitError::RolledBack(
                    StoreError::StaleCut | StoreError::Cancelled,
                )) => None,
                _ => Some("/?entry=storage"),
            })
    } else {
        return location(ClaimOutcome::CharacterUnavailable);
    };
    match result {
        Ok(outcome) => location(outcome),
        Err(None) => location(ClaimOutcome::Unavailable),
        Err(Some(path)) => path,
    }
}

fn location(outcome: ClaimOutcome) -> &'static str {
    match outcome {
        ClaimOutcome::Accepted(Role::Player) => "/?entry=invite-accepted",
        ClaimOutcome::Accepted(_) => "/?entry=invite-accepted&view=operations",
        ClaimOutcome::Unavailable => "/?entry=invite-unavailable",
        ClaimOutcome::AlreadyMember => "/?entry=already-member",
        ClaimOutcome::CharacterUnavailable => "/?entry=character-unavailable",
    }
}

struct PreparedEnrollment {
    save: Option<ProtectedGameplaySave>,
    _custody: ByteReservation,
}

impl Enrollment {
    async fn claim_player(
        &self,
        authority: &Authority,
        claim: Claim,
        deadline: tokio::time::Instant,
    ) -> Result<ClaimOutcome, WorldError> {
        let _barrier = tokio::time::timeout_at(deadline, self.saves.enter_protected())
            .await
            .map_err(|_| AccessError::Changed)??;
        let mut fence = authority
            .enter_claim(&claim)
            .await
            .map_err(|error| match error {
                InviteError::Access(error) => error,
                _ => AccessError::Availability,
            })?;
        let claim = Arc::new(claim);
        let actor = claim.actor().ok_or(StoreError::StaleCut)?.to_owned();
        let test_actor = actor.clone();
        if !self
            .game
            .world
            .capture(move |world| world.may_invite_actor(&test_actor))
            .await?
        {
            return Ok(ClaimOutcome::CharacterUnavailable);
        }
        let account = claim.account().to_owned();
        let attempt = claim.invite_id().to_string();
        let validate = claim.clone();
        let writer = self.game.store.clone();
        let language = self.game.language().cloned();
        let project = writer.clone();
        let game = self.game.clone();
        let result = self
            .game
            .world
            .execute_protected(
                move |world| world.begin_invitation_enrollment(actor, account, attempt),
                move |question| {
                    let game = game.clone();
                    async move { game.answer_operation(question).await }
                },
                move |output, budget| {
                    let RuntimeDirectOutput::Prepared(prepared) = output else {
                        return Err(RuntimeError::application_refused(StoreError::InvalidRecord));
                    };
                    let save = prepared
                        .outcome()
                        .ok
                        .then(|| ProtectedGameplaySave::prepare(&prepared, &project, budget))
                        .transpose()?;
                    Ok(PreparedEnrollment {
                        save,
                        _custody: budget.reserve(size_of::<PreparedEnrollment>())?,
                    })
                },
                move || {
                    if validate.current_time() {
                        Ok(())
                    } else {
                        Err(AccessError::Changed.into())
                    }
                },
                move |prepared, prefix| -> ProtectedCommit<'_> {
                    Box::pin(async move {
                        let save = prepared.save.as_ref().ok_or(CommitError::RolledBack(
                            StoreError::DerivedProjectionRequired,
                        ))?;
                        let projection = EnrollmentProjection {
                            ordinary: save.projection(&writer, language.as_deref()),
                            invitation: &claim,
                        };
                        let acknowledgement = writer.commit_save(prefix, &[], &projection).await?;
                        save.record_commit(&projection.ordinary);
                        Ok(acknowledgement)
                    })
                },
            )
            .await;
        match result {
            Ok(result) => match result.and_then(|prepared| prepared.save) {
                Some(save) => {
                    save.acknowledged(&self.saves);
                    Ok(ClaimOutcome::Accepted(Role::Player))
                }
                None => Ok(ClaimOutcome::CharacterUnavailable),
            },
            Err(error) => {
                if matches!(error, WorldError::RecoveryRequired) {
                    fence.uncertain();
                }
                Err(error)
            }
        }
    }
}
