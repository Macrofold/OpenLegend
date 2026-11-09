//! Source offer order and selected-world prerequisites, before real command preparation.
use super::*;

impl NpcCandidateCursor {
    pub(super) fn enumerate(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let installed = core.state.installed.clone();
        let rules = &installed.occurrence_rules.value().response.offers;
        let actor_entity = core
            .state
            .physical
            .entities
            .get(&self.actor)
            .ok_or(ExecutionError::MissingActor)?;
        let actor = actor_entity
            .actor
            .as_ref()
            .ok_or(ExecutionError::MissingActor)?;
        let preparation_id = &installed.actor_response_limits.choice_preparation_id;
        match self.stage {
            Enumerate::Visibility => {
                self.stage = Enumerate::Activities;
                let _backing = self.budget.reserve(
                    self.targets
                        .len()
                        .checked_mul(size_of::<&str>())
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                let ids: Vec<_> = self
                    .targets
                    .iter()
                    .map(|target| target.id.as_str())
                    .collect();
                let binding = GeometryBinding::new(
                    self.candidate,
                    installed.geometry.spatial.revision,
                    core.journal.next_provider_serial()?,
                );
                self.sight = Some(
                    crate::reception::SightBatch::prepare(
                        &core.state.physical,
                        &installed,
                        &self.actor,
                        &ids,
                        binding,
                        &self.budget,
                    )
                    .map_err(sensor_error)?,
                );
            }
            Enumerate::Activities => {
                self.stage = Enumerate::Inventory;
                // Positive learned methods/acquisitions have no installed
                // selected producer. This real cursor can grow independently.
                if core.state.activity.learning.contains_key(&self.actor) {
                    let mut input =
                        CommandInput::new(&self.actor, preparation_id, "inspect-activities");
                    input.after = Some(-1);
                    input.method_after = Some(0);
                    let (command, guard) = self.command(&input)?;
                    let id = self.id(&["inspect-activities"])?;
                    self.start(
                        core,
                        id,
                        NpcOfferMeaning::Activities,
                        command,
                        guard,
                        WorkTransitionMode::Continue,
                    )?;
                }
            }
            Enumerate::Inventory => {
                self.stage = Enumerate::Continue;
                let _closed = core
                    .state
                    .inventory
                    .project(&core.state.administration.object_membership);
                let input =
                    CommandInput::new(&self.actor, preparation_id, &rules.inspection_command);
                let (command, guard) = self.command(&input)?;
                let id = self.id(&["inspect-inventory"])?;
                self.start(
                    core,
                    id,
                    NpcOfferMeaning::Inspection,
                    command,
                    guard,
                    WorkTransitionMode::Continue,
                )?;
            }
            Enumerate::Continue => {
                self.stage = Enumerate::Follow(0, 0);
                let plan_pending = actor.agency.plan.as_ref().is_some_and(|plan| {
                    plan.status == crate::plans::PlanStatus::Active
                        && (plan.activity.is_some()
                            || plan.steps.iter().any(|step| {
                                matches!(
                                    step.status,
                                    crate::plans::StepStatus::Queued
                                        | crate::plans::StepStatus::Running
                                )
                            }))
                });
                let bytes = actor.action.as_ref().map_or(0, |action| action.kind.len());
                let mut guard = self.budget.reserve(bytes)?;
                let action_type = actor.action.as_ref().map(|action| action.kind.clone());
                let (id, id_guard) = self.id(&["continue"])?;
                guard.merge(id_guard)?;
                self.append(PreparedNpcOffer {
                    id,
                    meaning: NpcOfferMeaning::Continuation {
                        action_type,
                        plan_pending,
                    },
                    command: None,
                    transition: WorkTransitionMode::Continue,
                    temporary: None,
                    next_at: None,
                    _storage: guard,
                })?;
            }
            Enumerate::Follow(index, count) => {
                if index == self.targets.len()
                    || matches!(self.coverage, NpcOfferCoverage::Suggestions)
                        && count as u64 >= rules.follow_suggestions
                {
                    self.stage = Enumerate::Status(0, 0);
                    return Ok(true);
                }
                self.stage =
                    Enumerate::Follow(index + 1, count + usize::from(self.targets[index].alive));
                if self.targets[index].alive {
                    let target = &self.targets[index];
                    let body = target.body;
                    let mut input =
                        CommandInput::new(&self.actor, preparation_id, &rules.follow_command);
                    input.target_id = Some(&target.id);
                    let (command, guard) = self.command(&input)?;
                    let id = self.id(&["follow:", &target.id])?;
                    self.start(
                        core,
                        id,
                        NpcOfferMeaning::Follow { body },
                        command,
                        guard,
                        WorkTransitionMode::Replace,
                    )?;
                }
            }
            Enumerate::Status(target_index, definition_index) => {
                if target_index > self.targets.len() {
                    self.stage = if crate::reception::vision_parameters(&installed, actor_entity)
                        .radius
                        == 0.0
                    {
                        Enumerate::Probe(0)
                    } else {
                        Enumerate::Approach(0)
                    };
                    return Ok(true);
                }
                if definition_index == installed.status_policy.definitions.len() {
                    self.stage = Enumerate::Status(target_index + 1, 0);
                    return Ok(true);
                }
                self.stage = Enumerate::Status(target_index, definition_index + 1);
                let definition = &installed.status_policy.definitions[definition_index];
                let Some(actions) = &definition.actions else {
                    return Ok(true);
                };
                let (target, body) = if target_index == 0 {
                    (self.actor.as_str(), None)
                } else {
                    let target = &self.targets[target_index - 1];
                    (target.id.as_str(), Some(target.body))
                };
                if target_index > 0 && !actions.allow_other {
                    return Ok(true);
                }
                if definition.contribution.is_some() {
                    return Err(ExecutionError::UnsupportedFamily);
                }
                let target_entity = core
                    .state
                    .physical
                    .entities
                    .get(target)
                    .ok_or(ExecutionError::MissingEntity)?;
                let active = target_entity
                    .status_effects
                    .as_ref()
                    .and_then(|states| states.get(&definition.id))
                    .is_some_and(|status| status.active);
                if !active {
                    if target_index > 0 && !actions.activate_other {
                        return Ok(true);
                    }
                    if !installed.status_read(&core.state.physical).can_activate(
                        crate::status::EffectBindings {
                            subject: target,
                            source: &self.actor,
                            action_target: target,
                        },
                        definition,
                    )? {
                        return Ok(true);
                    }
                }
                let operation = if active { "deactivate" } else { "activate" };
                let mut input = CommandInput::new(&self.actor, preparation_id, "status-effect");
                input.target_id = Some(target);
                input.definition_id = Some(&definition.id);
                input.operation = Some(operation);
                let (command, guard) = self.command(&input)?;
                let id = self.id(&[&definition.id, ":", target, ":", operation])?;
                self.start(
                    core,
                    id,
                    NpcOfferMeaning::Status {
                        body,
                        definition: definition_index,
                        active,
                    },
                    command,
                    guard,
                    WorkTransitionMode::Replace,
                )?;
            }
            Enumerate::Probe(index) => {
                if index == rules.probes.len() {
                    self.stage = Enumerate::CurrentWork(0);
                    return Ok(true);
                }
                self.stage = Enumerate::Probe(index + 1);
                let Some(crate::state::Placement::World {
                    position,
                    support_surface_id: Some(id),
                    ..
                }) = &actor_entity.placement
                else {
                    return Ok(true);
                };
                let Some(surface) = installed
                    .geometry
                    .spatial
                    .surfaces
                    .iter()
                    .find(|surface| &surface.id == id)
                else {
                    return Ok(true);
                };
                let probe = &rules.probes[index];
                let x = position.x + probe.dx;
                let z = position.z + probe.dz;
                let eps = installed.spatial.epsilon;
                if x < surface.min_x - eps
                    || x > surface.max_x + eps
                    || z < surface.min_z - eps
                    || z > surface.max_z + eps
                {
                    return Ok(true);
                }
                // Exact sameSurfacePoint projection: retain this support and
                // its slope; do not resolve a lower floor or infer walkability.
                let point_guard = self.budget.reserve(surface.id.len())?;
                let point = SurfacePoint {
                    x,
                    y: surface.y
                        + (x - surface.min_x) * surface.slope_x
                        + (z - surface.min_z) * surface.slope_z,
                    z,
                    surface_id: surface.id.clone(),
                };
                let mut input = CommandInput::new(&self.actor, preparation_id, "move");
                input.destination = Some(&point);
                let (command, guard) = self.command(&input)?;
                drop(point_guard);
                let id = self.id(&["probe-", &probe.direction])?;
                self.start(
                    core,
                    id,
                    NpcOfferMeaning::Probe { probe: index },
                    command,
                    guard,
                    WorkTransitionMode::Replace,
                )?;
            }
            Enumerate::Approach(index) => {
                if index == self.targets.len() {
                    self.stage = Enumerate::Strike(0, 0);
                    return Ok(true);
                }
                self.stage = Enumerate::Approach(index + 1);
                self.begin_approach(core, index)?;
            }
            Enumerate::Strike(target_index, definition_index) => {
                if target_index == self.targets.len() {
                    self.stage = Enumerate::CurrentWork(0);
                    return Ok(true);
                }
                if definition_index == installed.retained.native_strike_read.len() {
                    self.stage = Enumerate::Strike(target_index + 1, 0);
                    return Ok(true);
                }
                self.stage = Enumerate::Strike(target_index, definition_index + 1);
                if !self.targets[target_index].alive {
                    return Ok(true);
                }
                let (definition_id, definition) = installed
                    .retained
                    .native_strike_read
                    .get_index(definition_index)
                    .ok_or(ExecutionError::Invariant)?;
                let body = actor.body.as_ref().map(|body| body.plan.as_str());
                if body.is_none()
                    || definition
                        .required_body_plan
                        .as_deref()
                        .is_some_and(|required| Some(required) != body)
                    || !(rules
                        .natural_strike_body_plans
                        .iter()
                        .any(|plan| Some(plan.as_str()) == body)
                        || actor
                            .natural_strike_ids
                            .as_ref()
                            .is_some_and(|ids| ids.contains(definition_id)))
                {
                    return Ok(true);
                }
                let target = &self.targets[target_index];
                let body_ordinal = target.body;
                let manual = rules
                    .manual_work_body_plans
                    .iter()
                    .any(|plan| Some(plan.as_str()) == body);
                let hunting = manual
                    && rules.hunting.methods.unarmed
                    && core
                        .state
                        .physical
                        .entities
                        .get(&target.id)
                        .and_then(|entity| entity.actor.as_ref())
                        .is_some_and(|actor| {
                            actor
                                .species
                                .as_ref()
                                .is_some_and(|species| rules.hunting.known_prey.contains(species))
                        });
                let mut input =
                    CommandInput::new(&self.actor, preparation_id, &rules.strike_command);
                input.target_id = Some(&target.id);
                input.definition_id = Some(definition_id);
                input.auto_equip = Some(true);
                if hunting {
                    input.purpose = Some(&rules.hunting_purpose)
                }
                let (command, guard) = self.command(&input)?;
                let id = self.id(&[definition_id, ":unarmed:", &target.id])?;
                self.start(
                    core,
                    id,
                    NpcOfferMeaning::Strike {
                        body: body_ordinal,
                        definition: definition_index,
                        hunting,
                    },
                    command,
                    guard,
                    WorkTransitionMode::Replace,
                )?;
            }
            Enumerate::CurrentWork(index) => {
                self.stage = if self.begin_work_view(core, false, index)? {
                    Enumerate::CurrentWork(index + 1)
                } else {
                    Enumerate::PausedWork(0)
                };
            }
            Enumerate::PausedWork(index) => {
                self.stage = if self.begin_work_view(core, true, index)? {
                    Enumerate::PausedWork(index + 1)
                } else {
                    Enumerate::Done
                };
            }
            Enumerate::Done => return Ok(false),
        }
        Ok(true)
    }
}
