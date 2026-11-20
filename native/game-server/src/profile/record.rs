//! Preallocated, capture-local storage. A slot is recycled only after its
//! operation finishes; a stale operation ID never resolves to its successor.

use openlegend_simulation::profile::{Link, Outcome, Site, sites};
use serde::Serialize;
use std::mem::size_of;

const SERIES: usize = 32;
const SLOTS: usize = 4096;
const AGGREGATES: usize = 8 * 1024 * 1024 - 512 * 1024; // world-host join metadata
const TRACE: usize = 64 * 1024 * 1024;
const MICROSECOND: u64 = 1_000;
const HOUR: u64 = 3_600_000_000_000;
pub(super) const MAX_EXACT: u64 = (1 << 53) - 1;
const INACTIVE: u8 = u8::MAX;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Window {
    pub start_ns: u64,
    pub end_ns: u64,
    pub drain_ns: u64,
    pub stop_ns: u64,
    pub complete: bool,
}

impl Window {
    fn clip(&self, start: u64, end: u64) -> u64 {
        end.min(self.end_ns)
            .saturating_sub(start.max(self.start_ns))
    }
}

#[derive(Serialize)]
struct Sampling {
    seed: u64,
    every: u8,
}

#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct Histogram {
    count: u64,
    sum_ns: u64,
    min_ns: Option<u64>,
    max_ns: Option<u64>,
    bins: Vec<u64>,
}

impl Histogram {
    fn new(length: usize) -> Result<Self, &'static str> {
        let mut bins = preallocate(length)?;
        bins.resize(length, 0);
        Ok(Self {
            bins,
            ..Self::default()
        })
    }

    fn record(&mut self, duration: u64, bounds: &[u64]) -> Option<()> {
        let index = if duration < MICROSECOND {
            0
        } else {
            1 + bounds.partition_point(|bound| *bound < duration)
        };
        add(self.bins.get_mut(index)?, 1)?;
        add(&mut self.count, 1)?;
        add(&mut self.sum_ns, duration)?;
        self.min_ns = Some(self.min_ns.map_or(duration, |old| old.min(duration)));
        self.max_ns = Some(self.max_ns.map_or(duration, |old| old.max(duration)));
        Some(())
    }
}

#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct Metric {
    id: &'static str,
    unit: &'static str,
    eligible: u64,
    sampled: u64,
    completed: u64,
    refused: u64,
    cancelled: u64,
    failed: u64,
    censored: u64,
    carry_in: u64,
    carry_in_censored: u64,
    unfinished_at_cutoff: u64,
    work: u64,
    count_calls: u64,
    window_active_ns: u64,
    window_self_ns: u64,
    active: Histogram,
    self_time: Histogram,
    latency: Histogram,
}

impl Metric {
    fn new(site: Site, bins: usize) -> Result<Self, &'static str> {
        Ok(Self {
            id: site.id(),
            unit: site.unit(),
            active: Histogram::new(bins)?,
            self_time: Histogram::new(bins)?,
            latency: Histogram::new(bins)?,
            ..Self::default()
        })
    }
}

#[derive(Clone, Copy)]
struct Segment {
    at: u64,
    lane: u32,
    parent: Option<Link>,
    child_ns: u64,
    child_window_ns: u64,
}

#[derive(Clone, Copy)]
struct Span {
    link: Link,
    parent: Option<u64>,
    started: u64,
    segment: Option<Segment>,
    active_ns: u64,
    self_ns: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Trace {
    kind: &'static str,
    at_ns: u64,
    token: u64,
    parent: Option<u64>,
    site: &'static str,
    lane: Option<u32>,
    outcome: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    work: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Capture {
    schema: u8,
    pub generation: u32,
    window: Window,
    sampling: Sampling,
    pub lost: u64,
    trace_lost: u64,
    metrics: Vec<Metric>,
    bounds_ns: Vec<u64>,
    trace: Vec<Trace>,
    #[serde(skip)]
    trace_limit: usize,
    #[serde(skip)]
    random: u64,
    #[serde(skip)]
    metric: [u8; 64],
    #[serde(skip)]
    slots: Vec<Option<Span>>,
    #[serde(skip)]
    free: Vec<u16>,
    #[serde(skip)]
    next_id: u64,
}

impl Capture {
    pub fn arm(
        generation: u32,
        names: &[String],
        window: Window,
        seed: u64,
        every: u8,
        trace_bytes: usize,
    ) -> Result<(Self, u64), &'static str> {
        if names.is_empty()
            || names.len() > SERIES
            || !matches!(every, 1 | 8 | 64)
            || seed > MAX_EXACT
            || trace_bytes > TRACE
        {
            return Err("capture exceeds the selection or recording limits");
        }
        let mut mask = 0u64;
        let mut metric = [INACTIVE; 64];
        let mut definitions = preallocate(names.len())?;
        for name in names {
            let mut matches = sites::ALL.iter().filter(|site| site.id() == name.as_str());
            let site = matches.next().ok_or("unknown compiled probe")?;
            if matches.next().is_some() || site.mask() == 0 || mask & site.mask() != 0 {
                return Err("duplicate or ambiguous compiled probe");
            }
            if sites::ALL
                .iter()
                .filter(|other| other.index() == site.index())
                .count()
                != 1
            {
                return Err("compiled probe index is ambiguous");
            }
            mask |= site.mask();
            metric[usize::from(site.index())] = definitions.len() as u8;
            definitions.push(*site);
        }
        let mut bounds_ns = Vec::new();
        let mut upper = MICROSECOND;
        loop {
            bounds_ns.push(upper);
            if upper == HOUR {
                break;
            }
            upper = (upper + upper / 100).min(HOUR);
        }
        let bins = bounds_ns.len() + 2;
        let bytes = size_of::<Self>()
            + definitions.len() * (size_of::<Metric>() + 3 * bins * size_of::<u64>())
            + bounds_ns.capacity() * size_of::<u64>()
            + SLOTS * (size_of::<Option<Span>>() + size_of::<u16>());
        if bytes > AGGREGATES {
            return Err("capture aggregate storage exceeds its allowance");
        }
        let mut metrics = preallocate(definitions.len())?;
        for site in definitions {
            metrics.push(Metric::new(site, bins)?);
        }
        let mut slots = preallocate(SLOTS)?;
        slots.resize(SLOTS, None);
        let mut free = preallocate(SLOTS)?;
        free.extend((0..SLOTS as u16).rev());
        let trace_limit = trace_bytes / size_of::<Trace>();
        Ok((
            Self {
                schema: 1,
                generation,
                window,
                sampling: Sampling { seed, every },
                lost: 0,
                trace_lost: 0,
                metrics,
                bounds_ns,
                trace: preallocate(trace_limit)?,
                trace_limit,
                random: seed.max(1),
                metric,
                slots,
                free,
                next_id: 0,
            },
            mask,
        ))
    }

    fn metric_index(&self, site: Site) -> usize {
        self.metric
            .get(usize::from(site.index()))
            .copied()
            .unwrap_or(INACTIVE)
            .into()
    }

    fn span(&self, link: Link) -> Option<Span> {
        if link.generation() != self.generation {
            return None;
        }
        self.slots
            .get(link.slot())
            .copied()
            .flatten()
            .filter(|span| span.link == link)
    }

    fn selected_sample(&mut self) -> bool {
        if self.sampling.every == 1 {
            return true;
        }
        let mut state = self.random;
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        self.random = state;
        state & u64::from(self.sampling.every - 1) == 0
    }

    pub fn begin(&mut self, now: u64, site: Site, parent: Option<Link>) -> Option<Option<Link>> {
        if now >= self.window.end_ns {
            return Some(None);
        }
        let index = self.metric_index(site);
        if index == usize::from(INACTIVE) {
            return Some(None);
        }
        let in_window = now >= self.window.start_ns;
        if in_window {
            add(&mut self.metrics.get_mut(index)?.eligible, 1)?;
        }
        if !self.selected_sample() {
            return Some(None);
        }
        let slot = self.free.pop()?;
        add(&mut self.next_id, 1)?;
        let link = Link::new(self.generation, slot, self.next_id, site);
        let parent = parent
            .filter(|link| link.generation() == self.generation)
            .map(Link::id);
        let span = Span {
            link,
            parent,
            started: now,
            segment: None,
            active_ns: 0,
            self_ns: 0,
        };
        *self.slots.get_mut(usize::from(slot))? = Some(span);
        if in_window {
            add(&mut self.metrics.get_mut(index)?.sampled, 1)?;
        }
        self.trace("begin", span, now, None, None, None);
        Some(Some(link))
    }

    pub fn resume(
        &mut self,
        now: u64,
        link: Link,
        lane: u32,
        parent: Option<Link>,
    ) -> Option<bool> {
        let Some(mut span) = self.span(link) else {
            return Some(false);
        };
        if now >= self.window.drain_ns {
            return Some(false);
        }
        if span.segment.is_some() {
            return None;
        }
        let parent = parent.filter(|parent| {
            self.span(*parent)
                .and_then(|span| span.segment)
                .is_some_and(|segment| segment.lane == lane)
        });
        span.segment = Some(Segment {
            at: now,
            lane,
            parent,
            child_ns: 0,
            child_window_ns: 0,
        });
        *self.slots.get_mut(link.slot())? = Some(span);
        self.trace("resume", span, now, Some(lane), None, None);
        Some(true)
    }

    fn close_segment(&mut self, span: &mut Span, now: u64, segment: Segment) -> Option<()> {
        let end = now.min(self.window.drain_ns);
        let elapsed = end.checked_sub(segment.at)?;
        let window = self.window.clip(segment.at, end);
        let index = self.metric_index(span.link.site());
        let metric = self.metrics.get_mut(index)?;
        add(&mut metric.window_active_ns, window)?;
        add(
            &mut metric.window_self_ns,
            window.checked_sub(segment.child_window_ns)?,
        )?;
        add(&mut span.active_ns, elapsed)?;
        add(&mut span.self_ns, elapsed.checked_sub(segment.child_ns)?)?;
        self.add_to_parent(segment, elapsed, window)
    }

    fn add_to_parent(&mut self, segment: Segment, elapsed: u64, window: u64) -> Option<()> {
        if let Some(parent) = segment.parent
            && let Some(slot) = self.slots.get_mut(parent.slot())
            && let Some(active) = slot.as_mut().filter(|active| active.link == parent)
            && let Some(parent) = active
                .segment
                .as_mut()
                .filter(|active| active.lane == segment.lane)
        {
            add(&mut parent.child_ns, elapsed)?;
            add(&mut parent.child_window_ns, window)?;
        }
        Some(())
    }

    pub fn suspend(&mut self, now: u64, link: Link, lane: u32) -> Option<()> {
        let Some(mut span) = self.span(link) else {
            return Some(());
        };
        let segment = span.segment.take().filter(|segment| segment.lane == lane)?;
        self.close_segment(&mut span, now, segment)?;
        *self.slots.get_mut(link.slot())? = Some(span);
        self.trace("suspend", span, now, Some(lane), None, None);
        Some(())
    }

    pub fn end(&mut self, now: u64, link: Link, outcome: Outcome, work: Option<u64>) -> Option<()> {
        let Some(mut span) = self.span(link) else {
            return Some(());
        };
        *self.slots.get_mut(link.slot())? = None;
        if self.free.len() == SLOTS {
            return None;
        }
        self.free.push(link.slot() as u16);
        let incomplete_segment = span.segment.take().is_some();
        let index = self.metric_index(link.site());
        let metric = self.metrics.get_mut(index)?;
        let censored = now > self.window.drain_ns || incomplete_segment;
        if span.started < self.window.start_ns {
            if now >= self.window.start_ns {
                add(&mut metric.carry_in, 1)?;
                if censored {
                    add(&mut metric.carry_in_censored, 1)?;
                }
            }
        } else {
            if now >= self.window.end_ns {
                add(&mut metric.unfinished_at_cutoff, 1)?;
            }
            if censored {
                add(&mut metric.censored, 1)?;
            } else {
                let count = match outcome {
                    Outcome::Completed => &mut metric.completed,
                    Outcome::Refused => &mut metric.refused,
                    Outcome::Cancelled => &mut metric.cancelled,
                    Outcome::Failed => &mut metric.failed,
                };
                add(count, 1)?;
                add(&mut metric.work, work?)?;
                metric.active.record(span.active_ns, &self.bounds_ns)?;
                metric.self_time.record(span.self_ns, &self.bounds_ns)?;
                metric
                    .latency
                    .record(now.checked_sub(span.started)?, &self.bounds_ns)?;
            }
        }
        self.trace(
            "end",
            span,
            now,
            None,
            Some(if censored {
                "censored"
            } else {
                outcome_name(outcome)
            }),
            work.filter(|_| !censored),
        );
        (!incomplete_segment).then_some(())
    }

    pub fn count(&mut self, now: u64, site: Site, amount: u64) -> Option<()> {
        if now < self.window.start_ns || now >= self.window.end_ns {
            return Some(());
        }
        let index = self.metric_index(site);
        if let Some(metric) = self.metrics.get_mut(index) {
            add(&mut metric.count_calls, 1)?;
            add(&mut metric.work, amount)?;
        }
        Some(())
    }

    fn trace(
        &mut self,
        kind: &'static str,
        span: Span,
        at_ns: u64,
        lane: Option<u32>,
        outcome: Option<&'static str>,
        work: Option<u64>,
    ) {
        if self.trace_limit == 0 || at_ns > self.window.drain_ns {
            return;
        }
        if self.trace.len() >= self.trace_limit {
            self.trace_lost = (self.trace_lost + 1).min(MAX_EXACT);
            return;
        }
        self.trace.push(Trace {
            kind,
            at_ns,
            token: span.link.id(),
            parent: span.parent,
            site: span.link.site().id(),
            lane,
            outcome,
            work,
        });
    }

    pub fn stop(&mut self, now: u64) -> bool {
        let stop_ns = now.min(self.window.drain_ns);
        self.window.stop_ns = stop_ns;
        self.window.complete = now >= self.window.end_ns;
        // Finalization is detached from the live recorder. All surviving
        // tokens are reported once at the frozen cutoff or drain boundary.
        // Account for still-open child segments before closing any parent.
        // Parent IDs may be newer than paused logical children.
        for index in 0..self.slots.len() {
            let Some(segment) = self.slots[index].and_then(|span| span.segment) else {
                continue;
            };
            let elapsed = stop_ns.saturating_sub(segment.at);
            let in_window = self.window.clip(segment.at, stop_ns);
            if self.add_to_parent(segment, elapsed, in_window).is_none() {
                self.lost += 1;
            }
        }
        for index in 0..self.slots.len() {
            let Some(mut span) = self.slots[index] else {
                continue;
            };
            if let Some(mut segment) = span.segment.take() {
                segment.parent = None;
                if self.close_segment(&mut span, stop_ns, segment).is_none() {
                    self.lost += 1;
                }
            }
            let index = self.metric_index(span.link.site());
            if let Some(metric) = self.metrics.get_mut(index) {
                if span.started < self.window.start_ns && stop_ns >= self.window.start_ns {
                    metric.carry_in += 1;
                    metric.carry_in_censored += 1;
                } else if span.started >= self.window.start_ns {
                    metric.censored += 1;
                    if now >= self.window.end_ns {
                        metric.unfinished_at_cutoff += 1;
                    }
                }
            }
            self.trace("censor", span, stop_ns, None, Some("censored"), None);
        }
        self.slots.clear();
        self.free.clear();
        self.window.complete
    }
}

fn preallocate<T>(capacity: usize) -> Result<Vec<T>, &'static str> {
    let mut storage = Vec::new();
    storage
        .try_reserve_exact(capacity)
        .map_err(|_| "could not admit capture storage")?;
    Ok(storage)
}

fn add(sum: &mut u64, value: u64) -> Option<()> {
    *sum = sum.checked_add(value).filter(|next| *next <= MAX_EXACT)?;
    Some(())
}

fn outcome_name(outcome: Outcome) -> &'static str {
    match outcome {
        Outcome::Completed => "completed",
        Outcome::Refused => "refused",
        Outcome::Cancelled => "cancelled",
        Outcome::Failed => "failed",
    }
}
