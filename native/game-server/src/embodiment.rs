//! Character control is an operational receipt with a native participation
//! transition. They use one protected prefix and one PostgreSQL transaction.

use crate::{
    authority::{
        AccessError, Authority, AuthorizedScope, Capability, ControlChange, ControlOperation,
        ControlRequest, now_ms,
    },
    boot::CurrentServer,
    language::LanguageProvider,
    live_save::LiveSaves,
    store::{
        CommitError, OrdinaryProjection, PrefixProjection, PreparedActivityMemories,
        PreparedRecall, Store, StoreError, StoreResult,
    },
    world::{ProtectedCommit, WorldError},
};
use openlegend_simulation::{
    commands::Outcome,
    host::{ByteBudget, ByteReservation},
    records::SaveRows,
    runtime::{
        RuntimeDirectOutput, RuntimeError, RuntimeHistory, RuntimeHistoryCuts,
        RuntimeParticipation, RuntimePreparedProducts,
    },
    text::JsText,
};
use std::{
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
    time::Duration,
};
use tokio_postgres::Transaction;
use uuid::Uuid;

struct PreparedControl {
    outcome: Outcome,
    save: Option<ParticipationSave>,
    _custody: ByteReservation,
}

/// History and recall belonging to a protected participation candidate. Use
/// the ordinary writer and notify its workers only after the native ACK.
pub(crate) struct ParticipationSave {
    history: RuntimeHistory,
    eligibility: Option<RuntimeHistoryCuts>,
    recall: Option<PreparedRecall>,
    activity_memories: Option<Arc<PreparedActivityMemories>>,
    recall_hard_bytes: i64,
    story_enqueued: AtomicBool,
}

impl ParticipationSave {
    pub(crate) fn prepare(
        product: &RuntimePreparedProducts<'_>,
        store: &Store,
        budget: &ByteBudget,
    ) -> Result<Self, RuntimeError> {
        product
            .prepare_participation_save(budget, |history, eligibility, recall| {
                let activity_memories =
                    OrdinaryProjection::validate_candidate(store, recall.changes, &history)?;
                let recall_hard_bytes =
                    i64::try_from(recall.hard_bytes).map_err(|_| StoreError::Capacity)?;
                let recall = store.prepare_recall(recall)?;
                Ok::<_, StoreError>(Self {
                    history,
                    eligibility,
                    recall,
                    activity_memories,
                    recall_hard_bytes,
                    story_enqueued: AtomicBool::new(false),
                })
            })?
            .map_err(RuntimeError::application_refused)
    }

    pub(crate) fn projection<'a>(
        &'a self,
        store: &'a Store,
        language: Option<&'a LanguageProvider>,
    ) -> OrdinaryProjection<'a> {
        OrdinaryProjection::new(store, std::slice::from_ref(&self.history))
            .with_projections(self.eligibility.as_ref(), self.recall.as_ref(), language)
            .with_activity_memories(self.activity_memories.as_slice(), self.recall_hard_bytes)
    }

    pub(crate) fn record_commit(&self, projection: &OrdinaryProjection<'_>) {
        self.story_enqueued
            .store(projection.story_enqueued(), Ordering::Relaxed);
    }

    pub(crate) fn acknowledged(&self, saves: &LiveSaves) {
        if self.recall.is_some() || self.activity_memories.is_some() {
            saves.signal_recall_change();
        }
        if self.story_enqueued.load(Ordering::Relaxed) {
            saves.story_waker().notify_one();
        }
        saves.signal_view();
    }
}

struct ControlProjection<'a> {
    gameplay: OrdinaryProjection<'a>,
    control: &'a ControlChange,
    exit: Option<(&'a str, i64)>,
}

impl PrefixProjection for ControlProjection<'_> {
    async fn before_records(
        &self,
        transaction: &Transaction<'_>,
        rows: &SaveRows,
        revision: u64,
    ) -> StoreResult<()> {
        self.gameplay
            .before_records(transaction, rows, revision)
            .await
    }

    async fn after_records(
        &self,
        transaction: &Transaction<'_>,
        rows: &SaveRows,
        revision: u64,
    ) -> StoreResult<()> {
        self.gameplay
            .after_records(transaction, rows, revision)
            .await?;
        self.control.write(transaction).await?;
        self.control.write_exit(transaction, self.exit).await
    }
}

pub(crate) enum EmbodimentChange {
    Replayed,
    Returned,
    Released,
    Refused {
        message: JsText,
        _custody: ByteReservation,
    },
}

pub(crate) async fn change(
    game: &Arc<CurrentServer>,
    saves: &Arc<LiveSaves>,
    authority: &Arc<Authority>,
    authorized: &AuthorizedScope,
    request: ControlRequest,
    presence: &crate::presence::Presence,
    grace: Duration,
) -> Result<EmbodimentChange, WorldError> {
    let _barrier = saves.enter_protected().await?;
    let scope = authority.current(authorized, Capability::Play, false, |scope, _| {
        scope.clone()
    })?;
    if authority.control_replayed(&scope, &request).await? {
        authority.current(authorized, Capability::Play, false, |_, _| ())?;
        return Ok(EmbodimentChange::Replayed);
    }
    let exit = (request.operation == ControlOperation::Release).then(|| {
        (
            Uuid::new_v4().to_string(),
            now_ms().saturating_add(grace.as_millis().try_into().unwrap_or(i64::MAX)),
        )
    });
    let operation = match &exit {
        Some((id, _)) => RuntimeParticipation::BeginExit(id.clone()),
        None => RuntimeParticipation::Return,
    };
    let release = exit.is_some();
    let control = Arc::new(presence.fence_control(authorized, request)?);
    let write = control.clone();
    let provider = game.clone();
    let language = game.language().cloned();
    let store = game.store.clone();
    let candidate_store = store.clone();
    let candidate = game
        .world
        .execute_protected(
            move |world| {
                world.begin_participation_direct(&scope.account_id, scope.actor_id, operation)
            },
            move |question| {
                let provider = provider.clone();
                async move { provider.answer_operation(question).await }
            },
            move |output, budget| {
                let RuntimeDirectOutput::Prepared(product) = output else {
                    unreachable!("participation does not preview")
                };
                let outcome = product.outcome();
                let save = outcome
                    .ok
                    .then(|| ParticipationSave::prepare(&product, &candidate_store, budget))
                    .transpose()?;
                let bytes = openlegend_simulation::encoding::json_record_len(outcome)
                    .map_err(RuntimeError::application_refused)?
                    .checked_mul(3)
                    .and_then(|size| size.checked_add(std::mem::size_of::<PreparedControl>()))
                    .ok_or_else(|| RuntimeError::application_refused(StoreError::Capacity))?;
                Ok(PreparedControl {
                    outcome: outcome.clone(),
                    save,
                    _custody: budget.reserve(bytes)?,
                })
            },
            || Ok(()),
            move |candidate, prefix| -> ProtectedCommit<'_> {
                Box::pin(async move {
                    let save = candidate.save.as_ref().ok_or(CommitError::RolledBack(
                        StoreError::DerivedProjectionRequired,
                    ))?;
                    let projection = ControlProjection {
                        gameplay: save.projection(&store, language.as_deref()),
                        control: &write,
                        exit: exit.as_ref().map(|(id, deadline)| (id.as_str(), *deadline)),
                    };
                    let acknowledgement = store.commit_save(prefix, &[], &projection).await?;
                    save.record_commit(&projection.gameplay);
                    Ok(acknowledgement)
                })
            },
        )
        .await?
        .ok_or(AccessError::Changed)?;
    if !candidate.outcome.ok {
        return Ok(EmbodimentChange::Refused {
            message: candidate.outcome.message,
            _custody: candidate._custody,
        });
    }
    candidate
        .save
        .as_ref()
        .ok_or(StoreError::InvalidRecord)?
        .acknowledged(saves);
    Ok(if release {
        EmbodimentChange::Released
    } else {
        EmbodimentChange::Returned
    })
}
