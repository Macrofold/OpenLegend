//! Read only the signed-in player's own obligations and retained outcomes.

use super::*;
use crate::store::recall::browse::{
    MemoryPosition,
    promises::{PROMISE_PAGE, PastPromises, SavedPromise},
};
use crate::{player_references::PlayerReferences, world::PlayerDisclosure};
use openlegend_simulation::{
    encoding::{json_record, sha256_hex},
    experience::{PersonalSourceKind, PromiseAmendment},
    runtime::{RuntimePromisePosition, RuntimePromiseView, RuntimeResidentPromise},
    text::JsText,
    values::is_safe_record_id,
};
use openlegend_world_host::pool::HostError;

enum Past {
    Resident(RuntimeResidentPromise),
    Saved(SavedPromise),
}

impl Past {
    fn position(&self) -> &RuntimePromisePosition {
        match self {
            Self::Resident(entry) => &entry.position,
            Self::Saved(entry) => &entry.position,
        }
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct RequestPage {
    cursor: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Promise<'a> {
    id: &'a str,
    revision: u64,
    words: &'a JsText,
    recipient: Option<&'a JsText>,
    recipient_id: Option<String>,
    made_at: f64,
    status: &'static str,
    terms: &'a JsText,
    due_at: Option<f64>,
    kept_at: Option<f64>,
    evidence: Option<&'a JsText>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Page<'a> {
    ok: bool,
    world_id: &'a str,
    generation: &'a str,
    open: Vec<Promise<'a>>,
    open_limit: u64,
    counted: usize,
    past: Vec<Promise<'a>>,
    next: Option<String>,
    partial: bool,
}

pub(super) async fn list(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let selected = match scope(&state.authority, &parts.headers, None).await {
        Ok(selected) => Arc::new(selected),
        Err(error) => return access_failure(error),
    };
    let (request, _custody): (RequestPage, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(value) => value,
            Err(error) => return error,
        };
    let cursor = match request.cursor.as_deref() {
        None => None,
        Some(raw) => {
            let parsed = raw
                .split_once('.')
                .filter(|_| raw.encode_utf16().count() <= 2048)
                .and_then(|(fence, body)| {
                    serde_json::from_str::<MemoryPosition>(body)
                        .ok()
                        .filter(|position| {
                            position.at.is_finite()
                                && position.kind == PersonalSourceKind::Memory
                                && is_safe_record_id(&position.id)
                        })
                        .map(|position| (fence, position))
                });
            let Some(parsed) = parsed else {
                return invalid_cursor();
            };
            Some(parsed)
        }
    };
    for _ in 0..2 {
        match publish(&state, &selected, cursor.as_ref()).await {
            Ok(Some(PlayerDisclosure::Published(bytes))) => {
                return json_response(StatusCode::OK, bytes);
            }
            Ok(Some(PlayerDisclosure::Busy | PlayerDisclosure::Changed))
            | Err(WorldError::Storage(StoreError::StaleCut)) => (),
            Ok(None) => return invalid_cursor(),
            Ok(Some(PlayerDisclosure::Unchanged)) | Err(WorldError::ProjectionChanged) => break,
            Err(error) => return failed(error),
        }
    }
    changed()
}

pub(super) async fn amend(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let selected = match scope(&state.authority, &parts.headers, None).await {
        Ok(selected) => Arc::new(selected),
        Err(error) => return access_failure(error),
    };
    let (edit, _custody): (PromiseAmendment, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(value) => value,
            Err(error) => return error,
        };
    if !edit.valid_request() {
        return request_error();
    }
    let result = super::notes::execute_edit(
        &state,
        selected.clone(),
        selected.scope.world_id.clone(),
        None,
        true,
        move |session, scope| {
            Ok(session.begin_owner_promise_amendment(&scope.account_id, &scope.actor_id, edit)?)
        },
    )
    .await;
    match result {
        Ok(Some(result)) => {
            match state
                .authority
                .current(&selected, Capability::Play, true, |_, _| {
                    wire::encode(&result.outcome, b"", b"", state.game.host.budget())
                }) {
                Ok(Ok(bytes)) => json_response(StatusCode::OK, bytes),
                Ok(Err(error)) => failed(WorldError::Wire(error)),
                Err(error) => access_failure(error),
            }
        }
        Ok(None) => refusal(
            StatusCode::SERVICE_UNAVAILABLE,
            "commitment-save-unconfirmed",
            "Saving the change hasn’t been confirmed. Refresh commitments to check.",
        ),
        Err(error) => failed(error),
    }
}

async fn publish(
    state: &PlayerRoutes,
    exact: &Arc<AuthorizedScope>,
    cursor: Option<&(&str, MemoryPosition)>,
) -> Result<Option<PlayerDisclosure>, WorldError> {
    let world = &state.game.world;
    let budget = state.game.host.budget();
    let _request = budget
        .reserve(4096 + PROMISE_PAGE * 256)
        .map_err(HostError::from)?;
    let before = cursor.map(|(_, position)| position.clone());
    let select_before = before.clone();
    let (selected, cut, live) = world
        .capture_recollections_with(
            state.authority.clone(),
            exact.clone(),
            exact.scope.actor_id.clone(),
            move |session, permit| {
                session
                    .select_player_promises(
                        &permit.account_id,
                        &permit.actor_id,
                        select_before
                            .as_ref()
                            .map(|position| (position.at, position.id.as_str())),
                        PROMISE_PAGE + 1,
                    )?
                    .ok_or(AccessError::Forbidden.into())
            },
        )
        .await?;
    let key = exact.scope.key().map_err(|_| StoreError::InvalidRecord)?;
    let fence = sha256_hex(
        json_record(&("promises", &key, &cut.generation, cut.privacy_revision))
            .map_err(|_| StoreError::InvalidRecord)?
            .as_bytes(),
    );
    if cursor.is_some_and(|(expected, _)| *expected != fence) {
        return Ok(None);
    }
    let resident = live
        .recent_resolved
        .iter()
        .map(|entry| entry.position.source.id.clone())
        .collect();
    let stored = state
        .game
        .store
        .browse_resolved_promises(cut.clone(), before, resident, live.complete_collection)
        .await;
    let (partial, saved, _past_custody) = match stored {
        Ok(PastPromises { rows, custody }) => (false, rows, Some(custody)),
        Err(StoreError::Sql(_) | StoreError::Timeout | StoreError::WriterUnavailable) => {
            (true, Vec::new(), None)
        }
        Err(error) => return Err(error.into()),
    };
    let mut past: Vec<_> = live
        .recent_resolved
        .into_iter()
        .map(Past::Resident)
        .chain(saved.into_iter().map(Past::Saved))
        .collect();
    past.sort_by(|a, b| b.position().order(a.position()));
    let next = if past.len() > PROMISE_PAGE {
        past.truncate(PROMISE_PAGE);
        let position = past
            .last()
            .expect("promise history page is not empty")
            .position();
        let value = MemoryPosition {
            at: position.at,
            id: position.source.id.clone(),
            kind: PersonalSourceKind::Memory,
        };
        Some(format!(
            "{fence}.{}",
            json_record(&value).map_err(|_| StoreError::InvalidRecord)?
        ))
    } else {
        None
    };

    let references = live
        .open
        .iter()
        .map(|entry| &entry.position.source)
        .chain(past.iter().map(|entry| &entry.position().source));
    world
        .disclose_promises(
            &state.authority,
            &selected,
            references,
            |present, budget| {
                let refs = state
                    .references
                    .scoped(&exact.scope)
                    .map_err(|_| StoreError::InvalidRecord)?;
                let open_views = live
                    .open
                    .iter()
                    .map(|entry| present.format(&entry.position.source, entry.payload()))
                    .collect::<Result<Vec<_>, _>>()?;
                let past_views = past
                    .iter()
                    .map(|entry| match entry {
                        Past::Resident(entry) => {
                            present.format(&entry.position.source, entry.payload())
                        }
                        Past::Saved(entry) => present.format_saved(&entry.position, &entry.payload),
                    })
                    .collect::<Result<Vec<_>, _>>()
                    .map_err(|error| {
                        if error.stale_reason() == Some("private-promise-source") {
                            WorldError::ProjectionChanged
                        } else {
                            error.into()
                        }
                    })?;
                wire::encode(
                    &Page {
                        ok: true,
                        world_id: &cut.world,
                        generation: &cut.generation,
                        open: render_promises(&open_views, &refs)?,
                        open_limit: live.limit,
                        counted: live.unresolved,
                        past: render_promises(&past_views, &refs)?,
                        next,
                        partial,
                    },
                    b"",
                    b"",
                    budget,
                )
                .map_err(WorldError::Wire)
            },
        )
        .await
        .map(Some)
}

fn render_promises<'a>(
    views: &'a [Option<RuntimePromiseView<'a>>],
    refs: &PlayerReferences<'_>,
) -> Result<Vec<Promise<'a>>, StoreError> {
    views
        .iter()
        .flatten()
        .map(|view| {
            let recipient_id = view
                .recognized_recipient
                .as_deref()
                .map(|recipient| refs.person(recipient))
                .transpose()
                .map_err(|_| StoreError::InvalidRecord)?;
            Ok(promise(view, recipient_id))
        })
        .collect()
}

fn promise<'a>(view: &'a RuntimePromiseView<'a>, recipient_id: Option<String>) -> Promise<'a> {
    Promise {
        id: view.id,
        revision: view.revision,
        words: &view.words,
        recipient: view.recipient.as_ref(),
        recipient_id,
        made_at: view.at,
        status: view.status,
        terms: &view.terms,
        due_at: view.due_at,
        kept_at: view.kept_at,
        evidence: view.evidence.as_ref(),
    }
}

fn changed() -> Response {
    refusal(
        StatusCode::CONFLICT,
        "history-changed",
        "Promises changed. Reload the list.",
    )
}

fn invalid_cursor() -> Response {
    refusal(
        StatusCode::BAD_REQUEST,
        "invalid-input",
        "This promise page expired. Reload the list.",
    )
}
