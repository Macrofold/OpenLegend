//! Read the exact measurements already held for a decision. This does not
//! inspect later world geometry or promote an observer label to a reference.
use super::RuntimeNpcRead;
use crate::reception::{
    EvidenceFamily, ObservationContribution, ObservationFacet, ObservationFactKey,
    ObservedBoundary, SensoryFacet, SourceRevision,
    received_separation::{self, body},
};
use crate::state::{Bounds, Point};
use serde::Serialize;

#[derive(Serialize)]
#[serde(tag = "status", rename_all = "kebab-case")]
pub enum RuntimeNpcSeparation {
    Unavailable,
    Complete {
        at: f64,
        lower: f64,
        upper: f64,
        #[serde(rename = "decreaseLower", skip_serializing_if = "Option::is_none")]
        decrease: Option<f64>,
    },
}

pub struct RuntimeNpcSeparationEvidence {
    pub measurement: RuntimeNpcSeparation,
    pub supporting_facets: [Option<usize>; 6],
}

impl RuntimeNpcSeparationEvidence {
    pub(super) const UNAVAILABLE: Self = Self {
        measurement: RuntimeNpcSeparation::Unavailable,
        supporting_facets: [None; 6],
    };
}

impl RuntimeNpcRead {
    /// The exact original received extents, without a new sensing pass or
    /// any live-world positions. Missing measurements remain missing.
    pub fn received_query_bounds(&self) -> impl ExactSizeIterator<Item = Option<Bounds>> + '_ {
        self.read.perception.query_bodies.iter().map(query_bounds)
    }

    pub fn received_query_bound(&self, ordinal: usize) -> Option<Bounds> {
        self.read
            .perception
            .query_bodies
            .get(ordinal)
            .and_then(query_bounds)
    }

    pub fn received_query_facets(&self, ordinal: usize) -> [Option<usize>; 3] {
        self.read
            .perception
            .query_bodies
            .get(ordinal)
            .and_then(Option::as_ref)
            .map_or([None; 3], |body| body.facets)
    }

    /// Membership in a near query cites the supported positions even when
    /// there is no common supported instant for a separation measurement.
    pub fn received_near_pair(&self, first: usize, second: usize) -> RuntimeNpcSeparationEvidence {
        let mut result = self.query_separation(first, second);
        result.supporting_facets[..3].copy_from_slice(&self.received_query_facets(first));
        result.supporting_facets[3..].copy_from_slice(&self.received_query_facets(second));
        result
    }

    pub(super) fn query_separation(
        &self,
        first: usize,
        second: usize,
    ) -> RuntimeNpcSeparationEvidence {
        let bodies = &self.read.perception.query_bodies;
        let (Some(Some(first)), Some(Some(second))) = (bodies.get(first), bodies.get(second))
        else {
            return RuntimeNpcSeparationEvidence::UNAVAILABLE;
        };
        let Some(result) = body(&first.measure, &second.measure) else {
            return RuntimeNpcSeparationEvidence::UNAVAILABLE;
        };
        let mut supporting_facets = [None; 6];
        supporting_facets[..3].copy_from_slice(&first.facets);
        supporting_facets[3..].copy_from_slice(&second.facets);
        RuntimeNpcSeparationEvidence {
            measurement: RuntimeNpcSeparation::Complete {
                at: result.at,
                lower: result.lower,
                upper: result.upper,
                decrease: result.decrease,
            },
            supporting_facets,
        }
    }
}

fn query_bounds(body: &Option<crate::capture::CapturedQueryBody>) -> Option<Bounds> {
    let measure = body.as_ref()?.measure;
    let error = measure
        .location
        .and_then(|sample| sample.point)
        .map_or(0.0, |(_, error)| error);
    let position = measure.position;
    let extent = measure.extent;
    Some(Bounds {
        min: Point {
            x: position.x - extent.radius - error,
            y: position.y - error,
            z: position.z - extent.radius - error,
        },
        max: Point {
            x: position.x + extent.radius + error,
            y: position.y + extent.height + error,
            z: position.z + extent.radius + error,
        },
    })
}

/// A selected boundary fact borrowed from an accepted read. The application
/// formats only the fields needed by that query and binds these exact ordinals.
pub struct RuntimeNpcBoundaryFact<'a> {
    pub ordinal: usize,
    pub observation: &'a ObservationContribution,
    pub facet: &'a ObservationFacet,
    pub boundary: &'a ObservedBoundary,
    pub surfaces: [(usize, u64); 2],
    pub measurement: RuntimeNpcSeparation,
}

impl RuntimeNpcRead {
    /// Visit up to the caller's shared allowance. Unknown or detached surface
    /// proofs make the page partial. The borrowed observations are native
    /// acquisitions, so this uses no later terrain query or sight sampling.
    pub fn visit_received_boundaries<E>(
        &self,
        anchor: usize,
        remaining: &mut u64,
        mut visit: impl FnMut(RuntimeNpcBoundaryFact<'_>) -> Result<(), E>,
    ) -> Result<bool, E> {
        let Some(anchor) = self
            .read
            .perception
            .query_bodies
            .get(anchor)
            .and_then(Option::as_ref)
        else {
            return Ok(false);
        };
        let Some((first, rows, mut complete, through, epsilon)) =
            self.read.perception.query_geometry()
        else {
            return Ok(false);
        };
        let surface = |fact: &ObservationFactKey| {
            if fact.source.family != EvidenceFamily::NativeExposure {
                return None;
            }
            rows.iter()
                .position(|row| {
                    row.id == fact.source.id
                        && row.observer == fact.source.observer
                        && SourceRevision::Number(row.revision) == fact.source.revision
                        && row.facets.iter().any(|facet| {
                            facet.ordinal == fact.ordinal
                                && matches!(facet.value, SensoryFacet::SurfacePatch { .. })
                        })
                })
                .map(|index| (first + index, fact.ordinal))
        };
        for (index, observation) in rows.iter().enumerate() {
            let Some((facet, boundary)) = observation.facets.iter().find_map(|facet| match &facet
                .value
            {
                SensoryFacet::PhysicalBoundary { boundary } => Some((facet, boundary)),
                _ => None,
            }) else {
                continue;
            };
            if *remaining == 0 {
                return Ok(false);
            }
            *remaining -= 1;
            let Some((near, far)) =
                surface(&boundary.near_surface.support).zip(surface(&boundary.far_surface.support))
            else {
                complete = false;
                continue;
            };
            let measurement = received_separation::boundary(
                &anchor.measure,
                boundary,
                observation.acquired_at,
                through,
                epsilon,
            )
            .map_or(RuntimeNpcSeparation::Unavailable, |result| {
                RuntimeNpcSeparation::Complete {
                    at: result.at,
                    lower: result.lower,
                    upper: result.upper,
                    decrease: result.decrease,
                }
            });
            visit(RuntimeNpcBoundaryFact {
                ordinal: first + index,
                observation,
                facet,
                boundary,
                surfaces: [near, far],
                measurement,
            })?;
        }
        Ok(complete)
    }
}
