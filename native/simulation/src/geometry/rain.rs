//! Rectangular rain over a footprint, with an allocation-free open-air path.
//! Selected weather supplies at most two sources and combines them by maximum.

use crate::{
    weather::IncidentRain,
    work::{WorkError, WorkMeters, WorkUnit},
};

mod cover;
pub(crate) use cover::{Cover, Footprint, LocalCovers};

const AXIS_EDGES: usize = 6;
const MOTION_CUTS: usize = 20;

#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Rectangle {
    pub min_x: f64,
    pub max_x: f64,
    pub min_z: f64,
    pub max_z: f64,
}

impl Rectangle {
    pub(crate) fn between(self, next: Self, time: f64) -> Self {
        let mix = |a, b| a + (b - a) * time;
        Self {
            min_x: mix(self.min_x, next.min_x),
            max_x: mix(self.max_x, next.max_x),
            min_z: mix(self.min_z, next.min_z),
            max_z: mix(self.max_z, next.max_z),
        }
    }
}

#[derive(Debug)]
pub(crate) enum ExposureError {
    Capacity,
    Invalid,
    Work(WorkError),
}

impl From<WorkError> for ExposureError {
    fn from(error: WorkError) -> Self {
        Self::Work(error)
    }
}

impl From<crate::host::CapacityError> for ExposureError {
    fn from(_: crate::host::CapacityError) -> Self {
        Self::Capacity
    }
}

struct Edges<const N: usize> {
    values: [f64; N],
    len: usize,
}

impl<const N: usize> Edges<N> {
    fn endpoints(min: f64, max: f64) -> Self {
        let mut values = [0.0; N];
        values[..2].copy_from_slice(&[min, max]);
        Self { values, len: 2 }
    }

    fn push_inside(&mut self, edge: f64) {
        if self.values[0] < edge && edge < self.values[1] {
            self.values[self.len] = edge;
            self.len += 1;
        }
    }

    fn sorted_unique(&mut self) -> &[f64] {
        self.values[..self.len].sort_unstable_by(f64::total_cmp);
        let mut unique = 1;
        for index in 1..self.len {
            if self.values[index] != self.values[unique - 1] {
                self.values[unique] = self.values[index];
                unique += 1;
            }
        }
        &self.values[..unique]
    }
}

/// Compute the same pointwise maximum and operation order as Source. A
/// footprint intersecting two sources has at most five cells on either axis.
/// The advancing candidate admits those tests before visiting them.
pub(crate) fn incident_exposure(
    target: Rectangle,
    sources: &[Option<IncidentRain>; 2],
    work: Option<&mut WorkMeters>,
) -> Result<f64, ExposureError> {
    let area = (target.max_x - target.min_x) * (target.max_z - target.min_z);
    if target.min_x >= target.max_x
        || target.min_z >= target.max_z
        || !(area > 0.0 && area.is_finite())
    {
        return Err(ExposureError::Invalid);
    }
    let rain = sources.iter().flatten();
    if rain.clone().next().is_none() {
        return Ok(0.0);
    }
    let mut xs = Edges::<AXIS_EDGES>::endpoints(target.min_x, target.max_x);
    let mut zs = Edges::<AXIS_EDGES>::endpoints(target.min_z, target.max_z);
    for bounds in rain.clone() {
        xs.push_inside(bounds.min_x);
        xs.push_inside(bounds.max_x);
        zs.push_inside(bounds.min_z);
        zs.push_inside(bounds.max_z);
    }
    let xs = xs.sorted_unique();
    let zs = zs.sorted_unique();
    if let Some(work) = work {
        let comparisons = (xs.len() - 1) * (zs.len() - 1) * rain.clone().count();
        work.charge(&[(WorkUnit::Candidates, comparisons as u64)])?;
    }
    let mut incident = 0.0;
    for x in xs.windows(2) {
        for z in zs.windows(2) {
            let cx = (x[0] + x[1]) / 2.0;
            let cz = (z[0] + z[1]) / 2.0;
            let cell = (x[1] - x[0]) * (z[1] - z[0]);
            let intensity = rain
                .clone()
                .filter(|source| {
                    (source.min_x..=source.max_x).contains(&cx)
                        && (source.min_z..=source.max_z).contains(&cz)
                })
                .map(|source| source.intensity)
                .fold(0.0, f64::max);
            incident += cell * intensity;
        }
    }
    let fraction = incident / area;
    Ok(if fraction < 1e-12 {
        0.0
    } else if fraction > 1.0 - 1e-12 {
        1.0
    } else {
        fraction
    })
}

/// Visit only pairs containing a moving edge. Two axes, two moving edges
/// and at most four fixed edges per axis give eighteen possible cuts.
pub(crate) fn exposure_crossings(
    from: Rectangle,
    to: Rectangle,
    sources: &[Option<IncidentRain>; 2],
    work: &mut WorkMeters,
) -> Result<impl AsRef<[f64]> + use<>, ExposureError> {
    let mut cuts = Edges::<MOTION_CUTS>::endpoints(0.0, 1.0);
    if from != to {
        let tests = 2 * (1 + 4 * sources.iter().flatten().count());
        work.charge(&[(WorkUnit::Tests, tests as u64)])?;
        let mut add = |a: [f64; 2], b: [f64; 2]| {
            let start = a[0] - b[0];
            let end = a[1] - b[1];
            if start != end {
                cuts.push_inside(-start / (end - start));
            }
        };
        let xs = [[from.min_x, to.min_x], [from.max_x, to.max_x]];
        let zs = [[from.min_z, to.min_z], [from.max_z, to.max_z]];
        add(xs[0], xs[1]);
        add(zs[0], zs[1]);
        for rain in sources.iter().flatten() {
            for edge in xs {
                add(edge, [rain.min_x; 2]);
                add(edge, [rain.max_x; 2]);
            }
            for edge in zs {
                add(edge, [rain.min_z; 2]);
                add(edge, [rain.max_z; 2]);
            }
        }
    }
    cuts.len = cuts.sorted_unique().len();
    work.charge(&[(WorkUnit::Candidates, cuts.len as u64)])?;
    Ok(cuts)
}

impl<const N: usize> AsRef<[f64]> for Edges<N> {
    fn as_ref(&self) -> &[f64] {
        &self.values[..self.len]
    }
}
