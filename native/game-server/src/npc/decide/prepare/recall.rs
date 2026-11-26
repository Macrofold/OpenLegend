//! Bounded personal recall discovery and disclosure before executable decisions.

use super::{
    Arc, ByteBudget, ByteReservation, CallFailure, CapacityError, CurrentServer, PersonalSources,
    ProjectionPurpose, ReceivedFrame, RuntimeNpcRead, RuntimeNpcResponseTicket, Work, capacity,
    capture_origin, consumer, describe_experience, ensure_running, invalid, json, packet_failure,
    personal_description, personal_evidence, project,
};
use crate::{
    decision_dispatch::DecisionDispatch,
    decision_render::{BoundAttention, RenderError},
    npc::semantic_index::EmbeddingModel,
    store::{RecallScope, StoreError},
    world::{NpcBinding, WorldError},
};
mod semantic;
use openlegend_simulation::{
    capture::{NpcPersonalSelection, NpcSourceSelection},
    experience::PersonalSourceRef,
};
use std::{
    collections::{HashMap, HashSet},
    mem::size_of,
};

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
    dispatch: &Arc<DecisionDispatch>,
    embedding: Option<&EmbeddingModel>,
    work: &Work,
    stage_capture: bool,
) -> Result<Collected, CallFailure> {
    ensure_running(work)?;
    let budget = game.host.budget();
    let consumer = consumer(work);
    let mut original = capture_origin(
        game, work, consumer.as_str(), stage_capture && work.permit.is_some(),
    ).await?;
    let frame = original.take_origin_frame().map_err(packet_failure)?;
    let origin = original.decision_origin();
    let through = origin.accepted_cut;
    if through < work.accepted_cut || origin.actor_id != work.actor {
        return Err(CallFailure::Stale("decision-accepted-read-cut"));
    }
    if work.source.is_empty() && work.stimulus_event().is_some() {
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
    let mut references = match game.store.recall_references(scope).await {
        Err(StoreError::Capacity) => {
            ensure_running(work)?;
            game.store.required_recall_references(scope).await
        }
        result => result,
    }
    .map_err(|error| CallFailure::World(WorldError::Storage(error)))?;
    let mut semantic = match embedding.filter(|_| references.fills_direct_limit) {
        Some(model) => match semantic::rank(game, dispatch, model, work, &origin).await {
            Err(error)
                if matches!(error.cause().1, CallFailure::World(blocked)
                    if blocked.is_admission_refusal()
                        || matches!(blocked, WorldError::Storage(StoreError::Capacity))) =>
            {
                None
            }
            result => result?,
        },
        None => None,
    };
    // The optional attempt may fail at admission, body transfer or decoding.
    // Shed that work once and continue with the same exact origin and causes.
    let mut include_optional = semantic.is_some() || !references.optional.is_empty();
    let (source_data, required_count, selected_count, _selection) = loop {
        if !include_optional {
            semantic = None;
            references.discard_optional();
        }
        let ranked = semantic
            .as_ref()
            .map_or(&[][..], |(rows, _)| rows.as_slice());
        let selection = pick_sources(
            work.source.iter().chain(&references.required),
            ranked.iter().chain(&references.optional),
            budget,
        );
        let selection = match selection {
            Err(_) if include_optional => {
                include_optional = false;
                continue;
            }
            result => result.map_err(capacity)?,
        };
        let count = selection.request.personal.len();
        if count == 0 {
            break (None, 0, 0, selection.custody);
        }
        ensure_running(work)?;
        let has_optional = selection.required_count < count;
        original = if has_optional {
            match game
                .world
                .try_npc_sources_with_optional(
                    game.clone(), original, selection.request, selection.transfer,
                )
                .await
                .map_err(|error| CallFailure::World(error).at("original-sources"))?
            {
                Ok(read) => read,
                Err(read) => {
                    original = read;
                    include_optional = false;
                    continue;
                }
            }
        } else {
            game.world
                .select_npc_sources(game.clone(), original, selection.request, selection.transfer)
                .await
                .map_err(|error| CallFailure::World(error).at("original-sources"))?
        };
        match original.personal_sources(budget) {
            Err(error) if error.is_capacity() && has_optional => {
                original.discard_unissued_personal_sources().map_err(packet_failure)?;
                include_optional = false;
            }
            result => {
                break (
                    Some(result.map_err(packet_failure)?),
                    selection.required_count,
                    count,
                    selection.custody,
                );
            }
        }
    };
    let mut required = Vec::new();
    let mut optional = Vec::new();
    if let Some(data) = &source_data {
        for &index in &data.unavailable_personal {
            if index >= selected_count {
                return Err(CallFailure::Invalid);
            }
            if index < required_count {
                return Err(CallFailure::Stale("decision-selected-account-withdrawn"));
            }
        }
        let personal = &data.personal;
        for (row, source) in personal.iter().enumerate() {
            if source.selection >= selected_count {
                return Err(CallFailure::Invalid);
            }
            if source.selection < required_count {
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
                let is_direct_stimulus = work.stimulus_event()
                    .is_some_and(|event| source.value.event_id.as_deref() == Some(event));
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
    }
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

struct PersonalSelection {
    request: NpcSourceSelection,
    required_count: usize,
    custody: ByteReservation,
    transfer: ByteReservation,
}

fn pick_sources<'a>(
    required: impl Iterator<Item = &'a PersonalSourceRef> + Clone,
    optional: impl Iterator<Item = &'a PersonalSourceRef> + Clone,
    budget: &ByteBudget,
) -> Result<PersonalSelection, CapacityError> {
    let custody = budget.reserve(
        required
            .clone()
            .chain(optional.clone())
            .try_fold(1024_usize, |bytes, reference| {
                bytes
                    .checked_add(reference.id.len())?
                    .checked_add(reference.revision.len())?
                    .checked_add(768)
            })
            .ok_or(CapacityError)?,
    )?;
    let mut included = HashSet::new();
    let mut first = |reference: &&'a PersonalSourceRef| {
        included.insert((
            reference.kind,
            reference.id.as_str(),
            reference.revision.as_str(),
        ))
    };
    let mut selected: Vec<_> = required.filter(&mut first).collect();
    let required_count = selected.len();
    selected.extend(optional.filter(first).take(300));
    let transfer = budget.reserve(
        selected
            .iter()
            .try_fold(0_usize, |bytes, reference| {
                bytes
                    .checked_add(size_of::<NpcPersonalSelection>())?
                    .checked_add(reference.id.len())?
                    .checked_add(reference.revision.len())
            })
            .ok_or(CapacityError)?,
    )?;
    let request = NpcSourceSelection {
        personal: selected
            .into_iter()
            .map(|reference| NpcPersonalSelection {
                reference: reference.clone(),
                through: None,
            })
            .collect(),
        receipts: Vec::new(),
        consolidation_job: None,
    };
    Ok(PersonalSelection {
        request,
        required_count,
        custody,
        transfer,
    })
}

impl Collected {
    /// Retain the original disclosed rows and attention selection. No recall
    /// search or provider attention is performed during this continuation.
    pub(super) fn from_refused_choice(
        original: RuntimeNpcRead,
        selection: &openlegend_simulation::runtime::RuntimeNpcBindingRequest,
        frame: ReceivedFrame,
        budget: &ByteBudget,
    ) -> Result<Self, CallFailure> {
        let selected = selection.selected_personal();
        let sources = (!selected.is_empty())
            .then(|| original.personal_sources(budget).map_err(packet_failure))
            .transpose()?;
        if selected.iter().any(|row| {
            sources.as_ref().is_none_or(|sources| {
                row.inventory != sources.ordinal || row.ordinal >= sources.personal.len()
            })
        }) {
            return Err(CallFailure::Stale("native-choice-original-evidence"));
        }
        let attention = selection.selected_attention();
        let attention_bytes = attention
            .len()
            .checked_mul(size_of::<usize>())
            .ok_or_else(|| capacity(CapacityError))?;
        let body_bytes = selected
            .len()
            .checked_mul(size_of::<usize>())
            .ok_or_else(|| capacity(CapacityError))?;
        let attention = OriginAttention {
            _storage: budget.reserve(attention_bytes).map_err(capacity)?,
            ordinals: attention.iter().map(|row| row.ordinal).collect(),
        };
        let storage = budget.reserve(body_bytes).map_err(capacity)?;
        let required = selected.iter().map(|row| row.ordinal).collect();
        Ok(Self {
            through: original.accepted_cut(),
            original: Some(original),
            attention,
            sources,
            required,
            optional: Vec::new(),
            frame,
            _selection: storage,
        })
    }

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
        let mut fresh = game
            .world
            .capture_npc_recall(game.clone(), &work.actor, consumer(work).as_str(), true)
            .await
            .map_err(|error| CallFailure::World(error).at("recall-current-context"))?;
        let through = self.through.max(fresh.accepted_cut());
        let mut projection_custody =
            self.projection_custody(&fresh, ProjectionPurpose::Recall, budget)?;
        let source_data = self.sources.as_ref();
        let mut ranked = Vec::new();
        let (mut binding, context, _, _) = project(
            game,
            work,
            &fresh,
            &self.attention.ordinals,
            source_data,
            &self.required,
            ProjectionPurpose::Recall,
            None,
            None,
        )?;
        fresh.release_current_self();
        let rows = &source_data.ok_or(CallFailure::Invalid)?.personal;
        for &row in &self.optional {
            let source = rows.get(row).ok_or(CallFailure::Invalid)?;
            let (description, _) = personal_description(source)?;
            let experience = describe_experience(game, source, &description)?;
            let kind = if source.value.event_type.as_deref() == Some("speech") {
                "conversation"
            } else {
                "memory"
            };
            ranked.push(json!({"kind":kind,"text":description,"experience":[experience]}));
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
        binding.evidence = personal_evidence(source_data, disclosed)?;
        let binding_request = binding
            .fund(&mut projection_custody)
            .map_err(packet_failure)?;
        drop(ranked);
        drop(context);
        drop(projection_custody);
        let origin = work.automatic.as_ref().map(|trigger| trigger.read.clone());
        let binding = game
            .world
            .bind_npc_preserving_read(
                self.original.take().ok_or(CallFailure::Invalid)?,
                fresh,
                binding_request,
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
                self.original = Some(*original);
                return Ok(None);
            }
        };
        Ok(Some(RecallReview {
            request: Arc::new(request),
            ticket,
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
        read: &RuntimeNpcRead,
        purpose: ProjectionPurpose,
        budget: &ByteBudget,
    ) -> Result<ByteReservation, CallFailure> {
        // A selected ordinal produces two 24-byte aliases and several vector
        // entries for the reference, presented ordinal and owned selection.
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
        let self_facts = read.current_self().map_err(packet_failure)?;
        let own = self_facts.prompt().ok_or(CallFailure::Invalid)?;
        let offers = if matches!(purpose, ProjectionPurpose::Decision) {
            read.decision_offers()
                .map_err(packet_failure)?
                .try_fold(0usize, |bytes, offer| {
                    bytes.checked_add(1024)?.checked_add(
                        offer
                            .description
                            .map_or(0, |text| text.storage_bytes())
                            .checked_mul(8)?,
                    )
                })
                .ok_or_else(|| capacity(CapacityError))?
        } else {
            0
        };
        let notes = read
            .required_notes()
            .try_fold(0usize, |bytes, note| {
                let text = note
                    .label
                    .storage_bytes()
                    .checked_add(note.text.storage_bytes())?;
                bytes.checked_add(text.checked_mul(12)?)?.checked_add(1024)
            })
            .ok_or_else(|| capacity(CapacityError))?;
        let plans = [
            read.remaining_plan(false).map_err(packet_failure)?,
            read.remaining_plan(true).map_err(packet_failure)?,
        ]
        .into_iter()
        .flatten()
        .flatten()
        .try_fold(0usize, |bytes, view| {
            bytes
                .checked_add(view.name.storage_bytes().checked_mul(12)?)?
                .checked_add(32)
        })
        .ok_or_else(|| capacity(CapacityError))?;
        let presentation = if matches!(purpose, ProjectionPurpose::Decision) {
            let feelings = read.feelings().map_err(packet_failure)?;
            let activity = read.activity_facts().map_err(packet_failure)?;
            feelings
                .admitted_bytes()
                .checked_mul(12)
                .and_then(|bytes| bytes.checked_add(activity.admitted_bytes.checked_mul(12)?))
                .and_then(|bytes| bytes.checked_add(activity.choices.len().checked_mul(1024)?))
                .ok_or_else(|| capacity(CapacityError))?
        } else {
            0
        };
        let sources = self.sources.as_ref().map_or(0, |data| data.admitted_bytes());
        let bytes = presentation
            .checked_add(plans)
            .and_then(|bytes| bytes.checked_add(attention))
            .and_then(|bytes| bytes.checked_add(bodies))
            .and_then(|bytes| bytes.checked_add(offers))
            .and_then(|bytes| bytes.checked_add(notes))
            .and_then(|bytes| bytes.checked_add(own.projection_bytes()?))
            .and_then(|n| n.checked_add(sources))
            .and_then(|n| n.checked_add(32_768))
            .ok_or_else(|| capacity(CapacityError))?;
        budget.reserve(bytes).map_err(capacity)
    }
}
