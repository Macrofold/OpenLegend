//! Thinking records a personal interpretation through the ordinary bounded
//! memory owner. It grants no world event, target binding or physical effect.
use super::*;
use crate::execution::CoreMutation;
use crate::experience::{acquire_memory, prepare_memory_admission};
use crate::narration::{GrammaticalPerson, Narration, NarrationPart, PersonRole};
use crate::text::JsText;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Thought {
    pub text: JsText,
    pub about_entity_ids: Vec<String>,
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
            .and_then(|n| n.checked_add(actor.len() + 3 * size_of::<NarrationPart>() + 64))
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
    let summary = crate::narration::render_narration_parts(
        &narration,
        &IndexMap::new(),
        Some(actor),
        GrammaticalPerson::First,
    );
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
    let pending = prepare_memory_admission(core, actor, encoded, None, budget)?;
    let schema = installed.schema.clone();
    acquire_memory(core, pending, &schema)?;
    // Source accepts the thought even if optional autobiography was omitted by
    // its real quota; admission above still performs its actual ID/gap duties.
    result(true, budget)
}
