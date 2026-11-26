//! The ordinary Inventory picker asks only for recipients of its exact item.
use super::*;
use openlegend_simulation::{
    encoding::{js_trim, json_record, sha256_hex},
    runtime::{
        RuntimeError, RuntimeOfferCursor, RuntimeOfferProblem, RuntimeOfferSelection,
        RuntimeOfferSource,
    },
    state::Named,
    text::JsText,
};
use std::sync::LazyLock;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RequestPage {
    source: RuntimeOfferSource,
    query: Option<String>,
    cursor: Option<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Cursor {
    context: String,
    page: RuntimeOfferCursor,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Recipient<'a> {
    id: String,
    #[serde(flatten)]
    person: &'a Named,
    kind: &'static str,
    location: &'static str,
    openable: bool,
    fit: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<&'a JsText>,
}

#[derive(Serialize)]
struct Page<'a> {
    ok: bool,
    scope: &'a str,
    status: &'static str,
    destinations: Vec<Recipient<'a>>,
    breadcrumbs: [(); 0],
    #[serde(skip_serializing_if = "Option::is_none")]
    next: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Words {
    recipient_location: &'static str,
    recipient_unavailable: &'static str,
    recipient_source_changed: &'static str,
    recipient_page_changed: &'static str,
}

static WORDS: LazyLock<Words> = LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../../packages/domain/src/worlds/base/handover-copy.json"
    ))
    .expect("authored gift recipient wording")
});

pub(super) async fn read(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let selected = match scope(&state.authority, &parts.headers, None).await {
        Ok(scope) => scope,
        Err(error) => return access_failure(error),
    };
    let budget = state.game.host.budget();
    let (input, _input): (RequestPage, _) = match json(&parts.headers, body, budget).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    if !crate::npc::valid_request_id(&input.source.item_id)
        || !crate::npc::valid_request_id(&input.source.container_id)
        || input.source.quantity == 0
        || input
            .query
            .as_ref()
            .is_some_and(|value| value.encode_utf16().count() > 160)
        || input
            .cursor
            .as_ref()
            .is_some_and(|value| value.len() > 3000)
    {
        return request_error();
    }
    match state
        .game
        .world
        .disclose_inventory_read(
            &state.authority,
            &selected,
            |session, scope, controlling| {
                if !controlling {
                    return Ok(problem(RuntimeOfferProblem::Unavailable));
                }
                let _workspace = budget.reserve(8192)?;
                let scope_key = scope.key().map_err(RuntimeError::application_refused)?;
                let query = JsText::from(input.query.as_deref().map_or("", js_trim)).lowercase();
                let context = sha256_hex(
                    json_record(&(&scope_key, &scope.timeline_id, &input.source, &query))
                        .map_err(RuntimeError::application_refused)?
                        .as_bytes(),
                );
                let cursor = match input.cursor.as_deref() {
                    Some(cursor) => match state.references.open_offer_cursor::<Cursor>(cursor) {
                        Some(cursor) if cursor.context == context => Some(cursor.page),
                        _ => return Ok(problem(RuntimeOfferProblem::ChangedPage)),
                    },
                    None => None,
                };
                let references = state
                    .references
                    .scoped(scope)
                    .map_err(RuntimeError::application_refused)?;
                let spatial = state.game.spatial.current(session.structure_scene()?.as_ref(), budget).map_err(RuntimeError::application_refused)?;
                session.with_player_offer_recipients(
                    &scope.account_id,
                    &scope.actor_id,
                    RuntimeOfferSelection {
                        item: &input.source,
                        query: &query,
                        cursor: cursor.as_ref(),
                        location: WORDS.recipient_location,
                    },
                    |queries| {
                        spatial.compute(queries, budget)
                            .map(|answer| answer.into_parts())
                            .map_err(RuntimeError::application_refused)
                    },
                    |result, budget| {
                        let result = match result {
                            Ok(page) => page,
                            Err(reason) => return Ok(problem(reason)),
                        };
                        // Only the opaque public contacts leave this fenced read.
                        let _output = budget.reserve(
                            result.recipients.len() * (2048 + std::mem::size_of::<Recipient<'_>>()),
                        )?;
                        let destinations = result
                            .recipients
                            .iter()
                            .map(|entry| {
                                let body = &entry.body;
                                Ok(Recipient {
                                    id: references
                                        .contact(
                                            body.source_id,
                                            body.physical_life.unwrap_or_default(),
                                            body.lease_id,
                                        )
                                        .map_err(RuntimeError::application_refused)?,
                                    person: body.name,
                                    kind: "recipient",
                                    location: WORDS.recipient_location,
                                    fit: if entry.reason.is_some() {
                                        "blocked"
                                    } else {
                                        "unknown"
                                    },
                                    openable: false,
                                    reason: entry.reason,
                                })
                            })
                            .collect::<Result<Vec<_>, RuntimeError>>()?;
                        let next = result
                            .next
                            .map(|page| {
                                state
                                    .references
                                    .seal_offer_cursor(&Cursor { context, page })
                                    .ok_or_else(|| {
                                        RuntimeError::application_refused(
                                            "offer recipient cursor unavailable",
                                        )
                                    })
                            })
                            .transpose()?;
                        let page = Page {
                            scope: &scope_key,
                            ok: true,
                            status: if next.is_some() {
                                "partial"
                            } else {
                                "complete"
                            },
                            destinations,
                            breadcrumbs: [],
                            next,
                        };
                        let bytes = wire::encode(&page, b"", b"", budget)
                            .map_err(RuntimeError::application_refused)?;
                        Ok(json_response(StatusCode::OK, bytes))
                    },
                )
            },
        )
        .await
    {
        Ok(response) => response,
        Err(error) => failed(error),
    }
}

fn problem(reason: RuntimeOfferProblem<'_>) -> Response {
    let (code, message) = match reason {
        RuntimeOfferProblem::Unavailable => ("unavailable", WORDS.recipient_unavailable),
        RuntimeOfferProblem::ChangedSource => ("stale-source", WORDS.recipient_source_changed),
        RuntimeOfferProblem::ChangedPage => ("stale-destinations", WORDS.recipient_page_changed),
        RuntimeOfferProblem::BlockedSource(message) => ("item-unavailable", message),
    };
    refusal(StatusCode::CONFLICT, code, message)
}
