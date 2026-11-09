//! Body changes keep bounded scalar/subrecord inverses. Creating a corpse moves
//! one newly constructed entity into the canonical store; it never clones the
//! person, their agency, knowledge, current evidence or history.
use super::*;
use crate::host::retained_size::{map_storage, tree_node_bound};
use crate::state::{Entity, Remains};

impl PhysicalMutation<'_> {
    pub(crate) fn advance_body_revision(&mut self, id: &str) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let before = self
            .state
            .entities
            .resolve(handle)
            .and_then(|e| e.actor.as_ref())
            .and_then(|a| a.body.as_ref())
            .ok_or(ExecutionError::MissingBody)?
            .revision;
        let after = before
            .checked_add(1)
            .filter(|n| *n <= MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Invariant)?;
        self.journal.reserve(2 * size_of::<Undo>() + id.len())?;
        let key = UndoKey::BodyRevision(handle.slot, handle.generation);
        if self.journal.first(&key)? {
            self.journal.retain(
                key,
                Undo::BodyRevision {
                    entity: handle,
                    before,
                },
            )?;
        }
        self.state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.actor.as_mut())
            .and_then(|a| a.body.as_mut())
            .ok_or(ExecutionError::Invariant)?
            .revision = after;
        self.journal.change(PhysicalChange::Body {
            entity_id: id.into(),
        })
    }
    pub(crate) fn make_body_unavailable(
        &mut self,
        id: &str,
        incapacitate: bool,
    ) -> Result<(), ExecutionError> {
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
        let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
        if entity.spatial.flight.is_some() || entity.spatial.local_pose.is_some() {
            return Err(ExecutionError::UnsupportedFamily);
        }
        self.journal.reserve(2 * size_of::<Undo>() + id.len())?;
        let key = UndoKey::BodyLifecycle(handle.slot, handle.generation);
        if self.journal.first(&key)? {
            self.journal.retain(
                key,
                Undo::BodyLifecycle {
                    entity: handle,
                    alive: actor.alive,
                    incapacitated: actor.incapacitated,
                    fall_velocity: entity.spatial.fall_velocity,
                    local_avoidance_ready_at: entity.spatial.local_avoidance_ready_at,
                },
            )?;
        }
        let entity = self
            .state
            .entities
            .resolve_mut(handle)
            .ok_or(ExecutionError::Invariant)?;
        if matches!(
            entity.placement,
            Some(Placement::World {
                support_surface_id: None,
                ..
            })
        ) {
            entity.spatial.fall_velocity = Some(0.0);
        }
        let actor = entity.actor.as_mut().ok_or(ExecutionError::Invariant)?;
        if incapacitate {
            actor.incapacitated = true;
        } else {
            actor.alive = false;
            entity.spatial.local_avoidance_ready_at = None;
        }
        self.state.bodies.refresh(&self.state.entities, id);
        Ok(())
    }
    pub(crate) fn set_remains(
        &mut self,
        id: &str,
        after: Option<Remains>,
    ) -> Result<(), ExecutionError> {
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
        let before = entity.remains.as_ref();
        self.journal.reserve(
            heap_sum([
                2 * size_of::<Undo>(),
                before.map_or(0, |v| {
                    v.source_id.len()
                        + v.phase.len()
                        + v.yields.len() * size_of::<crate::state::Yield>()
                        + v.yields
                            .iter()
                            .map(|y| y.definition_id.len())
                            .sum::<usize>()
                }),
                id.len(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let key = UndoKey::Remains(handle.slot, handle.generation);
        if self.journal.first(&key)? {
            self.journal.retain(
                key,
                Undo::Remains {
                    entity: handle,
                    before: before.cloned(),
                },
            )?;
        }
        self.state
            .entities
            .resolve_mut(handle)
            .ok_or(ExecutionError::Invariant)?
            .remains = after;
        self.state.bodies.refresh(&self.state.entities, id);
        Ok(())
    }
    pub(crate) fn separate_dead_body(
        &mut self,
        id: &str,
        pending: crate::body::PendingDeath,
    ) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let actor = self
            .state
            .entities
            .resolve(handle)
            .and_then(|e| e.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        if actor.pending_death.is_some() {
            return Err(ExecutionError::Invariant);
        }
        self.journal.reserve(2 * size_of::<Undo>() + id.len())?;
        let key = UndoKey::PendingDeath(handle.slot, handle.generation);
        if self.journal.first(&key)? {
            self.journal.retain(
                key,
                Undo::PendingDeath {
                    entity: handle,
                    before: None,
                    combat_ready_at: actor.combat_ready_at,
                    evasion_ready_at: actor.evasion_ready_at,
                },
            )?;
        }
        let actor = self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.actor.as_mut())
            .ok_or(ExecutionError::Invariant)?;
        actor.pending_death = Some(pending);
        actor.combat_ready_at = None;
        actor.evasion_ready_at = None;
        self.state.bodies.refresh(&self.state.entities, id);
        Ok(())
    }
    pub(crate) fn add_death_scar(&mut self, id: &str, scar: &str) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let actor = self
            .state
            .entities
            .resolve(handle)
            .and_then(|e| e.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        let root_present = actor.scars.is_some();
        let before = actor
            .scars
            .as_ref()
            .and_then(|v| v.get_full(scar))
            .map(|(i, _, v)| (i, *v));
        let next = before.map_or(0.0, |(_, n)| n) + 1.0;
        if next > MAX_SAFE_INTEGER as f64 {
            return Err(ExecutionError::Invariant);
        }
        let needed = actor.scars.as_ref().map_or(0, IndexMap::len) + usize::from(before.is_none());
        let growth = if actor.scars.as_ref().is_none_or(|m| needed > m.capacity()) {
            map_storage::<String, f64>(
                needed
                    .checked_mul(2)
                    .and_then(|n| n.checked_add(8))
                    .ok_or(ExecutionError::Capacity)?,
            )
            .ok_or(ExecutionError::Capacity)?
        } else {
            0
        };
        self.journal.reserve(
            heap_sum([2 * size_of::<Undo>(), scar.len() * 3, growth])
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut new = if !root_present {
            let mut map = IndexMap::new();
            map.try_reserve(needed)
                .map_err(|_| ExecutionError::Capacity)?;
            Some(map)
        } else {
            None
        };
        if root_present {
            self.state
                .entities
                .resolve_mut(handle)
                .and_then(|e| e.actor.as_mut())
                .and_then(|a| a.scars.as_mut())
                .ok_or(ExecutionError::Invariant)?
                .try_reserve(usize::from(before.is_none()))
                .map_err(|_| ExecutionError::Capacity)?;
        }
        let key = UndoKey::Scar(handle.slot, handle.generation, scar.into());
        if self.journal.first(&key)? {
            self.journal.retain(
                key,
                Undo::Scar {
                    entity: handle,
                    key: scar.into(),
                    before,
                    root_present,
                },
            )?;
        }
        let actor = self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.actor.as_mut())
            .ok_or(ExecutionError::Invariant)?;
        if let Some(new) = new.take() {
            actor.scars = Some(new);
        }
        actor
            .scars
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .insert(scar.into(), next);
        Ok(())
    }
    pub(crate) fn insert_corpse(&mut self, corpse: Entity) -> Result<(), ExecutionError> {
        // Only this typed constructor uses insertion. IDs have the saved body-
        // prefix, so the source collection's numeric-key branch cannot apply.
        let id = &corpse.id;
        let bounds = self
            .state
            .entities
            .insertion_bound(id)
            .ok_or(ExecutionError::Capacity)?;
        let index = tree_node_bound::<String, usize>()
            .and_then(|n| n.checked_mul(8))
            .and_then(|n| n.checked_add(id.len() * 5 + 128))
            .ok_or(ExecutionError::Capacity)?;
        self.journal.reserve(
            heap_sum([bounds, index, 2 * size_of::<Undo>(), id.len()])
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let id = id.clone();
        let after = corpse.world_position();
        let before = self
            .state
            .entities
            .insert_new(corpse)
            .map_err(|_| ExecutionError::Capacity)?;
        let renumbered = before.renumbered();
        self.journal.undo.push(Undo::AddedEntity(before));
        if renumbered {
            self.state.bodies.refresh_ordering(&self.state.entities);
        }
        self.state.bodies.refresh(&self.state.entities, &id);
        self.journal.change(PhysicalChange::Membership {
            entity_id: id,
            before: None,
            after,
        })
    }
    pub(crate) fn membership_changed(&mut self, id: &str) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let after = self
            .state
            .entities
            .resolve(handle)
            .ok_or(ExecutionError::MissingEntity)?
            .world_position();
        let mut before = after;
        for undo in &self.journal.undo {
            match undo {
                Undo::AddedEntity(added) if added.handle == handle => {
                    before = None;
                    break;
                }
                Undo::Placement {
                    entity,
                    before: placement,
                    ..
                } if *entity == handle => {
                    before = match placement {
                        Placement::World { position, .. } => Some(*position),
                        _ => None,
                    };
                    break;
                }
                _ => {}
            }
        }
        self.journal.reserve(id.len())?;
        self.journal.change(PhysicalChange::Membership {
            entity_id: id.into(),
            before,
            after,
        })
    }
    pub(crate) fn clear_contacts(&mut self, id: &str) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let actor = self
            .state
            .entities
            .resolve(handle)
            .and_then(|e| e.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        if actor.contacts.as_ref().is_none_or(IndexMap::is_empty) {
            return Ok(());
        }
        self.journal.reserve(2 * size_of::<Undo>())?;
        let key = UndoKey::Contacts(handle.slot, handle.generation);
        let first = self.journal.first(&key)?;
        let before = std::mem::take(
            self.state
                .entities
                .resolve_mut(handle)
                .and_then(|e| e.actor.as_mut())
                .and_then(|a| a.contacts.as_mut())
                .ok_or(ExecutionError::Invariant)?,
        );
        if first {
            self.journal.retain(
                key,
                Undo::Contacts {
                    entity: handle,
                    before,
                },
            )?;
        }
        Ok(())
    }
}
