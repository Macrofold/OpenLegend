//! A due completed-day review retains its selection and progress even if a
//! funded partition fails. Its successful effects use one protected save.

use super::super::settings::SummaryModel;
use super::hourly::{collect, following, prepare_inference, require_live, save_marker};
use crate::{
    boot::CurrentServer,
    decision_dispatch::DecisionDispatch,
    live_save::LiveSaves,
    recall_maintenance::{self, ConsolidationOutcome, DailySelection, PublicationConsent},
    store::{CommitError, StoreError},
    world::WorldError,
};
use openlegend_simulation::{
    encoding::{json_record, json_record_len, sha256_hex},
    runtime::{RuntimeConsolidationBinding, RuntimeError},
};
use std::sync::Arc;
use tokio::{sync::watch, time::Instant};

pub(super) async fn run(
    game: &Arc<CurrentServer>,
    saves: &Arc<LiveSaves>,
    dispatch: &Arc<DecisionDispatch>,
    model: &SummaryModel,
    planned: DailySelection,
    stopped: watch::Receiver<bool>,
) -> Result<f64, WorldError> {
    let deadline = Instant::now() + model.timeout;
    let DailySelection {
        review,
        selection,
        next,
        attempt,
        episode,
        tomorrow,
    } = planned;
    let head = selection.head.clone();
    let identity = (
        &head.world_id,
        &head.generation,
        &review.timeline,
        &selection.actor,
        next.day,
        selection.through_revision,
        &selection.selection,
    );
    let bytes = json_record_len(&identity).map_err(RuntimeError::application_refused)?;
    let mut custody = selection.custody;
    custody
        .resize(
            custody
                .bytes()
                .checked_add(bytes.checked_mul(3).ok_or(StoreError::Capacity)?)
                .ok_or(StoreError::Capacity)?,
        )
        .map_err(RuntimeError::from)?;
    let canonical = json_record(&identity).map_err(RuntimeError::application_refused)?;
    let job = format!("memory-review:{}", sha256_hex(canonical.as_bytes()));
    drop(canonical);
    let settings = &game.store.schema.recall.maintenance;
    let ticket = recall_maintenance::prepare(
        game,
        selection.head,
        selection.actor,
        RuntimeConsolidationBinding {
            job_id: job.clone(),
            selection: selection.selection,
            protected_importance: settings.protected_importance,
            summary_bytes: settings.summary_bytes,
            requires_body: true,
            dream_episode: Some(episode),
        },
        custody,
    )
    .await?;
    let prepared = prepare_inference(game, ticket, true).await?;
    require_live(&stopped, deadline)?;
    // Keep the last committed position as the failure cursor until both the
    // inference and its protected publication have completed.
    let marker = save_marker(game, &head, review.write(&attempt)?).await?;
    let answer = match collect(model, dispatch, game, &stopped, deadline, &job, prepared).await {
        Ok(answer) => answer,
        Err(error) => {
            eprintln!("Daily memory inference finished without publication: {error}");
            return Ok(tomorrow);
        }
    };
    if require_live(&stopped, deadline).is_err() {
        return Ok(tomorrow);
    }
    let cursor = following(&marker, &next, game.host.budget())?;
    match recall_maintenance::apply(
        game,
        saves,
        answer.ticket,
        answer.groups,
        answer.allocation,
        answer.dream,
        PublicationConsent {
            stop: stopped,
            deadline,
        },
        Some(cursor),
    )
    .await
    {
        Ok(ConsolidationOutcome::Published) if next.completed => Ok(tomorrow),
        Ok(ConsolidationOutcome::Published) => Ok(0.),
        Err(error @ WorldError::Commit(CommitError::Unknown(_))) => Err(error),
        Err(error) => {
            eprintln!("Daily memory publication refused: {error}");
            Ok(tomorrow)
        }
        Ok(_) => Ok(tomorrow),
    }
}
