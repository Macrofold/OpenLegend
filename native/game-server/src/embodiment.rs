//! Character control is an operational receipt with a native participation
//! transition. They use one protected prefix and one PostgreSQL transaction.

use crate::{
    authority::{
        AccessError, Authority, AuthorizedScope, Capability, ControlChange, ControlOperation,
        ControlRequest, DepartureControl, now_ms,
    },
    boot::CurrentServer,
    live_save::{LiveSaves, ProtectedGameplaySave},
    presence::{ControlPresence, Presence},
    store::{CommitError, OrdinaryProjection, PrefixProjection, StoreError, StoreResult},
    world::{ProtectedCommit, WorldError},
};
use openlegend_simulation::{
    commands::Outcome,
    host::ByteReservation,
    records::SaveRows,
    runtime::{RuntimeDirectOutput, RuntimeError, RuntimeParticipation},
    text::JsText,
};
use std::{sync::Arc, time::Duration};
use tokio_postgres::Transaction;
use uuid::Uuid;

struct PreparedControl {
    outcome: Outcome,
    save: Option<ProtectedGameplaySave>,
    _custody: ByteReservation,
}

struct ControlProjection<'a> {
    gameplay: OrdinaryProjection<'a>,
    operation: &'a HostParticipation,
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
        self.operation.write(transaction).await
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
    presence: &Arc<Presence>,
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
    let exit = (request.operation == ControlOperation::Release).then(|| Exit::new(grace));
    let operation = match &exit {
        Some(exit) => RuntimeParticipation::BeginExit(exit.id.clone()),
        None => RuntimeParticipation::Return,
    };
    let release = exit.is_some();
    let (control, reserved_presence) = presence.fence_control(authorized, request)?;
    let host = HostParticipation::Browser {
        control,
        presence: reserved_presence,
        exit,
    };
    let candidate = apply(
        game,
        saves,
        scope.account_id,
        scope.actor_id,
        operation,
        host,
    )
    .await?;
    if !candidate.outcome.ok {
        return Ok(EmbodimentChange::Refused {
            message: candidate.outcome.message,
            _custody: candidate._custody,
        });
    }
    Ok(if release {
        EmbodimentChange::Released
    } else {
        EmbodimentChange::Returned
    })
}

/// Reconcile one due lost controller before the next clock offer. Ordinary
/// heartbeat renewals and clocks with no due presence do not take this lane.
pub(crate) async fn reconcile(
    game: &Arc<CurrentServer>,
    saves: &Arc<LiveSaves>,
    presence: &Arc<Presence>,
    grace: Duration,
) -> Result<(), WorldError> {
    while presence.departure_due()? {
        let _barrier = saves.enter_protected().await?;
        let Some(control) = presence.fence_departure()? else {
            break;
        };
        let scope = control.scope.clone();
        if !control.selected().await? {
            presence.departure_finished(&scope)?;
            continue;
        }
        let exit = Exit::new(grace);
        let operation = RuntimeParticipation::BeginExit(exit.id.clone());
        let host = HostParticipation::Loss {
            control,
            presence: presence.clone(),
            exit,
        };
        let candidate = apply(
            game,
            saves,
            scope.scope.account_id.clone(),
            scope.scope.actor_id.clone(),
            operation,
            host,
        )
        .await?;
        if !candidate.outcome.ok {
            // Gameplay already denies an otherwise current loss, e.g. a
            // body that ceased participating before this transport closed.
            presence.departure_finished(&scope)?;
        }
    }
    Ok(())
}

struct Exit {
    id: String,
    deadline: i64,
}

impl Exit {
    fn new(grace: Duration) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            deadline: now_ms().saturating_add(grace.as_millis().try_into().unwrap_or(i64::MAX)),
        }
    }

    fn fields(&self) -> (&str, i64) {
        (self.id.as_str(), self.deadline)
    }
}

enum HostParticipation {
    Browser {
        control: ControlChange,
        presence: ControlPresence,
        exit: Option<Exit>,
    },
    Loss {
        control: DepartureControl,
        presence: Arc<Presence>,
        exit: Exit,
    },
}

impl HostParticipation {
    async fn write(&self, tx: &Transaction<'_>) -> StoreResult<()> {
        match self {
            Self::Browser { control, exit, .. } => {
                control.write(tx).await?;
                control
                    .write_exit(tx, exit.as_ref().map(Exit::fields))
                    .await
            }
            Self::Loss { control, exit, .. } => control.write(tx, exit.fields()).await,
        }
    }

    fn confirmed(self) -> Result<(), AccessError> {
        match self {
            Self::Browser {
                control, presence, ..
            } => presence.confirmed(control),
            Self::Loss {
                control, presence, ..
            } => presence.departure_finished(&control.scope),
        }
    }
}

async fn apply(
    game: &Arc<CurrentServer>,
    saves: &Arc<LiveSaves>,
    account: String,
    actor: String,
    operation: RuntimeParticipation,
    host: HostParticipation,
) -> Result<PreparedControl, WorldError> {
    let host = Arc::new(host);
    let write = host.clone();
    let provider = game.clone();
    let language = game.language().cloned();
    let store = game.store.clone();
    let candidate_store = store.clone();
    let settled_saves = saves.clone();
    game.world
        .execute_protected_then(
            move |world| world.begin_participation_direct(&account, actor, operation),
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
                    .then(|| ProtectedGameplaySave::prepare(&product, &candidate_store, budget))
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
                        operation: &write,
                    };
                    let acknowledgement = store.commit_save(prefix, &[], &projection).await?;
                    save.record_commit(&projection.gameplay);
                    Ok(acknowledgement)
                })
            },
            move |candidate| {
                Arc::try_unwrap(host)
                    .map_err(|_| AccessError::Availability)?
                    .confirmed()?;
                candidate
                    .save
                    .as_ref()
                    .ok_or(StoreError::InvalidRecord)?
                    .acknowledged(&settled_saves);
                Ok(())
            },
        )
        .await?
        .ok_or(AccessError::Changed.into())
}
