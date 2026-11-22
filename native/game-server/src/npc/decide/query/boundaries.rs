//! The received edge and its two supported surface facts are the evidence.
//! An incomplete observed area cannot establish safety or an unseen floor.
use super::{RuntimeNpcBindingRequest, RuntimeNpcRead, capacity, citations, support, trim_rows};
use crate::npc::decide::{CallFailure, prepare, response_capacity};
use openlegend_simulation::{
    host::{ByteBudget, ByteReservation},
    reception::{FacetRole, Modality, ReceivedSurface},
    runtime::{RuntimeNpcBoundaryFact, RuntimeNpcSeparation},
    state::Point,
};
use serde::Serialize;
use std::mem::size_of;

pub(super) fn answer(
    anchor: Option<usize>,
    original: &RuntimeNpcRead,
    remaining: &mut u64,
    budget: &ByteBudget,
    scope: &str,
    frame: &prepare::ReceivedFrame,
) -> Result<Boundaries, CallFailure> {
    let mut custody = budget.reserve(0).map_err(response_capacity)?;
    let Some(anchor) = anchor.filter(|&anchor| original.received_query_bound(anchor).is_some())
    else {
        return Ok(Boundaries {
            status: "unavailable",
            facts: None,
            support: Vec::new(),
            _custody: custody,
        });
    };
    // All output handles are fixed opaque labels, with one temporary SHA
    // input shared by each construction. Measurements and facts are scalar.
    custody.resize(512).map_err(response_capacity)?;
    let support = support(original.received_query_facets(anchor), scope);
    let mut facts = Vec::<BoundaryRow>::new();
    let complete = original.visit_received_boundaries(anchor, remaining, |fact| {
        if facts.len() == facts.capacity() {
            let next_capacity = facts.capacity().checked_mul(2).ok_or_else(capacity)?.max(4);
            custody
                .resize(
                    next_capacity
                        .checked_mul(size_of::<BoundaryRow>() + 3 * 24)
                        .and_then(|bytes| bytes.checked_add(512))
                        .ok_or_else(capacity)?,
                )
                .map_err(response_capacity)?;
            facts
                .try_reserve_exact(next_capacity - facts.len())
                .map_err(|_| capacity())?;
        }
        facts.push(BoundaryRow::from_received(fact, scope, frame));
        Ok::<(), CallFailure>(())
    })?;
    Ok(Boundaries {
        status: if complete { "complete" } else { "partial" },
        facts: Some(facts),
        support,
        _custody: custody,
    })
}

#[derive(Serialize)]
pub(super) struct Boundaries {
    status: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    facts: Option<Vec<BoundaryRow>>,
    #[serde(skip_serializing_if = "Vec::is_empty", serialize_with = "citations")]
    support: Vec<(usize, String)>,
    #[serde(skip)]
    _custody: ByteReservation,
}

impl Boundaries {
    pub(super) fn trim(&mut self, excess: usize) -> Result<usize, CallFailure> {
        match &mut self.facts {
            Some(facts) => trim_rows(&mut self.status, facts, excess),
            None => Ok(excess),
        }
    }

    pub(super) fn bind(&self, binding: &mut RuntimeNpcBindingRequest) -> Result<(), CallFailure> {
        super::bind_support(&self.support, binding)?;
        for row in self.facts.iter().flatten() {
            let observation = &row.observation;
            binding
                .bind_query_observation(&observation.source, observation.ordinal)
                .map_err(prepare::packet_failure)?;
            let boundary = &observation.facets[0].value.boundary;
            for proof in [
                &boundary.near_surface.support,
                &boundary.far_surface.support,
            ] {
                binding
                    .bind_query_observation(&proof.source, proof.acquired)
                    .map_err(prepare::packet_failure)?;
            }
        }
        Ok(())
    }
}

#[derive(Serialize)]
struct BoundaryRow {
    observation: Observation,
    #[serde(flatten)]
    measurement: Measurement,
}

#[derive(Serialize)]
#[serde(
    tag = "status",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase"
)]
enum Measurement {
    Unavailable,
    Complete {
        as_of: f64,
        lower: f64,
        upper: f64,
        drop_lower: f64,
        #[serde(skip_serializing_if = "Option::is_none")]
        decrease_lower: Option<f64>,
    },
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Observation {
    source: String,
    acquired_at: f64,
    modality: Modality,
    temporal_role: &'static str,
    time_unit: &'static str,
    facet_defaults: FacetDefaults,
    facets: [BoundaryFacet; 1],
    #[serde(skip)]
    ordinal: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FacetDefaults {
    role: FacetRole,
    as_of: f64,
    measured_from: f64,
    measured_through: f64,
    acquired_at: f64,
    support_status: &'static str,
}

#[derive(Serialize)]
struct BoundaryFacet {
    ordinal: u64,
    value: BoundaryValue,
}

#[derive(Serialize)]
struct BoundaryValue {
    kind: &'static str,
    boundary: Boundary,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Boundary {
    a: prepare::RelativeBody,
    b: prepare::RelativeBody,
    error_radius: f64,
    near_surface: Surface,
    far_surface: Surface,
    drop_lower: f64,
}

#[derive(Serialize)]
struct Surface {
    point: prepare::RelativeBody,
    normal: prepare::RelativeBody,
    support: SurfaceProof,
}

#[derive(Serialize)]
struct SurfaceProof {
    source: String,
    ordinal: u64,
    #[serde(skip)]
    acquired: usize,
}

impl BoundaryRow {
    fn from_received(
        fact: RuntimeNpcBoundaryFact<'_>,
        scope: &str,
        frame: &prepare::ReceivedFrame,
    ) -> Self {
        let alias = |ordinal| prepare::alias(scope, "scene-acquired", ordinal);
        let origin = Point {
            x: frame.x,
            y: frame.y,
            z: frame.z,
        };
        let relative = |point| prepare::relative_body(origin, frame.heading, point);
        let surface = |input: &ReceivedSurface, (acquired, ordinal)| Surface {
            point: relative(input.point),
            normal: prepare::relative_body(
                Point {
                    x: 0.0,
                    y: 0.0,
                    z: 0.0,
                },
                frame.heading,
                input.normal,
            ),
            support: SurfaceProof {
                source: alias(acquired),
                acquired,
                ordinal,
            },
        };
        let measurement = match fact.measurement {
            RuntimeNpcSeparation::Unavailable => Measurement::Unavailable,
            RuntimeNpcSeparation::Complete {
                at,
                lower,
                upper,
                decrease,
            } => Measurement::Complete {
                as_of: at,
                lower,
                upper,
                decrease_lower: decrease,
                drop_lower: fact.boundary.drop_lower,
            },
        };
        Self {
            observation: Observation {
                source: alias(fact.ordinal),
                acquired_at: fact.observation.acquired_at,
                modality: fact.observation.modality,
                temporal_role: "historical",
                time_unit: "simulation-seconds",
                ordinal: fact.ordinal,
                facet_defaults: FacetDefaults {
                    role: fact.facet.role,
                    as_of: fact.facet.as_of,
                    measured_from: fact.facet.measured_from,
                    measured_through: fact.facet.measured_through,
                    acquired_at: fact.facet.acquired_at,
                    support_status: "retained",
                },
                facets: [BoundaryFacet {
                    ordinal: fact.facet.ordinal,
                    value: BoundaryValue {
                        kind: "physical-boundary",
                        boundary: Boundary {
                            a: relative(fact.boundary.a),
                            b: relative(fact.boundary.b),
                            error_radius: fact.boundary.error_radius,
                            near_surface: surface(&fact.boundary.near_surface, fact.surfaces[0]),
                            far_surface: surface(&fact.boundary.far_surface, fact.surfaces[1]),
                            drop_lower: fact.boundary.drop_lower,
                        },
                    },
                }],
            },
            measurement,
        }
    }
}
