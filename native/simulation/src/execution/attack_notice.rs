//! The latest typed attack notice lives on the body that performed or received
//! it and carries only the occurrence.
use super::*;
use crate::state::{AttackModeNotice, AttackModeNoticeKind};

impl PhysicalMutation<'_> {
    /// Called only for an admitted offensive request or received attack
    /// occurrence. Reprocessing that occurrence leaves its sequence unchanged.
    pub(crate) fn note_attack_mode(
        &mut self,
        id: &str,
        occurrence: &str,
        kind: AttackModeNoticeKind,
    ) -> Result<(), ExecutionError> {
        let entity = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let before = self
            .state
            .entities
            .resolve(entity)
            .and_then(|entity| entity.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?
            .attack_mode_notice
            .as_ref();
        if before.is_some_and(|before| before.occurrence_id == occurrence) {
            return Ok(());
        }
        let notice_sequence = before
            .map_or(0, |before| before.notice_sequence)
            .checked_add(1)
            .filter(|sequence| *sequence <= MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Invariant)?;
        self.journal.reserve(
            heap_sum([
                2 * size_of::<Undo>(),
                occurrence.len(),
                before.map_or(0, |before| before.occurrence_id.capacity()),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let next = AttackModeNotice {
            notice_sequence,
            occurrence_id: occurrence.to_owned(),
            occurred_at: self.state.header.sim_time,
            kind,
        };
        let key = UndoKey::AttackModeNotice(entity.slot, entity.generation);
        let first = self.journal.first(&key)?;
        let before = self
            .state
            .entities
            .resolve_mut(entity)
            .and_then(|entity| entity.actor.as_mut())
            .ok_or(ExecutionError::Invariant)?
            .attack_mode_notice
            .replace(next);
        if first {
            self.journal
                .retain(key, Undo::AttackModeNotice { entity, before })?;
        }
        self.state
            .entities
            .settle_operational_memory(entity, &mut self.journal.reservation, false)
    }
}
