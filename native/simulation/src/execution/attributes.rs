//! Before-images belong to each actual sparse attribute, independently of the
//! status episode whose current conditional rates happen to write it.

use super::*;

impl PhysicalMutation<'_> {
    pub(super) fn snapshot_attribute(
        &mut self,
        entity: EntityHandle,
        id: &str,
    ) -> Result<(), ExecutionError> {
        self.journal.reserve(id.len())?;
        let key = UndoKey::Attribute(entity.slot, entity.generation, id.to_owned());
        if !self.journal.first(&key)? {
            return Ok(());
        }
        let entity_value = self
            .state
            .entities
            .resolve(entity)
            .ok_or(ExecutionError::MissingEntity)?;
        let attributes = if let Some(actor) = &entity_value.actor {
            actor.attributes.as_ref()
        } else {
            entity_value.attributes.as_ref()
        }
        .ok_or(ExecutionError::Invariant)?;
        let before = attributes.get(id).ok_or(ValueError::MissingAttribute)?;
        let payload = match &before.value {
            crate::values::AttributeValue::Number(_) => 0,
            crate::values::AttributeValue::Category(value) => value.capacity(),
        };
        self.journal
            .reserve(size_of::<Undo>() * 2 + id.len() + payload)?;
        self.journal.retain(
            key,
            Undo::Attribute {
                entity,
                id: id.to_owned(),
                before: before.clone(),
            },
        )
    }
}
