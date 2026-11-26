//! Range queries over the original accepted scene. The index can narrow only
//! the actor's received extents and never reaches the live physical world.
use super::{
    CallFailure, RuntimeNpcBindingRequest, RuntimeNpcRead, Separation, regions::Regions, support,
};
use crate::{
    npc::decide::prepare,
    spatial::index::{ReceivedIndex, RegionPath},
};
use openlegend_simulation::{
    host::{ByteBudget, ByteReservation, CapacityError},
    state::{Bounds, Point},
    text::JsText,
};
use serde::Serialize;
use std::mem::size_of;

pub(super) struct BodyQueryRead<'a, 'request> {
    original: &'a RuntimeNpcRead,
    current: &'request RuntimeNpcRead,
    binding: &'request RuntimeNpcBindingRequest,
    budget: &'request ByteBudget,
    scope: &'request str,
    regions: Option<&'request Regions>,
    index: Option<ReceivedIndex>,
    frame: &'request prepare::ReceivedFrame,
}

impl<'a, 'request> BodyQueryRead<'a, 'request> {
    pub(super) fn new(
        original: &'a RuntimeNpcRead,
        current: &'request RuntimeNpcRead,
        binding: &'request RuntimeNpcBindingRequest,
        budget: &'request ByteBudget,
        scope: &'request str,
        frame: &'request prepare::ReceivedFrame,
        regions: Option<&'request Regions>,
    ) -> Self {
        Self {
            original,
            current,
            binding,
            budget,
            scope,
            regions,
            index: None,
            frame,
        }
    }

    pub(super) fn near(
        &mut self,
        alias: &str,
        radius: f64,
        remaining: &mut u64,
    ) -> Result<BodyPage<'a>, CallFailure> {
        let area = self
            .binding
            .received_anchor(self.original, self.current, alias)
            .and_then(|anchor| {
                let bounds = self.original.received_query_bound(anchor)?;
                let expand = |point: Point, pad| Point {
                    x: point.x + pad,
                    y: point.y + pad,
                    z: point.z + pad,
                };
                let window = Bounds {
                    min: expand(bounds.min, -radius),
                    max: expand(bounds.max, radius),
                };
                Some(Area::Near { anchor, window })
            });
        self.answer(area, remaining)
    }

    pub(super) fn expand(
        &mut self,
        alias: &str,
        remaining: &mut u64,
    ) -> Result<BodyPage<'a>, CallFailure> {
        let area = self
            .regions
            .and_then(|regions| regions.resolve(alias))
            .map(Area::Region);
        self.answer(area, remaining)
    }

    fn answer(
        &mut self,
        area: Option<Area>,
        remaining: &mut u64,
    ) -> Result<BodyPage<'a>, CallFailure> {
        let Some(area) = area else {
            return Ok(BodyPage {
                status: "unavailable",
                bodies: None,
                support: Vec::new(),
                _custody: self.budget.reserve(0).map_err(capacity)?,
            });
        };
        let mut hits = Vec::new();
        let (complete, _hits) = if *remaining != 0 {
            let index = match (self.regions, self.index.as_ref()) {
                (Some(regions), _) => &regions.index,
                (None, Some(index)) => index,
                (None, None) => self.index.insert(
                    ReceivedIndex::build(self.original.received_query_bounds(), self.budget)
                        .map_err(capacity)?,
                ),
            };
            let count = index
                .len()
                .min(usize::try_from(*remaining).map_err(|_| capacity(CapacityError))?);
            let _hits = self
                .budget
                .reserve(
                    count
                        .checked_mul(size_of::<usize>())
                        .ok_or_else(|| capacity(CapacityError))?,
                )
                .map_err(capacity)?;
            hits.try_reserve_exact(count)
                .map_err(|_| capacity(CapacityError))?;
            let complete = match area {
                Area::Near { anchor, ref window } => {
                    index.query(window, remaining, &mut |ordinal| {
                        if ordinal != anchor {
                            hits.push(ordinal);
                        }
                    })
                }
                Area::Region(path) => {
                    index.region(path, remaining, &mut |ordinal| hits.push(ordinal))
                }
            };
            (complete, Some(_hits))
        } else {
            (false, None)
        };
        // Each retained row has at most six independently encoded facet
        // handles. Names and the observations themselves stay borrowed.
        let proof_bytes = 6 * (size_of::<(usize, String)>() + 24) + 256;
        let custody = self
            .budget
            .reserve(
                hits.len()
                    .checked_mul(size_of::<BodyRow<'_>>() + proof_bytes)
                    .and_then(|bytes| bytes.checked_add(proof_bytes))
                    .ok_or_else(|| capacity(CapacityError))?,
            )
            .map_err(capacity)?;
        let anchor = match area {
            Area::Near { anchor, .. } => Some(anchor),
            Area::Region(_) => None,
        };
        let bodies = hits
            .into_iter()
            .map(|ordinal| self.body(anchor, ordinal))
            .collect::<Result<Vec<_>, _>>()?;
        Ok(BodyPage {
            status: if complete { "complete" } else { "partial" },
            bodies: Some(bodies),
            support: anchor.map_or_else(Vec::new, |anchor| {
                support(self.original.received_query_facets(anchor), self.scope)
            }),
            _custody: custody,
        })
    }

    fn body(&self, anchor: Option<usize>, ordinal: usize) -> Result<BodyRow<'a>, CallFailure> {
        let subject = self
            .original
            .presented_body(ordinal)
            .ok_or(CallFailure::Invalid)?;
        let facet = subject.observed.ok_or(CallFailure::Invalid)?;
        let old_alias = self
            .binding
            .received_body_alias(self.original, self.current, ordinal);
        let reference = old_alias
            .map(str::to_owned)
            .unwrap_or_else(|| prepare::alias(self.scope, "scene-body", ordinal));
        Ok(BodyRow {
            reference,
            ordinal,
            added: old_alias.is_none(),
            separation: anchor.map(|anchor| {
                Separation::prepare(
                    self.original.received_near_pair(anchor, ordinal),
                    self.scope,
                )
            }),
            support: if anchor.is_none() {
                support(self.original.received_query_facets(ordinal), self.scope)
            } else {
                Vec::new()
            },
            facts: BodyFacts {
                label: &subject.name.name,
                relative: prepare::relative_body(
                    Point {
                        x: self.frame.x,
                        y: self.frame.y,
                        z: self.frame.z,
                    },
                    self.frame.heading,
                    facet.body.position,
                ),
                value_measured_from: facet.value_measured_from,
                value_measured_through: facet.value_measured_through,
                value_acquired_at: facet.value_acquired_at,
                confirmed_through: facet.confirmed_through,
                kind: &facet.body.kind,
                appearance: &facet.body.appearance,
                radius: facet.body.radius,
                height: facet.body.height,
                activity: facet.body.activity.as_deref(),
                quantity: facet.body.quantity,
                heat_lit: facet.body.heat_lit,
                description: facet.body.description.as_ref(),
                outward: &facet.body.outward,
            },
        })
    }
}

enum Area {
    Near { anchor: usize, window: Bounds },
    Region(RegionPath),
}

#[derive(Serialize)]
pub(super) struct BodyPage<'a> {
    status: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    bodies: Option<Vec<BodyRow<'a>>>,
    #[serde(
        skip_serializing_if = "Vec::is_empty",
        serialize_with = "super::citations"
    )]
    support: Vec<(usize, String)>,
    #[serde(skip)]
    _custody: ByteReservation,
}

impl BodyPage<'_> {
    /// Count each discarded body once. Each removal frees its encoded row
    /// and the array comma if a preceding body remains.
    pub(super) fn trim(&mut self, excess: usize) -> Result<usize, CallFailure> {
        let Some(bodies) = &mut self.bodies else {
            return Ok(excess);
        };
        super::trim_rows(&mut self.status, bodies, excess)
    }

    pub(super) fn added_references(&self) -> impl Iterator<Item = &str> {
        self.bodies
            .iter()
            .flatten()
            .filter_map(|body| body.added.then_some(body.reference.as_str()))
    }

    pub(super) fn bind(&self, binding: &mut RuntimeNpcBindingRequest) -> Result<(), CallFailure> {
        super::bind_support(&self.support, binding)?;
        for body in self.bodies.iter().flatten() {
            if let Some(separation) = &body.separation {
                separation.bind(binding)?;
            }
            super::bind_support(&body.support, binding)?;
            if body.added {
                binding
                    .bind_query_body(&body.reference, body.ordinal)
                    .map_err(prepare::packet_failure)?;
            }
        }
        Ok(())
    }
}

#[derive(Serialize)]
pub(super) struct BodyRow<'a> {
    reference: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    separation: Option<Separation>,
    #[serde(
        skip_serializing_if = "Vec::is_empty",
        serialize_with = "super::citations"
    )]
    support: Vec<(usize, String)>,
    facts: BodyFacts<'a>,
    #[serde(skip)]
    ordinal: usize,
    #[serde(skip)]
    added: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BodyFacts<'a> {
    label: &'a JsText,
    relative: prepare::RelativeBody,
    value_measured_from: f64,
    value_measured_through: f64,
    value_acquired_at: f64,
    confirmed_through: f64,
    kind: &'a str,
    appearance: &'a JsText,
    radius: f64,
    height: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    activity: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    quantity: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    heat_lit: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<&'a JsText>,
    outward: &'a [String; 4],
}

fn capacity(error: CapacityError) -> CallFailure {
    crate::npc::decide::response_capacity(error)
}
