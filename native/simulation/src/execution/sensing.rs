//! Sampling progress is saved only after selecting real observation work. A
//! deadline peek never mutates it. See docs/simulation-time.md.
use super::*;
use crate::reception::SensoryProgress;

fn bytes(progress: Option<&SensoryProgress>) -> usize {
    progress.map_or(0, |progress| {
        [&progress.routine_sight, &progress.incidental_contact]
            .into_iter()
            .flatten()
            .map(|sample| sample.definitions.capacity())
            .sum()
    })
}
impl PhysicalMutation<'_> {
    pub(crate) fn set_sensory_progress(
        &mut self,
        handle: EntityHandle,
        next: Option<SensoryProgress>,
    ) -> Result<(), ExecutionError> {
        let entity = self
            .state
            .entities
            .resolve(handle)
            .ok_or(ExecutionError::MissingEntity)?;
        if entity.sensory_progress == next {
            return Ok(());
        }
        self.journal.reserve(
            heap_sum([
                2 * size_of::<Undo>(),
                bytes(entity.sensory_progress.as_ref()),
                bytes(next.as_ref()),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let key = UndoKey::SensoryProgress(handle.slot, handle.generation);
        let first = self.journal.first(&key)?;
        let before = std::mem::replace(
            &mut self
                .state
                .entities
                .resolve_mut(handle)
                .ok_or(ExecutionError::Invariant)?
                .sensory_progress,
            next,
        );
        if first {
            self.journal.retain(
                key,
                Undo::SensoryProgress {
                    entity: handle,
                    before,
                },
            )?;
        }
        Ok(())
    }
}
