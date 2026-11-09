//! Purpose-selected cold records retain their original SQL ordinals. Loading is
//! residency, not another acquisition, historical negative or save mutation.
use super::*;
use super::mutation::{AppendUndo, ExperienceUndo, adjust_agreements};

impl ExperienceJournal {
    pub(crate) fn load_selected_sources(
        &mut self,
        state: &mut ExperienceState,
        kind: PersonalSourceKind,
        rows: Vec<InstalledRow>,
        meaning: &impl PersonalEvidenceMeaning,
        budget: &crate::host::ByteBudget,
    ) -> Result<(), ExperienceError> {
        for row in rows {
            let _decode = budget.reserve(super::encoded_body_bound(&row.payload)
                .map_err(|_| ExperienceError::Capacity)?.checked_add(row.id.len()).ok_or(ExperienceError::Capacity)?)
                .map_err(|_| ExperienceError::Capacity)?;
            let actor_id = row.extra.first().and_then(crate::records::SqlCell::as_str)
                .ok_or(ExperienceError::ForeignOwner)?.to_owned();
            let source = state.actors.get(&actor_id).and_then(|actor| actor.sources.get(&kind))
                .ok_or(ExperienceError::UnknownCoverage)?;
            if !source.coverage.parent_present || row.position >= source.coverage.next_ordinal {
                return Err(ExperienceError::InvalidOrdinal);
            }
            let record = PersonalSourceRecord::install(kind, &actor_id, row, meaning, budget)?;
            let id = &record.header.reference.id;
            if let Some(position) = source.lookup.get(id) {
                let prior = source.by_ordinal.get(position).ok_or(ExperienceError::InvalidOrdinal)?;
                if prior.row_id != record.row_id || prior.parent != record.parent || prior.slot != record.slot
                    || prior.position != record.position || prior.payload != record.payload || prior.columns != record.columns {
                    return Err(ExperienceError::StaleHydration);
                }
                continue;
            }
            if source.coverage.complete || source.by_ordinal.contains_key(&record.position) {
                return Err(ExperienceError::InvalidOrdinal);
            }
            let undo = AppendUndo {
                actor_id: record.header.actor_id.clone(), kind,
                id: id.clone(), position: record.position,
                next_ordinal: source.coverage.next_ordinal,
            };
            self.prepare_undo(undo.actor_id.len().checked_add(undo.id.len()).ok_or(ExperienceError::Capacity)?)?;
            let record = Arc::new(record);
            state.sensory.prepare_exchange(None, Some(&record))?;
            let actor = state.actors.get_mut(&undo.actor_id).ok_or(ExperienceError::ForeignOwner)?;
            if let Some(event) = &record.header.completion_event_type {
                let count = actor.completion_events.entry(event.clone()).or_insert(0);
                *count = count.checked_add(1).ok_or(ExperienceError::InvalidOrdinal)?;
            }
            let source = actor.sources.get_mut(&kind).ok_or(ExperienceError::UnknownCoverage)?;
            adjust_agreements(source, false, record.header.agreement_body)?;
            source.lookup.insert(undo.id.clone(), undo.position);
            state.sensory.exchange(None, Some(&record));
            source.by_ordinal.insert(undo.position, record);
            self.undo.push(ExperienceUndo::Loaded(undo));
        }
        Ok(())
    }
}
