//! Private aim evidence from two actually executed tracks. The action owner
//! supplies the exact lives, visibility at the interval ends and body profiles.
//! No future route or other body's private evidence is read here.

use super::aim::ObservedMotion;
use crate::execution::ExecutionError;
use crate::geometry::{
    GeometryAnswers, GeometryBinding, GeometryQueries, SightRay, SightSweepQuery,
};
use crate::host::{ByteBudget, ByteReservation};
use crate::movement::MotionTrack;
use crate::reception::{VisionParameters, horizontal_cone, moving_point_sight_cuts};
use crate::spatial::{atan2, distance, interpolate};
use crate::state::Point;
use crate::work::{WorkMeters, WorkUnit};
use std::mem::size_of;

#[derive(Clone, Copy)]
pub(crate) enum ExecutedTrack<'a> {
    /// Knots in elapsed game seconds, starting at zero and ending at the
    /// accepted interval's horizon. The movement owner retains their funding.
    Moving(&'a MotionTrack),
    Stationary(Point),
}

impl ExecutedTrack<'_> {
    fn covers(&self, seconds: f64) -> bool {
        match self {
            Self::Stationary(_) => true,
            Self::Moving(track) => {
                track.at.len() == track.pose.len()
                    && track.at.first() == Some(&0.0)
                    && track.at.last() == Some(&seconds)
                    && track.at.windows(2).all(|pair| pair[0] < pair[1])
            }
        }
    }

    fn interior(&self) -> &[f64] {
        match self {
            Self::Stationary(_) => &[],
            Self::Moving(track) => &track.at[1..track.at.len() - 1],
        }
    }

    /// Keep the last moving leg when a full movement budget ends with
    /// an unchanged pose and only a rounding-sized timestamp remainder.
    /// An actual stop retains its stationary leg and has no lead.
    fn moving_suffix(&self, seconds: f64, epsilon: f64) -> Option<f64> {
        let Self::Moving(track) = self else {
            return None;
        };
        let last = track.at.len() - 1;
        let mut from = last - 1;
        if track.pose[from] == track.pose[last] {
            if seconds - track.at[from] > epsilon || from == 0 {
                return None;
            }
            from -= 1;
        }
        (track.pose[from] != track.pose[last]).then_some(track.at[from])
    }

    fn at(&self, elapsed: f64, through: &mut usize) -> Point {
        match self {
            Self::Stationary(point) => *point,
            Self::Moving(track) => {
                while track.at[*through] < elapsed {
                    *through += 1;
                }
                let from = *through - 1;
                if elapsed == track.at[*through] {
                    return track.pose[*through];
                }
                let fraction = (elapsed - track.at[from]) / (track.at[*through] - track.at[from]);
                interpolate(track.pose[from], track.pose[*through], fraction)
            }
        }
    }
}

pub(crate) struct AimObservation<'a> {
    pub from_at: f64,
    pub at: f64,
    /// Exact elapsed duration used by the motion owner, before adding the
    /// absolute world clock. Its final knot need not equal an absolute subtraction.
    pub seconds: f64,
    pub time_epsilon: f64,
    pub receiver_heading: f64,
    pub eye_height: f64,
    pub target_center_height: f64,
    pub vision: VisionParameters,
    pub receiver: ExecutedTrack<'a>,
    pub target: ExecutedTrack<'a>,
}

#[derive(Clone, Copy)]
struct LinearPiece {
    from: Point,
    to: Point,
    starts: f64,
    ends: f64,
}
impl LinearPiece {
    fn position(self, elapsed: f64) -> Point {
        if elapsed == self.ends {
            return self.to;
        }
        interpolate(
            self.from,
            self.to,
            (elapsed - self.starts) / (self.ends - self.starts),
        )
    }
}

#[derive(Clone, Copy)]
struct ReceiverPiece {
    feet: LinearPiece,
    heading: f64,
}

struct ObservationEnd {
    from_at: f64,
    at: f64,
    epsilon: f64,
    target: LinearPiece,
}

pub(crate) struct AimMotionSweep {
    end: ObservationEnd,
    vision: VisionParameters,
    eye_height: f64,
    pieces: Vec<ReceiverPiece>,
    request: GeometryQueries,
    _storage: ByteReservation,
}

pub(crate) struct AimMotionRays {
    end: ObservationEnd,
    /// Each ray certifies the interval until the next recorded cut. Pieces
    /// already ruled out by range or cone never enter this last suffix.
    starts: Vec<f64>,
    request: GeometryQueries,
    _storage: ByteReservation,
}

impl AimMotionSweep {
    pub(crate) fn prepare(
        input: AimObservation<'_>,
        binding: GeometryBinding,
        budget: &ByteBudget,
        meters: &mut WorkMeters,
    ) -> Result<Option<Self>, ExecutionError> {
        if !input.seconds.is_finite()
            || input.seconds <= input.time_epsilon
            || input.at <= input.from_at
            || input.vision.radius <= 0.0
            || !input.receiver.covers(input.seconds)
            || !input.target.covers(input.seconds)
        {
            return Ok(None);
        }
        let Some(target_start) = input
            .target
            .moving_suffix(input.seconds, input.time_epsilon)
        else {
            return Ok(None);
        };
        if input.seconds - target_start <= input.time_epsilon {
            return Ok(None);
        }
        let mut target_index = 1;
        let target = LinearPiece {
            from: lift(
                input.target.at(target_start, &mut target_index),
                input.target_center_height,
            ),
            to: lift(
                input.target.at(input.seconds, &mut target_index),
                input.target_center_height,
            ),
            starts: target_start,
            ends: input.seconds,
        };
        let count = input.receiver.interior().len()
            - input
                .receiver
                .interior()
                .partition_point(|cut| *cut <= target_start)
            + 1;
        let storage = reserve_rows::<ReceiverPiece, SightSweepQuery, Self>(count, budget)?;
        let mut request = GeometryQueries::new(binding);
        reserve(&mut request.sight_sweeps, count)?;
        let mut pieces = Vec::new();
        reserve(&mut pieces, count)?;
        let mut observer_index = 1;
        let mut from = input.receiver.at(0.0, &mut observer_index);
        let mut starts = 0.0;
        let mut heading = input.receiver_heading;
        let mut own_cuts = input.receiver.interior().iter().copied().peekable();
        let mut target_cuts = input.target.interior().iter().copied().peekable();

        // Merge the two executed paths without copying them. Earlier legs
        // only establish facing; no earlier leg can determine the final lead.
        loop {
            let own_cut = own_cuts.peek().copied().unwrap_or(input.seconds);
            let target_cut = target_cuts.peek().copied().unwrap_or(input.seconds);
            let ends = own_cut.min(target_cut);
            let to = input.receiver.at(ends, &mut observer_index);
            let dx = to.x - from.x;
            let dz = to.z - from.z;
            if dx.hypot(dz) > 1e-8 {
                heading = atan2(dx, dz);
            }
            if starts >= target_start {
                meters.charge(&[(WorkUnit::Tests, 1)])?;
                request.sight_sweeps.push(SightSweepQuery {
                    eye_from: lift(from, input.eye_height),
                    eye_to: lift(to, input.eye_height),
                    point_from: target.position(starts),
                    point_to: target.position(ends),
                });
                pieces.push(ReceiverPiece {
                    feet: LinearPiece {
                        from,
                        to,
                        starts,
                        ends,
                    },
                    heading,
                });
            }
            if ends == input.seconds {
                break;
            }
            if ends == own_cut {
                own_cuts.next();
            }
            if ends == target_cut {
                target_cuts.next();
            }
            starts = ends;
            from = to;
        }
        Ok(Some(Self {
            end: ObservationEnd {
                from_at: input.from_at,
                at: input.at,
                epsilon: input.time_epsilon,
                target,
            },
            vision: input.vision,
            eye_height: input.eye_height,
            pieces,
            request,
            _storage: storage,
        }))
    }

    pub(crate) fn request(&self) -> &GeometryQueries {
        &self.request
    }

    pub(crate) fn rays(
        self,
        answer: GeometryAnswers,
        binding: GeometryBinding,
        budget: &ByteBudget,
        meters: &mut WorkMeters,
    ) -> Result<Option<AimMotionRays>, ExecutionError> {
        self.request
            .validate_answers(&answer)
            .map_err(|_| ExecutionError::Invariant)?;
        let count = answer
            .sight_sweeps
            .iter()
            .try_fold(0_usize, |count, sweep| {
                count.checked_add(sweep.fractions.len().checked_add(6)?)
            })
            .ok_or(ExecutionError::Capacity)?;
        let storage = reserve_rows::<SightRay, f64, AimMotionRays>(count, budget)?;
        let mut request = GeometryQueries::new(binding);
        reserve(&mut request.sight, count)?;
        let mut starts = Vec::new();
        reserve(&mut starts, count)?;
        for ((piece, ray), sweep) in self
            .pieces
            .into_iter()
            .zip(self.request.sight_sweeps)
            .zip(answer.sight_sweeps)
        {
            let mut fractions = sweep.fractions;
            let bytes = fractions
                .len()
                .checked_add(7)
                .and_then(|count| count.checked_mul(size_of::<f64>()))
                .ok_or(ExecutionError::Capacity)?;
            let _cuts = budget.reserve(bytes)?;
            reserve(&mut fractions, 7)?;
            moving_point_sight_cuts(
                [piece.feet.from, piece.feet.to], piece.heading, &ray, self.vision, &mut fractions,
            );
            fractions.sort_unstable_by(f64::total_cmp);
            let width = piece.feet.ends - piece.feet.starts;
            for pair in fractions.windows(2) {
                let start = piece.feet.starts + pair[0] * width;
                let end = piece.feet.starts + pair[1] * width;
                if end <= start {
                    continue;
                }
                let middle = (start + end) / 2.0;
                let from = piece.feet.position(middle);
                let to = self.end.target.position(middle);
                if distance(from, to) > self.vision.radius
                    || !horizontal_cone(from, piece.heading, self.vision.field_of_view, to)
                {
                    starts.clear();
                    request.sight.clear();
                    continue;
                }
                starts.push(start);
                request.sight.push(SightRay {
                    from: lift(from, self.eye_height),
                    to,
                });
            }
        }
        if starts.is_empty() {
            return Ok(None);
        }
        meters.charge(&[(WorkUnit::Tests, request.sight.len() as u64)])?;
        Ok(Some(AimMotionRays {
            end: self.end,
            starts,
            request,
            _storage: storage,
        }))
    }
}

impl AimMotionRays {
    pub(crate) fn request(&self) -> &GeometryQueries {
        &self.request
    }

    pub(crate) fn finish(
        self,
        answer: GeometryAnswers,
        budget: &ByteBudget,
    ) -> Result<Option<(ObservedMotion, ByteReservation)>, ExecutionError> {
        self.request
            .validate_answers(&answer)
            .map_err(|_| ExecutionError::Invariant)?;
        let last_blocked = answer.sight.iter().rposition(|visible| !*visible);
        let first = last_blocked.map_or(0, |index| index + 1);
        let Some(&start) = self.starts.get(first) else {
            return Ok(None);
        };
        let from_at = self.end.from_at + start;
        if self.end.target.ends - start <= self.end.epsilon || from_at >= self.end.at {
            return Ok(None);
        }
        let custody = budget.reserve(size_of::<ObservedMotion>())?;
        Ok(Some((
            ObservedMotion {
                from_at,
                at: self.end.at,
                from: self.end.target.position(start),
                to: self.end.target.to,
            },
            custody,
        )))
    }
}

fn lift(point: Point, height: f64) -> Point {
    Point {
        y: point.y + height,
        ..point
    }
}


fn reserve_rows<A, B, Owner>(
    count: usize,
    budget: &ByteBudget,
) -> Result<ByteReservation, ExecutionError> {
    let bytes = count
        .checked_mul(size_of::<A>() + size_of::<B>())
        .and_then(|bytes| bytes.checked_add(size_of::<Owner>()))
        .ok_or(ExecutionError::Capacity)?;
    Ok(budget.reserve(bytes)?)
}

fn reserve<T>(values: &mut Vec<T>, additional: usize) -> Result<(), ExecutionError> {
    values
        .try_reserve_exact(additional)
        .map_err(|_| ExecutionError::Capacity)
}
