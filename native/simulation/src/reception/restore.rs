//! A new receipt epoch clears recording admission, never closes or rewrites the
//! old observations. Their terminal marks remain under this candidate's undo.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::ByteBudget;
use crate::host::retained_size::HeapBytes;
pub(crate) fn clear_restore_recordings(
    core: &mut CoreMutation<'_>,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let count = core.state.temporal.actor_ids().count();
    let bytes = core.state.temporal.actor_ids().try_fold(
        count
            .checked_mul(std::mem::size_of::<String>())
            .ok_or(ExecutionError::Capacity)?,
        |n, id| n.checked_add(id.len()).ok_or(ExecutionError::Capacity),
    )?;
    let _ids = budget.reserve(bytes)?;
    let ids = core
        .state
        .temporal
        .actor_ids()
        .map(str::to_owned)
        .collect::<Vec<_>>();
    for actor in ids {
        if let Some(owner) = core
            .state
            .reception
            .perception_evidence
            .as_ref()
            .and_then(|o| o.get(&actor))
        {
            let count = owner
                .current
                .values()
                .map(|contact| contact.content.groups.len())
                .sum::<usize>();
            let _updates = budget.reserve(
                count
                    .checked_mul(std::mem::size_of::<CurrentGroupRecordingUpdate>())
                    .and_then(|n| {
                        n.checked_add(owner.current.iter().try_fold(0usize, |n, (id, c)| {
                            n.checked_add(id.len().checked_mul(c.content.groups.len())?)
                        })?)
                    })
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let mut updates = Vec::with_capacity(count);
            for (subject, contact) in &owner.current {
                for group in &contact.content.groups {
                    if group
                        .recordings
                        .as_ref()
                        .is_some_and(|marks| !marks.is_empty())
                    {
                        updates.push(CurrentGroupRecordingUpdate {
                            subject_id: subject.clone(),
                            identity: CurrentGroupIdentity::of(group),
                            members: None,
                            recording: None,
                        });
                    }
                }
            }
            if !updates.is_empty() {
                current_groups_set_recording(
                    &mut core.journal.current,
                    &mut core.state.reception,
                    &actor,
                    &updates,
                )?;
            }
            if let Some(geometry) = core
                .state
                .reception
                .perception_evidence
                .as_ref()
                .and_then(|o| o.get(&actor))
                .and_then(|o| o.geometry.as_ref())
                .filter(|g| {
                    g.fragments.iter().any(|f| f.recording.is_some())
                        || g.boundaries.iter().any(|b| b.recording.is_some())
                })
            {
                let _copy =
                    budget.reserve(geometry.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
                let mut next = geometry.clone();
                for fragment in &mut next.fragments {
                    fragment.recording = None;
                }
                for boundary in &mut next.boundaries {
                    boundary.recording = None;
                }
                core.journal
                    .current
                    .replace_geometry(&mut core.state.reception, &actor, next)?;
            }
        }
    }
    Ok(())
}
