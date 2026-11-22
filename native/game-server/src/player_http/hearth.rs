//! The existing browser Build panel reads a scoped catalogue, previews through
//! the same rolled-back command as execution, and submits its exact plan.
use super::*;
use crate::world::ApplicationStart;
use openlegend_simulation::{
    runtime::{RuntimeDirectOutput, RuntimeError, RuntimeHearthShape, RuntimePlayerCommand},
    state::SurfacePoint,
    values::{DefinitionPin, is_safe_record_id},
};

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct HearthPlan {
    pub(crate) definition: DefinitionPin,
    pub(crate) site: SurfacePoint,
}

impl HearthPlan {
    pub(crate) fn valid(&self) -> bool {
        let site = &self.site;
        self.definition.is_valid()
            && is_safe_record_id(&site.surface_id)
            && [site.x, site.y, site.z].into_iter().all(f64::is_finite)
    }
}

pub(super) async fn catalogue(State(state): State<PlayerRoutes>, headers: HeaderMap) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let scope = match read_scope(&state.authority, &headers).await {
        Ok(scope) => Arc::new(scope),
        Err(error) => return access_failure(error),
    };
    let grants = match state
        .game
        .store
        .construction_materials(&scope.scope.world_id, Some(&scope.scope.actor_id))
        .await
    {
        Ok(grants) => grants,
        Err(error) => return failed(error.into()),
    };
    let authority = state.authority.clone();
    let game = state.game.clone();
    let result = state
        .game
        .world
        .capture(move |session| {
            authority
                .current(&scope, Capability::Play, false, |scope, _| {
                    session.with_hearth_catalogue(
                        &scope.account_id,
                        &scope.actor_id,
                        &grants,
                        |ray| Ok(game.spatial.hearth_site_visible(ray)),
                        |value| {
                            wire::encode(&value, b"", b"", game.host.budget())
                                .map_err(RuntimeError::application_refused)
                        },
                    )
                })
                .map_err(RuntimeError::application_refused)?
        })
        .await;
    match result {
        Ok(bytes) => json_response(StatusCode::OK, bytes),
        Err(error) => failed(error),
    }
}

#[derive(Serialize)]
struct Preview<'a> {
    #[serde(flatten)]
    result: &'a openlegend_simulation::commands::Outcome,
    shapes: &'a [RuntimeHearthShape],
}

pub(super) async fn preview(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let scope = match scope(&state.authority, &parts.headers, None).await {
        Ok(scope) => Arc::new(scope),
        Err(error) => return access_failure(error),
    };
    let (plan, _custody): (HearthPlan, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(plan) => plan,
            Err(response) => return response,
        };
    if !plan.valid() {
        return access_failure(AccessError::Forbidden);
    }
    let grants = match state
        .game
        .store
        .construction_materials(&scope.scope.world_id, Some(&scope.scope.actor_id))
        .await
    {
        Ok(grants) => grants,
        Err(error) => return failed(error.into()),
    };
    let shape = Arc::new(std::sync::Mutex::new(None::<RuntimeHearthShape>));
    let preparing = shape.clone();
    let authority = state.authority.clone();
    let start_scope = scope.clone();
    let publish_authority = state.authority.clone();
    let game = state.game.clone();
    let result = state
        .game
        .world
        .execute_and_publish(
            #[cfg(feature = "profile-campaign")]
            openlegend_simulation::profile::sites::TURN_COMMAND,
            move |session| {
                authority.current(&start_scope, Capability::Play, true, |_, _| ())?;
                session.with_hearth_preview_shape(
                    &start_scope.scope.account_id,
                    &start_scope.scope.actor_id,
                    &plan.definition,
                    &plan.site,
                    |value| {
                        *preparing
                            .lock()
                            .map_err(RuntimeError::application_refused)? = value;
                        Ok(())
                    },
                )?;
                Ok(ApplicationStart::Candidate(
                    session.begin_player_command_with_materials(
                        "hearth-placement-preview",
                        &start_scope.scope.actor_id,
                        RuntimePlayerCommand::PlaceHearth {
                            definition: &plan.definition,
                            site: &plan.site,
                        },
                        true,
                        Some(grants),
                    )?,
                ))
            },
            move |question| {
                let game = game.clone();
                async move { game.answer_operation(question).await }
            },
            move |output, budget| {
                let RuntimeDirectOutput::Preview(result) = output else {
                    return Err(RuntimeError::application_refused(
                        "Hearth preview did not roll back",
                    ));
                };
                publish_authority
                    .current(&scope, Capability::Play, true, |_, _| {
                        let shape = shape.lock().map_err(RuntimeError::application_refused)?;
                        wire::encode(
                            &Preview {
                                result,
                                shapes: shape.as_slice(),
                            },
                            b"",
                            b"",
                            budget,
                        )
                        .map_err(RuntimeError::application_refused)
                    })
                    .map_err(RuntimeError::application_refused)?
            },
            |fence, key, _| Ok(fence.settle(key, false)?),
            |_| {},
        )
        .await;
    match result {
        Ok(Some(bytes)) => json_response(StatusCode::OK, bytes),
        Ok(None) => failed(WorldError::ProjectionChanged),
        Err(error) => failed(error),
    }
}
