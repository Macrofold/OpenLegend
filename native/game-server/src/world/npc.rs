//! Native choice and evidence preparation uses the existing private read
//! candidate. Network model execution starts after that candidate is closed.

use super::*;
use crate::boot::CurrentServer;
use axum::body::Bytes;
use openlegend_simulation::runtime::{
    RuntimeNpcPreparationStep, RuntimeNpcRead, RuntimeNpcTrigger,
};

pub(crate) type BeginNpcRead =
    fn(&mut NativeWorldSession, &mut RuntimeNpcRead, &[u8]) -> Result<CandidateKey, RuntimeError>;

impl HostedWorld {
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
            move |session| session.read_npc(&request),
            selector,
            NativeWorldSession::begin_npc_candidates,
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
        self.prepare_npc_at(game, move |_| Ok(read), request, begin)
            .await
    }

    async fn prepare_npc_at(
        self: &Arc<Self>,
        game: Arc<CurrentServer>,
        read: impl FnOnce(&mut NativeWorldSession) -> Result<RuntimeNpcRead, RuntimeError>
        + Send
        + 'static,
        request: Bytes,
        begin: BeginNpcRead,
    ) -> Result<RuntimeNpcRead, WorldError> {
        let queued = self
            .waiting
            .clone()
            .try_acquire_owned()
            .map_err(|_| HostError::Busy)?;
        let world = self.clone();
        let (mut send, receive) = oneshot::channel();
        tokio::spawn(async move {
            let result = async {
                let _turn = tokio::select! {
                    biased;
                    _ = send.closed() => return Err(HostError::Cancelled.into()),
                    turn = tokio::time::timeout(TURN_WAIT, world.turn.lock()) => turn.map_err(|_| HostError::Busy)?,
                };
                drop(queued);
                if world.closing.load(Ordering::Acquire) {
                    return Err(HostError::Closed.into());
                }
                let (key, selected) = world.call(move |session| {
                    let mut read = read(session)?;
                    let key = begin(session, &mut read, &request)?;
                    Ok((key, read))
                }).await?;
                let result = async {
                    let mut read = selected;
                    let mut answer: Option<(RuntimeProvider, RuntimeProviderInput)> = None;
                    loop {
                        if send.is_closed() {
                            return Err(HostError::Cancelled.into());
                        }
                        let (next, step) = world.call(move |session| {
                            let (ticket, input) = match answer {
                                Some((ticket, input)) => (Some(ticket), Some(input)),
                                None => (None, None),
                            };
                            let result = session.step_npc_preparation(&mut read, key, ticket.as_ref().zip(input))?;
                            Ok((read, result))
                        }).await?;
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
                }.await;
                if result.is_err() {
                    world.cleanup_candidate(key).await?;
                }
                result
            }.await;
            let _ = send.send(result);
        });
        receive.await.map_err(|_| HostError::WorkerFailed)?
    }

    pub(crate) async fn bind_npc(
        self: &Arc<Self>,
        original: RuntimeNpcRead,
        current: RuntimeNpcRead,
        request: Bytes,
        trigger: Option<Arc<RuntimeNpcTrigger>>,
    ) -> Result<RuntimeNpcResponseTicket, WorldError> {
        let _turn = self.enter().await?;
        self.call(move |session| {
            session.bind_npc_response(
                &mut Some(original),
                &mut Some(current),
                &request,
                trigger.as_deref(),
                None,
            )
        })
        .await
    }
}
