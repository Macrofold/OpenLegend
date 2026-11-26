//! Remove recording reservations for the exact independently revoked members.
//! The receiver applies these proposals through its sole current journal before
//! the selected world's recent-identity prune may continue.

use super::*;
use crate::received::TemporalFacetRevocation;
use crate::reception::current_group_native_facet;

pub(crate) struct CurrentRecordingRevocation {
    pub updates: Vec<CurrentGroupRecordingUpdate>,
    pub refund: u64,
    _reservation: ByteReservation,
}
pub(crate) fn plan_current_recording_revocation(
    owner: Option<&PerceptionEvidenceOwner>,
    values: &impl crate::reception::ReceivedValueLookup,
    revoked: &TemporalFacetRevocation<'_>,
    meaning: &dyn TemporalValueMeaning,
    budget: &ByteBudget,
) -> Result<CurrentRecordingRevocation, ReceivedError> {
    let mut bytes = size_of::<CurrentRecordingRevocation>();
    for (subject, contact) in owner.into_iter().flat_map(|owner| owner.current.iter()) {
        for group in &contact.content.groups {
            for mark in group.recordings.iter().flatten() {
                bytes = heap_sum([
                    bytes,
                    subject.len(),
                    size_of::<CurrentGroupRecordingUpdate>(),
                    mark.heap_bytes().ok_or_else(capacity)?,
                    group.metadata.heap_bytes().ok_or_else(capacity)?,
                    group.received.heap_bytes().ok_or_else(capacity)?,
                ])
                .ok_or_else(capacity)?;
                for member in &mark.members {
                    if let Some(field) = group.received.fields.get(&member.kind) {
                        if let Some(value) = values.value_at(&field.value.reference) {
                            bytes = bytes
                                .checked_add(value.heap_bytes().ok_or_else(capacity)?)
                                .ok_or_else(capacity)?;
                        }
                    }
                }
            }
        }
    }
    let reservation = budget
        .reserve(bytes.checked_mul(6).ok_or_else(capacity)?)
        .map_err(|_| capacity())?;
    let mut updates = Vec::new();
    let mut refund = 0u64;
    if let Some(owner) = owner {
        for (subject, contact) in &owner.current {
            for group in &contact.content.groups {
                let Some(original) = contact
                    .content
                    .originals
                    .get(&group.received.grant.original)
                else {
                    continue;
                };
                for mark in group.recordings.iter().flatten() {
                    let mut members = Vec::new();
                    members
                        .try_reserve_exact(mark.members.len())
                        .map_err(|_| capacity())?;
                    for member in &mark.members {
                        let Some(native) =
                            current_group_native_facet(group, original, &member.kind, None)
                        else {
                            // Source removes a mark whose current field vanished.
                            members.push((member.kind.clone(), member.part));
                            continue;
                        };
                        let input = projection::native_facet_input(owner, values, native)?;
                        let field = TemporalFacetReference {
                            clock: input.clock,
                            member_index: 0,
                            value_ref: input.preferred.ok_or_else(error)?,
                            track: input.track,
                            original: input.original,
                            received_from: input.received_from,
                            support: input.support,
                            detail_support: input.detail_support,
                            pose_frame: input.pose_frame,
                            reception: input.reception,
                        };
                        if revoked.revokes("current", &field, values, meaning)? {
                            members.push((member.kind.clone(), member.part));
                        }
                    }
                    if !members.is_empty() {
                        if !mark.gap {
                            refund = refund
                                .checked_add(
                                    mark.terminal_bytes
                                        .checked_mul(members.len() as u64)
                                        .ok_or_else(capacity)?,
                                )
                                .filter(|n| *n <= MAX_SAFE_INTEGER)
                                .ok_or_else(capacity)?;
                        }
                        updates.push(CurrentGroupRecordingUpdate {
                            subject_id: subject.clone(),
                            identity: CurrentGroupIdentity::of(group),
                            members: Some(members),
                            recording: None,
                        });
                    }
                }
            }
        }
    }
    Ok(CurrentRecordingRevocation {
        updates,
        refund,
        _reservation: reservation,
    })
}
