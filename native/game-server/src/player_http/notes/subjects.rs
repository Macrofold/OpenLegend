//! The existing private notes and person overlay choose an admitted subject.
//! The native owner retains and names the actual set of known people.
use super::*;
use openlegend_simulation::{
    encoding::{is_js_whitespace, sha256_hex},
    runtime::{RuntimePersonPage, RuntimePersonPosition, RuntimePersonRead},
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PeopleRequest {
    actor_id: String,
    query: Option<JsText>,
    after: Option<String>,
    subject_id: Option<ObserverSubject>,
    contact_reference: Option<String>,
    body_reference: Option<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Cursor<Key, Position> {
    fence: Key,
    position: Position,
}

#[derive(Serialize)]
struct PeopleResponse<'a> {
    #[serde(flatten)]
    page: RuntimePersonPage<'a>,
    next: Option<String>,
}

pub(in crate::player_http) async fn read(
    State(state): State<PlayerRoutes>,
    request: Request,
) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let selected = match scope(&state.authority, &parts.headers, None).await {
        Ok(selected) => selected,
        Err(error) => return access_failure(error),
    };
    let (request, _input): (PeopleRequest, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(value) => value,
            Err(error) => return error,
        };
    if request.actor_id != selected.scope.actor_id {
        return access_failure(AccessError::Forbidden);
    }
    if request
        .query
        .as_ref()
        .is_some_and(|query| query.units_len() > 120)
        || request
            .subject_id
            .as_ref()
            .is_some_and(|subject| !subject.validate())
    {
        return invalid();
    }
    let contact = match (
        &request.contact_reference,
        &request.body_reference,
        &request.subject_id,
    ) {
        (None, None, _) => None,
        (Some(contact), Some(body), None)
            if is_safe_record_id(contact) && is_safe_record_id(body) =>
        {
            Some((contact, body))
        }
        _ => return invalid(),
    };
    let cursor: Option<Cursor<String, RuntimePersonPosition>> = match request.after.as_deref() {
        Some(token) => match state.references.open_people_cursor(token) {
            Some(cursor) => Some(cursor),
            None => return expired(),
        },
        None => None,
    };
    let Some(language) = state.game.language() else {
        return busy();
    };
    let bytes = match state
        .game
        .world
        .disclose_private_notes(
            &state.authority,
            &selected,
            &request.actor_id,
            |session, budget, _| {
                let query = request.query.as_ref().map_or("".into(), Into::into);
                let (normalized, _query) = language
                    .normalize_mind_label(query, budget)
                    .map_err(RuntimeError::application_refused)?;
                let words: Vec<_> = normalized
                    .split(|unit| char::from_u32((*unit).into()).is_some_and(is_js_whitespace))
                    .filter(|part| !part.is_empty())
                    .collect();
                let key = selected
                    .scope
                    .key()
                    .map_err(|_| StoreError::InvalidRecord)?;
                let query_fence =
                    json_record(&(&key, &words)).map_err(|_| StoreError::InvalidRecord)?;
                let query_fence = sha256_hex(query_fence.as_bytes());
                let resolved;
                let search = if let Some((contact, body)) = contact {
                    resolved = state
                        .references
                        .resolve_contact_body(
                            session,
                            &selected.scope,
                            contact,
                            Some(body),
                            budget,
                        )?
                        .ok_or(WorldError::ProjectionChanged)?;
                    RuntimePersonRead::Contact(&resolved.id)
                } else if let Some(subject) = request.subject_id.as_ref() {
                    RuntimePersonRead::Subject(subject)
                } else {
                    RuntimePersonRead::Search {
                        words: &words,
                        after: cursor.as_ref().map(|value| &value.position),
                    }
                };
                session
                    .with_private_people(
                        &request.actor_id,
                        &query_fence,
                        search,
                        cursor.as_ref().map(|value| value.fence.as_str()),
                        |label| {
                            language
                                .normalize_mind_label(label, budget)
                                .map_err(RuntimeError::application_refused)
                        },
                        |page, next, fence| {
                            let next = next
                                .map(|position| {
                                    state
                                        .references
                                        .seal_people_cursor(&Cursor { position, fence })
                                        .ok_or(StoreError::InvalidRecord)
                                })
                                .transpose()?;
                            wire::encode(&PeopleResponse { page, next }, b"", b"", budget)
                                .map_err(WorldError::Wire)
                        },
                    )?
                    .ok_or(WorldError::ProjectionChanged)?
            },
        )
        .await
    {
        Ok(PlayerDisclosure::Published(bytes)) => bytes,
        Ok(_) | Err(WorldError::ProjectionChanged) => return expired(),
        Err(error) => return failed(error),
    };
    json_response(StatusCode::OK, bytes)
}

fn invalid() -> Response {
    refusal(
        StatusCode::BAD_REQUEST,
        "people-request",
        "Check the person or search and try again.",
    )
}

fn expired() -> Response {
    refusal(
        StatusCode::CONFLICT,
        "people-changed",
        "People changed. Search again.",
    )
}
