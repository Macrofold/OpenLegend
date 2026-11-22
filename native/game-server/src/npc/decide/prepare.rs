use super::{Work, ensure_running};
use crate::{
    boot::CurrentServer,
    decision_dispatch::CallFailure,
    decision_render::{BoundSchema, OfferedAction, PreparedPrompt, ResponseReferences},
    world::WorldError,
};
use openlegend_simulation::{
    activity::{RuntimeActivityDecisionPage, inspection_event},
    capture::{
        NpcActionOrdinal, NpcAliasOrdinal, NpcBindingPurpose as ProjectionPurpose,
        NpcCatalogueSource, NpcEntityAlias, NpcEntityOrdinal, NpcPersonalEvidence,
    },
    encoding::{json_record, sha256_hex},
    experience::{PersonalSourceKind, PersonalSourceRef},
    host::{ByteBudget, ByteReservation, CapacityError},
    narration::{NameArticle, name_phrase, native_text},
    reception::{AttributeDisplay, AttributeKnowledge, KnowledgeDocument},
    records::SqlCell,
    runtime::{
        NpcActivityFacts, RuntimeError, RuntimeNpcBindingInput, RuntimeNpcConsumer,
        RuntimeNpcFeelings, RuntimeNpcObservedBody, RuntimeNpcPersonalSource as PersonalSource,
        RuntimeNpcPersonalSources as PersonalSources, RuntimeNpcRead, RuntimeNpcResponseTicket,
        RuntimeNpcSelf, RuntimeNpcSelfPrompt,
    },
    state::Goal,
    text::JsText,
    values::AttributeValue,
};
use serde::Serialize;
use serde_json::{Value, json};
use std::{borrow::Cow, collections::HashMap, fmt::Write as _, sync::Arc};

mod recall;
pub(in crate::npc) mod reflection;
pub(super) use openlegend_simulation::runtime::RuntimeNpcDecisionFrame as ReceivedFrame;
pub(super) use recall::{Collected, RecallReview, collect};

pub(super) struct Prepared {
    pub(super) through: u64,
    pub(super) addressed: bool,
    pub(super) speech_trigger: bool,
    pub(super) route: PreparedPrompt,
    pub(super) context: Projection,
    pub(super) ticket: Arc<RuntimeNpcResponseTicket>,
    pub(super) frame: ReceivedFrame,
    _projection: ByteReservation,
}

pub(super) struct Projection {
    pub(super) fields: Value,
    pub(super) offers: Vec<NativeOffer>,
    reference_key: String,
    refs: Vec<String>,
    physical: Vec<String>,
    attention: Vec<String>,
    speaks: bool,
    expressions: bool,
    pub(super) preview_player: Option<String>,
}

pub(super) struct NativeOffer {
    pub(super) id: String,
    pub(super) caption: String,
    pub(super) no_intervention: bool,
    pub(super) transition: &'static str,
}

impl Projection {
    pub(super) fn reference_scope(&self) -> &str {
        &self.reference_key
    }

    pub(super) fn render_response(
        &self,
        game: &CurrentServer,
        selected: &[&NativeOffer],
        include_actions: bool,
        expansion: Option<&super::query::Answers<'_>>,
    ) -> Result<(PreparedPrompt, BoundSchema), CallFailure> {
        let budget = game.host.budget();
        let offered = selected
            .iter()
            .map(|offer| OfferedAction {
                id: &offer.id,
                description: &offer.caption,
            })
            .collect::<Vec<_>>();
        let aliases = selected
            .iter()
            .map(|offer| offer.id.clone())
            .collect::<Vec<_>>();
        let fields = self.fields.as_object().ok_or(CallFailure::Invalid)?;
        let prompt = game
            .cognition
            .prompt(fields, &offered, include_actions, budget)
            .map_err(invalid)?;
        let extended = expansion
            .filter(|answers| answers.added_references().next().is_some())
            .map(|answers| answers.extend_references(&self.refs, &self.physical, budget))
            .transpose()?;
        let (entity, physical) = extended.as_ref().map_or(
            (self.refs.as_slice(), self.physical.as_slice()),
            |([entity, physical], _)| (entity.as_slice(), physical.as_slice()),
        );
        let history = expansion
            .map(|answers| answers.retainable_history(budget))
            .transpose()?
            .flatten();
        let retention = history
            .as_ref()
            .map_or(&[][..], |(aliases, _)| aliases.as_slice());
        let schema = game
            .cognition
            .response_schema(
                self.speaks,
                self.expressions,
                fields
                    .get("situationQueries")
                    .and_then(Value::as_bool)
                    .unwrap_or(false),
                &ResponseReferences {
                    entity,
                    action: &aliases,
                    knowledge: &[],
                    identity: &[],
                    physical,
                    attention: &self.attention,
                    retention,
                    appraisal: None,
                },
                budget,
            )
            .map_err(invalid)?;
        Ok((prompt, schema))
    }
}

pub(super) async fn finish(
    game: &Arc<CurrentServer>,
    work: &Work,
    mut collected: Collected,
) -> Result<Prepared, CallFailure> {
    ensure_running(work)?;
    let budget = game.host.budget();
    let inspection = if let Some(trigger) = work.automatic.as_ref().and_then(|work| work.evidence.as_deref())
        && collected.sources.as_ref().is_some_and(|selected| {
            collected.required.iter().any(|&row| {
                selected.personal.get(row).is_some_and(|source| {
                    source.value.event_type.as_deref() == Some(inspection_event())
                        && (source.reference.id == trigger || source.value.event_id.as_deref() == Some(trigger))
                })
            })
        })
    {
        let (page, read) = game
            .world
            .decision_activity_inspection(&work.actor, trigger)
            .await
            .map_err(|error| CallFailure::World(error).at("activity-inspection"))?
            .ok_or(CallFailure::Stale("native-response-activity-inspection"))?;
        collected
            .original
            .as_mut()
            .ok_or(CallFailure::Invalid)?
            .retain_activity_inspection(read);
        Some(page)
    } else {
        None
    };
    let current = capture_offers(
        game,
        work,
        consumer(work).as_str(),
        inspection.as_ref().map(RuntimeActivityDecisionPage::navigation),
        "current-offers",
    ).await?;
    let through = collected.through.max(current.accepted_cut());
    // The projection has separate custody from the captured evidence it renders.
    let mut projection =
        collected.projection_custody(&current, ProjectionPurpose::Decision, budget)?;
    if let Some(page) = &inspection {
        projection.resize(
            page.admitted_bytes()
                .checked_mul(8)
                .and_then(|bytes| bytes.checked_add(projection.bytes() + 1024))
                .ok_or_else(|| capacity(CapacityError))?,
        ).map_err(capacity)?;
    }
    let (binding, mut context, addressed, speech_trigger) = project(
        game,
        work,
        &current,
        &collected.attention.ordinals,
        collected.sources.as_ref(),
        &collected.required,
        ProjectionPurpose::Decision,
    )?;
    if let Some(page) = inspection {
        finish_activity_fields(&mut context, page);
    }
    drop(collected.sources.take());
    drop(collected.attention);
    let route = game
        .cognition
        .prompt(
            context.fields.as_object().ok_or(CallFailure::Invalid)?,
            &[],
            false,
            budget,
        )
        .map_err(invalid)?;
    ensure_running(work)?;
    let request = binding.fund(&mut projection).map_err(packet_failure)?;
    let origin = work.automatic.as_ref().map(|trigger| trigger.read.clone());
    let ticket = game
        .world
        .bind_npc(
            collected.original.take().ok_or(CallFailure::Invalid)?,
            current,
            request,
            origin,
        )
        .await
        .map_err(binding_failure)?;
    Ok(Prepared {
        through,
        addressed,
        speech_trigger,
        route,
        context,
        ticket: Arc::new(ticket),
        frame: collected.frame,
        _projection: projection,
    })
}

fn finish_activity_fields(context: &mut Projection, page: RuntimeActivityDecisionPage) {
    context.fields["inspectedActions"] = json!(
        page.action_texts().map(prompt_text).collect::<Vec<_>>()
    );
    context.fields["inspectedMethods"] = json!(
        page.method_texts()
            .map(|(text, status)| format!("{}. {status}", prompt_text(text)))
            .collect::<Vec<_>>()
    );
}

pub(super) fn binding_failure(error: WorldError) -> CallFailure {
    if let WorldError::Simulation(inner) = &error
        && let Some(reason) = inner.stale_reason()
    {
        return CallFailure::Stale(reason).at("response-binding");
    }
    CallFailure::World(error).at("response-binding")
}

fn consumer(work: &Work) -> RuntimeNpcConsumer {
    if work.permit.is_some() {
        RuntimeNpcConsumer::Chat
    } else {
        RuntimeNpcConsumer::Thought
    }
}

async fn capture_offers(
    game: &Arc<CurrentServer>,
    work: &Work,
    consumer: &'static str,
    inspection: Option<openlegend_simulation::activity::ActivityInspectionNavigation>,
    stage: &'static str,
) -> Result<RuntimeNpcRead, CallFailure> {
    game.world
        .capture_npc_offers(game.clone(), &work.actor, consumer, inspection)
        .await
        .map_err(|error| CallFailure::World(error).at(stage))
}

/// Keep the original accepted perception and personal source lineage. This
/// path binds its executable choices and response prototypes from a later cut.
async fn capture_origin(
    game: &Arc<CurrentServer>,
    work: &Work,
    consumer: &'static str,
) -> Result<RuntimeNpcRead, CallFailure> {
    game.world
        .capture_npc_read(&work.actor, consumer)
        .await
        .map_err(|error| CallFailure::World(error).at("original-read"))
}

fn project(
    game: &CurrentServer,
    work: &Work,
    read: &RuntimeNpcRead,
    original_attention: &[usize],
    selected: Option<&PersonalSources>,
    rows: &[usize],
    purpose: ProjectionPurpose,
) -> Result<(RuntimeNpcBindingInput, Projection, bool, bool), CallFailure> {
    let consumer = consumer(work);
    let decision = matches!(purpose, ProjectionPurpose::Decision);
    let self_facts = read.current_self().map_err(packet_failure)?;
    let own = self_facts.prompt().ok_or(CallFailure::Invalid)?;
    let origin = read.decision_origin();
    let own_name = name_phrase(&own.observer_name, NameArticle::None, false);
    let own_name = prompt_text(&own_name);
    let reference_key = uuid::Uuid::new_v4().simple().to_string();
    let self_reference = alias(&reference_key, "myself", 0);
    let mut refs = vec![self_reference.clone()];
    let mut canonical = HashMap::from([(work.actor.as_str(), self_reference.clone())]);
    let mut physical = Vec::new();
    let mut entities = vec![NpcEntityAlias {
        alias: self_reference.clone(),
        source: NpcEntityOrdinal::Myself,
    }];
    let mut descriptions = Vec::new();
    if decision {
        descriptions.push(format!("Myself: {own_name} (ID:{self_reference})"));
    }
    let mut surroundings = Vec::new();
    let mut scene = Vec::new();
    let mut attention = Vec::new();
    let mut attention_aliases = Vec::new();
    let mut presented = Vec::new();
    for &ordinal in original_attention {
        let id = alias(&reference_key, "attention", ordinal);
        attention_aliases.push(id.clone());
        attention.push(NpcAliasOrdinal { alias: id, ordinal });
        presented.push(ordinal);
    }
    for &ordinal in read.selected_body_ordinals().map_err(packet_failure)? {
        let body = read.presented_body(ordinal).ok_or(CallFailure::Invalid)?;
        let key = alias(&reference_key, "body", ordinal);
        canonical.insert(body.source_id, key.clone());
        refs.push(key.clone());
        entities.push(NpcEntityAlias {
            alias: key.clone(),
            source: NpcEntityOrdinal::Body { ordinal },
        });
        if decision {
            let name = name_phrase(body.name, NameArticle::Definite, false);
            let name = prompt_text(&name);
            physical.push(key.clone());
            descriptions.push(format!("{name} (ID:{key})"));
            let observed = body.observed.ok_or(CallFailure::Invalid)?;
            let (line, body) = received_body(self_facts, observed, &name, &key);
            surroundings.push(line);
            scene.push(body);
        }
    }
    let mut source_entries = Vec::with_capacity(rows.len());
    if let Some(selected) = selected {
        for &row in rows {
            source_entries.push(selected.personal.get(row).ok_or(CallFailure::Invalid)?);
        }
    }
    source_entries.sort_by(|a, b| {
        personal_time(a)
            .total_cmp(&personal_time(b))
            .then_with(|| a.value.sequence.cmp(&b.value.sequence))
    });
    let target_event = work.job.job.player_speech_event_id.as_deref().or_else(|| {
        work.automatic
            .as_ref()
            .and_then(|trigger| trigger.evidence.as_deref())
    });
    let trigger_index = target_event.and_then(|event| {
        source_entries.iter().position(|row| {
            row.reference.id == event || row.value.event_id.as_deref() == Some(event)
        })
    });
    let trigger = trigger_index.map(|index| source_entries[index]);
    if target_event.is_some() && trigger.is_none() {
        return Err(CallFailure::Stale("decision-heard-source"));
    }
    let addressed =
        trigger.is_some_and(|row| row.value.trigger_kind.as_deref() == Some("addressed_speech"));
    let speech = trigger.is_some_and(|row| row.value.event_type.as_deref() == Some("speech"));
    let speech_trigger = decision
        && work
            .automatic
            .as_ref()
            .is_none_or(|trigger| trigger.causes.is_empty())
        && speech_only(&work.source, &source_entries);
    if consumer == RuntimeNpcConsumer::Chat && !addressed {
        return Err(CallFailure::Stale("decision-heard-addressing"));
    }
    let world = &game.view_policy().world;
    let now = origin.at;
    let display_time = |seconds| game_time(seconds, world.offset_hours, world.day_label.as_deref());
    let mut experience = Vec::new();
    let mut conversation = Vec::new();
    let mut recall = Vec::new();
    let mut rendered_trigger = None;
    for (index, entry) in source_entries.into_iter().enumerate() {
        let value = &entry.value;
        let (display, at) = personal_description(entry)?;
        let event_time = display_time(at);
        let fact = json!({"text":display,"at":at,"eventType":value.event_type,"acquisition":value.modality,"observerRelationship":value.trigger_kind,"eventTime":event_time});
        let line = format!("{display} ({event_time})");
        if value.event_type.as_deref() == Some("speech") {
            conversation.push(line);
        } else {
            recall.push(line);
        }
        experience.push(fact);
        if Some(index) == trigger_index {
            rendered_trigger = Some((entry, display, at, event_time));
        }
    }
    let (stimulus, trigger_facts) = if let Some((trigger, display, at, event_time)) =
        rendered_trigger
    {
        let value = &trigger.value;
        let speaker_visible = value
            .source_body
            .as_ref()
            .is_some_and(|source| read.source_body_is_current(source));
        let speaker = value
            .speech
            .as_ref()
            .and_then(|speech| speech.speaker.as_ref());
        let addressee = value
            .speech
            .as_ref()
            .and_then(|speech| speech.addressee.as_ref());
        (
            format!(
                "{}: {} ({event_time})",
                if addressed {
                    "Addressed speech (to me)"
                } else if speech {
                    "Nearby speech"
                } else {
                    "World change"
                },
                display
            ),
            json!({"experience":{"text":display,"at":at,"acquisition":value.modality},"eventTime":event_time,"ageGameSeconds":(now-at).max(0.0),"observerRelationship":value.trigger_kind,"speaker":speaker.map(|name| prompt_text(&name.name_at_time)).unwrap_or(Cow::Borrowed("Unknown speaker")),"addressing":value.speech.as_ref().and_then(|speech| speech.addressing),"intendedRecipient":addressee.map(|name| prompt_text(&name.name_at_time)).unwrap_or(Cow::Borrowed("Unknown; no recipient identity perceived")),"sourceCurrentlyVisible":speaker_visible}),
        )
    } else {
        (
            if work.automatic.is_some() {
                prompt_text(&work.job.job.request.text).into_owned()
            } else {
                "Situation change: Current perceived activity.".to_owned()
            },
            json!({}),
        )
    };
    let mut actions = Vec::new();
    let mut offers = Vec::new();
    let identity = identity(own, &own_name, &self_reference);
    let body = body_text(own)?;
    let work_facts = agency(own, read)?;
    let notepad = own
        .notepad
        .as_ref()
        .map(|document| {
            prompt_record(document, &document.text, |text| KnowledgeDocument {
                text,
                ..document.clone()
            })
        })
        .transpose()?;
    let (mut fields, speaks, expressions, preview_player) = if decision {
        for (ordinal, offer) in read.decision_offers().map_err(packet_failure)?.enumerate() {
            let id = format!("a{ordinal}");
            let caption = prompt_text(offer.description.ok_or(CallFailure::Invalid)?);
            actions.push(NpcActionOrdinal {
                alias: id.clone(),
                ordinal,
                source: NpcCatalogueSource::Current,
            });
            offers.push(NativeOffer {
                id,
                caption: caption.into_owned(),
                no_intervention: offer.no_intervention,
                transition: offer.transition,
            });
        }
        let speaks = own.speech;
        let expressions = own.expressions;
        let preview_player = work
            .permit
            .as_ref()
            .and_then(|(_, scope)| canonical.get(scope.scope.actor_id.as_str()).cloned());
        let fields = json!({
            "identity":identity,"aboutMe":about_me(game, own)?,"body":body,"feelings":feelings(read.feelings().map_err(packet_failure)?)?,
            "capabilities":{"speech":speaks,"expressions":expressions},"commitments":[],
            "stimulus":stimulus,"triggerFacts":trigger_facts,"conversation":conversation,
            "agency":work_facts,"currentSupport":self_facts.support,"publicSurfaces":[],
            "now":display_time(now),"simTime":now,"recall":recall,"experience":experience,
            "surroundings":surroundings,"receivedSituation":{"measuredAt":now,"bodies":scene},
            "activityRequests":activity_requests(game,read.activity_facts().map_err(packet_failure)?,&canonical)?,
            "possessions":[],"notepad":null,
            "knowledge":[],"references":descriptions,"situationQueries":true,
        });
        (fields, speaks, expressions, preview_player)
    } else {
        let goal = work_facts["goals"]
            .as_array()
            .and_then(|goals| goals.first())
            .and_then(|goal| goal["objective"].as_str())
            .unwrap_or_default();
        let fields = json!({
            "stimulus":stimulus,"goal":goal,
            "includedContext":{
                "identity":identity,"notepad":null,
                "triggerFacts":trigger_facts,"now":display_time(now),"body":body,
                "agency":work_facts,"conversation":conversation,"recall":recall,
                "experience":experience,
            },
        });
        (fields, false, false, None)
    };
    if let Some(notepad) = notepad {
        if decision {
            fields["notepad"] = notepad;
        } else {
            fields["includedContext"]["notepad"] = notepad;
        }
    }
    project_markers(&mut fields, &canonical, &refs);
    let evidence = if decision {
        personal_evidence(selected, rows.iter().copied())?
    } else {
        Vec::new()
    };
    let binding = RuntimeNpcBindingInput {
        decision_id: work.job.job.id.clone(),
        consumer,
        purpose,
        actions,
        semantic_causes: work
            .automatic
            .as_ref()
            .map_or_else(Vec::new, |trigger| trigger.causes.clone()),
        evidence,
        entities,
        attention,
        presented,
    };
    Ok((
        binding,
        Projection {
            fields,
            offers,
            reference_key,
            refs,
            physical,
            attention: attention_aliases,
            speaks,
            expressions,
            preview_player,
        },
        addressed,
        speech_trigger,
    ))
}

/// Only the exact causes of this decision determine the conversational
/// shortcut. Recalled context can contain unrelated physical events.
/// See docs/memory-architecture.md#every-semantic-decision-uses-an-event-or-intent-sentence.
fn speech_only(causes: &[PersonalSourceRef], entries: &[&PersonalSource]) -> bool {
    let mut heard = false;
    for cause in causes {
        if cause.kind != PersonalSourceKind::Awareness {
            return false;
        }
        let Some(row) = entries.iter().find(|row| &row.reference == cause) else {
            return false;
        };
        let value = &row.value;
        if value.speech.is_none() {
            return false;
        }
        heard |= value.event_type.as_deref() == Some("speech")
            && value.modality.as_deref() != Some("observed");
    }
    heard
}

fn personal_evidence(
    sources: Option<&PersonalSources>,
    rows: impl Iterator<Item = usize>,
) -> Result<Vec<NpcPersonalEvidence>, CallFailure> {
    rows.map(|ordinal| {
        Ok(NpcPersonalEvidence {
            inventory: sources.ok_or(CallFailure::Invalid)?.ordinal,
            ordinal,
        })
    })
    .collect()
}

fn describe_experience(
    game: &CurrentServer,
    entry: &PersonalSource,
    description: &str,
) -> Result<Value, CallFailure> {
    let value = &entry.value;
    let at = personal_time(entry);
    if !at.is_finite() {
        return Err(CallFailure::Invalid);
    }
    let world = &game.view_policy().world;
    Ok(
        json!({"text":description,"at":at,"eventType":value.event_type,
        "acquisition":value.modality,"observerRelationship":value.trigger_kind,
        "eventTime": game_time(at, world.offset_hours, world.day_label.as_deref())}),
    )
}

fn personal_time(entry: &PersonalSource) -> f64 {
    let at = if entry.reference.kind == PersonalSourceKind::Summary {
        entry.value.to
    } else {
        entry.value.at
    };
    at.unwrap_or(f64::NAN)
}

pub(super) fn alias(key: &str, kind: &str, index: usize) -> String {
    // The per-request key stays private even if a caller repeats its own
    // command ID. An unseen native body cannot be guessed from an ordinal.
    let digest = sha256_hex(format!("{key}:{kind}:{index}").as_bytes());
    digest[..24].to_owned()
}

fn invalid(_: impl std::fmt::Display) -> CallFailure {
    CallFailure::Invalid
}

fn capacity(error: CapacityError) -> CallFailure {
    packet_failure(error.into())
}

pub(super) fn packet_failure(error: RuntimeError) -> CallFailure {
    CallFailure::World(WorldError::Simulation(error)).at("context-preparation")
}

/// Prompts use UTF-8. Escape isolated UTF-16 units visibly, and distinguish
/// literal backslashes within that passage from these display escapes. The
/// original observation, evidence reference and authority stay in native.
pub(super) fn prompt_text(value: &JsText) -> Cow<'_, str> {
    if let Some(text) = value.as_unicode() {
        return Cow::Borrowed(text);
    }
    let mut rendered = String::new();
    for unit in char::decode_utf16(value.units()) {
        match unit {
            Ok('\\') => rendered.push_str("\\\\"),
            Ok(character) => rendered.push(character),
            Err(unit) => write!(rendered, "\\u{:04x}", unit.unpaired_surrogate())
                .expect("writing to String is infallible"),
        }
    }
    Cow::Owned(rendered)
}

/// Embed an existing record's prompt-safe prose without changing the schema
/// or the exact text retained by the native capture.
fn prompt_record<T: Serialize>(
    record: &T,
    text: &JsText,
    render: impl FnOnce(JsText) -> T,
) -> Result<Value, CallFailure> {
    match prompt_text(text) {
        Cow::Borrowed(_) => serde_json::to_value(record),
        Cow::Owned(display) => serde_json::to_value(render(display.into())),
    }
    .map_err(invalid)
}

fn personal_description(entry: &PersonalSource) -> Result<(String, f64), CallFailure> {
    let value = &entry.value;
    let date = personal_time(entry);
    if !date.is_finite() {
        return Err(CallFailure::Invalid);
    }
    let description = match entry.reference.kind {
        PersonalSourceKind::Awareness => {
            let source = value
                .content
                .as_ref()
                .or(value.text.as_ref())
                .ok_or(CallFailure::Invalid)?;
            prompt_text(&native_text(source)).into_owned()
        }
        PersonalSourceKind::Memory => {
            prompt_text(value.summary.as_ref().ok_or(CallFailure::Invalid)?).into_owned()
        }
        PersonalSourceKind::Summary => format!(
            "Summary of remembered experience: {}",
            prompt_text(&native_text(
                value.text.as_ref().ok_or(CallFailure::Invalid)?
            ))
        ),
    };
    Ok((description, date))
}

fn identity(identity: &RuntimeNpcSelfPrompt, label: &str, token: &str) -> String {
    let species = identity.species.as_deref().unwrap_or("unknown");
    let mut formatted = format!("I am {label} (ID:{token}). Species: {species}.");
    if !identity.traits.is_empty() {
        formatted.push_str(" My traits: ");
        for (index, entry) in identity.traits.iter().enumerate() {
            if index > 0 {
                formatted.push_str("; ");
            }
            formatted.push_str(&prompt_text(&entry.name));
            formatted.push_str(": ");
            formatted.push_str(&prompt_text(&entry.description));
        }
        formatted.push('.');
    }
    formatted
}

fn about_me(game: &CurrentServer, own: &RuntimeNpcSelfPrompt) -> Result<String, CallFailure> {
    let documents = &own.documents;
    let titles = documents
        .iter()
        .map(|doc| JsText::from(format!("{}.md", doc.id)))
        .collect::<Vec<_>>();
    let order = if titles.len() > 1 {
        game.language()
            .ok_or(CallFailure::Invalid)?
            .collate(&titles)
            .map_err(invalid)?
            .0
    } else {
        (0..titles.len() as u32).collect()
    };
    let mut result = String::new();
    for (index, ordinal) in order.into_iter().enumerate() {
        let doc = documents
            .get(ordinal as usize)
            .ok_or(CallFailure::Invalid)?;
        if index > 0 {
            result.push_str("\n\n");
        }
        result.push_str("# ");
        result.push_str(&doc.id);
        result.push_str(".md\n");
        result.push_str(&prompt_text(&doc.text));
    }
    Ok(result)
}

fn body_text(own: &RuntimeNpcSelfPrompt) -> Result<String, CallFailure> {
    let mut parts = Vec::new();
    for attribute in &own.attributes {
        let name = &attribute.name;
        let measurement = match attribute.status {
            AttributeKnowledge::Unknown => format!("{name}: unknown."),
            AttributeKnowledge::Known => {
                let value = match attribute.value.as_ref() {
                    Some(AttributeValue::Category(category)) => Cow::Borrowed(category.as_str()),
                    Some(AttributeValue::Number(number)) => {
                        Cow::Owned(json_record(&number).map_err(invalid)?)
                    }
                    None => Cow::Borrowed("null"),
                };
                match attribute.display {
                    AttributeDisplay::Meter => {
                        let unit = attribute
                            .unit
                            .as_ref()
                            .map(|unit| format!(" {unit}"))
                            .unwrap_or_default();
                        let min = json_record(&attribute.min).map_err(invalid)?;
                        let max = json_record(&attribute.max).map_err(invalid)?;
                        format!("{name}: {value}{unit} (range {min}–{max}{unit}).")
                    }
                    AttributeDisplay::Category => format!("{name}: {value}."),
                }
            }
        };
        parts.push(measurement);
        if let Some(condition) = attribute.concern.as_ref() {
            parts.push(prompt_text(condition).into_owned());
        }
        if let Some(meaning) = &attribute.meaning {
            parts.push(meaning.clone());
        }
    }
    for status in &own.action_status_labels {
        parts.push(format!("I am {}.", status.to_lowercase()));
    }
    parts.push(format!(
        "Current activity: {}.",
        own.action.as_deref().unwrap_or("idle")
    ));
    Ok(parts.join(" "))
}

fn agency(own: &RuntimeNpcSelfPrompt, read: &RuntimeNpcRead) -> Result<Value, CallFailure> {
    let remaining =
        |paused| {
            Ok::<_, CallFailure>(read.remaining_plan(paused).map_err(packet_failure)?.map(
                |views| {
                    let mut summary = String::new();
                    for (index, activity) in views.iter().enumerate() {
                        if index != 0 {
                            summary.push_str("; ");
                        }
                        summary.push_str(&prompt_text(&activity.name));
                    }
                    summary
                },
            ))
        };
    let goals = own
        .goals
        .iter()
        .map(|goal| {
            prompt_record(goal, &goal.objective, |objective| Goal {
                objective,
                ..goal.clone()
            })
        })
        .collect::<Result<Vec<_>, _>>()?;
    Ok(
        json!({"goals":goals,"plan":remaining(false)?,"paused":remaining(true)?,
        "planRevision":own.plan_revision,"attempts":pending_intentions(own)?}),
    )
}

/// Apply the permitted display conversion only to the outbound provider
/// fields. The captured intention still holds its exact text and binding.
fn pending_intentions(own: &RuntimeNpcSelfPrompt) -> Result<Vec<Value>, CallFailure> {
    own.intentions()
        .map(|intent| {
            let mut value = serde_json::Map::from_iter([
                ("id".into(), json!(intent.id)),
                ("description".into(), json!(prompt_text(intent.description))),
                ("normalized".into(), json!(prompt_text(intent.normalized))),
                ("targetEntityId".into(), json!(intent.target_entity_id)),
            ]);
            if let Some(slots) = intent.slots {
                value.insert("slots".into(), intention_prompt_value(slots)?);
            }
            value.insert("mode".into(), json!(intent.mode));
            value.insert("manifestRevision".into(), json!(intent.manifest_revision));
            value.insert("status".into(), json!(intent.status));
            if let Some(resolution) = intent.resolution {
                value.insert("resolution".into(), intention_prompt_value(resolution)?);
            }
            Ok(Value::Object(value))
        })
        .collect()
}

fn intention_prompt_value(value: &SqlCell) -> Result<Value, CallFailure> {
    Ok(match value {
        SqlCell::Null => Value::Null,
        SqlCell::Bool(value) => Value::Bool(*value),
        SqlCell::Number(value) => Value::Number(value.clone()),
        SqlCell::Text(value) => Value::String(prompt_text(value).into_owned()),
        SqlCell::Array(items) => Value::Array(
            items
                .iter()
                .map(intention_prompt_value)
                .collect::<Result<_, _>>()?,
        ),
        SqlCell::Object(fields) => Value::Object(
            fields
                .iter()
                .map(|(key, value)| intention_prompt_value(value).map(|value| (key.clone(), value)))
                .collect::<Result<_, _>>()?,
        ),
        // Admitted pending intentions and their slots/resolution use closed
        // field names. A prose conversion must never change a member identity.
        SqlCell::ExactObject(_) => return Err(CallFailure::Invalid),
    })
}

#[derive(Serialize)]
pub(super) struct RelativeBody {
    right: f64,
    above: f64,
    forward: f64,
}

pub(super) fn relative_body(
    origin: openlegend_simulation::state::Point,
    heading: f64,
    point: openlegend_simulation::state::Point,
) -> RelativeBody {
    let x = point.x - origin.x;
    let z = point.z - origin.z;
    let (sin, cos) = heading.sin_cos();
    RelativeBody {
        right: -cos * x + sin * z,
        above: point.y - origin.y,
        forward: sin * x + cos * z,
    }
}

fn received_body(
    own: &RuntimeNpcSelf,
    facet: RuntimeNpcObservedBody<'_>,
    name: &str,
    alias: &str,
) -> (String, Value) {
    let body = facet.body;
    let relative = relative_body(own.position, own.heading, body.position);
    let mut line = format!(
        "I can see {name} (ID:{alias}). Physical form: measured at simulation second {}; received at {}.",
        facet.value_measured_from, facet.value_acquired_at,
    );
    if let Some(detail) = &body.description {
        line.push_str(" Observed description: ");
        line.push_str(&prompt_text(detail));
    }
    for detail in &body.outward {
        line.push(' ');
        line.push_str(detail);
    }
    (
        line,
        json!({"reference": alias, "label": name, "relative": relative,
            "valueMeasuredFrom":facet.value_measured_from,"valueMeasuredThrough":facet.value_measured_through,
            "valueAcquiredAt":facet.value_acquired_at,"confirmedThrough":facet.confirmed_through,
        }),
    )
}

fn activity_requests(
    game: &CurrentServer,
    read: NpcActivityFacts<'_>,
    canonical: &HashMap<&str, String>,
) -> Result<Value, CallFailure> {
    let mut permitted = Vec::with_capacity(read.choices.len());
    for choice in read.choices {
        let (key, reference) = match choice.kind {
            "entity" => {
                let Some(alias) = canonical.get(choice.id.as_str()) else {
                    continue;
                };
                ("entityId", alias.as_str())
            }
            "definition" => ("definitionId", choice.id.as_str()),
            _ => return Err(CallFailure::Invalid),
        };
        let mut formatted = serde_json::Map::from_iter([
            ("label".into(), json!(prompt_text(&choice.label))),
            ("kind".into(), json!(choice.kind)),
            ("roles".into(), json!(choice.roles)),
            ("requestIds".into(), json!(choice.request_ids)),
        ]);
        if let Some(distance) = choice.distance {
            formatted.insert("distance".into(), json!(distance));
        }
        formatted.insert("accessible".into(), json!(choice.accessible));
        formatted.insert(key.to_owned(), json!(reference));
        permitted.push(Value::Object(formatted));
    }
    let warnings: Vec<_> = read.warnings.iter().map(prompt_text).collect();
    Ok(json!({"requests":game.cognition.requests,"choices":permitted,"warnings":warnings}))
}

fn feelings(read: &RuntimeNpcFeelings) -> Result<String, CallFailure> {
    let mut summary = String::new();
    for feeling in &read.values {
        if !summary.is_empty() {
            summary.push(' ');
        }
        write!(summary, "I feel {}", feeling.feeling).map_err(invalid)?;
        if let Some(index) = feeling.concerning {
            let target = read.targets.get(index).ok_or(CallFailure::Invalid)?;
            summary.push_str(" concerning ");
            if target.myself {
                summary.push_str("myself");
            } else {
                let phrase = name_phrase(&target.name, NameArticle::Definite, false);
                summary.push_str(&prompt_text(&phrase));
            }
        }
        if let Some((value, min, max)) = feeling.intensity {
            let number = |value| serde_json::Number::from_f64(value).ok_or(CallFailure::Invalid);
            write!(
                summary,
                "; current intensity {} on the installed {}–{} scale",
                number(value)?,
                number(min)?,
                number(max)?
            )
            .map_err(invalid)?;
        }
        write!(summary, ". Source: {}; lifetime: ", feeling.coverage).map_err(invalid)?;
        if let Some(decay) = feeling.decay_per_hour {
            write!(
                summary,
                "decays by {decay} per game hour without a new interpretation"
            )
            .map_err(invalid)?;
        } else {
            summary.push_str(feeling.lifetime);
        }
        summary.push('.');
    }
    Ok(summary)
}

fn project_markers(value: &mut Value, canonical: &HashMap<&str, String>, issued: &[String]) {
    match value {
        Value::String(value) if value.contains("(ID:") => {
            let mut result = String::new();
            let mut rest = value.as_str();
            while let Some((prefix, tail)) = rest.split_once("(ID:") {
                let Some((id, next)) = tail.split_once(')') else {
                    break;
                };
                result.push_str(prefix);
                if id.is_empty() || id.contains('(') || id.chars().any(char::is_whitespace) {
                    result.push_str("(ID:");
                    result.push_str(id);
                    result.push(')');
                } else if let Some(reference) = canonical
                    .get(id)
                    .map(String::as_str)
                    .or_else(|| issued.iter().any(|reference| reference == id).then_some(id))
                {
                    result.push_str("(ID:");
                    result.push_str(reference);
                    result.push(')');
                } else {
                    result.push_str("(unrecognized identity)");
                }
                rest = next;
            }
            result.push_str(rest);
            *value = result;
        }
        Value::Object(fields) => fields
            .values_mut()
            .for_each(|value| project_markers(value, canonical, issued)),
        Value::Array(items) => items
            .iter_mut()
            .for_each(|value| project_markers(value, canonical, issued)),
        _ => {}
    }
}

pub(in crate::npc) fn game_time(at: f64, offset: f64, day: Option<&str>) -> String {
    let minutes = (at / 60.0 + offset * 60.0).floor() as i64;
    let clock = minutes.rem_euclid(24 * 60);
    let wall = format!("{:02}:{:02}", clock / 60, clock % 60);
    let day_number = minutes.div_euclid(24 * 60) + 1;
    day.map_or_else(
        || format!("{day_number}, {wall}"),
        |label| format!("{label} {day_number}, {wall}"),
    )
}
