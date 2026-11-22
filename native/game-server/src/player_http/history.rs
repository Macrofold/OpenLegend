//! The browser Journal reads its own permitted durable story page.

use super::*;
use crate::store::{DurableHead, Transcript, TranscriptRequest};
use crate::world::PlayerDisclosure;

#[derive(Serialize)]
struct Journal<'a> {
    items: &'a [crate::store::TranscriptItem],
    watermark: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    before: Option<u64>,
    voice: &'a crate::player_view::profile::Voice,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Regenerate {
    id: String,
    request_id: String,
}

#[derive(Serialize)]
struct Regeneration {
    ok: bool,
    code: &'static str,
    message: &'static str,
}

pub(super) async fn regenerate(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(slot) = state.capacity.clone().try_acquire_owned() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let selected = match scope(&state.authority, &parts.headers, None).await {
        Ok(selected) => selected,
        Err(error) => return access_failure(error),
    };
    let (input, custody): (Regenerate, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(value) => value,
            Err(error) => return error,
        };
    if !(1..=300).contains(&input.id.encode_utf16().count())
        || !(1..=120).contains(&input.request_id.len())
        || !input
            .request_id
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, b'_' | b'.' | b':' | b'-'))
    {
        return refusal(
            StatusCode::BAD_REQUEST,
            "request",
            "This request could not be read.",
        );
    }
    // Retain the operational transaction through a disconnect. A new tab
    // can submit the same request ID and recover the durable result.
    let result = tokio::spawn(async move {
        let _owners = (slot, custody);
        let _intake = state.saves.enter_ordinary().await;
        state
            .clock
            .maintenance()
            .allow_ordinary(&state.authority, &selected)?;
        state
            .authority
            .current(&selected, Capability::Play, false, |_, _| ())?;
        let fields = &selected.scope;
        let ok = state
            .game
            .store
            .regenerate_story(
                fields.world_id.clone(),
                fields.account_id.clone(),
                fields.actor_id.clone(),
                input.id,
                input.request_id,
            )
            .await
            .map_err(WorldError::Commit)?;
        if ok {
            state.saves.story_waker().notify_one();
            state.saves.signal_view();
        }
        Ok::<_, WorldError>(state.authority.current(
            &selected,
            Capability::Play,
            false,
            |_, _| {
                let report = if ok {
                    Regeneration {
                        ok,
                        code: "queued",
                        message: "Narration revision queued.",
                    }
                } else {
                    Regeneration {
                        ok,
                        code: "unavailable",
                        message: "Narration is unavailable or already in progress.",
                    }
                };
                match wire::encode(&report, b"", b"", state.game.host.budget()) {
                    Ok(bytes) => json_response(StatusCode::OK, bytes),
                    Err(_) => busy(),
                }
            },
        )?)
    })
    .await;
    match result {
        Ok(Ok(response)) => response,
        Ok(Err(error)) => failed(error),
        Err(_) => busy(),
    }
}

pub(super) async fn journal(
    State(state): State<PlayerRoutes>,
    Query(request): Query<TranscriptRequest>,
    headers: HeaderMap,
) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let scope = match scope(&state.authority, &headers, None).await {
        Ok(scope) => Arc::new(scope),
        Err(error) => return access_failure(error),
    };
    for _ in 0..2 {
        match page(&state, &scope, &request).await {
            Ok(PlayerDisclosure::Published(payload)) => {
                return json_response(StatusCode::OK, payload);
            }
            Ok(PlayerDisclosure::Busy | PlayerDisclosure::Changed)
            | Err(WorldError::Storage(StoreError::StaleCut)) => continue,
            Ok(PlayerDisclosure::Unchanged) => break,
            Err(error) => return failed(error),
        }
    }
    access_failure(AccessError::Changed)
}

async fn page(
    state: &PlayerRoutes,
    scope: &Arc<AuthorizedScope>,
    request: &TranscriptRequest,
) -> Result<PlayerDisclosure, WorldError> {
    let game = &state.game;
    let world = &game.world;
    let budget = game.host.budget();
    let need = binding_bytes(&scope.scope).ok_or(StoreError::Capacity)?;
    let _binding = budget.reserve(need).map_err(|_| StoreError::Capacity)?;
    let selected = world
        .capture_transcript(state.authority.clone(), scope.clone())
        .await?;
    let (id, generation, revision) = selected.durable_head();
    let language = game.language().cloned().ok_or(WorldError::ProviderKind)?;
    let rows = game
        .store
        .transcript(
            DurableHead {
                world_id: id.to_owned(),
                generation: generation.to_owned(),
                revision,
            },
            scope.scope.account_id.clone(),
            scope.scope.actor_id.clone(),
            request,
        )
        .await?;
    let work = budget.clone();
    let mut page: Transcript = game
        .host
        .compute(move || rows.prepare(&language, &work))
        .await??;
    let output = page
        .items
        .iter()
        .try_fold(4096usize, |used, item| {
            used.checked_add(item.impacts.len().checked_mul(128)?)?
                .checked_add(64)
        })
        .ok_or(StoreError::Capacity)?;
    let _references = budget.reserve(output).map_err(|_| StoreError::Capacity)?;
    let references = state
        .references
        .scoped(&scope.scope)
        .map_err(|_| StoreError::InvalidRecord)?;
    for item in &mut page.items {
        item.project_impacts(&scope.scope.actor_id, &references)?;
    }
    let temporal = page
        .items
        .iter()
        .filter_map(|item| item.temporal.as_ref().map(|(id, at)| (id, *at)))
        .collect::<Vec<_>>();
    let expires_at = page
        .items
        .iter()
        .filter_map(|item| item.expires_at)
        .reduce(f64::min);
    world
        .disclose_transcript(
            &state.authority,
            scope,
            &selected,
            &temporal,
            expires_at,
            |_, _, budget| {
                let visible = Journal {
                    items: &page.items,
                    watermark: page.watermark,
                    before: page.before,
                    voice: &page.voice,
                };
                wire::encode(&visible, b"", b"", budget).map_err(WorldError::Wire)
            },
        )
        .await
}

fn binding_bytes(scope: &crate::authority::RequestScope) -> Option<usize> {
    [
        scope.account_id.len(),
        scope.actor_id.len(),
        scope.world_id.len(),
        scope.timeline_id.len(),
    ]
    .into_iter()
    .try_fold(4096usize, usize::checked_add)
}
