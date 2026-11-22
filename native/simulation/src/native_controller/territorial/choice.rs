use super::*;
use crate::{
    events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope},
    execution::{CoreMutation, ExecutionError, StagedOccurrence},
    geometry::{GeometryAnswers, GeometryBinding, GeometryQueries},
    host::{ByteBudget, ByteReservation},
    language::{CollationAnswer, CollationRanks, CollationRequest},
    reception::{SightBatch, SightResults},
    simulation::PhysicalState,
    state::{EntityHandle, Point},
};
use std::{cmp::Ordering, mem::size_of};

pub(crate) enum Intention {
    Move(SurfacePoint, ByteReservation),
    Stop,
}

#[derive(Clone, Copy)]
pub(crate) enum Notice {
    Withdrew,
    Stopped,
}

pub(crate) struct Review {
    handle: EntityHandle,
    at: f64,
    sight: Option<SightBatch>,
    visible: Option<SightResults>,
    ranks: Option<CollationRequest>,
    _custody: ByteReservation,
}

fn selected(
    physical: &PhysicalState,
    handle: EntityHandle,
) -> Result<(&Entity, &Threat), ExecutionError> {
    let entity = physical
        .entities
        .resolve(handle)
        .ok_or(ExecutionError::MissingEntity)?;
    Ok((
        entity,
        entity.threat.as_ref().ok_or(ExecutionError::Invariant)?,
    ))
}

fn life(entity: &Entity) -> u64 {
    entity
        .actor
        .as_ref()
        .and_then(|actor| actor.physical_life)
        .unwrap_or(0)
}

fn eligible(entity: &Entity, law: &Policy) -> bool {
    entity.actively_participates()
        && entity.actor.as_ref().is_some_and(|actor| {
            actor.alive
                && !actor.incapacitated
                && law.target_controllers.contains(&actor.controller)
                && actor
                    .body
                    .as_ref()
                    .is_some_and(|body| law.target_body_plans.contains(&body.plan))
        })
}

fn awaiting_activation(entity: &Entity, threat: &Threat) -> bool {
    threat.policy.activation.is_some()
        && threat.progress.mode == Mode::Idle
        && entity.actor.as_ref().is_none_or(|actor| {
            !actor
                .action
                .as_ref()
                .is_some_and(|action| action.kind == "feed" && action.stage == "working")
                && !(actor.action.is_none()
                    && entity
                        .animal
                        .as_ref()
                        .and_then(|animal| animal.foraging.as_ref())
                        .is_some_and(|forage| {
                            forage.mode == crate::native_response::ForagingMode::Resting
                        }))
        })
}

fn distance(a: Point, b: Point) -> f64 {
    ((a.x - b.x).powi(2) + (a.y - b.y).powi(2) + (a.z - b.z).powi(2)).sqrt()
}

fn near(entity: &Entity, home: &SurfacePoint, limit: f64) -> bool {
    entity
        .world_position()
        .is_some_and(|point| distance(point, home.point()) <= limit)
}

impl Review {
    pub(crate) fn prepare(
        core: &CoreMutation<'_>,
        handle: EntityHandle,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let physical = &core.state.physical;
        let (entity, threat) = selected(physical, handle)?;
        let at = physical.header.sim_time;
        if threat
            .review_at(entity, at)
            .is_none_or(|deadline| deadline > at)
        {
            return Ok(None);
        }
        let law = &threat.policy;
        let state = &threat.progress;
        let mut work = Self {
            handle,
            at,
            sight: None,
            visible: None,
            ranks: None,
            _custody: budget.reserve(size_of::<Self>())?,
        };
        if awaiting_activation(entity, threat) {
            return Ok(Some(work));
        }
        let bodies = &physical.bodies;
        let base = law.home.point();
        let (capacity, _) = if state.mode == Mode::Idle {
            bodies.candidate_capacity(base, law.entry_radius)
        } else {
            (0, 0)
        };
        let capacity = capacity.checked_add(2).ok_or(ExecutionError::Capacity)?;
        let _temporary = budget.reserve(
            capacity
                .checked_mul(size_of::<(&str, EntityHandle)>() + size_of::<&str>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut ids = Vec::with_capacity(capacity);
        for id in state.target_id.as_deref().into_iter().chain(
            state
                .exhausted_target
                .as_ref()
                .map(|target| target.id.as_str()),
        ) {
            if !ids.contains(&id)
                && physical
                    .entities
                    .get(id)
                    .is_some_and(|target| eligible(target, law))
            {
                ids.push(id);
            }
        }
        if state.mode == Mode::Idle {
            let retained = ids.len();
            for (id, target) in bodies.candidates(base, law.entry_radius) {
                if target != handle
                    && !ids[..retained].contains(&id)
                    && physical.entities.resolve(target).is_some_and(|target| {
                        eligible(target, law) && near(target, &law.home, law.entry_radius)
                    })
                {
                    ids.push(id);
                }
            }
        }
        if !ids.is_empty() {
            work.sight = Some(
                SightBatch::prepare(
                    physical,
                    &core.state.installed,
                    &entity.id,
                    &ids,
                    binding,
                    budget,
                )
                .map_err(crate::native_controller::sensor_error)?,
            );
        }
        Ok(Some(work))
    }

    pub(crate) fn queries(&self) -> Option<&GeometryQueries> {
        self.sight.as_ref().map(SightBatch::queries)
    }

    pub(crate) fn collation(&self) -> Option<&CollationRequest> {
        self.ranks.as_ref()
    }

    pub(crate) fn needs_materialized_rates(
        &self,
        core: &CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let (entity, threat) = selected(&core.state.physical, self.handle)?;
        let law = &threat.policy;
        let state = &threat.progress;
        let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
        Ok(!awaiting_activation(entity, threat)
            && (self.sight.is_some()
                || state.mode != Mode::Idle
                || state.relinquished
                || state.exhausted_target.is_some()
                || actor.action.is_some()
                || !near(entity, &law.home, law.territory_radius)
                || law.relinquish_health_fraction.is_some_and(|fraction| {
                    actor
                        .body
                        .as_ref()
                        .is_some_and(|body| actor.health <= body.max_health * fraction)
                })))
    }

    pub(crate) fn receive(
        &mut self,
        core: &CoreMutation<'_>,
        answer: GeometryAnswers,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let visible = self
            .sight
            .take()
            .ok_or(ExecutionError::Invariant)?
            .finish(answer)
            .map_err(crate::native_controller::sensor_error)?;
        let (_, threat) = selected(&core.state.physical, self.handle)?;
        if threat.progress.mode == Mode::Idle
            && visible.iter().filter(|(_, seen)| *seen).take(2).count() > 1
        {
            self.ranks = Some(
                CollationRequest::prepare(
                    binding,
                    visible.iter().filter_map(|(id, seen)| seen.then_some(id)),
                    budget,
                )
                .map_err(|_| ExecutionError::Capacity)?,
            );
        }
        self.visible = Some(visible);
        Ok(())
    }

    pub(crate) fn apply(
        mut self,
        core: &mut CoreMutation<'_>,
        ranks: Option<&CollationAnswer>,
        budget: &ByteBudget,
    ) -> Result<(Option<Intention>, Option<Notice>, bool), ExecutionError> {
        let physical = &core.state.physical;
        let (entity, threat) = selected(physical, self.handle)?;
        if physical.header.sim_time != self.at
            || self.sight.is_some()
            || self.ranks.is_some() != ranks.is_some()
        {
            return Err(ExecutionError::Invariant);
        }
        let ranks = self
            .ranks
            .take()
            .zip(ranks)
            .map(|(request, result)| {
                request
                    .finish(result)
                    .map_err(|_| ExecutionError::Invariant)
            })
            .transpose()?;
        let bytes = threat
            .progress
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?;
        // New target strings and last-seen support come only from this bound
        // sight product. The reservation remains through journal insertion.
        let added = self.visible.as_ref().map_or(0, |visible| {
            visible
                .iter()
                .filter_map(|(id, seen)| {
                    let target = physical.entities.get(id)?;
                    seen.then_some(id.len() + support_bytes(target))
                })
                .max()
                .unwrap_or(0)
        });
        let _work = budget.reserve(
            heap_sum([
                size_of::<Progress>(),
                bytes,
                added.checked_mul(3).ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut next = threat.progress.clone();
        next.review_at = self.at + threat.policy.review_seconds;
        if !next.review_at.is_finite() {
            return Err(ExecutionError::Invariant);
        }
        let (intention, notice, changed) = if awaiting_activation(entity, threat) {
            (None, None, false)
        } else {
            self.choose(physical, entity, threat, &mut next, ranks.as_ref(), budget)?
        };
        core.physical()
            .replace_territorial_progress(self.handle, next, changed)?;
        Ok((intention, notice, changed))
    }

    fn choose(
        &self,
        physical: &PhysicalState,
        entity: &Entity,
        threat: &Threat,
        next: &mut Progress,
        ranks: Option<&CollationRanks>,
        budget: &ByteBudget,
    ) -> Result<(Option<Intention>, Option<Notice>, bool), ExecutionError> {
        let law = &threat.policy;
        let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
        let origin = entity
            .world_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        let sight = |id| {
            self.visible
                .as_ref()
                .and_then(|seen| seen.seen(id))
                .unwrap_or(false)
        };
        if let Some(prior) = next.exhausted_target.as_ref() {
            if physical.entities.get(&prior.id).is_none_or(|target| {
                !eligible(target, law)
                    || life(target) != prior.life
                    || sight(&target.id) && !near(target, &law.home, law.entry_radius)
            }) {
                next.exhausted_target = None;
            }
        }
        let timeout = next.mode.chases() && next.episode_until.is_some_and(|at| self.at >= at);
        if timeout && law.reentry_after_timeout {
            next.exhausted_target =
                next.target_id
                    .as_ref()
                    .zip(next.target_life)
                    .map(|(id, life)| Life {
                        id: id.clone(),
                        life,
                    });
        }
        let injured = law.relinquish_health_fraction.is_some_and(|fraction| {
            actor
                .body
                .as_ref()
                .is_some_and(|body| actor.health <= body.max_health * fraction)
        });
        next.relinquished |= injured;
        // A relinquishing animal's physical escape and settling remain
        // owned by its admitted response episode.
        if next.relinquished
            && entity
                .animal
                .as_ref()
                .is_some_and(|animal| animal.episode.is_some())
        {
            let notice = next.mode.chases().then_some(Notice::Withdrew);
            if notice.is_some() {
                begin_return(next);
            }
            return Ok((None, notice, notice.is_some()));
        }
        let mut notice = None;
        let mut stop = false;
        if next.relinquished
            || timeout
            || next.mode.chases()
                && law
                    .pursuit_metres
                    .zip(next.travelled_metres)
                    .is_some_and(|(limit, traversed)| traversed >= limit)
            || distance(origin, law.home.point()) > law.territory_radius
        {
            withdraw(next, &mut stop, &mut notice);
        }
        if next.mode == Mode::Idle && !next.relinquished {
            let mut nearest: Option<(&Entity, f64)> = None;
            if let Some(visible) = &self.visible {
                for (id, seen) in visible.iter() {
                    let target = physical.entities.get(id).ok_or(ExecutionError::Invariant)?;
                    if !seen
                        || id == entity.id
                        || !eligible(target, law)
                        || !near(target, &law.home, law.entry_radius)
                        || next
                            .exhausted_target
                            .as_ref()
                            .is_some_and(|prior| prior.id == id && prior.life == life(target))
                    {
                        continue;
                    }
                    let candidate = distance(
                        origin,
                        target.world_position().ok_or(ExecutionError::Invariant)?,
                    );
                    if let Some((best, closest)) = nearest {
                        if candidate > closest
                            || (candidate == closest
                                && ranks
                                    .ok_or(ExecutionError::Invariant)?
                                    .compare(id, &best.id)
                                    .map_err(|_| ExecutionError::Invariant)?
                                    != Ordering::Less)
                        {
                            continue;
                        }
                    }
                    nearest = Some((target, candidate));
                }
            }
            if let Some((target, _)) = nearest {
                next.target_id = Some(target.id.clone());
                next.target_life = Some(life(target));
                next.mode = Mode::Pursuit;
                next.episode_until = Some(self.at + law.pursuit_seconds);
                next.detours_spent = 0;
                if law.pursuit_metres.is_some() {
                    next.travelled_metres = Some(0.0);
                }
            }
        }
        if next.mode.chases() {
            let current = next
                .target_id
                .as_ref()
                .and_then(|id| physical.entities.get(id))
                .filter(|target| eligible(target, law) && Some(life(target)) == next.target_life);
            match current {
                None => withdraw(next, &mut stop, &mut notice),
                Some(target) if sight(&target.id) => match target.supported_position() {
                    Some(point) if near(target, &law.home, law.territory_radius) => {
                        next.mode = Mode::Pursuit;
                        next.search_until = None;
                        next.last_seen = Some(point);
                    }
                    _ => withdraw(next, &mut stop, &mut notice),
                },
                Some(_) if next.mode == Mode::Pursuit => {
                    next.mode = Mode::Search;
                    next.search_until = Some(self.at + law.search_seconds);
                    stop = true;
                }
                Some(_) if next.search_until.is_some_and(|at| self.at >= at) => {
                    withdraw(next, &mut stop, &mut notice)
                }
                Some(_) => {}
            }
        }
        let destination = match next.mode {
            Mode::Idle => None,
            Mode::Pursuit | Mode::Search => next.last_seen.as_ref(),
            Mode::Return => Some(if next.relinquished {
                &law.refuge
            } else {
                &law.home
            }),
        };
        let action = actor.action.as_ref();
        let stop_intention = || (stop && action.is_some()).then_some(Intention::Stop);
        let changed =
            next.mode != threat.progress.mode || next.target_id != threat.progress.target_id;
        let Some(destination) = destination else {
            return Ok((stop_intention(), notice, changed));
        };
        let remaining = distance(origin, destination.point());
        if next.mode == Mode::Return && remaining <= law.arrival_radius {
            next.mode = Mode::Idle;
            next.episode_until = None;
            next.detours_spent = 0;
            return Ok((action.is_some().then_some(Intention::Stop), notice, true));
        }
        // Contact execution still needs the admitted strike owner. A territory
        // cannot bypass that boundary by moving through, hitting or waking a
        // body directly. Keep its actual target and bounded withdrawal.
        if next.mode == Mode::Pursuit && remaining <= law.attack_range {
            return Ok((action.is_some().then_some(Intention::Stop), notice, changed));
        }
        if remaining <= law.arrival_radius || action.is_some_and(|action| action.kind == "strike") {
            return Ok((stop_intention(), notice, changed));
        }
        if !stop
            && action.is_some_and(|action| {
                action.kind != "move"
                    || self.at < next.repath_at
                    || action.destination.as_ref().is_some_and(|point| {
                        distance(point.physical().point(), destination.point())
                            < law.refresh_displacement
                    })
            })
        {
            return Ok((None, notice, changed));
        }
        next.repath_at = self.at + law.refresh_seconds;
        let reserved = budget.reserve(destination.surface_id.len())?;
        Ok((
            Some(Intention::Move(destination.clone(), reserved)),
            notice,
            changed,
        ))
    }
}

fn begin_return(state: &mut Progress) {
    state.mode = Mode::Return;
    state.target_id = None;
    state.target_life = None;
    state.last_seen = None;
    state.search_until = None;
}

fn withdraw(state: &mut Progress, stop: &mut bool, notice: &mut Option<Notice>) {
    if state.mode != Mode::Return {
        begin_return(state);
        *stop = true;
        *notice = Some(Notice::Withdrew);
    }
}

fn support_bytes(entity: &Entity) -> usize {
    match entity.placement.as_ref() {
        Some(crate::state::Placement::World {
            support_surface_id, ..
        }) => support_surface_id.as_ref().map_or(0, String::len),
        _ => 0,
    }
}

pub(crate) fn refused(
    core: &mut CoreMutation<'_>,
    handle: EntityHandle,
    budget: &ByteBudget,
) -> Result<Notice, ExecutionError> {
    let (_, threat) = selected(&core.state.physical, handle)?;
    let _temporary = budget.reserve(
        threat
            .progress
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut next = threat.progress.clone();
    let notice = if next.mode == Mode::Return {
        next.mode = Mode::Idle;
        next.relinquished = true;
        Notice::Stopped
    } else {
        begin_return(&mut next);
        Notice::Withdrew
    };
    core.physical()
        .replace_territorial_progress(handle, next, true)?;
    Ok(notice)
}

impl Notice {
    pub(crate) fn stage(
        self,
        core: &mut CoreMutation<'_>,
        handle: EntityHandle,
        budget: &ByteBudget,
    ) -> Result<StagedOccurrence, ExecutionError> {
        let (entity, threat) = selected(&core.state.physical, handle)?;
        let (event_type, text) = match self {
            Self::Withdrew => ("threat-withdrew", &threat.policy.withdrawal_text),
            Self::Stopped => ("threat-stopped", &threat.policy.stop_text),
        };
        let _temporary = budget.reserve(
            heap_sum([text.storage_bytes(), entity.id.len(), event_type.len(), 256])
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let data = matches!(self, Self::Withdrew).then(|| {
            indexmap::IndexMap::from([(
                "significant".into(),
                crate::reception::EventScalar::Boolean(true),
            )])
        });
        core.stage_event(EventEmissionIntent {
            event_type: event_type.into(),
            text: EmissionText::Literal(text.clone()),
            audience: AudienceSelection::Physical,
            source_id: Some(entity.id.clone()),
            target_id: None,
            data,
            scope: EventScope::External,
            origin: None,
            exposure: None,
        })
    }
}
