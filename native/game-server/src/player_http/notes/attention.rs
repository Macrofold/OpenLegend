//! A deliberate preference for one current contact in the player's view.
use super::*;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct FocusRequest {
    #[serde(deserialize_with = "Option::deserialize")]
    target_id: Option<String>,
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
    let (input, _custody): (FocusRequest, _) = match json(&parts.headers, body, &budget).await {
        Ok(value) => value,
        Err(error) => return error,
    };
    let references = state.references.clone();
    let result = apply_edit(
        &state,
        selected.clone(),
        selected.scope.world_id.clone(),
        None,
        true,
        move |session, scope| {
            let contact = input
                .target_id
                .as_ref()
                .map(|target| {
                    references
                        .resolve_contact(session, scope, target, &budget)?
                        .ok_or(WorldError::ProjectionChanged)
                })
                .transpose()?;
            Ok(session.begin_player_focus(
                &scope.account_id,
                &scope.actor_id,
                contact.map(|contact| contact.id),
            )?)
        },
    )
    .await;
    match result {
        Ok(edit) => match state
            .authority
            .current(&selected, Capability::Play, true, |_, _| {
                reply(&state, StatusCode::OK, &edit.outcome)
            }) {
            Ok(response) => response,
            Err(error) => access_failure(error),
        },
        Err(WorldError::ProjectionChanged) => refusal(
            StatusCode::CONFLICT,
            "stale-contact",
            "Choose a target you can see now.",
        ),
        Err(error) => failed(error),
    }
}
