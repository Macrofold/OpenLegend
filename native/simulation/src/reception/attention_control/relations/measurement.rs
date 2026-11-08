//! The relation predicates use supported received intervals. No physical
//! neighbor position, trajectory or hidden terrain can repair a missing sample.
use super::*;
use crate::spatial::{BodyPiece, Extent};
#[derive(Clone, Copy)]
pub(super) struct Span {
    pub from: f64,
    pub through: f64,
}
#[derive(Clone, Copy)]
pub(super) struct PointSample {
    pub span: Span,
    pub point: Option<(Point, f64)>,
}
#[derive(Clone, Copy)]
pub(super) struct Body {
    pub position: Point,
    pub extent: Extent,
    pub span: Span,
    pub location: Option<PointSample>,
    pub motion: Option<(PointSample, PointSample)>,
}
fn sample(value: &LocationGeometrySample) -> PointSample {
    PointSample {
        span: Span {
            from: value.sample.value_supported_from,
            through: value.sample.value_supported_through,
        },
        point: match &value.location {
            ObservedLocation::Point {
                point,
                error_radius,
            } => Some((point.position(), *error_radius)),
            _ => None,
        },
    }
}
impl Body {
    pub(super) fn received(value: &ReceivedSceneBody) -> Self {
        Self {
            position: value.body.position,
            extent: Extent {
                radius: value.body.radius,
                height: value.body.height,
            },
            span: Span {
                from: value.sample.value_supported_from,
                through: value.sample.value_supported_through,
            },
            location: Some(sample(&value.location)),
            motion: value
                .motion
                .as_ref()
                .map(|m| (sample(&m.earlier), sample(&m.later))),
        }
    }
    fn point(&self, at: f64, body_error: bool) -> Option<(Point, f64)> {
        for sample in self
            .location
            .into_iter()
            .chain(self.motion.into_iter().flat_map(|(a, b)| [a, b]))
        {
            if at >= sample.span.from && at <= sample.span.through {
                if let Some(point) = sample.point {
                    return Some(point);
                }
            }
        }
        (at >= self.span.from && at <= self.span.through).then(|| {
            (
                self.position,
                if body_error {
                    self.location.and_then(|v| v.point).map_or(0.0, |(_, e)| e)
                } else {
                    0.0
                },
            )
        })
    }
}
pub(super) struct Separation {
    pub lower: f64,
    pub upper: f64,
    pub decrease: Option<f64>,
}
pub(super) fn body(first: &Body, second: &Body) -> Option<Separation> {
    let at = first.span.through.min(second.span.through);
    let (a, ea) = first.point(at, true)?;
    let (b, eb) = second.point(at, true)?;
    let distance = crate::spatial::body_surface_distance(a, first.extent, b, second.extent);
    let error = ea + eb;
    let constant = first.span.from.max(second.span.from);
    let mut earlier = [
        first.motion.map(|(a, _)| a.span.through),
        second.motion.map(|(a, _)| a.span.through),
        (constant < at).then_some(constant),
    ];
    earlier.sort_by(|a, b| match (a, b) {
        (Some(a), Some(b)) => b.total_cmp(a),
        (Some(_), None) => std::cmp::Ordering::Less,
        (None, Some(_)) => std::cmp::Ordering::Greater,
        _ => std::cmp::Ordering::Equal,
    });
    let mut decrease = None;
    for before in earlier.into_iter().flatten().filter(|t| *t < at) {
        let Some((a, ea)) = first.point(before, true) else {
            continue;
        };
        let Some((b, eb)) = second.point(before, true) else {
            continue;
        };
        decrease = Some(
            crate::spatial::body_surface_distance(a, first.extent, b, second.extent)
                - ea
                - eb
                - distance
                - error,
        );
        break;
    }
    Some(Separation {
        lower: (distance - error).max(0.0),
        upper: (distance + error).max(0.0),
        decrease,
    })
}
pub(super) fn boundary(
    anchor: &Body,
    boundary: &ObservedBoundary,
    from: f64,
    through: f64,
    epsilon: f64,
) -> Option<Separation> {
    let at = anchor.span.through.min(through);
    if at < from {
        return None;
    }
    let (current, point_error) = anchor.point(at, false)?;
    let distance = |point| {
        crate::spatial::moving_bodies_minimum_separation(
            BodyPiece {
                from: point,
                through: point,
                extent: anchor.extent,
            },
            BodyPiece {
                from: boundary.a,
                through: boundary.b,
                extent: Extent {
                    radius: 0.0,
                    height: 0.0,
                },
            },
            epsilon,
        )
    };
    let d = distance(current);
    let error = point_error + boundary.error_radius;
    let constant = anchor.span.from.max(from);
    let before = if constant < at {
        anchor.point(constant, false)
    } else {
        anchor
            .motion
            .and_then(|(earlier, _)| {
                (earlier.span.through >= from && earlier.span.through < at)
                    .then_some(earlier.span.through)
            })
            .and_then(|t| anchor.point(t, false))
    };
    Some(Separation {
        lower: (d - error).max(0.0),
        upper: d + error,
        decrease: before.map(|(point, e)| distance(point) - e - boundary.error_radius - d - error),
    })
}
