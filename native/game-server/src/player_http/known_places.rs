//! The browser's private remembered-place page. This handler borrows the
//! character's admitted evidence and has no movement or discovery authority.

use super::*;
use crate::{
    store::{PlaceViewRequest, PlaceViewSearch},
    world::PlayerDisclosure,
};
use openlegend_simulation::{
    encoding::{json_record, sha256_hex},
    reception::EncounterExposure,
    state::SurfacePoint,
    text::JsText,
};

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct PlaceRequest {
    query: Option<String>,
    cursor: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PlaceEntry<'a, Note: Serialize> {
    id: &'a str,
    source_id: &'a str,
    revision: &'a str,
    label: &'a JsText,
    description: &'a JsText,
    location_label: &'a JsText,
    position: &'a SurfacePoint,
    time: f64,
    corrected: bool,
    note: Note,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PlacePage<'a, Entries: Serialize> {
    ok: bool,
    world_id: &'a str,
    generation: &'a str,
    entries: Entries,
    next: Option<String>,
    scan_limited: bool,
}

pub(super) async fn list(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_request) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let scope = match scope(&state.authority, &parts.headers, None).await {
        Ok(view) => Arc::new(view),
        Err(error) => return access_failure(error),
    };
    let budget = state.game.host.budget();
    let (request, _input): (PlaceRequest, _) = match json(&parts.headers, body, budget).await {
        Ok(request) => request,
        Err(error) => return error,
    };
    if request
        .cursor
        .as_ref()
        .is_some_and(|cursor| cursor.len() > 3_000)
    {
        return changed();
    }
    let _query = match budget.reserve(8192) {
        Ok(query) => query,
        Err(_) => return busy(),
    };
    let search = match search_query(&state, request.query.as_deref()) {
        Ok(search) => search,
        Err(error) => return error,
    };
    for _ in 0..2 {
        match read_page(&state, &scope, request.cursor.as_deref(), search.clone()).await {
            Ok(PlayerDisclosure::Published(bytes)) => return json_response(StatusCode::OK, bytes),
            Ok(PlayerDisclosure::Busy | PlayerDisclosure::Changed)
            | Err(WorldError::Storage(StoreError::StaleCut)) => continue,
            Ok(PlayerDisclosure::Unchanged) => return changed(),
            Err(WorldError::ProjectionChanged) => return changed(),
            Err(error) => return failed(error),
        }
    }
    changed()
}

async fn read_page(
    state: &PlayerRoutes,
    scope: &Arc<AuthorizedScope>,
    cursor: Option<&str>,
    search: Option<PlaceViewSearch>,
) -> Result<PlayerDisclosure, WorldError> {
    let game = &state.game;
    let world = &game.world;
    let budget = game.host.budget();
    let _strings = budget.reserve(8192).map_err(|_| StoreError::Capacity)?;
    let (selected, cut) = world
        .capture_known_place_view(
            state.authority.clone(),
            scope.clone(),
            PlaceViewRequest::maximum_rows(search.is_some()),
        )
        .await?;
    let (generation, privacy_revision) = cut.view_identity()?;
    let generation = generation.to_owned();
    let key = scope
        .scope
        .key()
        .map_err(|_| WorldError::ProjectionChanged)?;
    let fence = sha256_hex(
        json_record(&(
            &key,
            &generation,
            privacy_revision,
            search
                .as_ref()
                .map_or(&[][..], |query| query.words.as_ref()),
        ))
        .map_err(|_| WorldError::ProjectionChanged)?
        .as_bytes(),
    );
    let after = cursor
        .map(|cursor| {
            let (recorded, after) = cursor
                .split_once('.')
                .ok_or(WorldError::ProjectionChanged)?;
            if recorded != fence || after.is_empty() || after.len() > 180 {
                return Err(WorldError::ProjectionChanged);
            }
            Ok(after.to_owned())
        })
        .transpose()?;
    let page = game
        .store
        .read_known_place_view(
            cut,
            PlaceViewRequest {
                after,
                id: None,
                search,
            },
        )
        .await?;
    let (selected, page) = world.admit_known_place_view(selected, page).await?;
    let world_id = &scope.scope.world_id;
    world.disclose_history(&state.authority, &selected, |session, budget| {
        session.with_player_place_facts(
            &scope.scope.account_id,
            &scope.scope.actor_id,
            page.places.iter().map(|place| (place.capsule.place_id.as_str(), None)),
            |notes| {
                let bytes = page.places.iter().zip(&page.references).try_fold(512_usize, |bytes, (_, reference)| {
                    bytes.checked_add(256)?.checked_add(match &reference.correction {
                            Some(Some(text)) => text.units_len().checked_mul(8)?,
                        _ => 0,
                    })
                }).ok_or(StoreError::Capacity)?;
                let _preparation = budget.reserve(bytes).map_err(|_| StoreError::Capacity)?;
                let mut descriptions = Vec::with_capacity(page.places.len());
                for reference in &page.references {
                    let corrected = reference.correction.as_ref().map(|correction| {
                        if let Some(value) = correction {
                            let mut message = JsText::from("Corrected observation: ");
                            message.push_text(value);
                            message
                        } else {
                            JsText::from("This observation was corrected. Its original description is no longer established information.")
                        }
                    });
                    descriptions.push(corrected);
                }
                let mut entries = Vec::with_capacity(page.places.len());
                for (((witness, reference), facts), correction) in page.places.iter().zip(&page.references).zip(notes).zip(&descriptions) {
                    let EncounterExposure::Place { label, description, location_label, point, ..} = &witness.exposure else {
                        return Err(StoreError::InvalidRecord.into());
                    };
                    entries.push(PlaceEntry {
                        id: &witness.capsule.place_id,
                        source_id: &reference.source_id,
                        revision: &reference.revision,
                        label,
                        description: correction.as_ref().unwrap_or(description),
                        location_label,
                        position: point,
                        time: witness.capsule.observed_at,
                        corrected: correction.is_some(),
                        note: &facts.note,
                    });
                }
                wire::encode(&PlacePage {
                    ok: true,
                    world_id,
                    generation: &generation,
                    entries,
                    next: page.next.map(|next| format!("{fence}.{next}")),
                    scan_limited: page.scan_limited,
                }, b"", b"", budget).map_err(WorldError::Wire)
            },
        )?
    })
}

fn search_query(
    state: &PlayerRoutes,
    text: Option<&str>,
) -> Result<Option<PlaceViewSearch>, Response> {
    let Some(text) = text else { return Ok(None) };
    if text.encode_utf16().count() > 200 {
        return Err(refusal(
            StatusCode::BAD_REQUEST,
            "places-search",
            "Search with at most 200 characters.",
        ));
    }
    let text = openlegend_simulation::encoding::js_trim(text);
    if text.is_empty() {
        return Ok(None);
    }
    let language = state.game.language().ok_or_else(busy)?.clone();
    let mut words = Vec::new();
    let mut too_long = false;
    language
        .search_words(&JsText::from(text), state.game.host.budget(), |word| {
            if word.chars().count() > 64 {
                too_long = true;
            } else if words.len() <= 8 && !words.iter().any(|value| value == word) {
                words.push(word.to_owned());
            }
        })
        .map_err(|error| failed(WorldError::Language(error)))?;
    if words.is_empty() && !too_long {
        return Err(refusal(
            StatusCode::BAD_REQUEST,
            "places-search",
            "Search needs at least one letter or number.",
        ));
    }
    if too_long || words.len() > 8 {
        return Err(refusal(
            StatusCode::BAD_REQUEST,
            "places-search",
            "Search with up to 8 words of at most 64 characters each.",
        ));
    }
    Ok(Some(PlaceViewSearch {
        words: Arc::from(words),
        language,
    }))
}

fn changed() -> Response {
    refusal(
        StatusCode::CONFLICT,
        "history-changed",
        "Remembered places changed. Refresh Known places.",
    )
}
