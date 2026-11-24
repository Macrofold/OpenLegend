//! Source offer order and selected-world prerequisites, before real command preparation.
use super::*;

impl NpcCandidateCursor {
    fn offer_inspection(
        &mut self,
        core: &mut CoreMutation<'_>,
        preparation_id: &str,
        after: i64,
        method_after: u64,
        page: Option<&'static str>,
    ) -> Result<(), ExecutionError> {
        let mut input = CommandInput::new(&self.actor, preparation_id, "inspect-activities");
        input.after = Some(after);
        input.method_after = Some(method_after);
        let (command, guard) = self.command(&input)?;
        let (id, meaning) = if let Some(page) = page {
            (
                self.id(&["inspect-activities", page])?,
                NpcOfferMeaning::ActivityPage { page },
            )
        } else {
            (self.id(&["inspect-activities"])?, NpcOfferMeaning::Activities)
        };
        self.start(core, id, meaning, command, guard, WorkTransitionMode::Continue)
    }

    /// Read one current personal library. Put displayed methods ahead of the
    /// usual suggestions, keeping their page order and suppressing duplicates.
    fn offer_learned(
        &mut self,
        state: &crate::simulation::SimulationState,
        actor: &str,
    ) -> Result<(), ExecutionError> {
        const SUGGESTIONS: usize = 4;
        let selected = self.inspection.as_ref().map_or(&[][..], |page| page.methods());
        let mut inspected = [const { None }; crate::activity::METHODS_PER_PAGE];
        let mut ordinary = [const { None }; SUGGESTIONS];
        let mut remaining = selected.len();
        let mut count = 0;
        crate::activity::visit_learned_speech(state, actor, &self.budget, |method| {
            if let Some(index) = selected.iter().position(|id| id == method.id()) {
                inspected[index] = Some(method);
                remaining -= 1;
            } else if count < SUGGESTIONS {
                ordinary[count] = Some(method);
            }
            count += 1;
            Ok(remaining > 0 || count < SUGGESTIONS)
        })?;
        for method in inspected.into_iter().chain(ordinary).flatten() {
            let choice = method.retain_choice(state, &self.budget)?;
            let (id, guard) = self.id(&["learned-", method.id()])?;
            self.append(PreparedNpcOffer {
                description: None,
                id,
                meaning: NpcOfferMeaning::Learned { choice: choice.clone() },
                command: PreparedNpcInstruction::Learned(choice),
                transition: WorkTransitionMode::Enqueue,
                temporary: None,
                next_at: None,
                _storage: guard,
            })?;
        }
        Ok(())
    }

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
                self.stage = if self.inspection.is_some() {
                    Enumerate::ActivityHistoryNext
                } else {
                    Enumerate::Inventory
                };
                if core.state.activity.learning.contains_key(&self.actor) {
                    self.offer_inspection(core, preparation_id, -1, 0, None)?;
                }
            }
            Enumerate::ActivityHistoryNext => {
                self.stage = Enumerate::ActivityMethodsNext;
                if let Some(page) = &self.inspection
                    && let Some(after) = page.next
                {
                    self.offer_inspection(core, preparation_id, after, page.method_after(), Some("history"))?;
                }
            }
            Enumerate::ActivityMethodsNext => {
                self.stage = Enumerate::Inventory;
                if let Some(page) = &self.inspection
                    && let Some(after) = page.method_next
                {
                    self.offer_inspection(core, preparation_id, page.after(), after as u64, Some("methods"))?;
                }
            }
            Enumerate::Inventory => {
                self.stage = Enumerate::Learned;
                if core.state.inventory.has_children(&self.actor) {
                    return Ok(true);
                }
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
            Enumerate::Learned => {
                self.stage = Enumerate::Continue;
                if actor.alive && !actor.incapacitated && actor.action.is_none()
                    && !actor.agency.plan.as_ref().is_some_and(|plan| plan.status == crate::plans::PlanStatus::Active)
                {
                    self.offer_learned(core.state, actor_entity.id.as_str())?;
                }
            }
            Enumerate::Continue => {
                self.stage = Enumerate::Follow(0, 0);
                let received = self.offer_gift_replies(core, actor_entity)?;
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
                    description: None,
                    id,
                    meaning: NpcOfferMeaning::Continuation {
                        action_type,
                        plan_pending,
                    },
                    command: PreparedNpcInstruction::Continue,
                    transition: WorkTransitionMode::Continue,
                    temporary: None,
                    next_at: None,
                    _storage: guard,
                })?;
                if let Some(received) = received {
                    self.begin_gift_reach(core, received)?;
                }
            }
            Enumerate::GiftProposal(target, lot, counter) => {
                self.offer_gift(core, target, lot, counter, preparation_id)?;
            }
            Enumerate::Follow(index, count) => {
                if index == self.targets.len()
                    || matches!(self.coverage, Some(NpcOfferCoverage::Suggestions))
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
                    self.stage = Enumerate::Evade(0);
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
                input.operation = Some(if active {
                    StatusOperation::Deactivate
                } else {
                    StatusOperation::Activate
                });
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
            Enumerate::Evade(index) => {
                if !self.offer_evasion(core, index, preparation_id)? {
                    let entity = core
                        .state
                        .physical
                        .entities
                        .get(&self.actor)
                        .ok_or(ExecutionError::MissingActor)?;
                    self.stage = if crate::reception::vision_parameters(&installed, entity).radius == 0.0 {
                        Enumerate::Probe(0)
                    } else {
                        Enumerate::Approach(0)
                    };
                }
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
                    self.stage = Enumerate::Fish(0, 0);
                    return Ok(true);
                }
                self.stage = Enumerate::Approach(index + 1);
                self.begin_approach(core, index)?;
            }
            Enumerate::Fish(index, tool) => {
                if index == self.targets.len()
                    || !actor
                        .body
                        .as_ref()
                        .is_some_and(|body| rules.manual_work_body_plans.contains(&body.plan))
                {
                    self.cast_tools = None;
                    self.stage = Enumerate::Fire(0, 0);
                } else {
                    self.offer_cast(core, index, tool, preparation_id)?;
                }
            }
            Enumerate::Fire(index, choice) => {
                if index == self.targets.len()
                    || installed.fire_care.is_none()
                    || !actor
                        .body
                        .as_ref()
                        .is_some_and(|body| rules.manual_work_body_plans.contains(&body.plan))
                {
                    self.fuels = None;
                    self.stage = Enumerate::Cook(0, 0);
                } else {
                    self.offer_fire(core, index, choice, preparation_id)?;
                }
            }
            Enumerate::Cook(index, recipe) => {
                if index == self.targets.len()
                    || installed.retained.preparations.is_empty()
                    || !core.state.inventory.has_children(&self.actor)
                    || !actor
                        .body
                        .as_ref()
                        .is_some_and(|body| rules.manual_work_body_plans.contains(&body.plan))
                {
                    self.cooking = None;
                    self.stage = Enumerate::Strike(0, 0);
                } else {
                    self.offer_cooking(core, index, recipe, preparation_id)?;
                }
            }
            Enumerate::Strike(target_index, definition_index) => {
                if target_index == self.targets.len() {
                    self.stage = Enumerate::EquippedStrike(0, 0);
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
            Enumerate::EquippedStrike(target, weapon) => {
                self.offer_equipped_strike(core, target, weapon, preparation_id)?;
            }
            Enumerate::Ranged(target, tool, stock) => {
                self.offer_ranged(core, target, tool, stock, preparation_id)?;
            }
            Enumerate::Guard(target, shield) => {
                self.offer_guard(core, target, shield, preparation_id)?;
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
