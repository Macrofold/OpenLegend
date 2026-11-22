//! Character control is an operational receipt with a native participation
//! transition. They use one protected prefix and one PostgreSQL transaction.

use crate::{
    authority::{
        AccessError, Authority, AuthorizedScope, Capability, ControlChange, ControlOperation,
        ControlRequest, DepartureControl, PendingExit, now_ms,
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
    runtime::{NativeWorldSession, RuntimeDirectOutput, RuntimeError, RuntimeParticipation},
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
        owner: presence.clone(),
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
        let scope = control.page().cloned().expect("due page departure");
        if !control.selected().await? {
            presence.departure_finished(&scope)?;
            continue;
        }
        let candidate = begin_absence(game, saves, presence, control, Exit::new(grace)).await?;
        if !candidate.outcome.ok {
            // Gameplay already denies an otherwise current loss, e.g. a
            // body that ceased participating before this transport closed.
            presence.departure_finished(&scope)?;
        }
    }
    while presence.elapsed_exit_due()? {
        let _barrier = saves.enter_protected().await?;
        if !presence.elapsed_exit_due()? {
            return Ok(());
        }
        let next = presence.next_elapsed_exit().await?;
        let Some(pending) = next else {
            presence.elapsed_exit_checked(None)?;
            return Ok(());
        };
        if pending.deadline > now_ms() {
            presence.elapsed_exit_checked(Some(pending.deadline))?;
            return Ok(());
        }
        let operation = RuntimeParticipation::Depart(pending.id.clone());
        let candidate = apply(
            game,
            saves,
            pending.account.clone(),
            pending.actor.clone(),
            operation,
            HostParticipation::Elapsed(pending),
        )
        .await?;
        if !candidate.outcome.ok {
            return Err(StoreError::InvalidRecord.into());
        }
    }
    Ok(())
}

/// A stopped game's lack of sockets does not start a physical departure.
/// Before ordinary time can resume, reconcile the saved bodies once against
/// the currently verified controllers. The accepted writer owns each effect.
pub(crate) async fn reconcile_restored(
    game: &Arc<CurrentServer>,
    saves: &Arc<LiveSaves>,
    presence: &Arc<Presence>,
    grace: Duration,
) -> Result<(), WorldError> {
    if !presence.restored_due()? {
        return Ok(());
    }
    let _barrier = saves.enter_protected().await?;
    if !presence.restored_due()?
        || !presence.visible()?
        || game
            .world
            .capture(NativeWorldSession::clock)
            .await?
            .manually_paused
    {
        return Ok(());
    }
    let restored = game
        .world
        .capture(NativeWorldSession::restored_players)
        .await?;
    for (actor, account) in restored.players {
        let Some(control) = presence.fence_unattended(actor, account)? else {
            continue;
        };
        let exit = control
            .previous_attempt()
            .await?
            .map(|(id, deadline)| Exit { id, deadline })
            .unwrap_or_else(|| Exit::new(grace));
        let candidate = begin_absence(game, saves, presence, control, exit).await?;
        if !candidate.outcome.ok {
            return Err(StoreError::InvalidRecord.into());
        }
    }
    presence.restored_checked()?;
    Ok(())
}

async fn begin_absence(
    game: &Arc<CurrentServer>,
    saves: &Arc<LiveSaves>,
    presence: &Arc<Presence>,
    control: DepartureControl,
    exit: Exit,
) -> Result<PreparedControl, WorldError> {
    let operation = if control.page().is_some() {
        RuntimeParticipation::BeginExit(exit.id.clone())
    } else {
        RuntimeParticipation::ReconcileExit(exit.id.clone())
    };
    let account = control.account().to_owned();
    let actor = control.actor().to_owned();
    let host = HostParticipation::Loss {
        control,
        presence: presence.clone(),
        exit,
    };
    apply(game, saves, account, actor, operation, host).await
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
        owner: Arc<Presence>,
    },
    Loss {
        control: DepartureControl,
        presence: Arc<Presence>,
        exit: Exit,
    },
    Elapsed(PendingExit),
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
            Self::Elapsed(attempt) => attempt.validate(tx).await,
        }
    }

    fn confirmed(self) -> Result<(), AccessError> {
        match self {
            Self::Browser {
                control,
                presence,
                exit,
                owner,
            } => {
                presence.confirmed(control)?;
                if let Some(exit) = exit {
                    owner.installed_exit(exit.deadline)?;
                }
            }
            Self::Loss {
                control,
                presence,
                exit,
            } => {
                if let Some(scope) = control.page() {
                    presence.departure_finished(scope)?;
                }
                presence.installed_exit(exit.deadline)?;
            }
            Self::Elapsed(_) => {}
        }
        Ok(())
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
