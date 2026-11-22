//! Fuel is owned by the physical root. A fuel-only write changes its saved
//! record. Extinguishing a fire also changes what witnesses can observe.
use super::*;

impl PhysicalMutation<'_> {
    pub(crate) fn burn_heat(
        &mut self,
        handle: EntityHandle,
        seconds: f64,
    ) -> Result<bool, ExecutionError> {
        let Some(entity) = self.state.entities.resolve(handle) else {
            return Ok(false);
        };
        let Some(before) = entity.heat else {
            return Ok(false);
        };
        let fuel_seconds = (before.fuel_seconds - seconds).max(0.0);
        let extinguished = before.lit && fuel_seconds == 0.0;
        if fuel_seconds == before.fuel_seconds && !extinguished {
            return Ok(false);
        }
        self.journal.reserve(
            size_of::<Undo>() * 2
                + if extinguished {
                    entity.id.len() * 2 + size_of::<PhysicalChange>() * 2
                } else {
                    0
                },
        )?;
        let key = UndoKey::Heat(handle.slot, handle.generation);
        if self.journal.first(&key)? {
            self.journal.retain(
                key,
                Undo::Heat {
                    entity: handle,
                    before,
                },
            )?;
        }
        if extinguished {
            self.journal.change(PhysicalChange::Behavior {
                entity_id: entity.id.clone(),
                outward_change: true,
            })?;
        }
        self.state
            .entities
            .resolve_mut(handle)
            .ok_or(ExecutionError::MissingEntity)?
            .heat = Some(crate::state::Heat {
            fuel_seconds,
            lit: before.lit && !extinguished,
        });
        Ok(extinguished)
    }
}
