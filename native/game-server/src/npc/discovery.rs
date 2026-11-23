//! The optional discovery job borrows one saved free-interval reservation.
//! Its provider and recovery paths share the ordinary agency writer.

use crate::{
    boot::CurrentServer,
    live_save::LiveSaves,
    world::{ApplicationStart, NpcDisclosureTurn, WorldError},
};
use openlegend_simulation::{
    host::{ByteReservation, CapacityError},
    runtime::{RuntimeDirectOutput, RuntimeError, RuntimeNpcTrigger},
};
pub(super) use openlegend_simulation::runtime::RuntimeDiscoveryOperation as Operation;
use std::{
    mem::size_of,
    sync::{
        Arc,
        atomic::{AtomicU8, Ordering},
    },
};
use tokio::time::Instant;

const RESERVED: u8 = 0;
const SENT: u8 = 1;
const SETTLED: u8 = 2;

pub(crate) struct DiscoveryDispatch {
    game: Arc<CurrentServer>,
    saves: Arc<LiveSaves>,
    actor: String,
    generation: String,
    reservation: String,
    interval: u64,
    trigger: Arc<RuntimeNpcTrigger>,
    progress: AtomicU8,
    _custody: ByteReservation,
}

impl DiscoveryDispatch {
    pub(super) fn new(
        game: Arc<CurrentServer>,
        saves: Arc<LiveSaves>,
        actor: &str,
        generation: &str,
        reservation: &str,
        interval: u64,
        trigger: Arc<RuntimeNpcTrigger>,
    ) -> Result<Self, WorldError> {
        let bytes = [actor.len(), generation.len(), reservation.len()]
            .into_iter()
            .try_fold(size_of::<Self>() + 64, usize::checked_add)
            .ok_or(CapacityError)
            .map_err(RuntimeError::from)?;
        let custody = game
            .host
            .budget()
            .reserve(bytes)
            .map_err(RuntimeError::from)?;
        Ok(Self {
            game,
            saves,
            actor: actor.to_owned(),
            generation: generation.to_owned(),
            reservation: reservation.to_owned(),
            interval,
            trigger,
            progress: AtomicU8::new(RESERVED),
            _custody: custody,
        })
    }

    pub(super) async fn reserve(&self) -> Result<bool, WorldError> {
        self.change(Operation::Reserve {
            interval: self.interval,
        })
        .await
    }

    pub(crate) fn first_send_pending(&self) -> bool {
        self.progress.load(Ordering::Acquire) == RESERVED
    }

    pub(crate) fn current(&self, turn: &NpcDisclosureTurn<'_>) -> Result<bool, WorldError> {
        turn.discovery_current(
            &self.trigger,
            &self.actor,
            &self.generation,
            &self.reservation,
            self.interval,
        )
    }

    pub(crate) fn mark_sent(&self) {
        self.progress.store(SENT, Ordering::Release);
    }

    pub(crate) async fn publish_sent(&self) {
        self.settle(true).await;
    }

    pub(super) async fn finish(&self) {
        match self.progress.load(Ordering::Acquire) {
            SETTLED => (),
            SENT => self.settle(true).await,
            _ => {
                // An ambiguous durable dispatch marker cannot reopen the allowance.
                if let Ok(dispatched) = self
                    .game
                    .store
                    .discovery_spent(self.reservation.clone())
                    .await
                {
                    self.settle(dispatched).await;
                }
            }
        }
    }

    async fn settle(&self, dispatched: bool) {
        if self.change(Operation::Settle { dispatched }).await.is_ok() {
            // A completed false result means this exact old reservation
            // no longer exists. It cannot settle a newer free interval.
            self.progress.store(SETTLED, Ordering::Release);
        }
    }

    async fn change(&self, operation: Operation) -> Result<bool, WorldError> {
        change(
            &self.game,
            &self.saves,
            &self.actor,
            &self.generation,
            &self.reservation,
            operation,
        )
        .await
    }
}

pub(super) async fn change(
    game: &Arc<CurrentServer>,
    saves: &Arc<LiveSaves>,
    actor: &str,
    generation: &str,
    reservation: &str,
    operation: Operation,
) -> Result<bool, WorldError> {
    let _ordinary = saves.enter_ordinary().await;
    saves.check_admission(Instant::now())?;
    let bytes = [actor.len(), generation.len(), reservation.len()]
        .into_iter()
        .try_fold(0usize, usize::checked_add)
        .ok_or(CapacityError)
        .map_err(RuntimeError::from)?;
    let input_storage = game.host.budget().reserve(bytes).map_err(RuntimeError::from)?;
    let actor = actor.to_owned();
    let generation = generation.to_owned();
    let reservation = reservation.to_owned();
    let reserving = matches!(operation, Operation::Reserve { .. });
    let provider = game.clone();
    let stage = saves.clone();
    let accepted = saves.clone();
    game.world.request_advance_publication();
    let published = game
        .world
        .execute_and_publish(
            #[cfg(feature = "profile-campaign")]
            openlegend_simulation::profile::sites::TURN_NPC,
            move |session| {
                let _input_storage = input_storage;
                let scope = session.accepted_progress()?;
                if scope.generation != generation || (reserving && scope.paused) {
                    return Ok(ApplicationStart::Existing((false, None)));
                }
                Ok(ApplicationStart::Candidate(
                    session.begin_npc_discovery(actor, reservation, operation)?,
                ))
            },
            move |question| {
                let provider = provider.clone();
                async move { provider.answer_operation(question).await }
            },
            move |output, _| {
                let RuntimeDirectOutput::Prepared(products) = output else {
                    return Err(RuntimeError::application_refused(
                        "NPC discovery prepared no result",
                    ));
                };
                Ok((products.outcome().ok, Some(stage.stage(&products, None)?)))
            },
            |fence, key, _| Ok(fence.settle(key, true)?),
            move |(_, save)| {
                if let Some(save) = save {
                    accepted.accept(save);
                }
            },
        )
        .await?;
    Ok(published.is_some_and(|(accepted, _)| accepted))
}
