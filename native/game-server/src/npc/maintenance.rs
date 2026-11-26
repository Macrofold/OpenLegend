//! Due memory work shares accepted actor wakes and the existing per-character
//! decision place. Its SQL and protected publication have their own task.

use super::{
    Director,
    schedule::ScheduleInbox,
    slots::{Admission, DecisionSlot, SlotPriority},
};
use crate::{
    decision_dispatch::CallFailure,
    recall_maintenance::{DailySelection, ReviewFollowUp, review_protected_day},
    store::StoreError,
    world::WorldError,
};
use indexmap::IndexMap;
use openlegend_simulation::{
    host::ByteReservation,
    runtime::{NativeWorldSession, RuntimeError},
};
use openlegend_world_host::pool::HostError;
use std::{sync::Arc, time::Duration};
use tokio::{sync::watch, time::Instant};
mod daily;
mod hourly;
mod learning;
mod reflection;

const INSPECTION_INTERVAL: Duration = Duration::from_secs(1);
const READ_BACKOFF: Duration = Duration::from_secs(60);

struct DueActor {
    episode: Option<String>,
    generation: Option<String>,
    next_game: f64,
    next_real: Instant,
    dirty: bool,
    next_hourly: f64,
    next_learning: Option<Instant>,
    next_reflection: f64,
    paid: Option<tokio::task::Id>,
    custody: ByteReservation,
}

impl DueActor {
    fn new(custody: ByteReservation) -> Self {
        Self {
            episode: None,
            generation: None,
            next_game: 0.,
            next_real: Instant::now(),
            dirty: true,
            next_hourly: 0.,
            next_learning: None,
            next_reflection: 0.,
            paid: None,
            custody,
        }
    }
}

enum PaidWork {
    Hourly(hourly::Selected),
    Daily(DailySelection),
    Learning,
    Reflection(reflection::Selected),
}

enum PaidKind {
    Hourly,
    Daily,
    Learning,
    Reflection,
}

type PaidResult = (String, PaidKind, Result<f64, CallFailure>);

impl Director {
    pub(crate) async fn run_maintenance(
        self: Arc<Self>,
        inbox: Arc<ScheduleInbox>,
        mut stop: watch::Receiver<bool>,
    ) {
        let mut due = IndexMap::new();
        let mut paid = tokio::task::JoinSet::new();
        let mut reload = true;
        loop {
            if *stop.borrow() {
                while paid.join_next().await.is_some() {}
                return;
            }
            while let Some(joined) = paid.try_join_next_with_id() {
                finish_paid(joined, &mut due);
            }
            let wake = inbox.take_maintenance();
            for (actor, wake) in wake.actors {
                due.entry(actor)
                    .and_modify(|owner: &mut DueActor| {
                        owner.dirty = true;
                        if owner.next_hourly == f64::INFINITY {
                            owner.next_hourly = 0.;
                        }
                        if wake.reflection || owner.next_reflection == f64::INFINITY {
                            owner.next_reflection = 0.;
                        }
                    })
                    .or_insert_with(|| DueActor::new(wake.custody));
            }
            reload |= wake.all;
            if reload {
                let result = self
                    .game
                    .world
                    .capture(NativeWorldSession::npc_schedule_population)
                    .await;
                if let Ok(population) = result {
                    reload = false;
                    for owner in due.values_mut() {
                        owner.dirty = true;
                        owner.next_hourly = 0.;
                        owner.next_reflection = 0.;
                    }
                    for actor in population.actors {
                        if !due.contains_key(&actor) {
                            if let Ok(custody) = self.game.host.budget().reserve(512 + actor.len())
                            {
                                due.insert(actor, DueActor::new(custody));
                            } else {
                                reload = true;
                            }
                        }
                    }
                }
            }
            let now = Instant::now();
            if due.values().any(|actor| actor.next_real <= now)
                && let Ok(clock) = self.game.world.capture(NativeWorldSession::clock).await
                && !clock.paused
            {
                let selected = due.values().position(|actor| {
                    actor.next_real <= now
                        && actor.paid.is_none()
                        && (actor.dirty
                            || actor.next_game <= clock.at
                            || actor.next_learning.is_some_and(|time| time <= now)
                            || self.reflection_model.is_some() && actor.next_reflection <= clock.at
                            || self.summary_model.is_some() && actor.next_hourly <= clock.at)
                });
                if let Some(index) = selected {
                    let (actor, mut work) = due.shift_remove_index(index).expect("selected actor");
                    let inspect_daily = work.dirty || work.next_game <= clock.at;
                    let inspect_learning =
                        work.next_learning.map_or(work.dirty, |time| time <= now);
                    work.dirty = false;
                    work.next_real = now + INSPECTION_INTERVAL;
                    if inspect_learning {
                        match self
                            .start_learning(&actor, &mut work, &mut paid, stop.clone())
                            .await
                        {
                            Ok(true) => {
                                work.dirty = inspect_daily;
                                due.insert(actor, work);
                                continue;
                            }
                            Ok(false) => (),
                            Err(WorldError::Host(HostError::Cancelled)) if *stop.borrow() => {
                                continue;
                            }
                            Err(error) if error.is_admission_refusal() => {
                                work.next_learning = Some(now + INSPECTION_INTERVAL);
                            }
                            Err(error) => {
                                eprintln!("Activity learning selection deferred: {error}");
                                work.next_learning = Some(now + READ_BACKOFF);
                            }
                        }
                    }
                    let daily = if inspect_daily {
                        self.inspect_maintenance(&actor, &mut work, &mut paid, stop.clone())
                            .await
                    } else {
                        Ok(true)
                    };
                    match daily {
                        Ok(false)
                            if self.summary_model.is_none()
                                && self.reflection_model.is_none()
                                && work.next_learning.is_none() =>
                        {
                            continue;
                        }
                        Ok(_) => (),
                        Err(WorldError::Host(HostError::Cancelled)) if *stop.borrow() => continue,
                        Err(error)
                            if error.is_admission_refusal()
                                || matches!(error, WorldError::Storage(StoreError::StaleCut)) =>
                        {
                            ()
                        }
                        Err(error) => {
                            eprintln!("Memory maintenance inspection deferred: {error}");
                            work.next_real = now + READ_BACKOFF;
                            work.dirty = true;
                        }
                    }
                    if self.summary_model.is_some()
                        && work.paid.is_none()
                        && work.next_hourly <= clock.at
                    {
                        match self
                            .start_hourly(&actor, &mut work, &mut paid, stop.clone())
                            .await
                        {
                            Ok(()) => (),
                            Err(WorldError::Host(HostError::Cancelled)) if *stop.borrow() => {
                                continue;
                            }
                            Err(error)
                                if error.is_admission_refusal()
                                    || matches!(
                                        error,
                                        WorldError::Storage(StoreError::StaleCut)
                                    ) =>
                            {
                                ()
                            }
                            Err(error) => {
                                eprintln!("Hourly memory selection deferred: {error}");
                                work.next_real = now + READ_BACKOFF;
                            }
                        }
                    }
                    if self.reflection_model.is_some()
                        && work.paid.is_none()
                        && work.next_reflection <= clock.at
                    {
                        match self
                            .start_reflection(&actor, &mut work, &mut paid, stop.clone())
                            .await
                        {
                            Ok(()) => (),
                            Err(WorldError::Host(HostError::Cancelled)) if *stop.borrow() => {
                                continue;
                            }
                            Err(error)
                                if error.is_admission_refusal()
                                    || matches!(
                                        error,
                                        WorldError::Storage(StoreError::StaleCut)
                                    ) =>
                            {
                                ()
                            }
                            Err(error) => {
                                eprintln!("Reflection selection deferred: {error}");
                                work.next_real = now + READ_BACKOFF;
                            }
                        }
                    }
                    due.insert(actor, work);
                    continue;
                }
                for actor in due.values_mut().filter(|actor| actor.next_real <= now) {
                    actor.next_real = now + INSPECTION_INTERVAL;
                }
            }
            tokio::select! {
                _ = stop.changed() => (),
                _ = inbox.maintenance_ready() => (),
                Some(joined) = paid.join_next_with_id(), if !paid.is_empty() => finish_paid(joined, &mut due),
                _ = tokio::time::sleep(INSPECTION_INTERVAL), if reload || !due.is_empty() => (),
            }
        }
    }

    async fn start_learning(
        self: &Arc<Self>,
        actor: &str,
        work: &mut DueActor,
        tasks: &mut tokio::task::JoinSet<PaidResult>,
        service_stop: watch::Receiver<bool>,
    ) -> Result<bool, WorldError> {
        let id = actor.to_owned();
        let Some(generation) = self
            .game
            .world
            .capture(move |world| world.activity_learning_due(&id))
            .await?
        else {
            work.next_learning = None;
            return Ok(false);
        };
        let slot_id = format!("activity-learning:{actor}");
        let Admission::Accepted(slot) =
            self.slots
                .select(actor, &slot_id, None, &generation, SlotPriority::Ordinary)?
        else {
            work.next_learning = Some(Instant::now() + INSPECTION_INTERVAL);
            return Ok(false);
        };
        work.next_learning = Some(Instant::now() + READ_BACKOFF);
        work.paid =
            Some(self.start_inference(actor, tasks, slot, PaidWork::Learning, service_stop));
        Ok(true)
    }

    async fn inspect_maintenance(
        self: &Arc<Self>,
        actor: &str,
        work: &mut DueActor,
        tasks: &mut tokio::task::JoinSet<PaidResult>,
        service_stop: watch::Receiver<bool>,
    ) -> Result<bool, WorldError> {
        let id = actor.to_owned();
        let Some(scope) = self
            .game
            .world
            .capture(move |world| world.dream_review(&id))
            .await?
        else {
            work.episode = None;
            work.next_game = f64::INFINITY;
            return Ok(false);
        };
        if work.episode.as_deref() != Some(scope.episode.as_str())
            || work.generation.as_deref() != Some(scope.generation.as_str())
        {
            work.custody
                .resize(512 + actor.len() + scope.episode.len() + scope.generation.len())
                .map_err(RuntimeError::from)?;
            work.episode = Some(scope.episode.clone());
            work.generation = Some(scope.generation.clone());
            work.next_game = scope.ready_at;
        }
        if scope.at < work.next_game || !scope.available || scope.at < scope.ready_at {
            return Ok(true);
        }
        let slot_id = format!("memory-review:{actor}");
        let Admission::Accepted(slot) = self.slots.select(
            actor,
            &slot_id,
            None,
            &scope.generation,
            SlotPriority::Ordinary,
        )?
        else {
            return Ok(true);
        };
        let stop = slot.resident.stop.subscribe();
        let deadline = Instant::now() + super::ADMISSION_WAIT;
        let result = review_protected_day(
            &self.game,
            &self.saves,
            actor.to_owned(),
            scope,
            stop,
            deadline,
        )
        .await?;
        work.next_game = match result {
            ReviewFollowUp::Tomorrow(at) => at,
            ReviewFollowUp::NextPartition => 0.,
            ReviewFollowUp::RoutinePending(plan) => {
                if self.summary_model.is_some() {
                    work.paid = Some(self.start_inference(
                        actor,
                        tasks,
                        slot,
                        PaidWork::Daily(plan),
                        service_stop,
                    ));
                    0.
                } else {
                    f64::INFINITY
                }
            }
        };
        Ok(true)
    }

    async fn start_hourly(
        self: &Arc<Self>,
        actor: &str,
        work: &mut DueActor,
        tasks: &mut tokio::task::JoinSet<PaidResult>,
        service_stop: watch::Receiver<bool>,
    ) -> Result<(), WorldError> {
        let id = actor.to_owned();
        let Some(scope) = self
            .game
            .world
            .capture(move |world| world.hourly_review(&id))
            .await?
        else {
            work.next_hourly = f64::INFINITY;
            return Ok(());
        };
        if !scope.available {
            return Ok(());
        }
        let generation = scope.generation.clone();
        let selection = match hourly::plan(&self.game, actor, scope, service_stop.clone()).await? {
            hourly::Plan::Wait(at) => {
                work.next_hourly = at;
                return Ok(());
            }
            hourly::Plan::Ready(selection) => selection,
        };
        let slot_id = format!("hourly-memory:{actor}");
        let Admission::Accepted(slot) =
            self.slots
                .select(actor, &slot_id, None, &generation, SlotPriority::Ordinary)?
        else {
            return Ok(());
        };
        work.paid = Some(self.start_inference(
            actor,
            tasks,
            slot,
            PaidWork::Hourly(selection),
            service_stop,
        ));
        Ok(())
    }

    async fn start_reflection(
        self: &Arc<Self>,
        actor: &str,
        work: &mut DueActor,
        tasks: &mut tokio::task::JoinSet<PaidResult>,
        service_stop: watch::Receiver<bool>,
    ) -> Result<(), WorldError> {
        let (selected, tomorrow) =
            match reflection::plan(self, actor, work.next_reflection == 0.).await? {
                reflection::Plan::Wait(at) => {
                    work.next_reflection = at;
                    return Ok(());
                }
                reflection::Plan::Ready(selected, tomorrow) => (selected, tomorrow),
            };
        let Admission::Accepted(slot) = self.slots.select(
            actor,
            &selected.scope.attempt,
            None,
            &selected.scope.generation,
            SlotPriority::Ordinary,
        )?
        else {
            return Ok(());
        };
        work.next_reflection = tomorrow;
        work.paid = Some(self.start_inference(
            actor,
            tasks,
            slot,
            PaidWork::Reflection(selected),
            service_stop,
        ));
        Ok(())
    }

    fn start_inference(
        self: &Arc<Self>,
        actor: &str,
        tasks: &mut tokio::task::JoinSet<PaidResult>,
        slot: DecisionSlot,
        work: PaidWork,
        mut service_stop: watch::Receiver<bool>,
    ) -> tokio::task::Id {
        let actor = actor.to_owned();
        let director = self.clone();
        tasks
            .spawn(async move {
                let stopped = slot.resident.stop.subscribe();
                let kind = match &work {
                    PaidWork::Hourly(_) => PaidKind::Hourly,
                    PaidWork::Daily(_) => PaidKind::Daily,
                    PaidWork::Learning => PaidKind::Learning,
                    PaidWork::Reflection(_) => PaidKind::Reflection,
                };
                let learner = actor.clone();
                let future = async move {
                    match work {
                        PaidWork::Hourly(plan) => hourly::run(
                            &director.game,
                            &director.saves,
                            &director.dispatch,
                            director.summary_model.as_ref().expect("admitted route"),
                            plan,
                            stopped,
                        )
                        .await
                        .map_err(CallFailure::World),
                        PaidWork::Daily(plan) => daily::run(
                            &director.game,
                            &director.saves,
                            &director.dispatch,
                            director.summary_model.as_ref().expect("admitted route"),
                            plan,
                            stopped,
                        )
                        .await
                        .map_err(CallFailure::World),
                        PaidWork::Learning => {
                            learning::run(director, learner, stopped).await.map(|()| 0.)
                        }
                        PaidWork::Reflection(selected) => {
                            reflection::run(director, selected, stopped)
                                .await
                                .map(|()| 0.)
                        }
                    }
                };
                tokio::pin!(future);
                let result = tokio::select! {
                    result = &mut future => result,
                    _ = async { let _ = service_stop.wait_for(|stopped| *stopped).await; } => {
                        slot.resident.stop.send_replace(true);
                        future.await
                    }
                };
                (actor, kind, result)
            })
            .id()
    }
}

fn finish_paid(
    joined: Result<(tokio::task::Id, PaidResult), tokio::task::JoinError>,
    due: &mut IndexMap<String, DueActor>,
) {
    let (actor, kind, result) = match joined {
        Ok((_, outcome)) => outcome,
        Err(error) => {
            eprintln!("A memory maintenance worker stopped unexpectedly");
            if let Some(work) = due.values_mut().find(|work| work.paid == Some(error.id())) {
                work.paid = None;
                work.next_real = Instant::now() + READ_BACKOFF;
                work.dirty = true;
            }
            return;
        }
    };
    let Some(work) = due.get_mut(&actor) else {
        return;
    };
    work.paid = None;
    match result {
        Ok(next) => match kind {
            PaidKind::Daily => work.next_game = next,
            PaidKind::Hourly => work.next_hourly = next,
            PaidKind::Learning => work.dirty = true,
            PaidKind::Reflection => (),
        },
        Err(error) => match error.cause().1 {
            CallFailure::Cancelled
            | CallFailure::Admission
            | CallFailure::Existing
            | CallFailure::Stale(_) => (),
            CallFailure::World(WorldError::Storage(StoreError::StaleCut)) => (),
            CallFailure::World(error) if error.is_admission_refusal() => (),
            _ => {
                eprintln!("Memory maintenance deferred: {error}");
                work.next_real = Instant::now() + READ_BACKOFF;
                work.dirty = true;
            }
        },
    }
}
