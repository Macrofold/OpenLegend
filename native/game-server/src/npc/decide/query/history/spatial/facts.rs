//! Select and compose only compatible shape, point and boundary facts.
//! A later location never makes an earlier appearance newly observed.

use super::{CallFailure, Request, capacity};
use openlegend_simulation::{
    host::{ByteBudget, ByteReservation},
    received::{
        MaterializedTemporalValue, ReceivedRole, ReceivedValueFragment, TemporalChange,
        TemporalFacetReference, TemporalReceipt,
    },
    reception::{ObservedBoundary, ObservedLocation, SensoryFacet},
    runtime::{RuntimeNpcHistoricalPose, RuntimeRecentReceipt},
    state::{Bounds, Point},
};
use std::{collections::BTreeMap, mem::size_of};

#[derive(Clone, Copy)]
pub(super) struct Fact<'a> {
    pub(super) receipt: &'a TemporalReceipt,
    pub(super) field: &'a TemporalFacetReference,
    pub(super) ordinal: usize,
    pub(super) segment: u64,
    until: f64,
}

#[derive(Clone, Copy, Eq, Ord, PartialEq, PartialOrd)]
pub(super) struct Track<'a> {
    life: u64,
    epoch: &'a str,
    subject: &'a str,
    segment: u64,
}

#[derive(Clone, Copy)]
pub(super) struct Body<'a> {
    pub(super) point: Fact<'a>,
    pub(super) shape: Fact<'a>,
    position: Point,
    radius: f64,
    height: f64,
    error: Option<f64>,
}

#[derive(Clone, Copy)]
pub(super) struct Edge<'a> {
    pub(super) fact: Fact<'a>,
    pub(super) value: &'a ObservedBoundary,
}

pub(super) struct Selected<'a> {
    pub(super) bodies: Vec<Body<'a>>,
    pub(super) edges: Vec<Edge<'a>>,
    pub(super) incomplete: bool,
    pub(super) truncated: bool,
    pub(super) prepared: usize,
    _custody: ByteReservation,
}

#[derive(Clone, Copy)]
enum Value<'a> {
    Shape(Point, f64, f64),
    Point(Point, f64),
    Edge(&'a ObservedBoundary),
    Surface,
}

impl<'a> Fact<'a> {
    fn new(
        receipt: &'a TemporalReceipt,
        field: &'a TemporalFacetReference,
        ordinal: usize,
    ) -> Self {
        let until = receipt
            .header
            .availability
            .iter()
            .flatten()
            .find(|group| group.fields.contains(&field.member_index))
            .map_or(f64::INFINITY, |group| group.at);
        Self {
            receipt,
            field,
            ordinal,
            segment: 0,
            until,
        }
    }

    pub(super) fn track(self) -> Track<'a> {
        Track {
            life: self.receipt.locator.physical_life,
            epoch: &self.receipt.locator.epoch,
            subject: &self.receipt.header.subject,
            segment: self.segment,
        }
    }

    pub(super) fn phase(self) -> (u64, &'a str, u64) {
        (
            self.receipt.locator.physical_life,
            &self.receipt.locator.epoch,
            self.receipt.header.acquisition,
        )
    }

    fn detail_from(self) -> f64 {
        self.field
            .detail_support
            .as_ref()
            .map_or(self.from(), |detail| {
                detail
                    .from
                    .max(detail.proof.confirmed_from)
                    .max(self.receipt.at)
            })
    }

    fn detail_through(self) -> f64 {
        self.field
            .detail_support
            .as_ref()
            .map_or(self.through(), |detail| detail.proof.confirmed_through)
    }

    pub(super) fn from(self) -> f64 {
        let time = self.field.clock.measured_from;
        time.max(
            self.field
                .support
                .as_ref()
                .map_or(time, |proof| proof.confirmed_from),
        )
        .max(self.receipt.at)
    }

    pub(super) fn through(self) -> f64 {
        self.field.support.as_ref().map_or_else(
            || {
                self.field
                    .clock
                    .confirmed_through
                    .unwrap_or(self.field.clock.measured_through)
            },
            |proof| proof.confirmed_through,
        )
    }

    pub(super) fn supports(self, at: f64) -> bool {
        self.from() <= at && at <= self.through() && at < self.until
    }
}

impl<'a> Body<'a> {
    pub(super) fn from(self) -> f64 {
        self.point.from().max(self.shape.detail_from())
    }

    pub(super) fn through(self) -> f64 {
        self.point.through().min(self.shape.detail_through())
    }

    pub(super) fn supports(self, at: f64) -> bool {
        self.from() <= at && at <= self.through() && at < self.point.until.min(self.shape.until)
    }

    pub(super) fn geometry(self, at: f64) -> RuntimeNpcHistoricalPose {
        RuntimeNpcHistoricalPose {
            position: self.position,
            radius: self.radius,
            height: self.height,
            shape_from: self.from(),
            at,
            point: self.error.map(|error| (self.point.from(), error)),
        }
    }

    pub(super) fn same_pose(self, other: Self) -> bool {
        self.position == other.position
            && self.radius == other.radius
            && self.height == other.height
    }

    pub(super) fn proofs(self) -> impl Iterator<Item = Fact<'a>> {
        [
            Some(self.point),
            (self.point.ordinal != self.shape.ordinal
                || self.point.field.member_index != self.shape.field.member_index)
                .then_some(self.shape),
        ]
        .into_iter()
        .flatten()
    }

    pub(super) fn bounds(self, radius: f64) -> Bounds {
        let Point { x, y, z } = self.position;
        let reach = radius + self.error.unwrap_or(0.0);
        let side = reach + self.radius;
        Bounds {
            min: Point {
                x: x - side,
                y: y - reach,
                z: z - side,
            },
            max: Point {
                x: x + side,
                y: y + self.height + reach,
                z: z + side,
            },
        }
    }
}

impl Edge<'_> {
    pub(super) fn bounds(self) -> Bounds {
        let ObservedBoundary {
            a,
            b,
            error_radius: e,
            ..
        } = self.value;
        Bounds {
            min: Point {
                x: a.x.min(b.x) - e,
                y: a.y.min(b.y) - e,
                z: a.z.min(b.z) - e,
            },
            max: Point {
                x: a.x.max(b.x) + e,
                y: a.y.max(b.y) + e,
                z: a.z.max(b.z) + e,
            },
        }
    }
}

fn geometry_field(kind: &str) -> bool {
    matches!(
        kind,
        "body" | "location" | "observed-motion" | "physical-boundary" | "surface-patch"
    )
}

impl<'a> Selected<'a> {
    pub(super) fn from_receipts(
        rows: impl ExactSizeIterator<Item = RuntimeRecentReceipt<'a>>,
        request: Request<'a>,
        limit: u64,
        operations: u64,
        budget: &ByteBudget,
    ) -> Result<Self, CallFailure> {
        // Keep a single vector of admitted facts in reverse receipt order.
        // Include geometry endings even when no value is present at that row.
        let maximum = usize::try_from(operations).map_err(|_| capacity())?;
        let storage = budget
            .reserve(
                maximum
                    .checked_mul(
                        size_of::<(Fact<'_>, Value<'_>)>()
                            + 2 * size_of::<Body<'_>>()
                            + size_of::<Edge<'_>>()
                            + 4 * size_of::<Track<'_>>()
                            + 128,
                    )
                    .ok_or_else(capacity)?,
            )
            .map_err(super::super::super::super::response_capacity)?;
        let mut events = Vec::new();
        let mut all_values = Vec::new();
        let mut visited = 0;
        let mut truncated = false;
        for (ordinal, row) in rows.enumerate() {
            let receipt = row.receipt();
            let exact_track = request.includes(&receipt.header.subject);
            let context = receipt.header.spatial_context == Some(true)
                || receipt
                    .header
                    .context_subjects
                    .as_ref()
                    .is_some_and(|subjects| subjects.iter().any(|track| request.includes(track)));
            if !exact_track && !context {
                continue;
            }
            let terminal = matches!(
                receipt.header.change,
                TemporalChange::Loss
                    | TemporalChange::Unchecked
                    | TemporalChange::AttentionExit
                    | TemporalChange::RecordingGap
            );
            let geometry = receipt
                .header
                .ended_fields
                .as_ref()
                .is_none_or(|fields| fields.iter().any(|(kind, _)| geometry_field(kind)));
            let ended = terminal && geometry;
            let gap = receipt.header.coverage_gap.is_some() && (!terminal || geometry);
            let work = (receipt.facets.len() as u64).max(1);
            if work > operations - visited {
                truncated = true;
                break;
            }
            visited += work;
            let first = all_values.len();
            for (field, value) in receipt.facets.iter().zip(row.values()) {
                if field.clock.measured_from > request.through
                    || field.clock.measured_through < request.from
                {
                    continue;
                }
                let value = match value {
                    MaterializedTemporalValue::Body { body, .. }
                        if exact_track
                            && field
                                .detail_support
                                .as_ref()
                                .map_or(field.clock.role, |detail| detail.role)
                                == ReceivedRole::Direct =>
                    {
                        let (shape, pose) = (body.details(), body.pose());
                        Value::Shape(pose.position, shape.radius, shape.height)
                    }
                    MaterializedTemporalValue::Location { location, .. }
                        if exact_track && field.clock.role == ReceivedRole::Direct =>
                    {
                        let ObservedLocation::Point {
                            point,
                            error_radius,
                        } = location.as_ref()
                        else {
                            continue;
                        };
                        Value::Point(point.position(), *error_radius)
                    }
                    MaterializedTemporalValue::Other(ReceivedValueFragment::Sensory(
                        SensoryFacet::PhysicalBoundary { boundary },
                    )) => Value::Edge(boundary),
                    MaterializedTemporalValue::Other(ReceivedValueFragment::Sensory(
                        SensoryFacet::SurfacePatch { .. },
                    )) => Value::Surface,
                    _ => continue,
                };
                all_values.push((Fact::new(receipt, field, ordinal), value));
            }
            if first == all_values.len() && !(ended || gap) {
                continue;
            }
            if events.len() as u64 == limit {
                all_values.truncate(first);
                truncated = true;
                break;
            }
            events.push((receipt, ended, gap, first..all_values.len()));
        }
        let prepared = all_values.len();

        let mut segments = BTreeMap::new();
        let mut incomplete = false;
        let mut shapes: BTreeMap<_, Vec<Body<'a>>> = BTreeMap::new();
        let mut points = Vec::new();
        let mut bodies = Vec::new();
        let mut edges = Vec::new();
        for (receipt, ended, gap, values) in events.into_iter().rev() {
            let segment = segments
                .entry((
                    receipt.locator.physical_life,
                    receipt.locator.epoch.as_str(),
                    receipt.header.subject.as_str(),
                ))
                .or_insert(0_u64);
            *segment += u64::from(gap);
            incomplete |= ended || gap;
            for &(mut fact, value) in &all_values[values] {
                fact.segment = *segment;
                match value {
                    Value::Shape(position, radius, height) => {
                        let body = Body {
                            point: fact,
                            shape: fact,
                            position,
                            radius,
                            height,
                            error: None,
                        };
                        if fact.detail_from() <= fact.detail_through() {
                            shapes.entry(fact.track()).or_default().push(body);
                        }
                        bodies.push(body);
                    }
                    Value::Point(position, error) => points.push((fact, position, error)),
                    Value::Edge(value) => edges.push(Edge { fact, value }),
                    Value::Surface => {}
                }
            }
            *segment += u64::from(ended);
        }
        for held in shapes.values_mut() {
            held.sort_by(|a, b| {
                a.shape
                    .detail_through()
                    .total_cmp(&b.shape.detail_through())
                    .then(a.shape.detail_from().total_cmp(&b.shape.detail_from()))
            });
        }
        for (point, position, error) in points {
            let at = point.through().min(request.through);
            if !point.supports(at) {
                continue;
            }
            if let Some(shape) = shapes
                .get(&point.track())
                .and_then(|held| shape_at(held, point, at))
            {
                bodies.push(Body {
                    point,
                    position,
                    error: Some(error),
                    ..shape
                });
            }
        }
        Ok(Self {
            bodies,
            edges,
            incomplete,
            truncated,
            prepared,
            _custody: storage,
        })
    }
}

fn shape_at<'a>(held: &[Body<'a>], point: Fact<'a>, at: f64) -> Option<Body<'a>> {
    let first = held.partition_point(|body| body.shape.detail_through() < at);
    let mut selected: [Option<Body<'_>>; 2] = [None, None];
    let mut conflict = [false; 2];
    for sample in &held[first..] {
        let shape = sample.shape;
        if shape.detail_from() > at || shape.until <= at {
            continue;
        }
        let phase = usize::from(shape.phase() == point.phase());
        if let Some(previous) = selected[phase] {
            conflict[phase] |= previous.radius != sample.radius || previous.height != sample.height;
        } else {
            selected[phase] = Some(*sample);
        }
    }
    let phase = usize::from(selected[1].is_some());
    (!conflict[phase]).then_some(selected[phase]).flatten()
}
