//! The signed Inventory panel shows history only from this actor's custody.

use super::*;
use openlegend_simulation::runtime::{RuntimeError, RuntimeObjectHistoryEntry};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RequestPage {
    cursor: Option<String>,
    object_id: Option<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Cursor {
    scope: String,
    object_id: Option<String>,
    after: String,
}

#[derive(Serialize)]
struct Page<'a> {
    ok: bool,
    entries: &'a [RuntimeObjectHistoryEntry],
    #[serde(skip_serializing_if = "Option::is_none")]
    next: Option<String>,
}

pub(super) async fn read(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let selected = match scope(&state.authority, &parts.headers, None).await {
        Ok(scope) => Arc::new(scope),
        Err(error) => return access_failure(error),
    };
    let budget = state.game.host.budget();
    let (input, _input): (RequestPage, _) = match json(&parts.headers, body, budget).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    if input
        .object_id
        .as_deref()
        .is_some_and(|id| !crate::npc::valid_request_id(id))
        || input
            .cursor
            .as_deref()
            .is_some_and(|cursor| cursor.len() > 3000)
    {
        return request_error();
    }
    let Ok(scope_key) = selected.scope.key() else {
        return busy();
    };
    let after = match input.cursor.as_deref() {
        Some(token) => match state.references.open_object_history_cursor::<Cursor>(token) {
            Some(cursor) if cursor.scope == scope_key && cursor.object_id == input.object_id => {
                cursor.after
            }
            _ => return access_failure(AccessError::Changed),
        },
        None => String::new(),
    };

    match state
        .game
        .world
        .object_history(
            state.authority.clone(),
            selected,
            after,
            input.object_id.clone(),
            |rows, budget| {
                let next = if rows.more {
                    let _cursor = budget.reserve(4096)?;
                    let cursor = Cursor {
                        scope: scope_key,
                        object_id: input.object_id,
                        after: rows
                            .entries
                            .last()
                            .ok_or_else(|| {
                                RuntimeError::application_refused("missing history position")
                            })?
                            .id
                            .clone(),
                    };
                    Some(
                        state
                            .references
                            .seal_object_history_cursor(&cursor)
                            .ok_or_else(|| {
                                RuntimeError::application_refused("unavailable history position")
                            })?,
                    )
                } else {
                    None
                };
                // Row allocations and the accepted overlay still have their
                // own custody. The wire transfers independently.
                wire::encode(
                    &Page {
                        ok: true,
                        entries: &rows.entries,
                        next,
                    },
                    b"",
                    b"",
                    budget,
                )
                .map_err(RuntimeError::application_refused)
            },
        )
        .await
    {
        Ok(Some(bytes)) => json_response(StatusCode::OK, bytes),
        Ok(None) => access_failure(AccessError::Changed),
        Err(error) => failed(error),
    }
}
