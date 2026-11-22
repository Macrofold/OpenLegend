//! Due memory work shares accepted actor wakes and the existing per-character
//! decision place. Its SQL and protected publication have their own task.

use super::{
    Director,
    schedule::ScheduleInbox,
    slots::{Admission, SlotPriority},
};
use crate::{
    recall_maintenance::{ReviewFollowUp, review_protected_day},
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
mod hourly;

const INSPECTION_INTERVAL: Duration = Duration::from_secs(1);
const READ_BACKOFF: Duration = Duration::from_secs(60);

struct DueActor {
    episode: Option<String>,
    generation: Option<String>,
    next_game: f64,
    next_real: Instant,
    dirty: bool,
    next_hourly: f64,
    hourly_running: bool,
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
            hourly_running: false,
            custody,
        }
    }
}

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
            while let Some(joined) = paid.try_join_next() {
                finish_hourly(joined, &mut due);
            }
            let wake = inbox.take_maintenance();
            for (actor, custody) in wake.actors {
                due.entry(actor)
                    .and_modify(|owner: &mut DueActor| {
                        owner.dirty = true;
                        if owner.next_hourly == f64::INFINITY {
                            owner.next_hourly = 0.;
                        }
                    })
                    .or_insert_with(|| DueActor::new(custody));
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
                        && (actor.dirty
                            || actor.next_game <= clock.at
                            || self.summary_model.is_some()
                                && !actor.hourly_running
                                && actor.next_hourly <= clock.at)
                });
                if let Some(index) = selected {
                    let (actor, mut work) = due.shift_remove_index(index).expect("selected actor");
                    let inspect_daily = work.dirty || work.next_game <= clock.at;
                    work.dirty = false;
                    work.next_real = now + INSPECTION_INTERVAL;
                    let daily = if inspect_daily {
                        self.inspect_maintenance(&actor, &mut work).await
                    } else {
                        Ok(true)
                    };
                    match daily {
                        Ok(false) if self.summary_model.is_none() && !work.hourly_running => {
                            continue;
                        }
                        Ok(false) => (),
                        Ok(true) => (),
                        Err(WorldError::Host(HostError::Cancelled)) if *stop.borrow() => return,
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
                        && !work.hourly_running
                        && work.next_hourly <= clock.at
                    {
                        match self
                            .start_hourly(&actor, &mut work, &mut paid, stop.clone())
                            .await
                        {
                            Ok(()) => (),
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
                Some(joined) = paid.join_next(), if !paid.is_empty() => finish_hourly(joined, &mut due),
                _ = tokio::time::sleep(INSPECTION_INTERVAL), if reload || !due.is_empty() => (),
            }
        }
    }

    async fn inspect_maintenance(
        &self,
        actor: &str,
        work: &mut DueActor,
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
            ReviewFollowUp::RoutinePending => f64::INFINITY,
        };
        Ok(true)
    }

    async fn start_hourly(
        self: &Arc<Self>,
        actor: &str,
        work: &mut DueActor,
        tasks: &mut tokio::task::JoinSet<(String, Result<f64, WorldError>)>,
        mut service_stop: watch::Receiver<bool>,
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
        work.hourly_running = true;
        let actor = actor.to_owned();
        let director = self.clone();
        tasks.spawn(async move {
            let stopped = slot.resident.stop.subscribe();
            let future = hourly::run(
                &director.game,
                &director.saves,
                &director.dispatch,
                director.summary_model.as_ref().expect("admitted route"),
                selection,
                stopped,
            );
            tokio::pin!(future);
            let result = tokio::select! {
                result = &mut future => result,
                _ = async { let _ = service_stop.wait_for(|stopped| *stopped).await; } => {
                    slot.resident.stop.send_replace(true);
                    future.await
                }
            };
            (actor, result)
        });
        Ok(())
    }
}

fn finish_hourly(
    joined: Result<(String, Result<f64, WorldError>), tokio::task::JoinError>,
    due: &mut IndexMap<String, DueActor>,
) {
    let Ok((actor, result)) = joined else {
        eprintln!("An hourly memory worker stopped unexpectedly");
        for work in due.values_mut().filter(|work| work.hourly_running) {
            work.hourly_running = false;
            work.next_real = Instant::now() + READ_BACKOFF;
        }
        return;
    };
    let Some(work) = due.get_mut(&actor) else {
        return;
    };
    work.hourly_running = false;
    match result {
        Ok(next) => work.next_hourly = next,
        Err(error)
            if error.is_admission_refusal()
                || matches!(error, WorldError::Storage(StoreError::StaleCut)) =>
        {
            ()
        }
        Err(error) => {
            eprintln!("Hourly memory work deferred: {error}");
            work.next_real = Instant::now() + READ_BACKOFF;
        }
    }
}
