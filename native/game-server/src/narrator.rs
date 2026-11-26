//! One bounded private Journal worker. Source selection lives with the
//! installed story policy, and the worker grants no memory or world effects.

use crate::{
    authority::{AccessError, Authority, now_ms},
    boot::CurrentServer,
    decision_dispatch::{CallFailure, DecisionDispatch, ProviderDisclosure},
    live_save::LiveSaves,
    store::{ClaimedStory, OptionalStorySource, StoryOutput},
    world::{NpcDisclosure, NpcDisclosureTurn, WorldError, narrator::StoryDisclosure},
};
use std::{sync::Arc, time::Duration};
use tokio::{
    sync::{Notify, watch},
    time::Instant,
};

mod model;
pub(crate) use model::{NarratorMacrofold, NarratorModel};

impl ProviderDisclosure for StoryDisclosure {
    async fn grant_for_send(
        &self,
    ) -> Result<Option<tokio::sync::OwnedMutexGuard<()>>, CallFailure> {
        let (owner, actor) = self.claim.principal();
        let revision = self
            .claim
            .grant_revision
            .ok_or(CallFailure::Authority(AccessError::Changed))?;
        self.authority
            .background_grant(&self.claim.head.world_id, owner, actor, revision)
            .await
            .map(Some)
            .map_err(CallFailure::Authority)
    }

    fn start(
        &self,
        turn: NpcDisclosureTurn<'_>,
        stopped: &watch::Receiver<bool>,
        start: &mut dyn FnMut(),
    ) -> Result<(), CallFailure> {
        if *stopped.borrow() {
            return Err(CallFailure::Cancelled);
        }
        match turn
            .disclose_story(self, start)
            .map_err(CallFailure::World)?
        {
            Ok(()) => Ok(()),
            Err(NpcDisclosure::Busy) => Err(CallFailure::Stale("story-world-busy")),
            Err(NpcDisclosure::Refused(reason)) => Err(CallFailure::Stale(reason)),
        }
    }
}

/// Drain only durable work; a pending provider keeps its accounted request
/// through cancellation. Idle gameplay does not query the Journal queue.
pub(crate) async fn run(
    game: Arc<CurrentServer>,
    saves: Arc<LiveSaves>,
    dispatch: Arc<DecisionDispatch>,
    authority: Arc<Authority>,
    model: Option<NarratorModel>,
    world: String,
    batch_ms: u64,
    wake: Arc<Notify>,
    mut stop: watch::Receiver<bool>,
) -> Result<(), WorldError> {
    game.store
        .recover_stories(world.clone())
        .await
        .map_err(WorldError::Commit)?;
    let mut changes = saves.subscribe();
    while !*stop.borrow() {
        let Some(due) = game.store.next_story_due(world.clone()).await? else {
            tokio::select! { _ = stop.changed() => break, _ = wake.notified() => continue }
        };
        let ready = due.saturating_add(batch_ms as i64);
        let delay = Duration::from_millis(ready.saturating_sub(now_ms()).max(0) as u64);
        if !delay.is_zero() {
            tokio::select! {
                _=stop.changed()=>break,
                _=wake.notified()=>continue,
                _=tokio::time::sleep(delay)=>{},
            }
        }
        let paused = game
            .world
            .capture(|session| Ok(session.clock()?.paused))
            .await?;
        if paused {
            tokio::select! { _=stop.changed()=>break, result=changes.changed()=>if result.is_err(){ break; }, }
            continue;
        }
        let Some(claim) = game
            .store
            .claim_story(world.clone(), now_ms().saturating_sub(batch_ms as i64))
            .await
            .map_err(WorldError::Commit)?
        else {
            continue;
        };
        let claim = Arc::new(claim);
        let output = story_output(
            &game,
            &dispatch,
            &authority,
            model.as_ref(),
            claim.clone(),
            stop.clone(),
        )
        .await;
        let (output, captured) = output?;
        // Match the ordinary publication boundary without borrowing native
        // state during SQL. Protected edits and world advances cannot pass
        // the final check while the short, already prepared write commits.
        let _ordinary = saves.enter_ordinary().await;
        let (output, _turn) = if let Some(disclosure) = captured {
            let turn = game.world.npc_disclosure_turn().await?;
            let output = match turn.disclose_story(&disclosure, || ())? {
                Ok(()) => output,
                Err(_) => StoryOutput::Revoked,
            };
            (output, Some(turn))
        } else {
            (output, None)
        };
        if game
            .store
            .finish_story(claim, output)
            .await
            .map_err(WorldError::Commit)?
        {
            saves.signal_view();
        }
    }
    Ok(())
}

async fn story_output(
    game: &Arc<CurrentServer>,
    dispatch: &Arc<DecisionDispatch>,
    authority: &Arc<Authority>,
    model: Option<&NarratorModel>,
    claim: Arc<ClaimedStory>,
    stop: watch::Receiver<bool>,
) -> Result<(StoryOutput, Option<StoryDisclosure>), WorldError> {
    let budget = game.host.budget();
    let bound = Arc::new(Vec::new());
    let Some(required) = game
        .store
        .story_current(claim.clone(), bound.clone())
        .await?
    else {
        return Ok((StoryOutput::Revoked, None));
    };
    let Some(fallback) = game
        .world
        .capture_story(authority.clone(), claim.clone(), required)
        .await?
    else {
        return Ok((StoryOutput::Revoked, None));
    };
    let Some(model) = model else {
        return Ok((
            StoryOutput::Failed("No configured narration provider."),
            Some(fallback),
        ));
    };
    let Some(language) = game.language().cloned() else {
        return Ok((
            StoryOutput::Failed("Narration evidence formatting is unavailable."),
            Some(fallback),
        ));
    };
    let rows = game.store.story_optional_sources(claim.clone()).await?;
    let preparation = budget.clone();
    let optional = Arc::new(
        game.host
            .compute(move || rows.prepare(&language, &preparation))
            .await??,
    );
    let Some(revisions) = game
        .store
        .story_current(claim.clone(), optional.clone())
        .await?
    else {
        return Ok((StoryOutput::Revoked, None));
    };
    let Some(permit) = game
        .world
        .capture_story(authority.clone(), claim.clone(), revisions)
        .await?
    else {
        return Ok((StoryOutput::Revoked, None));
    };
    let deadline = Instant::now() + model.timeout;
    let generated = model
        .generate(dispatch, permit, &claim, &optional, budget, deadline, stop)
        .await;
    match generated {
        Ok(response) => {
            let optional =
                Arc::try_unwrap(optional).map_err(|_| crate::store::StoreError::InvalidRecord)?;
            let cited_optional = optional
                .into_iter()
                .zip(response.selected)
                .filter_map(|(item, cited)| cited.then_some(item))
                .collect::<Vec<OptionalStorySource>>();
            // The newly cited set gets its own database/source witness for
            // publication. Independently retained sources remain funded.
            let cited = Arc::new(cited_optional);
            let Some(revisions) = game
                .store
                .story_current(claim.clone(), cited.clone())
                .await?
            else {
                return Ok((StoryOutput::Revoked, None));
            };
            let Some(permit) = game
                .world
                .capture_story(authority.clone(), claim, revisions)
                .await?
            else {
                return Ok((StoryOutput::Revoked, None));
            };
            let cited_optional =
                Arc::try_unwrap(cited).map_err(|_| crate::store::StoreError::InvalidRecord)?;
            Ok((
                StoryOutput::Generated {
                    text: response.text,
                    cited_optional,
                    _custody: response.custody,
                },
                Some(permit),
            ))
        }
        Err(CallFailure::Stale(_)) => Ok((StoryOutput::Revoked, None)),
        Err(error) => {
            let reason = match error.cause().1 {
                CallFailure::Stale(_) | CallFailure::Authority(_) => {
                    return Ok((StoryOutput::Revoked, None));
                }
                CallFailure::Cancelled => "Narration cancelled.",
                CallFailure::Admission => "Monthly Narrator allowance exhausted.",
                CallFailure::Invalid => "Invalid narration output or source coverage.",
                _ => "Narration generation unavailable.",
            };
            Ok((StoryOutput::Failed(reason), Some(fallback)))
        }
    }
}
