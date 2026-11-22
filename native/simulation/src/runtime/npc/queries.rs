//! Read the exact measurements already held for a decision. This does not
//! inspect later world geometry or promote an observer label to a reference.
use super::RuntimeNpcRead;
use crate::reception::received_separation::body;
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
