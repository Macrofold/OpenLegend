//! Spill-free rain integration for the finite, cardinal shelter panels.
use super::{ExposureError, Rectangle, incident_exposure};
use crate::{
    geometry::FinitePanel,
    host::{ByteBudget, ByteReservation, retained_size::HeapBytes},
    state::Bounds,
    weather::IncidentRain,
    work::{WorkMeters, WorkUnit},
};

const EPS: f64 = 1e-10;

#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Footprint {
    pub rectangle: Rectangle,
    pub height: f64,
    pub slope: [f64; 2],
    pub intercept: f64,
}

impl Footprint {
    pub(crate) fn level(rectangle: Rectangle, height: f64) -> Self {
        Self {
            rectangle,
            height,
            slope: [0.; 2],
            intercept: height,
        }
    }

    pub(crate) fn between(self, end: Self, t: f64) -> Self {
        debug_assert_eq!(self.slope, end.slope);
        Self {
            rectangle: self.rectangle.between(end.rectangle, t),
            height: self.height + (end.height - self.height) * t,
            slope: self.slope,
            intercept: self.intercept + (end.intercept - self.intercept) * t,
        }
    }
}

/// The already-admitted prism reduced to vertical projection constraints.
/// Identities order coincident surfaces deterministically.
pub(crate) struct Cover {
    pub id: String,
    bounds: Rectangle,
    top: Footprint,
    transmission: f64,
    projection: Vec<[f64; 3]>,
    upper: Vec<[f64; 4]>,
}

crate::host::retained_size::heap_record!(Cover {
    id,
    projection,
    upper
});

fn overlap(a: Rectangle, b: Rectangle) -> bool {
    a.min_x < b.max_x && a.max_x > b.min_x && a.min_z < b.max_z && a.max_z > b.min_z
}

impl Cover {
    /// A six-plane prism supplies at most nine upper/lower pairs plus six
    /// vertical planes. Storage is admitted by the owning structure scene.
    pub(crate) const HEAP_BOUND: usize = 15 * size_of::<[f64; 3]>() + 6 * size_of::<[f64; 4]>();

    pub(crate) fn prepare(
        id: String,
        bounds: &Bounds,
        panel: &FinitePanel,
        transmission: f64,
    ) -> Option<Self> {
        let prism = panel.prism()?;
        let [x, y, z, bound] = prism
            .planes
            .first()
            .map(|p| [p.normal.x, p.normal.y, p.normal.z, p.bound])?;
        if y <= EPS || !transmission.is_finite() || !(0.0..=1.0).contains(&transmission) {
            return None;
        }
        let mut projection = Vec::with_capacity(15);
        let mut upper = Vec::with_capacity(6);
        for plane in &prism.planes {
            let p = plane.normal;
            if p.y.abs() <= EPS {
                projection.push([p.x, p.z, plane.bound]);
            } else if p.y > EPS {
                upper.push([p.x, p.y, p.z, plane.bound]);
                for lower in prism.planes.iter().filter(|lower| lower.normal.y < -EPS) {
                    let q = lower.normal;
                    projection.push([
                        p.x / p.y - q.x / q.y,
                        p.z / p.y - q.z / q.y,
                        plane.bound / p.y - lower.bound / q.y,
                    ]);
                }
            }
        }
        let extents = |coordinate: fn(&crate::state::Point) -> f64| {
            panel
                .corners
                .iter()
                .map(coordinate)
                .fold([f64::INFINITY, f64::NEG_INFINITY], |[lo, hi], value| {
                    [lo.min(value), hi.max(value)]
                })
        };
        let [min_x, max_x] = extents(|p| p.x);
        let [min_z, max_z] = extents(|p| p.z);
        let top = Footprint {
            rectangle: Rectangle {
                min_x,
                max_x,
                min_z,
                max_z,
            },
            height: bounds.max.y,
            slope: [-x / y, -z / y],
            intercept: bound / y,
        };
        Some(Self {
            id,
            bounds: Rectangle {
                min_x: bounds.min.x,
                max_x: bounds.max.x,
                min_z: bounds.min.z,
                max_z: bounds.max.z,
            },
            top,
            transmission,
            projection,
            upper,
        })
    }

    pub(crate) fn footprint(&self) -> Footprint {
        self.top
    }

    fn shadows(&self, footprint: Footprint) -> impl Iterator<Item = [f64; 3]> + '_ {
        self.projection
            .iter()
            .copied()
            .chain(self.upper.iter().map(move |[x, y, z, bound]| {
                [
                    x + y * footprint.slope[0],
                    z + y * footprint.slope[1],
                    bound - y * footprint.intercept,
                ]
            }))
    }

    pub(crate) fn compatible(&self, other: &Self) -> bool {
        !overlap(self.bounds, other.bounds)
            || [self.shadows(other.top), other.shadows(self.top)]
                .into_iter()
                .all(|mut planes| planes.all(|[x, z, _]| x.abs() <= EPS || z.abs() <= EPS))
    }

    fn shadow(
        &self,
        footprint: Footprint,
        own: Option<&str>,
        ordering_height: f64,
    ) -> Result<Option<Rectangle>, ExposureError> {
        if own == Some(&self.id) || !overlap(self.bounds, footprint.rectangle) {
            return Ok(None);
        }
        let mut output = footprint.rectangle;
        for [x, z, bound] in self.shadows(footprint) {
            if x.abs() > EPS && z.abs() > EPS {
                return Err(ExposureError::Invalid);
            }
            if x > EPS {
                output.max_x = output.max_x.min(bound / x);
            } else if x < -EPS {
                output.min_x = output.min_x.max(bound / x);
            } else if z > EPS {
                output.max_z = output.max_z.min(bound / z);
            } else if z < -EPS {
                output.min_z = output.min_z.max(bound / z);
            } else {
                // A static horizontal layer crossing has zero duration. Use
                // this segment's midpoint to choose the side at its endpoints.
                let above = if self.top.slope == [0.; 2] && footprint.slope == [0.; 2] {
                    self.top.height - ordering_height
                } else {
                    bound
                };
                if above < -EPS || above.abs() <= EPS && own.is_none_or(|id| self.id.as_str() > id)
                {
                    return Ok(None);
                }
            }
        }
        Ok((output.min_x < output.max_x && output.min_z < output.max_z).then_some(output))
    }
}

pub(crate) struct LocalCovers<'a> {
    covers: Vec<&'a Cover>,
    _storage: ByteReservation,
}

impl<'a> LocalCovers<'a> {
    /// Collect only covers within the swept footprint, with no allocation
    /// for open-air sites. One result serves both endpoint reads and integration.
    pub(crate) fn prepare(
        covers: impl Iterator<Item = &'a Cover>,
        from: Footprint,
        to: Footprint,
        own: Option<&str>,
        budget: &ByteBudget,
        mut work: Option<&mut WorkMeters>,
    ) -> Result<Self, ExposureError> {
        let swept = Rectangle {
            min_x: from.rectangle.min_x.min(to.rectangle.min_x),
            max_x: from.rectangle.max_x.max(to.rectangle.max_x),
            min_z: from.rectangle.min_z.min(to.rectangle.min_z),
            max_z: from.rectangle.max_z.max(to.rectangle.max_z),
        };
        let minimum = |f: Footprint| {
            let r = f.rectangle;
            let x = if f.slope[0] >= 0. { r.min_x } else { r.max_x };
            let z = if f.slope[1] >= 0. { r.min_z } else { r.max_z };
            f.intercept + f.slope[0] * x + f.slope[1] * z
        };
        let height = minimum(from).min(minimum(to));
        let mut storage = budget.reserve(0)?;
        let mut found = Vec::new();
        for cover in covers {
            if let Some(work) = work.as_deref_mut() {
                work.charge(&[(WorkUnit::Candidates, 1)])?;
            }
            if own == Some(&cover.id) || !overlap(cover.bounds, swept) || cover.top.height < height
            {
                continue;
            }
            storage.resize(
                (found.len() + 1)
                    .checked_mul(size_of::<&Cover>())
                    .ok_or(ExposureError::Capacity)?,
            )?;
            found
                .try_reserve_exact(1)
                .map_err(|_| ExposureError::Capacity)?;
            found.push(cover);
        }
        Ok(Self {
            covers: found,
            _storage: storage,
        })
    }

    pub(crate) fn is_empty(&self) -> bool {
        self.covers.is_empty()
    }

    /// Return incident rain and horizontal coverage over the exact same cells.
    /// Weather overlaps by maximum; overlaid cover transmits multiplicatively.
    pub(crate) fn measure(
        &self,
        target: Footprint,
        own: Option<&str>,
        ordering_height: f64,
        sources: &[Option<IncidentRain>; 2],
        budget: &ByteBudget,
        mut work: Option<&mut WorkMeters>,
    ) -> Result<(f64, f64), ExposureError> {
        let area = target.rectangle;
        if self.covers.is_empty() {
            return Ok((incident_exposure(area, sources, work)?, 0.0));
        }
        let edges = self
            .covers
            .len()
            .checked_mul(2)
            .and_then(|v| v.checked_add(6))
            .ok_or(ExposureError::Capacity)?;
        let bytes = edges
            .checked_mul(2 * size_of::<f64>())
            .and_then(|v| {
                v.checked_add(
                    self.covers
                        .len()
                        .checked_mul(size_of::<(Rectangle, f64)>())?,
                )
            })
            .ok_or(ExposureError::Capacity)?;
        let _workspace = budget.reserve(bytes)?;
        let mut xs = Vec::with_capacity(edges);
        let mut zs = Vec::with_capacity(edges);
        xs.extend([area.min_x, area.max_x]);
        zs.extend([area.min_z, area.max_z]);
        let mut add = |r: Rectangle| {
            xs.extend(
                [r.min_x, r.max_x]
                    .into_iter()
                    .filter(|x| area.min_x < *x && *x < area.max_x),
            );
            zs.extend(
                [r.min_z, r.max_z]
                    .into_iter()
                    .filter(|z| area.min_z < *z && *z < area.max_z),
            );
        };
        let mut active = Vec::with_capacity(self.covers.len());
        if let Some(work) = work.as_deref_mut() {
            work.charge(&[(WorkUnit::Candidates, self.covers.len() as u64)])?;
        }
        for cover in &self.covers {
            if let Some(shadow) = cover.shadow(target, own, ordering_height)? {
                add(shadow);
                active.push((shadow, cover.transmission));
            }
        }
        for source in sources.iter().flatten() {
            add(Rectangle {
                min_x: source.min_x,
                max_x: source.max_x,
                min_z: source.min_z,
                max_z: source.max_z,
            });
        }
        for axis in [&mut xs, &mut zs] {
            axis.sort_unstable_by(f64::total_cmp);
            axis.dedup_by(|a, b| a == b);
        }
        if let Some(work) = work {
            work.charge(&[(
                WorkUnit::Candidates,
                (xs.len() - 1)
                    .saturating_mul(zs.len() - 1)
                    .saturating_mul(active.len() + sources.iter().flatten().count())
                    as u64,
            )])?;
        }
        let mut incident = 0.;
        let mut covered = 0.;
        for x in xs.windows(2) {
            for z in zs.windows(2) {
                let mx = (x[0] + x[1]) / 2.;
                let mz = (z[0] + z[1]) / 2.;
                let cell = (x[1] - x[0]) * (z[1] - z[0]);
                let mut transmission = 1.0;
                let mut under = false;
                for (shadow, fraction) in &active {
                    if (shadow.min_x..=shadow.max_x).contains(&mx)
                        && (shadow.min_z..=shadow.max_z).contains(&mz)
                    {
                        transmission *= fraction;
                        under = true;
                    }
                }
                if under {
                    covered += cell;
                }
                let intensity = sources
                    .iter()
                    .flatten()
                    .filter(|source| {
                        (source.min_x..=source.max_x).contains(&mx)
                            && (source.min_z..=source.max_z).contains(&mz)
                    })
                    .map(|source| source.intensity)
                    .fold(0., f64::max);
                incident += cell * transmission * intensity;
            }
        }
        let total = (area.max_x - area.min_x) * (area.max_z - area.min_z);
        let fraction = |value: f64| {
            let v = value / total;
            if v < 1e-12 {
                0.
            } else if v > 1. - 1e-12 {
                1.
            } else {
                v
            }
        };
        Ok((fraction(incident), fraction(covered)))
    }

    /// Split where any swept rectangle or shadow edge swaps order. Within
    /// each resulting segment, every covered cell's area is quadratic in time.
    pub(crate) fn crossings(
        &self,
        from: Footprint,
        to: Footprint,
        sources: &[Option<IncidentRain>; 2],
        budget: &ByteBudget,
        work: &mut WorkMeters,
    ) -> Result<(Vec<f64>, ByteReservation), ExposureError> {
        let limit = if from == to {
            0
        } else {
            self.covers
                .len()
                .checked_mul(21)
                .and_then(|n| n.checked_add(6))
                .ok_or(ExposureError::Capacity)?
        };
        let _edges = budget.reserve(
            limit
                .checked_mul(2 * size_of::<[f64; 2]>())
                .ok_or(ExposureError::Capacity)?,
        )?;
        let mut storage = budget.reserve(2 * size_of::<f64>())?;
        let mut cuts = Vec::with_capacity(2);
        cuts.extend([0., 1.]);
        if from == to {
            return Ok((cuts, storage));
        }
        let a = from.rectangle;
        let b = to.rectangle;
        let mut xs = Vec::with_capacity(limit);
        let mut zs = Vec::with_capacity(limit);
        xs.extend([[a.min_x, b.min_x], [a.max_x, b.max_x]]);
        zs.extend([[a.min_z, b.min_z], [a.max_z, b.max_z]]);
        for source in sources.iter().flatten() {
            xs.extend([[source.min_x; 2], [source.max_x; 2]]);
            zs.extend([[source.min_z; 2], [source.max_z; 2]]);
        }
        let mut add = |start: f64, end: f64| -> Result<(), ExposureError> {
            if start != end {
                let t = -start / (end - start);
                if 0. < t && t < 1. {
                    let length = cuts.len().checked_add(1).ok_or(ExposureError::Capacity)?;
                    storage.resize(
                        length
                            .checked_mul(size_of::<f64>())
                            .ok_or(ExposureError::Capacity)?,
                    )?;
                    cuts.try_reserve_exact(1)
                        .map_err(|_| ExposureError::Capacity)?;
                    cuts.push(t);
                }
            }
            Ok(())
        };
        work.charge(&[(WorkUnit::Tests, limit as u64)])?;
        for cover in &self.covers {
            for ([x, z, start], [_, _, end]) in cover.shadows(from).zip(cover.shadows(to)) {
                if x.abs() > EPS && z.abs() > EPS {
                    return Err(ExposureError::Invalid);
                }
                if x.abs() > EPS {
                    xs.push([start / x, end / x]);
                } else if z.abs() > EPS {
                    zs.push([start / z, end / z]);
                } else {
                    add(start, end)?;
                }
            }
        }
        for axis in [&xs, &zs] {
            let count = axis.len();
            work.charge(&[(
                WorkUnit::Tests,
                (count.saturating_mul(count - 1) / 2) as u64,
            )])?;
            for (index, a) in axis.iter().enumerate() {
                for b in &axis[index + 1..] {
                    add(a[0] - b[0], a[1] - b[1])?;
                }
            }
        }
        cuts.sort_unstable_by(f64::total_cmp);
        cuts.dedup_by(|a, b| a == b);
        work.charge(&[(WorkUnit::Candidates, cuts.len() as u64)])?;
        Ok((cuts, storage))
    }
}
