//! Per-slot canonical metadata custody. Independently replaced action/goal/
//! intent buffers retain their dedicated move owners. This first component
//! covers semantic continuation; remaining physical components join this owner.
use super::*;
use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, heap_record, heap_sum};
use crate::host::{ByteBudget, ByteReservation, ResidentReservation};
mod authored;
mod status;
pub(crate) use status::FundedStatus;
mod store;
pub(super) use store::EntityStoreMemory;

heap_record!(ResolvedSemanticCause {
    purpose,
    qualitative_revision
});
heap_record!(SemanticContinuation {
    discovery,
    reservation,
    occupied_purpose,
    resolved
});
heap_record!(AttackModeNotice { occurrence_id });
heap_record!(InventoryInspection {
    revision,
    scope,
    container_id,
    container_name,
    after,
    more,
    item_ids,
    item_names,
    evidence_ids
});
heap_record!(Participation {
    phase,
    exit_attempt_id,
    return_anchor
});
heap_record!(super::Remains { phase, source_id, yields });
heap_record!(super::LocalPose { profile });

pub(super) struct EntityMetadata {
    _authored: ResidentReservation,
    foraging: Option<ResidentReservation>,
    values: status::ValueStorage,
    semantic: usize,
    agency: usize,
    participation: usize,
    operational: usize,
    practice: usize,
    storage: ResidentReservation,
    budget: ByteBudget,
}
impl EntityMetadata {
    pub(super) fn new(entity: &Entity, budget: &ByteBudget) -> Result<Self, ExecutionError> {
        let semantic = semantic_bytes(entity)?;
        let agency = agency_bytes(entity)?;
        let participation = participation_bytes(entity)?;
        let operational = operational_bytes(entity)?;
        let practice = practice_bytes(entity)?;
        Ok(Self {
            values: status::ValueStorage::new(entity, budget)?,
            _authored: budget
                .reserve_record(authored::bytes(entity).ok_or(ExecutionError::Capacity)?)?,
            foraging: entity
                .animal
                .as_ref()
                .and_then(|animal| animal.foraging.as_ref())
                .map(|value| {
                    budget
                        .reserve_record(value.heap_bytes().ok_or(ExecutionError::Capacity)?)
                        .map_err(ExecutionError::from)
                })
                .transpose()?,
            semantic,
            agency,
            participation,
            operational,
            practice,
            storage: budget.reserve_backing(
                semantic
                    .checked_add(agency)
                    .and_then(|n| n.checked_add(participation))
                    .and_then(|n| n.checked_add(operational))
                    .and_then(|n| n.checked_add(practice))
                    .ok_or(ExecutionError::Capacity)?,
            )?,
            budget: budget.clone(),
        })
    }
}

pub(crate) struct FundedForaging {
    pub(crate) value: Box<crate::native_response::ForagingContinuation>,
    pub(crate) storage: ResidentReservation,
}

impl FundedForaging {
    /// The producer owns the temporary candidate allocation until this
    /// exact successful body and its buffers move into the resident slot.
    pub(crate) fn adopt(
        value: Box<crate::native_response::ForagingContinuation>,
        mut workspace: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let bytes = value.heap_bytes().ok_or(ExecutionError::Capacity)?;
        if workspace.bytes() < bytes {
            return Err(ExecutionError::Capacity);
        }
        workspace.resize(bytes)?;
        let storage = budget.adopt_record(workspace)?;
        Ok(Self { value, storage })
    }
}
impl HeapBytes for Placement {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::World { support_surface_id, .. } => support_surface_id.heap_bytes(),
            Self::Contained { parent_entity_id, .. } => parent_entity_id.heap_bytes(),
            Self::Attached { parent_entity_id, port_id, slot, .. } =>
                heap_sum([parent_entity_id.capacity(), port_id.capacity(), slot.heap_bytes()?]),
        }
    }
}

fn settle_component(
    budget: &ByteBudget,
    storage: &mut ResidentReservation,
    tracked: &mut usize,
    after: usize,
    from: &mut ByteReservation,
    restoring: bool,
) -> Result<(), ExecutionError> {
    let total = storage
        .bytes()
        .checked_sub(*tracked)
        .and_then(|n| n.checked_add(after))
        .ok_or(ExecutionError::Capacity)?;
    if total > storage.bytes() {
        let growth = from.split_off(total - storage.bytes())?;
        if restoring {
            budget.restore_backing(storage, growth)?;
        } else {
            budget.fund_backing(storage, growth)?;
        }
    }
    storage.resize(total)?;
    *tracked = after;
    Ok(())
}

fn practice_bytes(entity: &Entity) -> Result<usize, ExecutionError> {
    entity
        .actor
        .as_ref()
        .map_or(Some(0), |actor| actor.practice.heap_bytes())
        .ok_or(ExecutionError::Capacity)
}

fn operational_bytes(entity: &Entity) -> Result<usize, ExecutionError> {
    entity
        .actor
        .as_ref()
        .map_or(Some(0), |actor| {
            actor
                .controller
                .capacity()
                .checked_add(actor.inventory_inspection.heap_bytes()?)?
                .checked_add(actor.pending_death.heap_bytes()?)?
                .checked_add(actor.attack_mode_notice.heap_bytes()?)
        })
        .and_then(|actor| {
            actor.checked_add(
                entity.threat.as_ref().map_or(Some(0), |threat| {
                    threat.progress.heap_bytes()?.checked_add(threat.policy.place_bytes()?)
                })?,
            )
        })
        .and_then(|bytes| {
            heap_sum([
                bytes,
                entity.item.heap_bytes()?,
                entity.resource.as_ref().map_or(Some(0), |resource| resource.cast.heap_bytes())?,
                match &entity.placement {
                    Some(Placement::World { .. }) => 0,
                    placement => placement.heap_bytes()?,
                },
                entity.container.heap_bytes()?,
                entity.declared_owner.heap_bytes()?,
                entity.retirement.heap_bytes()?,
                entity.remains.heap_bytes()?,
                entity.spatial.flight.heap_bytes()?,
                entity.spatial.local_pose.heap_bytes()?,
            ])
        })
        .ok_or(ExecutionError::Capacity)
}
fn participation_bytes(entity: &Entity) -> Result<usize, ExecutionError> {
    entity
        .actor
        .as_ref()
        .map_or(Some(0), |actor| actor.participation.heap_bytes())
        .ok_or(ExecutionError::Capacity)
}

fn semantic_bytes(entity: &Entity) -> Result<usize, ExecutionError> {
    entity
        .actor
        .as_ref()
        .map_or(Some(0), |actor| actor.agency.semantic.heap_bytes())
        .ok_or(ExecutionError::Capacity)
}

fn agency_bytes(entity: &Entity) -> Result<usize, ExecutionError> {
    entity
        .actor
        .as_ref()
        .map_or(Some(0), |actor| {
            // Semantic continuation, goals and pending intentions already have
            // their own resident owners. These remaining buffers move through
            // the physical candidate journal before joining this backing.
            heap_sum([
                actor.agency.plan.heap_bytes()?,
                actor.agency.suspended.heap_bytes()?,
                actor.agency.history.heap_bytes()?,
                actor.agency.places.heap_bytes()?,
                actor.agency.last_result_evidence.heap_bytes()?,
            ])
        })
        .ok_or(ExecutionError::Capacity)
}

impl EntityStore {
    pub(crate) fn foraging_storage(
        &self,
        handle: EntityHandle,
    ) -> Result<&ResidentReservation, ExecutionError> {
        self.slots
            .get(handle.slot)
            .filter(|slot| slot.generation == handle.generation)
            .and_then(|slot| slot.metadata_storage.as_ref())
            .and_then(|metadata| metadata.foraging.as_ref())
            .ok_or(ExecutionError::Invariant)
    }

    /// Replace the complete animal's foraging continuation. The displaced
    /// record stays funded for the undo journal or dies with its last owner.
    pub(crate) fn swap_funded_foraging(
        &mut self,
        handle: EntityHandle,
        next: FundedForaging,
    ) -> Result<FundedForaging, ExecutionError> {
        let slot = self
            .slots
            .get_mut(handle.slot)
            .filter(|slot| slot.generation == handle.generation)
            .ok_or(ExecutionError::MissingEntity)?;
        let animal = slot
            .entity
            .as_mut()
            .and_then(|entity| entity.animal.as_mut())
            .ok_or(ExecutionError::Invariant)?;
        let metadata = slot
            .metadata_storage
            .as_mut()
            .ok_or(ExecutionError::Invariant)?;
        match (&mut animal.foraging, &mut metadata.foraging) {
            (Some(value), Some(storage)) => Ok(FundedForaging {
                value: std::mem::replace(value, next.value),
                storage: std::mem::replace(storage, next.storage),
            }),
            _ => Err(ExecutionError::Invariant),
        }
    }

    pub(crate) fn settle_agency_memory(
        &mut self,
        handle: EntityHandle,
        from: &mut ByteReservation,
        restoring: bool,
    ) -> Result<(), ExecutionError> {
        let slot = self
            .slots
            .get_mut(handle.slot)
            .filter(|slot| slot.generation == handle.generation)
            .ok_or(ExecutionError::MissingEntity)?;
        let after = agency_bytes(slot.entity.as_ref().ok_or(ExecutionError::MissingEntity)?)?;
        let metadata = slot
            .metadata_storage
            .as_mut()
            .ok_or(ExecutionError::Invariant)?;
        let total = metadata
            .storage
            .bytes()
            .checked_sub(metadata.agency)
            .and_then(|n| n.checked_add(after))
            .ok_or(ExecutionError::Capacity)?;
        if total > metadata.storage.bytes() {
            let growth = from.split_off(total - metadata.storage.bytes())?;
            if restoring {
                metadata
                    .budget
                    .restore_backing(&mut metadata.storage, growth)?;
            } else {
                metadata
                    .budget
                    .fund_backing(&mut metadata.storage, growth)?;
            }
        }
        metadata.storage.resize(total)?;
        metadata.agency = after;
        Ok(())
    }

    pub(crate) fn settle_operational_memory(
        &mut self,
        handle: EntityHandle,
        from: &mut ByteReservation,
        restoring: bool,
    ) -> Result<(), ExecutionError> {
        let (after, metadata) = self.component_memory(handle, operational_bytes)?;
        settle_component(
            &metadata.budget,
            &mut metadata.storage,
            &mut metadata.operational,
            after,
            from,
            restoring,
        )
    }

    /// Practice grows only on released or revoked personal support. Generic
    /// inventory, body and movement writes need not inspect its retained rows.
    pub(crate) fn settle_practice_memory(
        &mut self,
        handle: EntityHandle,
        from: &mut ByteReservation,
        restoring: bool,
    ) -> Result<(), ExecutionError> {
        let (after, metadata) = self.component_memory(handle, practice_bytes)?;
        settle_component(
            &metadata.budget,
            &mut metadata.storage,
            &mut metadata.practice,
            after,
            from,
            restoring,
        )
    }

    fn component_memory(
        &mut self,
        handle: EntityHandle,
        measure: impl FnOnce(&Entity) -> Result<usize, ExecutionError>,
    ) -> Result<(usize, &mut EntityMetadata), ExecutionError> {
        let slot = self
            .slots
            .get_mut(handle.slot)
            .filter(|slot| slot.generation == handle.generation)
            .ok_or(ExecutionError::MissingEntity)?;
        let after = measure(slot.entity.as_ref().ok_or(ExecutionError::MissingEntity)?)?;
        let metadata = slot
            .metadata_storage
            .as_mut()
            .ok_or(ExecutionError::Invariant)?;
        Ok((after, metadata))
    }

    pub(crate) fn settle_participation_memory(
        &mut self,
        handle: EntityHandle,
        from: &mut ByteReservation,
        restoring: bool,
    ) -> Result<(), ExecutionError> {
        let slot = self
            .slots
            .get_mut(handle.slot)
            .filter(|slot| slot.generation == handle.generation)
            .ok_or(ExecutionError::MissingEntity)?;
        let after =
            participation_bytes(slot.entity.as_ref().ok_or(ExecutionError::MissingEntity)?)?;
        let metadata = slot
            .metadata_storage
            .as_mut()
            .ok_or(ExecutionError::Invariant)?;
        let total = metadata
            .storage
            .bytes()
            .checked_sub(metadata.participation)
            .and_then(|n| n.checked_add(after))
            .ok_or(ExecutionError::Capacity)?;
        if total > metadata.storage.bytes() {
            let growth = from.split_off(total - metadata.storage.bytes())?;
            if restoring {
                metadata
                    .budget
                    .restore_backing(&mut metadata.storage, growth)?;
            } else {
                metadata
                    .budget
                    .fund_backing(&mut metadata.storage, growth)?;
            }
        }
        metadata.storage.resize(total)?;
        metadata.participation = after;
        Ok(())
    }
    pub(crate) fn fund_entity_metadata(
        &mut self,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        self.fund_store_metadata(budget)?;
        for slot in &mut self.slots {
            let Some(entity) = &slot.entity else { continue };
            if slot.metadata_storage.is_some() {
                return Err(ExecutionError::Invariant);
            }
            slot.metadata_storage = Some(EntityMetadata::new(entity, budget)?);
        }
        Ok(())
    }
    pub(crate) fn settle_semantic_memory(
        &mut self,
        handle: EntityHandle,
        from: &mut ByteReservation,
        restoring: bool,
    ) -> Result<(), ExecutionError> {
        let slot = self
            .slots
            .get_mut(handle.slot)
            .filter(|slot| slot.generation == handle.generation)
            .ok_or(ExecutionError::MissingEntity)?;
        let after = semantic_bytes(slot.entity.as_ref().ok_or(ExecutionError::MissingEntity)?)?;
        let metadata = slot
            .metadata_storage
            .as_mut()
            .ok_or(ExecutionError::Invariant)?;
        let total = metadata
            .storage
            .bytes()
            .checked_sub(metadata.semantic)
            .and_then(|n| n.checked_add(after))
            .ok_or(ExecutionError::Capacity)?;
        if total > metadata.storage.bytes() {
            let growth = from.split_off(total - metadata.storage.bytes())?;
            if restoring {
                metadata
                    .budget
                    .restore_backing(&mut metadata.storage, growth)?
            } else {
                metadata
                    .budget
                    .fund_backing(&mut metadata.storage, growth)?
            }
        }
        metadata.storage.resize(total)?;
        metadata.semantic = after;
        Ok(())
    }
}
