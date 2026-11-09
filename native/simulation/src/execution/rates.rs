//! The ordinary numeric rate writer. Captured installed operations grant this
//! write; body health and independent reservoirs keep their own semantic owners.
use super::*;
use crate::status::{AttributeDefinition, AttributeSchema};
use crate::values::AttributeValue;
impl PhysicalMutation<'_> {
    pub(crate) fn settle_attribute(
        &mut self,
        id: &str,
        attribute: &str,
    ) -> Result<(), ExecutionError> {
        let episode = self
            .state
            .pending_values
            .as_ref()
            .and_then(|window| window.by_entity.get(id))
            .and_then(|values| values.get(attribute));
        if let Some(episode) = episode {
            self.journal.reserve(episode.len())?;
            let episode = episode.clone();
            self.settle_episode(&episode)?;
        }
        Ok(())
    }
    pub(crate) fn apply_ordinary_rate(
        &mut self,
        id: &str,
        definition: &AttributeDefinition,
        value: f64,
        observation_parameter: bool,
    ) -> Result<(), ExecutionError> {
        if definition.implementation != "number-v1" || definition.reservoir.is_some() {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let AttributeSchema::Number { min, max, .. } = definition.schema else {
            return Err(ValueError::InvalidMeaning.into());
        };
        if !value.is_finite() || value < min || value > max {
            return Err(ValueError::InvalidMeaning.into());
        }
        if definition
            .concern
            .as_ref()
            .is_some_and(|concern| concern.mode == "latched" && concern.notify)
        {
            return Err(ExecutionError::UnsupportedFamily);
        }
        self.settle_attribute(id, &definition.id)?;
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let entity = self
            .state
            .entities
            .resolve(handle)
            .ok_or(ExecutionError::MissingEntity)?;
        let state = entity
            .stored_attributes()
            .and_then(|values| values.get(&definition.id))
            .ok_or(ValueError::MissingAttribute)?;
        let AttributeValue::Number(before) = state.value else {
            return Err(ValueError::InvalidMeaning.into());
        };
        if before == value {
            return Ok(());
        }
        let revision = state
            .revision
            .checked_add(1)
            .filter(|revision| *revision <= MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Invariant)?;
        let concerned = if let Some(concern) = definition
            .concern
            .as_ref()
            .filter(|concern| concern.mode == "latched")
        {
            let was = state.concern_active.unwrap_or(before < concern.below);
            let recovery = crate::values::js_min(
                max,
                concern.below + concern.recovery_margin.ok_or(ValueError::InvalidMeaning)?,
            );
            Some(if was {
                value < recovery
            } else {
                value < concern.below
            })
        } else {
            None
        };
        self.snapshot_attribute(handle, &definition.id)?;
        self.journal
            .reserve(2 * size_of::<PhysicalChange>() + 2 * id.len())?;
        let state = self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|entity| entity.stored_attributes_mut())
            .and_then(|values| values.get_mut(&definition.id))
            .ok_or(ExecutionError::Invariant)?;
        state.value = AttributeValue::Number(value);
        state.revision = revision;
        state.concern_active = concerned;
        self.journal.change(PhysicalChange::Attribute {
            entity_id: id.into(),
            outward_change: definition.disclosure == "public",
        })?;
        if observation_parameter {
            self.journal.change(PhysicalChange::ObservationParameters {
                entity_id: id.into(),
                request_detail: true,
            })?;
        }
        Ok(())
    }
}
impl PhysicalMutation<'_> {
    /// This is an episode's accounting clock, not a new contribution or outward
    /// change. Its existing sparse status before-image covers repeated slices.
    pub(crate) fn advance_status_elapsed(
        &mut self,
        id: &str,
        status_id: &str,
        episode: &str,
        seconds: f64,
    ) -> Result<f64, ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let states = self
            .state
            .entities
            .resolve(handle)
            .and_then(|entity| entity.status_effects.as_ref())
            .ok_or(ValueError::MissingStatus)?;
        let (position, _, status) = states
            .get_full(status_id)
            .filter(|(_, _, status)| status.active && status.episode == episode)
            .ok_or(ValueError::MissingStatus)?;
        if status.contribution.is_some() || !seconds.is_finite() || seconds < 0.0 {
            return Err(ExecutionError::Invariant);
        }
        let before = status.elapsed_seconds;
        self.journal.reserve(status_id.len())?;
        let key = UndoKey::Status(handle.slot, handle.generation, status_id.into());
        if self.journal.first(&key)? {
            self.journal.reserve(
                heap_sum([2 * size_of::<Undo>(), status_id.len()])
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            self.journal.retain(
                key,
                Undo::Status {
                    entity: handle,
                    key: status_id.into(),
                    before: Some((
                        position,
                        crate::state::FundedStatus::copy(status, &self.journal.budget)?,
                    )),
                    root_present: true,
                },
            )?;
        }
        self.state
            .entities
            .resolve_mut(handle)
            .and_then(|entity| entity.status_effects.as_mut())
            .and_then(|states| states.get_mut(status_id))
            .ok_or(ExecutionError::Invariant)?
            .elapsed_seconds = before + seconds;
        Ok(before)
    }
}
