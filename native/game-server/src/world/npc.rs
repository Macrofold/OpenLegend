//! Native choice and evidence preparation uses the existing private read
//! candidate. Network model execution starts after that candidate is closed.

use super::*;
use crate::authority::{Authority, AuthorizedScope, Capability};
use crate::boot::CurrentServer;
use openlegend_simulation::runtime::{
    RuntimeNpcBindingRequest, RuntimeNpcPreparationStep, RuntimeNpcRead, RuntimeNpcTrigger,
};
use openlegend_simulation::{capture::NpcSourceSelection, host::ByteReservation};

type ActorPreparationStep<T> = fn(
    &mut NativeWorldSession,
    &mut T,
    CandidateKey,
    Option<(&RuntimeProvider, RuntimeProviderInput)>,
) -> Result<RuntimeNpcPreparationStep, RuntimeError>;

pub(crate) struct NpcHistoryRows {
    pub(crate) inventory: Option<usize>,
    pub(crate) incomplete: bool,
    pub(crate) truncated: bool,
    pub(crate) limit: u64,
    pub(crate) operations: u64,
}

pub(crate) enum NpcBinding {
    Issued(RuntimeNpcResponseTicket),
    Refused {
        original: RuntimeNpcRead,
        reason: RuntimeError,
    },
}

struct NpcReadInput {
    actor: Box<str>,
    consumer: &'static str,
    _storage: ByteReservation,
}

impl NpcReadInput {
    fn new(host: &WorldHost, actor: &str, consumer: &'static str) -> Result<Self, RuntimeError> {
        let storage = host.budget().reserve(actor.len())?;
        Ok(Self {
            actor: actor.into(),
            consumer,
            _storage: storage,
        })
    }

    fn original(self, session: &mut NativeWorldSession) -> Result<RuntimeNpcRead, RuntimeError> {
        session.read_npc_origin(&self.actor, self.consumer)
    }

    fn current(self, session: &mut NativeWorldSession) -> Result<RuntimeNpcRead, RuntimeError> {
        session.read_npc_direct(&self.actor, self.consumer)
    }
}

impl HostedWorld {
    /// Reopen the actual earlier read after the first model chooses questions.
    /// The separate final attempt checks the scope again when it sends.
    pub(crate) async fn reopen_npc_for_queries(
        self: &Arc<Self>,
        ticket: RuntimeNpcResponseTicket,
        permit: Option<(Arc<Authority>, Arc<AuthorizedScope>)>,
    ) -> Result<
        (
            RuntimeNpcRead,
            RuntimeNpcRead,
            RuntimeNpcBindingRequest,
            openlegend_simulation::attention::SceneAttentionPolicy,
        ),
        WorldError,
    > {
        let _turn = self.enter().await?;
        self.call(move |session| {
            let reopen = || session.open_npc_response_direct(ticket);
            Ok(match permit {
                Some((authority, scope)) => authority
                    .current(&scope, Capability::Play, true, |_, _| reopen())
                    .map_err(WorldError::Access)
                    .and_then(|read| read.map_err(WorldError::Simulation)),
                None => reopen().map_err(WorldError::Simulation),
            })
        })
        .await?
    }

    /// The source read pins the accepted storage overlay, then returns the
    /// world turn before PostgreSQL I/O. The NPC's older chronology survives
    /// that wait and the later native admission rechecks current permission.
    pub(crate) async fn read_npc_history(
        self: &Arc<Self>,
        original: Box<RuntimeNpcRead>,
        from: f64,
        through: f64,
    ) -> Result<(Box<RuntimeNpcRead>, NpcHistoryRows), WorldError> {
        let store = self.store.clone();
        let (mut original, window, storage) = self
            .capture(move |session| {
                let (window, storage) =
                    session.with_npc_history(&original, from, through, |read| {
                        store.prepare_recent_sources(read)
                    })?;
                Ok((original, window, storage))
            })
            .await?;
        let mut result = NpcHistoryRows {
            inventory: None,
            incomplete: window.incomplete,
            truncated: window.truncated,
            limit: window.limit,
            operations: window.operations,
        };
        let Some(storage) = storage else {
            return Ok((original, result));
        };
        let rows = self.store.read_source_rows(storage?).await?;
        let _turn = self.enter().await?;
        self.call(move |session| {
            let inventory =
                rows.admit(|rows| session.admit_npc_history(&mut original, window, rows))?;
            result.inventory = Some(inventory);
            Ok((original, result))
        })
        .await
    }

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
        actor: &str,
        consumer: &'static str,
    ) -> Result<RuntimeNpcRead, WorldError> {
        let input = NpcReadInput::new(&self.host, actor, consumer)?;
        let _turn = self.enter().await?;
        self.call(move |session| input.original(session)).await
    }

    /// Read and begin the physical catalogue in one world turn. The native
    /// candidate deliberately refuses a preserved read from an older cut.
    pub(crate) async fn capture_npc_offers(
        self: &Arc<Self>,
        game: Arc<CurrentServer>,
        actor: &str,
        consumer: &'static str,
        inspection: Option<openlegend_simulation::activity::ActivityInspectionNavigation>,
    ) -> Result<RuntimeNpcRead, WorldError> {
        let input = NpcReadInput::new(&self.host, actor, consumer)?;
        self.prepare_actor_read(
            game,
            move |session| input.current(session),
            move |session, read| session.begin_npc_suggestions(read, inspection),
            NativeWorldSession::step_npc_preparation,
        )
        .await
    }

    /// Hold the actor's exact accepted presentation and remaining work without
    /// probing commands. Review retains this read only through disclosure.
    pub(crate) async fn capture_npc_recall(
        self: &Arc<Self>,
        game: Arc<CurrentServer>,
        actor: &str,
        consumer: &'static str,
    ) -> Result<RuntimeNpcRead, WorldError> {
        let input = NpcReadInput::new(&self.host, actor, consumer)?;
        self.prepare_actor_read(
            game,
            move |session| input.current(session),
            NativeWorldSession::begin_npc_recall,
            NativeWorldSession::step_npc_preparation,
        )
        .await
    }

    /// Keep one native read's own cut and its funded prepared products. The
    /// originating caller supplies the real typed choice or source selection.
    pub(crate) async fn select_npc_sources(
        self: &Arc<Self>,
        game: Arc<CurrentServer>,
        read: RuntimeNpcRead,
        request: NpcSourceSelection,
        selection_storage: ByteReservation,
    ) -> Result<RuntimeNpcRead, WorldError> {
        self.prepare_actor_read(
            game,
            move |_| Ok(read),
            move |session, read| {
                let _selection_storage = selection_storage;
                session.begin_npc_sources_direct(read, request)
            },
            NativeWorldSession::step_npc_preparation,
        )
        .await
    }

    /// Drive a private read without publishing a mutation or leaving its
    /// source snapshot and cancellation dependent on the caller's lifetime.
    pub(crate) async fn prepare_actor_read<T: Send + 'static>(
        self: &Arc<Self>,
        game: Arc<CurrentServer>,
        read: impl FnOnce(&mut NativeWorldSession) -> Result<T, RuntimeError> + Send + 'static,
        begin: impl FnOnce(&mut NativeWorldSession, &mut T) -> Result<CandidateKey, RuntimeError>
        + Send
        + 'static,
        advance: ActorPreparationStep<T>,
    ) -> Result<T, WorldError> {
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
                                let result =
                                    advance(session, &mut read, key, ticket.as_ref().zip(input))?;
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
        request: RuntimeNpcBindingRequest,
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
        request: RuntimeNpcBindingRequest,
        trigger: Option<Arc<RuntimeNpcTrigger>>,
    ) -> Result<NpcBinding, WorldError> {
        let _turn = self.enter().await?;
        self.call(move |session| {
            let mut original = Some(original);
            match session.bind_npc_response_direct(
                &mut original,
                &mut Some(current),
                request,
                trigger.as_deref(),
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
