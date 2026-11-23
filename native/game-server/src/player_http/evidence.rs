//! Review the selected actor's actual retained memories through the same
//! private-history read and disclosure lease used by the browser.

use super::*;
use crate::{
    player_references::PRIVATE_CURSOR_BYTES,
    store::recall::browse::{EVIDENCE_PAGE, MemoryPosition},
    world::PlayerDisclosure,
};
use openlegend_simulation::{
    encoding::{json_record, json_record_len, json_tree_allocation_bound, sha256_hex},
    experience::{PersonalSourceKind, PersonalSourceRef},
    text::JsText,
    values::is_safe_record_id,
};

const MAX_RESULT_BYTES: usize = 64 * 1024;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Arguments {
    actor_id: String,
    cursor: Option<String>,
    limit: Option<usize>,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Cursor<Fence> {
    fence: Fence,
    position: MemoryPosition,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Snapshot<'a> {
    world_id: &'a str,
    generation: &'a str,
    sequence: u64,
    sim_time: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Page<'a> {
    records: Vec<Record<'a>>,
    next_cursor: Option<String>,
    coverage: &'static str,
}

#[derive(Serialize)]
struct Record<'a> {
    r#ref: Reference<'a>,
    #[serde(flatten)]
    body: BodyFields<'a>,
}

#[derive(Serialize)]
struct Reference<'a> {
    kind: &'static str,
    id: String,
    version: &'a str,
}

#[derive(Deserialize, Serialize)]
struct BodyFields<'a> {
    summary: JsText,
    kind: &'a str,
    source: &'a str,
    #[serde(borrow, skip_serializing_if = "Option::is_none")]
    obligation: Option<Obligation<'a>>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Obligation<'a> {
    revision: u64,
    status: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    due_at: Option<f64>,
    #[serde(borrow, skip_serializing_if = "Option::is_none")]
    completion: Option<Completion<'a>>,
    evidence_id: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    fulfilled_by: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    fulfilled_at: Option<f64>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Completion<'a> {
    event_type: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    target_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    definition_id: Option<&'a str>,
}

#[derive(Serialize)]
struct ToolResult<'a> {
    status: &'static str,
    data: Page<'a>,
    snapshot: Snapshot<'a>,
    cost: &'static str,
}

#[derive(Serialize)]
struct Envelope<'a> {
    ok: bool,
    result: ToolResult<'a>,
}

impl Arguments {
    pub(super) fn valid(&self) -> bool {
        is_safe_record_id(&self.actor_id)
            && self.limit.is_none_or(|limit| (1..=50).contains(&limit))
            && self
                .cursor
                .as_ref()
                .is_none_or(|cursor| !cursor.is_empty() && cursor.len() <= PRIVATE_CURSOR_BYTES)
    }
}

pub(super) type Custody = Arc<(
    tokio::sync::OwnedSemaphorePermit,
    ByteReservation,
    tokio::sync::watch::Sender<()>,
)>;

pub(super) async fn read(
    state: &PlayerRoutes,
    scope: Arc<AuthorizedScope>,
    request: &Arguments,
    stop: tokio::sync::watch::Receiver<bool>,
    custody: Custody,
) -> Result<PlayerDisclosure, WorldError> {
    // The general history gate requires Inspect only for another actor.
    // This tool requires it even for one's own actor. The retained scope
    // carries the exact grant revision through the final disclosure.
    state
        .authority
        .current_private_view(&scope, true, |_, _| ())?;
    let budget = state.game.host.budget();
    let _request = budget.reserve(4096).map_err(|_| StoreError::Capacity)?;
    let world = &state.game.world;
    let actor = request.actor_id.clone();
    let store = state.game.store.clone();
    let capture_custody = custody.clone();
    let capture_stop = stop.clone();
    let (selected, cut, (sequence, life, revision, pending)) = world
        .capture_recollections_with(
            state.authority.clone(),
            scope.clone(),
            actor.clone(),
            move |session, _| {
                let _custody = capture_custody;
                if *capture_stop.borrow() {
                    return Err(WorldError::ProjectionChanged);
                }
                session
                    .with_memory_page_read(&actor, |read| {
                        Ok((
                            read.sequence,
                            read.life,
                            read.memory_revision,
                            store.prepare_evidence_page(read)?,
                        ))
                    })?
                    .ok_or_else(|| WorldError::Access(AccessError::Forbidden))?
            },
        )
        .await?;
    let scope_key = scope.scope.key().map_err(|_| StoreError::InvalidRecord)?;
    // Keep continuation across unrelated world updates. The selected
    // actor's accepted memory revision replaces a whole-world cut number.
    let fence = json_record(&(
        &scope_key,
        &cut.generation,
        &cut.actor,
        revision,
        cut.privacy_revision,
        life,
    ))
    .map(|key| sha256_hex(key.as_bytes()))
    .map_err(|_| StoreError::InvalidRecord)?;
    let before = request
        .cursor
        .as_deref()
        .map(|cursor| parse_cursor(&state.references, cursor, &fence))
        .transpose()?;
    let mut rows = state
        .game
        .store
        .evidence_rows(
            cut.clone(),
            pending,
            before,
            request.limit.unwrap_or(EVIDENCE_PAGE).min(EVIDENCE_PAGE),
        )
        .await?;
    let count = rows.references.len();
    let next = rows.next.take();
    let selected = world
        .admit_recollections(state.game.clone(), selected, rows)
        .await?;
    world
        .disclose_history(&state.authority, &selected, |session, budget| {
            let _custody = custody;
            let timeline = stop.borrow();
            if *timeline || !session.memory_page_subject_current(&cut.actor, life, revision)? {
                return Err(WorldError::ProjectionChanged);
            }
            selected.sources().with_personal_sources(|sources| {
                let mut custody = budget.reserve(2048).map_err(|_| StoreError::Capacity)?;
                let mut records = Vec::with_capacity(count);
                for (index, reference, payload) in sources {
                    if index != records.len() || reference.kind != PersonalSourceKind::Memory {
                        return Err(StoreError::StaleCut.into());
                    }
                    let decoded =
                        json_tree_allocation_bound(payload).ok_or(StoreError::Capacity)?;
                    custody
                        .resize(custody.bytes() + decoded + reference.id.len() + cut.actor.len())
                        .map_err(|_| StoreError::Capacity)?;
                    records.push(record(&cut.actor, reference, payload)?);
                }
                if records.len() != count {
                    return Err(StoreError::StaleCut.into());
                }
                let next_cursor = next
                    .map(|position| {
                        state.references.seal_evidence_cursor(&Cursor {
                            fence: fence.as_str(),
                            position,
                        }).ok_or(StoreError::Capacity)
                    })
                    .transpose()?;
                let result = ToolResult {
                    status: "ok",
                    data: Page {
                        records,
                        next_cursor,
                        coverage: "Canonical retained actor memories, including cold records. Stored claims are not proof of world truth.",
                    },
                    snapshot: Snapshot {
                        world_id: &cut.world,
                        generation: &scope.scope.timeline_id,
                        sequence,
                        sim_time: cut.at,
                    },
                    cost: "no-paid-work",
                };
                if json_record_len(&result).map_err(|_| StoreError::InvalidRecord)?
                    > MAX_RESULT_BYTES
                {
                    return Err(StoreError::Capacity.into());
                }
                wire::encode(&Envelope { ok: true, result }, b"", b"", budget)
                    .map_err(WorldError::Wire)
            })?
        })
        .await
}

fn record<'a>(
    actor: &str,
    reference: &'a PersonalSourceRef,
    payload: &'a str,
) -> Result<Record<'a>, StoreError> {
    Ok(Record {
        r#ref: Reference {
            kind: "memory-record",
            id: json_record(&(actor, reference.id.as_str()))
                .map_err(|_| StoreError::InvalidRecord)?,
            version: &reference.revision,
        },
        body: serde_json::from_str(payload).map_err(|_| StoreError::InvalidRecord)?,
    })
}

fn parse_cursor(
    references: &ReferenceIssuer,
    cursor: &str,
    fence: &str,
) -> Result<MemoryPosition, WorldError> {
    let cursor: Cursor<String> = references
        .open_evidence_cursor(cursor)
        .ok_or(WorldError::ProjectionChanged)?;
    let position = cursor.position;
    if cursor.fence != fence
        || !position.at.is_finite()
        || !is_safe_record_id(&position.id)
        || position.kind != PersonalSourceKind::Memory
    {
        return Err(WorldError::ProjectionChanged);
    }
    Ok(position)
}
