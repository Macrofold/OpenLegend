//! Reuse the normal inventory disclosure lane for the selected world contact.
use super::*;
use openlegend_simulation::{
    runtime::{NativeWorldSession, RuntimeError, RuntimeWorldStorage},
    text::JsText,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RequestBody {
    container_id: String,
    #[serde(default)]
    approach: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AccessBody<'a> {
    ok: bool,
    scope: &'a str,
    status: &'static str,
    container: Option<ContainerAccess<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stance: Option<&'a openlegend_simulation::state::SurfacePoint>,
    #[serde(skip_serializing_if = "Option::is_none")]
    message: Option<&'static str>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ContainerAccess<'a> {
    id: &'a str,
    root_id: &'a str,
    name: &'a JsText,
    location: &'a JsText,
    placement_revision: u64,
    geometry_revision: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    revision: Option<u64>,
}

const UNAVAILABLE: &str = "This container is unavailable.";
const MOVE_CLOSER: &str = "Move within reach, then recheck access before opening.";

pub(in crate::player_http) async fn access(
    State(state): State<PlayerRoutes>,
    request: Request,
) -> Response {
    let Ok(_permit) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let authorized = match scope(&state.authority, &parts.headers, None).await {
        Ok(scope) => scope,
        Err(error) => return access_failure(error),
    };
    let (input, _custody): (RequestBody, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(value) => value,
            Err(response) => return response,
        };
    if !input.container_id.starts_with("contact-")
        || !crate::npc::valid_request_id(&input.container_id)
    {
        return refusal(StatusCode::BAD_REQUEST, "request", UNAVAILABLE);
    }
    match state
        .game
        .world
        .disclose_inventory_read(&state.authority, &authorized, |session, scope, _| {
            let key = scope.key().map_err(RuntimeError::application_refused)?;
            let available = with_selected(
                &state,
                session,
                scope,
                &input.container_id,
                input.approach,
                |read, budget| {
                    let access = AccessBody {
                        ok: true,
                        scope: &key,
                        status: if read.ready { "ready" } else { "out-of-reach" },
                        container: Some(ContainerAccess {
                            id: &input.container_id,
                            root_id: &input.container_id,
                            name: &read.name.name,
                            location: &read.name.name,
                            placement_revision: read.placement_revision,
                            geometry_revision: read.geometry_revision,
                            revision: read.inspection.map(|page| page.revision),
                        }),
                        stance: read.stance,
                        message: (!read.ready).then_some(MOVE_CLOSER),
                    };
                    Ok(encode_access(&access, budget))
                },
            )?;
            Ok(available.unwrap_or_else(|| {
                encode_access(
                    &AccessBody {
                        ok: false,
                        scope: &key,
                        status: "unavailable",
                        container: None,
                        stance: None,
                        message: Some(UNAVAILABLE),
                    },
                    state.game.host.budget(),
                )
            }))
        })
        .await
    {
        Ok(response) => response,
        Err(error) => failed(error),
    }
}

fn encode_access(value: &AccessBody<'_>, budget: &ByteBudget) -> Response {
    match crate::wire::encode(value, b"", b"", budget) {
        Ok(bytes) => json_response(StatusCode::OK, bytes),
        Err(_) => busy(),
    }
}

pub(super) fn page(
    state: &PlayerRoutes,
    session: &NativeWorldSession,
    scope: &crate::authority::RequestScope,
    input: &crate::player_scene::InventoryPageRequest,
    contact: &str,
    controlling: bool,
    language: &crate::language::LanguageProvider,
) -> Result<Response, RuntimeError> {
    use crate::player_scene::InventoryPageError;
    let unavailable = || refusal(StatusCode::OK, "inventory-unavailable", UNAVAILABLE);
    Ok(
        with_selected(state, session, scope, contact, false, |read, budget| {
            if !read.ready || read.inspection.is_none() {
                return Ok(unavailable());
            }
            Ok(
                match state
                    .game
                    .view_policy()
                    .scene
                    .encode_inspected_inventory(read, input, contact, controlling, language, budget)
                {
                    Ok(bytes) => json_response(StatusCode::OK, bytes),
                    Err(InventoryPageError::Stale) => refusal(
                        StatusCode::OK,
                        "stale-inventory",
                        "Inspect the next contents before reading another page.",
                    ),
                    Err(InventoryPageError::Capacity) => busy(),
                    Err(InventoryPageError::Read(error)) => failed(WorldError::from(error)),
                },
            )
        })?
        .unwrap_or_else(unavailable),
    )
}

fn with_selected<T>(
    state: &PlayerRoutes,
    session: &NativeWorldSession,
    scope: &crate::authority::RequestScope,
    contact: &str,
    approach: bool,
    respond: impl FnOnce(RuntimeWorldStorage<'_>, &ByteBudget) -> Result<T, RuntimeError>,
) -> Result<Option<T>, RuntimeError> {
    let scoped = state
        .references
        .scoped(scope)
        .map_err(RuntimeError::application_refused)?;
    session.with_player_world_storage(
        &scope.account_id,
        &scope.actor_id,
        approach,
        |current| {
            scoped
                .contact(
                    current.source_id,
                    current.physical_life.unwrap_or(0),
                    current.lease_id,
                )
                .is_ok_and(|id| id == contact)
        },
        |queries| {
            state
                .game
                .spatial
                .compute(queries, state.game.host.budget())
                .map(|result| result.into_parts())
                .map_err(RuntimeError::application_refused)
        },
        respond,
    )
}
