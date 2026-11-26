//! A saved membership must resolve in both directions. An intact part has a
//! single physical placement. Protected material may instead be lowered into
//! the world-owned pile until its claim is reclaimed.
use super::*;
use crate::install::InstallError;
use crate::state::{Entity, EntityStore, Individuality, Placement, Point};
use crate::values::is_safe_record_id;

impl Assembly {
    pub(crate) fn family(&self) -> &DefinitionPin {
        match self {
            Self::Shelter { family, .. } | Self::Boundary { family, .. } => family,
        }
    }
    pub(crate) fn retirement(&self) -> Option<&Retirement> {
        match self {
            Self::Shelter { retired, .. } | Self::Boundary { retired, .. } => retired.as_ref(),
        }
    }
    pub(crate) fn slot(&self, item: &str) -> Option<&str> {
        match self {
            Self::Shelter { parts, .. } => parts
                .get(item)
                .filter(|part| part.item_id == item)
                .map(|part| part.slot.as_str()),
            Self::Boundary { parts, .. } => parts
                .get(item)
                .filter(|part| part.item_id == item)
                .map(|part| part.slot.as_str()),
        }
    }
    pub(crate) fn installed_part<'a>(
        &self,
        entities: &'a EntityStore,
        root: &str,
        id: &str,
    ) -> Option<(&'a Entity, Point)> {
        let part = entities.get(id)?;
        let material = part.item.as_ref()?;
        let claim = material.assembly_claim.as_ref()?;
        if material.quantity != 1
            || material.individuality != Individuality::Individual
            || claim.root_id != root
            || claim.family != *self.family()
        {
            return None;
        }
        match &part.placement {
            Some(Placement::Attached {
                parent_entity_id,
                port_id,
                slot: Some(slot),
                local: Some(local),
                ..
            }) if parent_entity_id == root
                && port_id == "assembly"
                && Some(slot.as_str()) == self.slot(id) =>
            {
                Some((part, *local))
            }
            _ => None,
        }
    }
    pub(crate) fn validate_material(
        &self,
        entity: &Entity,
        definitions: &crate::install::RetainedDefinitions,
        pile: &str,
        entities: &EntityStore,
    ) -> Result<(), InstallError> {
        let bad = || InstallError::CurrentFormat;
        let lot = entity.item.as_ref().ok_or_else(bad)?;
        let claim = lot.assembly_claim.as_ref().ok_or_else(bad)?;
        if self.family() != &claim.family
            || self.retirement().is_some()
            || lot.quantity != 1
            || lot.individuality != Individuality::Individual
        {
            return Err(bad());
        }
        if self.slot(&entity.id).is_none()
            && !matches!(&entity.placement,Some(Placement::Contained{parent_entity_id,..})
            if entities.get(parent_entity_id).is_some_and(|parent|parent.kind == pile))
        {
            return Err(bad());
        }
        let definition = definitions
            .items
            .get(&lot.definition_pin.id)
            .ok_or_else(bad)?;
        let family = definitions
            .structures
            .get(&claim.family.id)
            .ok_or_else(bad)?;
        if family.pin != claim.family {
            return Err(InstallError::DefinitionPin);
        }
        let supported = match &family.rules {
            family::FamilyRules::Boundary(rules) => {
                [
                    BoundaryRole::Post,
                    BoundaryRole::GatePost,
                    BoundaryRole::Panel,
                    BoundaryRole::AccessPanel,
                    BoundaryRole::Gate,
                    BoundaryRole::FirstRail,
                    BoundaryRole::Binding,
                ]
                .into_iter()
                .any(|role| rules.roles.for_role(role) == &lot.definition_pin)
                    || rules
                        .salvage
                        .outputs
                        .values()
                        .flatten()
                        .any(|out| out.definition == lot.definition_pin)
            }
            family::FamilyRules::Shelter(_) => definition
                .assembly_material
                .as_ref()
                .is_some_and(|material| material.family_id == claim.family.id),
        };
        if supported {
            Ok(())
        } else {
            Err(InstallError::DefinitionPin)
        }
    }
    pub(crate) fn validate_root(
        &self,
        entity: &Entity,
        entities: &EntityStore,
        family: &family::InstalledFamily,
        now: f64,
    ) -> Result<(), InstallError> {
        let invalid = InstallError::CurrentFormat;
        let (request_id, edit, empty) = match self {
            Self::Shelter {
                request_id,
                active_edit,
                parts,
                joints,
                ..
            } => (
                request_id,
                active_edit,
                parts.is_empty() && joints.is_empty(),
            ),
            Self::Boundary {
                request_id,
                active_edit,
                parts,
                joints,
                sections,
                gates,
                ..
            } => (
                request_id,
                active_edit,
                parts.is_empty() && joints.is_empty() && sections.is_empty() && gates.is_empty(),
            ),
        };
        if family.pin != *self.family()
            || !is_safe_record_id(request_id)
            || entity.kind != "assembly"
            || entity.item.is_some()
            || entity.actor.is_some()
            || geometry::Axes::room(
                Point {
                    x: 0.,
                    y: 0.,
                    z: 0.,
                },
                entity.spatial.heading,
            )
            .is_none()
            || edit.as_ref().is_some_and(|edit| {
                !is_safe_record_id(&edit.invocation_id)
                    || entities
                        .get(&edit.actor_id)
                        .and_then(|actor| actor.actor.as_ref())
                        .and_then(|actor| actor.action.as_ref())
                        .is_none_or(|action| action.id != edit.invocation_id)
            })
        {
            return Err(invalid);
        }
        if let Some(retired) = self.retirement() {
            if !empty
                || entity.placement.is_some()
                || !retired.at.is_finite()
                || retired.at < 0.
                || retired.at > now
                || !is_safe_record_id(&retired.cause)
                || edit.is_some()
            {
                return Err(invalid);
            }
            return Ok(());
        }
        if entity.world_support().is_none() {
            return Err(invalid);
        }
        match (self, &family.rules) {
            (
                Self::Shelter {
                    arrangement_id,
                    parts,
                    joints,
                    ..
                },
                family::FamilyRules::Shelter(rules),
            ) => {
                let layout = rules
                    .arrangements
                    .iter()
                    .find(|entry| &entry.id == arrangement_id)
                    .ok_or(invalid)?;
                if parts.len() > rules.limits.parts {
                    return Err(InstallError::CurrentFormat);
                }
                for (index, (id, part)) in parts.iter().enumerate() {
                    let (_, local) = self
                        .installed_part(entities, &entity.id, id)
                        .ok_or(InstallError::CurrentFormat)?;
                    if part.bay >= layout.maximum_bays as u64
                        || parts.values().take(index).any(|p| p.slot == part.slot)
                    {
                        return Err(InstallError::CurrentFormat);
                    }
                    let slot = |offset: u64, row: usize| format!("{}:{}", part.bay + offset, row);
                    match part.role {
                        ShelterRole::Post => {
                            let found = [(0, 0), (0, 1), (1, 0), (1, 1)]
                                .into_iter()
                                .find(|(offset, row)| slot(*offset, *row) == part.slot);
                            let (offset, row) = found.ok_or(InstallError::CurrentFormat)?;
                            let expected = Point {
                                x: -(rules.bay.width / 2.)
                                    + (part.bay + offset) as f64 * rules.bay.width,
                                y: 0.,
                                z: if row == 0 {
                                    -rules.bay.length / 2.
                                } else {
                                    rules.bay.length / 2.
                                },
                            };
                            if local != expected {
                                return Err(InstallError::CurrentFormat);
                            }
                        }
                        ShelterRole::Cover => {
                            let expected = Point {
                                x: part.bay as f64 * rules.bay.width,
                                y: (layout.row_heights[0] + layout.row_heights[1]) / 2.,
                                z: 0.,
                            };
                            if local != expected {
                                return Err(InstallError::CurrentFormat);
                            }
                            for (corner, (offset, row)) in
                                [(0, 0), (0, 1), (1, 1), (1, 0)].into_iter().enumerate()
                            {
                                let mut corner_joints = joints.values().filter(|joint| {
                                    joint.cover_id == *id && joint.corner as usize == corner
                                });
                                let joint =
                                    corner_joints.next().ok_or(InstallError::CurrentFormat)?;
                                if corner_joints.next().is_some()
                                    || parts
                                        .get(&joint.post_id)
                                        .is_none_or(|post| post.slot != slot(offset, row))
                                {
                                    return Err(InstallError::CurrentFormat);
                                }
                            }
                        }
                        ShelterRole::Binding => {
                            let mut bound = joints.values().filter(|joint| joint.binding_id == *id);
                            let joint = bound.next().ok_or(InstallError::CurrentFormat)?;
                            let (_, post) = self
                                .installed_part(entities, &entity.id, &joint.post_id)
                                .ok_or(InstallError::CurrentFormat)?;
                            let row = usize::from(joint.corner == 1 || joint.corner == 2);
                            if local
                                != (Point {
                                    y: layout.row_heights[row],
                                    ..post
                                })
                                || bound.next().is_some()
                            {
                                return Err(InstallError::CurrentFormat);
                            }
                        }
                    }
                }
                for (id, joint) in joints {
                    if joint.id != *id
                        || joint.corner > 3
                        || parts.get(&joint.cover_id).map(|p| p.role) != Some(ShelterRole::Cover)
                        || parts.get(&joint.post_id).map(|p| p.role) != Some(ShelterRole::Post)
                        || parts.get(&joint.binding_id).map(|p| p.role)
                            != Some(ShelterRole::Binding)
                    {
                        return Err(InstallError::CurrentFormat);
                    }
                }
            }
            (Self::Boundary { .. }, family::FamilyRules::Boundary(rules)) => {
                self.validate_boundary(entities, &entity.id, rules)?
            }
            _ => return Err(InstallError::DefinitionPin),
        }
        Ok(())
    }
}
