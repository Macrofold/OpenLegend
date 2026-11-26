use super::*;
use crate::native_response::ForagingWorkKind;

impl PhysicalMutation<'_> {
    /// Charge actual movement to the one bounded pack activity whose action
    /// still owns the body. Waiting, blocked movement and alarm routes add no distance.
    pub(super) fn record_foraging_travel(
        &mut self,
        actor: &str,
        travelled: f64,
    ) -> Result<(), ExecutionError> {
        if travelled <= 0.0 {
            return Ok(());
        }
        let entity = self
            .state
            .entities
            .get(actor)
            .ok_or(ExecutionError::MissingEntity)?;
        let action = entity
            .actor
            .as_ref()
            .and_then(|actor| actor.action.as_ref());
        let pack_work = entity
            .animal
            .as_ref()
            .and_then(|animal| animal.foraging.as_ref())
            .and_then(|state| state.work.as_ref())
            .is_some_and(|work| {
                matches!(
                    work.kind,
                    ForagingWorkKind::Regroup | ForagingWorkKind::Hunt
                ) && action.is_some_and(|action| work.action_id == action.id)
            });
        if !pack_work {
            return Ok(());
        }
        let Some(Placement::World {
            support_surface_id: Some(surface),
            ..
        }) = &entity.placement
        else {
            return Err(ExecutionError::InvalidPosition);
        };
        let growth = surface.len();
        let _held = self.journal.budget.reserve(growth)?;
        let position = entity
            .supported_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        self.change_foraging(actor, growth, |state| {
            if let Some(work) = state.work.as_mut() {
                work.travelled_metres += travelled;
                work.last_point = position;
            }
        })
    }
}
