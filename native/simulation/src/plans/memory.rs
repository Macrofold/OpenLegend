//! Plan-control reports use the same real personal admission/receipt/account
//! owner as other memories; a plan retains only the returned evidence pointer.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::experience::{acquire_memory, prepare_memory_admission};
use crate::host::retained_size::HeapBytes;
use crate::narration::{GrammaticalPerson, Narration, NarrationPart, PersonRole};
use crate::text::JsText;
use std::mem::size_of;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PlanMemory<'a> {
    kind: &'static str,
    source: &'static str,
    importance: f64,
    entity_ids: [&'a str; 1],
    summary: JsText,
}

pub(super) fn append_report(
    core: &mut CoreMutation<'_>,
    actor: &str,
    summary: JsText,
    importance: f64,
) -> Result<Option<ResultEvidence>, ExecutionError> {
    if !core
        .state
        .physical
        .entities
        .get(actor)
        .is_some_and(|entity| entity.has_memory())
    {
        return Ok(None);
    }
    let budget = core.journal.byte_budget().clone();
    let draft = PlanMemory {
        kind: "episode",
        source: "internal",
        importance,
        entity_ids: [actor],
        summary,
    };
    let bytes = crate::encoding::json_record_len(&draft).map_err(|_| ExecutionError::Invariant)?;
    let _guard = budget.reserve(
        bytes
            .checked_mul(2)
            .and_then(|bytes| bytes.checked_add(size_of::<PlanMemory<'_>>()))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let body = crate::encoding::json_record(&draft).map_err(|_| ExecutionError::Invariant)?;
    let admission = prepare_memory_admission(core, actor, body, None, &budget)?;
    let schema = core.state.installed.schema.clone();
    let id = acquire_memory(core, admission, &schema)?;
    Ok(id.map(|id| ResultEvidence::Account {
        source: crate::activity::ResultAccountSource::Memory,
        id,
    }))
}

pub(super) fn personal_possessive(
    actor: &str,
    suffix: JsText,
    budget: &crate::host::ByteBudget,
) -> Result<(JsText, crate::host::ByteReservation), ExecutionError> {
    let bytes = suffix
        .heap_bytes()
        .and_then(|bytes| bytes.checked_mul(4))
        .and_then(|bytes| bytes.checked_add(actor.len() + 2 * size_of::<NarrationPart>() + 512))
        .ok_or(ExecutionError::Capacity)?;
    let guard = budget.reserve(bytes)?;
    // The only participant is this exact observer in possessive role. The
    // shared grammar returns the first-person pronoun before consulting names;
    // no other person's name, visibility or identity is supplied or guessed.
    let text = crate::narration::render_narration_parts(
        &Narration {
            parts: vec![
                NarrationPart::Participant {
                    entity_id: actor.into(),
                    role: PersonRole::Possessive,
                    article: None,
                },
                NarrationPart::Literal(suffix),
            ],
        },
        &IndexMap::new(),
        Some(actor),
        GrammaticalPerson::First,
    );
    Ok((text, guard))
}
