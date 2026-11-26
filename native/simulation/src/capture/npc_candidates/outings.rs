//! Both controllers receive the same choices from the actor's own agreement.
use super::*;
use crate::{commands::PlayerTravelIntent, simulation::SimulationState};

impl NpcCandidateCursor {
    pub(super) fn offer_outing_replies(
        &mut self,
        state: &SimulationState,
        actor: &str,
        preparation_id: &str,
    ) -> Result<(), ExecutionError> {
        let budget = self.budget.clone();
        crate::outings::view::visit_replies(
            state,
            actor,
            &budget,
            |key, label, companion, destination, intent| {
                let PlayerTravelIntent::Remedy {
                    invitation, mode, ..
                } = intent
                else {
                    return Err(ExecutionError::Invariant);
                };
                let (id, mut custody) = self.id(&[key, ":", invitation])?;
                let allowance = (preparation_id.len() + actor.len() + invitation.len() + 256)
                    .checked_mul(24)
                    .and_then(|v| v.checked_add(custody.bytes()))
                    .ok_or(ExecutionError::Capacity)?;
                custody.resize(allowance)?;
                let (command, _) = intent
                    .bind(preparation_id, actor, false)
                    .map_err(|_| ExecutionError::Invariant)?;
                let words = casting::text_bound([label, companion, destination])?;
                custody.resize(
                    custody
                        .bytes()
                        .checked_add(words + 32)
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                let mut description = label.clone();
                description.push_str(" (");
                description.push_text(companion);
                description.push_str(", ");
                description.push_text(destination);
                description.push_str(")");
                custody.resize(
                    id.capacity()
                        + command.heap_bytes().ok_or(ExecutionError::Capacity)?
                        + description.storage_bytes(),
                )?;
                self.append(PreparedNpcOffer {
                    description: Some(description),
                    id,
                    meaning: NpcOfferMeaning::OutingReply,
                    command: PreparedNpcInstruction::Command(command),
                    transition: match mode {
                        Some(crate::plans::PlanMode::Replace) => WorkTransitionMode::Replace,
                        _ => WorkTransitionMode::Continue,
                    },
                    temporary: None,
                    next_at: None,
                    _storage: custody,
                })
            },
        )
    }
}
