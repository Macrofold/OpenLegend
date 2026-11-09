//! Privacy clears each existing notepad without manufacturing another knowledge
//! revision/notice. The outer invalidation coordinator owns that single change.
use super::*;
use crate::received::KnowledgeAccountChange;
pub(crate) fn revoke_knowledge_documents(
    core: &mut CoreMutation<'_>,
    actor: &str,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let count = core
        .state
        .reception
        .actor_knowledge
        .as_ref()
        .and_then(|root| root.get(actor))
        .map_or(0, IndexMap::len);
    for index in 0..count {
        let (key, entry) = core
            .state
            .reception
            .actor_knowledge
            .as_ref()
            .and_then(|root| root.get(actor))
            .and_then(|docs| docs.get_index(index))
            .ok_or(ExecutionError::Invariant)?;
        let storage = budget.reserve(
            entry
                .subject_id
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?
                .checked_add(key.len())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let next = KnowledgeDocument {
            origin: entry.origin.clone(),
            subject_id: entry.subject_id.clone(),
            text: "".into(),
            evidence_ids: Vec::new(),
            revision: entry
                .revision
                .checked_add(1)
                .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
                .ok_or(ExecutionError::Identity)?,
        };
        let key = key.clone();
        let charge = if entry.origin == KnowledgeOrigin::ActorEdit {
            Some(KnowledgeAccountChange {
                before_bytes: Some(
                    crate::encoding::json_record_len(&**entry)
                        .map_err(|_| ExecutionError::Invariant)? as u64,
                ),
                after_bytes: Some(
                    crate::encoding::json_record_len(&next)
                        .map_err(|_| ExecutionError::Invariant)? as u64,
                ),
                required: false,
                revocation: true,
            })
        } else {
            None
        };
        if let Some(charge) = charge {
            if !core.state.temporal.adjust_retained_knowledge(
                actor,
                charge,
                core.state.physical.header.sim_time,
                &core.state.installed.attention.value().retention,
            )? {
                return Err(ExecutionError::Invariant);
            }
        }
        core.journal.knowledge.replace(
            &mut core.state.reception.actor_knowledge,
            actor,
            key,
            next,
            storage,
        )?;
    }
    Ok(())
}
