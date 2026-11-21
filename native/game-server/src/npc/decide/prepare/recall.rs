//! Bounded personal recall discovery and disclosure before executable decisions.

use super::{
    Arc, ByteBudget, ByteReservation, CallFailure, CapacityError, CurrentRead, CurrentServer,
    PersonalSources, ProjectionPurpose, ReceivedFrame, RuntimeNpcRead, RuntimeNpcResponseTicket,
    Work, capacity, capture_origin, consumer, describe_experience, ensure_running, invalid, json,
    packet_failure, personal_description, personal_evidence, project, project_markers,
    read_request, wire_failure,
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
    pub(super) attention: OriginAttention,
    pub(super) sources: Option<PersonalSources>,
    pub(super) required: Vec<usize>,
    optional: Vec<usize>,
    pub(super) frame: ReceivedFrame,
    pub(super) through: u64,
    _selection: ByteReservation,
}

pub(super) struct OriginAttention {
    pub(super) ordinals: Vec<usize>,
    _storage: ByteReservation,
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
    let origin = original.decision_origin();
    let through = origin.accepted_cut;
    if through < work.accepted_cut || origin.actor_id != work.actor {
        return Err(CallFailure::Stale("decision-accepted-read-cut"));
    }
    let frame = origin.frame(budget).map_err(packet_failure)?;
    if work.source.is_empty() && work.job.job.player_speech_event_id.is_some() {
        return Err(CallFailure::Stale("decision-heard-source"));
    }
    let (ordinals, storage) = origin.attention_ordinals(budget).map_err(packet_failure)?;
    let attention = OriginAttention {
        ordinals,
        _storage: storage,
    };
    let scope = RecallScope {
        world: origin.world_id,
        generation: origin.generation,
        actor: &work.actor,
        at: origin.at,
        identity_through: origin.identity_through,
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
                .ok_or_else(|| capacity(CapacityError))?,
        )
        .map_err(capacity)?;
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
        let select = crate::wire::encode(&json!({"personal":selected.iter().map(|(reference, _)| json!({"reference":reference})).collect::<Vec<_>>(),"receipts":[]}), b"", b"", budget).map_err(wire_failure)?;
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
        let product = original
            .latest_sources_packet(budget)
            .map_err(packet_failure)?;
        let data = PersonalSources::read(&product, budget)?;
        let inventory = &data.value.inventory;
        for &index in &inventory.unavailable_personal {
            if selected.get(index).ok_or(CallFailure::Invalid)?.1 {
                return Err(CallFailure::Stale("decision-selected-account-withdrawn"));
            }
        }
        let personal = &inventory.personal;
        for (row, source) in personal.iter().enumerate() {
            if selected
                .get(source.selection)
                .ok_or(CallFailure::Invalid)?
                .1
            {
                required.push(row);
            } else {
                optional.push(row);
            }
        }
        // Complete recent experiences form the hard-query baseline before
        // relevance judgment. The index already supplied bounded candidates.
        let mut recent: Vec<_> = (0..personal.len())
            .filter_map(|row| {
                let source = &personal[row];
                let at = source.value.at.or(source.value.to)?;
                let id = source.reference.id.as_str();
                let is_direct_stimulus = work
                    .job
                    .job
                    .player_speech_event_id
                    .as_ref()
                    .is_some_and(|event| source.value.event_id.as_deref() == Some(event.as_str()));
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
        attention,
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
        let budget = game.host.budget();
        let request = read_request(work, consumer(work), budget)?;
        let fresh = game
            .world
            .capture_npc_recall(game.clone(), request)
            .await
            .map_err(|error| CallFailure::World(error).at("recall-current-context"))?;
        let facts = CurrentRead::read(
            &fresh.recall_packet(budget).map_err(packet_failure)?,
            budget,
        )?;
        let through = self.through.max(facts.value.own.accepted_cut);
        let projection_custody =
            self.projection_custody(&facts, &fresh, ProjectionPurpose::Recall, budget)?;
        let source_data = self.sources.as_ref().map(|data| &data.value);
        let mut ranked = Vec::new();
        let (mut binding, context, _, _) = project(
            game,
            work,
            (&fresh, &facts.value),
            &self.attention.ordinals,
            source_data,
            &self.required,
            ProjectionPurpose::Recall,
        )?;
        drop(facts);
        let rows = &source_data.ok_or(CallFailure::Invalid)?.inventory.personal;
        for &row in &self.optional {
            let source = rows.get(row).ok_or(CallFailure::Invalid)?;
            let (description, _) = personal_description(source)?;
            let experience = describe_experience(game, source, &description)?;
            let kind = if source.value.event_type.as_deref() == Some("speech") {
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
        let request = match game.cognition.recall_attention(
            context.fields.as_object().ok_or(CallFailure::Invalid)?,
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
        selection["evidence"] = personal_evidence(source_data, disclosed);
        let request_bytes =
            crate::wire::encode(&binding, b"", b"", budget).map_err(wire_failure)?;
        drop(binding);
        drop(ranked);
        drop(context);
        drop(projection_custody);
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
        fresh: &CurrentRead,
        read: &RuntimeNpcRead,
        purpose: ProjectionPurpose,
        budget: &ByteBudget,
    ) -> Result<ByteReservation, CallFailure> {
        // A selected ordinal produces two 24-byte aliases, a two-field JSON
        // object, and vector entries for the reference and presentation.
        // Cover their growth and alias generation apart from the origin read.
        let attention = self
            .attention
            .ordinals
            .len()
            .checked_mul(2048)
            .ok_or_else(|| capacity(CapacityError))?;
        // The detached scene owns labels, prose, aliases and a structured
        // record per selected body. Its custody is separate from the loan.
        let bodies = read
            .selected_body_ordinals()
            .map_err(packet_failure)?
            .iter()
            .try_fold(0usize, |bytes, &ordinal| {
                let body = read.presented_body(ordinal).ok_or(CallFailure::Invalid)?;
                let text = if matches!(purpose, ProjectionPurpose::Decision) {
                    let seen = body.observed.ok_or(CallFailure::Invalid)?.body;
                    [
                        body.name.name.storage_bytes(),
                        body.name.indefinite_article.as_ref().map_or(0, String::len),
                        seen.description
                            .as_ref()
                            .map_or(0, |text| text.storage_bytes()),
                    ]
                    .into_iter()
                    .chain(seen.outward.iter().map(String::len))
                    .try_fold(0usize, usize::checked_add)
                } else {
                    Some(0)
                };
                text.and_then(|text| text.checked_mul(12))
                    .and_then(|text| text.checked_add(2048))
                    .and_then(|text| bytes.checked_add(text))
                    .ok_or_else(|| capacity(CapacityError))
            })?;
        let bytes = fresh
            ._custody
            .bytes()
            .checked_add(attention)
            .and_then(|bytes| bytes.checked_add(bodies))
            .and_then(|n| {
                n.checked_add(
                    self.sources
                        .as_ref()
                        .map_or(0, |data| data._custody.bytes()),
                )
            })
            .and_then(|n| n.checked_add(32_768))
            .ok_or_else(|| capacity(CapacityError))?;
        budget.reserve(bytes).map_err(capacity)
    }
}
