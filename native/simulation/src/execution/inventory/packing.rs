//! Update admitted container summaries after a physical custody change.
use super::*;

#[derive(Clone, Copy)]
pub(super) enum PackingChange {
    Remove(u64),
    Add(u64),
}

impl PackingChange {
    pub(super) fn apply(self, load: u64) -> Option<u64> {
        match self {
            Self::Remove(amount) => load.checked_sub(amount),
            Self::Add(amount) => load
                .checked_add(amount)
                .filter(|next| *next <= MAX_SAFE_INTEGER),
        }
    }
}

/// Admit all net packing changes before custody edits. Root inventories
/// need no packing load. Each affected bag's current revision is checked once.
pub(super) fn check_packing(
    state: &crate::simulation::SimulationState,
    paths: &[(&[EntityHandle], PackingChange)],
    load: Option<u64>,
) -> Result<Result<(), OwnedMoveError>, ExecutionError> {
    let definitions = &state.installed.retained;
    for (path, change) in paths {
        for handle in *path {
            let entity = state.physical.entities.resolve(*handle).ok_or(ExecutionError::Invariant)?;
            let Some(bag) = &entity.container else { continue; };
            if load.is_none() {
                return Ok(Err(OwnedMoveError::NoPackingLoad));
            }
            let capacity = definitions.items.get(&bag.definition_pin.id)
                .and_then(|definition| definition.container_capacity())
                .ok_or(ExecutionError::Invariant)?;
            if bag.load_revision != bag.subtree_revision {
                return Err(ExecutionError::Invariant);
            }
            if change.apply(bag.load).is_none_or(|value| value > capacity) {
                return Ok(Err(OwnedMoveError::Packing));
            }
        }
    }
    Ok(Ok(()))
}

impl CoreMutation<'_> {
    /// Publish children before parents so height reflects the new membership.
    /// A direct edit may already own this parent's contents revision.
    pub(super) fn publish_packing(
        &mut self,
        handle: EntityHandle,
        change: PackingChange,
        revision_already_changed: bool,
    ) -> Result<(), ExecutionError> {
        let entities = &self.state.physical.entities;
        let entity = entities.resolve(handle).ok_or(ExecutionError::Invariant)?;
        let before = ContentsBefore {
            handle,
            revision: entity.inventory_revision,
            bag: entity.container.as_ref().map(|bag| {
                (
                    bag.load,
                    bag.load_revision,
                    bag.subtree_revision,
                    bag.height,
                )
            }),
        };
        let next = entity
            .container
            .as_ref()
            .map(|bag| {
                let height = self
                    .state
                    .inventory
                    .children(entities, &entity.id, false)
                    .map(|child| 1 + child.container.as_ref().map_or(0, |bag| bag.height))
                    .max()
                    .unwrap_or(0);
                let load = change.apply(bag.load).ok_or(ExecutionError::Invariant)?;
                Ok::<_, ExecutionError>((load, next_revision(bag.subtree_revision)?, height))
            })
            .transpose()?;
        let revision = if revision_already_changed {
            before.revision
        } else {
            Some(next_revision(before.revision.unwrap_or_default())?)
        };
        self.journal.physical.reserve(size_of::<Undo>())?;
        self.journal
            .physical
            .undo
            .push(Undo::InventoryAvailability(before));
        let entity = self
            .state
            .physical
            .entities
            .resolve_mut(handle)
            .ok_or(ExecutionError::Invariant)?;
        entity.inventory_revision = revision;
        if let (Some(bag), Some((load, revision, height))) = (&mut entity.container, next) {
            bag.load = load;
            bag.load_revision = revision;
            bag.subtree_revision = revision;
            bag.height = height;
        }
        Ok(())
    }
}
