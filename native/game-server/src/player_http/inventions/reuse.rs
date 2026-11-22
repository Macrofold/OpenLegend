//! The existing Create panel can select a method the character already knows.
//! This is an explicit saved continuation with no provider or craft execution.

use super::*;
use crate::store::inventions::reuse::{
    CheckedRecipe, PreparedRecipe, RecipeChoice, ReuseOutcome, ReuseRequest, SavedOrigin,
};
use openlegend_simulation::values::deserialize_present_option;
use tokio_util::sync::CancellationToken;

// A 2,000-code-unit intent can occupy 12,000 bytes with JSON escaping.
// Use the existing Source ordinary JSON request envelope.
const REUSE_BODY_LIMIT: usize = 16 * 1024;

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
enum Mode {
    Invent,
    Workshop,
    Discuss,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Message {
    mode: Mode,
    world_id: String,
    request_id: String,
    conversation_id: String,
    text: JsText,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    continuation: Option<Continuation>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    candidate: Option<Box<RawValue>>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    session_id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    retry_of: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Continuation {
    parent_id: String,
    action: String,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    recipe_id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    candidate_digest: Option<String>,
}

pub(crate) async fn submit(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(slot) = state.capacity.clone().try_acquire_owned() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let access = match scope(&state.authority, &parts.headers, None).await {
        Ok(access) => Arc::new(access),
        Err(error) => return access_failure(error),
    };
    let (input, custody): (Message, _) = match read_json(
        &parts.headers,
        body,
        state.game.host.budget(),
        false,
        REUSE_BODY_LIMIT,
    )
    .await
    {
        Ok(input) => input,
        Err(error) => return error,
    };
    if ![&input.world_id, &input.request_id, &input.conversation_id]
        .into_iter()
        .all(|id| valid_request_id(id))
    {
        return request_error();
    }
    let text = input.text.trimmed();
    if text.is_empty() || text.units_len() > 2000 {
        return request_error();
    }
    if input.world_id != access.scope.world_id {
        return refusal(
            StatusCode::CONFLICT,
            "world-mismatch",
            "This conversation belongs to another world.",
        );
    }
    if let Err(error) = state
        .authority
        .current(&access, Capability::Play, true, |_, _| ())
    {
        return access_failure(error);
    }
    let mode = match input.mode {
        Mode::Invent => None,
        Mode::Workshop => Some("workshop"),
        Mode::Discuss => return unsupported(),
    };
    let Some(choice) = input.continuation.filter(|choice| choice.action == "reuse") else {
        return unsupported();
    };
    let Some(recipe) = choice.recipe_id.filter(|id| valid_request_id(id)) else {
        return request_error();
    };
    if !valid_request_id(&choice.parent_id)
        || input.candidate.is_some()
        || input.session_id.is_some()
        || input.retry_of.is_some()
        || choice.candidate_digest.is_some()
    {
        return request_error();
    }
    let id = match human_request(&access.scope, &input.request_id) {
        Ok(id) => id,
        Err(error) => return failed(error),
    };

    let reuse = ReuseRequest {
        id,
        scope: access.scope.clone(),
        text,
        conversation_id: input.conversation_id,
        mode,
        choice: RecipeChoice {
            parent_id: choice.parent_id,
            action: "reuse",
            recipe_id: recipe,
        },
    };
    let cancelled = CancellationToken::new();
    let _cancel_on_disconnect = cancelled.clone().drop_guard();
    let (send, receive) = tokio::sync::oneshot::channel();
    let tracker = state.game.world.operations.clone();
    tracker.spawn(async move {
        let _slot = slot;
        let _input = custody;
        let result = complete(&state, &access, reuse, cancelled).await;
        let _ = send.send(result);
    });
    receive.await.unwrap_or_else(|_| busy())
}

async fn complete(
    state: &PlayerRoutes,
    access: &Arc<AuthorizedScope>,
    reuse: ReuseRequest,
    cancelled: CancellationToken,
) -> Response {
    let _gate = state.saves.enter_ordinary().await;
    if cancelled.is_cancelled() {
        return busy();
    }
    if let Err(error) = state
        .clock
        .maintenance()
        .allow_ordinary(&state.authority, access)
    {
        return failed(error);
    }
    if let Err(error) = state.saves.check_admission(tokio::time::Instant::now()) {
        return failed(error);
    }
    let captured = access.clone();
    let authority = state.authority.clone();
    let world = state.game.world.clone();
    let budget = state.game.host.budget().clone();
    let check_world = world.clone();
    let check_cancel = cancelled.clone();
    let mode = reuse.mode;
    let check = move |found: &InventionMatch, origin: &SavedOrigin, ready_life: Option<u64>| {
        if check_cancel.is_cancelled() {
            return Err(StoreError::Cancelled);
        }
        let checked = check_world.try_publication(|session| {
                let result = authority.current(&captured, Capability::Play, true, |permit,_| {
                    session.with_player_recipe_references(
                        &permit.account_id,
                        &permit.actor_id,
                        |recipes| {
                            let proof = recipes.reusable(
                                (&found.recipe_id, found.version, &found.digest),
                                (&origin.origin, origin.policy_revision),
                                mode == Some("workshop"),
                            );
                            match (proof, ready_life) {
                                (Err(code), _) => Ok(CheckedRecipe::Refused(code)),
                                (Ok((life, _)), Some(previous)) if previous == life => Ok(CheckedRecipe::Current),
                                (Ok(_), Some(_)) => Ok(CheckedRecipe::Refused("stale")),
                                (Ok((life, recipe)), None) => {
                                    let bytes = recipe.name.get().len().checked_mul(8)
                                        .and_then(|n| n.checked_add(recipe.digest.get().len()))
                                        .and_then(|n| n.checked_add(2048)).ok_or(StoreError::Capacity)?;
                                    let custody = budget.reserve(bytes).map_err(|_| StoreError::Capacity)?;
                                    let name: JsText = serde_json::from_str(recipe.name.get())
                                        .map_err(|_| StoreError::InvalidRecord)?;
                                    let suffix = " is available in Crafting. Selecting it has not consumed materials.";
                                    let message = JsText::from_units(name.units().chain(suffix.encode_utf16()).collect());
                                    Ok(CheckedRecipe::Prepared(PreparedRecipe {
                                        message, digest: recipe.digest.to_owned(), life, custody
                                    }))
                                }
                            }
                        },
                    )
                });
                match result {
                    Ok(value) => value.map(Some),
                    Err(_) => Ok(Some(Err(StoreError::Cancelled))),
                }
            });
        match checked {
            Ok(Some(result)) => result,
            Ok(None) => Err(StoreError::RuntimeCutBusy),
            Err(WorldError::Simulation(error)) if error.is_busy() => {
                Err(StoreError::RuntimeCutBusy)
            }
            Err(_) => Err(StoreError::WriterUnavailable),
        }
    };
    let reuse = Arc::new(reuse);
    let until = tokio::time::Instant::now() + REQUEST_TIMEOUT;
    let result = loop {
        world.request_advance_publication();
        let result = state
            .game
            .store
            .reuse_recipe(reuse.clone(), check.clone())
            .await;
        if !matches!(
            &result,
            Err(CommitError::RolledBack(StoreError::RuntimeCutBusy))
        ) {
            break result;
        }
        if let Err(error) = state
            .authority
            .current(access, Capability::Play, true, |_, _| ())
        {
            return access_failure(error);
        }
        if tokio::time::Instant::now() >= until {
            break result;
        }
        // The writer has confirmed rollback. Await the existing fair world
        // turn outside the transaction and recheck the same exact request.
        let turn = tokio::select! {
            _ = cancelled.cancelled() => break result,
            turn = tokio::time::timeout_at(until, world.clone().player_disclosure_turn()) => turn,
        };
        match turn {
            Ok(Ok(turn)) => drop(turn),
            Ok(Err(error)) => return failed(error),
            Err(_) => break result,
        }
    };
    if matches!(&result, Ok(ReuseOutcome::Completed { written: true, .. })) {
        state.saves.signal_view();
    }
    match state
        .authority
        .current(access, Capability::Play, true, |_, _| match result {
            Ok(ReuseOutcome::Completed {
                id,
                status,
                message,
                _custody,
                ..
            }) => reply(
                state,
                StatusCode::OK,
                &ResultView {
                    ok: !matches!(
                        status,
                        JobStatus::Failed | JobStatus::Cancelled | JobStatus::Stale
                    ),
                    code: status,
                    message: &message,
                    job_id: &id,
                    job_status: status,
                },
            ),
            Ok(ReuseOutcome::AlreadyContinued { child, _custody }) => reply(
                state,
                StatusCode::CONFLICT,
                &serde_json::json!({
                    "ok": false,
                    "code": "already-continued",
                    "message": "This request already has a follow-up. Refresh saved results.",
                    "jobId": child,
                }),
            ),
            Ok(ReuseOutcome::Refused(code)) => refused(code),
            Err(CommitError::RolledBack(StoreError::StaleCut)) => refused("stale"),
            Err(CommitError::Unknown(_)) => refusal(
                StatusCode::SERVICE_UNAVAILABLE,
                "commit-uncertain",
                "The original result is unconfirmed. Check the original invention.",
            ),
            Err(error) => failed(WorldError::Commit(error)),
        }) {
        Ok(response) => response,
        Err(error) => access_failure(error),
    }
}

fn unsupported() -> Response {
    refusal(
        StatusCode::CONFLICT,
        "unconfigured",
        "New invention preparation is unavailable. You can still use a saved recipe you know.",
    )
}

fn refused(code: &'static str) -> Response {
    let message = match code {
        "idempotency-conflict" => "That request ID was already used for different input.",
        "continuation-limit" => {
            "This invention has reached eight follow-ups. Start a new explicit request if you want to continue."
        }
        "invention-authority" => "A current server-established invention origin is required.",
        "invention-locked" => {
            "Invention is locked. Existing actions, crafts and learning remain available."
        }
        "invention-revoked" => {
            "This invention request was revoked by a lock change. Start a new request."
        }
        "paused" => "Resume the world before talking or inventing.",
        "actor" => "This body cannot act in its current condition.",
        _ => "This invention or selected recipe is unavailable. Refresh saved results.",
    };
    refusal(StatusCode::CONFLICT, code, message)
}
