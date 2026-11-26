//! The ordinary Notes panel reads its own current accepted continuity page.
use super::*;
use crate::{
    language::LanguageProvider,
    live_save::AcceptedSaveInput,
    player_command::{PlaceReference, SelectedKnownPlace},
    world::{ApplicationStart, PlayerDisclosure},
};
use openlegend_simulation::{
    appraisals::RuntimePrivateFeeling,
    encoding::json_record,
    host::CandidateKey,
    reception::{KnowledgeSubject, ObserverSubject},
    runtime::{
        NativeWorldSession, RuntimeDirectOutput, RuntimeError, RuntimeMindFile, RuntimePrivateNotes,
    },
    text::JsText,
    values::is_safe_record_id,
};
use std::borrow::Cow;
pub(super) mod attention;
mod inspection;
pub(super) mod marker;
pub(super) mod nickname;
pub(super) mod subjects;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct NotesRequest {
    actor_id: String,
    cursor: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct OwnerEdit {
    actor_id: String,
    world_id: String,
    generation: String,
    #[serde(deserialize_with = "Option::deserialize")]
    subject_id: Option<KnowledgeSubject>,
    #[serde(
        default,
        deserialize_with = "openlegend_simulation::values::deserialize_present_option"
    )]
    place: Option<PlaceReference>,
    expected_revision: i64,
    text: JsText,
    nickname: Option<JsText>,
    given_name: Option<JsText>,
    name_revision: Option<i64>,
}

#[derive(Clone)]
pub(super) enum EditAccess {
    Owner,
    Creator(Arc<str>),
    CreatorSelf,
    CreateControlled,
}

impl EditAccess {
    fn actor<'a>(&'a self, scope: &'a crate::authority::RequestScope) -> &'a str {
        match self {
            Self::Owner | Self::CreatorSelf | Self::CreateControlled => &scope.actor_id,
            Self::Creator(actor) => actor,
        }
    }

    fn current<T>(
        &self,
        authority: &Authority,
        scope: &AuthorizedScope,
        use_scope: impl FnOnce(&crate::authority::RequestScope) -> T,
    ) -> Result<T, AccessError> {
        match self {
            Self::Owner => {
                authority.current(scope, Capability::Play, true, |scope, _| use_scope(scope))
            }
            Self::CreateControlled=>authority.current(scope,Capability::Create,true,|scope,_|use_scope(scope)),
            Self::Creator(_) => authority.current_recall_operator(scope, true, use_scope),
            Self::CreatorSelf => authority.current_recall_operator(scope, false, use_scope),
        }
    }
}

const FIRST_PAGE: Cursor<'static> = Cursor {
    fence: Cow::Borrowed(""),
    notes: Some(Cow::Borrowed("")),
    feelings: Some(Cow::Borrowed("")),
};

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Cursor<'a> {
    fence: Cow<'a, str>,
    notes: Option<Cow<'a, str>>,
    feelings: Option<Cow<'a, str>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Mind<'a> {
    #[serde(flatten)]
    notes: &'a RuntimePrivateNotes<'a>,
    #[serde(skip_serializing_if = "Option::is_none")]
    accepted_text: Option<JsText>,
    documents: [(); 0],
    records: [(); 0],
    thoughts: [(); 0],
    continuity: Continuity<'a>,
}

#[derive(Serialize)]
struct Continuity<'a> {
    cursor: Option<String>,
    appraisals: &'a [RuntimePrivateFeeling<'a>],
}

#[derive(Serialize)]
pub(super) struct EditOutcome {
    #[serde(rename="entityId",skip_serializing_if="Option::is_none")]
    entity_id:Option<String>,
    pub(super) ok: bool,
    code: String,
    message: JsText,
}

pub(super) struct StagedEdit {
    pub(super) outcome: EditOutcome,
    save: Arc<AcceptedSaveInput>,
    cut: u64,
    _storage: ByteReservation,
}

pub(super) async fn get(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let selected = match scope(&state.authority, &parts.headers, None).await {
        Ok(selected) => Arc::new(selected),
        Err(error) => return access_failure(error),
    };
    let (request, _custody): (NotesRequest, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(value) => value,
            Err(error) => return error,
        };
    let creator = parts.uri.path() == "/api/god/mind";
    if !is_safe_record_id(&request.actor_id)
        || (!creator && request.actor_id != selected.scope.actor_id)
    {
        return access_failure(AccessError::Forbidden);
    }
    // The browser forwards a cursor unchanged. Bind both continuation keys
    // to the same current private revision without an extra encoding pass.
    let cursor = match request.cursor.as_deref() {
        None => None,
        Some(body) if body.encode_utf16().count() <= 2048 => match serde_json::from_str(body) {
            Ok(value) => Some(value),
            Err(_) => return invalid_cursor(),
        },
        Some(_) => return invalid_cursor(),
    };
    let contact = if creator && request.actor_id.starts_with("contact-") {
        let authority = state.authority.clone();
        let permit = selected.clone();
        let references = state.references.clone();
        let contact = request.actor_id.clone();
        let funding = state.game.host.budget().clone();
        match state
            .game
            .world
            .capture(move |session| {
                match authority.current_private_view(&permit, true, |scope, _| {
                    references.resolve_contact(session, scope, &contact, &funding)
                }) {
                    Ok(resolved) => resolved.map(Ok),
                    Err(error) => Ok(Err(error)),
                }
            })
            .await
        {
            Ok(Ok(Some(contact))) => Some(contact),
            Ok(Ok(None)) => return access_failure(AccessError::Changed),
            Ok(Err(error)) => return access_failure(error),
            Err(error) => return failed(error),
        }
    } else {
        None
    };
    let actor = contact
        .as_ref()
        .map_or(request.actor_id.as_str(), |contact| contact.id.as_str());
    if creator && cursor.is_none() {
        return inspection::inspect(&state, &selected, actor, None).await;
    }
    page(&state, &selected, actor, cursor.as_ref(), None).await
}

pub(super) async fn edit(State(state): State<PlayerRoutes>, request: Request) -> Response {
    // This is Source's existing ordinary JSON allowance. The installed note
    // policy still owns the text length and can refuse without mutation.
    const EDIT_REQUEST_BYTES: usize = 16_384;
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let selected = match scope(&state.authority, &parts.headers, None).await {
        Ok(selected) => Arc::new(selected),
        Err(error) => return access_failure(error),
    };
    let (request, _input): (OwnerEdit, _) = match read_json(
        &parts.headers,
        body,
        state.game.host.budget(),
        false,
        EDIT_REQUEST_BYTES,
    )
    .await
    {
        Ok(value) => value,
        Err(error) => return error,
    };
    let creator = parts.uri.path() == "/api/god/knowledge";
    let actor = request.actor_id.clone();
    let edit_access = if creator && actor != selected.scope.actor_id && is_safe_record_id(&actor) {
        EditAccess::Creator(Arc::from(actor.as_str()))
    } else if !creator && actor == selected.scope.actor_id {
        EditAccess::Owner
    } else {
        return access_failure(AccessError::Forbidden);
    };
    if creator && let Err(error) = edit_access.current(&state.authority, &selected, |_| ()) {
        return access_failure(error);
    }
    let OwnerEdit {
        world_id,
        generation,
        subject_id,
        place,
        expected_revision,
        text,
        nickname,
        given_name,
        name_revision,
        ..
    } = request;
    if (creator && (nickname.is_some() || place.is_some())) || (!creator && given_name.is_some()) {
        return request_error();
    }
    if (nickname.is_some() || given_name.is_some())
        && !matches!(
            subject_id,
            Some(KnowledgeSubject::Entity { .. } | KnowledgeSubject::Individual { .. })
        )
    {
        return request_error();
    }
    let nickname = nickname.map(|name| (name_revision.unwrap_or(0), name));
    let given_name = given_name.map(|name| (name_revision.unwrap_or(0), name));
    if place.as_ref().is_some_and(|place| !place.valid()) {
        return request_error();
    }
    let selected_place = match (&subject_id, place) {
        (Some(KnowledgeSubject::Place { place_id }), Some(place)) if *place_id == place.id => {
            if let Err(error) =
                state
                    .authority
                    .current(&selected, Capability::Play, true, |_, _| ())
            {
                return access_failure(error);
            }
            match SelectedKnownPlace::read(
                &state.game,
                &state.authority,
                &selected,
                &place,
                Some(tokio::time::Instant::now() + REQUEST_TIMEOUT),
            )
            .await
            {
                Ok(Some(selection)) => Some((place.id, selection.evidence)),
                Ok(None)
                | Err(WorldError::ProjectionChanged | WorldError::SourceEditPending)
                | Err(WorldError::Storage(StoreError::StaleCut)) => return known_places::changed(),
                Err(error) => return failed(error),
            }
        }
        _ => None,
    };
    let place_edit = selected_place.is_some();
    let world = state.game.world.clone();
    let target = edit_access.clone();
    let edited = execute_authorized_edit(
        &state,
        selected.clone(),
        world_id,
        Some(generation),
        true,
        edit_access,
        move |session, scope| {
            if creator {
                return session
                    .begin_creator_knowledge_edit(
                        &scope.account_id,
                        &scope.actor_id,
                        target.actor(scope),
                        subject_id,
                        expected_revision,
                        text,
                        given_name,
                    )?
                    .ok_or_else(|| AccessError::Forbidden.into());
            }
            if let Some((place_id, evidence)) = selected_place {
                // Read the selected proof again inside the writer turn. The
                // shared acceptance check also covers a privacy edit arriving
                // after this check and before settlement.
                world
                    .with_current_player_history(session, &evidence, |_| Ok(()))?
                    .ok_or(WorldError::SourceEditPending)?;
                return Ok(session.begin_owner_place_note(
                    &scope.account_id,
                    &scope.actor_id,
                    place_id,
                    expected_revision,
                    text,
                )?);
            }
            Ok(session.begin_owner_knowledge_edit(
                &scope.account_id,
                &scope.actor_id,
                subject_id,
                expected_revision,
                text,
                nickname,
            )?)
        },
    )
    .await;
    match edited {
        Ok(Some(result)) if creator && result.outcome.ok => {
            inspection::inspect(&state, &selected, &actor, Some(&result.outcome)).await
        }
        Ok(Some(result)) => page(&state, &selected, &actor, None, Some(&result.outcome)).await,
        Ok(None) => refusal(
            StatusCode::SERVICE_UNAVAILABLE,
            "note-save-unconfirmed",
            "The save hasn’t been confirmed. Refresh notes to check.",
        ),
        Err(WorldError::ProjectionChanged) => refusal(
            StatusCode::CONFLICT,
            "stale-world",
            "The world changed. Reload the editor.",
        ),
        Err(WorldError::SourceEditPending) if place_edit => known_places::changed(),
        Err(error) => failed(error),
    }
}

/// Stage one owner-controlled private change and await the ordinary save
/// without holding the world turn. The callback uses the exact admitted actor.
pub(super) async fn execute_edit(
    state: &PlayerRoutes,
    selected: Arc<AuthorizedScope>,
    world_id: String,
    generation: Option<String>,
    check_maintenance: bool,
    begin: impl FnOnce(
        &mut NativeWorldSession,
        &crate::authority::RequestScope,
    ) -> Result<CandidateKey, WorldError>
    + Send
    + 'static,
) -> Result<Option<StagedEdit>, WorldError> {
    execute_authorized_edit(
        state,
        selected,
        world_id,
        generation,
        check_maintenance,
        EditAccess::Owner,
        begin,
    )
    .await
}

pub(super) async fn execute_authorized_edit(
    state: &PlayerRoutes,
    selected: Arc<AuthorizedScope>,
    world_id: String,
    generation: Option<String>,
    check_maintenance: bool,
    access: EditAccess,
    begin: impl FnOnce(
        &mut NativeWorldSession,
        &crate::authority::RequestScope,
    ) -> Result<CandidateKey, WorldError>
    + Send
    + 'static,
) -> Result<Option<StagedEdit>, WorldError> {
    let result = apply_authorized_edit(
        state,
        selected,
        world_id,
        generation,
        check_maintenance,
        access,
        begin,
    )
    .await?;
    // A confirmed Save Knowledge response retains Source's durable meaning.
    // The normal background writer owns this wait; no world turn is held.
    if result.outcome.ok {
        let until = tokio::time::Instant::now() + REQUEST_TIMEOUT;
        if state
            .game
            .world
            .when_durable(result.cut, until)
            .await
            .is_err()
        {
            return Ok(None);
        }
    }
    Ok(Some(result))
}

/// Accept a private edit and stage its ordinary save. An explicit confirmation
/// that promises durability uses `execute_edit` and waits after this turn.
async fn apply_edit(
    state: &PlayerRoutes,
    selected: Arc<AuthorizedScope>,
    world_id: String,
    generation: Option<String>,
    check_maintenance: bool,
    begin: impl FnOnce(
        &mut NativeWorldSession,
        &crate::authority::RequestScope,
    ) -> Result<CandidateKey, WorldError>
    + Send
    + 'static,
) -> Result<StagedEdit, WorldError> {
    apply_authorized_edit(
        state,
        selected,
        world_id,
        generation,
        check_maintenance,
        EditAccess::Owner,
        begin,
    )
    .await
}

async fn apply_authorized_edit(
    state: &PlayerRoutes,
    selected: Arc<AuthorizedScope>,
    world_id: String,
    generation: Option<String>,
    check_maintenance: bool,
    access: EditAccess,
    begin: impl FnOnce(
        &mut NativeWorldSession,
        &crate::authority::RequestScope,
    ) -> Result<CandidateKey, WorldError>
    + Send
    + 'static,
) -> Result<StagedEdit, WorldError> {
    let _admitted = state.saves.enter_ordinary().await;
    // Start and Ready need the exclusive save gate. Check the current window
    // before taking the grant-cache lock for the synchronous candidate start.
    if check_maintenance {
        state
            .clock
            .maintenance()
            .allow_ordinary(&state.authority, &selected)?;
    }
    state.saves.check_admission(tokio::time::Instant::now())?;
    let game = state.game.clone();
    let begin_authority = state.authority.clone();
    let finish_authority = state.authority.clone();
    let begin_scope = selected.clone();
    let finish_world = game.world.clone();
    let start_access = access.clone();
    let stage = state.saves.clone();
    let accept = state.saves.clone();
    game.world.request_advance_publication();
    game.world
        .execute_and_publish(
            #[cfg(feature = "profile-campaign")]
            openlegend_simulation::profile::sites::TURN_OTHER,
            move |session| {
                let progress = session.accepted_progress()?;
                if progress.world_id != world_id
                    || generation
                        .as_ref()
                        .is_some_and(|expected| progress.generation != expected)
                {
                    return Err(WorldError::ProjectionChanged);
                }
                start_access.current(&begin_authority, &begin_scope, |scope| {
                    Ok(ApplicationStart::Candidate(begin(session, scope)?))
                })?
            },
            {
                let game = game.clone();
                move |question| {
                    let game = game.clone();
                    async move { game.answer_operation(question).await }
                }
            },
            move |output, budget| {
                let RuntimeDirectOutput::Prepared(product) = output else {
                    unreachable!("private editing cannot preview")
                };
                let outcome = product.outcome();
                let storage =
                    budget.reserve(256 + outcome.code.len() + outcome.message.storage_bytes()+outcome.entity_id.as_ref().map_or(0,String::len))?;
                Ok(StagedEdit {
                    outcome: EditOutcome {
                        entity_id:outcome.entity_id.clone(),
                        ok: outcome.ok,
                        code: outcome.code.clone(),
                        message: outcome.message.clone(),
                    },
                    save: stage.stage(&product, None)?,
                    cut: product.progress().through_cut,
                    _storage: storage,
                })
            },
            move |fence, key, _| {
                access.current(&finish_authority, &selected, |scope| {
                    finish_world
                        .with_unedited_history(
                            access.actor(scope),
                            || Ok(fence.settle(key, true)?),
                        )?
                        .ok_or(WorldError::SourceEditPending)
                })?
            },
            move |edit| accept.accept(&edit.save),
        )
        .await?
        .ok_or_else(|| WorldError::Access(AccessError::Changed))
}

async fn page(
    state: &PlayerRoutes,
    selected: &AuthorizedScope,
    actor: &str,
    cursor: Option<&Cursor<'_>>,
    edit: Option<&EditOutcome>,
) -> Response {
    let _format = match state.game.host.budget().reserve(8192) {
        Ok(storage) => storage,
        Err(_) => return busy(),
    };
    let key = match selected.scope.key() {
        Ok(key) => key,
        Err(_) => return busy(),
    };
    let after = cursor.unwrap_or(&FIRST_PAGE);
    let result = state
        .game
        .world
        .disclose_private_notes(
            &state.authority,
            selected,
            actor,
            |session, budget, controlling| {
                if edit.is_some() && actor == selected.scope.actor_id && !controlling {
                    return Err(AccessError::Changed.into());
                }
                if let Some(outcome) = edit.filter(|outcome| !outcome.ok) {
                    return wire::encode(outcome, b"", b"", budget).map_err(WorldError::Wire);
                }
                session
                    .with_private_notes(
                        actor,
                        &key,
                        after.notes.as_deref(),
                        after.feelings.as_deref(),
                        cursor.map(|cursor| cursor.fence.as_ref()),
                        |page| {
                            encode_page(
                                &page,
                                state.game.language().map(AsRef::as_ref),
                                budget,
                                edit,
                            )
                        },
                    )?
                    .ok_or(WorldError::ProjectionChanged)?
            },
        )
        .await;
    match result {
        Ok(PlayerDisclosure::Published(bytes)) => json_response(StatusCode::OK, bytes),
        Ok(PlayerDisclosure::Changed) | Err(WorldError::ProjectionChanged) => refusal(
            StatusCode::CONFLICT,
            "notes-changed",
            "Private notes changed. Refresh notes to continue.",
        ),
        Ok(_) => busy(),
        Err(error) => failed(error),
    }
}

fn invalid_cursor() -> Response {
    refusal(
        StatusCode::BAD_REQUEST,
        "notes-page",
        "Refresh notes to read this page.",
    )
}

fn encode_page(
    page: &RuntimePrivateNotes<'_>,
    language: Option<&LanguageProvider>,
    budget: &ByteBudget,
    edit: Option<&EditOutcome>,
) -> Result<Bytes, WorldError> {
    #[derive(Serialize)]
    struct NotesResponse<'a> {
        ok: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<&'a str>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<&'a JsText>,
        mind: Mind<'a>,
    }
    let (accepted_text, _storage) = accepted_text(&page.files, language, budget)?;
    wire::encode(
        &NotesResponse {
            ok: true,
            code: edit.map(|outcome| outcome.code.as_str()),
            message: edit.map(|outcome| &outcome.message),
            mind: Mind {
                notes: page,
                accepted_text,
                documents: [],
                records: [],
                thoughts: [],
                continuity: Continuity {
                    cursor: continuation(page)?,
                    appraisals: &page.appraisals,
                },
            },
        },
        b"",
        b"",
        budget,
    )
    .map_err(WorldError::Wire)
}

fn continuation(page: &RuntimePrivateNotes<'_>) -> Result<Option<String>, StoreError> {
    (page.next_notes.is_some() || page.next_appraisals.is_some())
        .then(|| {
            json_record(&Cursor {
                fence: Cow::Borrowed(&page.fence),
                notes: page.next_notes.map(Cow::Borrowed),
                feelings: page.next_appraisals.map(Cow::Borrowed),
            })
        })
        .transpose()
        .map_err(|_| StoreError::InvalidRecord)
}

fn accepted_text(
    files: &[RuntimeMindFile<'_>],
    language: Option<&LanguageProvider>,
    budget: &ByteBudget,
) -> Result<(Option<JsText>, Option<ByteReservation>), WorldError> {
    if files.is_empty() {
        return Ok((None, None));
    }
    let units = files
        .iter()
        .try_fold(0usize, |total, file| {
            total
                .checked_add(file.text.units_len())?
                .checked_add(file.id.len())?
                .checked_add(8)
        })
        .ok_or(StoreError::Capacity)?;
    let limit = units
        .checked_mul(12)
        .and_then(|bytes| bytes.checked_add(4096))
        .ok_or(StoreError::Capacity)?;
    let storage = budget.reserve(limit).map_err(|_| StoreError::Capacity)?;
    let titles = files
        .iter()
        .map(|file| JsText::from(format!("{}.md", file.id)))
        .collect::<Vec<_>>();
    let order = if files.len() == 1 {
        vec![0]
    } else {
        language
            .ok_or(StoreError::InvalidRecord)?
            .collate(&titles)
            .map_err(WorldError::Language)?
            .0
    };
    let mut accepted = Vec::with_capacity(units);
    for (index, ordinal) in order.into_iter().enumerate() {
        if index > 0 {
            accepted.extend("\n\n".encode_utf16());
        }
        accepted.extend("# ".encode_utf16());
        accepted.extend(titles[ordinal as usize].units());
        accepted.push(u16::from(b'\n'));
        accepted.extend(files[ordinal as usize].text.units());
    }
    Ok((Some(JsText::from_units(accepted)), Some(storage)))
}
