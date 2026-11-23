//! Schedule one native account-aging slice at a time. It uses the ordinary
//! accepted-world and save lanes, independent of NPC or caller traffic.

use crate::{
    boot::CurrentServer,
    live_save::LiveSaves,
    store::StoreError,
    world::{ApplicationStart, WorldError},
};
use openlegend_simulation::runtime::{RuntimeDirectOutput, RuntimeError};
use std::{
    sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    },
    time::Duration,
};
use tokio::{
    sync::watch,
    time::{Instant, MissedTickBehavior},
};

const INTERVAL: Duration = Duration::from_millis(250);

pub(super) async fn run(
    game: Arc<CurrentServer>,
    saves: Arc<LiveSaves>,
    stop: watch::Receiver<bool>,
) -> Result<(), WorldError> {
    let limits = game.store.account_retention_limits()?;
    let cursor = Arc::new(AtomicUsize::new(0));
    let mut timer = tokio::time::interval(INTERVAL);
    timer.set_missed_tick_behavior(MissedTickBehavior::Skip);
    loop {
        tokio::select! {
            biased;
            _ = super::stopped(stop.clone()) => return Ok(()),
            _ = timer.tick() => (),
        }
        if saves.has_failed() {
            continue;
        }
        let work = async {
            let _ordinary = saves.enter_ordinary().await;
            saves.check_admission(Instant::now())?;
            let prepare = game.store.clone();
            let cursor = cursor.clone();
            let provider = game.clone();
            let stage = saves.clone();
            let publish = saves.clone();
            let settle = game.world.clone();
            game.world
                .execute_and_publish(
                    #[cfg(feature = "profile-campaign")]
                    openlegend_simulation::profile::sites::TURN_OTHER,
                    move |session| {
                        let mut next = cursor.load(Ordering::Relaxed);
                        let candidate = session.begin_resident_account_retention(
                            &mut next,
                            limits,
                            prepare.account_summary_prefix(),
                        );
                        cursor.store(next, Ordering::Relaxed);
                        Ok(candidate?.map_or(
                            ApplicationStart::Existing(None),
                            ApplicationStart::Candidate,
                        ))
                    },
                    move |question| {
                        let provider = provider.clone();
                        async move { provider.answer_operation(question).await }
                    },
                    move |product, _| match product {
                        RuntimeDirectOutput::Prepared(product) if product.outcome().ok => {
                            stage.stage(&product, None).map(Some)
                        }
                        RuntimeDirectOutput::Prepared(_) => Ok(None),
                        RuntimeDirectOutput::Preview(_) => Err(RuntimeError::application_refused(
                            "Account retention cannot preview",
                        )),
                    },
                    move |fence, key, input| {
                        if let Some(actor) = input.as_ref().and_then(|input| input.aged_actor()) {
                            return settle
                                .with_unedited_history(actor, || Ok(fence.settle(key, true)?))?
                                .map_or_else(|| Ok(fence.settle(key, false)?), Ok);
                        }
                        Ok(fence.settle(key, input.is_some())?)
                    },
                    move |accepted| {
                        if let Some(input) = accepted {
                            publish.accept(input);
                        }
                    },
                )
                .await
        };
        tokio::select! {
            biased;
            _ = super::stopped(stop.clone()) => return Ok(()),
            result = work => match result {
                Ok(_) | Err(WorldError::Storage(StoreError::StaleCut | StoreError::WriterUnavailable)) => (),
                Err(error) if error.is_admission_refusal() => (),
                Err(error) => {
                    eprintln!("Account retention deferred: {error}");
                    tokio::select! {
                        _ = super::stopped(stop.clone()) => return Ok(()),
                        _ = tokio::time::sleep(Duration::from_secs(60)) => (),
                    }
                    timer.reset();
                }
            },
        }
    }
}
