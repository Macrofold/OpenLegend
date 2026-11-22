//! A hunt may select only quarry the animal sees in the current local batch.
//! An installed pack identity classifies witnesses. It never retrieves
//! another animal's current position or target from outside that batch.
use crate::execution::ExecutionError;
use crate::language::CollationRanks;
use crate::reception::SightResults;
use crate::simulation::SimulationState;
use crate::spatial::distance;
use crate::state::{Entity, Point};
use crate::worlds::base_foraging::pack::Hunt;
use std::cmp::Ordering;

pub(super) struct HuntRead<'a> {
    pub state: &'a SimulationState,
    pub animal: &'a Entity,
    pub rules: &'a Hunt,
    pub visible: &'a SightResults,
    pub pack: Option<&'a str>,
    pub night: bool,
    pub fullness: f64,
}

impl<'a> HuntRead<'a> {
    pub(super) fn seen(&self) -> impl Iterator<Item = &'a Entity> + '_ {
        self.visible
            .iter()
            .filter_map(|(id, seen)| seen.then(|| self.state.physical.entities.get(id)).flatten())
    }

    pub(super) fn seen_companions(&self) -> impl Iterator<Item = &'a Entity> + '_ {
        companions(self.state, self.visible, self.pack)
    }

    pub(super) fn rank(&self, entity: &Entity) -> Option<usize> {
        let actor = entity.actor.as_ref()?;
        let life = entity.physical_life()?;
        if !crate::contact::contact_permitted(&self.state.installed, self.animal, entity, life) {
            return None;
        }
        if let Some(rank) = actor.species.as_ref().and_then(|species| {
            self.rules
                .prey_species
                .iter()
                .position(|prey| prey == species)
        }) {
            return Some(rank);
        }
        let rule = &self.rules.biped_rule;
        if (rule.night_only && !self.night)
            || self.fullness >= rule.fullness_below
            || !actor.body.as_ref().is_some_and(|body| body.plan == "biped")
        {
            return None;
        }
        let target = entity.world_position()?;
        let nearby = self
            .seen_companions()
            .filter(|mate| within(mate, target, rule.packmate_radius_metres))
            .count();
        if (nearby as u64) < rule.other_visible_packmates {
            return None;
        }
        let guarded = self.seen().any(|other| {
            other.id != entity.id
                && other.actively_participates()
                && other.actor.as_ref().is_some_and(|actor| {
                    actor.alive
                        && !actor.incapacitated
                        && actor.body.as_ref().is_some_and(|body| body.plan == "biped")
                })
                && within(other, target, rule.other_biped_exclusion_metres)
        });
        (!guarded).then_some(self.rules.prey_species.len())
    }

    pub(super) fn best_quarry(
        &self,
        ranks: &CollationRanks,
    ) -> Result<Option<&'a Entity>, ExecutionError> {
        let origin = self
            .animal
            .world_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        let mut best: Option<(&Entity, (usize, f64))> = None;
        for entity in self.seen() {
            let Some((rank, position)) = self.rank(entity).zip(entity.world_position()) else {
                continue;
            };
            let score = (rank, distance(origin, position));
            let wins = if let Some((current, current_score)) = best {
                let order = score
                    .0
                    .cmp(&current_score.0)
                    .then_with(|| score.1.total_cmp(&current_score.1));
                if order == Ordering::Equal {
                    ranks
                        .compare(&entity.id, &current.id)
                        .map_err(|_| ExecutionError::Invariant)?
                        == Ordering::Less
                } else {
                    order == Ordering::Less
                }
            } else {
                true
            };
            if wins {
                best = Some((entity, score));
            }
        }
        Ok(best.map(|(entity, _)| entity))
    }
}

fn companions<'a>(
    state: &'a SimulationState, visible: &'a SightResults, pack: Option<&'a str>,
) -> impl Iterator<Item = &'a Entity> {
    visible.iter().filter_map(move |(id, seen)| {
        let pack = pack?;
        let other = seen.then(|| state.physical.entities.get(id)).flatten()?;
        let joined = other.animal.as_ref()?.foraging.as_ref()?.pack_id.as_deref() == Some(pack);
        (joined && other.actor.as_ref().is_some_and(|actor| actor.alive && !actor.incapacitated))
            .then_some(other)
    })
}

fn within(entity: &Entity, target: Point, radius: f64) -> bool {
    entity
        .world_position()
        .is_some_and(|position| distance(position, target) <= radius)
}

mod route;
use route::HuntRoutes;

use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries};
use crate::host::{ByteBudget, ByteReservation};
use crate::host::retained_size::HeapBytes;
use super::{ForageIntention, ForageProgress, operator, save};
use crate::native_response::{
    ForagingContinuation, ForagingMode, ForagingWork, ForagingWorkKind, ObservedForagingTarget,
};
use crate::state::{EntityHandle, SurfacePoint};

/// These are proposals for the current action owner. The clock still validates
/// geometry and commits accepted movement or contact in its normal order.
pub(super) enum HuntChoice {
    None,
    Hold,
    Stop,
    Strike(EntityHandle),
    LastPoint(SurfacePoint),
    Routes(HuntRoutes),
}

/// Own the already selected quarry, local sight batch and next work record
/// until the normal clock accepts or rolls back this one route decision.
pub(crate) struct RouteChoice {
    pub(super) animal: EntityHandle,
    pub(super) next: Box<ForagingContinuation>,
    pub(super) next_storage: ByteReservation,
    pub(super) routes: HuntRoutes,
    pub(super) visible: SightResults,
    pub(super) at: f64,
    pub(super) _storage: ByteReservation,
}

impl RouteChoice {
    pub(crate) fn queries(&self) -> &GeometryQueries { &self.routes.questions }

    pub(crate) fn step(
        mut self: Box<Self>,
        core: &mut crate::execution::CoreMutation<'_>,
        answers: GeometryAnswers,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<ForageProgress, ExecutionError> {
        if self.at != core.state.physical.header.sim_time {
            return Err(ExecutionError::Invariant);
        }
        let (animal, previous) = operator(&core.state.physical, self.animal)?;
        let policy = &core.state.installed.retained.foraging.profiles
            .get(&previous.profile.id).ok_or(ExecutionError::Invariant)?.profile;
        let rules = policy.hunt.as_ref().ok_or(ExecutionError::Invariant)?;
        match self.routes.stage {
            route::RouteStage::Support => {
                let pack = previous.pack_id.as_deref()
                    .filter(|_| self.next.mode != ForagingMode::Searching);
                self.routes.exposure(core.state, animal, &self.visible, pack, answers, binding, budget)?;
            }
            route::RouteStage::Exposure if self.next.mode == ForagingMode::Searching => {
                let chosen = self.routes.first_visible(answers, budget)?;
                let work = self.next.work.as_mut().ok_or(ExecutionError::Invariant)?;
                let decision = if let Some((offset, point, storage)) = chosen {
                    work.search_index = Some(work.search_index.unwrap_or(0) + offset as u64 + 1);
                    Some(ForageIntention::HuntMove(point, None, storage))
                } else {
                    work.search_index = Some(rules.lost_sight.candidate_count);
                    None
                };
                save(core, self.animal, budget, self.next, self.next_storage)?;
                return Ok(ForageProgress::Complete(decision));
            }
            route::RouteStage::Exposure => self.routes.paths(animal, answers, binding)?,
            route::RouteStage::Routes => {
                let retain = previous.destination.as_ref().filter(|_| {
                    animal.actor.as_ref().and_then(|actor| actor.action.as_ref())
                            .is_some_and(|action| action.kind == "move" && !action.path.is_empty())
                });
                let chosen = self.routes.select(answers, retain, rules.approach.improve_separation_metres, budget)?;
                let work = self.next.work.as_mut().ok_or(ExecutionError::Invariant)?;
                let decision = if let Some(route) = chosen {
                    work.route_target = work.observed.as_ref().map(|seen| seen.point.clone());
                    self.next.mode = ForagingMode::Stalking;
                    self.next_storage.resize(self.next_storage.bytes()
                        .checked_add(route.destination.surface_id.len())
                        .ok_or(ExecutionError::Capacity)?)?;
                    self.next.destination = Some(route.destination.clone());
                    self.next.proposal = None;
                    if retain != Some(&route.destination) {
                        Some(ForageIntention::HuntMove(route.destination, Some(route.path), route._funding))
                    } else {
                        None
                    }
                } else {
                    matches!(end(&mut self.next, animal.actor.as_ref().and_then(|actor| actor.action.as_ref()), self.at, rules), HuntChoice::Stop)
                        .then_some(ForageIntention::Stop)
                };
                save(core, self.animal, budget, self.next, self.next_storage)?;
                return Ok(ForageProgress::Complete(decision));
            }
        }
        Ok(ForageProgress::Routes(self))
    }
}

impl HuntRead<'_> {
    pub(super) fn choose(
        &self,
        state: &mut ForagingContinuation,
        ranks: &CollationRanks,
        hungry: bool,
        stop_at: f64,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<HuntChoice, ExecutionError> {
        let now = self.state.physical.header.sim_time;
        let actor = self
            .animal
            .actor
            .as_ref()
            .ok_or(ExecutionError::MissingActor)?;
        let active = actor.action.as_ref();
        let prior = state
            .work
            .as_ref()
            .filter(|work| work.kind == ForagingWorkKind::Hunt);
        if let Some(work) = prior {
            if now >= work.ends_at
                || work.travelled_metres >= self.rules.pursuit.route_metres
                || self.fullness >= stop_at
            {
                return Ok(end(state, active, now, self.rules));
            }
        } else if !hungry || state.reconsider_at.is_some_and(|at| at > now) {
            return Ok(HuntChoice::None);
        }
        let quarry = if let Some(work) = prior {
            let id = work.target_id.as_deref().ok_or(ExecutionError::Invariant)?;
            let Some(seen) = self.seen().find(|entity| entity.id == id) else {
                return self.search(state, active, binding, budget);
            };
            if self.rank(seen).is_none() || seen.physical_life() != work.target_life {
                return Ok(end(state, active, now, self.rules));
            }
            seen
        } else {
            let Some(seen) = self.best_quarry(ranks)? else {
                return Ok(HuntChoice::None);
            };
            seen
        };
        let Some(point) = quarry.supported_position() else {
            return Ok(end(state, active, now, self.rules));
        };

        let work = if let Some(work) = state
            .work
            .as_mut()
            .filter(|work| work.kind == ForagingWorkKind::Hunt)
        {
            work
        } else {
            let here = self
                .animal
                .supported_position()
                .ok_or(ExecutionError::InvalidPosition)?;
            state.work = Some(ForagingWork {
                kind: ForagingWorkKind::Hunt,
                action_id: active.map(|action| action.id.clone()).unwrap_or_else(|| {
                    format!("native-forage-{}", self.state.physical.identity.next_id())
                }),
                started_at: now,
                ends_at: now + self.rules.pursuit.game_seconds,
                travelled_metres: 0.0,
                last_point: here,
                source_id: None,
                target_id: Some(quarry.id.clone()),
                target_life: quarry.physical_life(),
                observed: None,
                search_index: None,
                lost_at: None,
                route_target: None,
            });
            state.work.as_mut().ok_or(ExecutionError::Invariant)?
        };
        let moved = work
            .route_target
            .as_ref()
            .or_else(|| work.observed.as_ref().map(|seen| &seen.point))
            .is_none_or(|previous| {
                distance(previous.point(), point.point())
                    >= self.rules.approach.target_movement_metres
            });
        work.observed = Some(ObservedForagingTarget { point, at: now });
        work.lost_at = None;
        work.search_index = None;
        state.review_at = work
            .ends_at
            .min(now + self.rules.approach.review_game_seconds);

        let owns_active = active.filter(|action| action.id == work.action_id);
        if owns_active
            .is_some_and(|action| action.strike_phase == Some(crate::contact::StrikePhase::Windup))
        {
            return Ok(HuntChoice::Hold);
        }
        let strike =
            crate::contact::profile(&self.state.installed, self.animal, &self.rules.strike_id)
                .ok_or(ExecutionError::UnsupportedFamily)?;
        let start_range = strike
            .preparation_motion
            .as_ref()
            .ok_or(ExecutionError::UnsupportedFamily)?
            .start_range;
        if actor.combat_ready_at.is_none_or(|until| until <= now)
            && crate::contact::reach(
                &self.state.installed,
                strike,
                self.animal,
                quarry,
                start_range,
                budget,
            )?
            .is_some()
        {
            state.mode = ForagingMode::Pursuing;
            state.proposal = None;
            let target = self
                .state
                .physical
                .entities
                .handle(&quarry.id)
                .ok_or(ExecutionError::Invariant)?;
            return Ok(HuntChoice::Strike(target));
        }
        if !moved
            && state.proposal.is_none()
            && owns_active.is_some_and(|action| action.kind == "move" && !action.path.is_empty())
        {
            return Ok(HuntChoice::Hold);
        }
        Ok(HuntChoice::Routes(HuntRoutes::ring(
            self, quarry, binding, budget,
        )?))
    }

    fn search(
        &self,
        state: &mut ForagingContinuation,
        active: Option<&crate::state::Action>,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<HuntChoice, ExecutionError> {
        let now = self.state.physical.header.sim_time;
        let work = state.work.as_mut().ok_or(ExecutionError::Invariant)?;
        let lost = *work.lost_at.get_or_insert(now);
        let deadline = lost + self.rules.lost_sight.total_search_game_seconds;
        if now >= deadline {
            return Ok(end(state, active, now, self.rules));
        }
        let observed = &work
            .observed
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .point;
        state.mode = ForagingMode::Searching;
        state.proposal = None;
        state.review_at = work
            .ends_at
            .min((now + self.rules.approach.review_game_seconds).min(deadline));
        if let Some(action) = active.filter(|action| action.id == work.action_id) {
            if action.strike_phase == Some(crate::contact::StrikePhase::Windup) {
                return Ok(HuntChoice::Stop);
            }
            if action.kind == "move" {
                return Ok(HuntChoice::Hold);
            }
        }
        let last_deadline = lost + self.rules.lost_sight.last_point_game_seconds;
        if now < last_deadline {
            let here = self
                .animal
                .world_position()
                .ok_or(ExecutionError::InvalidPosition)?;
            if distance(here, observed.point())
                <= self.state.installed.retained.item_handling_read.reach
            {
                state.review_at = work.ends_at.min(last_deadline);
                return Ok(HuntChoice::Hold);
            }
            return Ok(HuntChoice::LastPoint(observed.clone()));
        }
        // Each ring index is attempted once through ordinary support and sight.
        // A hidden quarry cannot move the original search center.
        let found = work.search_index.unwrap_or(0);
        let maximum = self.rules.lost_sight.candidate_count;
        if found >= maximum {
            return Ok(HuntChoice::Hold);
        }
        let bearings = found as usize..maximum as usize;
        Ok(HuntChoice::Routes(HuntRoutes::around(
            observed,
            self.rules.lost_sight.radius_metres,
            0.0,
            bearings,
            maximum as usize,
            binding,
            budget,
        )?))
    }
}

fn end(
    state: &mut ForagingContinuation,
    active: Option<&crate::state::Action>,
    now: f64,
    rules: &Hunt,
) -> HuntChoice {
    let stopping = state.work.take().is_some_and(|work| {
        work.kind == ForagingWorkKind::Hunt
            && active.is_some_and(|action| action.id == work.action_id)
    });
    let reconsider = now + rules.pursuit.reconsider_after_game_seconds;
    state.reconsider_at = Some(reconsider);
    state.proposal = None;
    state.destination = None;
    state.review_at = reconsider;
    state.mode = ForagingMode::Resting;
    if stopping {
        HuntChoice::Stop
    } else {
        HuntChoice::Hold
    }
}
