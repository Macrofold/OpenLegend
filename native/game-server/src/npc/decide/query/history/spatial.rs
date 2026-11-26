//! Historical distances use one permitted receipt inventory. The math reads
//! neither current positions nor a path between separately received samples.

use super::{
    CallFailure, HistoryReads, Range, RuntimeNpcBindingRequest, RuntimeNpcRead, capacity, prepare,
};
use crate::spatial::index::ReceivedIndex;
use openlegend_simulation::{
    host::{ByteBudget, ByteReservation},
    records::SqlCell,
    runtime::RuntimeNpcSeparation,
};
use std::{collections::BTreeSet, mem::size_of};

mod facts;
mod output;
use facts::{Body, Edge, Fact, Selected};
pub(in crate::npc::decide::query) use output::Page;

#[derive(Clone, Copy)]
pub(super) struct Request<'a> {
    anchor: &'a str,
    other: Option<&'a str>,
    from: f64,
    through: f64,
    radius: f64,
}

impl Request<'_> {
    fn includes(self, track: &str) -> bool {
        track == self.anchor || self.other == Some(track)
    }
}

pub(super) fn request<'a>(
    question: &SqlCell,
    original: &'a RuntimeNpcRead,
    current: &RuntimeNpcRead,
    binding: &RuntimeNpcBindingRequest,
) -> Result<Option<Request<'a>>, CallFailure> {
    let fields = question.as_object().ok_or(CallFailure::Invalid)?;
    let value = |key| fields.get(key).ok_or(CallFailure::Invalid);
    let number = |key| value(key)?.as_f64().ok_or(CallFailure::Invalid);
    let track = |key| -> Result<Option<&'a str>, CallFailure> {
        let alias = value(key)?.as_str().ok_or(CallFailure::Invalid)?;
        Ok(binding.received_history_track(original, current, alias))
    };
    let Some(anchor) = track("anchor")? else {
        return Ok(None);
    };
    let other = if value("other")?.is_null() {
        None
    } else {
        let Some(other) = track("other")? else {
            return Ok(None);
        };
        Some(other)
    };
    let from = number("from")?;
    let through = number("through")?.min(original.decision_origin().at);
    Ok((from <= through).then_some(Request {
        anchor,
        other,
        from,
        through,
        radius: number("radius")?,
    }))
}

pub(super) fn receipt_range(original: &RuntimeNpcRead) -> Range {
    Range {
        from: 0.0,
        through: original.decision_origin().at,
    }
}

impl HistoryReads {
    pub(in crate::npc::decide::query) fn spatial(
        &self,
        original: &RuntimeNpcRead,
        current: &RuntimeNpcRead,
        binding: &RuntimeNpcBindingRequest,
        question: &SqlCell,
        remaining: &mut u64,
        budget: &ByteBudget,
        scope: &str,
    ) -> Result<Page, CallFailure> {
        let Some(request) = request(question, original, current, binding)? else {
            return Ok(Page::unavailable());
        };
        let window = &self.window(receipt_range(original))?.rows;
        let Some(inventory) = window.inventory else {
            return Ok(Page::unavailable());
        };
        let (rows, missing) = original
            .query_receipts(inventory)
            .map_err(prepare::packet_failure)?;
        let selected =
            Selected::from_receipts(rows, request, window.limit, window.operations, budget)?;
        let mut incomplete =
            window.incomplete || missing || selected.incomplete || selected.truncated;
        // A missing or truncated row can contain an intervening end of sight.
        // No endpoint change is inferred across such a gap.
        let compare = !window.truncated && !missing && !selected.truncated;
        let (samples, _custody) = samples(
            original,
            request,
            &selected,
            remaining,
            budget,
            &mut incomplete,
        )?;
        Page::from_samples(
            samples,
            selected.prepared,
            incomplete,
            compare,
            scope,
            inventory,
            budget,
        )
    }
}

#[derive(Clone, Copy)]
struct Hit<'a> {
    edge: Edge<'a>,
    measurement: RuntimeNpcSeparation,
}

struct Sample<'a> {
    anchor: Body<'a>,
    at: f64,
    other: Option<(RuntimeNpcSeparation, Option<Body<'a>>)>,
    boundaries: Vec<Hit<'a>>,
    partial: bool,
}

fn samples<'a>(
    original: &RuntimeNpcRead,
    request: Request<'a>,
    selected: &Selected<'a>,
    remaining: &mut u64,
    budget: &ByteBudget,
    incomplete: &mut bool,
) -> Result<(Vec<Sample<'a>>, ByteReservation), CallFailure> {
    let maximum = selected
        .bodies
        .len()
        .min(usize::try_from(*remaining).map_err(|_| capacity())?);
    let mut storage = budget
        .reserve(
            selected
                .bodies
                .len()
                .checked_mul(4 * size_of::<Body<'_>>() + 128)
                .ok_or_else(capacity)?
                .checked_add(
                    maximum
                        .checked_mul(size_of::<Sample<'_>>())
                        .ok_or_else(capacity)?,
                )
                .ok_or_else(capacity)?,
        )
        .map_err(super::super::super::response_capacity)?;
    let mut anchors = Vec::new();
    let mut others = Vec::new();
    for &body in &selected.bodies {
        let track = body.point.receipt.header.subject.as_str();
        if track == request.anchor
            && body.through() >= request.from
            && body.from() <= request.through
            && body.from() <= body.through()
        {
            anchors.push(body);
        }
        if request.other == Some(track) {
            others.push(body);
        }
    }
    let time_order = |fact: Fact<'_>| {
        (
            fact.receipt.order,
            fact.receipt.locator.batch_order,
            fact.receipt.locator.entry_index,
        )
    };
    anchors.sort_by(|a, b| {
        b.through()
            .total_cmp(&a.through())
            .then_with(|| time_order(b.point).cmp(&time_order(a.point)))
    });
    others.sort_by(|a, b| {
        b.from().total_cmp(&a.from()).then(
            b.point
                .field
                .clock
                .acquired_at
                .total_cmp(&a.point.field.clock.acquired_at),
        )
    });
    // Index positions into the one sorted counterpart list. Empty or
    // one-entry phases require no separate backing or body copy.
    let mut by_phase: Vec<_> = (0..others.len()).collect();
    by_phase.sort_by_key(|index| others[*index].point.phase());
    let index = ReceivedIndex::build(
        selected.edges.iter().map(|edge| Some(edge.bounds())),
        budget,
    )
    .map_err(super::super::super::response_capacity)?;
    let mut result = Vec::with_capacity(maximum);
    let mut seen = BTreeSet::new();
    for (position, &anchor) in anchors.iter().enumerate() {
        if *remaining == 0 {
            *incomplete = true;
            break;
        }
        *remaining -= 1;
        let at = anchor.through().min(request.through);
        if !anchor.supports(at) {
            continue;
        }
        let pose = anchor.geometry(at);
        let bits = |value: f64| if value == 0.0 { 0 } else { value.to_bits() };
        if !seen.insert((
            anchor.point.phase(),
            [
                at,
                pose.position.x,
                pose.position.y,
                pose.position.z,
                pose.radius,
                pose.height,
            ]
            .map(bits),
        )) {
            continue;
        }
        let other = request.other.map(|_| {
            let other = compatible(anchor, at, &by_phase, &others, remaining, incomplete);
            let measure = other.map_or(RuntimeNpcSeparation::Unavailable, |body| {
                pose.separation(body.geometry(at))
            });
            let witness = matches!(measure, RuntimeNpcSeparation::Complete { .. })
                .then_some(other)
                .flatten();
            (measure, witness)
        });
        // Spend only this anchor's share of the remaining visit budget. Hits
        // still have to prove the original life, epoch and supported time.
        let allowance = *remaining / (anchors.len() - position) as u64;
        let mut visits = allowance;
        let mut found = Vec::new();
        let count = usize::try_from(allowance)
            .map_err(|_| capacity())?
            .min(selected.edges.len());
        let bytes = count
            .checked_mul(size_of::<Hit<'_>>() + size_of::<usize>())
            .ok_or_else(capacity)?;
        storage
            .resize(storage.bytes().checked_add(bytes).ok_or_else(capacity)?)
            .map_err(super::super::super::response_capacity)?;
        found.try_reserve_exact(count).map_err(|_| capacity())?;
        let complete = index.query(
            &anchor.bounds(request.radius),
            &mut visits,
            &mut |ordinal| {
                let edge = selected.edges[ordinal];
                let (life, epoch, _) = edge.fact.phase();
                let (anchor_life, anchor_epoch, _) = anchor.point.phase();
                if (life, epoch) != (anchor_life, anchor_epoch)
                    || !edge.fact.supports(at)
                    || found
                        .iter()
                        .any(|hit: &Hit<'_>| identical(hit.edge.fact, edge.fact))
                {
                    return;
                }
                let measurement =
                    original.received_historical_clearance(pose, edge.value, edge.fact.from());
                if matches!(measurement, RuntimeNpcSeparation::Complete { .. }) {
                    found.push(Hit { edge, measurement });
                }
            },
        );
        *remaining -= allowance - visits;
        *incomplete |= !complete;
        result.push(Sample {
            at,
            anchor,
            other,
            boundaries: found,
            partial: !complete,
        });
    }
    result.sort_by(|a, b| {
        a.at.total_cmp(&b.at)
            .then_with(|| time_order(a.anchor.point).cmp(&time_order(b.anchor.point)))
    });
    Ok((result, storage))
}

fn identical(first: Fact<'_>, second: Fact<'_>) -> bool {
    match (&first.field.original, &second.field.original) {
        (Some(first), Some(second)) => first == second,
        _ => {
            first.ordinal == second.ordinal && first.field.member_index == second.field.member_index
        }
    }
}

fn compatible<'a>(
    anchor: Body<'a>,
    at: f64,
    by_phase: &[usize],
    others: &[Body<'a>],
    remaining: &mut u64,
    incomplete: &mut bool,
) -> Option<Body<'a>> {
    let phase = anchor.point.phase();
    let phase_of = |index: usize| others[index].point.phase();
    let first = by_phase.partition_point(|&index| phase_of(index) < phase);
    let through = by_phase.partition_point(|&index| phase_of(index) <= phase);
    let same_phase = by_phase[first..through].iter().map(|&index| others[index]);
    let result = scan_compatible(same_phase, at, remaining).and_then(|(selected, conflict)| {
        if selected.is_some() {
            return Ok((selected, conflict));
        }
        let alternatives = others.iter().copied().filter(|body| {
            let (life, epoch, acquisition) = body.point.phase();
            (life, epoch) == (phase.0, phase.1) && acquisition != phase.2
        });
        scan_compatible(alternatives, at, remaining)
    });
    match result {
        Ok((value, false)) => value,
        Ok((_, true)) => None,
        Err(()) => {
            *incomplete = true;
            None
        }
    }
}

fn scan_compatible<'a>(
    candidates: impl Iterator<Item = Body<'a>>,
    at: f64,
    remaining: &mut u64,
) -> Result<(Option<Body<'a>>, bool), ()> {
    let mut selected = None;
    let mut conflict = false;
    for body in candidates {
        if *remaining == 0 {
            return Err(());
        }
        *remaining -= 1;
        if body.supports(at) {
            conflict |= selected.is_some_and(|first: Body<'_>| !first.same_pose(body));
            selected.get_or_insert(body);
        }
    }
    Ok((selected, conflict))
}
