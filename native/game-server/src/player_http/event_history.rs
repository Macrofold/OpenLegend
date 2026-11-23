//! The ordinary Events tab reads durable, acquired accounts. Current live
//! contact references are offered only by the final native read owner.

use super::*;
use crate::{
    player_events::{EventSourceDetail, EventSourceReference, PublicEvent},
    store::{DurableHead, EventBoundary, EventFeed, EventSourceQuery},
    world::PlayerDisclosure,
};
use openlegend_simulation::encoding::{hex_bytes, json_record, sha256_hex};
use tokio::time::Instant;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct RequestOptions {
    #[serde(rename = "type")]
    kind: Option<String>,
    category: Option<String>,
    #[serde(default)]
    show_all: bool,
    at: Option<f64>,
    cursor: Option<String>,
    limit: Option<u64>,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Cursor {
    binding: String,
    edge: EventBoundary,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PublicFeed {
    events: Vec<PublicFeedEvent>,
    #[serde(skip_serializing_if = "Option::is_none")]
    next_cursor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    newer_cursor: Option<String>,
}

#[derive(Serialize)]
struct PublicFeedEvent {
    #[serde(flatten)]
    event: PublicEvent,
    #[serde(skip_serializing_if = "Option::is_none")]
    source: Option<EventSourceReference>,
}

pub(super) async fn events(
    State(state): State<PlayerRoutes>,
    Query(options): Query<RequestOptions>,
    headers: HeaderMap,
) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let scope = match scope(&state.authority, &headers, None).await {
        Ok(scope) => Arc::new(scope),
        Err(error) => return access_failure(error),
    };
    if options.show_all {
        if !state.god_mode {
            return access_failure(AccessError::Forbidden);
        }
        if let Err(error) = state
            .authority
            .current_private_view(&scope, true, |_, _| ())
        {
            return access_failure(error);
        }
    }
    let category = options.category.as_deref().unwrap_or("all");
    if ![
        "all",
        "speech",
        "actions",
        "conflict",
        "body",
        "observations",
    ]
    .contains(&category)
        || options
            .kind
            .as_deref()
            .is_some_and(|kind| !valid_kind(kind))
        || options.at.is_some_and(|at| !at.is_finite() || at < 0.0)
        || options
            .limit
            .is_some_and(|limit| !(1..=100).contains(&limit))
    {
        return refusal(
            StatusCode::BAD_REQUEST,
            "event-history",
            "Check the event filters and try again.",
        );
    }
    let until = Instant::now() + REQUEST_TIMEOUT;
    for _ in 0..2 {
        match read(&state, &scope, &options, category, until).await {
            Ok(PlayerDisclosure::Published(bytes)) => return json_response(StatusCode::OK, bytes),
            Ok(PlayerDisclosure::Changed | PlayerDisclosure::Busy)
            | Err(WorldError::Storage(StoreError::StaleCut)) => continue,
            Ok(PlayerDisclosure::Unchanged) => break,
            Err(error) => return failed(error),
        }
    }
    access_failure(AccessError::Changed)
}

async fn read(
    state: &PlayerRoutes,
    scope: &Arc<AuthorizedScope>,
    options: &RequestOptions,
    category: &str,
    until: Instant,
) -> Result<PlayerDisclosure, WorldError> {
    let game = &state.game;
    let budget = game.host.budget();
    let policy = &game.view_policy().events;
    let (types, inclusive) = policy.history_kinds(category, options.show_all);
    let need = types
        .iter()
        .try_fold(8192usize, |n, kind| {
            n.checked_add(kind.len())?.checked_add(64)
        })
        .ok_or(StoreError::Capacity)?;
    let _request = budget.reserve(need).map_err(|_| StoreError::Capacity)?;
    let selected = game
        .world
        .capture_transcript(state.authority.clone(), scope.clone())
        .await?;
    let (world, generation, revision) = selected.durable_head();
    let scope_digest = scope.scope.key().map_err(|_| AccessError::Changed)?;
    let binding = sha256_hex(
        json_record(&(
            scope_digest,
            generation,
            selected.privacy_revision(),
            category,
            options.kind.as_ref(),
            options.show_all,
        ))
        .map_err(|_| StoreError::InvalidRecord)?
        .as_bytes(),
    );
    let boundary = options
        .cursor
        .as_deref()
        .map(|cursor| decode_cursor(cursor, &binding))
        .transpose()?;
    let rows = game
        .store
        .event_feed(
            DurableHead {
                world_id: world.to_owned(),
                generation: generation.to_owned(),
                revision,
            },
            scope.scope.actor_id.clone(),
            EventSourceQuery {
                kind: options.kind.clone().filter(|kind| kind != "all"),
                types: types.into_iter().map(str::to_owned).collect(),
                inclusive,
                at: options.at,
                boundary,
                limit: options.limit.unwrap_or(50) as i64,
            },
        )
        .await?;
    let language = game.language().cloned().ok_or(WorldError::ProviderKind)?;
    let feed: EventFeed = if rows.is_empty() {
        rows.prepare(&language, budget)?
    } else {
        let work = budget.clone();
        game.host
            .compute_before(until, move || rows.prepare(&language, &work))
            .await??
    };
    let references = state
        .references
        .scoped(&scope.scope)
        .map_err(|_| StoreError::InvalidRecord)?;
    let temporal = feed
        .events
        .iter()
        .filter_map(|row| row.temporal.as_ref().map(|(id, at)| (id, *at)))
        .collect::<Vec<_>>();
    let expiry = feed
        .events
        .iter()
        .filter_map(|row| row.event.expires_at)
        .reduce(f64::min);
    let next_cursor = feed
        .older
        .clone()
        .map(|cursor| encode_cursor(&binding, cursor))
        .transpose()?;
    let newer_cursor = feed
        .newer
        .clone()
        .map(|cursor| encode_cursor(&binding, cursor))
        .transpose()?;
    let _projection = budget
        .reserve(feed.projection_bytes().ok_or(StoreError::Capacity)?)
        .map_err(|_| StoreError::Capacity)?;
    game.world
        .disclose_transcript(
            &state.authority,
            scope,
            &selected,
            &temporal,
            expiry,
            |session, lease, budget| {
                let roles = session.recorded_event_roles(&selected, lease)?;
                let events = feed
                    .events
                    .iter()
                    .map(|row| {
                        Ok::<_, crate::player_events::PlayerEventError>(PublicFeedEvent {
                            event: row.event.project(policy, &references, &roles)?,
                            source: row.event.source_reference(
                                &references,
                                generation,
                                &row.revision,
                            )?,
                        })
                    })
                    .collect::<Result<Vec<_>, _>>()
                    .map_err(|_| StoreError::InvalidRecord)?;
                wire::encode(
                    &PublicFeed {
                        events,
                        next_cursor,
                        newer_cursor,
                    },
                    b"",
                    b"",
                    budget,
                )
                .map_err(WorldError::Wire)
            },
        )
        .await
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct SourceRequest {
    references: Vec<EventSourceReference>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PublicSources<'a> {
    ok: bool,
    world_id: &'a str,
    generation: &'a str,
    sources: Vec<EventSourceDetail<'a>>,
}

pub(super) async fn sources(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let scope = match scope(&state.authority, &parts.headers, None).await {
        Ok(scope) => Arc::new(scope),
        Err(error) => return access_failure(error),
    };
    let (selected, _input): (SourceRequest, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(input) => input,
            Err(error) => return error,
        };
    if !(1..=2).contains(&selected.references.len()) {
        return refusal(
            StatusCode::BAD_REQUEST,
            "event-history",
            "Select one or two event sources.",
        );
    }
    let until = Instant::now() + REQUEST_TIMEOUT;
    for _ in 0..2 {
        match read_sources(&state, &scope, &selected.references, until).await {
            Ok(PlayerDisclosure::Published(bytes)) => return json_response(StatusCode::OK, bytes),
            Ok(PlayerDisclosure::Changed | PlayerDisclosure::Busy)
            | Err(WorldError::Storage(StoreError::StaleCut)) => continue,
            Ok(PlayerDisclosure::Unchanged) => break,
            Err(error) => return failed(error),
        }
    }
    access_failure(AccessError::Changed)
}

async fn read_sources(
    state: &PlayerRoutes,
    scope: &Arc<AuthorizedScope>,
    requested: &[EventSourceReference],
    until: Instant,
) -> Result<PlayerDisclosure, WorldError> {
    let game = &state.game;
    let budget = game.host.budget();
    let _request = budget.reserve(4096).map_err(|_| StoreError::Capacity)?;
    let selected = game
        .world
        .capture_transcript(state.authority.clone(), scope.clone())
        .await?;
    let (world, generation, revision) = selected.durable_head();
    let references = state
        .references
        .scoped(&scope.scope)
        .map_err(|_| StoreError::InvalidRecord)?;
    for reference in requested {
        if !reference
            .valid(&references, generation)
            .map_err(|_| StoreError::InvalidRecord)?
        {
            return Err(AccessError::Changed.into());
        }
    }
    let rows = game
        .store
        .event_sources(
            DurableHead {
                world_id: world.to_owned(),
                generation: generation.to_owned(),
                revision,
            },
            scope.scope.actor_id.clone(),
            requested
                .iter()
                .map(|reference| reference.source_id.clone())
                .collect(),
        )
        .await?;
    let language = game.language().cloned().ok_or(WorldError::ProviderKind)?;
    let bodies = if rows.is_empty() {
        rows.prepare(&language, budget)?
    } else {
        let work = budget.clone();
        game.host
            .compute_before(until, move || rows.prepare(&language, &work))
            .await??
    };
    let temporal = bodies
        .rows()
        .filter_map(|row| row.temporal.as_ref().map(|(id, at)| (id, *at)))
        .collect::<Vec<_>>();
    let expiry = bodies
        .rows()
        .filter_map(|row| row.event.expires_at)
        .reduce(f64::min);
    let _projection = budget
        .reserve(bodies.projection_bytes().ok_or(StoreError::Capacity)?)
        .map_err(|_| StoreError::Capacity)?;
    game.world
        .disclose_transcript(
            &state.authority,
            scope,
            &selected,
            &temporal,
            expiry,
            |_, _, budget| {
                let sources = requested
                    .iter()
                    .map(|reference| {
                        let Some((row, qualification)) = bodies.source(&reference.source_id) else {
                            return Ok(EventSourceDetail::unavailable(&reference.source_id));
                        };
                        let qualification = qualification
                            .map(|(id, detail)| (id, detail.map(|detail| detail.event.text())));
                        row.event
                            .source_detail(
                                &references,
                                generation,
                                reference,
                                row.edge.order,
                                &row.revision,
                                qualification,
                            )
                            .map_err(|_| StoreError::InvalidRecord)
                    })
                    .collect::<Result<Vec<_>, _>>()?;
                wire::encode(
                    &PublicSources {
                        ok: true,
                        world_id: world,
                        generation,
                        sources,
                    },
                    b"",
                    b"",
                    budget,
                )
                .map_err(WorldError::Wire)
            },
        )
        .await
}

fn valid_kind(kind: &str) -> bool {
    let mut letters = kind.bytes();
    !kind.is_empty()
        && kind.len() <= 64
        && letters.next().is_some_and(|l| l.is_ascii_lowercase())
        && letters.all(|letter| {
            letter.is_ascii_lowercase() || letter.is_ascii_digit() || b"_.:-".contains(&letter)
        })
}

fn encode_cursor(binding: &str, edge: EventBoundary) -> Result<String, WorldError> {
    let selected = Cursor {
        binding: binding.to_owned(),
        edge,
    };
    Ok(hex_bytes(
        json_record(&selected)
            .map_err(|_| StoreError::InvalidRecord)?
            .as_bytes(),
    ))
}

fn decode_cursor(raw: &str, binding: &str) -> Result<EventBoundary, WorldError> {
    let changed = || WorldError::Access(AccessError::Changed);
    if raw.is_empty() || raw.len() > 2048 || raw.len() % 2 != 0 || !raw.is_ascii() {
        return Err(changed());
    }
    let json = (0..raw.len())
        .step_by(2)
        .map(|offset| u8::from_str_radix(&raw[offset..offset + 2], 16))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| changed())?;
    let cursor: Cursor = serde_json::from_slice(&json).map_err(|_| changed())?;
    if cursor.binding != binding
        || cursor.edge.before > cursor.edge.watermark
        || [&cursor.edge.before, &cursor.edge.watermark]
            .iter()
            .any(|parsed| {
                !openlegend_simulation::values::is_safe_record_id(&parsed.id)
                    || parsed.order > openlegend_simulation::identity::MAX_SAFE_INTEGER
            })
    {
        return Err(changed());
    }
    Ok(cursor.edge)
}
