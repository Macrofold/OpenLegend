//! Restore the section joints from the actual attached parts. Serialized role
//! names alone cannot grant a gate, relocate a panel or invent a material.
use super::{family::BoundaryRules, geometry::Axes, *};
use crate::install::InstallError;
use crate::state::{EntityStore, Point};
use crate::values::is_safe_record_id;
use std::collections::{HashMap, HashSet};

impl Section {
    pub(super) fn identity(&self) -> (&str, &str, &str) {
        match self {
            Self::Panel(p) | Self::AccessPanel(p) => (&p.id, &p.from_post_id, &p.to_post_id),
            Self::Gate(g) => (&g.id, &g.from_post_id, &g.to_post_id),
        }
    }
}

impl Assembly {
    pub(super) fn validate_boundary(
        &self,
        entities: &EntityStore,
        root: &str,
        rules: &BoundaryRules,
    ) -> Result<(), InstallError> {
        let Self::Boundary {
            parts,
            joints,
            sections,
            gates,
            next_section,
            family,
            ..
        } = self
        else {
            return Err(InstallError::CurrentFormat);
        };
        let bad = || InstallError::CurrentFormat;
        let geometry = &rules.geometry;
        let spacing = geometry.section.spacing;
        if parts.len() > rules.limits.parts
            || sections.len() > rules.limits.sections
            || gates.len() > rules.limits.gates
        {
            return Err(bad());
        }
        let mut slots = HashSet::with_capacity(parts.len());
        let mut assigned = HashSet::with_capacity(parts.len());
        let mut used_parking = HashSet::with_capacity(gates.len());
        let mut seen_joints = 0usize;
        let local = |id: &str| {
            self.installed_part(entities, root, id)
                .map(|(_, at)| at)
                .ok_or_else(bad)
        };
        for (id, part) in parts {
            let (item, pos) = self.installed_part(entities, root, id).ok_or_else(bad)?;
            if !is_safe_record_id(id)
                || !slots.insert(&part.slot)
                || item
                    .item
                    .as_ref()
                    .is_none_or(|lot| &lot.definition_pin != rules.roles.for_role(part.role))
            {
                return Err(bad());
            }
            if matches!(part.role, BoundaryRole::Post | BoundaryRole::GatePost) {
                let [x, z]: [i64; 2] = serde_json::from_str(&part.slot).map_err(|_| bad())?;
                if [x, z]
                    .into_iter()
                    .any(|c| c.unsigned_abs() > crate::identity::MAX_SAFE_INTEGER)
                    || part.slot != format!("[{x},{z}]")
                    || pos
                        != (Point {
                            x: x as f64 * spacing,
                            y: 0.,
                            z: z as f64 * spacing,
                        })
                {
                    return Err(bad());
                }
                assigned.insert(id.as_str());
            }
        }
        let mut accept = |id: &str,
                          expected_role: BoundaryRole,
                          slot: &str,
                          expected: Point|
         -> Result<(), InstallError> {
            let (key, part) = parts.get_key_value(id).ok_or_else(bad)?;
            if !assigned.insert(key.as_str())
                || part.role != expected_role
                || part.slot != slot
                || local(id)? != expected
            {
                return Err(bad());
            }
            Ok(())
        };
        let mut neighbors: HashMap<&str, Vec<&str>> = HashMap::new();
        for (id, section) in sections {
            let (own, from, to) = section.identity();
            let index: u64 = id
                .strip_prefix("section-")
                .and_then(|s| s.parse().ok())
                .ok_or_else(bad)?;
            if own != id
                || *id != format!("section-{index}")
                || index >= *next_section
                || from == to
            {
                return Err(bad());
            }
            for (a, b) in [(from, to), (to, from)] {
                if !matches!(
                    parts.get(a).map(|v| v.role),
                    Some(BoundaryRole::Post | BoundaryRole::GatePost)
                ) {
                    return Err(bad());
                }
                let edges = neighbors.entry(a).or_default();
                if edges.len() >= 2 || edges.contains(&b) {
                    return Err(bad());
                }
                edges.push(b);
            }
            let frame = Axes::section(local(from)?, local(to)?, spacing).ok_or_else(bad)?;
            match section {
                Section::Gate(g) => {
                    if gates
                        .get(&g.gate_id)
                        .is_none_or(|gate| gate.section_id != *id)
                    {
                        return Err(bad());
                    }
                }
                Section::Panel(p) | Section::AccessPanel(p) => {
                    let role = if matches!(section, Section::Panel(_)) {
                        BoundaryRole::Panel
                    } else {
                        BoundaryRole::AccessPanel
                    };
                    accept(
                        &p.panel_id,
                        role,
                        &format!("panel:{id}"),
                        frame.point(spacing / 2., 0., 0.),
                    )?;
                    if p.binding_ids.len() != rules.joints.panel_ties.len() {
                        return Err(bad());
                    }
                    for (index, (binding, tie)) in p
                        .binding_ids
                        .iter()
                        .zip(&rules.joints.panel_ties)
                        .enumerate()
                    {
                        let name =
                            serde_json::to_string(&("panel-end", id, index)).map_err(|_| bad())?;
                        let joint = joints.get(&name).ok_or_else(bad)?;
                        let support = match tie.end {
                            0 => from,
                            1 => to,
                            _ => return Err(bad()),
                        };
                        if joint.id != name
                            || joint.kind != JointKind::PanelEnd
                            || joint.index as usize != index
                            || joint.part_id != p.panel_id
                            || joint.support_id != support
                            || joint.binding_id != *binding
                        {
                            return Err(bad());
                        }
                        accept(
                            binding,
                            BoundaryRole::Binding,
                            &name,
                            Point {
                                y: tie.height,
                                ..local(support)?
                            },
                        )?;
                        seen_joints += 1;
                    }
                }
            }
        }
        // Damage may split an open path. A closed loop and a separate fragment
        // may never coexist in the same supported boundary.
        let mut visited = HashSet::with_capacity(neighbors.len());
        let mut components = 0;
        let mut has_cycle = false;
        for vertex in neighbors.keys().copied() {
            if visited.contains(vertex) {
                continue;
            }
            components += 1;
            let mut pending = vec![vertex];
            let mut cycle = true;
            while let Some(v) = pending.pop() {
                if !visited.insert(v) {
                    continue;
                }
                let edges = &neighbors[v];
                cycle &= edges.len() == 2;
                pending.extend(edges.iter().copied().filter(|next| !visited.contains(next)));
            }
            has_cycle |= cycle;
        }
        if components > 1 && has_cycle {
            return Err(bad());
        }
        for (id, gate) in gates {
            let [a, b, c] = &gate.post_ids;
            let Some(Section::Gate(section)) = sections.get(&gate.section_id) else {
                return Err(bad());
            };
            let Some(Section::AccessPanel(park)) = sections.get(&gate.parking_section_id) else {
                return Err(bad());
            };
            if section.gate_id != *id
                || section.from_post_id != *a
                || section.to_post_id != *b
                || a == c
                || !used_parking.insert(&gate.parking_section_id)
                || !((&park.from_post_id == b && &park.to_post_id == c)
                    || (&park.from_post_id == c && &park.to_post_id == b))
                || gate.post_ids.iter().any(|post| {
                    parts
                        .get(post)
                        .is_none_or(|p| p.role != BoundaryRole::GatePost)
                })
                || gate.slide != *family
                || (gate.position == GatePosition::Open && gate.barred)
            {
                return Err(bad());
            }
            let frame = Axes::section(local(a)?, local(b)?, spacing).ok_or_else(bad)?;
            if local(c)? != frame.point(2. * spacing, 0., 0.) {
                return Err(bad());
            }
            let layout = geometry.layout(frame, gate.position, rules.presentation.binding_size);
            accept(
                id,
                BoundaryRole::Gate,
                &format!("gate:{}", gate.section_id),
                layout.leaf,
            )?;
            for (index, rail) in gate.rail_ids.iter().enumerate() {
                let name = serde_json::to_string(&("runner", &gate.section_id, index))
                    .map_err(|_| bad())?;
                let role = if index == 0 {
                    BoundaryRole::FirstRail
                } else {
                    BoundaryRole::SecondRail
                };
                accept(rail, role, &name, layout.rails[index])?;
            }
            for (index, binding) in gate.binding_ids.iter().enumerate() {
                let (kind, label, part, support, point) = if index < 4 {
                    (
                        JointKind::RunnerPost,
                        "runner-post",
                        &gate.rail_ids[index / 2],
                        &gate.post_ids[[0, 1, 1, 2][index]],
                        layout.ties[index],
                    )
                } else {
                    (
                        JointKind::LeafHanger,
                        "leaf-hanger",
                        id,
                        &gate.rail_ids[usize::from(gate.position == GatePosition::Open)],
                        layout.hangers[index - 4],
                    )
                };
                let name =
                    serde_json::to_string(&(label, &gate.section_id, index)).map_err(|_| bad())?;
                let joint = joints.get(&name).ok_or_else(bad)?;
                if joint.id != name
                    || joint.kind != kind
                    || &joint.part_id != part
                    || &joint.support_id != support
                    || joint.binding_id != *binding
                    || joint.index as usize != index
                {
                    return Err(bad());
                }
                accept(binding, BoundaryRole::Binding, &name, point)?;
                seen_joints += 1;
            }
        }
        if seen_joints != joints.len() || assigned.len() != parts.len() {
            return Err(bad());
        }
        Ok(())
    }
}
