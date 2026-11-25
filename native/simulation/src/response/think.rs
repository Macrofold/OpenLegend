//! Thinking records a personal interpretation through the ordinary bounded
//! memory owner. It grants no world event, target binding or physical effect.
use super::*;
use crate::execution::CoreMutation;
use crate::experience::{
    LiteralRange, LiteralReference, LiteralReferences, acquire_memory, prepare_memory_admission,
};
use crate::narration::{NarratedAccount, Narration, NarrationPart, PersonRole};
use crate::text::JsText;

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
    subject_id: String,
    range: LiteralRange,
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
    #[serde(skip_serializing_if = "LiteralReferences::is_empty")]
    literal_references: LiteralReferences,
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
    let _render_guard = budget.reserve(
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
    let _annotation_space = (!thought.references.is_empty())
        .then(|| {
            budget
                .reserve(
                    thought
                        .references
                        .len()
                        .checked_mul(
                            2 * (size_of::<LiteralReference>()
                                + size_of::<crate::experience::LiteralBinding>())
                                + 4 * crate::values::MAX_RECORD_ID_UNITS,
                        )
                        .ok_or(ExecutionError::Capacity)?,
                )
                .map_err(ExecutionError::from)
        })
        .transpose()?;
    if !thought.references.is_empty() {
        use crate::reception::ObserverSubject;
        let units = thought.text.units_len();
        let prefix = summary
            .units_len()
            .checked_sub(units)
            .ok_or(ExecutionError::Invariant)?;
        let names = crate::worlds::InstalledPersonalNameReader::prepare(
            &core.state.physical,
            &core.state.reception,
            &core.state.installed,
            &core.state.experience,
            actor,
        )?;
        for mention in &thought.references {
            if mention.range.end > units
                || mention.range.start >= mention.range.end
                || !permitted.contains(&mention.subject_id)
            {
                return result(false, budget);
            }
            let subject = if mention.subject_id == actor {
                ObserverSubject::Entity {
                    entity_id: mention.subject_id.clone(),
                }
            } else {
                let Some(subject) = names.current_body_subject(&mention.subject_id)? else {
                    return result(false, budget);
                };
                subject
            };
            literal_references.bind(
                LiteralReference::Subject { subject },
                LiteralRange {
                    start: prefix + mention.range.start,
                    end: prefix + mention.range.end,
                },
            );
        }
        if literal_references.validate(&summary).is_err() {
            return result(false, budget);
        }
    }
    let draft = MemoryDraft {
        kind: "episode",
        source: &rule.source,
        summary,
        literal_references,
        entity_ids: &thought.about_entity_ids,
        importance: rule.importance,
        response_id,
    };
    let bytes = crate::encoding::json_record_len(&draft).map_err(|_| ExecutionError::Invariant)?;
    let _encoding_guard = budget.reserve(bytes.checked_mul(2).ok_or(ExecutionError::Capacity)?)?;
    let encoded = crate::encoding::json_record(&draft).map_err(|_| ExecutionError::Invariant)?;
    let pending = prepare_memory_admission(core, actor, encoded, None, budget)?;
    let schema = installed.schema.clone();
    acquire_memory(core, pending, &schema)?;
    // Source accepts the thought even if optional autobiography was omitted by
    // its real quota; admission above still performs its actual ID/gap duties.
    result(true, budget)
}
