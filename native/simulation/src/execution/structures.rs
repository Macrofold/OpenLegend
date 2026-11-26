//! Change the actual gate, attached material and question geometry together.
//! A rejected candidate restores all three before it becomes visible again.
use super::*;
use crate::assembly::{
    Assembly, Edit, GatePosition,
    gate::{GateIntent, GateOperation},
    scene::StructureScene,
};

pub(super) struct EditUndo {
    pub root: EntityHandle,
    pub prior: Option<Edit>,
}
impl EditUndo {
    pub(super) fn restore(
        self,
        physical: &mut PhysicalState,
        custody: &mut ByteReservation,
    ) -> Result<(), ExecutionError> {
        *active_edit(&mut physical.entities, self.root)? = self.prior;
        physical
            .entities
            .settle_authored_memory(self.root, custody, true)
    }
}

impl PhysicalMutation<'_> {
    pub(crate) fn claim_gate_edit(&mut self, id: &str) -> Result<(), ExecutionError> {
        self.set_gate_edit(id, true)
    }

    pub(super) fn set_gate_edit(&mut self, id: &str, claim: bool) -> Result<(), ExecutionError> {
        let work = self
            .state
            .entities
            .get(id)
            .and_then(|actor| actor.actor.as_ref())
            .and_then(|actor| actor.action.as_ref())
            .and_then(|action| {
                action
                    .gate_work
                    .as_ref()
                    .map(|work| (action.id.as_str(), work))
            });
        let Some((invocation, work)) = work else {
            return if claim {
                Err(ExecutionError::Invariant)
            } else {
                Ok(())
            };
        };
        let root = self
            .state
            .entities
            .handle(&work.intent.assembly_id)
            .ok_or(ExecutionError::Invariant)?;
        let Some(Assembly::Boundary {
            active_edit: before,
            ..
        }) = self
            .state
            .entities
            .resolve(root)
            .and_then(|e| e.assembly.as_deref())
        else {
            return Err(ExecutionError::Invariant);
        };
        let exact = before
            .as_ref()
            .is_some_and(|edit| edit.actor_id == id && edit.invocation_id == invocation);
        if claim == exact {
            return Ok(());
        }
        if claim && before.is_some() {
            return Err(ExecutionError::Invariant);
        }
        self.journal
            .reserve(2 * size_of::<EditUndo>() + 2 * (id.len() + invocation.len()))?;
        let replacement = claim.then(|| Edit {
            actor_id: id.to_owned(),
            invocation_id: invocation.to_owned(),
        });
        let before = std::mem::replace(active_edit(&mut self.state.entities, root)?, replacement);
        self.journal.undo.push(Undo::StructureEdit(EditUndo {
            root,
            prior: before,
        }));
        self.state
            .entities
            .settle_authored_memory(root, &mut self.journal.reservation, false)
    }
}

fn active_edit(
    entities: &mut crate::state::EntityStore,
    handle: EntityHandle,
) -> Result<&mut Option<Edit>, ExecutionError> {
    match entities
        .resolve_mut(handle)
        .and_then(|entity| entity.assembly.as_deref_mut())
    {
        Some(Assembly::Boundary { active_edit, .. }) => Ok(active_edit),
        _ => Err(ExecutionError::Invariant),
    }
}

pub(super) struct GateUndo {
    pub root: EntityHandle,
    gate: String,
    revision: u64,
    position: GatePosition,
    barred: bool,
    pub attached: Option<[EntityHandle; 3]>,
    locals: [Point; 3],
    support: Option<String>,
    geometry: Option<Arc<StructureScene>>,
}

impl GateUndo {
    pub(super) fn restore(self, physical: &mut PhysicalState) -> Result<(), ExecutionError> {
        let Some(Assembly::Boundary {
            revision,
            gates,
            parts,
            joints,
            ..
        }) = physical
            .entities
            .resolve_mut(self.root)
            .and_then(|root| root.assembly.as_deref_mut())
        else {
            return Err(ExecutionError::Invariant);
        };
        let gate = gates.get_mut(&self.gate).ok_or(ExecutionError::Invariant)?;
        *revision = self.revision;
        gate.position = self.position;
        gate.barred = self.barred;
        if let Some(support) = self.support {
            let before = [support.clone(), support];
            for (id, rail) in gate.binding_ids[4..].iter().zip(before) {
                let part = parts.get(id).ok_or(ExecutionError::Invariant)?;
                joints
                    .get_mut(&part.slot)
                    .ok_or(ExecutionError::Invariant)?
                    .support_id = rail;
            }
        }
        if let Some(handles) = self.attached {
            for (handle, point) in handles.into_iter().zip(self.locals) {
                let (revision, local) = attached_local(&mut physical.entities, handle)?;
                *revision = revision.checked_sub(1).ok_or(ExecutionError::Invariant)?;
                *local = point;
            }
            physical.structures = self.geometry;
        }
        Ok(())
    }
}

impl CoreMutation<'_> {
    /// The caller owns work, reach, occupancy, and current grant admission.
    /// This mutation runs before the completion receipt is published.
    pub(crate) fn operate_bound_gate(
        &mut self,
        intent: &GateIntent,
    ) -> Result<bool, ExecutionError> {
        let read = intent.read(self.state).ok_or(ExecutionError::Invariant)?;
        if read.already(intent.operation) {
            return Ok(false);
        }
        let entities = &self.state.physical.entities;
        let root = entities
            .handle(&read.root.id)
            .ok_or(ExecutionError::Invariant)?;
        let root_position = read
            .root
            .world_position()
            .ok_or(ExecutionError::Invariant)?;
        let next_revision = successor(intent.expected_revision)?;
        let gate = read.gate;
        let moves = intent.operation.moves_leaf();
        let rail = usize::from(intent.operation == GateOperation::Open);
        let position = if moves {
            if rail == 1 {
                GatePosition::Open
            } else {
                GatePosition::Closed
            }
        } else {
            gate.position
        };
        let mut storage =
            2 * size_of::<GateUndo>() + 2 * intent.assembly_id.len() + intent.item_id.len();
        if moves {
            storage += 4 * gate.rail_ids.iter().map(String::len).sum::<usize>();
        }
        self.journal.physical.reserve(storage)?;
        let mut moved = None;
        let mut before = [Point {
            x: 0.0,
            y: 0.0,
            z: 0.0,
        }; 3];
        let mut after = before;
        let mut old_rail = None;
        let mut new_rails = None;
        if moves {
            let layout = read.family.geometry.layout(
                read.local_frame,
                position,
                read.family.presentation.binding_size,
            );
            let structure = read
                .root
                .assembly
                .as_deref()
                .ok_or(ExecutionError::Invariant)?;
            let handle = |id: &str| entities.handle(id).ok_or(ExecutionError::Invariant);
            let selected = [&intent.item_id, &gate.binding_ids[4], &gate.binding_ids[5]];
            moved = Some([
                handle(selected[0])?,
                handle(selected[1])?,
                handle(selected[2])?,
            ]);
            for (index, item) in selected.into_iter().enumerate() {
                let (entity, local) = structure
                    .installed_part(entities, &read.root.id, item)
                    .ok_or(ExecutionError::Invariant)?;
                if let Some(Placement::Attached { revision, .. }) = entity.placement {
                    successor(revision)?;
                }
                before[index] = local;
            }
            after = [layout.leaf, layout.hangers[0], layout.hangers[1]];
            old_rail =
                Some(gate.rail_ids[usize::from(gate.position == GatePosition::Open)].clone());
            new_rails = Some([gate.rail_ids[rail].clone(), gate.rail_ids[rail].clone()]);
        }
        let geometry = self.state.physical.structures.clone();
        if moves && geometry.is_none() {
            return Err(ExecutionError::Invariant);
        }
        self.journal
            .physical
            .undo
            .push(Undo::Gate(Box::new(GateUndo {
                root,
                gate: intent.item_id.clone(),
                revision: intent.expected_revision,
                position: gate.position,
                barred: gate.barred,
                attached: moved,
                locals: before,
                support: old_rail,
                geometry: geometry.clone(),
            })));
        let physical = &mut self.state.physical;
        let Some(Assembly::Boundary {
            revision,
            gates,
            parts,
            joints,
            ..
        }) = physical
            .entities
            .resolve_mut(root)
            .and_then(|root| root.assembly.as_deref_mut())
        else {
            return Err(ExecutionError::Invariant);
        };
        let gate = gates
            .get_mut(&intent.item_id)
            .ok_or(ExecutionError::Invariant)?;
        gate.position = position;
        gate.barred = intent.operation == GateOperation::Bar;
        *revision = next_revision;
        if let Some(handles) = moved {
            for (id, rail) in gate.binding_ids[4..]
                .iter()
                .zip(new_rails.ok_or(ExecutionError::Invariant)?)
            {
                let part = parts.get(id).ok_or(ExecutionError::Invariant)?;
                joints
                    .get_mut(&part.slot)
                    .ok_or(ExecutionError::Invariant)?
                    .support_id = rail;
            }
            for (handle, point) in handles.into_iter().zip(after) {
                let (revision, local) = attached_local(&mut physical.entities, handle)?;
                *revision += 1;
                *local = point;
            }
            let root_entity = physical
                .entities
                .resolve(root)
                .ok_or(ExecutionError::Invariant)?;
            let prepared = geometry
                .ok_or(ExecutionError::Invariant)?
                .after_edit(
                    root_entity,
                    &physical.entities,
                    &self.state.installed.retained,
                    &self.journal.budget,
                )
                .map_err(|problem| match problem {
                    crate::install::InstallError::Capacity => ExecutionError::Capacity,
                    _ => ExecutionError::Invariant,
                })?;
            physical.structures = Some(prepared);
            self.journal.physical.change(PhysicalChange::Spatial {
                entity_id: intent.assembly_id.clone(),
                before: root_position,
                after: root_position,
                support_unchanged: true,
                discontinuity: false,
            })?;
        }
        physical.entities.settle_authored_memory(
            root,
            &mut self.journal.physical.reservation,
            false,
        )?;
        Ok(true)
    }
}

fn attached_local(
    entities: &mut crate::state::EntityStore,
    handle: EntityHandle,
) -> Result<(&mut u64, &mut Point), ExecutionError> {
    let Some(Placement::Attached {
        revision,
        local: Some(local),
        ..
    }) = entities
        .resolve_mut(handle)
        .and_then(|entity| entity.placement.as_mut())
    else {
        return Err(ExecutionError::Invariant);
    };
    Ok((revision, local))
}

fn successor(revision: u64) -> Result<u64, ExecutionError> {
    revision
        .checked_add(1)
        .filter(|&n| n <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or(ExecutionError::Identity)
}
