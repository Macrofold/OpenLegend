//! The browser's private remembered-place list and inspection. The movement
//! preview rolls back before the exact selected record is disclosed.

use super::*;
use crate::{
    player_command::{KNOWN_PLACE_UNAVAILABLE, PlaceReference, SelectedKnownPlace},
    store::{PlaceViewRequest, PlaceViewSearch},
    world::{ApplicationStart, PlayerDisclosure},
};
use openlegend_simulation::{
    encoding::{json_record, sha256_hex},
    host::ByteReservation,
    reception::EncounterExposure,
    runtime::{RuntimeDirectOutput, RuntimeError, RuntimePlayerCommand},
    state::SurfacePoint,
    text::JsText,
};
use std::sync::OnceLock;

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
    #[serde(skip_serializing_if = "Option::is_none")]
    note: Option<Note>,
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
    let until = tokio::time::Instant::now() + REQUEST_TIMEOUT;
    for retry_until in [Some(until), None] {
        match read_page(
            &state,
            &scope,
            request.cursor.as_deref(),
            search.clone(),
            retry_until,
        )
        .await
        {
            Ok(PlayerDisclosure::Published(bytes)) => return json_response(StatusCode::OK, bytes),
            Ok(PlayerDisclosure::Busy | PlayerDisclosure::Changed)
            | Err(WorldError::Storage(StoreError::StaleCut | StoreError::KnownPlacesPendingSave)) =>
            {
                continue;
            }
            Ok(PlayerDisclosure::Unchanged) => return changed(),
            Err(WorldError::ProjectionChanged) => return changed(),
            Err(error) => return failed(error),
        }
    }
    changed()
}

pub(super) async fn inspect(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_request) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let scope = match scope(&state.authority, &parts.headers, None).await {
        Ok(view) => Arc::new(view),
        Err(error) => return access_failure(error),
    };
    let (reference, _input): (PlaceReference, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(request) => request,
            Err(error) => return error,
        };
    if !reference.valid() {
        return changed();
    }
    let until = tokio::time::Instant::now() + REQUEST_TIMEOUT;
    for retry_until in [Some(until), None] {
        match read_detail(&state, &scope, &reference, retry_until).await {
            Ok(PlayerDisclosure::Published(bytes)) => return json_response(StatusCode::OK, bytes),
            Ok(PlayerDisclosure::Busy | PlayerDisclosure::Changed)
            | Err(WorldError::Storage(StoreError::StaleCut | StoreError::KnownPlacesPendingSave)) =>
            {
                continue;
            }
            Ok(PlayerDisclosure::Unchanged) | Err(WorldError::ProjectionChanged) => break,
            Err(error) => return failed(error),
        }
    }
    changed()
}

struct PlacePreview {
    cut: u64,
    reason: Option<JsText>,
    _custody: Option<ByteReservation>,
}

async fn preview(
    state: &PlayerRoutes,
    scope: &Arc<AuthorizedScope>,
    place: &Arc<SelectedKnownPlace>,
) -> Result<Option<PlacePreview>, WorldError> {
    let game = state.game.clone();
    let authority = state.authority.clone();
    let host = game.world.clone();
    let selected = place.clone();
    let scope = scope.clone();
    let cut = Arc::new(OnceLock::new());
    let preview_cut = cut.clone();
    game.world.request_advance_publication();
    state
        .game
        .world
        .execute_and_publish(
            #[cfg(feature = "profile-campaign")]
            openlegend_simulation::profile::sites::TURN_COMMAND,
            move |world| {
                authority.current_view(&scope, |_, _| ())?;
                let through = world.accepted_progress()?.through_cut;
                let destination =
                    host.with_current_player_history(world, &selected.evidence, |world| {
                        selected.destination(world, &scope.scope)
                    })?;
                let Some(destination) = destination else {
                    return Ok(ApplicationStart::Existing(None));
                };
                let reason = if destination.is_none() {
                    Some(KNOWN_PLACE_UNAVAILABLE)
                } else if world.clock()?.paused {
                    Some("Resume the world to act.")
                } else {
                    None
                };
                if let Some(reason) = reason {
                    let custody = game
                        .host
                        .budget()
                        .reserve(64 + reason.len())
                        .map_err(|_| StoreError::Capacity)?;
                    return Ok(ApplicationStart::Existing(Some(PlacePreview {
                        cut: through,
                        reason: Some(JsText::from(reason)),
                        _custody: Some(custody),
                    })));
                }
                let position = destination.ok_or(StoreError::InvalidRecord)?;
                let id = uuid::Uuid::new_v4().to_string();
                preview_cut
                    .set(through)
                    .map_err(|_| StoreError::InvalidRecord)?;
                Ok(ApplicationStart::Candidate(world.begin_player_command(
                    &id,
                    &scope.scope.actor_id,
                    RuntimePlayerCommand::Move(position),
                    true,
                )?))
            },
            {
                let game = state.game.clone();
                move |question| {
                    let game = game.clone();
                    async move { game.answer_operation(question).await }
                }
            },
            move |output, budget| {
                let RuntimeDirectOutput::Preview(value) = output else {
                    return Err(RuntimeError::application_refused(
                        "Place inspection cannot commit a preview",
                    ));
                };
                let bytes = value
                    .message
                    .units_len()
                    .checked_mul(4)
                    .and_then(|bytes| bytes.checked_add(64))
                    .ok_or_else(|| RuntimeError::application_refused("Place preview storage"))?;
                let custody = budget
                    .reserve(bytes)
                    .map_err(RuntimeError::application_refused)?;
                Ok(Some(PlacePreview {
                    cut: *cut
                        .get()
                        .ok_or_else(|| RuntimeError::application_refused("Missing preview cut"))?,
                    reason: (!value.ok).then(|| value.message.clone()),
                    _custody: Some(custody),
                }))
            },
            |_, _, _| unreachable!("Place preview cannot settle a write"),
            |_| {},
        )
        .await
        .map(Option::flatten)
}

async fn read_detail(
    state: &PlayerRoutes,
    scope: &Arc<AuthorizedScope>,
    reference: &PlaceReference,
    retry_until: Option<tokio::time::Instant>,
) -> Result<PlayerDisclosure, WorldError> {
    let Some(selected) =
        SelectedKnownPlace::read(&state.game, &state.authority, scope, reference, retry_until)
            .await?
    else {
        return Ok(PlayerDisclosure::Unchanged);
    };
    let selected = Arc::new(selected);
    let Some(preview) = preview(state, scope, &selected).await? else {
        return Ok(PlayerDisclosure::Changed);
    };
    state
        .game
        .world
        .disclose_history_at(
            &state.authority,
            &selected.evidence,
            Some(preview.cut),
            |_, budget| {
                let [witness] = selected.page.places.as_slice() else {
                    return Err(StoreError::InvalidRecord.into());
                };
                let [source] = selected.page.references.as_slice() else {
                    return Err(StoreError::InvalidRecord.into());
                };
                let EncounterExposure::Place {
                    label,
                    description,
                    location_label,
                    point,
                    ..
                } = &witness.exposure
                else {
                    return Err(StoreError::InvalidRecord.into());
                };
                let _text = budget
                    .reserve(description_bytes(&source.correction).ok_or(StoreError::Capacity)?)
                    .map_err(|_| StoreError::Capacity)?;
                let corrected = corrected_description(&source.correction);
                #[derive(Serialize)]
                #[serde(rename_all = "camelCase")]
                struct Inspection<'a> {
                    ok: bool,
                    place: PlaceEntry<'a, ()>,
                    move_description: &'a str,
                    #[serde(rename = "move")]
                    movement: Movement<'a>,
                }
                #[derive(Serialize)]
                struct Movement<'a> {
                    id: &'static str,
                    label: &'static str,
                    command: PlaceCommand<'a>,
                    enabled: bool,
                    #[serde(skip_serializing_if = "Option::is_none")]
                    reason: Option<&'a JsText>,
                }
                #[derive(Serialize)]
                #[serde(rename_all = "camelCase")]
                struct PlaceCommand<'a> {
                    #[serde(rename = "type")]
                    kind: &'static str,
                    known_place: &'a PlaceReference,
                }
                wire::encode(
                    &Inspection {
                        ok: true,
                        place: PlaceEntry {
                            id: &witness.capsule.place_id,
                            source_id: &source.source_id,
                            revision: &source.revision,
                            label,
                            position: point,
                            location_label,
                            description: corrected.as_ref().unwrap_or(description),
                            time: witness.capsule.observed_at,
                            corrected: corrected.is_some(),
                            note: None,
                        },
                        move_description: &state.game.view_policy().controls.move_description,
                        movement: Movement {
                            id: "move-to-known-place",
                            label: "Move to last-known location",
                            command: PlaceCommand {
                                kind: "move",
                                known_place: reference,
                            },
                            enabled: preview.reason.is_none(),
                            reason: preview.reason.as_ref(),
                        },
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

async fn read_page(
    state: &PlayerRoutes,
    scope: &Arc<AuthorizedScope>,
    cursor: Option<&str>,
    search: Option<PlaceViewSearch>,
    retry_until: Option<tokio::time::Instant>,
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
    let through = cut.accepted_cut();
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
        .await;
    let page = match (page, retry_until) {
        (Ok(page), _) => page,
        (Err(StoreError::KnownPlacesPendingSave), Some(until)) => {
            drop(selected);
            world.when_durable(through, until).await?;
            return Ok(PlayerDisclosure::Changed);
        }
        (Err(error), _) => return Err(error.into()),
    };
    let (selected, page) = world.admit_known_place_view(selected, page).await?;
    let world_id = &scope.scope.world_id;
    world
        .disclose_history(&state.authority, &selected, |session, budget| {
            session.with_player_place_facts(
                &scope.scope.account_id,
                &scope.scope.actor_id,
                page.places
                    .iter()
                    .map(|place| (place.capsule.place_id.as_str(), None)),
                |notes| {
                    let bytes = page
                        .references
                        .iter()
                        .try_fold(512_usize, |bytes, reference| {
                            bytes.checked_add(description_bytes(&reference.correction)?)
                        })
                        .ok_or(StoreError::Capacity)?;
                    let _preparation = budget.reserve(bytes).map_err(|_| StoreError::Capacity)?;
                    let mut descriptions = Vec::with_capacity(page.places.len());
                    for reference in &page.references {
                        descriptions.push(corrected_description(&reference.correction));
                    }
                    let mut entries = Vec::with_capacity(page.places.len());
                    for (((witness, reference), facts), correction) in page
                        .places
                        .iter()
                        .zip(&page.references)
                        .zip(notes)
                        .zip(&descriptions)
                    {
                        let EncounterExposure::Place {
                            label,
                            description,
                            location_label,
                            point,
                            ..
                        } = &witness.exposure
                        else {
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
                            note: Some(&facts.note),
                        });
                    }
                    wire::encode(
                        &PlacePage {
                            ok: true,
                            world_id,
                            generation: &generation,
                            entries,
                            next: page.next.map(|next| format!("{fence}.{next}")),
                            scan_limited: page.scan_limited,
                        },
                        b"",
                        b"",
                        budget,
                    )
                    .map_err(WorldError::Wire)
                },
            )?
        })
        .await
}

fn description_bytes(correction: &Option<Option<JsText>>) -> Option<usize> {
    256_usize.checked_add(match correction {
        Some(Some(text)) => text.units_len().checked_mul(8)?,
        _ => 0,
    })
}

fn corrected_description(correction: &Option<Option<JsText>>) -> Option<JsText> {
    correction.as_ref().map(|correction| {
        if let Some(value) = correction {
            let mut message = JsText::from("Corrected observation: ");
            message.push_text(value);
            message
        } else {
            JsText::from("This observation was corrected. Its original description is no longer established information.")
        }
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

pub(super) fn changed() -> Response {
    refusal(
        StatusCode::CONFLICT,
        "history-changed",
        "Remembered places changed. Refresh Known places.",
    )
}
