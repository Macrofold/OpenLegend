//! A creator works with NPCs visible to their signed character. Each selector
//! is resolved again on the actual native mutation turn before an intention.
use crate::{
    authority::AccessError,
    lab::{LabOperator, LabRuntime},
    player_references::ReferenceIssuer,
    world::WorldError,
};
use openlegend_simulation::{
    host::ByteBudget,
    runtime::{NativeWorldSession, RuntimeError},
};

/// Resolve an already issued visible contact. The role must remain NPC-owned,
/// alive, in the same physical life and available to this operator's private
/// audience. The caller must already hold Create and Inspect on this same cut.
pub(crate) fn resolve_subject(
    session: &NativeWorldSession,
    references: &ReferenceIssuer,
    scope: &crate::authority::RequestScope,
    reference: &str,
    budget: &ByteBudget,
) -> Result<Option<String>, RuntimeError> {
    let Some(contact) = references.resolve_contact(session, scope, reference, budget)? else {
        return Ok(None);
    };
    let Some(life) = contact.life else {
        return Ok(None);
    };
    if !session.npc_schedule_enrolled(&contact.id)?
        || !session.intelligence_person_current(
            &scope.account_id,
            &scope.actor_id,
            &contact.id,
            life,
        )?
    {
        return Ok(None);
    }
    Ok(Some(contact.id))
}

/// Resolve a signed visible NPC for preparatory work. A later write must
/// re-resolve the reference under its own current actor and permission fence.
pub(crate) async fn npc_subject(
    runtime: &LabRuntime,
    op: &LabOperator,
    reference: String,
) -> Result<String, WorldError> {
    let authority = runtime.authority.clone();
    let scope = op.scope.clone();
    let references = runtime.references.clone();
    let budget = runtime.game.host.budget().clone();
    runtime
        .game
        .world
        .capture(move |session| {
            Ok(authority.current_recall_operator(&scope, true, |fields| {
                resolve_subject(session, &references, fields, &reference, &budget)
            }))
        })
        .await???
        .ok_or_else(|| WorldError::Access(AccessError::Changed))
}

use crate::access_http::{access_failure, refusal};
use axum::{
    Extension, Json, Router,
    extract::{DefaultBodyLimit, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::post,
};
use openlegend_simulation::{text::JsText, worlds::base_observed::SpeechVolume};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum Kind {
    Say,
    Act,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Stimulus {
    pub request_id: Uuid,
    pub actor_id: String,
    pub target_id: Option<String>,
    pub focal_actor_id: Option<String>,
    pub kind: Kind,
    pub text: JsText,
    pub volume: Option<SpeechVolume>,
}

pub(super) fn router() -> Router<Arc<LabRuntime>> {
    Router::new()
        .route("/decisions/stimuli", post(issue))
        .layer(DefaultBodyLimit::max(32 * 1024))
}

async fn issue(
    State(lab): State<Arc<LabRuntime>>,
    Extension(op): Extension<LabOperator>,
    Json(stimulus): Json<Stimulus>,
) -> Response {
    if stimulus.text.trim_is_empty()
        || (stimulus.kind == Kind::Act
            && (stimulus.text.units_len() > 240 || stimulus.volume.is_some()))
        || (stimulus.kind == Kind::Say && stimulus.target_id.is_none())
    {
        return refusal(
            StatusCode::BAD_REQUEST,
            "invalid-stimulus",
            "Select a recipient for speech. A descriptive action must fit its 240-character limit.",
        );
    }
    if !op.present().unwrap_or(false) {
        return access_failure(AccessError::Changed);
    }
    match lab.decisions.submit_authored(lab.clone(),op,stimulus).await {
        Ok(job)=>Json(serde_json::json!({"ok":true,"jobId":job.job.id,"status":job.job.status,
            "eventId":job.job.request.composer.as_ref().and_then(|c|c.event_id.as_ref()),"outcome":job.job.outcome})).into_response(),
        Err(WorldError::Access(e))=>access_failure(e),
        Err(_) => refusal(StatusCode::CONFLICT,"stimulus-unavailable","The stimulus could not be admitted. Check the current character, target, action and decision status."),
    }
}

/// Temporarily allow ordinary command admission for one operator intent. The
/// clock's elapsed offers stay held across the edit, including disconnects.
pub(crate) async fn admit(
    lab: Arc<LabRuntime>,
    op: LabOperator,
    stimulus: Stimulus,
) -> Result<Arc<crate::store::AdmittedJob>, WorldError> {
    during_intent(&lab,&op,lab.decisions.accept_authored(lab.clone(),op.clone(),stimulus)).await
}

/// Freeze elapsed clock offers while the normal signed command owner admits a
/// Lab stimulus. Resume its previous manual clock setting on every exit.
pub(crate) async fn during_intent<T>(lab:&LabRuntime, op:&LabOperator, work:impl std::future::Future<Output=Result<T,WorldError>>)->Result<T,WorldError>{
    let controls = lab
        .decisions
        .lab_controls()
        .ok_or(AccessError::Availability)?;
    let _serial = controls.transition.lock().await;
    if controls.lease().is_some() {
        return Err(AccessError::Busy.into());
    }
    lab.authority
        .current_recall_operator(&op.scope, true, |_| ())?;
    let clock = lab.game.world.capture(NativeWorldSession::clock).await?;
    controls
        .state
        .lock()
        .map_err(|_| AccessError::Availability)?
        .starting = true;
    let mut opening = super::Opening {
        control: controls,
        was_paused: clock.manually_paused,
        completed: false,
    };
    if clock.manually_paused {
        lab.clock
            .manual_control(lab.authority.clone(), op.scope.clone(), Some(false), None)
            .await?;
    }
    let receipt = work.await;
    if clock.manually_paused {
        lab.clock.hold_opened_lab().await?;
    }
    opening.completed = true;
    receipt
}
