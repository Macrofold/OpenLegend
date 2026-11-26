//! The final reach check and exact resource debit belong to the same action
//! slice. Aborting this candidate restores both the material and the scar.
use super::*;
use crate::{body::scar_treatment, reception::EventScalar, text::JsText};
use indexmap::IndexMap;

impl MoveAdvanceCursor {
    pub(super) fn check_scar_treatment(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Progress, ExecutionError> {
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (actor, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        let scar = action.scar_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let rest = action
            .target_id
            .as_deref()
            .ok_or(ExecutionError::Invariant)?;
        let Some(selection) = scar_treatment::select(core.state, actor, scar, rest, &self.budget)?
        else {
            self.fail(
                &core
                    .state
                    .installed
                    .ordinary_actions
                    .value()
                    .not_applicable
                    .message,
            )?;
            return self.drive(core, None);
        };
        let ray = selection.reach;
        let custody = self
            .budget
            .reserve(size_of::<GeometryQueries>() + size_of_val(&ray))?;
        let mut query = GeometryQueries::new(self.binding);
        query.sight.push(ray);
        self.queries = Some((query, custody));
        self.phase = Phase::ScarReach;
        Ok(Progress::Geometry)
    }

    pub(super) fn finish_scar_treatment(
        &mut self,
        core: &mut CoreMutation<'_>,
        reachable: bool,
    ) -> Result<Progress, ExecutionError> {
        if !reachable {
            self.fail(
                &core
                    .state
                    .installed
                    .ordinary_actions
                    .value()
                    .out_of_reach
                    .message,
            )?;
            return self.drive(core, None);
        }
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (actor, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        let scar = action.scar_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let rest = action
            .target_id
            .as_deref()
            .ok_or(ExecutionError::Invariant)?;
        let selection = scar_treatment::select(core.state, actor, scar, rest, &self.budget)?
            .ok_or(ExecutionError::Invariant)?;
        let _workspace = self.budget.reserve(
            1024 + 4 * self.actor_id.len()
                + 3 * scar.len()
                + 2 * selection.material.id.len()
                + 6 * selection.policy.treatment_text.len(),
        )?;
        let scar = scar.to_owned();
        let message = JsText::from(selection.policy.treatment_text.as_str());
        let quantity = selection.rule.quantity;
        let stock = IndexMap::from([(selection.material.id.clone(), quantity)]);
        let debit = core
            .plan_owned_debits(&self.actor_id, &stock)?
            .ok_or(ExecutionError::Invariant)?;
        let installed = core.state.installed.clone();
        if !core.physical().advance_timed_work(
            &self.actor_id,
            id,
            self.seconds,
            installed.time_epsilon,
        )? {
            return Err(ExecutionError::Invariant);
        }
        core.record_owned_debit_sources(&self.actor_id, id, &debit)?;
        core.use_owned_lots(&self.actor_id, "scar-treatment", debit)?;
        core.physical().treat_scar(&self.actor_id, &scar)?;
        let event = core.stage_event(EventEmissionIntent {
            event_type: "scar-treated".into(),
            text: EmissionText::Literal(message.clone()),
            audience: AudienceSelection::Explicit(vec![self.actor_id.clone()]),
            source_id: Some(self.actor_id.clone()),
            target_id: None,
            data: Some(IndexMap::from([(
                "scarId".into(),
                EventScalar::Text(scar.into()),
            )])),
            scope: EventScope::Private,
            origin: None,
            exposure: None,
        })?;
        let mut result = installed
            .ordinary_actions
            .value()
            .movement_completed
            .outcome(true);
        result.message = message;
        result.spent = Some(quantity);
        self.production_result = Some(result);
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Finish;
        Ok(Progress::Occurrence(event))
    }
}
