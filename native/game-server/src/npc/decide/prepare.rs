use super::{FundedJson, Work, ensure_running};
use crate::{
    boot::CurrentServer,
    decision_dispatch::CallFailure,
    decision_render::{BoundSchema, OfferedAction, PreparedPrompt, ResponseReferences},
};
use openlegend_simulation::{
    encoding::{json_record, sha256_hex},
    host::{ByteBudget, ByteReservation},
    narration::{NameArticle, name_phrase, native_text},
    runtime::{NativeWorldSession, RuntimeNpcRead, RuntimeNpcResponseTicket},
    state::Named,
};
use serde_json::{Value, json};
use std::{collections::HashMap, sync::Arc};

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
    refs: Vec<String>,
    physical: Vec<String>,
    attention: Vec<String>,
    speaks: bool,
    expressions: bool,
}

pub(super) struct NativeOffer {
    pub(super) id: String,
    pub(super) caption: String,
    pub(super) no_intervention: bool,
    pub(super) transition: String,
}

impl Projection {
    pub(super) fn render_response(
        &self,
        game: &CurrentServer,
        selected: &[&NativeOffer],
        include_actions: bool,
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
        let schema = game
            .cognition
            .response_schema(
                self.speaks,
                self.expressions,
                true,
                &ResponseReferences {
                    entity: &self.refs,
                    action: &aliases,
                    knowledge: &[],
                    identity: &[],
                    physical: &self.physical,
                    attention: &self.attention,
                    retention: &[],
                    appraisal: None,
                },
                budget,
            )
            .map_err(invalid)?;
        Ok((prompt, schema))
    }
}

pub(super) struct ReceivedFrame {
    pub(super) x: f64,
    pub(super) z: f64,
    pub(super) heading: f64,
    pub(super) support: Option<String>,
}

pub(super) async fn collect(
    game: &Arc<CurrentServer>,
    work: &Work,
) -> Result<Prepared, CallFailure> {
    ensure_running(work)?;
    let budget = game.host.budget();
    let consumer = if work.permit.is_some() {
        "chat"
    } else {
        "thought"
    };
    let request = crate::wire::encode(
        &json!({"actorId":work.actor,"requiredAppraisals":[],"consumer":consumer}),
        b"",
        b"",
        budget,
    )
    .map_err(invalid)?;
    let selector = crate::wire::encode(
        &json!({"expandedBodyOrdinals":[],"coverage":"suggestions"}),
        b"",
        b"",
        budget,
    )
    .map_err(invalid)?;
    let mut original = game
        .world
        .capture_npc_offers(game.clone(), request.clone(), selector.clone())
        .await
        .map_err(|error| CallFailure::World(error).at("original-offers"))?;
    let original_json = capture(&original, budget)?;
    let original_self = &original_json.value["self"];
    let mut through = get_u64(&original_self["acceptedCut"])?;
    if through < work.accepted_cut || original_self["actorId"] != work.actor {
        return Err(CallFailure::Stale("decision-accepted-read-cut"));
    }
    let frame = ReceivedFrame {
        x: original_self["position"]["x"]
            .as_f64()
            .ok_or(CallFailure::Invalid)?,
        z: original_self["position"]["z"]
            .as_f64()
            .ok_or(CallFailure::Invalid)?,
        heading: original_self["heading"]
            .as_f64()
            .ok_or(CallFailure::Invalid)?,
        support: original_self["supportSurfaceId"]
            .as_str()
            .map(str::to_owned),
    };
    let mut evidence = Vec::new();
    let source_data = if work.source.is_empty() {
        if work.job.job.player_speech_event_id.is_some() {
            return Err(CallFailure::Stale("decision-heard-source"));
        }
        None
    } else {
        ensure_running(work)?;
        let select = crate::wire::encode(&json!({"personal":work.source.iter().map(|reference| json!({"reference":reference})).collect::<Vec<_>>(),"receipts":[]}), b"", b"", budget).map_err(invalid)?;
        original = game
            .world
            .prepare_npc(
                game.clone(),
                original,
                select,
                NativeWorldSession::begin_npc_sources,
            )
            .await
            .map_err(|error| CallFailure::World(error).at("original-sources"))?;
        let product = original.latest_sources_packet(budget).map_err(invalid)?;
        let data = FundedJson::read(
            std::str::from_utf8(product.bytes()).map_err(invalid)?,
            budget,
        )?;
        let ordinal = get_u64(&data.value["ordinal"])?;
        let inventory = &data.value["inventory"];
        if !inventory["unavailablePersonal"]
            .as_array()
            .is_some_and(Vec::is_empty)
        {
            return Err(CallFailure::Stale("decision-selected-account-withdrawn"));
        }
        let selected = records(&inventory["personal"])?;
        evidence.extend(
            selected
                .iter()
                .enumerate()
                .map(|(row, _)| json!({"inventory":ordinal,"ordinal":row})),
        );
        Some(data)
    };
    ensure_running(work)?;
    let current = game
        .world
        .capture_npc_offers(game.clone(), request, selector)
        .await
        .map_err(|error| CallFailure::World(error).at("current-offers"))?;
    let captured = capture(&current, budget)?;
    through = through.max(get_u64(&captured.value["self"]["acceptedCut"])?);
    let bytes = captured
        ._custody
        .bytes()
        .checked_add(original_json._custody.bytes())
        .and_then(|n| n.checked_add(source_data.as_ref().map_or(0, |data| data._custody.bytes())))
        .and_then(|n| n.checked_add(32_768))
        .ok_or(CallFailure::Invalid)?;
    // The decoded capture continues to own its independent graph. Projection,
    // labels and selector records have their own allowance through binding.
    let projection = budget.reserve(bytes).map_err(invalid)?;
    let (binding, context, addressed, speech_trigger) = project(
        game,
        work,
        &captured.value,
        &original_json.value,
        source_data.as_ref().map(|data| &data.value),
        evidence,
        consumer,
    )?;
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
    let request = crate::wire::encode(&binding, b"", b"", budget).map_err(invalid)?;
    let origin = work.automatic.as_ref().map(|trigger| trigger.read.clone());
    let ticket = game
        .world
        .bind_npc(original, current, request, origin)
        .await
        .map_err(|error| CallFailure::World(error).at("response-binding"))?;
    Ok(Prepared {
        through,
        addressed,
        speech_trigger,
        route,
        context,
        ticket: Arc::new(ticket),
        frame,
        _projection: projection,
    })
}

fn capture(read: &RuntimeNpcRead, budget: &ByteBudget) -> Result<FundedJson, CallFailure> {
    let packet = read.packet(budget).map_err(invalid)?;
    FundedJson::read(
        std::str::from_utf8(packet.bytes()).map_err(invalid)?,
        budget,
    )
}

fn project(
    game: &CurrentServer,
    work: &Work,
    facts: &Value,
    original: &Value,
    selected: Option<&Value>,
    evidence: Vec<Value>,
    consumer: &str,
) -> Result<(Value, Projection, bool, bool), CallFailure> {
    let own = &facts["self"];
    let current_body = &facts["perception"];
    let choices = &facts["candidates"];
    let own_name = named(&own["observerName"], NameArticle::None)?;
    let reference_key = uuid::Uuid::new_v4().simple().to_string();
    let self_reference = alias(&reference_key, "myself", 0);
    let mut refs = vec![self_reference.clone()];
    let mut canonical = HashMap::from([(work.actor.as_str(), self_reference.clone())]);
    let mut physical = Vec::new();
    let mut entities = vec![json!({"alias":self_reference,"source":{"kind":"myself"}})];
    let mut descriptions = vec![format!("Myself: {own_name} (ID:{self_reference})")];
    let mut surroundings = Vec::new();
    let mut scene = Vec::new();
    let mut attention = Vec::new();
    let mut attention_aliases = Vec::new();
    let initial = &original["perception"]["npcCurrent"]["attention"];
    let mut presented = Vec::new();
    for (ordinal, presentation) in records(&initial["presentations"])?.iter().enumerate() {
        if records(&initial["entries"])?
            .iter()
            .any(|entry| entry["key"] == presentation["key"])
        {
            let id = alias(&reference_key, "attention", ordinal);
            attention_aliases.push(id.clone());
            attention.push(json!({"alias":id,"ordinal":ordinal}));
            presented.push(ordinal);
        }
    }
    for index in records(&choices["bodyOrdinals"])? {
        let ordinal = get_u64(index)? as usize;
        let body = current_body["bodies"]
            .get(ordinal)
            .ok_or(CallFailure::Invalid)?;
        let name = named(&body["name"], NameArticle::Definite)?;
        let key = alias(&reference_key, "body", ordinal);
        canonical.insert(text(&body["sourceId"])?, key.clone());
        refs.push(key.clone());
        physical.push(key.clone());
        entities.push(json!({"alias":key,"source":{"kind":"body","ordinal":ordinal}}));
        descriptions.push(format!("{name} (ID:{key})"));
        let (line, body) = received_body(own, current_body, body, &name, &key)?;
        surroundings.push(line);
        scene.push(body);
    }
    let mut source_entries = selected
        .and_then(|selected| selected["inventory"]["personal"].as_array())
        .into_iter()
        .flatten()
        .collect::<Vec<_>>();
    source_entries.sort_by(|a, b| {
        a["value"]["sequence"]
            .as_u64()
            .cmp(&b["value"]["sequence"].as_u64())
    });
    let target_event = work.job.job.player_speech_event_id.as_deref().or_else(|| {
        work.automatic
            .as_ref()
            .and_then(|trigger| trigger.evidence.as_deref())
    });
    let trigger = target_event.and_then(|event| {
        source_entries
            .iter()
            .find(|row| row["reference"]["id"] == event || row["value"]["eventId"] == event)
            .copied()
    });
    if target_event.is_some() && trigger.is_none() {
        return Err(CallFailure::Stale("decision-heard-source"));
    }
    let addressed = trigger.is_some_and(|row| row["value"]["triggerKind"] == "addressed_speech");
    let speech = trigger.is_some_and(|row| row["value"]["eventType"] == "speech");
    if consumer == "chat" && !addressed {
        return Err(CallFailure::Stale("decision-heard-addressing"));
    }
    let world = &game.view_policy().world;
    let now = own["at"].as_f64().ok_or(CallFailure::Invalid)?;
    let display_time = |seconds| game_time(seconds, world.offset_hours, world.day_label.as_deref());
    let mut experience = Vec::new();
    let mut conversation = Vec::new();
    let mut recall = Vec::new();
    for entry in source_entries {
        let value = &entry["value"];
        let (display, at) = personal_description(entry)?;
        let fact = json!({"text":display,"at":at,"eventType":value["eventType"],"acquisition":value["modality"],"observerRelationship":value["triggerKind"],"eventTime":display_time(at)});
        let line = format!("{display} ({})", display_time(at));
        if value["eventType"] == "speech" {
            conversation.push(line);
        } else {
            recall.push(line);
        }
        experience.push(fact);
    }
    let (stimulus, trigger_facts) = if let Some(trigger) = trigger {
        let value = &trigger["value"];
        let (display, at) = personal_description(trigger)?;
        let event_time = display_time(at);
        let speaker_visible = value["sourceBody"]["entityId"].as_str().is_some_and(|id| {
            current_body["bodies"].as_array().is_some_and(|bodies| {
                bodies.iter().any(|body| {
                    body["sourceId"] == id
                        && body["leaseId"] == value["sourceBody"]["leaseId"]
                        && body["physicalLife"] == value["sourceBody"]["physicalLife"]
                })
            })
        });
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
            json!({"experience":{"text":display,"at":at,"acquisition":value["modality"]},"eventTime":event_time,"ageGameSeconds":(now-at).max(0.0),"observerRelationship":value["triggerKind"],"speaker":value["speech"]["speaker"]["nameAtTime"].as_str().unwrap_or("Unknown speaker"),"addressing":value["speech"]["addressing"],"intendedRecipient":value["speech"]["addressee"]["nameAtTime"].as_str().unwrap_or("Unknown; no recipient identity perceived"),"sourceCurrentlyVisible":speaker_visible}),
        )
    } else {
        (
            work.job
                .job
                .request
                .text
                .as_unicode()
                .filter(|_| work.automatic.is_some())
                .unwrap_or("Situation change: Current perceived activity.")
                .to_owned(),
            json!({}),
        )
    };
    let actor_actions = records(&choices["offers"])?;
    let mut actions = Vec::new();
    let mut offers = Vec::new();
    for (ordinal, offer) in actor_actions.iter().enumerate() {
        let id = format!("a{ordinal}");
        let caption = text(&offer["description"])?;
        actions.push(json!({"alias":id,"ordinal":ordinal,"source":"current"}));
        offers.push(NativeOffer {
            id,
            caption: caption.to_owned(),
            no_intervention: offer["hasCommand"] == false,
            transition: text(&offer["transition"])?.to_owned(),
        });
    }
    let speaks = own["speech"].as_bool().ok_or(CallFailure::Invalid)?;
    let expressions = own["npc"]["expressions"]
        .as_bool()
        .ok_or(CallFailure::Invalid)?;
    let identity = identity(own, &own_name, &self_reference)?;
    let about = about_me(game, own)?;
    let body = body_text(own)?;
    let work_facts = agency(own, &choices["workContext"])?;
    let mut fields = json!({
        "identity":identity,"aboutMe":about,"body":body,"feelings":feelings(own,&facts["appraisals"] )?,
        "capabilities":{"speech":speaks,"expressions":expressions},"commitments":[],
        "stimulus":stimulus,"triggerFacts":trigger_facts,"conversation":conversation,
        "agency":work_facts,"currentSupport":own["supportSurfaceId"],"publicSurfaces":[],
        "now":display_time(now),"simTime":now,"recall":recall,"experience":experience,
        "surroundings":surroundings,"receivedSituation":{"measuredAt":now,"bodies":scene},
        "activityRequests":activity_requests(game,&choices["activity"],&canonical)?,
        "possessions":[],"notepad":own["knowledge"]["general"],
        "knowledge":[],"references":descriptions,"situationQueries":true,
    });
    project_markers(&mut fields, &canonical, &refs);
    let binding = json!({"decisionId":work.job.job.id,"selection":{
        "consumer":consumer,"purpose":"decision","validity":"decision","actions":actions,
        "prototypeSource":"current","perspectives":[],"semanticCauses":work.automatic.as_ref().map_or(&[][..],|trigger|trigger.causes.as_slice()),"intents":[],
        "evidence":evidence,"entities":entities,"identities":[],"knowledge":[],
        "observations":[],"current":[],"receipts":[],"attention":attention,"presented":presented,"appraisals":null,
    }});
    Ok((
        binding,
        Projection {
            fields,
            offers,
            refs,
            physical,
            attention: attention_aliases,
            speaks,
            expressions,
        },
        addressed,
        speech,
    ))
}

fn alias(key: &str, kind: &str, index: usize) -> String {
    // The per-request key stays private even if a caller repeats its own
    // command ID. An unseen native body cannot be guessed from an ordinal.
    let digest = sha256_hex(format!("{key}:{kind}:{index}").as_bytes());
    digest[..24].to_owned()
}

fn text(value: &Value) -> Result<&str, CallFailure> {
    value.as_str().ok_or(CallFailure::Invalid)
}
fn get_u64(value: &Value) -> Result<u64, CallFailure> {
    value.as_u64().ok_or(CallFailure::Invalid)
}
fn records(value: &Value) -> Result<&[Value], CallFailure> {
    value
        .as_array()
        .map(Vec::as_slice)
        .ok_or(CallFailure::Invalid)
}
fn invalid(_: impl std::fmt::Display) -> CallFailure {
    CallFailure::Invalid
}

fn named(value: &Value, article: NameArticle) -> Result<String, CallFailure> {
    let value: Named = serde_json::from_value(value.clone()).map_err(invalid)?;
    let phrase = name_phrase(&value, article, false);
    phrase
        .as_unicode()
        .map(str::to_owned)
        .ok_or(CallFailure::Invalid)
}

fn received_text(value: &Value) -> Result<String, CallFailure> {
    let source: openlegend_simulation::narration::NativeText =
        serde_json::from_value(value.get("content").unwrap_or(&value["text"]).clone())
            .map_err(invalid)?;
    native_text(&source)
        .as_unicode()
        .map(str::to_owned)
        .ok_or(CallFailure::Invalid)
}

fn personal_description(entry: &Value) -> Result<(String, f64), CallFailure> {
    let value = &entry["value"];
    let (description, date) = match entry["reference"]["kind"].as_str() {
        Some("awareness") => (received_text(value)?, &value["at"]),
        Some("memory") => (text(&value["summary"])?.to_owned(), &value["at"]),
        Some("summary") => (
            format!(
                "Summary of remembered experience: {}",
                text(&value["text"])?
            ),
            &value["to"],
        ),
        _ => return Err(CallFailure::Invalid),
    };
    Ok((description, date.as_f64().ok_or(CallFailure::Invalid)?))
}

fn identity(value: &Value, label: &str, token: &str) -> Result<String, CallFailure> {
    let identity = &value["identity"];
    let species = identity["species"].as_str().unwrap_or("unknown");
    let mut formatted = format!("I am {label} (ID:{token}). Species: {species}.");
    if let Some(traits) = identity["traits"]
        .as_array()
        .filter(|items| !items.is_empty())
    {
        formatted.push_str(" My traits: ");
        for (index, entry) in traits.iter().enumerate() {
            if index > 0 {
                formatted.push_str("; ");
            }
            formatted.push_str(text(&entry["name"])?);
            formatted.push_str(": ");
            formatted.push_str(text(&entry["description"])?);
        }
        formatted.push('.');
    }
    Ok(formatted)
}

fn about_me(game: &CurrentServer, value: &Value) -> Result<String, CallFailure> {
    let documents = records(&value["mind"]["documents"])?;
    let titles = documents
        .iter()
        .map(|doc| {
            Ok(openlegend_simulation::text::JsText::from(format!(
                "{}.md",
                text(&doc["id"])?
            )))
        })
        .collect::<Result<Vec<_>, CallFailure>>()?;
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
        result.push_str(text(&doc["id"])?);
        result.push_str(".md\n");
        result.push_str(text(&doc["text"])?);
    }
    Ok(result)
}

fn body_text(value: &Value) -> Result<String, CallFailure> {
    let mut parts = Vec::new();
    for attribute in records(&value["attributes"])? {
        let name = text(&attribute["name"])?;
        let show = |field: &str| -> Result<String, CallFailure> {
            if let Some(text) = attribute[field].as_str() {
                Ok(text.into())
            } else {
                json_record(&attribute[field]).map_err(invalid)
            }
        };
        let measurement = if attribute["status"] == "unknown" {
            format!("{name}: unknown.")
        } else if attribute["display"] == "meter" {
            let unit = attribute["unit"]
                .as_str()
                .map(|unit| format!(" {unit}"))
                .unwrap_or_default();
            format!(
                "{name}: {}{unit} (range {}–{}{unit}).",
                show("value")?,
                show("min")?,
                show("max")?
            )
        } else {
            format!("{name}: {}.", show("value")?)
        };
        parts.push(measurement);
        if let Some(condition) = attribute["condition"]
            .as_str()
            .or_else(|| attribute["concern"].as_str())
        {
            parts.push(condition.into());
        }
        if let Some(meaning) = attribute["meaning"].as_str() {
            parts.push(meaning.into());
        }
    }
    for status in records(&value["actionStatusLabels"])? {
        parts.push(format!("I am {}.", text(status)?.to_lowercase()));
    }
    parts.push(format!(
        "Current activity: {}.",
        value["action"]["type"].as_str().unwrap_or("idle")
    ));
    Ok(parts.join(" "))
}

fn agency(own: &Value, work: &Value) -> Result<Value, CallFailure> {
    let remaining = |value: &Value| -> Result<Value, CallFailure> {
        let Some(views) = value["views"].as_array() else {
            return Ok(Value::Null);
        };
        let mut parts = Vec::new();
        for view in views {
            if let Some(activity) = view["title"].as_str().or_else(|| view["label"].as_str()) {
                parts.push(activity);
            }
        }
        Ok(Value::String(parts.join("; ")))
    };
    let agency = &own["agency"];
    Ok(
        json!({"goals":agency["goals"],"plan":remaining(&work["plan"])?,"paused":remaining(&work["suspended"])?,"planRevision":agency["plan"]["revision"].as_u64().unwrap_or_default(),"attempts":agency["attempts"]}),
    )
}

fn received_body(
    own: &Value,
    perception: &Value,
    selected: &Value,
    name: &str,
    alias: &str,
) -> Result<(String, Value), CallFailure> {
    let start = usize::try_from(get_u64(&selected["first"])?).map_err(invalid)?;
    let count = usize::try_from(get_u64(&selected["count"])?).map_err(invalid)?;
    let end = start.checked_add(count).ok_or(CallFailure::Invalid)?;
    let all = records(&perception["cut"]["current"])?;
    let selected = all.get(start..end).ok_or(CallFailure::Invalid)?;
    let body = selected
        .iter()
        .find(|facet| facet["value"]["kind"] == "body")
        .ok_or(CallFailure::Invalid)?;
    let description = &body["value"]["body"];
    let position = &description["position"];
    let pose = &own["position"];
    let heading = own["heading"].as_f64().ok_or(CallFailure::Invalid)?;
    let difference =
        |key: &str| -> Option<f64> { Some(position[key].as_f64()? - pose[key].as_f64()?) };
    let relative = difference("x")
        .zip(difference("y"))
        .zip(difference("z"))
        .map(|((x, y), z)| {
            json!({
                "right": -heading.cos() * x + heading.sin() * z,
                "above": y,
                "forward": heading.sin() * x + heading.cos() * z,
            })
        });
    let mut line = format!(
        "I can see {name} (ID:{alias}). Physical form: measured at simulation second {}; received at {}.",
        body["valueMeasuredFrom"], body["valueAcquiredAt"]
    );
    if let Some(detail) = description["description"].as_str() {
        line.push_str(" Observed description: ");
        line.push_str(detail);
    }
    if let Some(outward) = description["outward"].as_array() {
        for detail in outward.iter().filter_map(Value::as_str) {
            line.push(' ');
            line.push_str(detail);
        }
    }
    Ok((
        line,
        json!({"reference": alias, "label": name, "relative": relative,
            "valueMeasuredFrom":body["valueMeasuredFrom"],"valueMeasuredThrough":body["valueMeasuredThrough"],
            "valueAcquiredAt":body["valueAcquiredAt"],"confirmedThrough":body["confirmedThrough"],
        }),
    ))
}

fn activity_requests(
    game: &CurrentServer,
    read: &Value,
    canonical: &HashMap<&str, String>,
) -> Result<Value, CallFailure> {
    let available = &read["available"];
    let choices = records(&available["choices"])?;
    let mut permitted = Vec::new();
    for choice in choices {
        let id = text(&choice["id"])?;
        let key = match choice["kind"].as_str() {
            Some("entity") => "entityId",
            Some("definition") => "definitionId",
            _ => return Err(CallFailure::Invalid),
        };
        let alias = if key == "entityId" {
            let Some(alias) = canonical.get(id) else {
                continue;
            };
            alias.as_str()
        } else {
            id
        };
        let mut formatted = choice.as_object().ok_or(CallFailure::Invalid)?.clone();
        formatted.shift_remove("id");
        formatted.insert(key.to_owned(), alias.into());
        permitted.push(Value::Object(formatted));
    }
    Ok(
        json!({"requests":game.cognition.requests,"choices":permitted,"warnings":available["warnings"]}),
    )
}

fn feelings(own: &Value, read: &Value) -> Result<String, CallFailure> {
    let values = records(&read["values"])?;
    let names = records(&read["names"])?;
    let mut lines = Vec::new();
    for value in values {
        let mut line = format!("I feel {}", text(&value["feeling"])?);
        if let Some(target) = value["targetId"].as_str()
            && let Some(name) = names.iter().find(|entry| entry["entityId"] == target)
        {
            line.push_str(" concerning ");
            if own["actorId"] == target {
                line.push_str("myself");
            } else {
                line.push_str(&named(&name["name"], NameArticle::Definite)?);
            }
        }
        if value["value"]["kind"] == "scaled" && value["scale"].is_object() {
            line.push_str(&format!(
                "; current intensity {} on the installed {}–{} scale",
                value["value"]["value"], value["scale"]["min"], value["scale"]["max"]
            ));
        }
        let duration = if let Some(decay) = value["decayPerHour"].as_f64() {
            format!("decays by {decay} per game hour without a new interpretation")
        } else {
            text(&value["lifetime"])?.to_owned()
        };
        line.push_str(&format!(
            ". Source: {}; lifetime: {duration}.",
            text(&value["coverage"])?
        ));
        lines.push(line);
    }
    Ok(lines.join(" "))
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

fn game_time(at: f64, offset: f64, day: Option<&str>) -> String {
    let minutes = (at / 60.0 + offset * 60.0).floor() as i64;
    let clock = minutes.rem_euclid(24 * 60);
    let wall = format!("{:02}:{:02}", clock / 60, clock % 60);
    let day_number = minutes.div_euclid(24 * 60) + 1;
    day.map_or_else(
        || format!("{day_number}, {wall}"),
        |label| format!("{label} {day_number}, {wall}"),
    )
}
