//! Bounded personal recall discovery and disclosure before executable decisions.

use super::{
    Arc, ByteBudget, ByteReservation, CallFailure, CurrentServer, FundedJson, ReceivedFrame,
    RuntimeNpcRead, RuntimeNpcResponseTicket, Value, Work, capture, capture_offers, capture_origin,
    consumer, describe_experience, ensure_running, get_u64, invalid, json, personal_description,
    personal_evidence, project, project_markers, records, text,
};
use crate::{
    decision_render::{BoundAttention, RenderError},
    store::RecallScope,
    world::NpcBinding,
};
use openlegend_simulation::runtime::NativeWorldSession;
use std::collections::{HashMap, HashSet};

pub(in crate::npc::decide) struct Collected {
    pub(super) original: Option<RuntimeNpcRead>,
    pub(super) original_json: FundedJson,
    pub(super) sources: Option<FundedJson>,
    pub(super) required: Vec<usize>,
    optional: Vec<usize>,
    pub(super) frame: ReceivedFrame,
    pub(super) through: u64,
    _selection: ByteReservation,
}

pub(in crate::npc::decide) struct RecallReview {
    pub(in crate::npc::decide) request: Arc<BoundAttention>,
    pub(in crate::npc::decide) ticket: Arc<RuntimeNpcResponseTicket>,
    pub(in crate::npc::decide) through: u64,
}

pub(in crate::npc::decide) async fn collect(
    game: &Arc<CurrentServer>,
    work: &Work,
) -> Result<Collected, CallFailure> {
    ensure_running(work)?;
    let budget = game.host.budget();
    let consumer = consumer(work);
    let mut original = capture_origin(game, work, consumer).await?;
    let original_json = capture(&original, budget)?;
    let original_self = &original_json.value["self"];
    let through = get_u64(&original_self["acceptedCut"])?;
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
    if work.source.is_empty() && work.job.job.player_speech_event_id.is_some() {
        return Err(CallFailure::Stale("decision-heard-source"));
    }
    let history = &original_json.value["historyScope"];
    let scope = RecallScope {
        world: text(&history["worldId"])?,
        generation: text(&history["generation"])?,
        actor: &work.actor,
        at: history["at"].as_f64().ok_or(CallFailure::Invalid)?,
        identity_through: get_u64(&history["identityThrough"])?,
    };
    let references = game
        .store
        .recall_references(scope)
        .await
        .map_err(|error| CallFailure::World(crate::world::WorldError::Storage(error)))?;
    let mut selected = Vec::new();
    let mut included = HashSet::new();
    let _selection = budget
        .reserve(
            references
                .required
                .iter()
                .chain(&references.optional)
                .chain(&work.source)
                .try_fold(1024usize, |bytes, reference| {
                    bytes
                        .checked_add(reference.id.len())?
                        .checked_add(reference.revision.len())?
                        .checked_add(768)
                })
                .ok_or(CallFailure::Invalid)?,
        )
        .map_err(invalid)?;
    for (reference, required) in work
        .source
        .iter()
        .map(|reference| (reference, true))
        .chain(
            references
                .required
                .iter()
                .map(|reference| (reference, true)),
        )
        .chain(
            references
                .optional
                .iter()
                .map(|reference| (reference, false)),
        )
    {
        if included.insert((
            reference.kind,
            reference.id.as_str(),
            reference.revision.as_str(),
        )) {
            selected.push((reference, required));
        }
    }
    let mut required = Vec::new();
    let mut optional = Vec::new();
    let source_data = if selected.is_empty() {
        None
    } else {
        ensure_running(work)?;
        let select = crate::wire::encode(&json!({"personal":selected.iter().map(|(reference, _)| json!({"reference":reference})).collect::<Vec<_>>(),"receipts":[]}), b"", b"", budget).map_err(invalid)?;
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
        let inventory = &data.value["inventory"];
        for missing in records(&inventory["unavailablePersonal"])? {
            let index = usize::try_from(get_u64(missing)?).map_err(invalid)?;
            if selected.get(index).ok_or(CallFailure::Invalid)?.1 {
                return Err(CallFailure::Stale("decision-selected-account-withdrawn"));
            }
        }
        let personal = records(&inventory["personal"])?;
        for (row, source) in personal.iter().enumerate() {
            let index = usize::try_from(get_u64(&source["selection"])?).map_err(invalid)?;
            if selected.get(index).ok_or(CallFailure::Invalid)?.1 {
                required.push(row);
            } else {
                optional.push(row);
            }
        }
        // Complete recent experiences form the hard-query baseline before
        // relevance judgment. The index already supplied bounded candidates.
        let mut recent: Vec<_> = (0..personal.len())
            .filter_map(|row| {
                let (source, at) = personal.get(row).and_then(|source| {
                    let value = &source["value"];
                    value["at"]
                        .as_f64()
                        .or_else(|| value["to"].as_f64())
                        .map(|at| (source, at))
                })?;
                let id = source["reference"]["id"].as_str()?;
                let is_direct_stimulus = work
                    .job
                    .job
                    .player_speech_event_id
                    .as_ref()
                    .is_some_and(|event| source["value"]["eventId"] == event.as_str());
                (!is_direct_stimulus).then_some((row, at, id))
            })
            .collect();
        recent.sort_unstable_by(|a, b| b.1.total_cmp(&a.1).then_with(|| a.2.cmp(b.2)));
        let recent: HashSet<_> = recent
            .iter()
            .take(game.cognition.recent_recall)
            .map(|(row, _, _)| *row)
            .collect();
        optional.retain(|row| {
            if recent.contains(row) {
                required.push(*row);
                false
            } else {
                true
            }
        });
        Some(data)
    };
    Ok(Collected {
        original: Some(original),
        original_json,
        sources: source_data,
        required,
        optional,
        frame,
        through,
        _selection,
    })
}

impl Collected {
    /// Bind only the optional candidates that the size-limited judge actually
    /// receives. Native still owns their permission and acquired versions.
    pub(in crate::npc::decide) async fn review(
        &mut self,
        game: &Arc<CurrentServer>,
        work: &Work,
    ) -> Result<Option<RecallReview>, CallFailure> {
        if self.optional.is_empty() {
            return Ok(None);
        }
        let consumer = consumer(work);
        let budget = game.host.budget();
        let fresh = capture_offers(game, work, consumer, "recall-current-offers").await?;
        let facts = capture(&fresh, budget)?;
        let _custody = self.projection_custody(&facts, budget)?;
        let source_data = self.sources.as_ref().map(|data| &data.value);
        let mut ranked = Vec::new();
        let (mut binding, context, _, _) = project(
            game,
            work,
            &facts.value,
            &self.original_json.value,
            source_data,
            &self.required,
            consumer,
        )?;
        let fields = &context.fields;
        let rows = records(&source_data.ok_or(CallFailure::Invalid)?["inventory"]["personal"])?;
        for &row in &self.optional {
            let source = rows.get(row).ok_or(CallFailure::Invalid)?;
            let (description, _) = personal_description(source)?;
            let experience = describe_experience(game, source, &description)?;
            let kind = if source["value"]["eventType"] == "speech" {
                "conversation"
            } else {
                "memory"
            };
            let mut candidate = json!({"kind":kind,"text":description,"experience":[experience]});
            // Candidate prose grants no executable identity. The final
            // decision issues any usable aliases from its fresh capture.
            project_markers(&mut candidate, &HashMap::new(), &[]);
            ranked.push(candidate);
        }
        let state = json!({
            "stimulus":fields["stimulus"],
            "goal":fields["agency"]["goals"].as_array()
                .and_then(|goals| goals.first())
                .and_then(|goal| goal["objective"].as_str()).unwrap_or_default(),
            "includedContext":{
                "identity":fields["identity"],"notepad":fields["notepad"],
                "triggerFacts":fields["triggerFacts"],"now":fields["now"],
                "body":fields["body"],"agency":fields["agency"],
                "conversation":fields["conversation"],"recall":fields["recall"],
                "experience":fields["experience"],
            },
        });
        let request = match game.cognition.recall_attention(
            state.as_object().ok_or(CallFailure::Invalid)?,
            &ranked,
            budget,
        ) {
            Ok(request) => request,
            Err(RenderError::Capacity | RenderError::ContextLimit) => return Ok(None),
            Err(error) => return Err(invalid(error)),
        };
        let questions = request.questions.as_object().ok_or(CallFailure::Invalid)?;
        if questions.is_empty() {
            return Ok(None);
        }
        let disclosed = self.required.iter().copied().chain(
            self.optional
                .iter()
                .copied()
                .enumerate()
                .filter_map(|(index, row)| {
                    questions.contains_key(&format!("c{index}")).then_some(row)
                }),
        );
        let selection = &mut binding["selection"];
        selection["purpose"] = "recall".into();
        selection["validity"] = "prepared-response".into();
        selection["actions"] = json!([]);
        selection["evidence"] = personal_evidence(source_data, disclosed)?;
        let request_bytes = crate::wire::encode(&binding, b"", b"", budget).map_err(invalid)?;
        let through = self
            .through
            .max(get_u64(&facts.value["self"]["acceptedCut"])?);
        let origin = work.automatic.as_ref().map(|trigger| trigger.read.clone());
        let binding = game
            .world
            .bind_npc_preserving_read(
                self.original.take().ok_or(CallFailure::Invalid)?,
                fresh,
                request_bytes,
                origin,
            )
            .await
            .map_err(|error| CallFailure::World(error).at("recall-binding"))?;
        let ticket = match binding {
            NpcBinding::Issued(ticket) => ticket,
            NpcBinding::Refused { original, reason } => {
                if let Some(reason) = reason.stale_reason() {
                    return Err(CallFailure::Stale(reason).at("recall-binding"));
                }
                self.original = Some(original);
                return Ok(None);
            }
        };
        Ok(Some(RecallReview {
            request: Arc::new(request),
            ticket: Arc::new(ticket),
            through,
        }))
    }

    pub(in crate::npc::decide) fn accept_review(
        &mut self,
        ticket: Arc<RuntimeNpcResponseTicket>,
        includes: impl Fn(usize) -> bool,
    ) -> Result<(), CallFailure> {
        let original = Arc::try_unwrap(ticket).map_err(|_| CallFailure::Invalid)?;
        self.original = Some(original.into_recall_origin().map_err(invalid)?);
        self.required.extend(
            self.optional
                .iter()
                .copied()
                .enumerate()
                .filter_map(|(index, row)| includes(index).then_some(row)),
        );
        Ok(())
    }

    pub(super) fn projection_custody(
        &self,
        fresh: &FundedJson,
        budget: &ByteBudget,
    ) -> Result<ByteReservation, CallFailure> {
        let bytes = fresh
            ._custody
            .bytes()
            .checked_add(self.original_json._custody.bytes())
            .and_then(|n| {
                n.checked_add(
                    self.sources
                        .as_ref()
                        .map_or(0, |data| data._custody.bytes()),
                )
            })
            .and_then(|n| n.checked_add(32_768))
            .ok_or(CallFailure::Invalid)?;
        budget.reserve(bytes).map_err(invalid)
    }
}
