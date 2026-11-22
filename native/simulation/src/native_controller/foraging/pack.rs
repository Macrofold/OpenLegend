//! Select only locally observable pack, prey and nearby exclusion witnesses.
//! Knowing a pack identity does not grant another character's current pose.

use super::ForageIntention;
use crate::execution::ExecutionError;
use crate::host::ByteBudget;
use crate::language::CollationRanks;
use crate::native_response::{
    ForagingContinuation, ForagingMode, ForagingWork, ForagingWorkKind, ObservedForagingTarget,
};
use crate::reception::SightResults;
use crate::simulation::SimulationState;
use crate::spatial::{distance, interpolate};
use crate::state::{Entity, Placement, SurfacePoint};
use crate::worlds::base_foraging::ResourceForagingProfile;

pub(super) fn sight_candidate(
    profile: &ResourceForagingProfile,
    state: &ForagingContinuation,
    entity: &Entity,
) -> bool {
    let Some(actor) = entity.actor.as_ref() else {
        return false;
    };
    if state
        .work
        .as_ref()
        .and_then(|work| work.target_id.as_deref())
        == Some(entity.id.as_str())
    {
        return true;
    }
    if !actor.alive || !entity.actively_participates() {
        return false;
    }
    if let Some(pack) = state.pack_id.as_deref()
        && entity
            .animal
            .as_ref()
            .and_then(|animal| animal.foraging.as_ref())
            .and_then(|forage| forage.pack_id.as_deref())
            == Some(pack)
    {
        return true;
    }
    profile.hunt.as_ref().is_some_and(|hunt| {
        actor
            .species
            .as_ref()
            .is_some_and(|species| hunt.prey_species.contains(species))
            || actor.body.as_ref().is_some_and(|body| body.plan == "biped")
    })
}

pub(super) enum RegroupChoice {
    Hold,
    Apply(ForageIntention),
}

impl RegroupChoice {
    pub(super) fn intention(self) -> Option<ForageIntention> {
        match self {
            Self::Hold => None,
            Self::Apply(intention) => Some(intention),
        }
    }
}

fn support(entity: &Entity) -> Option<&str> {
    match &entity.placement {
        Some(Placement::World {
            support_surface_id, ..
        }) => support_surface_id.as_deref(),
        _ => None,
    }
}

/// Continue the one current regroup leg or select a genuinely seen companion.
/// Losing sight, support, time or travel clears only the action that leg owns.
pub(super) fn regroup(
    state: &SimulationState,
    animal: &Entity,
    next: &mut ForagingContinuation,
    profile: &ResourceForagingProfile,
    visible: &SightResults,
    ranks: &CollationRanks,
    budget: &ByteBudget,
) -> Result<Option<RegroupChoice>, ExecutionError> {
    let (Some(rules), Some(pack), Some(side)) =
        (&profile.regroup, next.pack_id.as_deref(), support(animal))
    else {
        return Ok(None);
    };
    let prior = next.work.as_ref();
    if prior.is_some_and(|work| {
        !matches!(
            work.kind,
            ForagingWorkKind::Regroup | ForagingWorkKind::Routine
        )
    }) {
        return Ok(None);
    }
    let active = prior.filter(|work| work.kind == ForagingWorkKind::Regroup);
    let actor = animal.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
    let action = actor.action.as_ref();
    let here = animal
        .world_position()
        .ok_or(ExecutionError::InvalidPosition)?;
    let at = state.physical.header.sim_time;
    let seen = || {
        visible
            .iter()
            .filter_map(|(id, seen)| seen.then(|| state.physical.entities.get(id)).flatten())
    };
    let owns_action =
        active.is_some_and(|work| action.is_some_and(|action| action.id == work.action_id));
    let mut choice: Option<(&Entity, &str, crate::state::Point, f64)> = None;
    for other in seen() {
        let Some(other_actor) = other.actor.as_ref().filter(|actor| actor.alive) else {
            continue;
        };
        let Some(surface) = support(other) else {
            continue;
        };
        if let Some(work) = active {
            if work.target_id.as_deref() != Some(other.id.as_str())
                || work.target_life != Some(other_actor.physical_life.unwrap_or(0))
            {
                continue;
            }
        } else if other
            .animal
            .as_ref()
            .and_then(|component| component.foraging.as_ref())
            .and_then(|foraging| foraging.pack_id.as_deref())
            != Some(pack)
        {
            continue;
        }
        let point = other
            .world_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        let distance = distance(here, point);
        let better = match choice {
            None => true,
            Some((previous, _, _, prior_distance)) if distance == prior_distance => ranks
                .compare(&other.id, &previous.id)
                .map_err(|_| ExecutionError::Invariant)?
                .is_lt(),
            Some((_, _, _, prior_distance)) => distance < prior_distance,
        };
        if better {
            choice = Some((other, surface, point, distance));
        }
    }
    let clear = |next: &mut ForagingContinuation| {
        next.work = None;
        next.destination = None;
        next.mode = ForagingMode::Routine;
        next.review_at = at + rules.review_game_seconds;
        if owns_action {
            RegroupChoice::Apply(ForageIntention::Stop)
        } else {
            RegroupChoice::Hold
        }
    };
    if active.is_some_and(|work| at >= work.ends_at || work.travelled_metres >= rules.leg_metres)
        || active.is_some() && choice.is_none()
    {
        return Ok(Some(clear(next)));
    }
    let Some((mate, mate_surface, point, distance)) = choice else {
        return Ok(None);
    };
    let radii = animal.ordinary_body_profile().radius + mate.ordinary_body_profile().radius;
    let separation = distance - radii;
    if separation
        <= if active.is_some() {
            rules.stop_separation_metres
        } else {
            rules.separation_above_metres
        }
    {
        return Ok(if active.is_some() {
            Some(clear(next))
        } else {
            None
        });
    }
    let ends_at = active.map_or(at + rules.leg_game_seconds, |work| work.ends_at);
    next.review_at = ends_at.min(at + rules.review_game_seconds);
    if owns_action
        && active
            .and_then(|work| {
                work.route_target
                    .as_ref()
                    .or_else(|| work.observed.as_ref().map(|observation| &observation.point))
            })
            .is_some_and(|previous| {
                crate::spatial::distance(previous.point(), point)
                    < rules.refresh_displacement_metres
            })
    {
        return Ok(Some(RegroupChoice::Hold));
    }
    let travelled = active.map_or(0.0, |work| work.travelled_metres);
    let leg = (rules.leg_metres - travelled).min(separation - rules.stop_separation_metres);
    let destination = interpolate(here, point, leg / distance);
    let epsilon = state.installed.spatial.epsilon;
    let support_height = state
        .installed
        .geometry
        .spatial
        .surfaces
        .iter()
        .find_map(|surface| {
            if surface.id != side
                || destination.x < surface.min_x - epsilon
                || destination.x > surface.max_x + epsilon
                || destination.z < surface.min_z - epsilon
                || destination.z > surface.max_z + epsilon
            {
                return None;
            }
            let y = surface.y
                + (destination.x - surface.min_x) * surface.slope_x
                + (destination.z - surface.min_z) * surface.slope_z;
            ((destination.y - y).abs() <= state.installed.spatial.support_tolerance).then_some(y)
        });
    let Some(y) = support_height else {
        return Ok(Some(clear(next)));
    };
    let allowance = budget.reserve(side.len())?;
    let observed = SurfacePoint {
        x: point.x,
        y: point.y,
        z: point.z,
        surface_id: mate_surface.into(),
    };
    if let Some(work) = next
        .work
        .as_mut()
        .filter(|work| work.kind == ForagingWorkKind::Regroup)
    {
        work.observed = Some(ObservedForagingTarget {
            point: observed.clone(),
            at,
        });
        work.route_target = Some(observed);
    } else {
        let here = SurfacePoint {
            x: here.x,
            y: here.y,
            z: here.z,
            surface_id: side.into(),
        };
        next.work = Some(ForagingWork {
            kind: ForagingWorkKind::Regroup,
            action_id: action.map_or_else(
                || format!("native-forage-{}", state.physical.identity.next_id()),
                |action| action.id.clone(),
            ),
            started_at: at,
            ends_at,
            travelled_metres: 0.0,
            last_point: here,
            source_id: None,
            target_id: Some(mate.id.clone()),
            target_life: mate.physical_life(),
            observed: Some(ObservedForagingTarget {
                point: observed.clone(),
                at,
            }),
            search_index: None,
            lost_at: None,
            route_target: Some(observed),
        });
    }
    let destination = SurfacePoint {
        x: destination.x,
        y,
        z: destination.z,
        surface_id: side.into(),
    };
    next.mode = ForagingMode::Regrouping;
    next.destination = Some(destination.clone());
    Ok(Some(RegroupChoice::Apply(ForageIntention::Move(
        destination,
        allowance,
    ))))
}
