//! Native choice and evidence preparation uses the existing private read
//! candidate. Network model execution starts after that candidate is closed.

use super::*;
use crate::authority::{Authority, AuthorizedScope, Capability};
use crate::boot::CurrentServer;
use axum::body::Bytes;
use openlegend_simulation::runtime::{
    RuntimeNpcPreparationStep, RuntimeNpcRead, RuntimeNpcTrigger,
};

pub(crate) type BeginNpcRead =
    fn(&mut NativeWorldSession, &mut RuntimeNpcRead, &[u8]) -> Result<CandidateKey, RuntimeError>;

pub(crate) enum NpcBinding {
    Issued(RuntimeNpcResponseTicket),
    Refused {
        original: RuntimeNpcRead,
        reason: RuntimeError,
    },
}

impl HostedWorld {
    pub(crate) async fn capture_reply_preview(
        self: &Arc<Self>,
        authority: Arc<Authority>,
        scope: Arc<AuthorizedScope>,
        npc: String,
        volume: String,
    ) -> Result<openlegend_simulation::runtime::RuntimeReplyPreviewRead, WorldError> {
        let _turn = self.enter().await?;
        self.call(move |session| {
            Ok(authority
                .current(&scope, Capability::Play, true, |selected, _| {
                    session.read_reply_preview(
                        &selected.account_id,
                        &selected.actor_id,
                        &npc,
                        Some(&volume),
                    )
                })
                .map_err(WorldError::Access)
                .and_then(|read| read.map_err(WorldError::Simulation)))
        })
        .await?
    }

    /// Retain the accepted actor, source and reference read with its native
    /// serial. No physical catalogue is prepared for this read.
    pub(crate) async fn capture_npc_read(
        self: &Arc<Self>,
        request: Bytes,
    ) -> Result<RuntimeNpcRead, WorldError> {
        let _turn = self.enter().await?;
        self.call(move |session| session.read_npc_direct(&request))
            .await
    }

    /// Read and begin the physical catalogue in one world turn. The native
    /// candidate deliberately refuses a preserved read from an older cut.
    pub(crate) async fn capture_npc_offers(
        self: &Arc<Self>,
        game: Arc<CurrentServer>,
        request: Bytes,
        selector: Bytes,
    ) -> Result<RuntimeNpcRead, WorldError> {
        self.prepare_npc_at(
            game,
            move |session| session.read_npc_direct(&request),
            move |session, read| session.begin_npc_candidates(read, &selector),
        )
        .await
    }

    /// Hold the actor's exact accepted presentation and remaining work without
    /// probing commands. Review retains this read only through disclosure.
    pub(crate) async fn capture_npc_recall(
        self: &Arc<Self>,
        game: Arc<CurrentServer>,
        request: Bytes,
    ) -> Result<RuntimeNpcRead, WorldError> {
        self.prepare_npc_at(
            game,
            move |session| session.read_npc_direct(&request),
            NativeWorldSession::begin_npc_recall,
        )
        .await
    }

    /// Keep one native read's own cut and its funded prepared products. The
    /// originating caller supplies the real typed choice or source selection.
    pub(crate) async fn prepare_npc(
        self: &Arc<Self>,
        game: Arc<CurrentServer>,
        read: RuntimeNpcRead,
        request: Bytes,
        begin: BeginNpcRead,
    ) -> Result<RuntimeNpcRead, WorldError> {
        self.prepare_npc_at(
            game,
            move |_| Ok(read),
            move |session, read| begin(session, read, &request),
        )
        .await
    }

    async fn prepare_npc_at(
        self: &Arc<Self>,
        game: Arc<CurrentServer>,
        read: impl FnOnce(&mut NativeWorldSession) -> Result<RuntimeNpcRead, RuntimeError>
        + Send
        + 'static,
        begin: impl FnOnce(
            &mut NativeWorldSession,
            &mut RuntimeNpcRead,
        ) -> Result<CandidateKey, RuntimeError>
        + Send
        + 'static,
    ) -> Result<RuntimeNpcRead, WorldError> {
        let queued = self
            .waiting
            .clone()
            .try_acquire_owned()
            .map_err(|_| HostError::Busy)?;
        let world = self.clone();
        let (mut send, receive) = oneshot::channel();
        #[cfg(feature = "profile-campaign")]
        let parent = openlegend_simulation::profile::current();
        let operation = async move {
            let result = async {
                let guard = tokio::select! {
                    biased;
                    _ = send.closed() => return Err(HostError::Cancelled.into()),
                    turn = super::wait_for_turn(world.turn.lock()) => turn?,
                };
                let _turn = super::held_turn(
                    guard,
                    #[cfg(feature = "profile-campaign")]
                    openlegend_simulation::profile::sites::TURN_NPC,
                );
                drop(queued);
                if world.closing.load(Ordering::Acquire) {
                    return Err(HostError::Closed.into());
                }
                let (key, selected) = world
                    .call(move |session| {
                        let mut read = read(session)?;
                        let key = begin(session, &mut read)?;
                        Ok((key, read))
                    })
                    .await?;
                let result = async {
                    let mut read = selected;
                    let mut answer: Option<(RuntimeProvider, RuntimeProviderInput)> = None;
                    loop {
                        if send.is_closed() {
                            return Err(HostError::Cancelled.into());
                        }
                        let (next, step) = world
                            .call(move |session| {
                                let (ticket, input) = match answer {
                                    Some((ticket, input)) => (Some(ticket), Some(input)),
                                    None => (None, None),
                                };
                                let result = session.step_npc_preparation(
                                    &mut read,
                                    key,
                                    ticket.as_ref().zip(input),
                                )?;
                                Ok((read, result))
                            })
                            .await?;
                        read = next;
                        match step {
                            RuntimeNpcPreparationStep::Complete => return Ok(read),
                            RuntimeNpcPreparationStep::Continue => answer = None,
                            RuntimeNpcPreparationStep::Provider(question) => {
                                answer = Some(tokio::select! {
                                    biased;
                                    _ = send.closed() => return Err(HostError::Cancelled.into()),
                                    result = game.answer_operation(question) => result?,
                                });
                            }
                        }
                    }
                }
                .await;
                if result.is_err() {
                    world.cleanup_candidate(key).await?;
                }
                result
            }
            .await;
            let _ = send.send(result);
        };
        #[cfg(feature = "profile-campaign")]
        let operation = openlegend_simulation::profile::carry(parent, operation);
        self.operations.spawn(operation);
        receive.await.map_err(|_| HostError::WorkerFailed)?
    }

    pub(crate) async fn bind_npc(
        self: &Arc<Self>,
        original: RuntimeNpcRead,
        current: RuntimeNpcRead,
        request: Bytes,
        trigger: Option<Arc<RuntimeNpcTrigger>>,
    ) -> Result<RuntimeNpcResponseTicket, WorldError> {
        match self
            .bind_npc_preserving_read(original, current, request, trigger)
            .await?
        {
            NpcBinding::Issued(ticket) => Ok(ticket),
            NpcBinding::Refused { reason, .. } => Err(reason.into()),
        }
    }

    /// A refused optional recall binding leaves the initial evidence with the
    /// caller. Any subsequent required decision still binds it from scratch.
    pub(crate) async fn bind_npc_preserving_read(
        self: &Arc<Self>,
        original: RuntimeNpcRead,
        current: RuntimeNpcRead,
        request: Bytes,
        trigger: Option<Arc<RuntimeNpcTrigger>>,
    ) -> Result<NpcBinding, WorldError> {
        let _turn = self.enter().await?;
        self.call(move |session| {
            let mut original = Some(original);
            match session.bind_npc_response(
                &mut original,
                &mut Some(current),
                &request,
                trigger.as_deref(),
                None,
            ) {
                Ok(ticket) => Ok(NpcBinding::Issued(ticket)),
                Err(reason) => Ok(NpcBinding::Refused {
                    original: original.expect("a refused binding preserves its initial read"),
                    reason,
                }),
            }
        })
        .await
    }
}
