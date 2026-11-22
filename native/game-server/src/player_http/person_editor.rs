//! The actual person editor's memory page, exact body and protected save.
//! Creator permission is checked separately from an actor's private boundary.
use super::*;
use crate::{
    store::recall::{browse::MemoryPosition, ranking_edit::PreparedMemoryEdit},
    world::{PlayerDisclosure, ProtectedCommit},
};
use openlegend_simulation::{
    encoding::{json_record, json_tree_allocation_bound, sha256_hex},
    experience::{PersonalSourceKind, PersonalSourceRef, acquired_speech},
    narration::{NativeText, native_text},
    runtime::{PersonEditorCut, PersonMemoryEdit, RuntimeDirectOutput, RuntimeError},
    text::JsText,
    values::is_safe_record_id,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Read {
    actor_id: String,
    before: Option<String>,
    entry_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Save {
    actor_id: String,
    cut: PersonEditorCut<'static>,
    entry_id: String,
    expected_hash: String,
    change: SaveChange,
}

// Deserialize the text directly from its JSON source. An internally tagged
// Serde enum buffers fields as Unicode and rejects isolated UTF-16 units.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SaveChange {
    operation: SaveOperation,
    importance: Option<f64>,
    summary: Option<JsText>,
    text: Option<JsText>,
    #[serde(default, deserialize_with = "content_change")]
    content: Option<Option<JsText>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
enum SaveOperation {
    Update,
    Forget,
}

fn content_change<'de, D: serde::Deserializer<'de>>(
    decoder: D,
) -> Result<Option<Option<JsText>>, D::Error> {
    Option::<JsText>::deserialize(decoder).map(Some)
}

impl SaveChange {
    fn into_edit(self, kind: PersonalSourceKind) -> Option<PersonMemoryEdit> {
        let wording = match kind {
            PersonalSourceKind::Memory if self.text.is_none() && self.content.is_none() => {
                self.summary
            }
            PersonalSourceKind::Summary if self.summary.is_none() && self.content.is_none() => {
                self.text
            }
            PersonalSourceKind::Awareness if self.summary.is_none() => self.text,
            _ => return None,
        };
        match (self.operation, self.importance, wording, self.content) {
            (SaveOperation::Update, Some(importance), text, content) => {
                Some(PersonMemoryEdit::Update {
                    importance,
                    text,
                    content,
                })
            }
            (SaveOperation::Forget, None, None, None) => Some(PersonMemoryEdit::Forget),
            _ => None,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Memory<'a> {
    id: String,
    hash: &'a str,
    time: f64,
    text: JsText,
    tags: Vec<String>,
    source: &'static str,
    label: &'static str,
    #[serde(rename = "eventType", skip_serializing_if = "Option::is_none")]
    event_type: Option<String>,
}

#[derive(Serialize)]
struct Page<'a> {
    ok: bool,
    #[serde(flatten)]
    cut: PersonEditorCut<'a>,
    name: &'a JsText,
    memories: Vec<Memory<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    before: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BodyView<'a> {
    ok: bool,
    hash: &'a str,
    json: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    wording_editable: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    content: Option<JsText>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AwarenessView<'a> {
    at: f64,
    text: NativeText,
    content: Option<NativeText>,
    event_type: Option<String>,
    #[serde(borrow)]
    speech: Option<&'a serde_json::value::RawValue>,
    modality: String,
    recognized: bool,
    entity_ids: Vec<String>,
}

#[derive(Serialize)]
struct ResultView {
    ok: bool,
    code: String,
    message: JsText,
}

struct Staged {
    result: ResultView,
    projection: Option<PreparedMemoryEdit>,
    _custody: ByteReservation,
}

async fn actor(
    state: &PlayerRoutes,
    selected: &Arc<AuthorizedScope>,
    reference: String,
) -> Result<String, WorldError> {
    state.authority.current_recall_operator(
        selected,
        reference != selected.scope.actor_id,
        |_| (),
    )?;
    if reference == selected.scope.actor_id {
        return Ok(reference);
    }
    let authority = state.authority.clone();
    let selected = selected.clone();
    let references = state.references.clone();
    let budget = state.game.host.budget().clone();
    state
        .game
        .world
        .capture(move |session| {
            match authority.current_private_view(&selected, true, |scope, _| {
                references.resolve_contact(session, scope, &reference, &budget)
            }) {
                Ok(result) => result.map(|contact| {
                    contact
                        .map(|contact| contact.id)
                        .ok_or(AccessError::Changed)
                }),
                Err(error) => Ok(Err(error)),
            }
        })
        .await?
        .map_err(WorldError::Access)
}

fn editable_id(id: &str) -> Option<(PersonalSourceKind, &str)> {
    let (tag, id) = id.split_once(':')?;
    let kind = match tag {
        "awareness" => PersonalSourceKind::Awareness,
        "memory" => PersonalSourceKind::Memory,
        "summary" => PersonalSourceKind::Summary,
        _ => return None,
    };
    is_safe_record_id(id).then_some((kind, id))
}

fn changed() -> Response {
    refusal(
        StatusCode::CONFLICT,
        "stale",
        "Person or memory changed. Refresh before editing.",
    )
}

pub(super) async fn read(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let selected = match scope(&state.authority, &parts.headers, None).await {
        Ok(scope) => Arc::new(scope),
        Err(error) => return access_failure(error),
    };
    let (input, _custody): (Read, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(input) => input,
            Err(error) => return error,
        };
    let detail = parts.uri.path().ends_with("/memory");
    let exact = match (detail, input.entry_id.as_deref()) {
        (false, None) => None,
        (true, Some(id)) if input.before.is_none() => match editable_id(id) {
            Some(id) => Some(id),
            None => return changed(),
        },
        _ => return changed(),
    };
    let actor = match actor(&state, &selected, input.actor_id).await {
        Ok(actor) => actor,
        Err(problem) => return failed(problem),
    };
    for _ in 0..2 {
        match read_cut(&state, &selected, &actor, input.before.as_deref(), exact).await {
            Ok(PlayerDisclosure::Published(bytes)) => return json_response(StatusCode::OK, bytes),
            Ok(PlayerDisclosure::Busy) | Err(WorldError::Storage(StoreError::StaleCut)) => (),
            Ok(_) | Err(WorldError::ProjectionChanged) => break,
            Err(problem) => return failed(problem),
        }
    }
    changed()
}

async fn read_cut(
    state: &PlayerRoutes,
    selected: &Arc<AuthorizedScope>,
    actor: &str,
    before: Option<&str>,
    exact: Option<(PersonalSourceKind, &str)>,
) -> Result<PlayerDisclosure, WorldError> {
    let world = &state.game.world;
    let (history, cut) = world
        .capture_recollections(state.authority.clone(), selected.clone(), actor.into())
        .await?;
    let key = selected
        .scope
        .key()
        .map_err(|_| StoreError::InvalidRecord)?;
    let fence = json_record(&(
        &key,
        &cut.world,
        &cut.generation,
        actor,
        cut.privacy_revision,
    ))
    .map(|json| sha256_hex(json.as_bytes()))
    .map_err(|_| StoreError::InvalidRecord)?;
    let position = before
        .map(|cursor| {
            let (reading, json) = cursor
                .split_once('.')
                .ok_or(WorldError::ProjectionChanged)?;
            if reading != fence {
                return Err(WorldError::ProjectionChanged);
            }
            let position: MemoryPosition =
                serde_json::from_str(json).map_err(|_| WorldError::ProjectionChanged)?;
            if !position.at.is_finite() || !is_safe_record_id(&position.id) {
                return Err(WorldError::ProjectionChanged);
            }
            Ok(position)
        })
        .transpose()?;
    let mut rows = state
        .game
        .store
        .editor_memory_rows(cut, position, exact.map(|(kind, id)| (kind, id.to_owned())))
        .await?;
    let count = rows.references.len();
    if exact.is_some() && count != 1 {
        return Err(WorldError::ProjectionChanged);
    }
    let next = rows.next.take();
    let history = world
        .admit_recollections(state.game.clone(), history, rows)
        .await?;
    world
        .disclose_private_notes(&state.authority, selected, actor, |session, budget, _| {
            let Some(_lease) = session.history_publication(history.sources())? else {
                return Err(WorldError::ProjectionChanged);
            };
            session
                .inspect_person_editor(actor, |name, cut, speech_event| {
                    history.sources().with_personal_sources(|sources| {
                        if exact.is_some() {
                            let (_, reference, payload) =
                                sources.next().ok_or(WorldError::ProjectionChanged)?;
                            let mut view = BodyView {
                                ok: true,
                                hash: &reference.revision,
                                json: payload,
                                wording_editable: None,
                                content: None,
                            };
                            let _details = if reference.kind == PersonalSourceKind::Awareness {
                                let size = json_tree_allocation_bound(payload)
                                    .ok_or(StoreError::Capacity)?;
                                let custody =
                                    budget.reserve(size).map_err(|_| StoreError::Capacity)?;
                                let body: AwarenessView<'_> = serde_json::from_str(payload)
                                    .map_err(|_| StoreError::InvalidRecord)?;
                                view.wording_editable = Some(!acquired_speech(
                                    body.event_type.as_deref(),
                                    body.speech.is_some(),
                                    speech_event,
                                ));
                                view.content = body.content.as_ref().map(native_text);
                                Some(custody)
                            } else {
                                None
                            };
                            return wire::encode(&view, b"", b"", budget).map_err(WorldError::Wire);
                        }
                        let mut held = budget
                            .reserve(4096 + count * std::mem::size_of::<Memory<'_>>())
                            .map_err(|_| StoreError::Capacity)?;
                        let mut memories = Vec::with_capacity(count);
                        for (_, reference, payload) in sources {
                            let decode =
                                json_tree_allocation_bound(payload).ok_or(StoreError::Capacity)?;
                            held.resize(
                                held.bytes()
                                    .checked_add(decode)
                                    .ok_or(StoreError::Capacity)?,
                            )
                            .map_err(|_| StoreError::Capacity)?;
                            memories.push(memory(reference, payload)?);
                        }
                        if memories.len() != count {
                            return Err(WorldError::ProjectionChanged);
                        }
                        let before = next
                            .map(|position| {
                                json_record(&position).map(|body| format!("{fence}.{body}"))
                            })
                            .transpose()
                            .map_err(|_| StoreError::InvalidRecord)?;
                        wire::encode(
                            &Page {
                                ok: true,
                                cut,
                                name,
                                memories,
                                before,
                            },
                            b"",
                            b"",
                            budget,
                        )
                        .map_err(WorldError::Wire)
                    })?
                })?
                .ok_or(WorldError::ProjectionChanged)?
        })
        .await
}

fn memory<'a>(reference: &'a PersonalSourceRef, payload: &str) -> Result<Memory<'a>, StoreError> {
    if reference.kind == PersonalSourceKind::Awareness {
        let body: AwarenessView<'_> =
            serde_json::from_str(payload).map_err(|_| StoreError::InvalidRecord)?;
        let event_type = body.event_type.unwrap_or_else(|| body.modality.clone());
        let tags = std::iter::once(body.modality)
            .chain(body.recognized.then(|| "recognized".to_owned()))
            .chain(body.entity_ids)
            .collect();
        return Ok(Memory {
            id: format!("awareness:{}", reference.id),
            hash: &reference.revision,
            time: body.at,
            text: native_text(&body.text),
            tags,
            source: "awareness",
            label: "Raw",
            event_type: Some(event_type),
        });
    }
    if reference.kind == PersonalSourceKind::Summary {
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Summary {
            to: f64,
            text: JsText,
            entity_ids: Vec<String>,
        }
        let Summary {
            to,
            text,
            entity_ids,
        } = serde_json::from_str(payload).map_err(|_| StoreError::InvalidRecord)?;
        return Ok(Memory {
            id: format!("summary:{}", reference.id),
            hash: &reference.revision,
            time: to,
            text,
            tags: std::iter::once("reflection".to_owned())
                .chain(entity_ids)
                .collect(),
            source: "summary",
            label: "Consolidated",
            event_type: None,
        });
    }
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Body {
        at: f64,
        kind: String,
        source: String,
        summary: JsText,
        entity_ids: Vec<String>,
    }
    let Body {
        at,
        kind,
        source,
        summary,
        mut entity_ids,
    } = serde_json::from_str(payload).map_err(|_| StoreError::InvalidRecord)?;
    let mut tags = Vec::with_capacity(2 + entity_ids.len());
    tags.extend([kind, source]);
    tags.append(&mut entity_ids);
    Ok(Memory {
        id: format!("memory:{}", reference.id),
        hash: &reference.revision,
        time: at,
        text: summary,
        tags,
        source: "memory",
        label: "Raw",
        event_type: None,
    })
}

pub(super) async fn save(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let scope = match scope(&state.authority, &parts.headers, None).await {
        Ok(scope) => Arc::new(scope),
        Err(error) => return access_failure(error),
    };
    let (input, custody): (Save, _) = match read_json(
        &parts.headers,
        body,
        state.game.host.budget(),
        false,
        1024 * 1024,
    )
    .await
    {
        Ok(input) => input,
        Err(error) => return error,
    };
    let Some((kind, id)) = editable_id(&input.entry_id) else {
        return changed();
    };
    let reference = PersonalSourceRef {
        kind,
        id: id.into(),
        revision: input.expected_hash,
    };
    let Some(change) = input.change.into_edit(kind) else {
        return request_error();
    };
    if !reference.validate() || !change.valid(kind) {
        return refusal(
            StatusCode::BAD_REQUEST,
            "invalid-memory",
            "Use an importance from 0 to 10 and shorter memory text.",
        );
    }
    let actor = match actor(&state, &scope, input.actor_id).await {
        Ok(actor) => actor,
        Err(problem) => return failed(problem),
    };
    match save_cut(&state, scope, actor, input.cut, reference, change, custody).await {
        Ok(result) => reply(
            &state,
            if result.result.ok {
                StatusCode::OK
            } else {
                StatusCode::CONFLICT
            },
            &result.result,
        ),
        Err(WorldError::ProjectionChanged) => changed(),
        Err(WorldError::Simulation(error)) if error.stale_reason() == Some("person-editor-cut") => {
            changed()
        }
        Err(problem) => failed(problem),
    }
}

async fn save_cut(
    state: &PlayerRoutes,
    scope: Arc<AuthorizedScope>,
    actor: String,
    cut: PersonEditorCut<'static>,
    reference: PersonalSourceRef,
    change: PersonMemoryEdit,
    custody: ByteReservation,
) -> Result<Staged, WorldError> {
    let game = &state.game;
    let grant = state.authority.clone();
    let needs_inspect = actor != scope.scope.actor_id;
    grant.current_recall_operator(&scope, needs_inspect, |_| ())?;
    let _withdrawal = change
        .withdraws_source()
        .then(|| game.world.begin_source_edit(&actor))
        .transpose()?;
    let _barrier = state.saves.enter_protected().await?;
    grant.current_recall_operator(&scope, needs_inspect, |_| ())?;
    let durable = game
        .store
        .protected_edit_head()
        .await?
        .ok_or(StoreError::StaleCut)?;
    let cut_world = durable.world_id.clone();
    let cut_generation = durable.generation.clone();
    let actor_owner = scope.scope.actor_id.clone();
    let account = scope.scope.account_id.clone();
    let accepted_cut = game
        .world
        .capture(move |world| Ok(world.accepted_progress()?.through_cut))
        .await?;
    let provider = game.clone();
    let preparer = game.store.clone();
    let writer = game.store.clone();
    let writing_scope = scope.clone();
    let saves = state.saves.clone();
    game.world
        .execute_protected_then(
            move |world| {
                // The protected task retains the decoded draft until it is either
                // rejected or transferred to the separately funded native cursor.
                let _input = custody;
                let progress = world.accepted_progress()?;
                if progress.through_cut != accepted_cut
                    || progress.world_id != cut_world
                    || progress.generation != cut_generation
                {
                    return Err(RuntimeError::application_refused(StoreError::StaleCut));
                }
                if !world.private_history_permitted(&account, &actor_owner, &actor)?
                    || !world.may_edit_recall(&actor_owner, &actor)?
                {
                    return Err(RuntimeError::application_refused(AccessError::Forbidden));
                }
                world.begin_editor_memory_edit(&actor, &cut, reference, change)
            },
            move |question| {
                let game = provider.clone();
                let durable = durable.clone();
                async move {
                    if question.asks_personal_history()? {
                        let answer = game
                            .store
                            .read_live_personal_history(&question, durable, accepted_cut)
                            .await?;
                        Ok((question, answer))
                    } else {
                        game.answer_operation(question).await
                    }
                }
            },
            move |output, budget| {
                let RuntimeDirectOutput::Prepared(product) = output else {
                    unreachable!("memory editor does not preview")
                };
                let outcome = product.outcome();
                let custody =
                    budget.reserve(512 + outcome.code.len() + outcome.message.storage_bytes())?;
                let projection = outcome
                    .ok
                    .then(|| preparer.prepare_memory_edit(&product))
                    .transpose()?;
                Ok(Staged {
                    result: ResultView {
                        ok: outcome.ok,
                        code: outcome.code.clone(),
                        message: outcome.message.clone(),
                    },
                    projection,
                    _custody: custody,
                })
            },
            move || {
                grant.current_recall_operator(&scope, needs_inspect, |_| ())?;
                grant.current_private_view(&scope, needs_inspect, |_, _| ())?;
                Ok(())
            },
            move |staged, prefix| -> ProtectedCommit<'_> {
                Box::pin(async move {
                    let edit = staged.projection.as_ref().ok_or(CommitError::RolledBack(
                        StoreError::DerivedProjectionRequired,
                    ))?;
                    writer
                        .commit_memory_edit(edit, &writing_scope.scope, prefix)
                        .await
                })
            },
            move |_| {
                saves.signal_view();
                saves.signal_recall_change();
                Ok(())
            },
        )
        .await?
        .ok_or(WorldError::ProjectionChanged)
}
