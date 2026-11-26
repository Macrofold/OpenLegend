use super::{
    AccessUpdateError, PlayerRoutes, access_failure, busy, conflict, failed, json, request_error,
    scope,
};
use crate::{
    access_http::refusal,
    authority::{
        AccessError, AuthorizedScope,
        binding::{BindingPreparation, BindingRequest},
    },
    live_save::ProtectedGameplaySave,
    store::{CommitError, StoreError},
    world::{ProtectedCommit, WorldError},
};
use axum::{
    Json,
    extract::{Request, State},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use openlegend_simulation::{
    host::ByteReservation,
    runtime::{RuntimeDirectOutput, RuntimeError},
};
use std::{mem::size_of, sync::Arc};
use uuid::Uuid;

pub(in crate::player_http) async fn change(
    State(state): State<PlayerRoutes>,
    request: Request,
) -> Response {
    let Ok(permit) = state.capacity.clone().try_acquire_owned() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let authorized = match scope(&state.authority, &parts.headers, None).await {
        Ok(scope) => scope,
        Err(error) => return access_failure(error),
    };
    let (request, custody): (BindingRequest, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(value) => value,
            Err(error) => return error,
        };
    if !request.valid() {
        return request_error();
    }
    // Dropping the response socket cannot drop an outstanding save or remove
    // its disclosure fence before that save settles.
    match tokio::spawn(async move {
        let _permit = permit;
        let _custody = custody;
        bind(state, authorized, request).await
    })
    .await
    {
        Ok(response) => response,
        Err(_) => access_failure(AccessError::Availability),
    }
}

async fn bind(
    state: PlayerRoutes,
    authorized: AuthorizedScope,
    request: BindingRequest,
) -> Response {
    match commit_binding(state, authorized, request).await {
        Ok(true) => result("replayed", "Character binding already committed."),
        Ok(false) => result(
            "bound",
            "Character binding changed. Choose Control here to enter the character.",
        ),
        Err(BindingFailure::Access(AccessUpdateError::Conflict)) => refusal(
            StatusCode::FORBIDDEN,
            "conflict",
            "This request conflicts with an earlier request.",
        ),
        Err(BindingFailure::Refused) => conflict(),
        Err(BindingFailure::Access(AccessUpdateError::Access(error))) => access_failure(error),
        Err(BindingFailure::World(error)) => failed(error),
    }
}

fn result(code: &'static str, message: &'static str) -> Response {
    Json(serde_json::json!({ "ok":true, "code":code, "message":message })).into_response()
}

enum BindingFailure {
    Access(AccessUpdateError),
    World(WorldError),
    Refused,
}

struct PreparedBinding {
    save: Option<ProtectedGameplaySave>,
    _custody: ByteReservation,
}

async fn commit_binding(
    state: PlayerRoutes,
    authorized: AuthorizedScope,
    request: BindingRequest,
) -> Result<bool, BindingFailure> {
    let _barrier = state
        .saves
        .enter_protected()
        .await
        .map_err(BindingFailure::World)?;
    let (binding, mut fence) = match state
        .authority
        .prepare_binding(&authorized, request, || state.saves.signal_view())
        .await
        .map_err(BindingFailure::Access)?
    {
        BindingPreparation::Replayed => return Ok(true),
        BindingPreparation::Ready(binding, fence) => (binding, fence),
    };
    let (account, previous, target) = binding
        .native_input()
        .map_err(WorldError::from)
        .map_err(BindingFailure::World)?;
    let attempt = Uuid::new_v4().to_string();
    let game = state.game.clone();
    let writer = game.store.clone();
    let project = writer.clone();
    let language = game.language().cloned();
    let result = state
        .game
        .world
        .execute_protected(
            move |world| world.begin_account_rebinding(account, previous, target, attempt),
            move |question| {
                let game = Arc::clone(&game);
                async move { game.answer_operation(question).await }
            },
            move |output, budget| {
                let RuntimeDirectOutput::Prepared(prepared) = output else {
                    return Err(RuntimeError::application_refused(StoreError::InvalidRecord));
                };
                let save = prepared
                    .outcome()
                    .ok
                    .then(|| ProtectedGameplaySave::prepare(&prepared, &project, budget))
                    .transpose()?;
                Ok(PreparedBinding {
                    save,
                    _custody: budget.reserve(size_of::<PreparedBinding>())?,
                })
            },
            || Ok(()),
            move |prepared, prefix| -> ProtectedCommit<'_> {
                Box::pin(async move {
                    let save = prepared.save.as_ref().ok_or(CommitError::RolledBack(
                        StoreError::DerivedProjectionRequired,
                    ))?;
                    let projection = binding.project(save.projection(&writer, language.as_deref()));
                    let acknowledgement = writer.commit_save(prefix, &[], &projection).await?;
                    save.record_commit(&projection.ordinary);
                    Ok(acknowledgement)
                })
            },
        )
        .await;
    match result {
        Ok(prepared) => {
            let save = prepared
                .and_then(|prepared| prepared.save)
                .ok_or(BindingFailure::Refused)?;
            save.acknowledged(&state.saves);
            Ok(false)
        }
        Err(error) => {
            if matches!(error, WorldError::RecoveryRequired) {
                fence.uncertain();
            }
            Err(BindingFailure::World(error))
        }
    }
}
