//! Candidate-scoped receiving and action selection for the installed finite
//! resource diet. Its decision only offers a command. The existing ground
//! movement and feeding actions own admission and effects.
use super::*;
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries};
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::language::{CollationAnswer, CollationRequest};
use crate::reception::{SightBatch, SightResults, vision_parameters};
use crate::simulation::PhysicalState;
use crate::state::{Entity, FundedForaging, SurfacePoint};
use crate::values::AttributeValue;
use crate::worlds::base_foraging::{FoodSighting, foraging_night, perceive_food};
use std::mem::size_of;

mod pack;
mod hunt;
pub(crate) use hunt::RouteChoice as HuntRouteChoice;

pub(crate) fn remaining_pack_travel(
    installed: &InstalledWorld,
    entity: &Entity,
    action_id: Option<&str>,
) -> Result<Option<f64>, ExecutionError> {
    let Some(state) = entity
        .animal
        .as_ref()
        .and_then(|animal| animal.foraging.as_ref())
    else {
        return Ok(None);
    };
    let Some(work) = state
        .work
        .as_ref()
        .filter(|work| Some(work.action_id.as_str()) == action_id)
    else {
        return Ok(None);
    };
    if !matches!(
        work.kind,
        ForagingWorkKind::Regroup | ForagingWorkKind::Hunt
    ) {
        return Ok(None);
    }
    let profile = &installed
        .retained
        .foraging
        .profiles
        .get(&state.profile.id)
        .ok_or(ExecutionError::Invariant)?
        .profile;
    let limit = match work.kind {
        ForagingWorkKind::Regroup => profile.regroup.as_ref().map(|rule| rule.leg_metres),
        ForagingWorkKind::Hunt => profile.hunt.as_ref().map(|rule| rule.pursuit.route_metres),
        _ => None,
    }
    .ok_or(ExecutionError::Invariant)?;
    Ok(Some((limit - work.travelled_metres).max(0.0)))
}

/// Chase speed is available only to an animal's selected hunt during its
/// cooldown or while following its own last observation. New approaches use
/// the ordinary travel speed from the animal's installed profile.
pub(crate) fn travel_locomotion<'a>(
    installed: &'a InstalledWorld, entity: &Entity, now: f64,
) -> Option<&'a str> {
    let state = entity.animal.as_ref()?.foraging.as_ref()?;
    let work = state.work.as_ref().filter(|work| work.kind == ForagingWorkKind::Hunt)?;
    if now >= work.ends_at || !(state.mode == ForagingMode::Searching || entity.actor.as_ref()?
        .combat_ready_at.is_some_and(|until| until > now)) {
        return None;
    }
    installed.retained.foraging.profiles.get(&state.profile.id)?.profile.hunt.as_ref()
        .map(|rule| rule.locomotion_id.as_str())
}

pub(crate) enum ForageIntention {
    Feed(String, Option<String>, ByteReservation),
    Move(SurfacePoint, ByteReservation),
    Stop,
    HuntStrike(EntityHandle),
    HuntMove(SurfacePoint, Option<crate::geometry::GuardedRoutePlan>, ByteReservation),
}

pub(crate) enum ForageProgress {
    Complete(Option<ForageIntention>),
    Routes(Box<hunt::RouteChoice>),
}

pub(crate) struct ForageChoice {
    animal: EntityHandle,
    at: f64,
    observation: Option<SightBatch>,
    visible: Option<SightResults>,
    ranks: Option<CollationRequest>,
    _storage: ByteReservation,
}

pub(crate) fn review_at(
    animal: &Entity,
    installed: &InstalledWorld,
    now: f64,
) -> Result<Option<f64>, ExecutionError> {
    let (Some(actor), Some(state)) = (&animal.actor, &animal.animal) else {
        return Ok(None);
    };
    let Some(forage) = state.foraging.as_deref() else {
        return Ok(None);
    };
    if actor.controller != "native"
        || !actor.alive
        || actor.incapacitated
        || state.episode.is_some()
        || animal.threat.as_ref().is_some_and(|threat| {
            threat.progress.mode != crate::native_controller::territorial::Mode::Idle
        })
        || !animal.actively_participates()
        || installed
            .capabilities
            .capability_blocked(Some(animal), "actions")?
    {
        return Ok(None);
    }
    let stale_work = !matches!(forage.mode, ForagingMode::Blocked | ForagingMode::Searching)
        && forage.work.as_ref().is_some_and(|work| {
            actor
                .action
                .as_ref()
                .is_none_or(|action| work.action_id != action.id)
        });
    let mut due = if stale_work || forage.proposal.is_some() {
        now
    } else {
        forage.review_at
    };
    if let Some(work) = forage.work.as_ref().filter(|work| {
        matches!(work.kind, ForagingWorkKind::Hunt | ForagingWorkKind::Regroup)
    }) {
        due = due.min(work.ends_at);
        if remaining_pack_travel(installed, animal, Some(&work.action_id))? == Some(0.0) {
            due = now;
        }
    }
    Ok(Some(due))
}

fn operator(
    physical: &PhysicalState,
    handle: EntityHandle,
) -> Result<(&Entity, &ForagingContinuation), ExecutionError> {
    let animal = physical
        .entities
        .resolve(handle)
        .ok_or(ExecutionError::MissingEntity)?;
    let forage = animal
        .animal
        .as_ref()
        .and_then(|animal| animal.foraging.as_deref())
        .ok_or(ExecutionError::Invariant)?;
    Ok((animal, forage))
}

impl ForageChoice {
    pub(crate) fn prepare(
        core: &mut crate::execution::CoreMutation<'_>,
        handle: EntityHandle,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let installed = core.state.installed.clone();
        let at = core.state.physical.header.sim_time;
        let entity = core
            .state
            .physical
            .entities
            .resolve(handle)
            .ok_or(ExecutionError::MissingEntity)?;
        if review_at(entity, &installed, at)?.is_none_or(|deadline| deadline > at) {
            return Ok(None);
        }
        let (animal, forage) = operator(&core.state.physical, handle)?;
        let profile = &installed
            .retained
            .foraging
            .profiles
            .get(&forage.profile.id)
            .ok_or(ExecutionError::Invariant)?
            .profile;
        let actor = animal.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
        let action = actor.action.as_ref();
        if action.is_some_and(|action| {
            forage
                .work
                .as_ref()
                .is_none_or(|work| work.action_id != action.id)
        }) {
            replace(core, handle, budget, |state| {
                state.work = None;
                state.mode = ForagingMode::Resting;
                state.review_at = at + profile.routine.choice_game_seconds;
            })?;
            return Ok(None);
        }
        if action.is_some_and(|action| action.kind == "feed")
            || animal.supported_position().is_none()
        {
            return Ok(None);
        }
        let vision = vision_parameters(&installed, animal);
        let origin = animal
            .world_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        let bodies = &core.state.physical.bodies;
        let (count, _) = bodies.candidate_capacity(origin, vision.radius);
        let _candidates = budget.reserve(
            count
                .checked_mul(size_of::<(&str, EntityHandle)>() + size_of::<&str>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut ids = Vec::with_capacity(count);
        for (id, subject) in bodies.candidates(origin, vision.radius) {
            let target = core
                .state
                .physical
                .entities
                .resolve(subject)
                .ok_or(ExecutionError::Invariant)?;
            if id != animal.id
                && (super::feeding::source_candidate(core.state, target)
                    || pack::sight_candidate(profile, forage, target)
                    || forage
                        .anchor_food
                        .iter()
                        .flatten()
                        .any(|food| food.source_id == id))
            {
                ids.push(id);
            }
        }
        let sight = SightBatch::prepare(
            &core.state.physical,
            &installed,
            &animal.id,
            &ids,
            binding,
            budget,
        )
        .map_err(sensor_error)?;
        Ok(Some(Self {
            animal: handle,
            at,
            observation: Some(sight),
            visible: None,
            ranks: None,
            _storage: budget.reserve(size_of::<Self>())?,
        }))
    }

    pub(crate) fn sight_request(&self) -> Option<&GeometryQueries> {
        self.observation.as_ref().map(SightBatch::queries)
    }

    pub(crate) fn collation_request(&self) -> Option<&CollationRequest> {
        self.ranks.as_ref()
    }

    pub(crate) fn observe(
        &mut self,
        physical: &PhysicalState,
        answers: GeometryAnswers,
        names_binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let (_, before) = operator(physical, self.animal)?;
        let visible = self
            .observation
            .take()
            .ok_or(ExecutionError::Invariant)?
            .finish(answers)
            .map_err(sensor_error)?;
        self.ranks = Some(
            CollationRequest::prepare(
                names_binding,
                visible
                    .iter()
                    .filter_map(|(id, seen)| seen.then_some(id))
                    .chain(
                        before
                            .anchor_food
                            .iter()
                            .flatten()
                            .map(|last| last.source_id.as_str()),
                    ),
                budget,
            )
            .map_err(|_| ExecutionError::Capacity)?,
        );
        self.visible = Some(visible);
        Ok(())
    }

    pub(crate) fn choose(
        mut self,
        core: &mut crate::execution::CoreMutation<'_>,
        answer: &CollationAnswer,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<ForageProgress, ExecutionError> {
        if self.at != core.state.physical.header.sim_time {
            return Err(ExecutionError::Invariant);
        }
        let ranks = self
            .ranks
            .take()
            .ok_or(ExecutionError::Invariant)?
            .finish(answer)
            .map_err(|_| ExecutionError::Invariant)?;
        let visible = self.visible.take().ok_or(ExecutionError::Invariant)?;
        let installed = core.state.installed.clone();
        let choices = &installed.retained.foraging;
        let (animal, before) = operator(&core.state.physical, self.animal)?;
        let profile = &choices
            .profiles
            .get(&before.profile.id)
            .ok_or(ExecutionError::Invariant)?
            .profile;
        let at = self.at;
        let reach = installed.retained.item_handling_read.reach;
        let here = animal
            .world_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        let read = installed.status_read(&core.state.physical);
        let Some(AttributeValue::Number(fullness)) =
            read.value(&animal.id, &profile.fullness.attribute_id)?
        else {
            return Err(ExecutionError::Invariant);
        };
        let night = foraging_night(&installed.status_policy.named_times, read.local_hour())
            .ok_or(ExecutionError::Invariant)?;
        let hungry = profile
            .fullness
            .hungry(fullness, night, before.mode == ForagingMode::Feeding);
        let rated = visible.iter().filter_map(|(id, seen)| seen.then_some(id));
        let count = rated.clone().count();
        let body_bytes = map_storage::<String, EmptyFoodSource>(
            before
                .empty_sources
                .len()
                .checked_add(count)
                .and_then(|n| n.checked_mul(2))
                .ok_or(ExecutionError::Capacity)?,
        )
        .ok_or(ExecutionError::Capacity)?;
        let pin_bytes = profile.diet.iter().try_fold(0, |maximum, diet| {
            let food = choices
                .food
                .get(&diet.definition_id)
                .ok_or(ExecutionError::Invariant)?;
            Ok::<_, ExecutionError>(
                maximum.max(food.pin.heap_bytes().ok_or(ExecutionError::Capacity)?),
            )
        })?;
        let bytes = rated.clone().try_fold(body_bytes, |bytes, id| {
            let surface =
                if profile.regroup.is_some() || profile.hunt.is_some() {
                    core.state.physical.entities.get(id).map_or(0, |entity| {
                        match &entity.placement {
                            Some(crate::state::Placement::World {
                                support_surface_id, ..
                            }) => support_surface_id.as_ref().map_or(0, String::len),
                            _ => 0,
                        }
                    })
                } else {
                    0
                };
            bytes
                .checked_add(4 * (id.len() + surface + pin_bytes + size_of::<AnchorFood>()))
                .ok_or(ExecutionError::Capacity)
        })?;
        let next_storage = budget.reserve(
            heap_sum([
                size_of::<ForagingContinuation>(),
                before.heap_bytes().ok_or(ExecutionError::Capacity)?,
                bytes,
                8 * size_of::<AnchorFood>(),
                before.home.surface_id.len(),
                before
                    .anchors
                    .iter()
                    .map(|point| point.surface_id.len())
                    .max()
                    .unwrap_or(0),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let _scan = budget.reserve(
            count
                .checked_mul(size_of::<FoodSighting>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        core.journal
            .meters
            .charge(&[(WorkUnit::Candidates, count as u64)])?;
        let mut seen = Vec::with_capacity(count);
        for id in rated {
            let subject = core
                .state
                .physical
                .entities
                .get(id)
                .ok_or(ExecutionError::Invariant)?;
            let position = subject
                .world_position()
                .ok_or(ExecutionError::InvalidPosition)?;
            let needed = hungry
                || before
                    .anchors
                    .iter()
                    .any(|point| crate::spatial::distance(point.point(), position) <= reach);
            let meal = if !needed {
                None
            } else if subject.kind == installed.observation_rules.value().pile_kind {
                let mut best = None;
                for child in core
                    .state
                    .inventory
                    .children(&core.state.physical.entities, id, false)
                {
                    core.journal.meters.charge(&[(WorkUnit::Candidates, 1)])?;
                    let Some(meal) =
                        super::feeding::meal(core.state, animal, subject, Some(&child.id))
                    else {
                        continue;
                    };
                    let rank = profile
                        .diet_rank(&meal.food.pin.id)
                        .ok_or(ExecutionError::Invariant)?;
                    if best.as_ref().is_none_or(|(_, prior)| rank < *prior) {
                        best = Some((meal, rank));
                    }
                }
                best.map(|(meal, _)| meal)
            } else {
                super::feeding::meal(core.state, animal, subject, None)
            };
            seen.push(FoodSighting {
                id,
                stock: subject.resource.as_ref(),
                position,
                food: meal.as_ref().map(|meal| meal.food),
                item_id: meal.as_ref().and_then(|meal| meal.source.item_id()),
            });
        }
        let action = animal
            .actor
            .as_ref()
            .ok_or(ExecutionError::MissingActor)?
            .action
            .as_ref();
        let mut next = Box::new(before.clone());
        if action.is_none()
            && next.work.as_ref().is_none_or(|work| {
                !matches!(
                    work.kind,
                    ForagingWorkKind::Regroup | ForagingWorkKind::Hunt
                )
            })
        {
            next.work = None;
        }
        let food = perceive_food(profile, &mut next, &seen, at, here, reach,
            hungry && !action.is_some_and(|action| action.strike_phase == Some(crate::contact::StrikePhase::Windup)),
            &ranks)?;
        if food.is_none() && let Some(rules) = &profile.hunt {
            let hunt = hunt::HuntRead {
                state: core.state, animal, rules, visible: &visible,
                pack: before.pack_id.as_deref(), night, fullness,
            };
            let choice = hunt.choose(&mut next, &ranks, hungry, profile.fullness.stop_at, binding, budget)?;
            match choice {
                hunt::HuntChoice::Routes(routes) => {
                    let storage = budget.reserve(size_of::<hunt::RouteChoice>())?;
                    return Ok(ForageProgress::Routes(Box::new(hunt::RouteChoice {
                        animal: self.animal, next, next_storage, routes, visible, at,
                        _storage: storage,
                    })));
                }
                hunt::HuntChoice::None => {}
                choice => {
                    let decision = match choice {
                        hunt::HuntChoice::Stop => Some(ForageIntention::Stop),
                        hunt::HuntChoice::Strike(target) => Some(ForageIntention::HuntStrike(target)),
                        hunt::HuntChoice::LastPoint(point) => {
                            let storage = budget.reserve(point.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
                            Some(ForageIntention::HuntMove(point, None, storage))
                        }
                        hunt::HuntChoice::Hold => None,
                        _ => return Err(ExecutionError::Invariant),
                    };
                    save(core, self.animal, budget, next, next_storage)?;
                    return Ok(ForageProgress::Complete(decision));
                }
            }
        }
        let regroup = if food.is_none() {
            pack::regroup(
                core.state, animal, &mut next, profile, &visible, &ranks, budget,
            )?
        } else {
            None
        };
        let decision = if let Some((id, item)) = food {
            let allowance = budget.reserve(id.len() + item.map_or(0, str::len))?;
            let target = id.to_owned();
            let item = item.map(str::to_owned);
            next.mode = ForagingMode::Feeding;
            if next.work.as_ref().is_some_and(|work| work.kind == ForagingWorkKind::Hunt) {
                let _name = budget.reserve(animal.id.len())?;
                let actor = animal.id.clone();
                stop_owned_action(&mut core.physical(), &actor)?;
                next.work = None;
                next.destination = None;
                next.proposal = None;
                if let Some(rules) = &profile.hunt {
                    next.reconsider_at = Some(at + rules.pursuit.reconsider_after_game_seconds);
                }
            }
            next.review_at = at + profile.routine.choice_game_seconds;
            Some(ForageIntention::Feed(target, item, allowance))
        } else if let Some(regroup) = regroup {
            regroup.intention()
        } else if action.is_none() {
            next.review_at = at + profile.routine.choice_game_seconds;
            let anchors = profile.routine_choices(&next, here, hungry, night, reach);
            let count = anchors.iter().flatten().count();
            if count == 0 {
                next.mode = ForagingMode::Resting;
                None
            } else {
                let pick = if count == 1 {
                    0
                } else {
                    (core.physical().draw() * count as f64).floor() as usize
                };
                let point = anchors[pick].ok_or(ExecutionError::Invariant)?;
                let allowance = budget.reserve(point.surface_id.len())?;
                let destination = point.clone();
                next.mode = ForagingMode::Routine;
                next.destination = Some(destination.clone());
                Some(ForageIntention::Move(destination, allowance))
            }
        } else {
            None
        };
        save(core, self.animal, budget, next, next_storage)?;
        Ok(ForageProgress::Complete(decision))
    }
}

fn save(
    core: &mut crate::execution::CoreMutation<'_>,
    handle: EntityHandle,
    budget: &ByteBudget,
    next: Box<ForagingContinuation>,
    storage: ByteReservation,
) -> Result<(), ExecutionError> {
    let (actor, before) = operator(&core.state.physical, handle)?;
    if before == next.as_ref() {
        return Ok(());
    }
    let _name = budget.reserve(actor.id.len())?;
    let id = actor.id.clone();
    core.physical()
        .replace_foraging(&id, FundedForaging::adopt(next, storage, budget)?)?;
    core.physical().refresh_territorial_place(handle)
}

fn replace(
    core: &mut crate::execution::CoreMutation<'_>,
    handle: EntityHandle,
    budget: &ByteBudget,
    update: impl FnOnce(&mut ForagingContinuation),
) -> Result<(), ExecutionError> {
    let (actor, _) = operator(&core.state.physical, handle)?;
    let _name = budget.reserve(actor.id.len())?;
    let id = actor.id.clone();
    core.physical().change_foraging(&id, 0, update)
}

/// Consume the ordinary command's exact installed action identity. A refused
/// route enters the same authored blocked review, without inventing work.
pub(crate) fn admitted(
    core: &mut crate::execution::CoreMutation<'_>,
    actor: &str,
    outcome: &crate::commands::Outcome,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let installed = core.state.installed.clone();
    let at = core.state.physical.header.sim_time;
    let animal = core
        .state
        .physical
        .entities
        .get(actor)
        .ok_or(ExecutionError::MissingEntity)?;
    let state = animal.animal.as_ref().ok_or(ExecutionError::Invariant)?;
    let forage = state.foraging.as_ref().ok_or(ExecutionError::Invariant)?;
    if !outcome.ok {
        let seconds = selected_profile(&installed, state)?.blocked_review_seconds;
        return core
            .physical()
            .change_foraging(actor, 0, |next| block(next, at + seconds));
    }
    let action = animal
        .actor
        .as_ref()
        .and_then(|actor| actor.action.as_ref())
        .filter(|action| Some(action.id.as_str()) == outcome.action_id.as_deref())
        .ok_or(ExecutionError::Invariant)?;
    let kind = match action.kind.as_str() {
        "feed" => ForagingWorkKind::Food,
        "move" => ForagingWorkKind::Routine,
        "strike" if forage.work.as_ref().is_some_and(|work| work.kind == ForagingWorkKind::Hunt) => ForagingWorkKind::Hunt,
        _ => return Err(ExecutionError::Invariant),
    };
    if kind != ForagingWorkKind::Food
        && forage.work.as_ref().is_some_and(|work| {
            matches!(
                work.kind,
                ForagingWorkKind::Regroup | ForagingWorkKind::Hunt
            )
        })
    {
        let _id = budget.reserve(action.id.len())?;
        let id = action.id.clone();
        let handle = core
            .state
            .physical
            .entities
            .handle(actor)
            .ok_or(ExecutionError::Invariant)?;
        core.physical().change_foraging(actor, id.len(), |next| {
            if let Some(work) = next.work.as_mut() {
                work.action_id = id;
            }
        })?;
        return core.physical().refresh_territorial_place(handle);
    }
    let seconds = installed
        .retained
        .foraging
        .profiles
        .get(&forage.profile.id)
        .ok_or(ExecutionError::Invariant)?
        .profile
        .routine
        .choice_game_seconds;
    let grow = action.id.len()
        + action.target_id.as_ref().map_or(0, String::len)
        + match animal.placement.as_ref() {
            Some(crate::state::Placement::World {
                support_surface_id, ..
            }) => support_surface_id.as_ref().map_or(0, String::len),
            _ => return Err(ExecutionError::InvalidPosition),
        };
    let _work = budget.reserve(grow)?;
    let work = ForagingWork {
        kind,
        action_id: action.id.clone(),
        started_at: at,
        ends_at: at + seconds,
        travelled_metres: 0.0,
        last_point: animal
            .supported_position()
            .ok_or(ExecutionError::InvalidPosition)?,
        source_id: action.target_id.clone(),
        target_id: None,
        target_life: None,
        observed: None,
        search_index: None,
        lost_at: None,
        route_target: None,
    };
    let handle = core
        .state
        .physical
        .entities
        .handle(actor)
        .ok_or(ExecutionError::Invariant)?;
    core.physical()
        .change_foraging(actor, grow, |next| next.work = Some(work))?;
    core.physical().refresh_territorial_place(handle)
}

pub(crate) fn work_failed(
    core: &mut crate::execution::CoreMutation<'_>,
    actor: &str,
    action_id: &str,
) -> Result<(), ExecutionError> {
    let installed = core.state.installed.clone();
    let Some(state) = core
        .state
        .physical
        .entities
        .get(actor)
        .and_then(|animal| animal.animal.as_ref())
        .filter(|animal| {
            animal
                .foraging
                .as_ref()
                .and_then(|forage| forage.work.as_ref())
                .is_some_and(|work| work.action_id == action_id)
        })
    else {
        return Ok(());
    };
    let review = core.state.physical.header.sim_time
        + selected_profile(&installed, state)?.blocked_review_seconds;
    core.physical()
        .change_foraging(actor, 0, |next| block(next, review))
}

/// A pursuit loses sight at the contact owner's exact failed observation.
/// Keep its last observed point and deadline and let its next search run once
/// the old action has been cleared.
pub(crate) fn lost_sight(
    core: &mut crate::execution::CoreMutation<'_>,
    actor: &str,
    action_id: &str,
) -> Result<bool, ExecutionError> {
    let matching = core.state.physical.entities.get(actor)
        .and_then(|entity| entity.animal.as_ref())
        .and_then(|animal| animal.foraging.as_ref())
        .and_then(|forage| forage.work.as_ref())
        .is_some_and(|work| work.kind == ForagingWorkKind::Hunt && work.action_id == action_id);
    if !matching {
        return Ok(false);
    }
    let at = core.state.physical.header.sim_time;
    core.physical().change_foraging(actor, 0, |next| {
        if let Some(work) = next.work.as_mut() {
            work.lost_at.get_or_insert(at);
        }
        next.proposal = None;
        next.mode = ForagingMode::Searching;
        next.review_at = at;
    })?;
    Ok(true)
}

fn block(next: &mut ForagingContinuation, review: f64) {
    next.mode = ForagingMode::Blocked;
    next.review_at = review;
    if next.work.as_ref().is_some_and(|work| {
        !matches!(
            work.kind,
            ForagingWorkKind::Regroup | ForagingWorkKind::Hunt
        )
    }) {
        next.work = None;
    }
    next.proposal = None;
}

/// Danger/control retirement precedes the selected response's own movement.
/// Only this controller's matching in-progress forage action is canceled.
pub(crate) fn relinquish(
    physical: &mut PhysicalMutation<'_>,
    actor: &str,
) -> Result<(), ExecutionError> {
    if physical
        .state
        .entities
        .get(actor)
        .and_then(|entity| entity.animal.as_ref())
        .and_then(|animal| animal.foraging.as_ref())
        .is_none()
    {
        return Ok(());
    }
    stop_owned_action(physical, actor)?;
    let at = physical.state.header.sim_time;
    physical.change_foraging(actor, 0, |next| {
        next.work = None;
        next.proposal = None;
        next.destination = None;
        next.mode = ForagingMode::Resting;
        next.review_at = at;
    })
}

fn stop_owned_action(
    physical: &mut PhysicalMutation<'_>,
    actor: &str,
) -> Result<(), ExecutionError> {
    let entity = physical.state.entities.get(actor).ok_or(ExecutionError::MissingEntity)?;
    let owned = entity.animal.as_ref()
        .and_then(|animal| animal.foraging.as_ref())
        .and_then(|foraging| foraging.work.as_ref());
    let active = entity.actor.as_ref().and_then(|actor| actor.action.as_ref());
    let Some(action) = active.filter(|action| owned.is_some_and(|work| work.action_id == action.id))
    else {
        return Ok(());
    };
    physical.reserve_response_growth(action.id.len())?;
    let id = physical.state.entities.get(actor)
        .and_then(|entity| entity.actor.as_ref())
        .and_then(|actor| actor.action.as_ref())
        .ok_or(ExecutionError::Invariant)?
        .id.clone();
    physical.release_work(&id)?;
    physical.replace_action(
        actor,
        None,
        crate::execution::ActionWrite {
            generation: crate::execution::PlanGenerationWrite::Advance,
            behavior: Some(false),
        },
    )
}
