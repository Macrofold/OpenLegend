//! Project only the successful support rows. Opaque citations retain actual
//! dates and selection custody, never raw tracks or new action references.

use super::{
    Body, CallFailure, Fact, RuntimeNpcBindingRequest, RuntimeNpcSeparation, Sample, capacity,
    identical, prepare,
};
use openlegend_simulation::{
    encoding::json_record_len,
    host::{ByteBudget, ByteReservation},
};
use serde::Serialize;
use std::{collections::VecDeque, mem::size_of};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(in crate::npc::decide::query) struct Page {
    status: &'static str,
    #[serde(flatten)]
    data: Option<Data>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Data {
    coverage: &'static str,
    time_unit: &'static str,
    distance_unit: &'static str,
    scope: &'static str,
    prepared_facts: usize,
    samples: VecDeque<Row>,
    #[serde(skip)]
    inventory: usize,
    #[serde(skip)]
    _custody: ByteReservation,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Row {
    at: f64,
    support: Vec<Proof>,
    #[serde(skip_serializing_if = "Option::is_none")]
    other: Option<Distance>,
    boundaries: Vec<Boundary>,
    boundary_coverage: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Boundary {
    support: Proof,
    measurement: Distance,
}

#[derive(Serialize)]
#[serde(
    tag = "status",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase"
)]
enum Distance {
    Unavailable,
    Complete {
        as_of: f64,
        lower: f64,
        upper: f64,
        #[serde(skip_serializing_if = "Option::is_none")]
        drop_lower: Option<f64>,
        #[serde(skip_serializing_if = "Option::is_none")]
        decrease_lower: Option<f64>,
        #[serde(skip_serializing_if = "Option::is_none")]
        endpoint_change: Option<Box<Delta>>,
    },
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Delta {
    from: f64,
    through: f64,
    decrease_lower: f64,
    support: Vec<Proof>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Proof {
    reference: String,
    facet: u64,
    as_of: f64,
    measured_from: f64,
    measured_through: f64,
    acquired_at: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    confirmed_through: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    support: Option<Supported>,
    #[serde(skip)]
    ordinal: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Supported {
    confirmed_from: f64,
    confirmed_through: f64,
}

impl Page {
    pub(super) fn unavailable() -> Self {
        Self {
            status: "unavailable",
            data: None,
        }
    }

    pub(super) fn from_samples(
        samples: Vec<Sample<'_>>,
        prepared: usize,
        incomplete: bool,
        compare: bool,
        scope: &str,
        inventory: usize,
        budget: &ByteBudget,
    ) -> Result<Self, CallFailure> {
        let count = samples.len();
        let edges = samples
            .iter()
            .map(|row| row.boundaries.len())
            .sum::<usize>();
        let proof = size_of::<Proof>() + 24;
        // Count the largest output each accepted witness can produce, including
        // the earlier endpoint if retained. The temporary key list is separate
        // from the answer that survives through encoding and final dispatch.
        let bytes = count
            .checked_mul(size_of::<Row>() + size_of::<Delta>() + 8 * proof)
            .and_then(|rows| {
                edges
                    .checked_mul(size_of::<Boundary>() + size_of::<Delta>() + 3 * proof)
                    .and_then(|edge_bytes| rows.checked_add(edge_bytes))
            })
            .ok_or_else(capacity)?;
        let custody = budget
            .reserve(bytes)
            .map_err(super::super::super::super::response_capacity)?;
        let mut rows = VecDeque::new();
        rows.try_reserve_exact(count).map_err(|_| capacity())?;
        let mut previous_other: Option<(Body<'_>, Body<'_>, f64, f64)> = None;
        let mut earlier_edges = Vec::new();
        if compare {
            earlier_edges
                .try_reserve_exact(edges)
                .map_err(|_| capacity())?;
        }
        let proof = |fact: Fact<'_>| {
            let field = fact.field;
            Proof {
                reference: super::super::reference(scope, inventory, fact.ordinal),
                facet: field.member_index,
                as_of: field.clock.as_of,
                measured_from: field.clock.measured_from,
                measured_through: field.clock.measured_through,
                acquired_at: field.clock.acquired_at,
                confirmed_through: field.clock.confirmed_through,
                support: field.support.as_ref().map(|proof| Supported {
                    confirmed_from: proof.confirmed_from,
                    confirmed_through: proof.confirmed_through,
                }),
                ordinal: fact.ordinal,
            }
        };
        for Sample {
            at,
            anchor,
            other,
            boundaries,
            partial,
        } in samples
        {
            let mut support = Vec::with_capacity(if other.is_some() { 4 } else { 2 });
            support.extend(anchor.proofs().map(proof));
            let other = other.map(|(measurement, companion)| {
                let change = match (&measurement, companion) {
                    (RuntimeNpcSeparation::Complete { lower, upper, .. }, Some(companion)) => {
                        support.extend(companion.proofs().map(proof));
                        if compare {
                            let previous = previous_other.replace((anchor, companion, at, *lower));
                            previous
                                .filter(|(a, b, from, _)| {
                                    *from < at
                                        && a.point.track() == anchor.point.track()
                                        && b.point.track() == companion.point.track()
                                })
                                .map(|(a, b, from, lower)| Delta {
                                    from,
                                    through: at,
                                    decrease_lower: lower - upper,
                                    support: a.proofs().chain(b.proofs()).map(proof).collect(),
                                })
                        } else {
                            None
                        }
                    }
                    _ => None,
                };
                Distance::measured(measurement, None, change)
            });
            let mut edges = Vec::with_capacity(boundaries.len());
            for hit in boundaries {
                let RuntimeNpcSeparation::Complete { lower, upper, .. } = hit.measurement else {
                    continue;
                };
                let change = if compare {
                    let previous = earlier_edges.iter_mut().find(
                        |(body, edge, _, _): &&mut (Body<'_>, Fact<'_>, f64, f64)| {
                            body.point.track() == anchor.point.track()
                                && edge.track() == hit.edge.fact.track()
                                && identical(*edge, hit.edge.fact)
                        },
                    );
                    if let Some(previous) = previous {
                        let (body, edge, from, lower) =
                            std::mem::replace(previous, (anchor, hit.edge.fact, at, lower));
                        (from < at).then(|| Delta {
                            from,
                            through: at,
                            decrease_lower: lower - upper,
                            support: body.proofs().chain([edge]).map(proof).collect(),
                        })
                    } else {
                        earlier_edges.push((anchor, hit.edge.fact, at, lower));
                        None
                    }
                } else {
                    None
                };
                edges.push(Boundary {
                    support: proof(hit.edge.fact),
                    measurement: Distance::measured(
                        hit.measurement,
                        Some(hit.edge.value.drop_lower),
                        change,
                    ),
                });
            }
            rows.push_back(Row {
                at,
                support,
                other,
                boundaries: edges,
                boundary_coverage: coverage(partial),
            });
        }
        Ok(Self {
            status: status(rows.is_empty()),
            data: Some(Data {
                coverage: coverage(incomplete),
                time_unit: "simulation-seconds",
                distance_unit: "metres",
                scope: "selected-retained-evidence",
                prepared_facts: prepared,
                samples: rows,
                inventory,
                _custody: custody,
            }),
        })
    }

    pub(in crate::npc::decide::query) fn trim(
        &mut self,
        mut excess: usize,
    ) -> Result<usize, CallFailure> {
        let Some(data) = &mut self.data else {
            return Ok(excess);
        };
        if data.coverage != "partial" {
            excess = excess.saturating_sub(data.coverage.len() - "partial".len());
            data.coverage = coverage(true);
        }
        while excess != 0 {
            let Some(row) = data.samples.pop_front() else {
                break;
            };
            let bytes = json_record_len(&row).map_err(|_| CallFailure::Invalid)?;
            excess = excess.saturating_sub(bytes + usize::from(!data.samples.is_empty()));
        }
        if data.samples.is_empty() {
            excess = excess.saturating_add("unavailable".len() - self.status.len());
            self.status = status(true);
        }
        Ok(excess)
    }

    pub(in crate::npc::decide::query) fn bind(
        &self,
        binding: &mut RuntimeNpcBindingRequest,
    ) -> Result<(), CallFailure> {
        let Some(data) = &self.data else {
            return Ok(());
        };
        let mut cite = |proof: &Proof| {
            binding
                .bind_query_receipt(&proof.reference, data.inventory, proof.ordinal)
                .map_err(prepare::packet_failure)
        };
        for row in &data.samples {
            for proof in row
                .support
                .iter()
                .chain(row.other.iter().flat_map(Distance::previous_support))
            {
                cite(proof)?;
            }
            for edge in &row.boundaries {
                cite(&edge.support)?;
                for proof in edge.measurement.previous_support() {
                    cite(proof)?;
                }
            }
        }
        Ok(())
    }
}

impl Distance {
    fn measured(
        measurement: RuntimeNpcSeparation,
        drop_lower: Option<f64>,
        change: Option<Delta>,
    ) -> Self {
        match measurement {
            RuntimeNpcSeparation::Unavailable => Self::Unavailable,
            RuntimeNpcSeparation::Complete {
                at,
                lower,
                upper,
                decrease,
            } => Self::Complete {
                as_of: at,
                lower,
                upper,
                drop_lower,
                decrease_lower: decrease,
                endpoint_change: change.map(Box::new),
            },
        }
    }

    fn previous_support(&self) -> impl Iterator<Item = &Proof> {
        let endpoint = match self {
            Self::Complete {
                endpoint_change, ..
            } => endpoint_change.as_deref(),
            Self::Unavailable => None,
        };
        endpoint.into_iter().flat_map(|change| &change.support)
    }
}

fn status(empty: bool) -> &'static str {
    if empty { "unavailable" } else { "partial" }
}

fn coverage(partial: bool) -> &'static str {
    if partial {
        "partial"
    } else {
        "selected-retained"
    }
}
