//! The browser shortcut reader sends exact IDs. The same native custody
//! authority that builds the player view admits each requested lot.

use super::*;

mod world_storage;
pub(super) use world_storage::access;

pub(super) async fn page(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let authorized = match scope(&state.authority, &parts.headers, None).await {
        Ok(scope) => scope,
        Err(error) => return access_failure(error),
    };
    let (input, _custody): (crate::player_scene::InventoryPageRequest, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(result) => result,
            Err(response) => return response,
        };
    let Some(language) = state.game.language() else {
        return busy();
    };
    match state
        .game
        .world
        .disclose_inventory_read(
            &state.authority,
            &authorized,
            |session, scope, controlling| {
                if !input.accepts() {
                    return Ok(refusal(
                        StatusCode::BAD_REQUEST,
                        "inventory-unavailable",
                        "Choose a valid carried inventory.",
                    ));
                }
                if let Some(contact) = input.container().filter(|id| id.starts_with("contact-")) {
                    return world_storage::page(&state, session, scope, &input, contact, controlling, language);
                }
                let carried = session.with_player_direct_inventory(
                    &scope.account_id,
                    &scope.actor_id,
                    input.container(),
                    |inventory, budget| {
                        use crate::player_scene::InventoryPageError;
                        let result = match inventory {
                            Some(inventory) => {
                                state.game.view_policy().scene.encode_inventory_page(
                                    inventory,
                                    scope,
                                    controlling,
                                    &input,
                                    language,
                                    &state.references,
                                    budget,
                                )
                            }
                            None if input.continued() => Err(InventoryPageError::Stale),
                            None => return None,
                        };
                        Some(match result {
                            Ok(bytes) => json_response(StatusCode::OK, bytes),
                            Err(InventoryPageError::Stale) => refusal(
                                StatusCode::OK,
                                "stale-inventory",
                                "Contents or access changed. Refresh your inventory.",
                            ),
                            Err(InventoryPageError::Capacity) => busy(),
                            Err(InventoryPageError::Read(error)) => failed(WorldError::from(error)),
                        })
                    },
                )?;
                // The carried reader's native disclosure lease ends before
                // checking an exact world page under the same application cut.
                if let Some(response) = carried {
                    Ok(response)
                } else if let Some(reference) = input.container() {
                    world_storage::page(&state, session, scope, &input, reference, controlling, language)
                } else {
                    Ok(refusal(StatusCode::OK, "inventory-unavailable", "This container is unavailable."))
                }
            },
        )
        .await
    {
        Ok(response) => response,
        Err(error) => failed(error),
    }
}

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
