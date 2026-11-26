//! The actual artwork control selects the exact installed build. The request
//! owns no asset authority beyond the current world grant and catalog rights.

use super::super::{
    PlayerRoutes, access_failure, busy, refusal,
    save_access::{authorizer, operation, publish},
};
use crate::{
    authority::AuthorizedScope,
    store::{
        CommitError, MetadataProjection, StoreError,
        assets::{
            AssetRevision,
            selection::{ArtworkChoice, ArtworkProjection},
        },
    },
    world::{ProtectedCommit, WorldError},
};
use axum::{
    extract::{Request, State},
    http::StatusCode,
    response::Response,
};
use openlegend_simulation::runtime::{RuntimeDirectOutput, RuntimeError};
use serde::Serialize;
use std::sync::Arc;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SelectionResult {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    reference: Option<AssetRevision>,
    #[serde(skip_serializing_if = "Option::is_none")]
    revision: Option<u64>,
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    completed_unavailable: bool,
    retryable: bool,
}

pub(in crate::player_http) async fn install(
    State(state): State<PlayerRoutes>,
    request: Request,
) -> Response {
    let call = match operation::<ArtworkChoice>(&state, request).await {
        Ok(call) => call,
        Err(response) => return response,
    };
    if !call.input.valid() {
        return invalid();
    }
    let result = install_choice(&state, &call.authorized, call.input, call.custody).await;
    publish(&state, &call.authorized, || result)
}

async fn install_choice(
    state: &PlayerRoutes,
    authorized: &Arc<AuthorizedScope>,
    choice: ArtworkChoice,
    custody: openlegend_simulation::host::ByteReservation,
) -> Result<SelectionResult, Response> {
    let scope = &authorized.scope;
    let identity = choice.receipt(scope).map_err(storage_failure)?;
    if let Some(reference) = state
        .game
        .store
        .artwork_receipt(&identity)
        .await
        .map_err(storage_failure)?
    {
        return readable_result(state, authorized, reference, false).await;
    }
    if choice.timeline != scope.timeline_id {
        return Err(access_failure(crate::authority::AccessError::Changed));
    }
    if state
        .game
        .installed_assets()
        .is_none_or(|assets| assets.release() != &choice.reference)
    {
        return Err(refusal(
            StatusCode::CONFLICT,
            "release-changed",
            "Select the exact artwork installed in this game build.",
        ));
    }
    let _barrier = state.saves.enter_protected().await.map_err(world_failure)?;
    if let Some(reference) = state
        .game
        .store
        .artwork_receipt(&identity)
        .await
        .map_err(storage_failure)?
    {
        return readable_result(state, authorized, reference, false).await;
    }
    let expected_revision = choice.expected_revision;
    if artwork_revision(state).await? != expected_revision {
        return Err(choice_changed());
    }
    let allowed = authorizer(state, authorized.clone(), custody);
    allowed().map_err(world_failure)?;
    let reference = choice.reference;
    if state
        .game
        .store
        .permit_installed_asset(&scope.account_id, &reference, None)
        .await
        .map_err(storage_failure)?
        .is_none()
    {
        return Err(asset_denied());
    }
    let raw = serde_json::value::to_raw_value(&reference).map_err(|_| busy())?;
    let scoped = authorized.clone();
    let retained = reference.clone();
    let store = state.game.store.clone();
    state
        .game
        .world
        .execute_protected(
            move |world| world.begin_presentation_release(raw, expected_revision),
            |_| async {
                Err(
                    RuntimeError::application_refused("An artwork choice has no provider work")
                        .into(),
                )
            },
            |output, _| match output {
                RuntimeDirectOutput::Prepared(products) => {
                    products.metadata_control().map(MetadataProjection::new)
                }
                _ => Err(RuntimeError::application_refused(
                    "An artwork choice cannot preview",
                )),
            },
            allowed,
            move |metadata, prefix| -> ProtectedCommit<'_> {
                Box::pin(async move {
                    let projection = ArtworkProjection {
                        metadata,
                        operation: identity,
                        reference: retained,
                        scope: scoped,
                    };
                    store.commit_prefix(prefix.rows(), &[], &projection).await
                })
            },
        )
        .await
        .map_err(world_failure)?
        .ok_or_else(busy)?;
    state.saves.signal_view();
    readable_result(state, authorized, reference, false).await
}

pub(in crate::player_http) async fn receipt(
    State(state): State<PlayerRoutes>,
    request: Request,
) -> Response {
    let call = match operation::<ArtworkChoice>(&state, request).await {
        Ok(call) => call,
        Err(response) => return response,
    };
    if !call.input.valid() {
        return invalid();
    }
    let result = choice_receipt(&state, &call.authorized, call.input).await;
    publish(&state, &call.authorized, || result)
}

async fn choice_receipt(
    state: &PlayerRoutes,
    authorized: &AuthorizedScope,
    choice: ArtworkChoice,
) -> Result<SelectionResult, Response> {
    let scope = &authorized.scope;
    let operation = choice.receipt(scope).map_err(storage_failure)?;
    if let Some(reference) = state
        .game
        .store
        .artwork_receipt(&operation)
        .await
        .map_err(storage_failure)?
    {
        return readable_result(state, authorized, reference, true).await;
    }
    let retryable = choice.timeline == scope.timeline_id
        && state
            .game
            .installed_assets()
            .is_some_and(|assets| assets.release() == &choice.reference)
        && artwork_revision(state).await? == choice.expected_revision;
    Ok(SelectionResult {
        ok: true,
        reference: None,
        revision: None,
        completed_unavailable: false,
        retryable,
    })
}

async fn artwork_revision(state: &PlayerRoutes) -> Result<u64, Response> {
    state
        .game
        .world
        .capture(|world| Ok(world.saved_presentation_release().1.unwrap_or(0)))
        .await
        .map_err(world_failure)
}

async fn readable_result(
    state: &PlayerRoutes,
    authorized: &AuthorizedScope,
    reference: AssetRevision,
    report_unavailable: bool,
) -> Result<SelectionResult, Response> {
    let revision = if report_unavailable {
        None
    } else {
        Some(artwork_revision(state).await?)
    };
    let readable = state
        .game
        .store
        .permit_installed_asset(&authorized.scope.account_id, &reference, None)
        .await
        .map_err(storage_failure)?
        .is_some();
    if !readable && !report_unavailable {
        return Err(asset_denied());
    }
    Ok(SelectionResult {
        ok: true,
        reference: readable.then_some(reference),
        revision,
        completed_unavailable: !readable,
        retryable: false,
    })
}

fn invalid() -> Response {
    refusal(
        StatusCode::BAD_REQUEST,
        "invalid-input",
        "The artwork choice is invalid.",
    )
}

fn asset_denied() -> Response {
    refusal(
        StatusCode::FORBIDDEN,
        "artwork-unavailable",
        "This account cannot use the installed artwork.",
    )
}

fn choice_changed() -> Response {
    refusal(
        StatusCode::CONFLICT,
        "artwork-changed",
        "The artwork choice or its access changed. Refresh before selecting.",
    )
}

fn storage_failure(error: StoreError) -> Response {
    match error {
        StoreError::StaleCut => choice_changed(),
        _ => busy(),
    }
}

fn world_failure(error: WorldError) -> Response {
    match error {
        WorldError::Access(error) => access_failure(error),
        WorldError::Commit(CommitError::RolledBack(error)) => storage_failure(error),
        _ => busy(),
    }
}
