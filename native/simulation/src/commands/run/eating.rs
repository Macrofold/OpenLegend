//! Ordinary Eat uses the same lot and live status writers as other physical
//! actions. The original candidate owns the debit, result and effect together.
use super::*;
use crate::activity::{ActivityDetail, ActivityFact, ActivityScalar};
use crate::consumption::Eater;
use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope};
use crate::narration::{
    GrammaticalPerson, NameArticle, PersonRole, TemplateBinding, narration_template, person_phrase,
};
use crate::status::AttributeSchema;
use indexmap::IndexMap;

impl CommandCursor {
    pub(super) fn eat(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor_id: &str,
    ) -> Result<Option<StagedOccurrence>, ExecutionError> {
        let NativeCommand::Eat { item_id, .. } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let installed = core.state.installed.clone();
        let actor = core
            .state
            .physical
            .entities
            .get(actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let Some(eater) = Eater::current(&installed, &core.state.physical, actor)? else {
            return self.refuse_eating("not-applicable", "Eating is unavailable.");
        };
        let unavailable = &eater.policy.unavailable_text;
        let Some(item) = crate::install::owned_by(
            &core.state.physical,
            &installed.retained,
            actor_id,
            item_id,
        )?
        else {
            return self.refuse_eating("not-edible", unavailable);
        };
        let food = installed
            .retained
            .items
            .get(item.definition_id)
            .ok_or(ExecutionError::Invariant)?;
        let nutrition = match eater.portion(food) {
            Ok(amount) => amount,
            Err(reason) => return self.refuse_eating("not-edible", reason),
        };
        let tokens = eater
            .policy
            .narration
            .bytes()
            .filter(|value| *value == b'{')
            .count();
        let workspace = crate::host::retained_size::heap_sum([
            4096,
            tokens
                .checked_mul(
                    4 * (actor_id.len()
                        + food.named.name.storage_bytes()
                        + std::mem::size_of::<crate::narration::NarrationPart>()),
                )
                .ok_or(ExecutionError::Capacity)?,
            4 * actor.name.storage_bytes(),
            4 * eater.policy.narration.len(),
            4 * eater.meter.name.len(),
            4 * eater.meter.meaning.as_ref().map_or(0, String::len),
            4 * eater.meter.id.len(),
            actor_id.len(),
            item_id.len(),
        ])
        .ok_or(ExecutionError::Capacity)?;
        self._reservation.resize(
            self._reservation
                .bytes()
                .checked_add(workspace)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let exact = IndexMap::from([(item_id.clone(), 1)]);
        let Some(debits) = core.plan_owned_debits(actor_id, &exact)? else {
            return self.refuse_eating("unavailable", unavailable);
        };
        if self.options.preview {
            return self.eating_result(true, "ate", &eater.policy.success_text);
        }
        let before = eater.before;
        let after = crate::values::js_min(eater.maximum, before + nutrition);
        let parameters = installed
            .account_law()
            .affects_observation(actor, &eater.meter.id);
        let name = crate::state::Named {
            name: actor.name.clone(),
            name_form: actor.name_form.clone(),
            indefinite_article: actor.indefinite_article.clone(),
        };
        let narration = narration_template(
            &eater.policy.narration,
            &IndexMap::from([
                (
                    "subject",
                    TemplateBinding::Entity {
                        id: actor_id,
                        name: &name,
                    },
                ),
                ("item", TemplateBinding::Named(&food.named)),
            ]),
        );
        let label = person_phrase(
            &name,
            PersonRole::Object,
            true,
            NameArticle::None,
            GrammaticalPerson::First,
        )
        .first_case(true);
        let id = &self.command.envelope().id;
        let AttributeSchema::Number { unit, .. } = &eater.meter.schema else {
            return Err(ExecutionError::Invariant);
        };
        let view = ActivityView {
            name: eater.policy.label.as_str().into(),
            actor: None,
            tool: Some(food.named.name.clone()),
            target: None,
            facts: vec![ActivityFact {
                name: eater.meter.name.as_str().into(),
                value: ActivityDetail::Scalar(ActivityScalar::Number(after - before)),
                critical: true,
                sentence: None,
            }],
            children: None,
            result: None,
        };
        let storage = self
            .budget
            .reserve(view.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        self.activity_id = Some(
            core.journal
                .activity
                .begin(
                    &mut core.state.activity,
                    &core.state.physical.entities,
                    &self.command,
                    id,
                    view,
                    storage,
                    core.state.physical.header.sim_time,
                    activity_parent(&core.state.physical.entities, &self.command),
                )
                .map_err(ExecutionError::Activity)?,
        );
        core.record_owned_debit_sources(actor_id, id, &debits)?;
        core.use_owned_lots(actor_id, id, debits)?;
        core.physical()
            .apply_ordinary_rate(actor_id, eater.meter, after, parameters)?;
        core.journal
            .activity
            .record_effect(
                &mut core.state.activity,
                id,
                actor_id,
                &eater.meter.id,
                Some(unit.as_str()),
                ActivityScalar::Number(before),
                ActivityScalar::Number(after),
                &label,
            )
            .map_err(ExecutionError::Activity)?;
        self.eating_result(true, "ate", &eater.policy.success_text)?;
        self.begin_source_scope(core)?;
        self.prepared_emission = Some(EventEmissionIntent {
            event_type: "ate".into(),
            text: EmissionText::Narration(narration),
            audience: AudienceSelection::Physical,
            source_id: Some(actor_id.into()),
            target_id: None,
            data: Some(IndexMap::from([(
                "definitionId".into(),
                crate::reception::EventScalar::Text(food.pin.id.as_str().into()),
            )])),
            scope: EventScope::External,
            origin: None,
            exposure: None,
        });
        let actor = core
            .state
            .physical
            .entities
            .get(actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        if let Some(notice) =
            crate::consumption::notice(&installed, actor, eater.meter, before, after)?
        {
            let event = core.stage_event(notice)?;
            self.reserve(event.id.len())?;
            self.event = Some(event.id.clone());
            self.after_event = Phase::EatNarration;
            return Ok(Some(event));
        }
        self.finish_eating(core).map(Some)
    }

    pub(super) fn finish_eating(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<StagedOccurrence, ExecutionError> {
        let intent = self
            .prepared_emission
            .take()
            .ok_or(ExecutionError::Invariant)?;
        let event = core.stage_event(intent)?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::ImmediateResult;
        Ok(event)
    }

    fn refuse_eating(
        &mut self,
        code: &str,
        text: &str,
    ) -> Result<Option<StagedOccurrence>, ExecutionError> {
        self.eating_result(false, code, text)
    }

    fn eating_result(
        &mut self,
        ok: bool,
        code: &str,
        text: &str,
    ) -> Result<Option<StagedOccurrence>, ExecutionError> {
        self.reserve(code.len() + 4 * text.len())?;
        self.outcome = Some(outcome(ok, code, text));
        self.phase = if ok && !self.options.preview {
            Phase::ImmediateResult
        } else {
            Phase::Done
        };
        Ok(None)
    }
}
