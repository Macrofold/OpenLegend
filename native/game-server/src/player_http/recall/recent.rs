//! The existing browser's on-demand recent-observation view. The SQL loader
//! resolves selected coordinates against the exact accepted prefix before
//! the native reader grants the permitted receipt bodies.
use super::*;
use crate::player_references::RecentEditReference;
use openlegend_simulation::{
    received::{TemporalChange, TemporalReceipt},
    runtime::{RuntimeRecentBrowse, RuntimeRecentPosition, RuntimeRecentReceipt},
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ObservationPage<'a> {
    ok: bool,
    world_id: &'a str,
    generation: &'a str,
    entries: Vec<Observation>,
    next: Option<String>,
    scan_limited: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Observation {
    id: String,
    source_kind: &'static str,
    fidelity: &'static str,
    time: f64,
    text: JsText,
    #[serde(skip_serializing_if = "Option::is_none")]
    edit_reference: Option<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Cursor<Fence> {
    fence: Fence,
    before: RuntimeRecentPosition,
}

pub(super) async fn page(
    state: &PlayerRoutes,
    selected: &Arc<AuthorizedScope>,
    request: &RequestPage,
    creator_route: bool,
) -> Response {
    let query = js_trim(request.query.as_deref().unwrap_or(""));
    if query.encode_utf16().count() > 200 {
        return refusal(
            StatusCode::BAD_REQUEST,
            "history-search",
            "Shorten the search to continue.",
        );
    }
    let _workspace = match state.game.host.budget().reserve(8_192) {
        Ok(value) => value,
        Err(_) => return busy(),
    };
    let query = JsText::from(query).lowercase();
    let cursor: Option<Cursor<String>> = match request.cursor.as_deref() {
        None => None,
        Some(token) => match state.references.open_recent_cursor(token) {
            Some(cursor) => Some(cursor),
            None => return changed(),
        },
    };
    // Final disclosure checks the same exact grant revision. This earlier
    // capability check avoids entering the authority lock again while encoding.
    let can_edit = creator_route
        && state
            .authority
            .current_recall_operator(
                selected,
                request.actor_id != selected.scope.actor_id,
                |_| (),
            )
            .is_ok();
    for _ in 0..2 {
        match publish(
            state,
            selected,
            &request.actor_id,
            cursor.as_ref(),
            &query,
            can_edit,
        )
        .await
        {
            Ok(PlayerDisclosure::Published(bytes)) => return json_response(StatusCode::OK, bytes),
            Ok(PlayerDisclosure::Busy | PlayerDisclosure::Changed)
            | Err(WorldError::Storage(StoreError::StaleCut)) => (),
            Ok(PlayerDisclosure::Unchanged) | Err(WorldError::ProjectionChanged) => break,
            Err(error) => return failed(error),
        }
    }
    changed()
}

fn changed() -> Response {
    refusal(
        StatusCode::CONFLICT,
        "observations-changed",
        "Recent observations changed. Browse or search again.",
    )
}

async fn publish(
    state: &PlayerRoutes,
    scope: &Arc<AuthorizedScope>,
    actor: &str,
    before: Option<&Cursor<String>>,
    query: &JsText,
    can_edit: bool,
) -> Result<PlayerDisclosure, WorldError> {
    let world = &state.game.world;
    let (selected, cut, storage) = world
        .capture_recent_browse(
            state.authority.clone(),
            scope.clone(),
            actor.to_owned(),
            before.map(|value| value.before),
        )
        .await?;
    let refs = state
        .references
        .scoped(&scope.scope)
        .map_err(|_| StoreError::InvalidRecord)?;
    let key = scope.scope.key().map_err(|_| StoreError::InvalidRecord)?;
    let fence = refs
        .personal_source(&(
            "recent-observations",
            &key,
            &cut.generation,
            actor,
            cut.life,
            cut.privacy,
            query,
        ))
        .map_err(|_| StoreError::InvalidRecord)?;
    if before.is_some_and(|cursor| cursor.fence != fence) {
        return Err(WorldError::ProjectionChanged);
    }
    let (selected, cut) = world.admit_recent_browse(selected, cut, storage).await?;
    world
        .disclose_private_history(&state.authority, &selected, |budget| {
            selected
                .sources()
                .with_recent_receipts(|rows, unavailable| {
                    format_page(
                        rows,
                        unavailable,
                        &cut,
                        &refs,
                        &state.references,
                        &fence,
                        before.map(|value| value.before),
                        query,
                        (can_edit && cut.recall_editable).then_some(key.as_str()),
                        budget,
                    )
                })?
        })
        .await
}

fn format_page(
    rows: &mut dyn Iterator<Item = RuntimeRecentReceipt<'_>>,
    unavailable: bool,
    cut: &RuntimeRecentBrowse,
    references: &crate::player_references::PlayerReferences<'_>,
    issuer: &crate::player_references::ReferenceIssuer,
    fence: &str,
    before: Option<RuntimeRecentPosition>,
    query: &JsText,
    editor_scope: Option<&str>,
    budget: &ByteBudget,
) -> Result<Bytes, WorldError> {
    const PAGE_SIZE: usize = 20;
    const WINDOW_BYTES: usize = 8_192;
    // Bounded aggregate canonical bodies cover UTF-16 pieces and UTF-8 size
    // checks. The response bytes retain their own transport reservation.
    let _format = budget
        .reserve(WINDOW_BYTES * 16 + 4096)
        .map_err(|_| StoreError::Capacity)?;
    let mut entries = Vec::with_capacity(PAGE_SIZE);
    let mut oldest_match = None;
    let mut examined = None;
    let mut incomplete = cut.incomplete || unavailable;
    let mut has_more = cut.has_more;
    let mut bytes = 0;
    let mut operations = 0;
    for selected in rows {
        let receipt = selected.receipt();
        let position = position(receipt);
        // A continuation at the first active member cannot display that row
        // again. Lower retired members do not resurrect older evidence.
        if before.is_some_and(|previous| {
            previous.batch_order == position.batch_order
                && previous.entry_index == position.entry_index
        }) {
            continue;
        }
        let work = receipt.facets.len().max(1) as u64;
        if operations + work > cut.maximum_operations {
            has_more = true;
            incomplete = true;
            break;
        }
        operations += work;
        examined = Some(position);
        let size = selected.bytes()?;
        if bytes + size > WINDOW_BYTES {
            incomplete = true;
            has_more = true;
            break;
        }
        bytes += size;
        if receipt.header.change == TemporalChange::ReceiverFrame {
            continue;
        }
        incomplete |=
            receipt.facets.is_empty() && receipt.header.change != TemporalChange::Occurrence;
        let mut text = recent_text::described(
            selected.values(),
            receipt.header.change,
            !receipt.facets.is_empty(),
        );
        if !query.is_empty() && text.lowercase().find_from(query, 0).is_none() {
            continue;
        }
        if entries.len() == PAGE_SIZE {
            examined = oldest_match;
            has_more = true;
            break;
        }
        if !receipt.facets.is_empty() {
            let mut caption: JsText = match receipt.header.change {
                TemporalChange::Loss => "Lost contact; last received: ",
                TemporalChange::AttentionExit => "Last noted: ",
                _ => "Received: ",
            }
            .into();
            caption.push_text(&text);
            text = caption;
        }
        entries.push(Observation {
            id: references
                .personal_source(&("receipt", &cut.world_id, &receipt.locator))
                .map_err(|_| StoreError::InvalidRecord)?,
            source_kind: "observation",
            fidelity: "exact",
            time: receipt.at,
            text,
            edit_reference: editor_scope
                .map(|scope| {
                    issuer
                        .seal_recent_edit(&RecentEditReference {
                            scope,
                            world: cut.world_id.as_str(),
                            generation: cut.generation.as_str(),
                            life: cut.life,
                            privacy_revision: cut.privacy,
                            receipt: &receipt.locator,
                        })
                        .ok_or(StoreError::InvalidRecord)
                })
                .transpose()?,
        });
        oldest_match = Some(position);
    }
    let next = examined
        .filter(|_| has_more)
        .map(|before| {
            issuer
                .seal_recent_cursor(&Cursor { fence, before })
                .ok_or(StoreError::InvalidRecord)
        })
        .transpose()?;
    entries.reverse();
    wire::encode(
        &ObservationPage {
            ok: true,
            world_id: &cut.world_id,
            generation: &cut.generation,
            entries,
            next,
            scan_limited: incomplete,
        },
        b"",
        b"",
        budget,
    )
    .map_err(WorldError::Wire)
}

fn position(receipt: &TemporalReceipt) -> RuntimeRecentPosition {
    RuntimeRecentPosition {
        batch_order: receipt.locator.batch_order,
        entry_index: receipt.locator.entry_index,
        member_index: receipt
            .facets
            .iter()
            .map(|facet| facet.member_index)
            .min()
            .unwrap_or(0),
    }
}
