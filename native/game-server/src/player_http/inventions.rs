//! Read-only requests for the existing invention panel and original recovery.

use super::{
    dialogue::{ReceiptRequest, Recovered},
    *,
};
use crate::{
    npc::{human_request, valid_request_id},
    player_events::SpeechReplyStatus as JobStatus,
    store::inventions::{InventionCursor, InventionMatch, InventionReceipt, PAGE_SIZE},
};
use openlegend_simulation::text::JsText;
use serde_json::value::RawValue;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct HistoryRequest {
    world_id: String,
    before: Option<InventionCursor>,
}

#[derive(Serialize)]
struct History<'a> {
    ok: bool,
    requests: Vec<HistoryEntry<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    next: Option<CursorView<'a>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CursorView<'a> {
    created_at: i64,
    id: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HistoryEntry<'a> {
    id: &'a str,
    created_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    conversation_id: Option<&'a str>,
    intent: &'a JsText,
    status: JobStatus,
    code: HistoryCode<'a>,
    message: &'a JsText,
    #[serde(skip_serializing_if = "Option::is_none")]
    candidate: Option<&'a RawValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    mode: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    candidate_digest: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    validation: Option<&'a RawValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    parent_id: Option<&'a str>,
    root_id: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    continued_by: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    search: Option<SearchView<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    recipe_id: Option<&'a str>,
    installed: bool,
    current_timeline: bool,
}

#[derive(Serialize)]
#[serde(untagged)]
enum HistoryCode<'a> {
    Result(&'a str),
    Status(JobStatus),
}

#[derive(Serialize)]
struct SearchView<'a> {
    status: &'a str,
    message: &'a JsText,
    matches: Vec<&'a InventionMatch>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ResultView<'a> {
    ok: bool,
    code: JobStatus,
    message: &'a JsText,
    job_id: &'a str,
    job_status: JobStatus,
}

pub(super) async fn receipt(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let access = match scope(&state.authority, &parts.headers, None).await {
        Ok(access) => access,
        Err(error) => return access_failure(error),
    };
    let (input, _input): (ReceiptRequest, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(input) => input,
            Err(error) => return error,
        };
    if !valid_request_id(&input.request_id) || !valid_request_id(&input.timeline) {
        return access_failure(AccessError::Forbidden);
    }
    if let Err(error) = state
        .authority
        .current(&access, Capability::Play, false, |_, _| ())
    {
        return access_failure(error);
    }
    if input.timeline != access.scope.timeline_id {
        return refusal(
            StatusCode::OK,
            "stale-world",
            "This request belongs to an earlier save.",
        );
    }
    let id = match human_request(&access.scope, &input.request_id) {
        Ok(id) => id,
        Err(error) => return failed(error),
    };
    let record = match state.game.store.invention_receipt(id).await {
        Ok(record) => record,
        Err(error) => return failed(error.into()),
    };
    match state
        .authority
        .current(&access, Capability::Play, false, |fields, _| {
            let Ok(scope) = fields.key() else {
                return busy();
            };
            let unknown =
                "The original request has no confirmed record yet. Nothing was resubmitted.".into();
            let (status, message, result) = match &record {
                InventionReceipt::Unknown => ("unknown", &unknown, None),
                InventionReceipt::Recorded { job, .. } if job.belongs_to_receipt(fields) => (
                    "resolved",
                    &job.message,
                    Some(ResultView {
                        ok: !matches!(
                            job.status,
                            JobStatus::Failed | JobStatus::Cancelled | JobStatus::Stale
                        ),
                        code: job.status,
                        message: &job.message,
                        job_id: &job.id,
                        job_status: job.status,
                    }),
                ),
                _ => {
                    return refusal(
                        StatusCode::OK,
                        "request-unavailable",
                        "The original request is not available to this character in this save.",
                    );
                }
            };
            reply(
                &state,
                StatusCode::OK,
                &Recovered {
                    ok: true,
                    scope: &scope,
                    status,
                    message,
                    result,
                },
            )
        }) {
        Ok(response) => response,
        Err(error) => access_failure(error),
    }
}

pub(super) async fn list(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.clone().try_acquire_owned() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let access = match scope(&state.authority, &parts.headers, None).await {
        Ok(access) => access,
        Err(error) => return access_failure(error),
    };
    let (input, _input): (HistoryRequest, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(input) => input,
            Err(error) => return error,
        };
    if !valid_request_id(&input.world_id)
        || input.before.as_ref().is_some_and(|before| !before.valid())
    {
        return access_failure(AccessError::Forbidden);
    }
    if let Err(error) = state
        .authority
        .current(&access, Capability::Play, false, |_, _| ())
    {
        return access_failure(error);
    }
    if input.world_id != access.scope.world_id {
        return reply(
            &state,
            StatusCode::CONFLICT,
            &serde_json::json!({ "ok": false, "message": "World mismatch." }),
        );
    }
    let page = match state
        .game
        .store
        .invention_page(&input.world_id, &access.scope.actor_id, input.before)
        .await
    {
        Ok(page) => page,
        Err(error) => return failed(error.into()),
    };
    // SQL and any transport wait are outside the world turn. Both grant and
    // learned recipes are current for the synchronous choice and encoding.
    let world = state.game.world.clone();
    match world
        .capture(move |session| {
            let result = state
                .authority
                .current(&access, Capability::Play, false, |fields, _| {
                    session.with_player_recipe_references(
                        &fields.account_id,
                        &fields.actor_id,
                        |known| {
                            let jobs = &page.jobs;
                            let bound = jobs.iter().try_fold(0usize, |bytes, job| {
                                let matches = job
                                    .invention
                                    .as_ref()
                                    .and_then(|job| job.search.as_ref())
                                    .map_or(0, |search| search.matches.len());
                                bytes
                                    .checked_add(size_of::<HistoryEntry<'_>>())?
                                    .checked_add(matches.checked_mul(size_of::<&InventionMatch>())?)
                            });
                            let Some(bound) = bound else {
                                return busy();
                            };
                            let Ok(_projection) = state.game.host.budget().reserve(bound) else {
                                return busy();
                            };
                            let requests = jobs
                                .iter()
                                .map(|job| {
                                    let source = &job.request.invention;
                                    let result = job.invention.as_ref();
                                    let recipe_id =
                                        result.and_then(|value| value.recipe_id.as_deref());
                                    let current_timeline = source.timeline_id == fields.timeline_id;
                                    let search = result
                                        .and_then(|value| value.search.as_ref())
                                        .filter(|_| current_timeline)
                                        .map(|search| {
                                            let mut matches =
                                                Vec::with_capacity(search.matches.len());
                                            matches.extend(search.matches.iter().filter(|item| {
                                                known(&item.recipe_id, Some(&item.digest))
                                            }));
                                            SearchView {
                                                status: &search.status,
                                                message: &search.message,
                                                matches,
                                            }
                                        });
                                    HistoryEntry {
                                        id: &job.id,
                                        created_at: job.created_at,
                                        conversation_id: source.conversation_id.as_deref(),
                                        intent: &job.request.text,
                                        status: job.status,
                                        code: result
                                            .map_or(HistoryCode::Status(job.status), |value| {
                                                HistoryCode::Result(&value.code)
                                            }),
                                        message: &job.message,
                                        candidate: result
                                            .and_then(|value| value.candidate.as_deref())
                                            .or(source.candidate.as_deref()),
                                        mode: source.mode.as_deref(),
                                        candidate_digest: result
                                            .and_then(|value| value.candidate_digest.as_deref()),
                                        validation: result
                                            .and_then(|value| value.validation.as_deref()),
                                        parent_id: source
                                            .continuation
                                            .as_ref()
                                            .map(|continuation| continuation.parent_id.as_str()),
                                        root_id: &source.root_id,
                                        continued_by: result
                                            .and_then(|value| value.continued_by.as_deref()),
                                        search,
                                        recipe_id,
                                        current_timeline,
                                        installed: recipe_id.is_some_and(|id| known(id, None)),
                                    }
                                })
                                .collect();
                            let next = jobs.last().filter(|_| jobs.len() == PAGE_SIZE).map(|job| {
                                CursorView {
                                    created_at: job.created_at,
                                    id: &job.id,
                                }
                            });
                            reply(
                                &state,
                                StatusCode::OK,
                                &History {
                                    ok: true,
                                    requests,
                                    next,
                                },
                            )
                        },
                    )
                });
            match result {
                Ok(response) => response,
                Err(error) => Ok(access_failure(error)),
            }
        })
        .await
    {
        Ok(response) => response,
        Err(error) => failed(error),
    }
}
