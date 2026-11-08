//! The real temporal owner closes old member recordings before replacement and
//! admits only actually changed members of the currently selected tracks.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::ByteBudget;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::received::{
    CurrentRecordingContext, TemporalChange, TemporalCurrentGroupInput,
    current_group_recording_complete,
};
use std::mem::size_of;

fn invalid() -> ExecutionError {
    ExecutionError::Received(crate::received::ReceivedError(
        "Current history lost its acquired member binding.",
    ))
}
fn partitions(
    core: &mut CoreMutation<'_>,
    observer: &str,
    subject: &str,
    channel: Option<&DefinitionPin>,
    kind: &str,
    closing: bool,
) -> Result<Vec<(usize, CurrentPartPartition)>, ExecutionError> {
    let owner = core
        .state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(observer))
        .ok_or_else(invalid)?;
    let Some(contact) = owner.current.get(subject) else {
        return Ok(Vec::new());
    };
    let mut count = 0usize;
    let mut bytes = 0usize;
    for group in &contact.content.groups {
        if channel.is_some_and(|channel| channel != &group.received.grant.channel)
            || !group.received.fields.contains_key(kind)
        {
            continue;
        }
        for partition in &group.metadata {
            if partition.members.iter().any(|(member, _)| member == kind) {
                count = count.checked_add(1).ok_or(ExecutionError::Capacity)?;
                bytes = heap_sum([
                    bytes,
                    partition.heap_bytes().ok_or(ExecutionError::Capacity)?,
                    size_of::<(usize, CurrentPartPartition)>(),
                ])
                .ok_or(ExecutionError::Capacity)?;
            }
        }
    }
    core.journal.current.reserve_growth(bytes)?;
    let mut result = Vec::new();
    result
        .try_reserve_exact(count)
        .map_err(|_| ExecutionError::Capacity)?;
    for (at, group) in contact.content.groups.iter().enumerate() {
        if channel.is_some_and(|channel| channel != &group.received.grant.channel)
            || !group.received.fields.contains_key(kind)
        {
            continue;
        }
        for partition in &group.metadata {
            let members = partition
                .members
                .iter()
                .filter(|(member, _)| member == kind)
                .cloned()
                .collect::<Vec<_>>();
            if members.is_empty()
                || closing
                    && !group.recordings.iter().flatten().any(|mark| {
                        mark.members.iter().any(|member| {
                            members
                                .iter()
                                .any(|(kind, part)| kind == &member.kind && part == &member.part)
                        })
                    })
            {
                continue;
            }
            let mut part = partition.clone();
            part.members = members;
            result.push((at, part));
        }
    }
    Ok(result)
}
pub(super) fn close_current_sample_history(
    core: &mut CoreMutation<'_>,
    observer: &str,
    pending: &PendingCurrentSample,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    if !pending.needs_history_close() {
        return Ok(());
    }
    close_current_member_history(
        core,
        observer,
        pending.subject_id(),
        pending.kind(),
        pending.channel(),
        TemporalChange::Change,
        budget,
    )
}
/// One source member may own several independent partitions/recordings. All
/// replacement and physical-loss callers close those actual marks here.
pub(super) fn close_current_member_history(
    core: &mut CoreMutation<'_>,
    observer: &str,
    subject: &str,
    kind: &str,
    channel: &DefinitionPin,
    reason: TemporalChange,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let partitions = partitions(core, observer, subject, Some(channel), kind, true)?;
    for (group_index, partition) in partitions {
        let owner = core
            .state
            .reception
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(observer))
            .ok_or_else(invalid)?;
        let group = owner
            .current
            .get(subject)
            .and_then(|contact| contact.content.groups.get(group_index))
            .ok_or_else(invalid)?;
        let policy = &core.state.installed.attention.value().retention;
        let updates = core.state.temporal.close_current_group(
            &mut CurrentRecordingContext {
                actor_id: observer,
                owner,
                values: core
                    .state
                    .reception
                    .received_values
                    .as_mut()
                    .ok_or(ExecutionError::UnfinishedOccurrence)?,
                identity: &mut core.state.physical.identity,
                scopes: &mut core.journal.acquisitions,
                recent_policy: &policy.recent,
                maintenance_headroom: policy.maintenance_headroom,
                meaning: &crate::worlds::InstalledEvidenceMeaning,
                meters: &mut core.journal.meters,
                now: core.state.physical.header.sim_time,
                sequence: core.state.physical.header.sequence,
                budget,
            },
            subject,
            group,
            reason,
            Some(&partition),
        )?;
        current_groups_set_recording(
            &mut core.journal.current,
            &mut core.state.reception,
            observer,
            updates.updates(),
        )?;
    }
    Ok(())
}
pub(super) fn record_current_reception(
    core: &mut CoreMutation<'_>,
    observer: &str,
    subject: &str,
    kind: &str,
    tracks: &cohort::SelectedTracks,
    sample_token: Option<u64>,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let Some(selected) = tracks.get(subject) else {
        return Ok(());
    };
    let partitions = partitions(core, observer, subject, None, kind, false)?;
    let owner = core
        .state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(observer))
        .ok_or_else(invalid)?;
    let contact = owner.current.get(subject).ok_or_else(invalid)?;
    core.journal.current.reserve_growth(
        partitions
            .len()
            .checked_mul(size_of::<TemporalCurrentGroupInput<'_>>())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut inputs = Vec::new();
    inputs
        .try_reserve_exact(partitions.len())
        .map_err(|_| ExecutionError::Capacity)?;
    let epoch = core
        .state
        .temporal
        .actor(observer)
        .map(|actor| actor.header().epoch.as_str());
    for (group_index, partition) in &partitions {
        let group = contact
            .content
            .groups
            .get(*group_index)
            .ok_or_else(invalid)?;
        if partition.availability.is_some()
            || current_group_recording_complete(group, epoch)?
            || !selected.contains_key(&received_track_key(
                &group.received.grant.exposure,
                &group.received.grant.channel,
            )?)
        {
            continue;
        }
        let original = contact
            .content
            .originals
            .get(&group.received.grant.original)
            .ok_or_else(invalid)?;
        inputs.push(TemporalCurrentGroupInput {
            subject_id: subject,
            sample_token,
            group,
            partition,
            original_source: original,
            checked: true,
            entering: false,
            exiting: false,
        });
    }
    if inputs.is_empty() {
        return Ok(());
    }
    let policy = &core.state.installed.attention.value().retention;
    let updates = core.state.temporal.capture_current(
        &mut CurrentRecordingContext {
            actor_id: observer,
            owner,
            values: core
                .state
                .reception
                .received_values
                .as_mut()
                .ok_or(ExecutionError::UnfinishedOccurrence)?,
            identity: &mut core.state.physical.identity,
            scopes: &mut core.journal.acquisitions,
            recent_policy: &policy.recent,
            maintenance_headroom: policy.maintenance_headroom,
            meaning: &crate::worlds::InstalledEvidenceMeaning,
            meters: &mut core.journal.meters,
            now: core.state.physical.header.sim_time,
            sequence: core.state.physical.header.sequence,
            budget,
        },
        &inputs,
        &policy.recent,
    )?;
    current_groups_set_recording(
        &mut core.journal.current,
        &mut core.state.reception,
        observer,
        updates.updates(),
    )?;
    Ok(())
}
