//! The selected world supplies sighting words and salience; captured personal
//! names belong to this exact private acquisition rather than later lookup.
use super::*;
use crate::narration::{
    CapturedKind, CapturedNarration, GrammaticalPerson, NameArticle, Narration, NarrationPart,
    PersonRole,
};
#[derive(Clone, Copy)]
pub(crate) enum EncounterNoticeKind {
    Person,
    Object,
}
pub(crate) struct StagedEncounter {
    event: crate::execution::StagedOccurrence,
    placement: EventAccountPlacement,
    reservation: ByteReservation,
}
impl StagedEncounter {
    pub(crate) fn into_parts(
        self,
    ) -> (
        crate::execution::StagedOccurrence,
        EventAccountPlacement,
        ByteReservation,
    ) {
        (self.event, self.placement, self.reservation)
    }
}
impl EncounterBatch {
    pub(crate) fn open(
        core: &mut CoreMutation<'_>,
        observer: &str,
    ) -> Result<Self, ExecutionError> {
        let maximum = core.state.installed.encounter_batch_entries;
        core.journal
            .encounters
            .open(&core.state.physical, observer, maximum)
    }
    pub(crate) fn stage_notice(
        &self,
        core: &mut CoreMutation<'_>,
        target: &str,
        detail: &crate::text::JsText,
        kind: EncounterNoticeKind,
        budget: &ByteBudget,
    ) -> Result<StagedEncounter, cursor::EventError> {
        let scope = core.journal.encounters.scope(self)?;
        if !scope.current(&core.state.physical) {
            return Err(invalid().into());
        }
        let observer = &scope.actor;
        let actor = core
            .state
            .physical
            .entities
            .get(observer)
            .ok_or(ExecutionError::MissingActor)?;
        let selected = crate::worlds::InstalledPersonalNameReader::prepare(
            &core.state.physical,
            &core.state.reception,
            &core.state.installed,
            &core.state.experience,
            observer,
        )
        .map_err(ExecutionError::Received)?;
        let target_name = selected
            .capture_intended_name(target, crate::commands::SpeechTargetRole::Body, budget)
            .map_err(ExecutionError::Received)?;
        let sighting = &core.state.installed.observation_rules.value().sighting;
        let wording = &sighting.wording;
        let stimulus = match kind {
            EncounterNoticeKind::Person => &sighting.changed_being,
            EncounterNoticeKind::Object => &sighting.routine,
        };
        let bound = heap_sum([
            size_of::<StagedEncounter>(),
            size_of::<CapturedNarration>(),
            observer
                .len()
                .checked_mul(4)
                .ok_or(ExecutionError::Capacity)?,
            target
                .len()
                .checked_mul(3)
                .ok_or(ExecutionError::Capacity)?,
            actor.name.storage_bytes(),
            actor
                .name_form
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            actor
                .indefinite_article
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            target_name
                .name()
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            detail
                .storage_bytes()
                .checked_mul(2)
                .ok_or(ExecutionError::Capacity)?,
            wording.detail.len(),
            wording.routine.len(),
            wording.detail_prefix.len(),
            wording.ending.len(),
            sighting.event_type.len(),
            map_storage::<String, crate::state::Named>(4).ok_or(ExecutionError::Capacity)?,
            map_storage::<String, crate::reception::EventScalar>(16)
                .ok_or(ExecutionError::Capacity)?,
            8 * size_of::<NarrationPart>(),
            1024,
        ])
        .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bound)?;
        let mut names = IndexMap::new();
        names.try_reserve(2).map_err(|_| ExecutionError::Capacity)?;
        // Source captures the actual observer entity and observerName(target).
        names.insert(
            observer.clone(),
            crate::state::Named {
                name: actor.name.clone(),
                name_form: actor.name_form.clone(),
                indefinite_article: actor.indefinite_article.clone(),
            },
        );
        names.insert(target.to_owned(), target_name.name().clone());
        let has_detail = !detail.is_empty();
        let mut suffix = crate::text::JsText::from("");
        if has_detail {
            suffix.push_str(&wording.detail_prefix);
            suffix.push_text(detail);
        }
        suffix.push_str(&wording.ending);
        let narration = Narration {
            parts: vec![
                NarrationPart::Participant {
                    entity_id: observer.clone(),
                    role: PersonRole::Subject,
                    article: None,
                },
                NarrationPart::Literal(" ".into()),
                NarrationPart::Literal(
                    (if has_detail {
                        &wording.detail
                    } else {
                        &wording.routine
                    })
                    .as_str()
                    .into(),
                ),
                NarrationPart::Participant {
                    entity_id: target.into(),
                    role: PersonRole::Name,
                    article: Some(if has_detail {
                        NameArticle::Definite
                    } else {
                        NameArticle::Indefinite
                    }),
                },
                NarrationPart::Literal(suffix),
            ],
        };
        let text = EmissionText::Captured(CapturedNarration {
            kind: CapturedKind::CapturedNarration,
            narration,
            names,
            self_id: None,
            person: GrammaticalPerson::Third,
        });
        let mut data = IndexMap::new();
        data.insert(
            "importance".into(),
            crate::reception::EventScalar::Number(stimulus.importance),
        );
        data.insert(
            "urgency".into(),
            crate::reception::EventScalar::Number(stimulus.urgency),
        );
        data.insert(
            "semanticTrigger".into(),
            crate::reception::EventScalar::Boolean(stimulus.semantic_trigger),
        );
        data.insert(
            "acquisition".into(),
            crate::reception::EventScalar::Boolean(true),
        );
        data.insert(
            "change".into(),
            crate::reception::EventScalar::Text(
                (if has_detail { "detail" } else { "onset" }).into(),
            ),
        );
        let intent = EventEmissionIntent {
            event_type: sighting.event_type.clone(),
            text,
            audience: AudienceSelection::Explicit(vec![observer.clone()]),
            source_id: Some(observer.clone()),
            target_id: Some(target.into()),
            data: Some(data),
            scope: EventScope::Private,
            origin: None,
            exposure: None,
        };
        let event = core.stage_event(intent)?;
        Ok(StagedEncounter {
            event,
            placement: EventAccountPlacement::Encounter(self.clone()),
            reservation,
        })
    }
    pub(crate) fn flush(
        &self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), cursor::EventError> {
        flush_encounter_batch(core, self, budget)
    }
    pub(crate) fn finish(
        self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), cursor::EventError> {
        flush_encounter_batch(core, &self, budget)?;
        core.journal.encounters.close(self)?;
        Ok(())
    }
}
