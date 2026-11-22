//! Read the exact measurements already held for a decision. This does not
//! inspect later world geometry or promote an observer label to a reference.
use super::RuntimeNpcRead;
use crate::reception::received_separation::body;
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
