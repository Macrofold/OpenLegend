//! Build the outward description from the same actual pieces that govern
//! movement. The receipt owns its copy and never carries a grant or material origin.
use super::{Assembly, BoundaryRole, ShelterRole, family::FamilyRules, geometry::Axes};
use crate::{
    execution::ExecutionError,
    host::{ByteBudget, ByteReservation, retained_size::HeapBytes},
    simulation::SimulationState,
    state::{Bounds, Entity, SurfacePoint},
    worlds::base_observed::{
        self as outward, AssemblyPresentation, AssemblyRole, ObservedAssembly, ObservedAssemblyShape,
    },
};
use std::mem::size_of;

pub(crate) fn prepare(
    state: &SimulationState,
    root: &Entity,
    budget: &ByteBudget,
) -> Result<Option<(ObservedAssembly, ByteReservation)>, ExecutionError> {
    let Some(assembly) = root.assembly.as_deref().filter(|a| a.retirement().is_none()) else {
        return Ok(None);
    };
    let invalid = || ExecutionError::Invariant;
    let entities = &state.physical.entities;
    let (position, support) = root.world_support().ok_or_else(invalid)?;
    let blockers = state.physical.structures.as_ref().ok_or_else(invalid)?.root(&root.id);
    let family_id = &assembly.family().id;
    let family = &state.installed.retained.structures.get(family_id).ok_or_else(invalid)?.rules;
    let display = match family {
        FamilyRules::Shelter(rules) => &rules.presentation,
        FamilyRules::Boundary(rules) => &rules.presentation,
    };
    let mut custody = budget.reserve(
        size_of::<ObservedAssembly>() + family_id.len() + support.len()
            + display.post_color.len() + display.cover_color.len(),
    )?;
    let mut shapes = Vec::new();
    let piece_count = blockers.iter().try_fold(0usize, |sum, solid| {
        sum.checked_add(solid.boxes.as_ref().map_or(1, Vec::len))
    }).ok_or(ExecutionError::Capacity)?;
    let shape = |id: &str, role, bounds: &Bounds, panel| ObservedAssemblyShape {
        id: id.to_owned(), role, min: bounds.min, max: bounds.max, geometry: None, panel,
    };
    let material = |id: &str| assembly.installed_part(entities, &root.id, id).ok_or_else(invalid);
    let shelter = matches!(assembly, Assembly::Shelter { .. });
    let presentation = AssemblyPresentation {
        post_color: display.post_color.clone(),
        cover_color: display.cover_color.clone(),
        cover_opacity: outward::assembly_opacity(shelter),
    };
    let site = SurfacePoint {
        x: position.x, y: position.y, z: position.z, surface_id: support.to_owned(),
    };
    let heading = root.spatial.heading;
    let value = match assembly {
        Assembly::Shelter { arrangement_id, parts, revision, .. } => {
            let bindings = parts.values().filter(|p| p.role == ShelterRole::Binding).count();
            admit_shapes(&mut shapes, &mut custody, piece_count.checked_add(bindings).ok_or(ExecutionError::Capacity)?)?;
            let axes = Axes::room(position, heading).ok_or_else(invalid)?;
            let mut observed = Vec::new();
            grow(&mut custody, parts.len().checked_mul(size_of::<outward::FlexiblePart>()).ok_or(ExecutionError::Capacity)?)?;
            grow(&mut custody, arrangement_id.len())?;
            observed.try_reserve_exact(parts.len()).map_err(|_| ExecutionError::Capacity)?;
            for (id, part) in parts {
                let (entity, local) = material(id)?;
                let role = match part.role {
                    ShelterRole::Post => outward::FlexibleRole::Post,
                    ShelterRole::Cover => outward::FlexibleRole::Cover,
                    ShelterRole::Binding => {
                        let half = display.binding_size / 2.0;
                        let centre = axes.point(local.x, local.z, local.y);
                        let bounds = axes.at(centre).bounds((-half, half), (0.0, half), (-half, half));
                        grow(&mut custody, id.len())?;
                        shapes.push(shape(id, AssemblyRole::Binding, &bounds, None));
                        outward::FlexibleRole::Binding
                    }
                };
                grow(&mut custody, id.len() + entity.name.storage_bytes() + part.slot.len())?;
                observed.push(outward::FlexiblePart {
                    id: id.clone(), name: entity.name.clone(), slot: part.slot.clone(),
                    condition: None, role, bay: part.bay,
                });
            }
            for solid in blockers {
                grow(&mut custody, solid.id.len())?;
                let role = if solid.panel.is_some() { AssemblyRole::Cover } else { AssemblyRole::Post };
                let panel = solid.panel.as_ref().map(|panel| outward::FinitePanel {
                    corners: panel.corners, thickness: panel.thickness,
                });
                shapes.push(shape(&solid.id, role, &solid.bounds, panel));
            }
            ObservedAssembly::FlexibleBays {
                presentation, family_id: family_id.clone(), revision: *revision, heading, site,
                shapes, arrangement_id: arrangement_id.clone(), parts: observed,
            }
        }
        Assembly::Boundary { parts, revision, .. } => {
            admit_shapes(&mut shapes, &mut custody, piece_count)?;
            grow(&mut custody, 2 + parts.len().checked_mul(size_of::<outward::BoundaryPart>()).ok_or(ExecutionError::Capacity)?)?;
            let mut observed = Vec::new();
            observed.try_reserve_exact(parts.len()).map_err(|_| ExecutionError::Capacity)?;
            for (id, part) in parts {
                let (entity, _) = material(id)?;
                grow(&mut custody, id.len() + entity.name.storage_bytes() + part.slot.len())?;
                observed.push(outward::BoundaryPart {
                    id: id.clone(), name: entity.name.clone(), slot: part.slot.clone(), condition: None,
                    role: boundary_roles(part.role).0,
                });
            }
            for solid in blockers {
                let part = parts.get(&solid.id).ok_or_else(invalid)?;
                let (_, role) = boundary_roles(part.role);
                for bounds in solid.boxes.as_deref().unwrap_or(std::slice::from_ref(&solid.bounds)) {
                    grow(&mut custody, solid.id.len())?;
                    shapes.push(shape(&solid.id, role, bounds, None));
                }
            }
            // Integrity labels require a separate visible face observation.
            ObservedAssembly::GroundedBoundary {
                presentation, family_id: family_id.clone(), revision: *revision, heading, site,
                shapes, material_revision: "[]".into(), parts: observed,
            }
        }
    };
    custody.resize(value.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
    Ok(Some((value, custody)))
}

fn grow(custody: &mut ByteReservation, bytes: usize) -> Result<(), ExecutionError> {
    let total = custody.bytes().checked_add(bytes).ok_or(ExecutionError::Capacity)?;
    custody.resize(total)?;
    Ok(())
}

fn admit_shapes(shapes: &mut Vec<ObservedAssemblyShape>, custody: &mut ByteReservation, count: usize) -> Result<(), ExecutionError> {
    grow(custody, count.checked_mul(size_of::<ObservedAssemblyShape>()).ok_or(ExecutionError::Capacity)?)?;
    shapes.try_reserve_exact(count).map_err(|_| ExecutionError::Capacity)
}

fn boundary_roles(role: BoundaryRole) -> (outward::BoundaryRole, AssemblyRole) {
    use outward::BoundaryRole as Visible;
    match role {
        BoundaryRole::Post => (Visible::Post, AssemblyRole::Post),
        BoundaryRole::GatePost => (Visible::GatePost, AssemblyRole::GatePost),
        BoundaryRole::Panel => (Visible::Panel, AssemblyRole::Panel),
        BoundaryRole::AccessPanel => (Visible::AccessPanel, AssemblyRole::AccessPanel),
        BoundaryRole::Gate => (Visible::Gate, AssemblyRole::Gate),
        BoundaryRole::FirstRail => (Visible::FirstRail, AssemblyRole::FirstRail),
        BoundaryRole::SecondRail => (Visible::SecondRail, AssemblyRole::SecondRail),
        BoundaryRole::Binding => (Visible::Binding, AssemblyRole::Binding),
    }
}
