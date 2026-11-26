//! The four admitted axis-aligned headings are exact across save and restore.
//! A sliding panel and its two hangers each sweep their own solid. The empty
//! gap above a panel must remain traversable by sight and by moving objects.
use super::GatePosition;
use crate::state::{Bounds, Point};
use serde::Deserialize;

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BoundaryGeometry {
    pub section: SectionGeometry,
    pub gate: SliderGeometry,
}
#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SectionGeometry {
    pub spacing: f64,
    pub post_section: f64,
    pub post_height: f64,
    pub gate_post_height: f64,
    pub panel_width: f64,
    pub panel_height: f64,
    pub panel_thickness: f64,
    pub access_opening: Aperture,
}
#[derive(Clone, Copy, Debug, Deserialize)]
pub(crate) struct Aperture {
    pub width: f64,
    pub bottom: f64,
    pub top: f64,
}
#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SliderGeometry {
    pub travel: f64,
    pub width: f64,
    pub height: f64,
    pub thickness: f64,
    pub inside_offset: f64,
    pub rail_height: f64,
    pub rail_section: f64,
    pub rail_length: f64,
    pub hanger_section: f64,
    pub hanger_half_spacing: f64,
    pub handle_height: f64,
    pub inside_handle_offset: f64,
    pub outside_handle_offset: f64,
}

#[derive(Clone, Copy, Debug)]
pub(crate) struct Axes {
    pub origin: Point,
    // Direction along each section and its inward normal, relative to its parent.
    x: f64,
    z: f64,
}
impl Axes {
    pub(crate) fn room(site: Point, heading: f64) -> Option<Self> {
        use std::f64::consts::{FRAC_PI_2, PI};
        let (x, z) = if heading == 0.0 {
            (1., 0.)
        } else if heading == FRAC_PI_2 {
            (0., -1.)
        } else if heading == PI {
            (-1., 0.)
        } else if heading == 3. * FRAC_PI_2 {
            (0., 1.)
        } else {
            return None;
        };
        Some(Self { origin: site, x, z })
    }
    pub(crate) fn section(from: Point, to: Point, spacing: f64) -> Option<Self> {
        let dx = to.x - from.x;
        let dz = to.z - from.z;
        if spacing <= 0.
            || (dx == 0.) == (dz == 0.)
            || from.y != to.y
            || dx.abs() + dz.abs() != spacing
        {
            return None;
        }
        Some(Self {
            origin: from,
            x: dx / spacing,
            z: dz / spacing,
        })
    }
    pub(crate) fn point(&self, along: f64, inside: f64, height: f64) -> Point {
        Point {
            x: self.origin.x + along * self.x - inside * self.z,
            y: self.origin.y + height,
            z: self.origin.z + along * self.z + inside * self.x,
        }
    }
    pub(crate) fn at(&self, point: Point) -> Axes {
        Axes {
            origin: point,
            ..*self
        }
    }
    pub(super) fn bounds(&self, a: (f64, f64), y: (f64, f64), b: (f64, f64)) -> Bounds {
        let min = self.point(a.0, b.0, y.0);
        let max = self.point(a.1, b.1, y.1);
        Bounds {
            min: Point {
                x: min.x.min(max.x),
                y: min.y,
                z: min.z.min(max.z),
            },
            max: Point {
                x: min.x.max(max.x),
                y: max.y,
                z: min.z.max(max.z),
            },
        }
    }
}

pub(crate) struct SliderLayout {
    pub leaf: Point,
    pub rails: [Point; 2],
    pub ties: [Point; 4],
    pub hangers: [Point; 2],
}
impl BoundaryGeometry {
    fn center(&self, position: GatePosition) -> f64 {
        self.section.spacing / 2.
            + if position == GatePosition::Open {
                self.gate.travel
            } else {
                0.
            }
    }
    pub(crate) fn layout(
        &self,
        frame: Axes,
        position: GatePosition,
        binding_size: f64,
    ) -> SliderLayout {
        let g = self.gate;
        let spacing = self.section.spacing;
        let center = self.center(position);
        let tie_shift = (self.section.post_section - binding_size) / 2.;
        let tie_z = (self.section.post_section / 2. + g.inside_offset - g.rail_section / 2.) / 2.;
        SliderLayout {
            leaf: frame.point(center, g.inside_offset, 0.),
            rails: [0.5 * spacing, 1.5 * spacing]
                .map(|u| frame.point(u, g.inside_offset, g.rail_height)),
            ties: [0., spacing - tie_shift, spacing + tie_shift, 2. * spacing]
                .map(|u| frame.point(u, tie_z, g.rail_height)),
            hangers: [
                center - g.hanger_half_spacing,
                center + g.hanger_half_spacing,
            ]
            .map(|u| frame.point(u, g.inside_offset, 0.)),
        }
    }
    pub(crate) fn handle(&self, frame: Axes, position: GatePosition, inside: bool) -> Point {
        frame.point(
            self.center(position),
            if inside {
                self.gate.inside_handle_offset
            } else {
                self.gate.outside_handle_offset
            },
            self.gate.handle_height,
        )
    }
    pub(crate) fn sweep(&self, frame: Axes, from: GatePosition, to: GatePosition) -> [Bounds; 3] {
        let g = self.gate;
        let first = self.center(from);
        let last = self.center(to);
        let span = |offset: f64, width: f64, heights, thickness: f64| {
            frame.bounds(
                (
                    first.min(last) + offset - width / 2.,
                    first.max(last) + offset + width / 2.,
                ),
                heights,
                (
                    g.inside_offset - thickness / 2.,
                    g.inside_offset + thickness / 2.,
                ),
            )
        };
        let hanger = |offset| {
            span(
                offset,
                g.hanger_section,
                (g.height, g.rail_height - g.rail_section / 2.),
                g.hanger_section,
            )
        };
        [
            span(0., g.width, (0., g.height), g.thickness),
            hanger(-g.hanger_half_spacing),
            hanger(g.hanger_half_spacing),
        ]
    }
}
