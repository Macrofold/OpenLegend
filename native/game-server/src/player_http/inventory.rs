//! The browser shortcut reader sends exact IDs. The same native custody
//! authority that builds the player view admits each requested lot.

use super::*;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct BindingRequest {
    item_ids: Vec<String>,
}

pub(super) async fn bindings(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let authorized = match scope(&state.authority, &parts.headers, None).await {
        Ok(scope) => scope,
        Err(error) => return access_failure(error),
    };
    let (input, _custody): (BindingRequest, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(result) => result,
            Err(response) => return response,
        };
    if input.item_ids.len() > openlegend_simulation::install::shortcut_limit()
        || input
            .item_ids
            .iter()
            .any(|id| !crate::npc::valid_request_id(id))
    {
        return refusal(
            StatusCode::BAD_REQUEST,
            "request",
            "Choose valid shortcut items.",
        );
    }
    match state
        .game
        .world
        .disclose_inventory(
            &state.authority,
            &authorized,
            &input.item_ids,
            |items, budget| match state
                .game
                .view_policy()
                .scene
                .encode_inventory_bindings(items, budget)
            {
                Ok(bytes) => json_response(StatusCode::OK, bytes),
                Err(_) => busy(),
            },
        )
        .await
    {
        Ok(response) => response,
        Err(error) => failed(error),
    }
}
