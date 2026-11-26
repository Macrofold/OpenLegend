//! One physical description feeds scene queries, gate clearance and exposure.
//! A parked leaf, joined runners and an aperture retain their individual solids.
use super::{
    family::{BoundaryRules, FamilyRules, Sheet},
    geometry::Axes,
    *,
};
use crate::geometry::{FinitePanel, SpatialBlocker};
use crate::install::{InstallError, RetainedDefinitions};
use crate::state::{Bounds, Entity, EntityStore, Point};

fn extent(points: impl IntoIterator<Item = Point>) -> Option<Bounds> {
    let mut points = points.into_iter();
    let first = points.next()?;
    Some(points.fold(
        Bounds {
            min: first,
            max: first,
        },
        |mut out, p| {
            out.min.x = out.min.x.min(p.x);
            out.max.x = out.max.x.max(p.x);
            out.min.y = out.min.y.min(p.y);
            out.max.y = out.max.y.max(p.y);
            out.min.z = out.min.z.min(p.z);
            out.max.z = out.max.z.max(p.z);
            out
        },
    ))
}

enum Shape {
    Post(bool),
    Panel(bool),
    Leaf,
    Rail(bool),
    Hanger,
    Tie,
}
fn boundary_solid(rules: &BoundaryRules, shape: Shape, at: Axes, id: &str) -> SpatialBlocker {
    let section = &rules.geometry.section;
    let slider = &rules.geometry.gate;
    let centered = |width: f64| (-width / 2., width / 2.);
    let mut pieces = Vec::new();
    let material;
    let bounds = match shape {
        Shape::Post(gate) => {
            material = &rules.materials.post;
            let side = centered(section.post_section);
            at.bounds(
                side,
                (
                    0.,
                    if gate {
                        section.gate_post_height
                    } else {
                        section.post_height
                    },
                ),
                side,
            )
        }
        Shape::Panel(aperture) => {
            material = &rules.materials.panel;
            let (left, right) = centered(section.panel_width);
            let thick = centered(section.panel_thickness);
            if aperture {
                let hole = &section.access_opening;
                let edge = hole.width / 2.;
                pieces.extend([
                    at.bounds((left, -edge), (0., section.panel_height), thick),
                    at.bounds((edge, right), (0., section.panel_height), thick),
                    at.bounds((-edge, edge), (0., hole.bottom), thick),
                    at.bounds((-edge, edge), (hole.top, section.panel_height), thick),
                ]);
            }
            at.bounds((left, right), (0., section.panel_height), thick)
        }
        Shape::Leaf => {
            material = &rules.materials.panel;
            at.bounds(
                centered(slider.width),
                (0., slider.height),
                centered(slider.thickness),
            )
        }
        Shape::Rail(first) => {
            material = &rules.materials.post;
            let (start, end) = centered(slider.rail_length);
            let lap = slider.rail_length - section.spacing;
            let thick = centered(slider.rail_section);
            if first {
                pieces.extend([
                    at.bounds((start, end - lap), thick, thick),
                    at.bounds((end - lap, end), (thick.0, 0.), thick),
                ]);
            } else {
                pieces.extend([
                    at.bounds((start, start + lap), (0., thick.1), thick),
                    at.bounds((start + lap, end), thick, thick),
                ]);
            }
            at.bounds((start, end), thick, thick)
        }
        Shape::Hanger => {
            material = &rules.materials.binding;
            let thick = centered(slider.hanger_section);
            at.bounds(
                thick,
                (slider.height, slider.rail_height - slider.rail_section / 2.),
                thick,
            )
        }
        Shape::Tie => {
            material = &rules.materials.binding;
            let thick = centered(rules.presentation.binding_size);
            let length =
                slider.inside_offset - slider.rail_section / 2. - section.post_section / 2.;
            at.bounds(thick, thick, centered(length))
        }
    };
    SpatialBlocker {
        id: id.to_owned(),
        bounds,
        boxes: (!pieces.is_empty()).then_some(pieces),
        panel: None,
        non_walkable: Some(true),
        movement: true,
        sight: true,
        acoustic_transmission: 1.,
        material: material.clone(),
    }
}

fn roof(
    frame: Axes,
    bay: &family::Bay,
    bay_id: u64,
    h: [f64; 2],
    sheet: &Sheet,
) -> (Bounds, FinitePanel) {
    let rise = h[1] - h[0];
    let span = bay.length.hypot(rise);
    let half_run = sheet.length * bay.length / span / 2.;
    let half_rise = sheet.length * rise / span / 2.;
    let center = bay.width * bay_id as f64;
    let mid = (h[0] + h[1]) / 2.;
    let corners = [
        frame.point(center - sheet.width / 2., -half_run, mid - half_rise),
        frame.point(center - sheet.width / 2., half_run, mid + half_rise),
        frame.point(center + sheet.width / 2., half_run, mid + half_rise),
        frame.point(center + sheet.width / 2., -half_run, mid - half_rise),
    ];
    let drop = frame
        .at(Point {
            x: 0.,
            y: 0.,
            z: 0.,
        })
        .point(
            0.,
            rise * sheet.thickness / span,
            -bay.length * sheet.thickness / span,
        );
    let bounds = extent(corners.into_iter().flat_map(|p| {
        [
            p,
            Point {
                x: p.x + drop.x,
                y: p.y + drop.y,
                z: p.z + drop.z,
            },
        ]
    }))
    .expect("four admitted sheet corners");
    (
        bounds,
        FinitePanel {
            corners,
            thickness: sheet.thickness,
        },
    )
}

impl Assembly {
    pub(crate) fn append_solids(
        &self,
        root: &Entity,
        entities: &EntityStore,
        definitions: &RetainedDefinitions,
        output: &mut Vec<SpatialBlocker>,
        covers: &mut Vec<crate::geometry::rain::Cover>,
    ) -> Result<(), InstallError> {
        if self.retirement().is_some() {
            return Ok(());
        }
        let bad = || InstallError::CurrentFormat;
        let installed = definitions
            .structures
            .get(&self.family().id)
            .ok_or_else(bad)?;
        let room = Axes::room(root.world_position().ok_or_else(bad)?, root.spatial.heading)
            .ok_or_else(bad)?;
        let part = |id: &str| self.installed_part(entities, &root.id, id).ok_or_else(bad);
        let position = |id: &str| {
            let (_, local) = part(id)?;
            Ok::<_, InstallError>(room.point(local.x, local.z, local.y))
        };
        match (self, &installed.rules) {
            (
                Self::Shelter {
                    parts,
                    arrangement_id,
                    ..
                },
                FamilyRules::Shelter(rules),
            ) => {
                let heights = rules
                    .arrangements
                    .iter()
                    .find(|a| a.id == *arrangement_id)
                    .ok_or_else(bad)?
                    .row_heights;
                for (id, attached) in parts {
                    if attached.role == ShelterRole::Binding {
                        continue;
                    }
                    let (entity, _) = part(id)?;
                    let lot = entity.item.as_ref().ok_or_else(bad)?;
                    let material = definitions
                        .items
                        .get(&lot.definition_pin.id)
                        .and_then(|v| v.assembly_material.as_ref())
                        .ok_or_else(bad)?;
                    let (bounds, panel, material_name) = match attached.role {
                        ShelterRole::Post => {
                            let r = rules.bay.post_section / 2.;
                            (
                                room.at(position(id)?).bounds(
                                    (-r, r),
                                    (0., material.post_height.ok_or_else(bad)?),
                                    (-r, r),
                                ),
                                None,
                                &rules.materials.post,
                            )
                        }
                        ShelterRole::Cover => {
                            let profile = rules
                                .cover_profiles
                                .iter()
                                .find(|p| Some(&p.pin) == material.cover_profile.as_ref())
                                .ok_or_else(bad)?;
                            let (bounds, panel) =
                                roof(room, &rules.bay, attached.bay, heights, &profile.sheet);
                            covers.push(
                                crate::geometry::rain::Cover::prepare(
                                    id.clone(),
                                    &bounds,
                                    &panel,
                                    profile.sheet.transmission,
                                )
                                .ok_or_else(bad)?,
                            );
                            (bounds, Some(panel), &rules.materials.cover)
                        }
                        ShelterRole::Binding => unreachable!(),
                    };
                    let cover = panel.is_some();
                    output.push(SpatialBlocker {
                        id: id.clone(),
                        bounds,
                        panel,
                        boxes: None,
                        non_walkable: cover.then_some(true),
                        movement: true,
                        sight: !cover,
                        acoustic_transmission: if cover { 1. } else { 0. },
                        material: material_name.clone(),
                    });
                }
            }
            (
                Self::Boundary {
                    parts,
                    sections,
                    gates,
                    ..
                },
                FamilyRules::Boundary(rules),
            ) => {
                for (id, attached) in parts {
                    if matches!(attached.role, BoundaryRole::Post | BoundaryRole::GatePost) {
                        output.push(boundary_solid(
                            rules,
                            Shape::Post(attached.role == BoundaryRole::GatePost),
                            room.at(position(id)?),
                            id,
                        ));
                    }
                }
                for section in sections.values() {
                    let (_, from, to) = section.identity();
                    let axis = Axes::section(
                        position(from)?,
                        position(to)?,
                        rules.geometry.section.spacing,
                    )
                    .ok_or_else(bad)?;
                    let mut add = |shape, id: &str| -> Result<(), InstallError> {
                        output.push(boundary_solid(rules, shape, axis.at(position(id)?), id));
                        Ok(())
                    };
                    match section {
                        Section::Panel(p) | Section::AccessPanel(p) => add(
                            Shape::Panel(matches!(section, Section::AccessPanel(_))),
                            &p.panel_id,
                        )?,
                        Section::Gate(g) => {
                            let gate = gates.get(&g.gate_id).ok_or_else(bad)?;
                            add(Shape::Leaf, &g.gate_id)?;
                            for (index, id) in gate.rail_ids.iter().enumerate() {
                                add(Shape::Rail(index == 0), id)?;
                            }
                            for (index, id) in gate.binding_ids.iter().enumerate() {
                                add(if index < 4 { Shape::Tie } else { Shape::Hanger }, id)?;
                            }
                        }
                    }
                }
            }
            _ => return Err(bad()),
        }
        Ok(())
    }
}
