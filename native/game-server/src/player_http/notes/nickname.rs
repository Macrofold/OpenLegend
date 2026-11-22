//! The person overlay may change only its controlling observer's private name
//! for the exact currently perceived person.
use super::*;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Edit {
    world_id: String,
    generation: String,
    subject_id: String,
    body_reference: String,
    expected_revision: i64,
    nickname: JsText,
}

pub(crate) async fn edit(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let selected = match scope(&state.authority, &parts.headers, None).await {
        Ok(selected) => Arc::new(selected),
        Err(error) => return access_failure(error),
    };
    let budget = state.game.host.budget().clone();
    let (request, _custody): (Edit, _) = match json(&parts.headers, body, &budget).await {
        Ok(value) => value,
        Err(error) => return error,
    };
    if request.nickname.units_len() > 160 {
        return refusal(
            StatusCode::BAD_REQUEST,
            "invalid-nickname",
            "The nickname is too long.",
        );
    }
    let references = state.references.clone();
    let result = execute_edit(
        &state,
        selected.clone(),
        request.world_id,
        Some(request.generation),
        false,
        move |session, scope| {
            let contact = references
                .resolve_contact_body(
                    session,
                    scope,
                    &request.subject_id,
                    Some(&request.body_reference),
                    &budget,
                )?
                .ok_or(WorldError::ProjectionChanged)?;
            Ok(session.begin_owner_nickname(
                &scope.account_id,
                &scope.actor_id,
                contact.id,
                request.expected_revision,
                request.nickname,
            )?)
        },
    )
    .await;
    match result {
        Ok(Some(edit)) => {
            match state
                .authority
                .current(&selected, Capability::Play, true, |_, _| {
                    reply(&state, StatusCode::OK, &edit.outcome)
                }) {
                Ok(response) => response,
                Err(error) => access_failure(error),
            }
        }
        Ok(None) => refusal(
            StatusCode::SERVICE_UNAVAILABLE,
            "nickname-save-unconfirmed",
            "The save hasn’t been confirmed. Reopen the person window to check the nickname.",
        ),
        Err(WorldError::ProjectionChanged) => refusal(
            StatusCode::CONFLICT,
            "stale-world",
            "Your character or the selected person changed. Reopen the person window.",
        ),
        Err(error) => failed(error),
    }
}
