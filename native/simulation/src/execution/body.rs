//! Body changes keep bounded scalar/subrecord inverses. Creating a corpse moves
//! one newly constructed entity into the canonical store; it never clones the
//! person, their agency, knowledge, current evidence or history.
use super::*;
use crate::host::retained_size::{map_storage, tree_node_bound};
use crate::state::{Entity, Remains};

impl PhysicalMutation<'_> {
    /// Change the native shape and its response deadline through one inverse.
    /// The caller has already checked actual life, contact, sight and clearance.
    pub(crate) fn set_local_pose(
        &mut self,
        id: &str,
        next: Option<crate::state::LocalPose>,
        ready_at: Option<f64>,
    ) -> Result<(), ExecutionError> {
        let handle = self.state.entities.handle(id).ok_or(ExecutionError::MissingEntity)?;
        let entity = self.state.entities.resolve(handle).ok_or(ExecutionError::Invariant)?;
        let before = &entity.spatial.local_pose;
        let prior_ready_at = entity.spatial.local_avoidance_ready_at;
        if before == &next && prior_ready_at == ready_at {
            return Ok(());
        }
        let changes_shape = before.as_ref().map(|pose| pose.contracted_height)
            != next.as_ref().map(|pose| pose.contracted_height);
        self.journal.reserve(heap_sum([
            2 * size_of::<Undo>(),
            id.len(),
            before.heap_bytes().ok_or(ExecutionError::Capacity)?,
            next.heap_bytes().ok_or(ExecutionError::Capacity)?,
        ]).ok_or(ExecutionError::Capacity)?)?;
        let key = UndoKey::LocalPose(handle.slot, handle.generation);
        if self.journal.first(&key)? {
            self.journal.retain(key, Undo::LocalPose {
                entity: handle,
                before: before.clone(),
                ready_at: prior_ready_at,
            })?;
        }
        let body = self.state.entities.resolve_mut(handle).ok_or(ExecutionError::Invariant)?;
        body.spatial.local_pose = next;
        body.spatial.local_avoidance_ready_at = ready_at;
        self.state.entities.settle_operational_memory(handle, &mut self.journal.reservation, false)?;
        if changes_shape {
            self.state.bodies.refresh(&self.state.entities, id)?;
            self.advance_body_revision(id)?;
        }
        Ok(())
    }

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
        if entity.spatial.flight.is_some() {
            return Err(ExecutionError::UnsupportedFamily);
        }
        if !incapacitate && entity.spatial.local_pose.is_some() {
            let life = entity.physical_life().ok_or(ExecutionError::MissingActor)?;
            self.close_body_crossings(id, life)?;
            self.set_local_pose(id, None, None)?;
        }
        let entity = self.state.entities.resolve(handle).ok_or(ExecutionError::Invariant)?;
        let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
        self.journal.reserve(2 * size_of::<Undo>() + id.len())?;
        let key = UndoKey::BodyLifecycle(handle.slot, handle.generation);
        if self.journal.first(&key)? {
            self.journal.retain(
                key,
                Undo::BodyLifecycle {
                    entity: handle,
                    alive: actor.alive,
                    incapacitated: actor.incapacitated,
                    physical_life: actor.physical_life,
                    conditions: actor.body.as_ref().map(|body| body.conditions.clone()),
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
        self.state.bodies.refresh(&self.state.entities, id)?;
        Ok(())
    }
    /// Install only the new physical life. The command owner proves the
    /// replacement location and handles existing experience before publishing.
    pub(crate) fn replace_dead_life(&mut self, id: &str) -> Result<(), ExecutionError> {
        let handle = self.state.entities.handle(id).ok_or(ExecutionError::MissingEntity)?;
        let entity = self.state.entities.resolve(handle).ok_or(ExecutionError::MissingEntity)?;
        let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
        let body = actor.body.as_ref().ok_or(ExecutionError::MissingBody)?;
        let life = actor.physical_life.unwrap_or(0).checked_add(1)
            .filter(|next| *next <= MAX_SAFE_INTEGER).ok_or(ExecutionError::Invariant)?;
        if actor.alive || actor.pending_death.is_none() || actor.action.is_some()
            || entity.spatial.flight.is_some() || entity.spatial.local_pose.is_some()
        {
            return Err(ExecutionError::Invariant);
        }
        let health = body.max_health;
        self.journal.reserve(heap_sum([
            4 * size_of::<Undo>(),
            2 * id.len(),
            actor.pending_death.heap_bytes().ok_or(ExecutionError::Capacity)?,
        ]).ok_or(ExecutionError::Capacity)?)?;
        let lifecycle = UndoKey::BodyLifecycle(handle.slot, handle.generation);
        if self.journal.first(&lifecycle)? {
            self.journal.retain(lifecycle, Undo::BodyLifecycle {
                entity: handle,
                alive: actor.alive,
                incapacitated: actor.incapacitated,
                physical_life: actor.physical_life,
                conditions: Some(body.conditions.clone()),
                fall_velocity: entity.spatial.fall_velocity,
                local_avoidance_ready_at: entity.spatial.local_avoidance_ready_at,
            })?;
        }
        let pending = UndoKey::PendingDeath(handle.slot, handle.generation);
        let first_pending = self.journal.first(&pending)?;
        let entity = self.state.entities.resolve_mut(handle).ok_or(ExecutionError::Invariant)?;
        let actor = entity.actor.as_mut().ok_or(ExecutionError::Invariant)?;
        let before = actor.pending_death.take();
        let combat = actor.combat_ready_at.take();
        let evasion = actor.evasion_ready_at.take();
        if first_pending {
            self.journal.retain(pending, Undo::PendingDeath {
                entity: handle,
                before,
                combat_ready_at: combat,
                evasion_ready_at: evasion,
            })?;
        }
        actor.alive = true;
        actor.incapacitated = false;
        actor.physical_life = Some(life);
        actor.body.as_mut().ok_or(ExecutionError::MissingBody)?.conditions =
            crate::state::BodyConditions { wetness: 0.0, burning: 0.0 };
        entity.spatial.fall_velocity = None;
        entity.spatial.local_avoidance_ready_at = None;
        self.state.entities.settle_operational_memory(handle, &mut self.journal.reservation, false)?;
        self.set_health(id, health, None)?;
        self.advance_body_revision(id)?;
        self.state.bodies.refresh(&self.state.entities, id)?;
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
        self.journal.reserve(heap_sum([
            2 * size_of::<Undo>(),
            entity.remains.heap_bytes().ok_or(ExecutionError::Capacity)?,
            after.heap_bytes().ok_or(ExecutionError::Capacity)?,
            id.len(),
        ]).ok_or(ExecutionError::Capacity)?)?;
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
        self.state.entities.settle_operational_memory(handle, &mut self.journal.reservation, false)?;
        self.state.bodies.refresh(&self.state.entities, id)?;
        Ok(())
    }
    pub(crate) fn separate_dead_body(
        &mut self,
        id: &str,
        pending: crate::body::PendingDeath,
        mut summary: ByteReservation,
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
        summary.resize(pending.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        self.journal.reservation.merge(summary)?;
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
        self.state.entities.settle_operational_memory(handle, &mut self.journal.reservation, false)?;
        self.state.bodies.refresh(&self.state.entities, id)?;
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
    pub(crate) fn treat_scar(&mut self, id: &str, scar: &str) -> Result<(), ExecutionError> {
        let entity = self.state.entities.handle(id).ok_or(ExecutionError::MissingEntity)?;
        let (index, _, count) = self.state.entities.resolve(entity)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.scars.as_ref())
            .and_then(|scars| scars.get_full(scar))
            .ok_or(ExecutionError::Invariant)?;
        let count = *count;
        if count < 1.0 {
            return Err(ExecutionError::Invariant);
        }
        self.journal.reserve(2 * size_of::<Undo>() + 2 * scar.len())?;
        let key = UndoKey::Scar(entity.slot, entity.generation, scar.into());
        if self.journal.first(&key)? {
            self.journal.retain(key, Undo::Scar {
                entity,
                key: scar.into(),
                before: Some((index, count)),
                root_present: true,
            })?;
        }
        let scars = self.state.entities.resolve_mut(entity)
            .and_then(|entity| entity.actor.as_mut())
            .and_then(|actor| actor.scars.as_mut())
            .ok_or(ExecutionError::Invariant)?;
        if count == 1.0 {
            scars.shift_remove(scar);
        } else {
            *scars.get_mut(scar).ok_or(ExecutionError::Invariant)? = count - 1.0;
        }
        self.advance_body_revision(id)
    }

    pub(crate) fn insert_corpse(&mut self, corpse: Entity) -> Result<(), ExecutionError> {
        self.insert_entity(corpse, true).map(|_| ())
    }

    /// Callers have already validated the complete new entity and own its
    /// independent construction allocation. The journal tracks insertion and
    /// store order. Only a positioned body joins the physical observer index.
    pub(super) fn insert_entity(
        &mut self,
        entity: Entity,
        body: bool,
    ) -> Result<EntityHandle, ExecutionError> {
        let id = &entity.id;
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
        let after = entity.world_position();
        let before = self
            .state
            .entities
            .insert_new(entity, &self.journal.budget)?;
        let handle = before.handle;
        let renumbered = before.renumbered();
        self.journal.undo.push(Undo::AddedEntity(before));
        self.state
            .entities
            .settle_store_memory(&mut self.journal.reservation, false)?;
        if renumbered {
            self.state.bodies.refresh_ordering(&self.state.entities)?;
        }
        if body {
            self.state.bodies.refresh(&self.state.entities, &id)?;
            self.journal.change(PhysicalChange::Membership {
                entity_id: id,
                before: None,
                after,
            })?;
        }
        Ok(handle)
    }
    /// The caller must first account for any owned children and supply an
    /// observation before the empty root leaves physical membership.
    pub(super) fn remove_physical_root(&mut self, id: &str) -> Result<(), ExecutionError> {
        let before = self.state.entities.get(id)
            .and_then(Entity::world_position)
            .ok_or(ExecutionError::MissingEntity)?;
        let retained = self.state.entities.physical_root_removal_bound(id)
            .ok_or(ExecutionError::Invariant)?;
        self.journal.reserve(heap_sum([
            retained, id.len(), size_of::<crate::state::RemovedPhysicalRoot>(), size_of::<Undo>(),
        ]).ok_or(ExecutionError::Capacity)?)?;
        let removed = self.state.entities.remove_physical_root(id)?;
        self.journal.undo.push(Undo::RemovedPhysicalRoot(Box::new(removed)));
        self.state.entities.settle_store_memory(&mut self.journal.reservation, false)?;
        self.state.bodies.refresh(&self.state.entities, id)?;
        self.journal.change(PhysicalChange::Membership {
            entity_id: id.into(), before: Some(before), after: None,
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
