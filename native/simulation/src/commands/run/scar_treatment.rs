//! Starting treatment checks the same body, rest spot and loose stock used
//! to settle the work. Only the timed completion can spend the material.
use super::*;
use crate::{
    activity::ActivityView,
    body::scar_treatment,
    events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope},
    narration::{Narration, NarrationPart, PersonRole},
    reception::EventScalar,
};
use indexmap::IndexMap;

impl CommandCursor {
    pub(super) fn prepare_scar_treatment(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::TreatScar {
            envelope,
            target_id,
            scar_id,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let installed = core.state.installed.clone();
        let actor = core
            .state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let Some(selection) =
            scar_treatment::select(core.state, actor, scar_id, target_id, &self.budget)?
        else {
            self.refuse(&installed.ordinary_actions.value().not_applicable);
            return Ok(false);
        };
        self.action_storage = Some(self.budget.reserve(
            std::mem::size_of::<Action>()
                + envelope.id.len()
                + target_id.len()
                + scar_id.len()
                + 128,
        )?);
        self.action = Some(Action::treat_scar(
            envelope.id.clone(),
            target_id.clone(),
            scar_id.clone(),
            selection.rule.work_seconds,
        ));
        let reach = selection.reach;
        self.reserve(size_of::<crate::geometry::SightRay>())?;
        self.question(core, Phase::ScarReach)?.sight.push(reach);
        Ok(true)
    }

    pub(super) fn prepare_scar_view(
        &mut self,
        core: &CoreMutation<'_>,
    ) -> Result<(), ExecutionError> {
        let NativeCommand::TreatScar {
            envelope,
            target_id,
            scar_id,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let actor = core
            .state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let selection =
            scar_treatment::select(core.state, actor, scar_id, target_id, &self.budget)?
                .ok_or(ExecutionError::Invariant)?;
        let mut storage = self.budget.reserve(
            512 + 4 * (selection.policy.treatment_label.len() + selection.scar.name.len())
                + 3 * selection.rest.name.storage_bytes(),
        )?;
        self.view = Some(ActivityView {
            name: format!(
                "{} {}",
                selection.policy.treatment_label, selection.scar.name
            )
            .into(),
            actor: None,
            tool: None,
            target: Some(selection.rest.name.clone()),
            facts: Vec::new(),
            children: None,
            result: None,
        });
        storage.resize(
            self.view
                .as_ref()
                .ok_or(ExecutionError::Invariant)?
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.view_reservation = Some(storage);
        Ok(())
    }

    pub(super) fn scar_treatment_started(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor: &str,
    ) -> Result<Progress, ExecutionError> {
        // Witnesses can see work start. The affected scar belongs to the
        // treating character's own activity view.
        let event_type = core
            .state
            .installed
            .ordinary_actions
            .value()
            .action_started_event
            .clone();
        let clause = core
            .state
            .installed
            .body_policy
            .as_ref()
            .and_then(|body| body.value().reincarnation.as_ref())
            .ok_or(ExecutionError::Invariant)?
            .treatment_start_clause
            .as_str();
        let _workspace = self
            .budget
            .reserve(512 + 3 * actor.len() + event_type.len() + 3 * clause.len())?;
        let clause = format!(" {clause}").into();
        let event = core.stage_event(EventEmissionIntent {
            event_type,
            text: EmissionText::Narration(Narration {
                parts: vec![
                    NarrationPart::Participant {
                        entity_id: actor.into(),
                        role: PersonRole::Subject,
                        article: None,
                    },
                    NarrationPart::Literal(clause),
                ],
            }),
            audience: AudienceSelection::Physical,
            source_id: Some(actor.into()),
            target_id: None,
            data: Some(IndexMap::from([(
                "actionType".into(),
                EventScalar::Text("treat-scar".into()),
            )])),
            scope: EventScope::External,
            origin: None,
            exposure: None,
        })?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::AfterDeparture;
        Ok(Progress::Occurrence(event))
    }
}
