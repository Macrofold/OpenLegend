//! Link the actual immutable event to its previously captured activity. This
//! neither searches a later active action nor manufactures personal evidence.
use super::*;
impl ActivityJournal {
    pub(crate) fn link_event(
        &mut self,
        state: &mut ActivityState,
        activity: &EventActivity,
        event_id: &str,
        actor_in_audience: bool,
        speech_awareness: bool,
    ) -> Result<(), ActivityError> {
        let entry = &state
            .collections
            .get(&activity.actor_id)
            .ok_or(ActivityError::InvalidStructure)?
            .get(&activity.occurrence_id)?
            .ok_or(ActivityError::InvalidStructure)?
            .occurrence;
        let append = actor_in_audience
            && entry.evidence_ids.len() < 64
            && !entry.evidence_ids.iter().any(|id| id == event_id);
        if !append && !speech_awareness {
            return Ok(());
        }
        let prior_length = entry.evidence_ids.len();
        self.record_before(state, &activity.actor_id, &activity.occurrence_id)?;
        self.reserve(
            event_id
                .len()
                .checked_mul(2)
                .and_then(|bytes| bytes.checked_add((prior_length + 1) * 2 * size_of::<String>()))
                .ok_or(ActivityError::Capacity)?,
        )?;
        let entry = &mut state
            .collections
            .get_mut(&activity.actor_id)
            .ok_or(ActivityError::InvalidStructure)?
            .records
            .get_mut(&activity.occurrence_id)
            .ok_or(ActivityError::InvalidStructure)?
            .occurrence;
        if append {
            entry
                .evidence_ids
                .try_reserve_exact(1)
                .map_err(|_| ActivityError::Capacity)?;
            entry.evidence_ids.push(event_id.into());
        }
        if speech_awareness {
            entry.result_evidence = Some(ResultEvidence::Account {
                source: ResultAccountSource::Awareness,
                id: event_id.into(),
            });
        }
        self.settle_record(state, &activity.actor_id, &activity.occurrence_id)?;
        Ok(())
    }
}
