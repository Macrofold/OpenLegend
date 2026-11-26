//! Thinking records a personal interpretation through the ordinary bounded
//! memory owner. It grants no world event, target binding or physical effect.
use super::*;
use crate::capture::npc_thoughts::ThoughtOffer;
use crate::execution::CoreMutation;
use crate::experience::{
    LiteralRange, LiteralReference, LiteralReferences, PersonalSourceRef, acquire_memory,
    prepare_thought_admission,
};
use crate::narration::{NarratedAccount, Narration, NarrationPart, PersonRole};
use crate::reception::ObserverSubject;
use crate::text::JsText;
use indexmap::IndexSet;
use std::num::NonZeroUsize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Thought {
    pub text: JsText,
    pub about_entity_ids: Vec<String>,
    #[serde(default)]
    references: Vec<ThoughtReference>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ThoughtReference {
    subject_id: Option<ThoughtSubject>,
    passage: JsText,
    occurrence: Option<NonZeroUsize>,
}

#[derive(Deserialize)]
#[serde(untagged)]
enum ThoughtSubject {
    /// The response resolver writes this from the ticket's issued identity map.
    Identity(ObserverSubject),
    Entity(String),
}
pub(crate) struct CompletedThought {
    outcome: Outcome,
    storage: ByteReservation,
}
impl CompletedThought {
    pub(crate) fn into_parts(self) -> (Outcome, ByteReservation) {
        (self.outcome, self.storage)
    }
}
fn result(ok: bool, budget: &ByteBudget) -> Result<CompletedThought, ExecutionError> {
    let (code, message) = if ok {
        ("thought", "Private thought remembered.")
    } else {
        (
            "invalid-thought",
            "The proposed thought exceeds its limits or references unavailable entities.",
        )
    };
    let mut storage = budget.reserve(code.len() + message.len())?;
    let outcome = Outcome {
        ok,
        code: code.into(),
        message: message.into(),
        spent: None,
        outputs: None,
        recipe_id: None,
        item_id: None,
        entity_id: None,
        goal_id: None,
        plan_id: None,
        action_id: None,
    };
    storage.resize(outcome.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
    Ok(CompletedThought { outcome, storage })
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MemoryDraft<'a> {
    kind: &'static str,
    source: &'a str,
    summary: JsText,
    entity_ids: &'a [String],
    importance: f64,
    response_id: &'a str,
}
pub(crate) fn remember_thought(
    core: &mut CoreMutation<'_>,
    actor: &str,
    response_id: &str,
    thought: &Thought,
    permitted: &[String],
    offers: Option<&IndexMap<String, ThoughtOffer>>,
    budget: &ByteBudget,
) -> Result<CompletedThought, ExecutionError> {
    if !core
        .state
        .physical
        .entities
        .get(actor)
        .is_some_and(|e| e.has_memory())
        || thought.text.trim_is_empty()
        || thought.text.units_len() > 240
        || thought.about_entity_ids.len() > 8
        || thought
            .about_entity_ids
            .iter()
            .any(|id| !permitted.contains(id) || core.state.physical.entities.get(id).is_none())
    {
        return result(false, budget);
    }
    let installed = core.state.installed.clone();
    let rule = &installed.occurrence_rules.value().response.thought;
    let mut render_storage = budget.reserve(
        thought
            .text
            .heap_bytes()
            .and_then(|n| n.checked_add(rule.summary_prefix.len()))
            .and_then(|n| n.checked_mul(8))
            .and_then(|n| n.checked_add(actor.len() * 2 + 3 * size_of::<NarrationPart>() + 512))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut tail: JsText = rule.summary_prefix.as_str().into();
    tail.push_text(&thought.text);
    let narration = Narration {
        parts: vec![
            NarrationPart::Participant {
                entity_id: actor.into(),
                role: PersonRole::Subject,
                article: None,
            },
            NarrationPart::Literal(" ".into()),
            NarrationPart::Literal(tail),
        ],
    };
    // Only the actual observer is a participant; the shared grammar resolves
    // that pronoun before consulting any captured names.
    let NarratedAccount {
        text: summary,
        references: mut literal_references,
    } = crate::narration::render_self_account(&narration, &IndexMap::new(), actor);
    if !thought.references.is_empty() {
        let units = thought.text.units_len();
        let prefix = summary
            .units_len()
            .checked_sub(units)
            .ok_or(ExecutionError::Invariant)?;
        let mut annotation_space = budget.reserve(
            literal_references
                .storage_bytes()
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let names = thought
            .references
            .iter()
            .any(|mention| {
                matches!(&mention.subject_id, Some(ThoughtSubject::Entity(id))
                if id != actor && permitted.contains(id))
            })
            .then(|| {
                crate::worlds::InstalledPersonalNameReader::prepare(
                    &core.state.physical,
                    &core.state.reception,
                    &core.state.installed,
                    &core.state.experience,
                    actor,
                )
            })
            .transpose()?;
        let privacy = core
            .state
            .experience
            .actor(actor)
            .map(|owner| &owner.privacy);
        let annotation_limit =
            usize::try_from(installed.actor_response_limits.bytes).unwrap_or(usize::MAX);
        let mut attached = IndexSet::<&PersonalSourceRef>::new();
        let mut index_storage = budget.reserve(0)?;
        for mention in &thought.references {
            let Some(subject) = &mention.subject_id else {
                continue;
            };
            let words = &mention.passage;
            let Some(range) =
                LiteralRange::exact_occurrence(&thought.text, words, mention.occurrence)
                    .and_then(|range| range.shifted(prefix))
            else {
                continue;
            };
            let offer = match subject {
                ThoughtSubject::Entity(id) => offers.and_then(|offers| offers.get(id)),
                ThoughtSubject::Identity(_) => None,
            };
            if let Some(offer) = offer {
                let support = offer
                    .support
                    .as_ref()
                    .map_or(&[][..], |proof| &proof.sources);
                let direct = source_ref(&offer.reference);
                if privacy.is_some_and(|privacy| {
                    support
                        .iter()
                        .chain(direct)
                        .any(|source| !attached.contains(source) && privacy.revoked(&source.id))
                }) {
                    continue;
                }
                let quotation = match &offer.reference {
                    LiteralReference::Source {
                        quote: Some(original),
                        ..
                    } => {
                        let passage = offer.passage.as_ref().ok_or(ExecutionError::Invariant)?;
                        let Some(range) = LiteralRange::exact_occurrence(passage, words, None)
                            .and_then(|range| range.shifted(original.start))
                        else {
                            continue;
                        };
                        Some(range)
                    }
                    _ => None,
                };
                let mut new_support = support
                    .iter()
                    .filter(|source| Some(*source) != direct && !attached.contains(*source));
                let Some((count, bytes)) = offer.reference.heap_bytes().and_then(|bytes| {
                    new_support.try_fold((0usize, bytes), |(count, bytes), source| {
                        Some((
                            count.checked_add(1)?,
                            bytes.checked_add(source.heap_bytes()?)?,
                        ))
                    })
                }) else {
                    continue;
                };
                let old_bytes = annotation_space.bytes();
                let Some(next_bytes) = count
                    .checked_add(1)
                    .and_then(|entries| binding_bytes(entries, bytes))
                    .and_then(|bytes| old_bytes.checked_add(bytes))
                    .filter(|bytes| *bytes <= annotation_limit)
                else {
                    continue;
                };
                if annotation_space.resize(next_bytes).is_err() {
                    continue;
                }
                let index_entries = attached.len().checked_add(count).and_then(|len| {
                    len.checked_add(usize::from(
                        direct.is_some_and(|source| !attached.contains(source)),
                    ))
                });
                let Some(index_bound) = index_entries.and_then(|len| {
                    map_storage::<&PersonalSourceRef, ()>(
                        len.max(attached.capacity()).checked_mul(2)?,
                    )
                }) else {
                    annotation_space.resize(old_bytes)?;
                    continue;
                };
                if index_storage.bytes() < index_bound && index_storage.resize(index_bound).is_err()
                {
                    annotation_space.resize(old_bytes)?;
                    continue;
                }
                let mut reference = offer.reference.clone();
                if let (Some(range), LiteralReference::Source { quote, .. }) =
                    (quotation, &mut reference)
                {
                    *quote = Some(range);
                }
                for source in support {
                    if Some(source) != direct && attached.insert(source) {
                        // The original account may age out. Keep its exact
                        // withdrawal links here without retaining the body.
                        literal_references.bind(
                            LiteralReference::Source {
                                source: source.clone(),
                                quote: None,
                            },
                            range,
                        );
                    }
                }
                attached.extend(direct);
                literal_references.bind(reference, range);
                continue;
            }
            let subject = match subject {
                ThoughtSubject::Identity(subject) => {
                    reserve_binding(
                        &mut annotation_space,
                        subject.heap_bytes().ok_or(ExecutionError::Capacity)?,
                    )?;
                    subject.clone()
                }
                ThoughtSubject::Entity(id) if id == actor && permitted.contains(id) => {
                    reserve_binding(&mut annotation_space, id.len())?;
                    ObserverSubject::Entity {
                        entity_id: id.clone(),
                    }
                }
                ThoughtSubject::Entity(id) if permitted.contains(id) => {
                    let Some(subject) = names
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?
                        .current_body_subject(id)?
                    else {
                        continue;
                    };
                    reserve_binding(
                        &mut annotation_space,
                        subject.heap_bytes().ok_or(ExecutionError::Capacity)?,
                    )?;
                    subject
                }
                ThoughtSubject::Entity(_) => continue,
            };
            literal_references.bind(LiteralReference::Subject { subject }, range);
        }
        // This reservation remains through encoding and admission below.
        render_storage.merge(annotation_space)?;
    }
    let draft = MemoryDraft {
        kind: "episode",
        source: &rule.source,
        summary,
        entity_ids: &thought.about_entity_ids,
        importance: rule.importance,
        response_id,
    };
    let bytes = crate::encoding::json_record_len(&draft).map_err(|_| ExecutionError::Invariant)?;
    let _encoding_guard = budget.reserve(bytes.checked_mul(2).ok_or(ExecutionError::Capacity)?)?;
    let encoded = crate::encoding::json_record(&draft).map_err(|_| ExecutionError::Invariant)?;
    let pending = prepare_thought_admission(core, actor, encoded, &literal_references, budget)?;
    let schema = installed.schema.clone();
    acquire_memory(core, pending, &schema)?;
    // Source accepts the thought even if optional autobiography was omitted by
    // its real quota; admission above still performs its actual ID/gap duties.
    result(true, budget)
}

fn source_ref(reference: &LiteralReference) -> Option<&PersonalSourceRef> {
    match reference {
        LiteralReference::Source { source, .. } => Some(source),
        _ => None,
    }
}

fn binding_bytes(count: usize, bytes: usize) -> Option<usize> {
    let pair = size_of::<LiteralReference>() + size_of::<crate::experience::LiteralBinding>();
    count.checked_mul(2 * pair)?.checked_add(bytes)
}

fn reserve_binding(storage: &mut ByteReservation, bytes: usize) -> Result<(), ExecutionError> {
    let extra = binding_bytes(1, bytes).ok_or(ExecutionError::Capacity)?;
    storage.resize(
        storage
            .bytes()
            .checked_add(extra)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    Ok(())
}
