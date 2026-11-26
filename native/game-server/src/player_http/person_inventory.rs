//! Publish one catalogue page with the selected person's current carried quantities.
use super::*;
use crate::world::PlayerDisclosure;
use openlegend_simulation::runtime::PersonEditorCut;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Read {
    actor_id: String,
    #[serde(default)]
    start: usize,
}
#[derive(Serialize)]
struct Page<'a, T> {
    ok: bool,
    cut: PersonEditorCut<'a>,
    #[serde(flatten)]
    inventory: T,
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
    let (input, _custody): (Read, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(input) => input,
            Err(error) => return error,
        };
    let actor = match person_editor::actor(&state, &selected, input.actor_id).await {
        Ok(actor) => actor,
        Err(error) => return failed(error),
    };
    let result = state
        .game
        .world
        .disclose_private_notes(&state.authority, &selected, &actor, |session, budget, _| {
            if !session.may_edit_recall(&selected.scope.actor_id, &actor)? {
                return Err(AccessError::Forbidden.into());
            }
            session
                .inspect_person_editor(&actor, |_, _, cut, _, _, attributes| {
                    let inventory = attributes.inventory(input.start, budget)?;
                    wire::encode(
                        &Page {
                            ok: true,
                            cut,
                            inventory,
                        },
                        b"",
                        b"",
                        budget,
                    )
                    .map_err(WorldError::Wire)
                })?
                .ok_or(WorldError::ProjectionChanged)?
        })
        .await;
    match result {
        Ok(PlayerDisclosure::Published(bytes)) => json_response(StatusCode::OK, bytes),
        Ok(PlayerDisclosure::Busy) => busy(),
        Ok(_) => failed(WorldError::ProjectionChanged),
        Err(error) => failed(error),
    }
}
