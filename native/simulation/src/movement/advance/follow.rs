use super::*;
use crate::host::retained_size::HeapBytes;
use crate::movement::follow::{FollowCursor, FollowDecision, FollowMode, FollowStep, FollowStop};

impl MoveAdvanceCursor {
    pub(super) fn prepare_follow(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        self.binding.serial = core.journal.next_provider_serial()?;
        let (_, action) = bound(
            core,
            &self.actor_id,
            self.action_id.as_deref().ok_or(ExecutionError::Invariant)?,
            self.physical_life,
        )?;
        self.follow = Some(Box::new(FollowCursor::prepare(
            core,
            &self.actor_id,
            action
                .target_id
                .as_deref()
                .ok_or(ExecutionError::Invariant)?,
            FollowMode::Active(action),
            self.binding,
            &self.budget,
        )?));
        self.phase = Phase::Follow;
        self.follow_step(core, None)
    }

    pub(super) fn follow_step(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<GeometryAnswers>,
    ) -> Result<bool, ExecutionError> {
        let result = self
            .follow
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .step(core, answer)?;
        let FollowStep::Complete(decision) = result else {
            return Ok(true);
        };
        self.follow = None;
        let installed = core.state.installed.clone();
        let rules = &installed.occurrence_rules.value().response.offers;
        let action_id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        match decision {
            FollowDecision::Stop(reason) => match reason {
                FollowStop::Deadline => {
                    self.reserve(
                        rules.follow_outcomes.limit.code.len()
                            + rules.follow_outcomes.limit.message.len(),
                    )?;
                    self.production_result = Some(rules.follow_outcomes.limit.outcome(true));
                    self.phase = Phase::Finish;
                }
                FollowStop::Reached => {
                    let (_, action) = bound(core, &self.actor_id, action_id, self.physical_life)?;
                    let distance = action
                        .follow
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?
                        .distance;
                    let rule = &rules.follow_outcomes.arrived;
                    self.reserve(rule.code.len() + rule.message.len() + 32)?;
                    let mut result = rule.outcome(true);
                    let mut numeric = ryu_js::Buffer::new();
                    result.message = rule
                        .message
                        .replace("{distance}", numeric.format(distance))
                        .into();
                    self.production_result = Some(result);
                    self.phase = Phase::Finish;
                }
                reason => self.fail(reason.message(rules))?,
            },
            FollowDecision::NavigationFailed(reason, custody) => {
                self._reservation.merge(custody)?;
                self.failure = Some(reason.into());
                self.phase = Phase::Finish;
            }
            FollowDecision::Update(mut update) => {
                if update.parent_id.as_deref() != Some(action_id) {
                    return Err(ExecutionError::Invariant);
                }
                if update.sighting {
                    let (_, action) = bound(core, &self.actor_id, action_id, self.physical_life)?;
                    let target = action
                        .target_id
                        .as_deref()
                        .ok_or(ExecutionError::Invariant)?;
                    let point = &update
                        .state
                        .last_seen
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?
                        .point;
                    let names = crate::worlds::InstalledPersonalNameReader::prepare(
                        &core.state.physical,
                        &core.state.reception,
                        &installed,
                        &core.state.experience,
                        &self.actor_id,
                    )
                    .map_err(ExecutionError::Received)?;
                    let label = names
                        .observer_name(target)
                        .map_err(ExecutionError::Received)?
                        .name;
                    let _custody = self.budget.reserve(
                        heap_sum([
                            target.len(),
                            point.surface_id.len(),
                            label.storage_bytes(),
                            120 * 16,
                            update.state.episode.as_ref().map_or(0, String::len),
                        ])
                        .ok_or(ExecutionError::Capacity)?,
                    )?;
                    let label = label.to_owned();
                    let label = label.slice(0..label.units_len().min(120));
                    let target = target.to_owned();
                    core.physical().remember_sighting(
                        &self.actor_id,
                        &target,
                        point.clone(),
                        label,
                        update.state.episode.clone(),
                        installed.agency_limits.places,
                    )?;
                }
                if let Some(route) = update.route {
                    let custody = update
                        .storage
                        .split_off(route.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
                    core.physical().replace_action_route(
                        &self.actor_id,
                        action_id,
                        crate::state::FundedActionRoute::from_storage(
                            route,
                            custody,
                            &self.budget,
                        )?,
                    )?;
                }
                core.physical().replace_action_follow(
                    &self.actor_id,
                    action_id,
                    crate::state::FundedActionFollow::from_storage(
                        update.state,
                        update.storage,
                        &self.budget,
                    )?,
                )?;
                self.phase = Phase::Done;
            }
        }
        Ok(false)
    }
}
