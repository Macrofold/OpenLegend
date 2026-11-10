use super::super::mutation::{AppendUndo, ExperienceUndo};
use super::*;

impl ExperienceJournal {
    pub(in crate::experience) fn load_consolidation_source(
        &mut self,
        state: &mut ExperienceState,
        record: Arc<PersonalSourceRecord>,
    ) -> Result<(), ExperienceError> {
        let actor = &record.header.actor_id;
        let kind = record.header.reference.kind;
        let source = state
            .optional_collection(actor, kind)?
            .ok_or(ExperienceError::UnknownCoverage)?;
        if let Some(prior) = source.resident_record(&record.header.reference.id) {
            if prior.row_id != record.row_id
                || prior.position != record.position
                || prior.payload != record.payload
                || prior.columns != record.columns
            {
                return Err(ExperienceError::StaleHydration);
            }
            return Ok(());
        }
        if source.coverage.complete
            || !source.coverage.parent_present
            || record.position >= source.coverage.next_ordinal
            || source.by_ordinal.contains_key(&record.position)
        {
            return Err(ExperienceError::InvalidOrdinal);
        }
        let undo = AppendUndo {
            actor_id: actor.clone(),
            kind,
            id: record.header.reference.id.clone(),
            position: record.position,
            next_ordinal: source.coverage.next_ordinal,
        };
        self.prepare_undo(actor.len() + undo.id.len())?;
        state.sensory.prepare_exchange(None, Some(&record))?;
        let history = state
            .actors
            .get_mut(actor)
            .ok_or(ExperienceError::ForeignOwner)?;
        if let Some(event) = &record.header.completion_event_type {
            let count = history.completion_events.entry(event.clone()).or_insert(0);
            *count = count
                .checked_add(1)
                .ok_or(ExperienceError::InvalidOrdinal)?;
        }
        let source = history
            .sources
            .get_mut(&kind)
            .ok_or(ExperienceError::UnknownCoverage)?;
        source.agreement_body_count = source
            .agreement_body_count
            .checked_add(usize::from(record.header.agreement_body))
            .ok_or(ExperienceError::InvalidOrdinal)?;
        source.lookup.insert(undo.id.clone(), record.position);
        state.sensory.exchange(None, Some(&record));
        source.by_ordinal.insert(record.position, record);
        self.undo.push(ExperienceUndo::Loaded(undo));
        Ok(())
    }
    pub(in crate::experience) fn replace_summary_collection(
        &mut self,
        state: &mut ExperienceState,
        actor: &str,
        after: PersonalSourceCollection,
    ) -> Result<(), ExperienceError> {
        let before = state
            .optional_collection(actor, PersonalSourceKind::Summary)?
            .ok_or(ExperienceError::UnknownCoverage)?;
        if !before.coverage.complete
            || !after.coverage.complete
            || after.actor_id != actor
            || after.kind != PersonalSourceKind::Summary
        {
            return Err(ExperienceError::UnknownCoverage);
        }
        for record in before.records() {
            state
                .budget
                .retain_record(&record._storage)
                .map_err(|_| ExperienceError::Capacity)?;
        }
        let bytes = before
            .records()
            .len()
            .checked_mul(
                crate::host::retained_size::tree_node_bound::<u64, Arc<PersonalSourceRecord>>()
                    .ok_or(ExperienceError::Capacity)?
                    + crate::host::retained_size::tree_node_bound::<String, u64>()
                        .ok_or(ExperienceError::Capacity)?,
            )
            .and_then(|n| n.checked_add(actor.len() * 2))
            .and_then(|n| {
                n.checked_add(
                    before
                        .records()
                        .map(|r| r.header.reference.id.capacity())
                        .sum::<usize>(),
                )
            })
            .ok_or(ExperienceError::Capacity)?;
        self.prepare_undo(bytes)?;
        let before = state
            .actors
            .get_mut(actor)
            .and_then(|a| a.sources.get_mut(&PersonalSourceKind::Summary))
            .ok_or(ExperienceError::UnknownCoverage)?;
        let before = std::mem::replace(before, after);
        self.undo.push(ExperienceUndo::SummaryCollection {
            actor: actor.into(),
            before,
        });
        Ok(())
    }
    pub(in crate::experience) fn set_consolidated_at(
        &mut self,
        state: &mut ExperienceState,
        actor: &str,
        at: f64,
    ) -> Result<(), ExperienceError> {
        if !at.is_finite() || at < 0.0 {
            return Err(ExperienceError::InvalidBody("consolidatedAt"));
        }
        self.prepare_undo(actor.len())?;
        let history = state
            .actors
            .get_mut(actor)
            .ok_or(ExperienceError::ForeignOwner)?;
        let before = history.consolidated_at.replace(at);
        self.undo.push(ExperienceUndo::ConsolidatedAt {
            actor: actor.into(),
            before,
        });
        Ok(())
    }
    pub(in crate::experience) fn summary_collections(
        &self,
    ) -> impl Iterator<Item = (&str, &PersonalSourceCollection)> {
        self.undo.iter().filter_map(|u| match u {
            ExperienceUndo::SummaryCollection { actor, before } => Some((actor.as_str(), before)),
            _ => None,
        })
    }
    pub(in crate::experience) fn consolidated_actors(&self) -> impl Iterator<Item = &str> {
        self.undo.iter().filter_map(|u| match u {
            ExperienceUndo::ConsolidatedAt { actor, .. } => Some(actor.as_str()),
            _ => None,
        })
    }
}
