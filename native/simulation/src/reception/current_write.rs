//! Current received fields and their independent metadata partitions. History
//! admission is a separate owner; these operations never manufacture receipts.

use super::*;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::received::{ReceivedError, ReceivedValueReference, TemporalCurrentGroupCheckpoint};
use crate::reception::current_journal::received_content_copy_bytes;
use indexmap::{IndexMap, IndexSet};
use std::{
    hash::{Hash, Hasher},
    mem::size_of,
    sync::Arc,
};

#[derive(Clone, Debug)]
pub(crate) struct CurrentGroupIdentity(Arc<()>);
impl CurrentGroupIdentity {
    pub(crate) fn of(group: &CurrentReceivedGroup) -> Self {
        Self(group.field_identity.clone())
    }
    pub(crate) fn matches(&self, group: &CurrentReceivedGroup) -> bool {
        Arc::ptr_eq(&self.0, &group.field_identity)
    }
}
impl PartialEq for CurrentGroupIdentity {
    fn eq(&self, other: &Self) -> bool {
        Arc::ptr_eq(&self.0, &other.0)
    }
}
impl Eq for CurrentGroupIdentity {}
impl Hash for CurrentGroupIdentity {
    fn hash<H: Hasher>(&self, state: &mut H) {
        (Arc::as_ptr(&self.0) as usize).hash(state);
    }
}
pub(crate) fn current_facet_membership(
    owner: &PerceptionEvidenceOwner,
    field: &CurrentStoredField,
    grant: &CurrentFacetGrant,
) -> Result<CurrentGroupIdentity, ReceivedError> {
    owner
        .current
        .get(&grant.subject_id)
        .and_then(|contact| {
            contact.content.groups.iter().find(|group| {
                group.received.grant.channel == grant.channel
                    && group
                        .received
                        .fields
                        .get(&field.value.kind)
                        .is_some_and(|current| current.id == field.id)
            })
        })
        .map(CurrentGroupIdentity::of)
        .ok_or_else(invalid)
}

pub(crate) struct CurrentGroupRecordingUpdate {
    pub subject_id: String,
    pub identity: CurrentGroupIdentity,
    pub members: Option<Vec<(String, CurrentReceivedPart)>>,
    pub recording: Option<TemporalCurrentGroupCheckpoint>,
}
pub(crate) struct CurrentGroupCoverage {
    pub subject_id: String,
    pub identity: CurrentGroupIdentity,
    pub kinds: Option<IndexSet<String>>,
}
pub(crate) struct CurrentGroupSelection {
    pub identity: CurrentGroupIdentity,
    pub partition: CurrentPartPartition,
}
pub(crate) struct CurrentFacetAddress<'a> {
    pub subject_id: &'a str,
    pub kind: &'a str,
    pub channel: Option<&'a DefinitionPin>,
}
pub(crate) struct CurrentFacetInput {
    pub field: CurrentStoredField,
    pub grant: CurrentFacetGrant,
    pub original: Arc<ReceivedObservation>,
    pub times: CurrentFacetTimes,
    pub revision: u64,
    pub availability: Option<CurrentAvailability>,
}
#[derive(Clone, Debug)]
pub(crate) struct CurrentReceptionStamp {
    pub received_at: f64,
    pub received_order: u64,
    pub confirmed_revision: u64,
    pub frame_ref: Option<ReceivedValueReference>,
}
fn invalid() -> ReceivedError {
    ReceivedError("Invalid current field membership or receiving boundary.")
}
fn capacity() -> ReceivedError {
    ReceivedError("Current field mutation exceeds native byte allowance.")
}
fn owner<'a>(
    state: &'a ReceptionState,
    observer: &str,
) -> Result<&'a PerceptionEvidenceOwner, ReceivedError> {
    state
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(observer))
        .ok_or_else(invalid)
}
fn field_kind(identity: &str) -> Result<String, ReceivedError> {
    let (kind, _, _, _): (String, String, u64, String) =
        serde_json::from_str(identity).map_err(|_| invalid())?;
    Ok(kind)
}
fn member_check(kind: &str, part: CurrentReceivedPart, modality: Modality) -> CurrentCheck {
    if part == CurrentReceivedPart::Pose || modality != Modality::Sight {
        CurrentCheck::None
    } else if matches!(
        kind,
        "description" | "carried" | "pile-contents" | "public-attributes"
    ) {
        CurrentCheck::Detail
    } else {
        CurrentCheck::Broad
    }
}
fn same_partition(
    left: &CurrentPartPartition,
    right: &CurrentPartPartition,
) -> Result<bool, ReceivedError> {
    Ok(left.received_at == right.received_at
        && left.received_order == right.received_order
        && left.confirmed_revision == right.confirmed_revision
        && left.revision == right.revision
        && left.check == right.check
        && left.availability.as_ref().map(|value| value.at)
            == right.availability.as_ref().map(|value| value.at)
        && left.times == right.times
        && match (&left.frame_ref, &right.frame_ref) {
            (None, None) => true,
            (Some(left), Some(right)) => same_received_value_reference(left, right)?,
            _ => false,
        })
}
fn merge_partitions(
    input: Vec<CurrentPartPartition>,
) -> Result<Vec<CurrentPartPartition>, ReceivedError> {
    let mut merged: Vec<CurrentPartPartition> = Vec::with_capacity(input.len());
    for mut partition in input {
        let mut found = None;
        for (index, held) in merged.iter().enumerate() {
            if same_partition(held, &partition)? {
                found = Some(index);
                break;
            }
        }
        if let Some(index) = found {
            merged[index].members.append(&mut partition.members);
        } else {
            merged.push(partition);
        }
    }
    Ok(merged)
}
fn stamp(partition: &mut CurrentPartPartition, received: &CurrentReceptionStamp) {
    partition.received_at = received.received_at;
    partition.received_order = received.received_order;
    partition.confirmed_revision = received.confirmed_revision;
    // Spreading an omitted optional stamp field preserves the held frame.
    if let Some(frame) = &received.frame_ref {
        partition.frame_ref = Some(frame.clone());
    }
}
fn track(group: &CurrentReceivedGroup) -> (&str, &str, u64, &str) {
    let grant = &group.received.grant;
    (
        &grant.exposure,
        &grant.channel.id,
        grant.channel.version,
        &grant.channel.digest,
    )
}
fn preflight(
    journal: &mut CurrentJournal,
    state: &ReceptionState,
    observer: &str,
    subject: &str,
    content: bool,
    extra: usize,
) -> Result<(), ReceivedError> {
    let mut bytes = extra;
    if let Some(contact) = owner(state, observer)?.current.get(subject) {
        // Each covered partition can split into two masks; the projection,
        // selected-mask copy and coalescing buffer coexist. The journal funds
        // its separate before-image. No observation/body payload is cloned.
        bytes = bytes
            .checked_add(
                super::current_journal::contact_copy_heap(contact)?
                    .checked_mul(4)
                    .ok_or_else(capacity)?,
            )
            .ok_or_else(capacity)?;
        if content {
            for group in &contact.content.groups {
                bytes = bytes
                    .checked_add(received_content_copy_bytes(&group.received)?)
                    .ok_or_else(capacity)?;
            }
        }
    }
    journal.reserve_growth(bytes)
}
fn covered_partitions(
    group: &CurrentReceivedGroup,
    selected: impl Fn(&(String, CurrentReceivedPart)) -> bool,
    mut change: impl FnMut(&CurrentPartPartition) -> Result<Option<CurrentPartPartition>, ReceivedError>,
) -> Result<Option<Vec<CurrentPartPartition>>, ReceivedError> {
    let mut changed = false;
    let mut metadata =
        Vec::with_capacity(group.metadata.len().checked_mul(2).ok_or_else(capacity)?);
    for partition in &group.metadata {
        let covered: Vec<_> = partition
            .members
            .iter()
            .filter(|member| selected(member))
            .cloned()
            .collect();
        if covered.is_empty() {
            metadata.push(partition.clone());
            continue;
        }
        if covered.len() == partition.members.len() {
            if let Some(next) = change(partition)? {
                metadata.push(next);
                changed = true;
            } else {
                metadata.push(partition.clone());
            }
        } else {
            let mut remainder = partition.clone();
            remainder.members = partition
                .members
                .iter()
                .filter(|member| !selected(member))
                .cloned()
                .collect();
            metadata.push(remainder);
            let mut part = partition.clone();
            part.members = covered;
            metadata.push(change(&part)?.unwrap_or(part));
            // Source moves the selected mask behind its remainder even when
            // its clocks are unchanged; coalescing must retain that order.
            changed = true;
        }
    }
    if changed {
        Ok(Some(merge_partitions(metadata)?))
    } else {
        Ok(None)
    }
}
fn recording_members(
    mark: &TemporalCurrentGroupCheckpoint,
    members: Vec<crate::received::CurrentMemberPart>,
) -> TemporalCurrentGroupCheckpoint {
    let mut selected = mark.clone();
    selected.content.retain(|part| {
        members
            .iter()
            .any(|member| member.kind == part.kind && member.part == part.part)
    });
    selected.members = members;
    selected
}
fn set_metadata_groups(
    journal: &mut CurrentJournal,
    state: &mut ReceptionState,
    observer: &str,
    subject: &str,
    groups: Vec<CurrentReceivedGroup>,
) -> Result<(), ReceivedError> {
    let contact = journal
        .contact_mut(state, observer, subject)?
        .ok_or_else(invalid)?;
    // Clock/recording changes retain the exact acquired-content byte cache.
    contact.content.groups = groups;
    Ok(())
}

pub(super) fn current_facet_set(
    journal: &mut CurrentJournal,
    state: &mut ReceptionState,
    observer: &str,
    address: CurrentFacetAddress<'_>,
    input: Option<(CurrentFacetInput, CurrentReceptionStamp)>,
) -> Result<(), ReceivedError> {
    let lease = journal.begin_batch(state, observer)?;
    let result = current_facet_set_in_batch(journal, state, observer, address, input)?;
    journal.finish_batch(state, lease)?;
    Ok(result)
}

fn current_facet_set_in_batch(
    journal: &mut CurrentJournal,
    state: &mut ReceptionState,
    observer: &str,
    address: CurrentFacetAddress<'_>,
    input: Option<(CurrentFacetInput, CurrentReceptionStamp)>,
) -> Result<(), ReceivedError> {
    let channel = input
        .as_ref()
        .map(|(input, _)| &input.grant.channel)
        .or(address.channel);
    let extra = input.as_ref().map_or(Ok(0), |(input, received)| {
        heap_sum([
            size_of::<CurrentReceivedGroup>(),
            size_of::<CurrentReceivedContent>(),
            4 * size_of::<usize>(),
            input.field.heap_bytes().ok_or_else(capacity)?,
            input.grant.heap_bytes().ok_or_else(capacity)?,
            input.original.heap_bytes().ok_or_else(capacity)?,
            size_of::<ReceivedObservation>() + 2 * size_of::<usize>(),
            received
                .frame_ref
                .heap_bytes()
                .ok_or_else(capacity)?
                .checked_mul(4)
                .ok_or_else(capacity)?,
            4 * size_of::<CurrentPartPartition>(),
            10 * size_of::<Option<f64>>(),
            address.kind.len().checked_mul(8).ok_or_else(capacity)?,
            input.grant.original.len(),
            map_storage::<String, CurrentStoredField>(1).ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)
    })?;
    preflight(journal, state, observer, address.subject_id, false, extra)?;
    if let (Some((input, received)), Some(contact)) = (
        input.as_ref(),
        owner(state, observer)?.current.get(address.subject_id),
    ) {
        let mut groups = contact.content.groups.clone();
        let mut same = false;
        let mut changed = false;
        for group in &mut groups {
            if group.received.grant != input.grant
                || group.received.fields.get(address.kind) != Some(&input.field)
            {
                continue;
            }
            same = true;
            if let Some(metadata) = covered_partitions(
                group,
                |(kind, _)| kind == address.kind,
                |partition| {
                    let mut next = partition.clone();
                    stamp(&mut next, received);
                    next.times = CurrentGroupTimes::pack(input.times);
                    next.revision = input.revision;
                    next.availability = input.availability.clone();
                    Ok((!same_partition(&next, partition)?).then_some(next))
                },
            )? {
                group.metadata = metadata;
                changed = true;
            }
        }
        if same {
            if changed {
                set_metadata_groups(journal, state, observer, address.subject_id, groups)?;
            }
            return Ok(());
        }
    }
    if input.is_none()
        && !owner(state, observer)?
            .current
            .contains_key(address.subject_id)
    {
        return Ok(());
    }
    if let Some(contact) = owner(state, observer)?.current.get(address.subject_id) {
        let bytes = contact
            .content
            .groups
            .iter()
            .try_fold(0usize, |sum, group| {
                sum.checked_add(received_content_copy_bytes(&group.received).ok()?)
            })
            .ok_or_else(capacity)?;
        journal.reserve_growth(bytes)?;
    }
    if let Some(channel) = channel {
        let bytes = crate::encoding::json_record_len(&(
            address.kind,
            &channel.id,
            channel.version,
            &channel.digest,
        ))
        .map_err(|_| invalid())?;
        journal.reserve_growth(
            bytes
                .checked_mul(2)
                .and_then(|n| n.checked_add(64))
                .ok_or_else(capacity)?,
        )?;
    }
    let batch = journal.content_batch(observer, address.subject_id)?;
    let identity = channel
        .map(|channel| current_field_identity(address.kind, channel))
        .transpose()?;
    let mut groups = owner(state, observer)?
        .current
        .get(address.subject_id)
        .map_or_else(Vec::new, |contact| contact.content.groups.clone());
    for at in (0..groups.len()).rev() {
        if channel.is_some_and(|channel| &groups[at].received.grant.channel != channel)
            || !groups[at].received.fields.contains_key(address.kind)
        {
            continue;
        }
        let group = &mut groups[at];
        journal.mutable_group(group, &batch)?;
        Arc::make_mut(&mut group.received)
            .fields
            .shift_remove(address.kind);
        if let Some(recordings) = group.recordings.as_mut() {
            let mut kept = Vec::with_capacity(recordings.len());
            for mark in recordings.iter() {
                let members = mark
                    .members
                    .iter()
                    .filter(|member| member.kind != address.kind)
                    .cloned()
                    .collect::<Vec<_>>();
                if !members.is_empty() {
                    kept.push(recording_members(mark, members));
                }
            }
            *recordings = kept;
        }
        let mut metadata = Vec::with_capacity(group.metadata.len());
        for partition in &group.metadata {
            let members = partition
                .members
                .iter()
                .filter(|(kind, _)| kind != address.kind)
                .cloned()
                .collect::<Vec<_>>();
            if !members.is_empty() {
                let mut next = partition.clone();
                next.members = members;
                metadata.push(next);
            }
        }
        group.metadata = metadata;
        if group.received.fields.is_empty() {
            groups.remove(at);
        }
    }
    let order = if let Some(contact) = owner(state, observer)?.current.get(address.subject_id) {
        contact.order
    } else {
        journal.next_contact(state, observer)?
    };
    if !owner(state, observer)?
        .current
        .contains_key(address.subject_id)
    {
        journal.replace_contact(
            state,
            observer,
            address.subject_id,
            Some(CurrentContact {
                encoded_payload: None,
                visual_measurement: None,
                order,
                content: CurrentContactContent {
                    field_order: Vec::new(),
                    originals: IndexMap::new(),
                    groups: Vec::new(),
                },
                sight: None,
            }),
        )?;
    }
    if let Some((input, received)) = input {
        if input.field.value.kind != address.kind || input.grant.subject_id != address.subject_id {
            return Err(invalid());
        }
        let contact = owner(state, observer)?
            .current
            .get(address.subject_id)
            .ok_or_else(invalid)?;
        if contact
            .content
            .originals
            .get(&input.grant.original)
            .is_some_and(|original| **original != *input.original)
        {
            return Err(ReceivedError(
                "A current observation identity has conflicting acquired facts.",
            ));
        }
        let mut partitions = Vec::with_capacity(current_field_parts(&input.field).len());
        for &part in current_field_parts(&input.field) {
            partitions.push(CurrentPartPartition {
                members: vec![(address.kind.to_owned(), part)],
                times: CurrentGroupTimes::pack(input.times),
                revision: input.revision,
                check: member_check(address.kind, part, input.grant.modality),
                availability: input.availability.clone(),
                received_at: received.received_at,
                received_order: received.received_order,
                confirmed_revision: received.confirmed_revision,
                frame_ref: received.frame_ref.clone(),
            });
        }
        let existing = groups
            .iter()
            .position(|group| group.received.grant == input.grant);
        if let Some(index) = existing {
            let group = &mut groups[index];
            journal.mutable_group(group, &batch)?;
            Arc::make_mut(&mut group.received)
                .fields
                .insert(address.kind.to_owned(), input.field);
            group.metadata.extend(partitions);
            group.metadata = merge_partitions(std::mem::take(&mut group.metadata))?;
        } else {
            groups.push(CurrentReceivedGroup {
                recordings: None,
                field_identity: Arc::new(()),
                content_batch: Some(batch.clone()),
                received: Arc::new(CurrentReceivedContent {
                    grant: input.grant.clone(),
                    fields: IndexMap::from([(address.kind.to_owned(), input.field)]),
                }),
                metadata: merge_partitions(partitions)?,
            });
        }
        let contact = journal
            .contact_mut(state, observer, address.subject_id)?
            .ok_or_else(invalid)?;
        contact.invalidate_encoded_content();
        contact
            .content
            .originals
            .entry(input.grant.original)
            .or_insert(input.original);
        let identity = identity.ok_or_else(invalid)?;
        if !contact.content.field_order.contains(&identity) {
            contact.content.field_order.push(identity);
        }
        contact.content.groups = groups;
    } else {
        let contact = journal
            .contact_mut(state, observer, address.subject_id)?
            .ok_or_else(invalid)?;
        contact.invalidate_encoded_content();
        let mut order = Vec::with_capacity(contact.content.field_order.len());
        for field in &contact.content.field_order {
            if identity.as_ref().map_or_else(
                || field_kind(field).map(|kind| kind != address.kind),
                |identity| Ok(field != identity),
            )? {
                order.push(field.clone());
            }
        }
        contact.content.field_order = order;
        contact.content.groups = groups;
    }
    if owner(state, observer)?
        .current
        .get(address.subject_id)
        .is_some_and(|contact| contact.content.groups.is_empty())
    {
        journal.replace_contact(state, observer, address.subject_id, None)?;
    } else {
        let contact = journal
            .contact_mut(state, observer, address.subject_id)?
            .ok_or_else(invalid)?;
        contact.content.originals.retain(|original, _| {
            contact
                .content
                .groups
                .iter()
                .any(|group| &group.received.grant.original == original)
        });
    }
    Ok(())
}

pub(crate) fn current_groups_set_recording(
    journal: &mut CurrentJournal,
    state: &mut ReceptionState,
    observer: &str,
    updates: &[CurrentGroupRecordingUpdate],
) -> Result<(), ReceivedError> {
    let lease = journal.begin_batch(state, observer)?;
    let result = current_groups_set_recording_in_batch(journal, state, observer, updates)?;
    journal.finish_batch(state, lease)?;
    Ok(result)
}

fn current_groups_set_recording_in_batch(
    journal: &mut CurrentJournal,
    state: &mut ReceptionState,
    observer: &str,
    updates: &[CurrentGroupRecordingUpdate],
) -> Result<(), ReceivedError> {
    let count = updates.len();
    journal.reserve_growth(
        heap_sum([
            map_storage::<&str, Vec<&CurrentGroupRecordingUpdate>>(count).ok_or_else(capacity)?,
            count
                .checked_mul(6 * size_of::<&CurrentGroupRecordingUpdate>())
                .ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)?,
    )?;
    let mut by_subject: IndexMap<&str, Vec<&CurrentGroupRecordingUpdate>> =
        IndexMap::with_capacity(count);
    for update in updates {
        by_subject
            .entry(&update.subject_id)
            .or_default()
            .push(update);
    }
    for (subject, changes) in by_subject {
        let Some(contact) = owner(state, observer)?.current.get(subject) else {
            continue;
        };
        let extra = changes
            .iter()
            .try_fold(0usize, |sum, change| {
                sum.checked_add(change.recording.heap_bytes()?.checked_mul(4)?)
            })
            .ok_or_else(capacity)?;
        preflight(journal, state, observer, subject, false, extra)?;
        let mut groups = contact.content.groups.clone();
        let mut changed = false;
        for group in &mut groups {
            for update in &changes {
                if !update.identity.matches(group) {
                    continue;
                }
                let selected = |kind: &str, part: CurrentReceivedPart| {
                    update.members.as_ref().is_none_or(|members| {
                        members
                            .iter()
                            .any(|(held_kind, held_part)| held_kind == kind && *held_part == part)
                    })
                };
                let previous = group.recordings.take().unwrap_or_default();
                let mut remaining =
                    Vec::with_capacity(previous.len() + usize::from(update.recording.is_some()));
                for mark in previous {
                    let members = mark
                        .members
                        .iter()
                        .filter(|member| !selected(&member.kind, member.part))
                        .cloned()
                        .collect::<Vec<_>>();
                    if members.is_empty() {
                        continue;
                    }
                    if members.len() == mark.members.len() {
                        remaining.push(mark);
                    } else {
                        remaining.push(recording_members(&mark, members));
                    }
                }
                if let Some(recording) = &update.recording {
                    remaining.push(recording_members(recording, recording.members.clone()));
                }
                // A matching removal writes an explicitly empty recording list;
                // absence and Some(empty) are different current-format states.
                group.recordings = Some(remaining);
                changed = true;
            }
        }
        if changed {
            set_metadata_groups(journal, state, observer, subject, groups)?;
        }
    }
    Ok(())
}

pub(super) fn materialize_current_checks(
    journal: &mut CurrentJournal,
    state: &mut ReceptionState,
    observer: &str,
    keys: &[CurrentFacetAddress<'_>],
) -> Result<(), ReceivedError> {
    let lease = journal.begin_batch(state, observer)?;
    materialize_current_checks_in_batch(journal, state, observer, keys)?;
    journal.finish_batch(state, lease)
}
fn materialize_current_checks_in_batch(
    journal: &mut CurrentJournal,
    state: &mut ReceptionState,
    observer: &str,
    keys: &[CurrentFacetAddress<'_>],
) -> Result<(), ReceivedError> {
    journal.reserve_growth(
        heap_sum([
            map_storage::<&str, Vec<&CurrentFacetAddress<'_>>>(keys.len()).ok_or_else(capacity)?,
            keys.len()
                .checked_mul(6 * size_of::<&CurrentFacetAddress<'_>>())
                .ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)?,
    )?;
    let mut selected: IndexMap<&str, Vec<&CurrentFacetAddress<'_>>> =
        IndexMap::with_capacity(keys.len());
    for key in keys {
        selected.entry(key.subject_id).or_default().push(key);
    }
    for (subject, fields) in selected {
        preflight(journal, state, observer, subject, false, 0)?;
        let projected = {
            let owner = owner(state, observer)?;
            let Some(contact) = owner.current.get(subject) else {
                continue;
            };
            journal.reserve_growth(
                map_storage::<(&str, &str, u64, &str), ()>(contact.content.groups.len())
                    .ok_or_else(capacity)?,
            )?;
            let mut body_tracks = IndexSet::with_capacity(contact.content.groups.len());
            for group in &contact.content.groups {
                if group.received.fields.contains_key("body")
                    && fields.iter().any(|field| {
                        field.kind == "body"
                            && field
                                .channel
                                .is_none_or(|channel| channel == &group.received.grant.channel)
                    })
                {
                    body_tracks.insert(track(group));
                }
            }
            let mut groups = contact.content.groups.clone();
            let mut changed = false;
            for (index, group) in contact.content.groups.iter().enumerate() {
                let all = body_tracks.contains(&track(group));
                if let Some(metadata) = covered_partitions(
                    group,
                    |(kind, _)| {
                        all || fields.iter().any(|field| {
                            field.kind == kind
                                && field
                                    .channel
                                    .is_none_or(|channel| channel == &group.received.grant.channel)
                        })
                    },
                    |partition| match effective_current_partition(owner, group, partition, true)? {
                        std::borrow::Cow::Borrowed(_) => Ok(None),
                        std::borrow::Cow::Owned(partition) => Ok(Some(partition)),
                    },
                )? {
                    groups[index].metadata = metadata;
                    changed = true;
                }
            }
            changed.then_some(groups)
        };
        if let Some(groups) = projected {
            set_metadata_groups(journal, state, observer, subject, groups)?;
        }
    }
    Ok(())
}

pub(crate) fn current_set_unchecked(
    journal: &mut CurrentJournal,
    state: &mut ReceptionState,
    observer: &str,
    coverage: &[CurrentGroupCoverage],
    at: f64,
) -> Result<(), ReceivedError> {
    let lease = journal.begin_batch(state, observer)?;
    let result = current_set_unchecked_in_batch(journal, state, observer, coverage, at)?;
    journal.finish_batch(state, lease)?;
    Ok(result)
}

fn current_set_unchecked_in_batch(
    journal: &mut CurrentJournal,
    state: &mut ReceptionState,
    observer: &str,
    coverage: &[CurrentGroupCoverage],
    at: f64,
) -> Result<(), ReceivedError> {
    let input_bytes = coverage
        .iter()
        .try_fold(0usize, |sum, input| {
            sum.checked_add(input.kinds.heap_bytes()?)
        })
        .ok_or_else(capacity)?;
    journal.reserve_growth(
        heap_sum([
            input_bytes.checked_mul(2).ok_or_else(capacity)?,
            map_storage::<&str, IndexMap<CurrentGroupIdentity, Option<IndexSet<String>>>>(
                coverage.len(),
            )
            .ok_or_else(capacity)?,
            coverage
                .len()
                .checked_mul(
                    map_storage::<CurrentGroupIdentity, Option<IndexSet<String>>>(1)
                        .ok_or_else(capacity)?,
                )
                .ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)?,
    )?;
    let mut by_subject: IndexMap<&str, IndexMap<CurrentGroupIdentity, Option<IndexSet<String>>>> =
        IndexMap::with_capacity(coverage.len());
    for input in coverage {
        let fields = by_subject.entry(&input.subject_id).or_default();
        if let Some(prior) = fields.get_mut(&input.identity) {
            if let (Some(prior), Some(kinds)) = (prior.as_mut(), input.kinds.as_ref()) {
                prior.extend(kinds.iter().cloned());
            } else {
                *prior = None;
            }
        } else {
            fields.insert(input.identity.clone(), input.kinds.clone());
        }
    }
    for (subject, masks) in by_subject {
        preflight(journal, state, observer, subject, false, 0)?;
        let projected = {
            let owner = owner(state, observer)?;
            let Some(contact) = owner.current.get(subject) else {
                continue;
            };
            journal.reserve_growth(
                map_storage::<(&str, &str, u64, &str), ()>(contact.content.groups.len())
                    .ok_or_else(capacity)?,
            )?;
            let mut body_tracks = IndexSet::with_capacity(contact.content.groups.len());
            for group in &contact.content.groups {
                let Some(kinds) = masks.get(&CurrentGroupIdentity::of(group)) else {
                    continue;
                };
                if kinds.as_ref().is_some_and(|kinds| !kinds.contains("body")) {
                    continue;
                }
                let Some(body) = current_group_metadata(group, "body", None) else {
                    continue;
                };
                if body.availability.is_some()
                    || at
                        < effective_current_partition(owner, group, body, false)?
                            .times
                            .expanded()
                            .confirmed_through
                {
                    continue;
                }
                body_tracks.insert(track(group));
            }
            let mut groups = contact.content.groups.clone();
            let mut changed = false;
            for (index, original) in contact.content.groups.iter().enumerate() {
                let identity = CurrentGroupIdentity::of(original);
                let selected = masks.contains_key(&identity);
                let kinds = masks.get(&identity).and_then(Option::as_ref);
                if body_tracks.contains(&track(original)) {
                    if let Some(metadata) = covered_partitions(
                        original,
                        |(kind, _)| !selected || kinds.is_some_and(|kinds| !kinds.contains(kind)),
                        |partition| match effective_current_partition(
                            owner, original, partition, true,
                        )? {
                            std::borrow::Cow::Borrowed(_) => Ok(None),
                            std::borrow::Cow::Owned(partition) => Ok(Some(partition)),
                        },
                    )? {
                        groups[index].metadata = metadata;
                        changed = true;
                    }
                }
                if !selected {
                    continue;
                }
                if let Some(metadata) = covered_partitions(
                    &groups[index],
                    |(kind, _)| kinds.is_none_or(|kinds| kinds.contains(kind)),
                    |partition| {
                        let effective =
                            effective_current_partition(owner, original, partition, true)?;
                        if at < effective.times.expanded().confirmed_through
                            || partition
                                .availability
                                .as_ref()
                                .is_some_and(|availability| availability.at <= at)
                        {
                            return Ok(None);
                        }
                        let mut next = effective.into_owned();
                        next.availability = Some(CurrentAvailability {
                            state: CurrentAvailabilityState::Unchecked,
                            at,
                        });
                        Ok(Some(next))
                    },
                )? {
                    groups[index].metadata = metadata;
                    changed = true;
                }
            }
            changed.then_some(groups)
        };
        if let Some(groups) = projected {
            set_metadata_groups(journal, state, observer, subject, groups)?;
        }
    }
    Ok(())
}

pub(crate) fn current_confirm_groups(
    journal: &mut CurrentJournal,
    state: &mut ReceptionState,
    observer: &str,
    subject: &str,
    channel: &DefinitionPin,
    through: f64,
    received: &CurrentReceptionStamp,
    scopes: Option<&[CurrentCheck]>,
    exposures: Option<&IndexSet<String>>,
    kinds: Option<&IndexSet<String>>,
) -> Result<Vec<CurrentGroupSelection>, ReceivedError> {
    let lease = journal.begin_batch(state, observer)?;
    let result = current_confirm_groups_in_batch(
        journal, state, observer, subject, channel, through, received, scopes, exposures, kinds,
    )?;
    journal.finish_batch(state, lease)?;
    Ok(result)
}

fn current_confirm_groups_in_batch(
    journal: &mut CurrentJournal,
    state: &mut ReceptionState,
    observer: &str,
    subject: &str,
    channel: &DefinitionPin,
    through: f64,
    received: &CurrentReceptionStamp,
    scopes: Option<&[CurrentCheck]>,
    exposures: Option<&IndexSet<String>>,
    kinds: Option<&IndexSet<String>>,
) -> Result<Vec<CurrentGroupSelection>, ReceivedError> {
    preflight(
        journal,
        state,
        observer,
        subject,
        false,
        received
            .frame_ref
            .heap_bytes()
            .ok_or_else(capacity)?
            .checked_mul(4)
            .ok_or_else(capacity)?,
    )?;
    let Some(contact) = owner(state, observer)?.current.get(subject) else {
        return Ok(Vec::new());
    };
    let maximum = contact
        .content
        .groups
        .iter()
        .try_fold(0usize, |sum, group| sum.checked_add(group.metadata.len()))
        .ok_or_else(capacity)?;
    journal.reserve_growth(
        maximum
            .checked_mul(
                size_of::<CurrentGroupSelection>() * 2
                    + received.frame_ref.heap_bytes().ok_or_else(capacity)?,
            )
            .ok_or_else(capacity)?,
    )?;
    let mut checked = Vec::with_capacity(maximum);
    let mut groups = contact.content.groups.clone();
    let mut changed = false;
    for (index, original) in contact.content.groups.iter().enumerate() {
        if &original.received.grant.channel != channel
            || exposures
                .is_some_and(|exposures| !exposures.contains(&original.received.grant.exposure))
        {
            continue;
        }
        let mut partitions = Vec::with_capacity(original.metadata.len());
        if let Some(metadata) = covered_partitions(
            original,
            |(kind, part)| {
                *part != CurrentReceivedPart::Pose && kinds.is_none_or(|kinds| kinds.contains(kind))
            },
            |partition| {
                let times = partition.times.expanded();
                if scopes.is_some_and(|scopes| !scopes.contains(&partition.check))
                    || through < times.confirmed_through
                    || partition
                        .availability
                        .as_ref()
                        .is_some_and(|availability| through < availability.at)
                {
                    return Ok(None);
                }
                let update = times.confirmed_through < through
                    || partition.availability.is_some()
                    || partition.confirmed_revision < received.confirmed_revision;
                let mut next = partition.clone();
                if update {
                    stamp(&mut next, received);
                    let mut times = times;
                    if partition.availability.is_some() {
                        times.confirmed_from = through;
                    }
                    times.confirmed_through = through;
                    next.times = CurrentGroupTimes::pack(times);
                    next.availability = None;
                }
                partitions.push(next.clone());
                Ok(update.then_some(next))
            },
        )? {
            groups[index].metadata = metadata;
            changed = true;
        }
        for partition in partitions {
            let actual = groups[index]
                .metadata
                .iter()
                .find(|held| {
                    held.members
                        .iter()
                        .any(|member| partition.members.contains(member))
                })
                .ok_or_else(invalid)?;
            let mut selected = actual.clone();
            if actual.members.len() != partition.members.len() {
                selected.members = partition.members;
            }
            checked.push(CurrentGroupSelection {
                identity: CurrentGroupIdentity::of(&groups[index]),
                partition: selected,
            });
        }
    }
    if changed {
        set_metadata_groups(journal, state, observer, subject, groups)?;
    }
    Ok(checked)
}
