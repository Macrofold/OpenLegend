//! A deliberate read of the player's original private trade disclosures.

use super::super::*;
use crate::{
    store::recall::browse::{
        MemorySearch,
        trade::{RememberedTradeLot, TradeDisclosurePosition},
    },
    world::PlayerDisclosure,
};
use openlegend_simulation::{
    encoding::{json_record, sha256_hex},
    identity::MAX_SAFE_INTEGER,
    text::JsText,
};
use openlegend_world_host::pool::HostError;
use std::{mem::size_of, sync::LazyLock};

const QUERY_UNITS: usize = 160;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RequestPage {
    person_id: String,
    query: Option<String>,
    cursor: Option<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Cursor {
    fence: String,
    before: TradeDisclosurePosition,
    offset: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Page<'a> {
    ok: bool,
    items: Vec<super::Lot<'a, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    next: Option<String>,
    scan_limited: bool,
}

enum ReadPage {
    ContactChanged,
    CursorChanged,
    Disclosure(PlayerDisclosure),
}

pub(in crate::player_http) async fn list(
    State(state): State<PlayerRoutes>,
    request: Request,
) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let selected = match scope(&state.authority, &parts.headers, None).await {
        Ok(selected) => Arc::new(selected),
        Err(error) => return access_failure(error),
    };
    let budget = state.game.host.budget();
    let (request, _input): (RequestPage, _) = match json(&parts.headers, body, budget).await {
        Ok(request) => request,
        Err(error) => return error,
    };
    if !crate::npc::valid_request_id(&request.person_id) {
        return contact_changed();
    }
    let _selection = match budget.reserve(8192) {
        Ok(value) => value,
        Err(_) => return busy(),
    };
    let search = match recall::terms(&state, request.query.as_deref(), QUERY_UNITS) {
        Ok(value) => value,
        Err(error) => return error,
    };
    let cursor: Option<Cursor> = if let Some(token) = request.cursor.as_deref() {
        let Some(decoded) = state.references.open_trade_cursor(token) else {
            return cursor_changed();
        };
        Some(decoded)
    } else {
        None
    };
    for _ in 0..2 {
        match read(
            &state,
            &selected,
            &request.person_id,
            search.as_ref(),
            cursor.as_ref(),
        )
        .await
        {
            Ok(ReadPage::ContactChanged) => return contact_changed(),
            Ok(ReadPage::CursorChanged) => return cursor_changed(),
            Ok(ReadPage::Disclosure(PlayerDisclosure::Published(bytes))) => {
                return json_response(StatusCode::OK, bytes);
            }
            Ok(ReadPage::Disclosure(PlayerDisclosure::Busy | PlayerDisclosure::Changed))
            | Err(WorldError::Storage(StoreError::StaleCut)) => (),
            Ok(ReadPage::Disclosure(PlayerDisclosure::Unchanged))
            | Err(WorldError::ProjectionChanged) => break,
            Err(error) => return failed(error),
        }
    }
    refusal(StatusCode::CONFLICT, "history-changed", CHANGE_MESSAGE)
}

async fn read(
    state: &PlayerRoutes,
    selected: &Arc<AuthorizedScope>,
    contact: &str,
    query: Option<&MemorySearch>,
    cursor: Option<&Cursor>,
) -> Result<ReadPage, WorldError> {
    let world = &state.game.world;
    let issuer = state.references.clone();
    let budget = state.game.host.budget().clone();
    let capture_contact = contact.to_owned();
    let (view, cut, person) = world
        .capture_recollections_with(
            state.authority.clone(),
            selected.clone(),
            selected.scope.actor_id.clone(),
            move |session, scope| {
                Ok(issuer.resolve_contact(session, scope, &capture_contact, &budget)?)
            },
        )
        .await?;
    let Some(person) = person else {
        return Ok(ReadPage::ContactChanged);
    };
    let scope = selected
        .scope
        .key()
        .map_err(|_| StoreError::InvalidRecord)?;
    let fence = sha256_hex(
        json_record(&(
            scope,
            contact,
            &cut.generation,
            cut.privacy_revision,
            query.map(|value| value.words.as_slice()),
        ))
        .map_err(|_| StoreError::InvalidRecord)?
        .as_bytes(),
    );
    if cursor.is_some_and(|cursor| cursor.fence != fence) {
        return Ok(ReadPage::CursorChanged);
    }
    let store = &state.game.store;
    let page = store
        .browse_trade_disclosures(cut, person.id.clone(), cursor.map(|cursor| cursor.before))
        .await?;
    let maximum = store.schema.recall.trade_disclosures.page_rows;
    let budget = state.game.host.budget();
    let selection_bytes = maximum
        .checked_mul(size_of::<(&RememberedTradeLot, u64)>() + size_of::<super::Lot<String>>())
        .ok_or(StoreError::Capacity)?;
    let mut selection = budget.reserve(selection_bytes).map_err(HostError::from)?;
    let mut rows = Vec::with_capacity(maximum);
    let offset = cursor.map_or(0, |cursor| cursor.offset);
    let mut examined = 0;
    for entry in &page.entries {
        examined += 1;
        let Some(lot) = &entry.lot else {
            continue;
        };
        if let Some(query) = query
            && !query
                .language
                .matches_word_prefixes(&query.words, [&lot.name, &lot.description], budget)
                .map_err(WorldError::Language)?
        {
            continue;
        }
        let number = page_offset(offset, examined)?;
        selection
            .resize(
                selection
                    .bytes()
                    .checked_add(
                        lot.name
                            .as_unicode()
                            .ok_or(StoreError::InvalidRecord)?
                            .len()
                            + disclosed_label().len()
                            + 32,
                    )
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(HostError::from)?;
        rows.push((lot, number));
        if rows.len() == maximum {
            break;
        }
    }
    let more = examined < page.entries.len() || page.more;
    let next = if more {
        let before = page
            .entries
            .get(examined.saturating_sub(1))
            .ok_or(StoreError::InvalidRecord)?
            .position;
        Some(
            state
                .references
                .seal_trade_cursor(&Cursor {
                    fence,
                    before,
                    offset: page_offset(offset, examined)?,
                })
                .ok_or(StoreError::InvalidRecord)?,
        )
    } else {
        None
    };
    let scan_limited = page.more && examined == page.entries.len();
    let references = rows.iter().map(|(lot, _)| &lot.source);
    let publish = world
        .disclose_personal_sources(
            &state.authority,
            &view,
            references,
            |session, scope| {
                Ok(state
                    .references
                    .resolve_contact(session, scope, contact, budget)?
                    .is_some_and(|current| current.id == person.id))
            },
            |budget| {
                let items = rows
                    .iter()
                    .map(|(row, number)| {
                        super::Lot::disclosed(
                            &row.lot,
                            &row.name,
                            &row.description,
                            label(
                                row.name.as_unicode().expect("trade text from PostgreSQL"),
                                *number,
                            ),
                        )
                    })
                    .collect();
                wire::encode(
                    &Page {
                        ok: true,
                        items,
                        next,
                        scan_limited,
                    },
                    b"",
                    b"",
                    budget,
                )
                .map_err(WorldError::Wire)
            },
        )
        .await?;
    Ok(ReadPage::Disclosure(publish))
}

fn page_offset(offset: u64, examined: usize) -> Result<u64, StoreError> {
    offset
        .checked_add(u64::try_from(examined).map_err(|_| StoreError::Capacity)?)
        .filter(|offset| *offset <= MAX_SAFE_INTEGER)
        .ok_or(StoreError::Capacity)
}

fn disclosed_label() -> &'static str {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Label {
        disclosed_lot: &'static str,
    }
    static LABEL: LazyLock<Label> = LazyLock::new(|| {
        serde_json::from_str(super::LABELS.get()).expect("bundled trade disclosure label")
    });
    LABEL.disclosed_lot
}

fn label(name: &str, number: u64) -> String {
    let (opening, after_name) = disclosed_label()
        .split_once("{name}")
        .expect("disclosed lot template has a name");
    let (middle, ending) = after_name
        .split_once("{number}")
        .expect("disclosed lot template has a number");
    format!("{opening}{name}{middle}{number}{ending}")
}

const CHANGE_MESSAGE: &str = "Remembered trade items changed. Refresh this search.";

fn cursor_changed() -> Response {
    refusal(StatusCode::BAD_REQUEST, "history-changed", CHANGE_MESSAGE)
}

fn contact_changed() -> Response {
    refusal(
        StatusCode::CONFLICT,
        "stale-contact",
        "Choose a person you can currently see.",
    )
}
