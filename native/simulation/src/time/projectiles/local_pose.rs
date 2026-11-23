//! Current-time response to a confirmed projectile contact. The same clearance
//! query proves contraction and the later return to the ordinary body.
use super::*;
use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope};
use crate::execution::StagedOccurrence;
use crate::geometry::{BodySweepGroup, BodySweepMode, StandingQuery};
use crate::host::retained_size::HeapBytes;
use crate::reception::{EventScalar, SightBatch};
use crate::state::{BodyProfile, LocalPose, LocalPoseKind, LocalPosePhase};
use crate::text::JsText;

struct Clearance {
    questions: GeometryQueries,
    _storage: ByteReservation,
}

impl Clearance {
    fn prepare(
        core: &mut CoreMutation<'_>,
        id: &str,
        height: f64,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let world = &core.state.physical;
        let actor = world
            .entities
            .get(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let Some((foot, support)) = actor.world_support() else {
            return Ok(None);
        };
        let installed = &core.state.installed;
        let ordinary = actor.ordinary_body_profile();
        let mut storage = budget.reserve(
            size_of::<Self>()
                + size_of::<StandingQuery>()
                + size_of::<BodySweepGroup>()
                + 3 * ordinary.id.len()
                + support.len(),
        )?;
        let ratio = height / ordinary.height;
        let proposed = BodyProfile {
            height,
            eye_height: ordinary.eye_height * ratio,
            ear_height: ordinary.ear_height * ratio,
            interaction_height: ordinary.interaction_height * ratio,
            ..ordinary.clone()
        };
        let sweep = crate::movement::OccupiedSweep::prepare_profile(
            &world.bodies,
            &world.entities,
            &installed.status_policy,
            actor,
            &proposed,
            foot,
            foot,
            budget,
            &mut core.journal.meters,
        )
        .map_err(crate::movement::execution_error)?;
        let mut questions = GeometryQueries::new(binding);
        questions.standing.push(StandingQuery {
            point: crate::state::SurfacePoint {
                x: foot.x,
                y: foot.y,
                z: foot.z,
                surface_id: support.into(),
            },
            body: proposed,
        });
        if !sweep.bounds.is_empty() {
            let (body, bounds, backing) = sweep.into_shape();
            storage.merge(backing)?;
            questions.body_sweeps.push(BodySweepGroup {
                from: foot,
                to: foot,
                body,
                bounds,
                mode: BodySweepMode::FirstHit,
            });
        }
        Ok(Some(Self {
            questions,
            _storage: storage,
        }))
    }

    fn finish(
        self,
        core: &mut CoreMutation<'_>,
        answer: GeometryAnswers,
    ) -> Result<bool, ExecutionError> {
        self.questions
            .validate_answers(&answer)
            .map_err(|_| ExecutionError::Invariant)?;
        for sweep in &answer.body_sweeps {
            core.journal
                .meters
                .charge(&[(WorkUnit::Tests, sweep.tested)])?;
        }
        Ok(answer.standing[0]
            && answer
                .body_sweeps
                .first()
                .is_none_or(|answer| answer.fraction.is_none()))
    }
}

pub(super) enum AvoidanceStep {
    Geometry,
    Contact,
    Duck(StagedOccurrence),
}

pub(super) struct Avoidance {
    height: f64,
    sight: Option<SightBatch>,
    clearance: Option<Clearance>,
}

impl Avoidance {
    pub(super) fn prepare(
        core: &mut CoreMutation<'_>,
        id: &str,
        point: Point,
        mut binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let world = &core.state.physical;
        let installed = &core.state.installed;
        let Some(rules) = installed
            .manifest
            .ranged_policy
            .as_ref()
            .and_then(|policy| policy.local_avoidance.as_ref())
        else {
            return Ok(None);
        };
        let body = world
            .entities
            .get(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let now = world.header.sim_time;
        let Some(actor) = body.actor.as_ref() else {
            return Ok(None);
        };
        let Some((foot, _)) = body.world_support() else {
            return Ok(None);
        };
        if !actor.alive
            || actor.incapacitated
            || !body.actively_participates()
            || body.spatial.local_pose.is_some()
            || body.spatial.flight.is_some()
            || body.spatial.fall_velocity.is_some()
            || body.spatial.soft_footprint.is_some()
            || body
                .spatial
                .local_avoidance_ready_at
                .is_some_and(|at| at > now)
            || actor.combat_ready_at.is_some_and(|at| at > now)
            || actor
                .action
                .as_ref()
                .is_some_and(|action| !matches!(action.kind.as_str(), "move" | "follow" | "evade"))
        {
            return Ok(None);
        }
        for capability in ["actions", "locomotion", "perception"] {
            if installed
                .capabilities
                .capability_blocked(Some(body), capability)?
            {
                return Ok(None);
            }
        }
        let ordinary = body.ordinary_body_profile();
        let epsilon = installed.spatial.epsilon;
        let Some(height) = rules.contracted_height(ordinary, epsilon) else {
            return Ok(None);
        };
        let lower = Point {
            y: foot.y - epsilon,
            ..foot
        };
        let contracted = Extent {
            radius: ordinary.radius + epsilon,
            height: height + 2.0 * epsilon,
        };
        core.journal.meters.charge(&[(WorkUnit::Tests, 1)])?;
        if moving_point_contact(point, point, lower, lower, contracted).is_some() {
            return Ok(None);
        }
        binding.serial = core.journal.next_provider_serial()?;
        let sight =
            SightBatch::prepare_with_point(world, installed, id, &[], Some(point), binding, budget)
                .map_err(crate::native_controller::sensor_error)?;
        Ok(Some(Self {
            height,
            sight: Some(sight),
            clearance: None,
        }))
    }

    pub(super) fn question(&self) -> Option<&GeometryQueries> {
        self.sight
            .as_ref()
            .map(SightBatch::queries)
            .or_else(|| self.clearance.as_ref().map(|probe| &probe.questions))
    }

    pub(super) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        target: &str,
        shot: &str,
        mut binding: GeometryBinding,
        answer: GeometryAnswers,
        budget: &ByteBudget,
    ) -> Result<AvoidanceStep, ExecutionError> {
        if let Some(sight) = self.sight.take() {
            let seen = sight
                .finish(answer)
                .map_err(crate::native_controller::sensor_error)?
                .point_seen()
                == Some(true);
            if !seen {
                return Ok(AvoidanceStep::Contact);
            }
            binding.serial = core.journal.next_provider_serial()?;
            self.clearance = Clearance::prepare(core, target, self.height, binding, budget)?;
            return Ok(if self.clearance.is_some() {
                AvoidanceStep::Geometry
            } else {
                AvoidanceStep::Contact
            });
        }
        let clearance = self.clearance.take().ok_or(ExecutionError::Invariant)?;
        if !clearance.finish(core, answer)? {
            return Ok(AvoidanceStep::Contact);
        }
        let installed = core.state.installed.clone();
        let world = &core.state.physical;
        let at = world.header.sim_time;
        let body = world
            .entities
            .get(target)
            .ok_or(ExecutionError::MissingEntity)?;
        let life = body.physical_life().ok_or(ExecutionError::MissingActor)?;
        let flight = &world
            .projectiles
            .flights
            .get(shot)
            .ok_or(ExecutionError::Invariant)?
            .flight;
        let point = flight.position;
        let (policy, pin) = installed
            .manifest
            .ranged_policy
            .as_ref()
            .zip(installed.manifest.ranged_policy_pin.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        let rules = policy
            .local_avoidance
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let cooldown = at + rules.cooldown_seconds;
        let probability = (flight.handling
            * flight.contact_factor()
            * policy.target_condition_factor(body)
            * rules.context_factor)
            .clamp(0.0, 1.0);
        let _pose_storage = budget.reserve(pin.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        let mut physical = core.physical();
        if probability >= 1.0 || (probability > 0.0 && physical.draw() < probability) {
            physical.set_local_pose(target, None, Some(cooldown))?;
            return Ok(AvoidanceStep::Contact);
        }
        physical.set_local_pose(
            target,
            Some(LocalPose {
                kind: LocalPoseKind::Duck,
                profile: pin.clone(),
                physical_life: life,
                started_at: at,
                restore_at: at + rules.hold_seconds,
                phase: LocalPosePhase::Holding,
                contracted_height: self.height,
            }),
            Some(cooldown),
        )?;
        stage_pose(
            core,
            target,
            "body-ducked",
            &rules.contracted_text,
            Some((shot, point)),
            budget,
        )
        .map(AvoidanceStep::Duck)
    }
}

fn stage_pose(
    core: &mut CoreMutation<'_>,
    id: &str,
    kind: &str,
    words: &str,
    observed: Option<(&str, Point)>,
    budget: &ByteBudget,
) -> Result<StagedOccurrence, ExecutionError> {
    let entity = core
        .state
        .physical
        .entities
        .get(id)
        .ok_or(ExecutionError::MissingEntity)?;
    let origin = entity
        .world_position()
        .ok_or(ExecutionError::InvalidPosition)?;
    let bytes = (id.len() + words.len() + observed.map_or(0, |(shot, _)| shot.len()))
        .checked_mul(8)
        .and_then(|bytes| bytes.checked_add(3072))
        .ok_or(ExecutionError::Capacity)?;
    let _storage = budget.reserve(bytes)?;
    let data = observed.map(|(shot, point)| {
        [
            ("projectileId", EventScalar::Text(shot.into())),
            ("observedX", EventScalar::Number(point.x)),
            ("observedY", EventScalar::Number(point.y)),
            ("observedZ", EventScalar::Number(point.z)),
        ]
        .into_iter()
        .map(|(key, value)| (key.into(), value))
        .collect()
    });
    core.stage_event(EventEmissionIntent {
        event_type: kind.into(),
        text: EmissionText::Narration(super::settle::subject(id, &JsText::from(words))),
        audience: AudienceSelection::Physical,
        source_id: Some(id.into()),
        target_id: Some(id.into()),
        data,
        scope: EventScope::External,
        origin: Some(origin),
        exposure: None,
    })
}

pub(in crate::time) fn next_return_at(physical: &crate::simulation::PhysicalState) -> f64 {
    physical
        .bodies
        .local_pose_ids()
        .filter_map(|(id, _)| physical.entities.get(id)?.spatial.local_pose.as_ref())
        .filter(|pose| pose.phase == LocalPosePhase::Holding)
        .map(|pose| pose.restore_at)
        .fold(f64::INFINITY, f64::min)
}

pub(in crate::time) struct ReturnProbe {
    id: String,
    clearance: Option<Clearance>,
    _storage: ByteReservation,
}

impl ReturnProbe {
    pub(in crate::time) fn prepare(
        core: &mut CoreMutation<'_>,
        mut binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let physical = &core.state.physical;
        let now = physical.header.sim_time;
        let Some((id, height)) = physical.bodies.local_pose_ids().find_map(|(id, dirty)| {
            let entity = physical.entities.get(id)?;
            let pose = entity.spatial.local_pose.as_ref()?;
            (pose.restore_at <= now && (dirty || pose.phase == LocalPosePhase::Holding))
                .then(|| (id, entity.ordinary_body_profile().height))
        }) else {
            return Ok(None);
        };
        let storage = budget.reserve(size_of::<Self>() + id.len())?;
        let id = id.to_owned();
        binding.serial = core.journal.next_provider_serial()?;
        let clearance = Clearance::prepare(core, &id, height, binding, budget)?;
        Ok(Some(Self {
            id,
            clearance,
            _storage: storage,
        }))
    }

    pub(in crate::time) fn question(&self) -> Option<&GeometryQueries> {
        self.clearance.as_ref().map(|probe| &probe.questions)
    }

    pub(in crate::time) fn finish(
        self,
        core: &mut CoreMutation<'_>,
        answer: Option<GeometryAnswers>,
        budget: &ByteBudget,
    ) -> Result<Option<StagedOccurrence>, ExecutionError> {
        let clear = match (self.clearance, answer) {
            (Some(probe), Some(answer)) => probe.finish(core, answer)?,
            (None, None) => false,
            _ => return Err(ExecutionError::InvalidCheckpoint),
        };
        let installed = core.state.installed.clone();
        let body = core
            .state
            .physical
            .entities
            .get(&self.id)
            .ok_or(ExecutionError::MissingEntity)?;
        let ready_at = body.spatial.local_avoidance_ready_at;
        let pose = body
            .spatial
            .local_pose
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        if clear {
            let words = installed
                .manifest
                .ranged_policy
                .as_ref()
                .and_then(|policy| policy.local_avoidance.as_ref())
                .ok_or(ExecutionError::Invariant)?;
            core.physical().set_local_pose(&self.id, None, ready_at)?;
            return stage_pose(
                core,
                &self.id,
                "local-pose-ended",
                &words.restored_text,
                None,
                budget,
            )
            .map(Some);
        }
        if pose.phase != LocalPosePhase::RestoreBlocked {
            let _working = budget.reserve(pose.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
            let next = LocalPose {
                phase: LocalPosePhase::RestoreBlocked,
                ..pose.clone()
            };
            core.physical()
                .set_local_pose(&self.id, Some(next), ready_at)?;
        }
        core.state.physical.bodies.clean_local_pose(&self.id);
        Ok(None)
    }
}
