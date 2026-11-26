//! Actual current recording admissions and independently secured closes. The
//! receiver owns current content and membership; this owner appends history and
//! proposes only checkpoint metadata tied to that same immutable content.

use super::*;
use crate::execution::{ExecutionError, TemporalScopes};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::identity::{IdentityState, MAX_SAFE_INTEGER};
use crate::reception::{
    CurrentGroupIdentity, CurrentGroupRecordingUpdate, CurrentPartPartition, CurrentReceivedGroup,
    CurrentReceivedPart, EvidenceFamily, EvidenceSource, ObservationFactKey, ObservationOrigin,
    PerceptionEvidenceOwner, ReceivedFacetProof, ReceivedObservation, SourceRevision,
    current_field_parts, effective_current_partition, received_track_key,
    same_received_value_reference,
};
use crate::work::WorkMeters;
use indexmap::IndexSet;
use std::mem::size_of;

mod projection;
mod revoke;
pub(crate) use revoke::{CurrentRecordingRevocation, plan_current_recording_revocation};
mod support;
mod terminal;
pub(crate) use terminal::terminal_member_bytes;

#[derive(Clone, Copy)]
pub(crate) struct TemporalCurrentGroupInput<'a> {
    pub subject_id: &'a str,
    /// The actual receiving owner chooses the transition before this writer;
    /// like Source captureTemporalCurrent, the writer creates no sample token.
    pub sample_token: Option<u64>,
    pub group: &'a CurrentReceivedGroup,
    pub partition: &'a CurrentPartPartition,
    pub original_source: &'a ReceivedObservation,
    pub checked: bool,
    pub entering: bool,
    pub exiting: bool,
}
pub(crate) struct CurrentRecordingUpdates {
    updates: Vec<CurrentGroupRecordingUpdate>,
    _reservation: ByteReservation,
}
impl CurrentRecordingUpdates {
    pub(crate) fn updates(&self) -> &[CurrentGroupRecordingUpdate] {
        &self.updates
    }
}
pub(crate) struct CurrentRecordingContext<'a> {
    pub current: &'a mut crate::reception::CurrentJournal,
    pub actor_id: &'a str,
    pub owner: &'a PerceptionEvidenceOwner,
    pub values: &'a mut ReceivedValues,
    pub identity: &'a mut IdentityState,
    pub scopes: &'a mut TemporalScopes,
    pub recent_policy: &'a TemporalRetentionPolicy,
    pub maintenance_headroom: f64,
    pub meaning: &'a dyn TemporalValueMeaning,
    pub meters: &'a mut WorkMeters,
    pub now: f64,
    pub sequence: u64,
    pub budget: &'a ByteBudget,
}
fn error() -> ReceivedError {
    ReceivedError("Current recording has invalid receiving ownership or content.")
}
fn capacity() -> ReceivedError {
    ReceivedError("Current recording exceeds native byte allowance.")
}
fn overlaps(
    mark: &TemporalCurrentGroupCheckpoint,
    members: &[(String, CurrentReceivedPart)],
) -> bool {
    mark.members.iter().any(|member| {
        members
            .iter()
            .any(|(kind, part)| kind == &member.kind && part == &member.part)
    })
}
fn covers(
    mark: &TemporalCurrentGroupCheckpoint,
    members: &[(String, CurrentReceivedPart)],
) -> bool {
    members.iter().all(|(kind, part)| {
        mark.members
            .iter()
            .any(|member| kind == &member.kind && part == &member.part)
    })
}
fn current_content(
    group: &CurrentReceivedGroup,
    members: &[(String, CurrentReceivedPart)],
) -> Result<Vec<TemporalCurrentContent>, ReceivedError> {
    let mut content = Vec::new();
    content
        .try_reserve_exact(members.len())
        .map_err(|_| capacity())?;
    for (kind, part) in members {
        let field = group.received.fields.get(kind).ok_or_else(error)?;
        let value = if *part == CurrentReceivedPart::Pose {
            match &field.value.reception {
                Some(crate::reception::FacetReception::Body { pose_ref }) => pose_ref,
                _ => &field.value.reference,
            }
        } else {
            &field.value.reference
        };
        content.push(TemporalCurrentContent {
            kind: kind.clone(),
            part: *part,
            value: value.clone(),
        });
    }
    Ok(content)
}
fn same_content(
    mark: &TemporalCurrentGroupCheckpoint,
    content: &[TemporalCurrentContent],
) -> Result<bool, ReceivedError> {
    for value in content {
        let mut found = false;
        for old in &mark.content {
            if old.kind == value.kind
                && old.part == value.part
                && same_received_value_reference(&old.value, &value.value)?
            {
                found = true;
                break;
            }
        }
        if !found {
            return Ok(false);
        }
    }
    Ok(true)
}
pub(crate) fn current_group_recording_complete(
    group: &CurrentReceivedGroup,
    epoch: Option<&str>,
) -> Result<bool, ReceivedError> {
    let Some(epoch) = epoch else { return Ok(false) };
    let Some(recordings) = group
        .recordings
        .as_ref()
        .filter(|recordings| !recordings.is_empty())
    else {
        return Ok(false);
    };
    for (kind, field) in &group.received.fields {
        for part in current_field_parts(field) {
            let reference = if *part == CurrentReceivedPart::Pose {
                match &field.value.reception {
                    Some(crate::reception::FacetReception::Body { pose_ref }) => pose_ref,
                    _ => &field.value.reference,
                }
            } else {
                &field.value.reference
            };
            let mut found = false;
            for mark in recordings {
                if mark.epoch == epoch
                    && !mark.gap
                    && mark
                        .members
                        .iter()
                        .any(|member| &member.kind == kind && member.part == *part)
                {
                    for old in &mark.content {
                        if &old.kind == kind
                            && old.part == *part
                            && same_received_value_reference(&old.value, reference)?
                        {
                            found = true;
                            break;
                        }
                    }
                }
                if found {
                    break;
                }
            }
            if !found {
                return Ok(false);
            }
        }
    }
    Ok(true)
}
fn reserve_updates(
    inputs: &[TemporalCurrentGroupInput<'_>],
    epoch: Option<&str>,
    actor_id: &str,
    budget: &ByteBudget,
) -> Result<ByteReservation, ReceivedError> {
    let mut bytes = size_of::<CurrentRecordingUpdates>();
    for input in inputs {
        let members = input.partition.members.len().max(1);
        let held = heap_sum([
            input
                .group
                .received
                .as_ref()
                .heap_bytes()
                .ok_or_else(capacity)?,
            input.group.recordings.heap_bytes().ok_or_else(capacity)?,
            input.partition.heap_bytes().ok_or_else(capacity)?,
            input.original_source.heap_bytes().ok_or_else(capacity)?,
            input.subject_id.len(),
            actor_id.len(),
            epoch.map_or(0, str::len),
        ])
        .ok_or_else(capacity)?;
        bytes = bytes
            .checked_add(held.checked_mul(4).ok_or_else(capacity)?)
            .and_then(|bytes| {
                bytes.checked_add(members.checked_mul(
                    size_of::<CurrentGroupRecordingUpdate>() + size_of::<CurrentPartPartition>(),
                )?)
            })
            .ok_or_else(capacity)?;
    }
    budget.reserve(bytes).map_err(|_| capacity())
}
impl TemporalState {
    pub(crate) fn close_current_group(
        &mut self,
        context: &mut CurrentRecordingContext<'_>,
        subject_id: &str,
        group: &CurrentReceivedGroup,
        reason: TemporalChange,
        partition: Option<&CurrentPartPartition>,
    ) -> Result<CurrentRecordingUpdates, ExecutionError> {
        let header = self.actor(context.actor_id).map(|actor| actor.header());
        let metadata = heap_sum([
            size_of::<CurrentRecordingUpdates>(),
            group.received.as_ref().heap_bytes().ok_or_else(capacity)?,
            group.recordings.heap_bytes().ok_or_else(capacity)?,
            group.metadata.heap_bytes().ok_or_else(capacity)?,
            subject_id.len(),
            context.actor_id.len(),
            header.map_or(0, |header| header.epoch.len()),
        ])
        .and_then(|bytes| bytes.checked_mul(4))
        .ok_or_else(capacity)?;
        let reservation = context.budget.reserve(metadata).map_err(|_| capacity())?;
        let mut updates = Vec::new();
        self.close_group_into(context, subject_id, group, reason, partition, &mut updates)?;
        Ok(CurrentRecordingUpdates {
            updates,
            _reservation: reservation,
        })
    }
    fn close_group_into(
        &mut self,
        context: &mut CurrentRecordingContext<'_>,
        subject_id: &str,
        group: &CurrentReceivedGroup,
        reason: TemporalChange,
        partition: Option<&CurrentPartPartition>,
        updates: &mut Vec<CurrentGroupRecordingUpdate>,
    ) -> Result<(), ExecutionError> {
        for mark in group
            .recordings
            .iter()
            .flatten()
            .filter(|mark| partition.is_none_or(|partition| overlaps(mark, &partition.members)))
        {
            let members = mark
                .members
                .iter()
                .filter(|member| {
                    partition.is_none_or(|partition| {
                        partition
                            .members
                            .iter()
                            .any(|(kind, part)| kind == &member.kind && part == &member.part)
                    })
                })
                .map(|member| (member.kind.clone(), member.part))
                .collect::<Vec<_>>();
            if members.is_empty() {
                continue;
            }
            if !mark.gap {
                let partition = if let Some(partition) = partition {
                    effective_current_partition(context.owner, group, partition, false)?
                } else {
                    std::borrow::Cow::Borrowed(group.metadata.first().ok_or_else(error)?)
                };
                let from = mark
                    .last_at
                    .max(partition.times.expanded().confirmed_through);
                let bytes = mark
                    .terminal_bytes
                    .checked_mul(members.len() as u64)
                    .filter(|bytes| *bytes <= MAX_SAFE_INTEGER)
                    .ok_or_else(error)?;
                context.scopes.append_receipt(
                    self,
                    context.values,
                    context.identity,
                    context.meaning,
                    context.meters,
                    context.actor_id,
                    context
                        .owner
                        .observer
                        .as_ref()
                        .ok_or_else(error)?
                        .physical_life,
                    context.now,
                    context.sequence,
                    TemporalCaptureInput {
                        spatial_context: false,
                        availability_at: Some(context.now),
                        coverage_gap: Some(CoverageGap {
                            from,
                            through: context.now,
                        }),
                        ended_fields: Some(members.clone()),
                        terminal_reservation_bytes: Some(bytes),
                        terminal_reservation_delta: None,
                        received_at: None,
                        received_order: None,
                        availability: None,
                        receiver_frame: None,
                        subject: received_track_key(
                            &group.received.grant.exposure,
                            &group.received.grant.channel,
                        )?,
                        context_subjects: None,
                        subject_identity: None,
                        change: if reason == TemporalChange::RetainedState {
                            TemporalChange::Unchecked
                        } else {
                            reason
                        },
                        required: false,
                        source_ids: Vec::new(),
                        origin: None,
                        facets: Vec::new(),
                    },
                    context.recent_policy,
                    context.maintenance_headroom,
                )?;
                self.release_terminal_reservation(context.actor_id, bytes)?;
            }
            updates.push(CurrentGroupRecordingUpdate {
                subject_id: subject_id.to_owned(),
                identity: CurrentGroupIdentity::of(group),
                members: Some(members),
                recording: None,
            });
        }
        Ok(())
    }
    pub(crate) fn capture_current(
        &mut self,
        context: &mut CurrentRecordingContext<'_>,
        inputs: &[TemporalCurrentGroupInput<'_>],
        capture_policy: &TemporalRetentionPolicy,
    ) -> Result<CurrentRecordingUpdates, ExecutionError> {
        if context
            .owner
            .observer
            .as_ref()
            .is_none_or(|observer| observer.actor_id != context.actor_id)
        {
            return Err(error().into());
        }
        let reservation = reserve_updates(
            inputs,
            self.actor(context.actor_id)
                .map(|actor| actor.header().epoch.as_str()),
            context.actor_id,
            context.budget,
        )?;
        let mut updates = Vec::new();
        let mut closes = Vec::new();
        for input in inputs {
            let mut admissions = Vec::new();
            if input.exiting || input.partition.availability.is_some() {
                admissions.push(input.partition.clone());
            } else {
                if !input.entering
                    && current_group_recording_complete(
                        input.group,
                        self.actor(context.actor_id)
                            .map(|actor| actor.header().epoch.as_str()),
                    )?
                {
                    continue;
                }
                let mut remaining = input.partition.members.clone();
                for mark in input
                    .group
                    .recordings
                    .iter()
                    .flatten()
                    .filter(|mark| overlaps(mark, &input.partition.members))
                {
                    let members = input
                        .partition
                        .members
                        .iter()
                        .filter(|(kind, part)| {
                            mark.members
                                .iter()
                                .any(|member| kind == &member.kind && part == &member.part)
                        })
                        .cloned()
                        .collect::<Vec<_>>();
                    remaining.retain(|member| !members.contains(member));
                    if !members.is_empty() {
                        let mut partition = input.partition.clone();
                        partition.members = members;
                        admissions.push(partition);
                    }
                }
                if !remaining.is_empty() {
                    let mut partition = input.partition.clone();
                    partition.members = remaining;
                    admissions.push(partition);
                }
            }
            for partition in &admissions {
                let members = &partition.members;
                if members.is_empty() {
                    continue;
                }
                if input.exiting || partition.availability.is_some() {
                    self.close_group_into(
                        context,
                        input.subject_id,
                        input.group,
                        if input.exiting {
                            TemporalChange::AttentionExit
                        } else {
                            TemporalChange::Unchecked
                        },
                        Some(partition),
                        &mut closes,
                    )?;
                    continue;
                }
                let marks = input
                    .group
                    .recordings
                    .iter()
                    .flatten()
                    .filter(|mark| overlaps(mark, members))
                    .collect::<Vec<_>>();
                let content = current_content(input.group, members)?;
                let reservation_mark = marks.iter().find(|mark| covers(mark, members)).copied();
                let mark = marks
                    .iter()
                    .find(|mark| {
                        self.actor(context.actor_id)
                            .is_some_and(|actor| mark.epoch == actor.header().epoch)
                            && covers(mark, members)
                    })
                    .copied();
                if !input.entering && !input.checked {
                    continue;
                }
                if let Some(mark) = mark {
                    if same_content(mark, &content)? {
                        if !mark.gap {
                            continue;
                        }
                        if let (Some(refused), Some(actor)) =
                            (mark.refused_at, self.actor(context.actor_id))
                        {
                            if actor.header().bytes + actor.header().terminal_reserved_bytes
                                >= refused[0]
                                && actor.header().count >= refused[1]
                            {
                                continue;
                            }
                        }
                    }
                    if mark.gap && !input.checked {
                        continue;
                    }
                }
                let mut facets = Vec::new();
                for kind in members
                    .iter()
                    .map(|(kind, _)| kind)
                    .collect::<IndexSet<_>>()
                {
                    facets.push(projection::facet_input(
                        context.owner,
                        context.values,
                        input,
                        kind,
                        partition,
                    )?);
                }
                if facets.is_empty() {
                    continue;
                }
                let Some(actor) = self.actor(context.actor_id) else {
                    continue;
                };
                let subject = received_track_key(
                    &input.group.received.grant.exposure,
                    &input.group.received.grant.channel,
                )?;
                let identity = input
                    .group
                    .received
                    .fields
                    .values()
                    .find_map(|field| field.local_subject.clone());
                let field = input
                    .group
                    .received
                    .fields
                    .get(&members[0].0)
                    .ok_or_else(error)?;
                let terminal_bytes = reservation_mark.map_or_else(
                    || {
                        terminal_member_bytes(
                            context.actor_id,
                            &actor.header().epoch,
                            &subject,
                            members,
                        )
                    },
                    |mark| Ok(mark.terminal_bytes),
                )?;
                let held = terminal_bytes
                    .checked_mul(members.len() as u64)
                    .ok_or_else(error)?;
                let previous = reservation_mark
                    .filter(|mark| !mark.gap)
                    .map(|mark| {
                        mark.terminal_bytes
                            .checked_mul(members.len() as u64)
                            .ok_or_else(error)
                    })
                    .transpose()?
                    .unwrap_or(0);
                let delta =
                    i64::try_from(i128::from(held) - i128::from(previous)).map_err(|_| error())?;
                let epoch = actor.header().epoch.clone();
                let capture_frame = context.current.wants_capture_frame(context.actor_id);
                let _frame_subject = if capture_frame {
                    Some(context.budget.reserve(subject.len())?)
                } else {
                    None
                };
                let frame_subject = capture_frame.then(|| subject.clone());
                let locator = context.scopes.append_receipt(
                    self,
                    context.values,
                    context.identity,
                    context.meaning,
                    context.meters,
                    context.actor_id,
                    context
                        .owner
                        .observer
                        .as_ref()
                        .ok_or_else(error)?
                        .physical_life,
                    context.now,
                    context.sequence,
                    TemporalCaptureInput {
                        spatial_context: false,
                        availability_at: None,
                        coverage_gap: None,
                        ended_fields: None,
                        terminal_reservation_bytes: None,
                        terminal_reservation_delta: Some(delta),
                        received_at: None,
                        received_order: None,
                        availability: None,
                        receiver_frame: None,
                        subject,
                        context_subjects: None,
                        subject_identity: identity,
                        change: if mark.is_some_and(|mark| !mark.gap) {
                            TemporalChange::Change
                        } else {
                            TemporalChange::Baseline
                        },
                        required: false,
                        source_ids: Vec::new(),
                        origin: None,
                        facets,
                    },
                    capture_policy,
                    context.maintenance_headroom,
                )?;
                if locator.is_some() {
                    if let (Some(subject), Some(frame)) = (
                        frame_subject.as_deref(),
                        context.scopes.prepared_frame(context.actor_id),
                    ) {
                        context
                            .current
                            .note_captured_frame(context.actor_id, subject, frame)?;
                    }
                }
                let actor = self.actor(context.actor_id).ok_or_else(error)?;
                let (pending_bytes, pending_count) =
                    context.scopes.pending_charge(context.actor_id)?;
                let recording = TemporalCurrentGroupCheckpoint {
                    epoch,
                    members: members
                        .iter()
                        .map(|(kind, part)| CurrentMemberPart {
                            kind: kind.clone(),
                            part: *part,
                        })
                        .collect(),
                    content,
                    last_source: EvidenceSource {
                        family: EvidenceFamily::NativeExposure,
                        id: field.id.clone(),
                        revision: SourceRevision::Number(partition.revision),
                        observer: context.owner.observer.as_ref().ok_or_else(error)?.clone(),
                    },
                    last_at: context.now,
                    last_measurement_revision: partition.revision,
                    terminal_bytes,
                    refused_at: if locator.is_none() {
                        Some([
                            actor.header().bytes
                                + actor.header().terminal_reserved_bytes
                                + pending_bytes,
                            actor.header().count + pending_count,
                        ])
                    } else {
                        None
                    },
                    gap: locator.is_none(),
                };
                updates.push(CurrentGroupRecordingUpdate {
                    subject_id: input.subject_id.to_owned(),
                    identity: CurrentGroupIdentity::of(input.group),
                    members: Some(members.clone()),
                    recording: Some(recording),
                });
                if locator.is_none() && reservation_mark.is_some_and(|mark| !mark.gap) {
                    self.close_group_into(
                        context,
                        input.subject_id,
                        input.group,
                        TemporalChange::RecordingGap,
                        Some(partition),
                        &mut closes,
                    )?;
                }
            }
        }
        // Source closeTemporalCurrentGroup installs its removals immediately;
        // new admissions are deferred until captureTemporalCurrent returns.
        // In particular a refused renewal must retain its new gap checkpoint.
        closes.append(&mut updates);
        Ok(CurrentRecordingUpdates {
            updates: closes,
            _reservation: reservation,
        })
    }
}
