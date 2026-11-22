//! Range queries over the original accepted scene. The index can narrow only
//! the actor's received extents and never reaches the live physical world.
use super::{CallFailure, RuntimeNpcBindingRequest, RuntimeNpcRead, Separation, support};
use crate::{npc::decide::prepare, spatial::index::ReceivedIndex};
use openlegend_simulation::{
    host::{ByteBudget, ByteReservation, CapacityError},
    state::{Bounds, Point},
    text::JsText,
};
use serde::Serialize;
use std::mem::size_of;

pub(super) struct NearbyRead<'a, 'request> {
    original: &'a RuntimeNpcRead,
    current: &'request RuntimeNpcRead,
    binding: &'request RuntimeNpcBindingRequest,
    budget: &'request ByteBudget,
    scope: &'request str,
    index: Option<ReceivedIndex>,
    frame: &'request prepare::ReceivedFrame,
}

impl<'a, 'request> NearbyRead<'a, 'request> {
    pub(super) fn new(
        original: &'a RuntimeNpcRead,
        current: &'request RuntimeNpcRead,
        binding: &'request RuntimeNpcBindingRequest,
        budget: &'request ByteBudget,
        scope: &'request str,
        frame: &'request prepare::ReceivedFrame,
    ) -> Self {
        Self {
            original,
            current,
            binding,
            budget,
            scope,
            index: None,
            frame,
        }
    }

    pub(super) fn answer(
        &mut self,
        alias: &str,
        radius: f64,
        remaining: &mut u64,
    ) -> Result<Nearby<'a>, CallFailure> {
        let Some((anchor, bounds)) = self
            .binding
            .received_anchor(self.original, self.current, alias)
            .and_then(|ordinal| {
                self.original
                    .received_query_bound(ordinal)
                    .map(|bounds| (ordinal, bounds))
            })
        else {
            return Ok(Nearby {
                status: "unavailable",
                bodies: None,
                support: Vec::new(),
                _custody: self.budget.reserve(0).map_err(capacity)?,
            });
        };
        let mut hits = Vec::new();
        let complete = if *remaining != 0 {
            let index = if let Some(index) = self.index.as_ref() {
                index
            } else {
                self.index.insert(
                    ReceivedIndex::build(self.original.received_query_bounds(), self.budget)
                        .map_err(capacity)?,
                )
            };
            let expand = |point: Point, pad| Point {
                x: point.x + pad,
                y: point.y + pad,
                z: point.z + pad,
            };
            let window = Bounds {
                min: expand(bounds.min, -radius),
                max: expand(bounds.max, radius),
            };
            let count = self
                .original
                .received_query_bounds()
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
            let complete = index.query(&window, remaining, &mut |ordinal| {
                if ordinal != anchor {
                    hits.push(ordinal);
                }
            });
            (complete, Some(_hits))
        } else {
            (false, None)
        };
        let (complete, _hits) = complete;
        // Each retained row has at most six independently encoded facet
        // handles. Names and the observations themselves stay borrowed.
        let proof_bytes = 6 * (size_of::<(usize, String)>() + 24) + 256;
        let custody = self
            .budget
            .reserve(
                hits.len()
                    .checked_mul(size_of::<NearbyBody<'_>>() + proof_bytes)
                    .and_then(|bytes| bytes.checked_add(proof_bytes))
                    .ok_or_else(|| capacity(CapacityError))?,
            )
            .map_err(capacity)?;
        let bodies = hits
            .into_iter()
            .map(|ordinal| self.body(anchor, ordinal))
            .collect::<Result<Vec<_>, _>>()?;
        Ok(Nearby {
            status: if complete { "complete" } else { "partial" },
            bodies: Some(bodies),
            support: support(self.original.received_query_facets(anchor), self.scope),
            _custody: custody,
        })
    }

    fn body(&self, anchor: usize, ordinal: usize) -> Result<NearbyBody<'a>, CallFailure> {
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
        Ok(NearbyBody {
            reference,
            ordinal,
            added: old_alias.is_none(),
            separation: Separation::prepare(
                self.original.received_near_pair(anchor, ordinal),
                self.scope,
            ),
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

#[derive(Serialize)]
pub(super) struct Nearby<'a> {
    status: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    bodies: Option<Vec<NearbyBody<'a>>>,
    #[serde(
        skip_serializing_if = "Vec::is_empty",
        serialize_with = "super::citations"
    )]
    support: Vec<(usize, String)>,
    #[serde(skip)]
    _custody: ByteReservation,
}

impl Nearby<'_> {
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
        for (ordinal, alias) in &self.support {
            binding
                .bind_query_facet(alias, *ordinal)
                .map_err(prepare::packet_failure)?;
        }
        for body in self.bodies.iter().flatten() {
            body.separation.bind(binding)?;
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
pub(super) struct NearbyBody<'a> {
    reference: String,
    separation: Separation,
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
