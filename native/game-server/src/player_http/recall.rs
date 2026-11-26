//! Only the selected actor's existing canonical memories enter a private
//! browser response. Indexed search chooses references and grants no access.

use super::*;
use crate::{
    store::recall::browse::{MemoryPosition, MemorySearch},
    world::PlayerDisclosure,
};
use openlegend_simulation::{
    encoding::{js_trim, json_record, json_tree_allocation_bound, sha256_hex},
    experience::{PersonalSourceKind, PersonalSourceRef},
    narration::{NativeText, native_text},
    text::JsText,
    values::is_safe_record_id,
};

mod recent;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RequestPage {
    actor_id: String,
    cursor: Option<String>,
    query: Option<String>,
    #[serde(default)]
    thoughts: bool,
    #[serde(default)]
    recent: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ResponsePage<'a> {
    ok: bool,
    world_id: &'a str,
    generation: &'a str,
    entries: Vec<Recollection<'a>>,
    next: Option<String>,
    scan_limited: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Recollection<'a> {
    id: &'a str,
    source_kind: PersonalSourceKind,
    fidelity: &'static str,
    time: f64,
    text: JsText,
}

pub(super) async fn recollections(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let selected = match scope(&state.authority, &parts.headers, None).await {
        Ok(selected) => Arc::new(selected),
        Err(error) => return access_failure(error),
    };
    let (request, _custody): (RequestPage, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(value) => value,
            Err(error) => return error,
        };
    if !is_safe_record_id(&request.actor_id)
        || request
            .cursor
            .as_ref()
            .is_some_and(|value| value.encode_utf16().count() > 2048)
    {
        return changed();
    }
    let creator_route = parts.uri.path() == "/api/god/memories";
    if !creator_route && request.actor_id != selected.scope.actor_id {
        return access_failure(AccessError::Forbidden);
    }
    if request.recent {
        return recent::page(&state, &selected, &request, creator_route).await;
    }
    for _ in 0..2 {
        let search = match terms(&state, request.query.as_deref(), 200) {
            Ok(value) => value,
            Err(error) => return error,
        };
        match publish(&state, &selected, &request, search).await {
            Ok(PlayerDisclosure::Published(bytes)) => return json_response(StatusCode::OK, bytes),
            Ok(PlayerDisclosure::Busy | PlayerDisclosure::Changed)
            | Err(WorldError::Storage(StoreError::StaleCut)) => (),
            Ok(PlayerDisclosure::Unchanged) | Err(WorldError::ProjectionChanged) => break,
            Err(error) => return failed(error),
        }
    }
    changed()
}

async fn publish(
    state: &PlayerRoutes,
    scope: &Arc<AuthorizedScope>,
    request: &RequestPage,
    search: Option<MemorySearch>,
) -> Result<PlayerDisclosure, WorldError> {
    let world = &state.game.world;
    let budget = state.game.host.budget();
    let _request = budget.reserve(4096).map_err(|_| StoreError::Capacity)?;
    let (selected, cut) = world
        .capture_recollections(
            state.authority.clone(),
            scope.clone(),
            request.actor_id.clone(),
        )
        .await?;
    let key = scope
        .scope
        .key()
        .map_err(|_| WorldError::ProjectionChanged)?;
    let fence = sha256_hex(
        json_record(&(
            &key,
            &cut.generation,
            &cut.actor,
            cut.privacy_revision,
            search.as_ref().map_or(&[][..], |query| &query.words),
            request.thoughts,
        ))
        .map_err(|_| StoreError::InvalidRecord)?
        .as_bytes(),
    );
    let before = request
        .cursor
        .as_deref()
        .map(|cursor| {
            let (expected, raw) = cursor
                .split_once('.')
                .ok_or(WorldError::ProjectionChanged)?;
            if expected != fence {
                return Err(WorldError::ProjectionChanged);
            }
            let position: MemoryPosition =
                serde_json::from_str(raw).map_err(|_| WorldError::ProjectionChanged)?;
            if !position.at.is_finite() || !is_safe_record_id(&position.id) {
                return Err(WorldError::ProjectionChanged);
            }
            Ok(position)
        })
        .transpose()?;
    let mut page = state
        .game
        .store
        .browse_recollections(cut.clone(), before, search, request.thoughts)
        .await?;
    let next = page.next.take();
    let scan_limited = page.scan_limited;
    let expected = page.references.len();
    let selected = world
        .admit_recollections(state.game.clone(), selected, page)
        .await?;
    world.disclose_private_history(&state.authority, &selected, |budget| {
        selected.sources().with_personal_sources(|sources| {
            let mut text_custody = budget.reserve(4096).map_err(|_| StoreError::Capacity)?;
            let mut entries = Vec::with_capacity(expected);
            for (_, source, payload) in sources {
                let bytes = json_tree_allocation_bound(payload).ok_or(StoreError::Capacity)?;
                text_custody
                    .resize(text_custody.bytes() + bytes)
                    .map_err(|_| StoreError::Capacity)?;
                entries.push(entry(source, payload)?);
            }
            if entries.len() != expected {
                return Err(StoreError::StaleCut.into());
            }
            entries.reverse();
            let next = next
                .as_ref()
                .map(|position| json_record(position).map(|body| format!("{fence}.{body}")))
                .transpose()
                .map_err(|_| StoreError::InvalidRecord)?;
            wire::encode(
                &ResponsePage {
                    ok: true,
                    world_id: &cut.world,
                    generation: &cut.generation,
                    entries,
                    next,
                    scan_limited,
                },
                b"",
                b"",
                budget,
            )
            .map_err(WorldError::Wire)
        })?
    }).await
}

fn entry<'a>(source: &'a PersonalSourceRef, payload: &str) -> Result<Recollection<'a>, StoreError> {
    #[derive(Deserialize)]
    struct Awareness {
        at: f64,
        modality: String,
        text: NativeText,
    }
    #[derive(Deserialize)]
    struct Memory {
        at: f64,
        kind: String,
        source: String,
        summary: JsText,
    }
    #[derive(Deserialize)]
    struct Summary {
        to: f64,
        text: JsText,
    }
    let invalid = |_| StoreError::InvalidRecord;
    let (time, fidelity, mut text, summary) = match source.kind {
        PersonalSourceKind::Awareness => {
            let value: Awareness = serde_json::from_str(payload).map_err(invalid)?;
            (
                value.at,
                "exact",
                JsText::from(format!("[{}] ", value.modality)),
                native_text(&value.text),
            )
        }
        PersonalSourceKind::Memory => {
            let value: Memory = serde_json::from_str(payload).map_err(invalid)?;
            let impression = value.kind == "impression";
            (
                value.at,
                if impression { "impression" } else { "exact" },
                JsText::from(format!(
                    "[{}{}] ",
                    if impression {
                        "remembered impression; "
                    } else {
                        ""
                    },
                    value.source
                )),
                value.summary,
            )
        }
        PersonalSourceKind::Summary => {
            let value: Summary = serde_json::from_str(payload).map_err(invalid)?;
            (
                value.to,
                "exact",
                JsText::from("[inferred] Summary of remembered experience: "),
                value.text,
            )
        }
    };
    if !time.is_finite() {
        return Err(StoreError::InvalidRecord);
    }
    text.push_text(&summary);
    Ok(Recollection {
        id: &source.id,
        source_kind: source.kind,
        fidelity,
        time,
        text,
    })
}

pub(super) fn terms(
    state: &PlayerRoutes,
    query: Option<&str>,
    maximum: usize,
) -> Result<Option<MemorySearch>, Response> {
    let Some(query) = query else {
        return Ok(None);
    };
    if query.encode_utf16().count() > maximum {
        return Err(refusal(
            StatusCode::BAD_REQUEST,
            "history-search",
            &format!("Search with at most {maximum} characters."),
        ));
    }
    let query = js_trim(query);
    if query.is_empty() {
        return Ok(None);
    }
    let language = state.game.language().ok_or_else(busy)?.clone();
    let budget = state.game.host.budget();
    let custody = budget.reserve(2048 + query.len() * 4).map_err(|_| busy())?;
    let mut words = Vec::new();
    let mut excessive = false;
    language
        .search_words(&JsText::from(query), budget, |word| {
            if word.chars().count() > 64 {
                excessive = true;
            } else if words.len() <= 8 && !words.iter().any(|stored| stored == word) {
                words.push(word.to_owned());
            }
        })
        .map_err(|error| failed(WorldError::Language(error)))?;
    if excessive || words.len() > 8 {
        return Err(refusal(
            StatusCode::BAD_REQUEST,
            "history-search",
            "Search with up to 8 words of at most 64 characters each.",
        ));
    }
    if words.is_empty() {
        return Err(refusal(
            StatusCode::BAD_REQUEST,
            "history-search",
            "Search needs at least one letter or number.",
        ));
    }
    Ok(Some(MemorySearch {
        words,
        language,
        _custody: custody,
    }))
}

fn changed() -> Response {
    refusal(
        StatusCode::CONFLICT,
        "history-changed",
        "Memories changed. Browse or search again.",
    )
}
