//! Intelligence reads saved job and attempt facts. Opening one exact stage can
//! additionally read its optional capture under the current disclosure fence.

use super::*;
use crate::{
    authority::RequestScope,
    player_events::SpeechReplyStatus,
    store::{
        diagnostics::{self, Attempt, ListRequest, Query as Inspection, ReadAccess, Root, SavedStageCapture, StageOwner},
        sql_ordinal,
    },
    world::HostedWorld,
};
use axum::Extension;
use chrono::{DateTime, SecondsFormat, Utc};
use openlegend_simulation::{
    encoding::json_record,
    runtime::{NativeWorldSession, RuntimeError},
    text::JsText,
    values::is_safe_record_id,
};
use std::collections::BTreeMap;
use tokio::sync::watch;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Exact {
    id: String,
}

struct Audience {
    storage: Arc<ReadAccess>,
    people: BTreeMap<String, Person>,
}

struct Person {
    id: String,
    life: u64,
    name: Option<JsText>,
}

impl Audience {
    fn prepare(
        session: &NativeWorldSession,
        scope: &RequestScope,
        query: &Inspection,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, RuntimeError> {
        let progress = session.accepted_progress()?;
        if progress.world_id != scope.world_id {
            return Ok(None);
        }
        let storage = budget.reserve(
            2048 + 12 * (scope.account_id.len() + scope.world_id.len() + progress.generation.len()),
        )?;
        let mut access = ReadAccess::new(
            json_record(&scope.account_id).map_err(RuntimeError::application_refused)?,
            scope.world_id.clone(),
            json_record(&scope.world_id).map_err(RuntimeError::application_refused)?,
            progress.generation.to_owned(),
            storage,
        );
        if matches!(query, Inspection::Stage(_)) {
            let Some(life) = session.intelligence_owner_life(&scope.account_id, &scope.actor_id)?
            else {
                return Ok(None);
            };
            access.admit(512 + 8 * (scope.actor_id.len() + scope.timeline_id.len()))
                .map_err(|_| RuntimeError::application_busy(StoreError::Capacity))?;
            access.stage_owner = Some(StageOwner {
                actor_key: json_record(&scope.actor_id).map_err(RuntimeError::application_refused)?,
                timeline_key: json_record(&scope.timeline_id).map_err(RuntimeError::application_refused)?,
                player_life: sql_ordinal(life).map_err(RuntimeError::application_refused)?,
                grant_revision: sql_ordinal(scope.grant_revision).map_err(RuntimeError::application_refused)?,
            });
            return Ok(Some(Self { storage: Arc::new(access), people: BTreeMap::new() }));
        }
        let (actor, search) = match query {
            Inspection::List(list) if !list.peek => (
                list.actor.as_ref().map(|term| term.to_lowercase()),
                list.search.as_ref().map(|term| term.to_lowercase()),
            ),
            _ => (None, None),
        };
        let names = match query {
            Inspection::List(list) => !list.peek,
            Inspection::Trigger(_) => true,
            Inspection::Billing(_) | Inspection::Stage(_) => false,
        };
        let mut people = BTreeMap::new();
        let allowed = session.with_intelligence_people(
            &scope.account_id,
            &scope.actor_id,
            |id, name, life| {
                let name_size = if names { name.storage_bytes() } else { 0 };
                access
                    .admit(512 + 32 * id.len() + 8 * name_size)
                    .map_err(|_| RuntimeError::application_busy(StoreError::Capacity))?;
                let key = json_record(id).map_err(RuntimeError::application_refused)?;
                if actor.is_some() || search.is_some() {
                    let shown = name.lowercase();
                    let id = id.to_lowercase();
                    let matches = |term: &str| {
                        shown.as_unicode().is_some_and(|name| name.contains(term))
                            || id.contains(term)
                    };
                    if actor.as_deref().is_some_and(matches) {
                        access.matching_people.push(key.clone());
                    }
                    if search.as_deref().is_some_and(matches) {
                        access.search_names.push(key.clone());
                    }
                }
                access.people.push(key.clone());
                people.insert(
                    key,
                    Person {
                        id: id.to_owned(),
                        life,
                        name: names.then(|| name.clone()),
                    },
                );
                Ok(())
            },
        )?;
        Ok(allowed.then(|| Self {
            storage: Arc::new(access),
            people,
        }))
    }

    fn current(
        &self,
        session: &NativeWorldSession,
        scope: &RequestScope,
        roots: &[Root],
    ) -> Result<bool, RuntimeError> {
        if session.accepted_progress()?.generation != self.storage.generation {
            return Ok(false);
        }
        for root in roots {
            if let Some(person) = self.people.get(&root.actor_key) {
                if !session.intelligence_person_current(
                    &scope.account_id,
                    &scope.actor_id,
                    &person.id,
                    person.life,
                )? {
                    return Ok(false);
                }
            } else if !root.owned {
                return Ok(false);
            }
        }
        Ok(true)
    }
}

pub(super) fn router(stop: watch::Receiver<bool>) -> Router<PlayerRoutes> {
    Router::new()
        .route("/api/god/triggers", post(list))
        .route("/api/god/trigger", post(detail))
        .route("/api/god/intelligence-details", post(billing))
        .route("/api/god/intelligence-stage", post(stage))
        .layer(Extension(stop))
}

async fn list(
    State(state): State<PlayerRoutes>,
    Extension(stop): Extension<watch::Receiver<bool>>,
    request: Request,
) -> Response {
    read::<ListRequest>(state, stop, request, |mut input| {
        if !(0..=1_000).contains(&input.offset) || !valid_list(&input) {
            return None;
        }
        for value in [
            &mut input.search,
            &mut input.actor,
            &mut input.route,
            &mut input.outcome,
            &mut input.stage,
        ] {
            if value.as_ref().is_some_and(String::is_empty) {
                *value = None;
            }
        }
        Some(Inspection::List(input))
    })
    .await
}

async fn detail(
    State(state): State<PlayerRoutes>,
    Extension(stop): Extension<watch::Receiver<bool>>,
    request: Request,
) -> Response {
    read::<Exact>(state, stop, request, |input| {
        (is_safe_record_id(&input.id) && !input.id.contains('\0'))
            .then_some(Inspection::Trigger(input.id))
    })
    .await
}

async fn billing(
    State(state): State<PlayerRoutes>,
    Extension(stop): Extension<watch::Receiver<bool>>,
    request: Request,
) -> Response {
    read::<Exact>(state, stop, request, |input| {
        // The attempt has a server-defined suffix after the root ID. The
        // common request byte bound and exact stored link govern this lookup.
        (!input.id.is_empty() && !input.id.contains('\0')).then_some(Inspection::Billing(input.id))
    })
    .await
}

async fn stage(
    State(state): State<PlayerRoutes>,
    Extension(stop): Extension<watch::Receiver<bool>>,
    request: Request,
) -> Response {
    read::<Exact>(state, stop, request, |input| {
        (input.id.ends_with(":attempt:0:generate") && !input.id.contains('\0'))
            .then_some(Inspection::Stage(input.id))
    })
    .await
}

fn valid_list(input: &ListRequest) -> bool {
    [
        (input.search.as_deref(), 200),
        (input.actor.as_deref(), 100),
        (input.route.as_deref(), 50),
        (input.outcome.as_deref(), 50),
        (input.stage.as_deref(), 100),
        (input.from.as_deref(), 40),
        (input.to.as_deref(), 40),
    ]
    .into_iter()
    .all(|(value, units)| {
        value.is_none_or(|value| value.encode_utf16().count() <= units && !value.contains('\0'))
    }) && diagnostics::millis(input.from.as_deref()).is_ok()
        && diagnostics::millis(input.to.as_deref()).is_ok()
}

async fn read<T: DeserializeOwned>(
    state: PlayerRoutes,
    stop: watch::Receiver<bool>,
    request: Request,
    select: impl FnOnce(T) -> Option<Inspection>,
) -> Response {
    let Ok(slot) = state.capacity.clone().try_acquire_owned() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let selected = match scope(&state.authority, &parts.headers, None).await {
        Ok(scope) => Arc::new(scope),
        Err(error) => return access_failure(error),
    };
    if let Err(error) = state
        .authority
        .current_private_view(&selected, true, |_, _| ())
    {
        return access_failure(error);
    }
    let host = state.game.host.clone();
    let (input, storage) = match json(&parts.headers, body, host.budget()).await {
        Ok(value) => value,
        Err(error) => return error,
    };
    let Some(query) = select(input).map(Arc::new) else {
        return refusal(
            StatusCode::BAD_REQUEST,
            "invalid-inspection",
            "Check the diagnostic search or request ID.",
        );
    };
    // A queued world callback can still run after the HTTP future is
    // canceled. Its admitted input and listener ownership end with that work.
    let custody = Arc::new((slot, storage, state._request_owner.clone()));
    let stopping = stop.clone();
    let read = async move {
        let world = state.game.world.clone();
        let capture = query.clone();
        let grant = state.authority.clone();
        let viewer = selected.clone();
        let capture_custody = custody.clone();
        let capture_stop = stop.clone();
        let audience = match world
            .capture(move |session| {
                let _custody = capture_custody;
                if *capture_stop.borrow() {
                    return Ok(Err(AccessError::Changed));
                }
                match grant.current_private_view(&viewer, true, |scope, _| {
                    Audience::prepare(session, scope, &capture, host.budget())
                }) {
                    Ok(value) => Ok(Ok(value?)),
                    Err(error) => Ok(Err(error)),
                }
            })
            .await
        {
            Ok(Ok(Some(audience))) => audience,
            Ok(Ok(None)) => return access_failure(AccessError::Forbidden),
            Ok(Err(error)) => return access_failure(error),
            Err(error) => return failed(error),
        };
        let saved = match state
            .game
            .store
            .intelligence(query.clone(), audience.storage.clone())
            .await
        {
            Ok(saved) => saved,
            Err(error) => return failed(WorldError::Storage(error)),
        };
        let disclosure_world = world.clone();
        match world
            .capture(move |session| {
                let _custody = custody;
                // A checkpoint load closes this listener before replacing its
                // world. Keep its timeline current through synchronous encoding.
                let timeline = stop.borrow();
                if *timeline {
                    return Ok(access_failure(AccessError::Changed));
                }
                Ok(
                    match state
                        .authority
                        .current_private_view(&selected, true, |scope, _| {
                            if !audience.current(session, scope, &saved.roots)? {
                                return Ok(access_failure(AccessError::Changed));
                            }
                            let budget = state.game.host.budget();
                            // Only the explicitly requested page uses these transient wire
                            // descriptors. The read rows and wire encoding have separate owners.
                            let Ok(_render) = budget
                                .reserve(1024 + 512 * (saved.roots.len() + saved.attempts.len()))
                            else {
                                return Ok(busy());
                            };
                            let mut response = if matches!(query.as_ref(), Inspection::Stage(_)) {
                                publish_stage(&state, &disclosure_world, session, scope, &saved)?
                            } else {
                                publish(&state, &query, &audience, &saved)
                            };
                            response.headers_mut().insert(
                                header::CACHE_CONTROL,
                                axum::http::HeaderValue::from_static("private, no-store"),
                            );
                            Ok::<_, RuntimeError>(response)
                        }) {
                        Ok(response) => response?,
                        Err(error) => access_failure(error),
                    },
                )
            })
            .await
        {
            Ok(response) => response,
            Err(error) => failed(error),
        }
    };
    tokio::select! {
        biased;
        _ = crate::launch::stopped(stopping) => access_failure(AccessError::Changed),
        response = read => response,
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Call<'a, O> {
    id: &'a str,
    kind: &'a str,
    status: &'static str,
    disposition: &'a str,
    world_id: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    parent_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    actor_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    actor_name: Option<&'a JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    trigger_type: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    route: Option<String>,
    started_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    completed_at: Option<String>,
    input: (),
    output: O,
    exchanges: [(); 0],
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Summary<'a> {
    #[serde(flatten)]
    call: Call<'a, ()>,
    stage_count: i64,
    known_cost_usd: f64,
    cost_incomplete: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Page<T> {
    ok: bool,
    world_id: String,
    roots: Vec<T>,
    has_more: bool,
}

#[derive(Serialize)]
struct Id<'a> {
    id: &'a str,
}

#[derive(Serialize)]
struct Detail<T> {
    ok: bool,
    details: T,
}

#[derive(Serialize)]
struct Trigger<'a> {
    root: Call<'a, Option<&'a crate::store::TerminalOutcome>>,
    children: Vec<Call<'a, AttemptOutput<'a>>>,
    coverage: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AttemptOutput<'a> {
    receipt: Option<&'a diagnostics::SavedReceipt>,
    saved_billing: bool,
    reason: &'static str,
}

#[derive(Serialize)]
struct SavedBilling<'a> {
    saved: &'a Attempt,
}

#[derive(Serialize)]
struct StageDetails<'a> {
    saved: &'a Attempt,
    capture: StageInput<'a>,
}

#[derive(Serialize)]
#[serde(tag = "status", rename_all = "kebab-case")]
enum StageInput<'a> {
    Unavailable,
    Captured { input: &'a str, redacted: bool },
}

fn publish_stage(
    state: &PlayerRoutes,
    world: &HostedWorld,
    session: &NativeWorldSession,
    scope: &RequestScope,
    saved: &diagnostics::Selection,
) -> Result<Response, RuntimeError> {
    let Some(attempt) = saved.attempts.first() else {
        return Ok(access_failure(AccessError::Forbidden));
    };
    let render = |capture: Option<&SavedStageCapture>| {
        reply(state, StatusCode::OK, &Detail {
            ok: true,
            details: StageDetails {
                saved: attempt,
                capture: capture.map_or(StageInput::Unavailable, |capture| StageInput::Captured {
                    input: &capture.input,
                    redacted: capture.proof.redacted,
                }),
            },
        })
    };
    let Some(capture) = &saved.stage_capture else {
        return Ok(render(None));
    };
    if capture.proof.grant_revision != scope.grant_revision || !session.intelligence_person_current(
        &scope.account_id, &scope.actor_id, &scope.actor_id, capture.proof.player_life,
    )? {
        return Ok(render(None));
    }
    Ok(world.with_current_stage_source(session, &capture.proof.witness, || render(Some(capture)))?
        .unwrap_or_else(|| render(None)))
}

fn publish(
    state: &PlayerRoutes,
    query: &Inspection,
    audience: &Audience,
    saved: &diagnostics::Selection,
) -> Response {
    let world_id = &audience.storage.world;
    if let Inspection::List(input) = query {
        if input.peek {
            return reply(
                state,
                StatusCode::OK,
                &Page {
                    ok: true,
                    world_id: world_id.clone(),
                    has_more: false,
                    roots: saved
                        .roots
                        .first()
                        .map(|root| Id { id: &root.id })
                        .into_iter()
                        .collect(),
                },
            );
        }
        return reply(
            state,
            StatusCode::OK,
            &Page {
                ok: true,
                world_id: world_id.clone(),
                has_more: saved.has_more,
                roots: saved
                    .roots
                    .iter()
                    .take(25)
                    .map(|root| Summary {
                        call: job_call(root, audience, ()),
                        stage_count: root.stage_count,
                        known_cost_usd: root.settled_micro_usd as f64 / 1_000_000.0,
                        cost_incomplete: root.cost_incomplete,
                    })
                    .collect(),
            },
        );
    }
    let Some(root) = saved.roots.first() else {
        return access_failure(AccessError::Forbidden);
    };
    if matches!(query, Inspection::Billing(_)) {
        return match saved.attempts.first() {
            Some(stage) => reply(
                state,
                StatusCode::OK,
                &Detail {
                    ok: true,
                    details: SavedBilling { saved: stage },
                },
            ),
            None => access_failure(AccessError::Forbidden),
        };
    }
    reply(
        state,
        StatusCode::OK,
        &Detail {
            ok: true,
            details: Trigger {
                root: job_call(root, audience, root.outcome.as_ref()),
                children: saved
                    .attempts
                    .iter()
                    .map(|stage| attempt_call(stage, root, world_id))
                    .collect(),
                coverage: if saved.stages_truncated {
                    "Showing the first 1,000 saved attempts. Prompts, replies and live provider details are unavailable."
                } else {
                    "Showing saved outcomes and billing records. Prompts, replies and live provider details are unavailable."
                },
            },
        },
    )
}

fn iso(ms: i64) -> String {
    DateTime::<Utc>::from_timestamp_millis(ms)
        .unwrap_or_default()
        .to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn job_call<'a, O>(root: &'a Root, audience: &'a Audience, output: O) -> Call<'a, O> {
    let person = audience.people.get(&root.actor_key);
    let (kind, trigger_type) = match root.kind.as_str() {
        "chat" => ("Conversation", "Player speech"),
        "action" => ("Action description", "Player action"),
        _ => ("NPC decision", "NPC opportunity"),
    };
    let (status, disposition) = match root.status {
        SpeechReplyStatus::Queued => ("running", "queued"),
        SpeechReplyStatus::Judging => ("running", "judging"),
        SpeechReplyStatus::Generating => ("running", "generating"),
        SpeechReplyStatus::Completed => ("completed", "completed"),
        SpeechReplyStatus::Failed => ("failed", "failed"),
        SpeechReplyStatus::Cancelled => ("failed", "cancelled"),
        SpeechReplyStatus::Stale => ("failed", "stale"),
    };
    Call {
        id: &root.id,
        kind,
        status,
        disposition,
        world_id: &audience.storage.world,
        parent_id: None,
        actor_id: person.map(|person| person.id.as_str()),
        actor_name: person.and_then(|person| person.name.as_ref()),
        trigger_type: Some(trigger_type),
        route: root.level.map(level),
        started_at: iso(root.started_at),
        completed_at: root.completed_at.map(iso),
        input: (),
        output,
        exchanges: [],
    }
}

fn level(level: i32) -> String {
    format!("level{level}")
}

fn attempt_call<'a>(
    attempt: &'a Attempt,
    root: &'a Root,
    world: &'a str,
) -> Call<'a, AttemptOutput<'a>> {
    let receipt = attempt.receipt.as_ref();
    let (status, reason) = match attempt.status.as_str() {
        "reserved" => ("running", "Waiting for the attempt to settle."),
        "uncertain" => ("failed", "Completion or spending remains uncertain."),
        _ if receipt.is_some_and(|value| !value.dispatched) => {
            ("failed", "The provider did not start.")
        }
        _ if receipt.is_some_and(|value| !value.response_received) => {
            ("failed", "No provider response was recorded.")
        }
        _ => ("completed", "The attempt is settled."),
    };
    Call {
        id: &attempt.id,
        kind: &attempt.stage,
        status,
        disposition: &attempt.status,
        world_id: world,
        parent_id: Some(&root.id),
        actor_id: None,
        actor_name: None,
        trigger_type: None,
        route: attempt.level.map(level),
        started_at: receipt.map_or_else(
            || iso(attempt.created_at),
            |receipt| receipt.started_at.clone(),
        ),
        completed_at: receipt.map(|receipt| receipt.completed_at.clone()),
        input: (),
        output: AttemptOutput {
            receipt,
            saved_billing: true,
            reason,
        },
        exchanges: [],
    }
}
