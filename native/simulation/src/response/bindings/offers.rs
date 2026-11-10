//! Free literal grounding selects only commands from the actual native menu.
//! Rendered words cannot introduce a command or renew a physical body grant.
use super::*;
use crate::records::SqlCell;

pub(crate) struct ResponseAttemptCandidate {
    pub(crate) description: JsText,
    pub(crate) command: SqlCell,
}
pub(crate) fn capture_attempt_candidates(
    candidates: &crate::capture::PreparedNpcCandidates,
    actor: &str,
    decision: &str,
    budget: &ByteBudget,
) -> Result<(Vec<ResponseAttemptCandidate>, ByteReservation), ExecutionError> {
    let count = candidates
        .offers()
        .iter()
        .filter(|offer| offer.command.is_some())
        .count();
    let mut storage = budget.reserve(
        count
            .checked_mul(size_of::<ResponseAttemptCandidate>())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut index_storage =
        budget.reserve(map_storage::<String, ()>(count).ok_or(ExecutionError::Capacity)?)?;
    let mut seen = indexmap::IndexSet::with_capacity(count);
    let mut result = Vec::with_capacity(count);
    for offer in candidates.offers() {
        let Some(command) = &offer.command else {
            continue;
        };
        let description = offer
            .description
            .as_ref()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        let source = command.source_encoding();
        let _decode = budget.reserve(
            crate::experience::encoded_body_bound(source)?
                .checked_add(
                    (actor.len() + decision.len())
                        .checked_mul(12)
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut command: SqlCell =
            serde_json::from_str(source).map_err(|_| ExecutionError::Invariant)?;
        let SqlCell::Object(object) = &mut command else {
            return Err(ExecutionError::Invariant);
        };
        object.insert("actorId".into(), actor.into());
        object.insert("id".into(), decision.into());
        let length = crate::encoding::json_record_len(&(description, &command))
            .map_err(|_| ExecutionError::Invariant)?;
        let mut key_storage =
            budget.reserve(length.checked_mul(2).ok_or(ExecutionError::Capacity)?)?;
        let key = crate::encoding::json_record(&(description, &command))
            .map_err(|_| ExecutionError::Invariant)?;
        if !seen.contains(&key) {
            let growth = command
                .heap_bytes()
                .and_then(|n| n.checked_add(description.heap_bytes()?))
                .ok_or(ExecutionError::Capacity)?;
            storage.resize(
                storage
                    .bytes()
                    .checked_add(growth)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            result.push(ResponseAttemptCandidate {
                description: description.clone(),
                command,
            });
            key_storage.resize(key.capacity())?;
            index_storage.merge(key_storage)?;
            seen.insert(key);
        }
    }
    Ok((result, storage))
}
