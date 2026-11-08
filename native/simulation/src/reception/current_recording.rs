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
/// Availability withdraws the actual covered partition, not one receipt per
/// field. The Source outer None transition is shared by this entire change.
pub(super) fn close_unchecked_coverage(
    core: &mut CoreMutation<'_>,
    observer: &str,
    coverage: &[CurrentGroupCoverage],
    at: f64,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    struct Close {
        subject: String,
        identity: CurrentGroupIdentity,
        partition: CurrentPartPartition,
    }
    let current = core
        .state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|m| m.get(observer))
        .ok_or_else(invalid)?;
    let bytes = coverage
        .iter()
        .try_fold(0usize, |sum, input| {
            let contact = current.current.get(&input.subject_id)?;
            contact
                .content
                .groups
                .iter()
                .filter(|g| input.identity.matches(g))
                .try_fold(sum, |sum, g| {
                    heap_sum([
                        sum,
                        input.subject_id.len().checked_mul(g.metadata.len())?,
                        g.metadata.heap_bytes()?.checked_mul(3)?,
                        g.metadata.len().checked_mul(size_of::<Close>())?,
                    ])
                })
        })
        .ok_or(ExecutionError::Capacity)?;
    core.journal.current.reserve_growth(bytes)?;
    let mut plans = Vec::new();
    for input in coverage {
        let Some(contact) = current.current.get(&input.subject_id) else {
            continue;
        };
        let Some(group) = contact
            .content
            .groups
            .iter()
            .find(|g| input.identity.matches(g))
        else {
            continue;
        };
        for partition in &group.metadata {
            if partition.availability.is_some() {
                continue;
            }
            let effective = effective_current_partition(current, group, partition, false)?;
            if at < effective.times.expanded().confirmed_through {
                continue;
            }
            let members: Vec<_> = partition
                .members
                .iter()
                .filter(|(kind, _)| input.kinds.as_ref().is_none_or(|k| k.contains(kind)))
                .cloned()
                .collect();
            if members.is_empty()
                || !group.recordings.iter().flatten().any(|mark| {
                    mark.members.iter().any(|member| {
                        members
                            .iter()
                            .any(|(kind, part)| kind == &member.kind && part == &member.part)
                    })
                })
            {
                continue;
            }
            let mut partition = effective.into_owned();
            partition.members = members;
            plans.push(Close {
                subject: input.subject_id.clone(),
                identity: input.identity.clone(),
                partition,
            });
        }
    }
    if plans.is_empty() {
        return Ok(());
    }
    let life = current.life;
    let lease = core
        .journal
        .acquisitions
        .begin_received(observer, life, None)?;
    for plan in plans {
        let current = core
            .state
            .reception
            .perception_evidence
            .as_ref()
            .and_then(|m| m.get(observer))
            .ok_or_else(invalid)?;
        let group = current
            .current
            .get(&plan.subject)
            .and_then(|c| c.content.groups.iter().find(|g| plan.identity.matches(g)))
            .ok_or_else(invalid)?;
        let policy = &core.state.installed.attention.value().retention;
        let updates = core.state.temporal.close_current_group(
            &mut CurrentRecordingContext {
                actor_id: observer,
                owner: current,
                values: core
                    .state
                    .reception
                    .received_values
                    .as_mut()
                    .ok_or_else(invalid)?,
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
            &plan.subject,
            group,
            TemporalChange::Unchecked,
            Some(&plan.partition),
        )?;
        current_groups_set_recording(
            &mut core.journal.current,
            &mut core.state.reception,
            observer,
            updates.updates(),
        )?;
    }
    super::retirement::finish_received(core, lease)
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

/// An unchanged check can repair an unadmitted current baseline. All missing
/// members of an actual partition stay together, matching the detector writer.
pub(super) fn repair_current_recordings(
    core: &mut CoreMutation<'_>,
    observer: &str,
    subject: &str,
    tracks: &cohort::SelectedTracks,
    checked: Option<&[CurrentGroupSelection]>,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let Some(selected) = tracks.get(subject) else {
        return Ok(());
    };
    let current = core
        .state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|m| m.get(observer))
        .ok_or_else(invalid)?;
    let Some(contact) = current.current.get(subject) else {
        return Ok(());
    };
    let epoch = core
        .state
        .temporal
        .actor(observer)
        .map(|a| a.header().epoch.as_str());
    let maximum = contact
        .content
        .groups
        .iter()
        .try_fold(0usize, |sum, g| sum.checked_add(g.metadata.len()))
        .ok_or(ExecutionError::Capacity)?;
    let bytes = contact
        .content
        .groups
        .iter()
        .try_fold(
            maximum
                .checked_mul(
                    size_of::<(usize, CurrentPartPartition)>()
                        + size_of::<TemporalCurrentGroupInput<'_>>(),
                )
                .ok_or(ExecutionError::Capacity)?,
            |sum, g| sum.checked_add(g.metadata.heap_bytes()?),
        )
        .ok_or(ExecutionError::Capacity)?;
    core.journal.current.reserve_growth(bytes)?;
    let mut partitions = Vec::new();
    partitions
        .try_reserve_exact(maximum)
        .map_err(|_| ExecutionError::Capacity)?;
    for (index, group) in contact.content.groups.iter().enumerate() {
        if current_group_recording_complete(group, epoch)?
            || !selected.contains_key(&received_track_key(
                &group.received.grant.exposure,
                &group.received.grant.channel,
            )?)
        {
            continue;
        }
        for partition in &group.metadata {
            if partition.availability.is_some() {
                continue;
            }
            let members = partition
                .members
                .iter()
                .filter(|member| {
                    checked.is_none_or(|checked| {
                        checked.iter().any(|selection| {
                            selection.identity.matches(group)
                                && selection.partition.members.contains(member)
                        })
                    })
                })
                .cloned()
                .collect::<Vec<_>>();
            if members.is_empty() {
                continue;
            }
            if members.iter().all(|(kind, part)| {
                group.recordings.iter().flatten().any(|mark| {
                    Some(mark.epoch.as_str()) == epoch
                        && !mark.gap
                        && mark
                            .members
                            .iter()
                            .any(|m| m.kind == *kind && m.part == *part)
                })
            }) {
                continue;
            }
            let mut effective =
                effective_current_partition(current, group, partition, false)?.into_owned();
            effective.members = members;
            partitions.push((index, effective));
        }
    }
    if partitions.is_empty() {
        return Ok(());
    }
    let mut inputs = Vec::new();
    inputs
        .try_reserve_exact(partitions.len())
        .map_err(|_| ExecutionError::Capacity)?;
    for (index, partition) in &partitions {
        let group = &contact.content.groups[*index];
        inputs.push(TemporalCurrentGroupInput {
            subject_id: subject,
            sample_token: None,
            group,
            partition,
            original_source: contact
                .content
                .originals
                .get(&group.received.grant.original)
                .ok_or_else(invalid)?,
            checked: true,
            entering: false,
            exiting: false,
        });
    }
    let policy = &core.state.installed.attention.value().retention;
    let updates = core.state.temporal.capture_current(
        &mut CurrentRecordingContext {
            actor_id: observer,
            owner: current,
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
