//! Match entity-index.ts's actual component groups and order. Status/remains
//! owners retain root order; the other groups use the host's finite ICU answer.
use crate::execution::{CoreMutation, ExecutionError, PhysicalChangeCursor};
use crate::geometry::GeometryBinding;
use crate::host::{ByteBudget, ByteReservation};
use crate::language::{CollationAnswer, CollationError, CollationRanks, CollationRequest};
use crate::simulation::{InstalledWorld, PhysicalState};
use crate::state::{Entity, EntityHandle};
use crate::status::StatusOperation;
use crate::values::AttributeValue;
use std::mem::size_of;

const GROUPS: usize = 12;
const ROOT_ORDER: u16 = (1 << 5) | (1 << 8) | (1 << 9);
const SORTED: u16 = ((1 << GROUPS) - 1) & !ROOT_ORDER;

fn may_advance_status(
    physical: &PhysicalState,
    installed: &InstalledWorld,
    entity: &Entity,
) -> Result<bool, ExecutionError> {
    if entity.actor.is_some()
        || entity
            .status_effects
            .as_ref()
            .is_some_and(|states| states.values().any(|state| state.active))
    {
        return Ok(true);
    }
    let read = installed.status_read(physical);
    for definition in &installed.status_policy.definitions {
        if !definition.enabled
            || definition.automatic_activation.is_none()
            || definition.occupies_action
        {
            continue;
        }
        let mut numeric = true;
        for operation in &definition.while_active {
            let attribute = match operation {
                StatusOperation::Rate { change_rate, .. } => &change_rate.attribute,
                StatusOperation::Every { change_every, .. } => &change_every.attribute,
                StatusOperation::Restrict { .. } => continue,
            };
            if !matches!(
                read.value(&entity.id, attribute)?,
                Some(AttributeValue::Number(_))
            ) {
                numeric = false;
                break;
            }
        }
        if numeric {
            return Ok(true);
        }
    }
    Ok(false)
}
fn membership(
    physical: &PhysicalState,
    installed: &InstalledWorld,
    entity: &Entity,
) -> Result<u16, ExecutionError> {
    if !entity.physical_root() {
        return Ok(0);
    }
    let active = entity.actively_participates()
        && (entity.actor.is_some() || entity.animal.is_some() || entity.heat.is_some());
    let action = entity
        .actor
        .as_ref()
        .and_then(|actor| actor.action.as_ref());
    let flags = [
        active && entity.actor.is_some(),
        active,
        active
            && (entity.animal.is_some()
                || entity.spatial.flight.is_some()
                || entity.spatial.fall_velocity.is_some()),
        active && entity.animal.is_some(),
        active && entity.heat.is_some(),
        entity
            .remains
            .as_ref()
            .is_some_and(|remains| remains.phase != "removed"),
        active
            && entity
                .actor
                .as_ref()
                .is_some_and(|actor| actor.agency.plan.is_some()),
        active && entity.threat.is_some(),
        may_advance_status(physical, installed, entity)?,
        entity.actively_participates()
            && (entity.actor.is_some() || entity.practice_target.is_some()),
        action.is_some_and(|action| {
            action.construction_grant.is_some()
                || action.gate_work.is_some()
                || action.boundary_impact.is_some()
                || action.material_permission.is_some()
        }),
        entity
            .actor
            .as_ref()
            .is_some_and(|actor| actor.controller == "player"),
    ];
    Ok(flags
        .into_iter()
        .enumerate()
        .fold(0, |mask, (bit, present)| mask | (u16::from(present) << bit)))
}
struct Member {
    handle: EntityHandle,
    mask: u16,
}
pub(crate) struct ParticipantPreparation {
    members: Vec<Member>,
    collation: CollationRequest,
    changes: PhysicalChangeCursor,
    at: f64,
    counts: [usize; GROUPS],
    reservation: ByteReservation,
}
pub(crate) struct NativeParticipants {
    groups: [Vec<EntityHandle>; GROUPS],
    _reservation: ByteReservation,
}
impl NativeParticipants {
    pub(crate) fn actors(&self) -> &[EntityHandle] {
        &self.groups[0]
    }
    pub(crate) fn ambient(&self) -> &[EntityHandle] {
        &self.groups[1]
    }
    pub(crate) fn ambient_movers(&self) -> &[EntityHandle] {
        &self.groups[2]
    }
    pub(crate) fn animals(&self) -> &[EntityHandle] {
        &self.groups[3]
    }
    pub(crate) fn heat_sources(&self) -> &[EntityHandle] {
        &self.groups[4]
    }
    pub(crate) fn remains(&self) -> &[EntityHandle] {
        &self.groups[5]
    }
    pub(crate) fn planned_actors(&self) -> &[EntityHandle] {
        &self.groups[6]
    }
    pub(crate) fn territorial(&self) -> &[EntityHandle] {
        &self.groups[7]
    }
    pub(crate) fn statuses(&self) -> &[EntityHandle] {
        &self.groups[8]
    }
    pub(crate) fn projectile_bodies(&self) -> &[EntityHandle] {
        &self.groups[9]
    }
    pub(crate) fn permission_actions(&self) -> &[EntityHandle] {
        &self.groups[10]
    }
    pub(crate) fn players(&self) -> &[EntityHandle] {
        &self.groups[11]
    }
}
impl ParticipantPreparation {
    pub(crate) fn new(
        core: &CoreMutation<'_>,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let physical = &core.state.physical;
        let bytes = size_of::<Self>() + size_of::<NativeParticipants>();
        let mut reservation = budget.reserve(bytes)?;
        let mut members: Vec<Member> = Vec::new();
        let mut counts = [0usize; GROUPS];
        for id in physical.entities.ordered_ids() {
            let entity = physical.entities.get(id).ok_or(ExecutionError::Invariant)?;
            let mask = membership(physical, &core.state.installed, entity)?;
            if mask == 0 {
                continue;
            }
            if members.len() == members.capacity() {
                let capacity = members
                    .capacity()
                    .checked_mul(2)
                    .map(|n| n.max(4))
                    .ok_or(ExecutionError::Capacity)?;
                reservation.resize(
                    reservation
                        .bytes()
                        .checked_add(
                            (capacity - members.capacity())
                                .checked_mul(size_of::<Member>())
                                .ok_or(ExecutionError::Capacity)?,
                        )
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                members
                    .try_reserve_exact(capacity - members.len())
                    .map_err(|_| ExecutionError::Capacity)?;
            }
            for (bit, count) in counts.iter_mut().enumerate() {
                *count += usize::from(mask & (1 << bit) != 0);
            }
            members.push(Member {
                handle: physical
                    .entities
                    .handle(id)
                    .ok_or(ExecutionError::Invariant)?,
                mask,
            });
        }
        let count = counts.iter().try_fold(0usize, |total, n| {
            total.checked_add(*n).ok_or(ExecutionError::Capacity)
        })?;
        reservation.resize(
            reservation
                .bytes()
                .checked_add(
                    count
                        .checked_mul(size_of::<EntityHandle>())
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let collation = CollationRequest::prepare(
            binding,
            members
                .iter()
                .filter(|member| member.mask & SORTED != 0)
                .map(|member| {
                    physical
                        .entities
                        .resolve(member.handle)
                        .expect("member selected in the same read")
                        .id
                        .as_str()
                }),
            budget,
        )
        .map_err(collation_error)?;
        Ok(Self {
            members,
            collation,
            changes: core.journal.physical.change_cursor(),
            at: physical.header.sim_time,
            counts,
            reservation,
        })
    }
    pub(crate) fn request(&self) -> &CollationRequest {
        &self.collation
    }
    pub(crate) fn finish(
        mut self,
        core: &CoreMutation<'_>,
        answer: &CollationAnswer,
    ) -> Result<NativeParticipants, ExecutionError> {
        if core.state.physical.header.sim_time != self.at
            || !core
                .journal
                .physical
                .changes_since(self.changes)?
                .is_empty()
        {
            return Err(ExecutionError::Invariant);
        }
        let ranks: CollationRanks = self.collation.finish(answer).map_err(collation_error)?;
        let entities = &core.state.physical.entities;
        let mut groups: [Vec<EntityHandle>; GROUPS] = std::array::from_fn(|_| Vec::new());
        for (group, count) in groups.iter_mut().zip(self.counts) {
            group
                .try_reserve_exact(count)
                .map_err(|_| ExecutionError::Capacity)?;
        }
        for member in self.members {
            let entity = entities
                .resolve(member.handle)
                .ok_or(ExecutionError::Invariant)?;
            if member.mask & SORTED != 0 {
                ranks.rank(&entity.id).map_err(collation_error)?;
            }
            for (bit, group) in groups.iter_mut().enumerate() {
                if member.mask & (1 << bit) != 0 {
                    group.push(member.handle);
                }
            }
        }
        for (bit, group) in groups.iter_mut().enumerate() {
            if ROOT_ORDER & (1 << bit) != 0 {
                continue;
            }
            group.sort_by(|a, b| {
                let a = &entities.resolve(*a).expect("checked selected member").id;
                let b = &entities.resolve(*b).expect("checked selected member").id;
                ranks
                    .compare(a, b)
                    .expect("complete captured ICU ranks checked above")
            });
        }
        let retained = groups
            .iter()
            .try_fold(size_of::<NativeParticipants>(), |bytes, group| {
                bytes.checked_add(group.capacity().checked_mul(size_of::<EntityHandle>())?)
            })
            .ok_or(ExecutionError::Capacity)?;
        self.reservation.resize(retained)?;
        Ok(NativeParticipants {
            groups,
            _reservation: self.reservation,
        })
    }
}
fn collation_error(error: CollationError) -> ExecutionError {
    match error {
        CollationError::Capacity => ExecutionError::Capacity,
        _ => ExecutionError::Invariant,
    }
}
