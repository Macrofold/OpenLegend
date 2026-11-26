use super::*;
use crate::material_exposure::{ExposureLaw, MaterialPresence};

impl CoreMutation<'_> {
    /// Settle the elapsed material rate through the normal attribute writer.
    /// The inventory's wet subset follows the same rollback as the value.
    pub(crate) fn write_material_moisture(
        &mut self,
        item: EntityHandle,
        law: &ExposureLaw,
        moisture: f64,
    ) -> Result<(), ExecutionError> {
        let installed = self.state.installed.clone();
        let definition = installed
            .attributes
            .get(&law.moisture_attribute)
            .ok_or(ExecutionError::Invariant)?
            .value();
        let before = match self.state.inventory.exposure.contains(item) {
            MaterialPresence::Other => return Err(ExecutionError::Invariant),
            MaterialPresence::Dry => false,
            MaterialPresence::Wet => true,
        };
        let wet = moisture > 0.0;
        let entity = self
            .state
            .physical
            .entities
            .resolve(item)
            .ok_or(ExecutionError::Invariant)?;
        let _id = self.journal.budget.reserve(entity.id.len())?;
        let id = entity.id.clone();
        self.physical()
            .apply_ordinary_rate(&id, definition, moisture, false)?;
        if wet != before {
            // The ordinary attribute writer may have consumed the last slot.
            self.journal.physical.reserve(0)?;
            self.state.inventory.exposure.set_wet(item, wet);
            self.journal
                .physical
                .undo
                .push(Undo::MaterialWet { item, before });
        }
        Ok(())
    }

    /// Stamp only affected inventory roots with the pending acceptance cut.
    /// Later changes in this candidate reuse the stamp and its first inverse.
    pub(crate) fn change_material_details(
        &mut self,
        root: EntityHandle,
    ) -> Result<(), ExecutionError> {
        let entity = self
            .state
            .physical
            .entities
            .resolve(root)
            .ok_or(ExecutionError::Invariant)?;
        let before = self.state.inventory.material_detail_revision(&entity.id);
        let next = self
            .state
            .accepted_cut
            .checked_add(1)
            .ok_or(ExecutionError::Capacity)?;
        if before == next {
            return Ok(());
        }
        self.journal.physical.reserve(0)?;
        self.state
            .inventory
            .set_material_detail_revision(&entity.id, next)?;
        self.journal
            .physical
            .undo
            .push(Undo::MaterialDetails { root, before });
        Ok(())
    }
}
