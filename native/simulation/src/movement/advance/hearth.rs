//! Ordinary approach and earned work. Recheck the exact foothold, materials
//! and current grant at work entry and completion, then debit and place once.
use super::*;
use crate::geometry::{PlacementClearance, PlacementStance};
use crate::hearth as placement;
use crate::item_holds::{ClaimState, hearth_hold_id};
use indexmap::IndexMap;

impl MoveAdvanceCursor {
    pub(super) fn check_hearth(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Progress, ExecutionError> {
        if !core.journal.material_gather.protected {
            return Err(ExecutionError::ConstructionGatherNeedsAuthority);
        }
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (actor, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        let work = action
            .hearth_work
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let installed = core.state.installed.clone();
        let meaning = installed
            .retained
            .hearths
            .get(&work.definition.id)
            .filter(|definition| definition.pin == work.definition)
            .ok_or(ExecutionError::Invariant)?;
        if let Some(problem) = placement::current_problem(
            core.state,
            &core.journal.material_gather,
            actor,
            action,
            &meaning.definition,
            core.state.physical.header.sim_time,
            &self.budget,
        )? {
            self.fail(&problem.message)?;
            return self.drive(core, None);
        }
        let stance = action
            .destination
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let mut guard = self
            .budget
            .reserve(2 * work.site.surface_id.len() + stance.surface_id.len())?;
        let site = work.site.clone();
        let candidate = PlacementStance {
            stance: stance.physical().clone(),
            point: work.point,
        };
        let (volume, stances, geometry) = placement::site::placement_geometry(
            core,
            &self.actor_id,
            &meaning.definition,
            &site,
            Some(candidate),
            &self.budget,
        )?;
        guard.merge(geometry)?;
        self.binding.serial = core.journal.next_provider_serial()?;
        let mut query = GeometryQueries::new(self.binding);
        query.placement_volumes.push(volume);
        query.placement_stances.push(stances);
        self.queries = Some((query, guard));
        self.phase = Phase::HearthWork;
        Ok(Progress::Geometry)
    }

    pub(super) fn finish_hearth_geometry(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        let messages = placement::messages();
        let problem = match answer
            .placement_volumes
            .pop()
            .ok_or(ExecutionError::Invariant)?
        {
            PlacementClearance::Unsupported => Some(&messages.support),
            PlacementClearance::Blocked => Some(&messages.blocked),
            PlacementClearance::Occupied => Some(&messages.occupied),
            PlacementClearance::Clear => {
                if answer
                    .placement_stances
                    .pop()
                    .ok_or(ExecutionError::Invariant)?
                    .is_empty()
                {
                    Some(&messages.changed_stance)
                } else {
                    None
                }
            }
        };
        if let Some(problem) = problem {
            self.fail(&problem.message)?;
            return self.drive(core, None);
        }
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (_, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        if action.stage == "approaching" {
            return self.start_contact_work(core);
        }
        let work = action
            .hearth_work
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let installed = core.state.installed.clone();
        let meaning = installed
            .retained
            .hearths
            .get(&work.definition.id)
            .ok_or(ExecutionError::Invariant)?;
        let definition = &meaning.definition;
        let bytes = work
            .stones
            .iter()
            .try_fold(
                1024usize + id.len() + 4 * self.actor_id.len(),
                |n, stone| {
                    n.checked_add(
                        stone.item_id.len() + id.len() + 48 + 3 * size_of::<(String, u64)>(),
                    )
                },
            )
            .ok_or(ExecutionError::Capacity)?;
        let _temporary = self
            .budget
            .reserve(bytes + 3 * definition.completed_text.storage_bytes())?;
        let amounts: IndexMap<_, _> = work
            .stones
            .iter()
            .map(|stone| (stone.item_id.clone(), stone.quantity))
            .collect();
        let count = work.stones.len();
        // These amounts still belong to this invocation. Withdraw each exact
        // hold inside this same checkpoint, then apply the validated group.
        for index in 0..count {
            core.physical()
                .end_item_hold(&hearth_hold_id(id, index), ClaimState::Consumed)?;
        }
        let debit = core
            .plan_owned_debits(&self.actor_id, &amounts)?
            .ok_or(ExecutionError::Invariant)?;
        if !core.physical().advance_timed_work(
            &self.actor_id,
            id,
            self.seconds,
            installed.time_epsilon,
        )? {
            return Err(ExecutionError::Invariant);
        }
        core.record_owned_debit_sources(&self.actor_id, id, &debit)?;
        core.use_owned_lots(&self.actor_id, "place-hearth", debit)?;
        let hearth = core.place_cold_hearth(&self.actor_id, definition)?;
        let mut result = installed
            .ordinary_actions
            .value()
            .movement_completed
            .outcome(true);
        result.code = "hearth-placed".into();
        result.message = definition.completed_text.clone();
        result.entity_id = Some(hearth.clone());
        result.spent = Some(definition.input.quantity);
        let event = core.stage_event(crate::events::EventEmissionIntent {
            event_type: "hearth-placed".into(),
            text: crate::events::EmissionText::Narration(crate::narration::Narration {
                parts: vec![
                    crate::narration::NarrationPart::Participant {
                        entity_id: self.actor_id.clone(),
                        role: crate::narration::PersonRole::Subject,
                        article: None,
                    },
                    crate::narration::NarrationPart::Literal(" ".into()),
                    crate::narration::NarrationPart::Literal(
                        definition.completed_text.first_case(false),
                    ),
                ],
            }),
            audience: crate::events::AudienceSelection::Physical,
            source_id: Some(self.actor_id.clone()),
            target_id: Some(hearth),
            data: Some(IndexMap::from([(
                "actionId".into(),
                crate::reception::EventScalar::Text(id.into()),
            )])),
            scope: crate::events::EventScope::External,
            origin: None,
            exposure: None,
        })?;
        self.production_result = Some(result);
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Finish;
        Ok(Progress::Occurrence(event))
    }
}
