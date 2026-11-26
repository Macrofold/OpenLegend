//! A signed creation uses the same scoped save and replay receipt as ordinary creator edits.
use super::*;
use openlegend_simulation::runtime::PersonCreation;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Create {
    id: String,
    #[serde(flatten)]
    person: PersonCreation,
}

pub(super) async fn create(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let selected = match scope(&state.authority, &parts.headers, None).await {
        Ok(scope) => Arc::new(scope),
        Err(error) => return access_failure(error),
    };
    let (input, custody): (Create, _) =
        match read_json(&parts.headers, body, state.game.host.budget(), false, 32768).await {
            Ok(input) => input,
            Err(error) => return error,
        };
    if !input.person.valid() || !openlegend_simulation::values::is_safe_record_id(&input.id) {
        return refusal(
            StatusCode::BAD_REQUEST,
            "invalid-person",
            "Check the character details and position.",
        );
    }
    let geometry = state.game.spatial.clone();
    let budget = state.game.host.budget().clone();
    let result = notes::execute_authorized_edit(
        &state,
        selected.clone(),
        selected.scope.world_id.clone(),
        None,
        true,
        notes::EditAccess::CreateControlled,
        move |world, scope| {
            let _input = custody;
            let spatial = geometry
                .current(world.structure_scene()?.as_ref(), &budget)
                .map_err(openlegend_simulation::runtime::RuntimeError::application_refused)?;
            Ok(world.begin_person_creation(
                &scope.account_id,
                &scope.actor_id,
                input.id,
                input.person,
                |point, body| spatial.can_stand(point, body),
            )?)
        },
    )
    .await;
    match result {
        Ok(Some(edit)) => reply(
            &state,
            if edit.outcome.ok {
                StatusCode::OK
            } else {
                StatusCode::CONFLICT
            },
            &edit.outcome,
        ),
        Ok(None) => refusal(
            StatusCode::SERVICE_UNAVAILABLE,
            "save-unconfirmed",
            "Check the retained creation request before trying again.",
        ),
        Err(WorldError::Simulation(e)) if e.stale_reason() == Some("person-creation-site") => {
            refusal(
                StatusCode::CONFLICT,
                "blocked",
                "Choose an unobstructed walkable surface.",
            )
        }
        Err(WorldError::Simulation(e))
            if e.stale_reason() == Some("person-creation-unavailable") =>
        {
            refusal(
                StatusCode::CONFLICT,
                "unsupported",
                "This world has no character creation template.",
            )
        }
        Err(error) => failed(error),
    }
}
