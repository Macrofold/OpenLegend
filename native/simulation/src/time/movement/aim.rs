//! Aims record movement only for their own exact current target and witness.
//! This slice owns actual executed tracks until the sight query is answered.

use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries};
use crate::host::{ByteBudget, ByteReservation, retained_size::map_storage};
use crate::movement::MotionForecast;
use crate::projectile::{
    ObservedMotion,
    observed_motion::{AimMotionRays, AimMotionSweep, AimObservation, ExecutedTrack},
};
use crate::reception::{SightBatch, VisionParameters, vision_parameters};
use crate::state::{Action, Entity, EntityHandle, Point};
use crate::time::{actions::advances_ground, input::PreparedSteering};
use indexmap::IndexMap;
use std::mem::size_of;

struct Watch {
    receiver: EntityHandle,
    receiver_life: u64,
    action: String,
    target: EntityHandle,
    target_life: u64,
    heading: f64,
    eye_height: f64,
    center_height: f64,
    vision: VisionParameters,
    seen_before: bool,
}

struct BodyTrack {
    from: Point,
    actual: Option<MotionForecast>,
    ambiguous: bool,
}

enum SightWork {
    Before(SightBatch),
    After(SightBatch),
    Sweep(AimMotionSweep),
    Rays(AimMotionRays),
}

pub(in crate::time) struct AimTracks {
    from_at: f64,
    watches: Vec<Watch>,
    bodies: IndexMap<EntityHandle, BodyTrack>,
    next: usize,
    pending: Option<SightWork>,
    before_finished: bool,
    finished: bool,
    text_bytes: usize,
    storage: ByteReservation,
}

fn grounded(body: &Entity) -> Option<Point> {
    if !body.actively_participates()
        || body.spatial.flight.is_some()
        || body.spatial.fall_velocity.is_some()
        || body.spatial.local_pose.is_some()
        || !body.actor.as_ref().is_some_and(|actor| actor.alive)
    {
        return None;
    }
    body.world_position()
}

impl AimTracks {
    pub(in crate::time) fn start(
        core: &CoreMutation<'_>,
        handle: EntityHandle,
        body: &Entity,
        action: &Action,
        steering: &PreparedSteering,
        budget: &ByteBudget,
        slot: &mut Option<Box<Self>>,
    ) -> Result<(), ExecutionError> {
        let Some(aimed) = action
            .ranged
            .as_ref()
            .and_then(|aim| aim.aim_target.as_ref())
        else {
            return Ok(());
        };
        let Some(from) = grounded(body) else {
            return Ok(());
        };
        let entities = &core.state.physical.entities;
        let Some(target_handle) = entities.handle(&aimed.id) else {
            return Ok(());
        };
        let Some(target_body) = entities
            .resolve(target_handle)
            .filter(|target| target.physical_life() == Some(aimed.life))
        else {
            return Ok(());
        };
        let Some(target_from) = grounded(target_body) else {
            return Ok(());
        };
        // An idle subject cannot contribute a newly observed ground leg.
        if !steering.routes.contains_key(&target_handle)
            && !target_body
                .actor
                .as_ref()
                .and_then(|actor| actor.action.as_ref())
                .is_some_and(advances_ground)
        {
            return Ok(());
        }
        let vision = vision_parameters(&core.state.installed, body);
        if vision.radius <= 0.0 {
            return Ok(());
        }
        let receiver_profile = crate::status::effective_body_profile(body, budget)?;
        let target_profile = crate::status::effective_body_profile(target_body, budget)?;
        if slot.is_none() {
            *slot = Some(Box::new(Self {
                from_at: core.state.physical.header.sim_time,
                watches: Vec::new(),
                bodies: IndexMap::new(),
                next: 0,
                pending: None,
                before_finished: false,
                finished: false,
                text_bytes: 0,
                storage: budget.reserve(size_of::<Self>())?,
            }));
        }
        let entry = slot.as_mut().ok_or(ExecutionError::Invariant)?;
        let watch_count = entry
            .watches
            .len()
            .checked_add(1)
            .ok_or(ExecutionError::Capacity)?;
        let watch_capacity = if watch_count > entry.watches.capacity() {
            watch_count
                .max(4)
                .checked_mul(2)
                .ok_or(ExecutionError::Capacity)?
        } else {
            entry.watches.capacity()
        };
        let body_count = entry.bodies.len()
            + usize::from(!entry.bodies.contains_key(&handle))
            + usize::from(!entry.bodies.contains_key(&target_handle));
        let body_capacity = if body_count > entry.bodies.capacity() {
            body_count
                .max(4)
                .checked_mul(2)
                .ok_or(ExecutionError::Capacity)?
        } else {
            entry.bodies.capacity()
        };
        let map_bytes = map_storage::<EntityHandle, BodyTrack>(body_capacity)
            .ok_or(ExecutionError::Capacity)?;
        // A growing collection can temporarily coexist with its old backing.
        let new_watch_slots = if watch_capacity > entry.watches.capacity() {
            watch_capacity
        } else {
            0
        };
        let new_map_bytes = if body_capacity > entry.bodies.capacity() {
            map_bytes
        } else {
            0
        };
        let added = new_watch_slots
            .checked_mul(size_of::<Watch>())
            .and_then(|bytes| bytes.checked_add(action.id.len()))
            .and_then(|bytes| bytes.checked_add(new_map_bytes))
            .ok_or(ExecutionError::Capacity)?;
        let previously = entry.storage.bytes();
        entry.storage.resize(
            previously
                .checked_add(added)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        if watch_capacity > entry.watches.capacity() {
            entry
                .watches
                .try_reserve_exact(watch_capacity - entry.watches.len())
                .map_err(|_| ExecutionError::Capacity)?;
        }
        if body_capacity > entry.bodies.capacity() {
            entry
                .bodies
                .try_reserve(body_capacity - entry.bodies.len())
                .map_err(|_| ExecutionError::Capacity)?;
        }
        for (which, origin) in [(handle, from), (target_handle, target_from)] {
            entry.bodies.entry(which).or_insert(BodyTrack {
                from: origin,
                actual: None,
                ambiguous: false,
            });
        }
        entry.watches.push(Watch {
            receiver: handle,
            receiver_life: body.physical_life().ok_or(ExecutionError::MissingActor)?,
            action: action.id.clone(),
            target: target_handle,
            target_life: aimed.life,
            heading: body.spatial.heading,
            eye_height: receiver_profile.eye_height,
            center_height: target_profile.height * 0.5,
            vision,
            seen_before: false,
        });
        entry.text_bytes = entry
            .text_bytes
            .checked_add(action.id.len())
            .ok_or(ExecutionError::Capacity)?;
        let map_bytes = map_storage::<EntityHandle, BodyTrack>(entry.bodies.capacity())
            .ok_or(ExecutionError::Capacity)?;
        let bytes = entry
            .watches
            .capacity()
            .checked_mul(size_of::<Watch>())
            .and_then(|n| n.checked_add(size_of::<Self>()))
            .and_then(|n| n.checked_add(map_bytes))
            .and_then(|n| n.checked_add(entry.text_bytes))
            .ok_or(ExecutionError::Capacity)?;
        entry.storage.resize(bytes)?;
        Ok(())
    }

    pub(super) fn recording(&self, handle: EntityHandle) -> bool {
        self.bodies.contains_key(&handle)
    }

    pub(super) fn record(&mut self, handle: EntityHandle, track: MotionForecast) {
        if let Some(record) = self.bodies.get_mut(&handle) {
            if record.actual.is_some() {
                record.ambiguous = true;
                record.actual = None;
            } else if !record.ambiguous {
                record.actual = Some(track);
            }
        }
    }

    pub(super) fn before_finished(&self) -> bool {
        self.before_finished
    }
    pub(super) fn finished(&self) -> bool {
        self.finished
    }

    pub(super) fn question(&self) -> Option<&GeometryQueries> {
        match self.pending.as_ref()? {
            SightWork::Before(sight) | SightWork::After(sight) => Some(sight.queries()),
            SightWork::Sweep(sweep) => Some(sweep.request()),
            SightWork::Rays(rays) => Some(rays.request()),
        }
    }

    fn bound<'a>(&self, core: &'a CoreMutation<'_>) -> Option<(&'a Entity, Option<&'a Entity>)> {
        let watch = self.watches.get(self.next)?;
        let entities = &core.state.physical.entities;
        let receiver = entities.resolve(watch.receiver)?;
        if receiver.physical_life() != Some(watch.receiver_life) {
            return None;
        }
        let aim = receiver
            .actor
            .as_ref()?
            .action
            .as_ref()
            .filter(|action| action.id == watch.action && action.stage == "working")?
            .ranged
            .as_ref()?
            .aim_target
            .as_ref()?;
        let target = entities.resolve(watch.target).filter(|target| {
            target.id == aim.id
                && target.physical_life() == Some(watch.target_life)
                && aim.life == watch.target_life
        });
        Some((receiver, target))
    }

    fn next_binding(
        core: &mut CoreMutation<'_>,
        mut binding: GeometryBinding,
    ) -> Result<GeometryBinding, ExecutionError> {
        binding.serial = core.journal.next_provider_serial()?;
        Ok(binding)
    }

    fn resolve(
        &self,
        core: &mut CoreMutation<'_>,
        sample: Option<ObservedMotion>,
    ) -> Result<(), ExecutionError> {
        if self.bound(core).is_some() {
            let watch = &self.watches[self.next];
            core.physical()
                .set_observed_aim_motion(watch.receiver, &watch.action, sample)?;
        }
        Ok(())
    }

    fn executed(&self, handle: EntityHandle, at: Point) -> Option<ExecutedTrack<'_>> {
        let body = self.bodies.get(&handle)?;
        if body.ambiguous {
            return None;
        }
        if let Some(motion) = body.actual.as_ref() {
            let track = &motion.track;
            (*track.pose.first()? == body.from && *track.pose.last()? == at)
                .then_some(ExecutedTrack::Moving(track))
        } else {
            (body.from == at).then_some(ExecutedTrack::Stationary(at))
        }
    }

    fn actual_sweep(
        &self,
        core: &mut CoreMutation<'_>,
        seconds: f64,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Option<AimMotionSweep>, ExecutionError> {
        let Some((receiver, Some(target))) = self.bound(core) else {
            return Ok(None);
        };
        let Some((receiver_at, target_at)) = grounded(receiver).zip(grounded(target)) else {
            return Ok(None);
        };
        let watch = &self.watches[self.next];
        let receiver_profile = crate::status::effective_body_profile(receiver, budget)?;
        let target_profile = crate::status::effective_body_profile(target, budget)?;
        if receiver_profile.eye_height != watch.eye_height
            || target_profile.height * 0.5 != watch.center_height
        {
            return Ok(None);
        }
        let Some((receiver, target)) = self
            .executed(watch.receiver, receiver_at)
            .zip(self.executed(watch.target, target_at))
        else {
            return Ok(None);
        };
        // A stationary target contributes no lead.
        if !matches!(target, ExecutedTrack::Moving(_)) {
            return Ok(None);
        }
        AimMotionSweep::prepare(
            AimObservation {
                from_at: self.from_at,
                at: core.state.physical.header.sim_time,
                seconds,
                time_epsilon: core.state.installed.time_epsilon,
                receiver_heading: watch.heading,
                eye_height: watch.eye_height,
                target_center_height: watch.center_height,
                vision: watch.vision,
                receiver,
                target,
            },
            binding,
            budget,
            &mut core.journal.meters,
        )
    }

    pub(super) fn run(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<GeometryAnswers>,
        seconds: f64,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<bool, ExecutionError> {
        match (self.pending.take(), answer) {
            (Some(SightWork::Before(batch)), Some(answer)) => {
                let sight = batch.finish(answer).map_err(ExecutionError::Sensor)?;
                let seen = self
                    .bound(core)
                    .and_then(|(_, target)| target)
                    .is_some_and(|target| sight.seen(&target.id) == Some(true));
                self.watches[self.next].seen_before = seen;
                self.next += 1;
            }
            (Some(SightWork::After(batch)), Some(answer)) => {
                let sight = batch.finish(answer).map_err(ExecutionError::Sensor)?;
                if self
                    .bound(core)
                    .and_then(|(_, target)| target)
                    .is_some_and(|target| sight.seen(&target.id) == Some(true))
                {
                    let next = Self::next_binding(core, binding)?;
                    if let Some(sweep) = self.actual_sweep(core, seconds, next, budget)? {
                        self.pending = Some(SightWork::Sweep(sweep));
                        return Ok(true);
                    }
                }
                self.resolve(core, None)?;
                self.next += 1;
            }
            (Some(SightWork::Sweep(sweep)), Some(answer)) => {
                let next = Self::next_binding(core, binding)?;
                if let Some(rays) = sweep.rays(answer, next, budget, &mut core.journal.meters)? {
                    self.pending = Some(SightWork::Rays(rays));
                    return Ok(true);
                }
                self.resolve(core, None)?;
                self.next += 1;
            }
            (Some(SightWork::Rays(rays)), Some(answer)) => {
                let sample = rays.finish(answer, budget)?;
                self.resolve(core, sample.as_ref().map(|sample| sample.0))?;
                self.next += 1;
            }
            (None, None) => {}
            _ => return Err(ExecutionError::UnfinishedOccurrence),
        }
        while self.next < self.watches.len() {
            let next = Self::next_binding(core, binding)?;
            let is_relevant = !self.before_finished || {
                let entry = &self.watches[self.next];
                entry.seen_before
                    && self
                        .bodies
                        .get(&entry.target)
                        .is_some_and(|body| !body.ambiguous && body.actual.is_some())
            };
            if is_relevant {
                if let Some((receiver, Some(target))) = self.bound(core) {
                    let batch = SightBatch::prepare(
                        &core.state.physical,
                        &core.state.installed,
                        &receiver.id,
                        &[target.id.as_str()],
                        next,
                        budget,
                    )
                    .map_err(ExecutionError::Sensor)?;
                    self.pending = Some(if self.before_finished {
                        SightWork::After(batch)
                    } else {
                        SightWork::Before(batch)
                    });
                    return Ok(true);
                }
            }
            if self.before_finished {
                self.resolve(core, None)?;
            }
            self.next += 1;
        }
        if self.before_finished {
            self.finished = true;
        } else {
            self.before_finished = true;
            self.next = 0;
        }
        Ok(false)
    }
}
