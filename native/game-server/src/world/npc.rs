//! Native choice and evidence preparation uses the existing private read
//! candidate. Network model execution starts after that candidate is closed.

use super::*;
use crate::authority::{Authority, AuthorizedScope, Capability};
use crate::boot::CurrentServer;
use openlegend_simulation::runtime::{
    RuntimeNpcBindingRequest, RuntimeNpcGuardThreat, RuntimeNpcPreparationStep, RuntimeNpcRead,
    RuntimeNpcTrigger,
};
use openlegend_simulation::{
    capture::NpcSourceSelection, host::ByteReservation, worlds::base_observed::SpeechVolume,
};

type ActorPreparationStep<T> = fn(
    &mut NativeWorldSession,
    &mut T,
    CandidateKey,
    Option<(&RuntimeProvider, RuntimeProviderInput)>,
) -> Result<RuntimeNpcPreparationStep, RuntimeError>;
type ReleaseCapacityRefusal<T> = fn(&mut T, CandidateKey) -> Result<(), RuntimeError>;

enum ActorPreparation<T> {
    Complete(T),
    Capacity(T, WorldError),
}

impl<T> ActorPreparation<T> {
    fn result(self) -> Result<T, WorldError> {
        match self {
            Self::Complete(read) => Ok(read),
            Self::Capacity(_, error) => Err(error),
        }
    }
}

fn source_preparation_capacity(error: &WorldError) -> bool {
    matches!(
        error,
        WorldError::Storage(StoreError::Capacity) | WorldError::Host(HostError::Capacity)
    ) || matches!(error, WorldError::Simulation(error) if error.is_capacity())
}

pub(crate) struct NpcHistoryRows {
    pub(crate) inventory: Option<usize>,
    pub(crate) incomplete: bool,
    pub(crate) truncated: bool,
    pub(crate) limit: u64,
    pub(crate) operations: u64,
}

pub(crate) enum NpcBinding {
    Issued(Arc<RuntimeNpcResponseTicket>),
    Refused {
        original: Box<RuntimeNpcRead>,
        reason: RuntimeError,
    },
}

struct NpcReadInput {
    actor: Box<str>,
    consumer: &'static str,
    stage_capture: bool,
    _storage: ByteReservation,
}

impl NpcReadInput {
    fn new(
        host: &WorldHost, actor: &str, consumer: &'static str, stage_capture: bool,
    ) -> Result<Self, RuntimeError> {
        let storage = host.budget().reserve(actor.len())?;
        Ok(Self {
            actor: actor.into(),
            consumer,
            stage_capture,
            _storage: storage,
        })
    }

    fn original(self, session: &mut NativeWorldSession) -> Result<RuntimeNpcRead, RuntimeError> {
        session.read_npc_origin(&self.actor, self.consumer, self.stage_capture)
    }

    fn current(self, session: &mut NativeWorldSession) -> Result<RuntimeNpcRead, RuntimeError> {
        session.read_npc_direct(&self.actor, self.consumer, self.stage_capture)
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
        volume: SpeechVolume,
    ) -> Result<openlegend_simulation::runtime::RuntimeReplyPreviewRead, WorldError> {
        let _turn = self.enter().await?;
        self.call(move |session| {
            Ok(authority
                .current(&scope, Capability::Play, true, |selected, _| {
                    session.read_reply_preview(
                        &selected.account_id,
                        &selected.actor_id,
                        &npc,
                        Some(volume.id()),
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
        stage_capture: bool,
    ) -> Result<RuntimeNpcRead, WorldError> {
        let input = NpcReadInput::new(&self.host, actor, consumer, stage_capture)?;
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
        guard_threat: Option<RuntimeNpcGuardThreat>,
        stage_capture: bool,
    ) -> Result<RuntimeNpcRead, WorldError> {
        let input = NpcReadInput::new(&self.host, actor, consumer, stage_capture)?;
        let read = self
            .prepare_actor_read(
                game,
                move |session| input.current(session),
                move |session, read| session.begin_npc_suggestions(read, inspection, guard_threat),
                NativeWorldSession::step_npc_context_with_notes,
            )
            .await?;
        self.attach_trade_prospects(read).await
    }

    async fn attach_trade_prospects(
        self: &Arc<Self>,
        read: RuntimeNpcRead,
    ) -> Result<RuntimeNpcRead, WorldError> {
        use crate::store::{StoreError, recall::browse::MemoryBrowseCut};
        if !read.has_npc_trade_prospects() {
            return Ok(read);
        }
        let budget = self.host.budget().clone();
        let (read, prospects) = self.capture(move |session| {
            let selected = session.with_npc_trade_prospects(&read, |source, peers| {
                let mut input = budget.reserve(0)?;
                let mut people = Vec::<String>::new();
                for id in peers {
                    if people.iter().any(|known| known == id) {
                        continue;
                    }
                    let bytes = input.bytes().checked_add(id.len() + 2 * std::mem::size_of::<String>())
                        .ok_or(openlegend_simulation::host::CapacityError)?;
                    input.resize(bytes)?;
                    people.push(id.to_owned());
                }
                let custody = budget.reserve(512 + source.world.len() + source.actor.len() + source.generation.len())?;
                let cut = Arc::new(MemoryBrowseCut {
                    world: source.world.to_owned(),
                    generation: source.generation.to_owned(),
                    actor: source.actor.to_owned(),
                    revision: source.durable_revision,
                    privacy_revision: source.privacy_revision,
                    at: source.at,
                    identity_through: source.identity_through,
                    _custody: custody,
                });
                Ok::<_, openlegend_simulation::host::CapacityError>((cut, people, input))
            })?.transpose()?;
            Ok((read, selected))
        }).await?;
        let Some((cut, people, custody)) = prospects else {
            return Ok(read);
        };
        let result = self.store.npc_trade_disclosures(cut, people).await;
        drop(custody);
        let terms = match result {
            Ok(terms) if terms.is_empty() => return Ok(read),
            Ok(terms) => terms,
            Err(StoreError::StaleCut) => return Ok(read),
            Err(error) => return Err(error.into()),
        };
        self.capture(move |session| {
            let mut read = read;
            session.join_npc_trade_prospects(&mut read, &terms)?;
            Ok(read)
        }).await
    }

    /// Hold the actor's exact accepted presentation and remaining work without
    /// probing commands. Review retains this read only through disclosure.
    pub(crate) async fn capture_npc_recall(
        self: &Arc<Self>,
        game: Arc<CurrentServer>,
        actor: &str,
        consumer: &'static str,
        include_notes: bool,
    ) -> Result<RuntimeNpcRead, WorldError> {
        let input = NpcReadInput::new(&self.host, actor, consumer, false)?;
        let step: ActorPreparationStep<RuntimeNpcRead> = if include_notes {
            NativeWorldSession::step_npc_context_with_notes
        } else {
            NativeWorldSession::step_npc_preparation
        };
        self.prepare_actor_read(
            game,
            move |session| input.current(session),
            NativeWorldSession::begin_npc_recall,
            step,
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
        self.prepare_npc_source_attempt(game, read, request, selection_storage, None)
            .await?
            .result()
    }

    /// Return the original read only when optional source preparation could
    /// not fit. The failed candidate has already released its own custody.
    pub(crate) async fn try_npc_sources_with_optional(
        self: &Arc<Self>,
        game: Arc<CurrentServer>,
        read: RuntimeNpcRead,
        request: NpcSourceSelection,
        selection_storage: ByteReservation,
    ) -> Result<Result<RuntimeNpcRead, RuntimeNpcRead>, WorldError> {
        if !request.receipts.is_empty() || request.consolidation_job.is_some() {
            return Err(StoreError::InvalidRecord.into());
        }
        match self
            .prepare_npc_source_attempt(
                game,
                read,
                request,
                selection_storage,
                Some(RuntimeNpcRead::release_abandoned_source_candidate),
            )
            .await?
        {
            ActorPreparation::Complete(read) => Ok(Ok(read)),
            ActorPreparation::Capacity(read, _) => Ok(Err(read)),
        }
    }

    async fn prepare_npc_source_attempt(
        self: &Arc<Self>,
        game: Arc<CurrentServer>,
        read: RuntimeNpcRead,
        request: NpcSourceSelection,
        selection_storage: ByteReservation,
        release_on_capacity: Option<ReleaseCapacityRefusal<RuntimeNpcRead>>,
    ) -> Result<ActorPreparation<RuntimeNpcRead>, WorldError> {
        self.prepare_actor_read_attempt(
            game,
            move |_| Ok(read),
            move |session, read| {
                let _selection_storage = selection_storage;
                session.begin_npc_sources_direct(read, request)
            },
            NativeWorldSession::step_npc_preparation,
            release_on_capacity,
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
        self.prepare_actor_read_attempt(game, read, begin, advance, None)
            .await?
            .result()
    }

    async fn prepare_actor_read_attempt<T: Send + 'static>(
        self: &Arc<Self>,
        game: Arc<CurrentServer>,
        read: impl FnOnce(&mut NativeWorldSession) -> Result<T, RuntimeError> + Send + 'static,
        begin: impl FnOnce(&mut NativeWorldSession, &mut T) -> Result<CandidateKey, RuntimeError>
        + Send
        + 'static,
        advance: ActorPreparationStep<T>,
        release_on_capacity: Option<ReleaseCapacityRefusal<T>>,
    ) -> Result<ActorPreparation<T>, WorldError> {
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
                let (started, selected) = world
                    .call(move |session| {
                        let mut read = read(session)?;
                        let started = begin(session, &mut read);
                        Ok((started, read))
                    })
                    .await?;
                let key = match started {
                    Ok(key) => key,
                    Err(error) if release_on_capacity.is_some() && error.is_capacity() => {
                        return Ok(ActorPreparation::Capacity(selected, error.into()));
                    }
                    Err(error) => return Err(error.into()),
                };
                let mut selected = Some(selected);
                let result = async {
                    let mut answer: Option<(RuntimeProvider, RuntimeProviderInput)> = None;
                    loop {
                        if send.is_closed() {
                            return Err(HostError::Cancelled.into());
                        }
                        let mut read = selected.take().expect("owned actor preparation");
                        let (next, step) = world
                            .call(move |session| {
                                let (ticket, input) = match answer {
                                    Some((ticket, input)) => (Some(ticket), Some(input)),
                                    None => (None, None),
                                };
                                let result =
                                    advance(session, &mut read, key, ticket.as_ref().zip(input));
                                Ok((read, result))
                            })
                            .await?;
                        selected = Some(next);
                        match step? {
                            RuntimeNpcPreparationStep::Complete => return Ok(()),
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
                match result {
                    Ok(()) => Ok(ActorPreparation::Complete(
                        selected.expect("completed actor preparation"),
                    )),
                    Err(error) => {
                        world.cleanup_candidate(key).await?;
                        if let Some(release) = release_on_capacity
                            && source_preparation_capacity(&error)
                            && let Some(mut read) = selected
                        {
                            release(&mut read, key)?;
                            return Ok(ActorPreparation::Capacity(read, error));
                        }
                        Err(error)
                    }
                }
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
    ) -> Result<Arc<RuntimeNpcResponseTicket>, WorldError> {
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
                // The ticket and read already fund their carriers. Send
                // pointers so the async receiver never copies either full
                // owned read through the worker's result and poll frames.
                Ok(ticket) => Ok(NpcBinding::Issued(Arc::new(ticket))),
                Err(reason) => Ok(NpcBinding::Refused {
                    original: Box::new(original.expect("a refused binding preserves its initial read")),
                    reason,
                }),
            }
        })
        .await
    }
}
