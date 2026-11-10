//! The same personally retained-source law used by recall editing. This reads
//! only the actual closed dependency selection, never a complete-history guess.
use super::*;
use crate::execution::ExecutionError;
use crate::simulation::SimulationState;

pub(super) fn retained_personal_source(
    state: &SimulationState,
    actor: &str,
    source: &str,
    selection: &PrivacySelection,
) -> Result<bool, ExecutionError> {
    if !selection.scope.matches(state, actor) || !selection.scope.includes_source(source) {
        return Err(ExecutionError::InvalidCheckpoint);
    }
    let Some(history) = state.experience.actor(actor) else {
        return Ok(false);
    };
    let awareness = state
        .experience
        .optional_collection(actor, PersonalSourceKind::Awareness)?;
    let memories = state
        .experience
        .optional_collection(actor, PersonalSourceKind::Memory)?;
    let summaries = state
        .experience
        .optional_collection(actor, PersonalSourceKind::Summary)?;
    // A canonical account stays editable even when corrected or excluded from
    // recall. Sensory awareness alone does not establish a lasting account.
    for owner in [awareness, memories, summaries].into_iter().flatten() {
        if let Some(record) = owner.resident_record(source) {
            if record.header.reference.kind != PersonalSourceKind::Awareness
                || record.header.class != AccountClass::Sensory
            {
                return Ok(true);
            }
        }
    }
    let privacy = &history.privacy;
    for record in awareness
        .into_iter()
        .flat_map(PersonalSourceCollection::records)
    {
        let h = &record.header;
        if h.class != AccountClass::Sensory
            && !privacy.is_forgotten(&h.reference.id)
            && h.privacy_dependencies.iter().any(|id| id == source)
        {
            return Ok(true);
        }
    }
    for record in memories
        .into_iter()
        .flat_map(PersonalSourceCollection::records)
    {
        let h = &record.header;
        if !h.privacy_dependencies.iter().any(|id| id == source)
            || privacy.is_forgotten(&h.reference.id)
            || h.event_id
                .as_deref()
                .is_some_and(|id| privacy.is_forgotten(id))
        {
            continue;
        }
        let visible = match h.record_kind.as_deref() {
            Some("commitment") => true,
            Some("episode") if h.source.as_deref() != Some("inferred") => {
                if let Some(event) = h.event_id.as_deref() {
                    let aware = awareness.and_then(|owner| owner.resident_record(event));
                    if aware.is_none() && !selection.scope.includes_source(event) {
                        // The closed dependency owner must prove a missing
                        // superseding awareness; a short resident tail cannot.
                        return Err(ExperienceError::UnknownCoverage.into());
                    }
                    !aware.is_some_and(|record| record.header.class != AccountClass::Sensory)
                } else {
                    true
                }
            }
            Some("impression") => {
                h.impression.is_some()
                    && !privacy.revoked(&h.reference.id)
                    && !h.privacy_dependencies.iter().any(|id| privacy.revoked(id))
            }
            _ => false,
        };
        if visible {
            return Ok(true);
        }
    }
    // Summary recall checks leaf coverage, while withdrawal also retains its
    // immediate summary sources. The immutable header keeps both exact sets.
    Ok(summaries
        .into_iter()
        .flat_map(PersonalSourceCollection::records)
        .any(|record| {
            let h = &record.header;
            !h.summary_coverage.iter().any(|id| privacy.revoked(id))
                && h.privacy_dependencies.iter().any(|id| id == source)
        }))
}
