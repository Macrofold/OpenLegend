//! Current contact's acquired content and fresh checks have separate SQL
//! columns. Joining them never loses an unknown field before validation.

use super::{
    CurrentContact, CurrentContactContent, CurrentPartPartition, CurrentReceivedContent,
    CurrentReceivedGroup, CurrentSightCheck, ReceivedObservation,
};
use crate::received::{ReceivedError, TemporalCurrentGroupCheckpoint};
use crate::values::{deserialize_present_option, deserialize_safe_integer};
use indexmap::IndexMap;
use serde::ser::SerializeSeq;
use serde::{Deserialize, Serialize, Serializer};
use std::sync::Arc;

fn invalid() -> ReceivedError {
    ReceivedError("Invalid current-contact storage partition.")
}

#[derive(Serialize)]
struct Payload<'a> {
    order: u64,
    content: PayloadContent<'a>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PayloadContent<'a> {
    field_order: &'a [String],
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    originals: &'a IndexMap<String, Arc<ReceivedObservation>>,
    groups: PayloadGroups<'a>,
}
struct PayloadGroups<'a>(&'a [CurrentReceivedGroup]);
impl Serialize for PayloadGroups<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        #[derive(Serialize)]
        struct Group<'a> {
            received: &'a CurrentReceivedContent,
        }
        let mut seq = serializer.serialize_seq(Some(self.0.len()))?;
        for group in self.0 {
            seq.serialize_element(&Group {
                received: &group.received,
            })?;
        }
        seq.end()
    }
}
#[derive(Serialize)]
struct Metadata<'a> {
    #[serde(skip_serializing_if = "Option::is_none")]
    sight: Option<&'a CurrentSightCheck>,
    groups: MetadataGroups<'a>,
}
struct MetadataGroups<'a>(&'a [CurrentReceivedGroup]);
impl Serialize for MetadataGroups<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        #[derive(Serialize)]
        struct Group<'a> {
            metadata: &'a [CurrentPartPartition],
            #[serde(skip_serializing_if = "Option::is_none")]
            recordings: Option<&'a [TemporalCurrentGroupCheckpoint]>,
        }
        let mut seq = serializer.serialize_seq(Some(self.0.len()))?;
        for group in self.0 {
            seq.serialize_element(&Group {
                metadata: &group.metadata,
                recordings: group.recordings.as_deref(),
            })?;
        }
        seq.end()
    }
}

/// Counts encoded storage without retaining a second body. The save owner
/// reserves codecs and reference products before allocating either of them.
pub(crate) fn current_contact_storage_bytes(
    contact: &CurrentContact,
) -> Result<usize, ReceivedError> {
    let payload = if let Some(encoded) = &contact.encoded_payload {
        encoded.len()
    } else {
        crate::encoding::json_record_len(&Payload {
            order: contact.order,
            content: PayloadContent {
                field_order: &contact.content.field_order,
                originals: &contact.content.originals,
                groups: PayloadGroups(&contact.content.groups),
            },
        })
        .map_err(|_| invalid())?
    };
    let metadata = crate::encoding::json_record_len(&Metadata {
        sight: contact.sight.as_ref(),
        groups: MetadataGroups(&contact.content.groups),
    })
    .map_err(|_| invalid())?;
    payload.checked_add(metadata).ok_or_else(invalid)
}

pub fn encode_current_contact_payload(contact: &CurrentContact) -> Result<String, ReceivedError> {
    if let Some(encoded) = &contact.encoded_payload {
        return Ok(encoded.to_string());
    }
    crate::encoding::json_record(&Payload {
        order: contact.order,
        content: PayloadContent {
            field_order: &contact.content.field_order,
            originals: &contact.content.originals,
            groups: PayloadGroups(&contact.content.groups),
        },
    })
    .map_err(|_| invalid())
}
pub fn encode_current_contact_metadata(contact: &CurrentContact) -> Result<String, ReceivedError> {
    crate::encoding::json_record(&Metadata {
        sight: contact.sight.as_ref(),
        groups: MetadataGroups(&contact.content.groups),
    })
    .map_err(|_| invalid())
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct StoredPayload {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    order: u64,
    content: StoredContent,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct StoredContent {
    field_order: Vec<String>,
    originals: IndexMap<String, Arc<ReceivedObservation>>,
    groups: Vec<StoredGroup>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct StoredGroup {
    received: Arc<CurrentReceivedContent>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct StoredMetadata {
    #[serde(default, deserialize_with = "deserialize_present_option")]
    sight: Option<CurrentSightCheck>,
    groups: Vec<StoredGroupMetadata>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct StoredGroupMetadata {
    metadata: Vec<CurrentPartPartition>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    recordings: Option<Vec<TemporalCurrentGroupCheckpoint>>,
}

/// This structural join precedes the owning receiver's cross-record semantic
/// checks. Unknown extensions and mismatched group membership fail here.
pub fn decode_current_contact_storage(
    payload: &str,
    metadata: &str,
) -> Result<CurrentContact, ReceivedError> {
    let body: StoredPayload = serde_json::from_str(payload).map_err(|_| invalid())?;
    let times: StoredMetadata = serde_json::from_str(metadata).map_err(|_| invalid())?;
    if body.content.groups.len() != times.groups.len() {
        return Err(invalid());
    }
    Ok(CurrentContact {
        metadata_storage: None,
        encoded_payload: Some(super::current_residency::CurrentPayload::decoded(payload)),
        visual_measurement: None,
        order: body.order,
        content: CurrentContactContent {
            field_order: body.content.field_order,
            originals: body.content.originals,
            groups: body
                .content
                .groups
                .into_iter()
                .zip(times.groups)
                .map(|(content, metadata)| {
                    CurrentReceivedGroup::installed(
                        content.received,
                        metadata.metadata,
                        metadata.recordings,
                    )
                })
                .collect(),
        },
        sight: times.sight,
    })
}

pub fn received_facet_value_references(
    value: &super::ReceivedFacetValue,
) -> impl Iterator<Item = &str> {
    std::iter::once(&value.reference)
        .chain(match &value.reception {
            Some(super::FacetReception::Body { pose_ref }) => Some(pose_ref),
            Some(super::FacetReception::Location { frame_ref }) => Some(frame_ref),
            None => None,
        })
        .filter_map(|reference| match reference {
            crate::received::ReceivedValueReference::Shared(id) => Some(id.as_str()),
            _ => None,
        })
}
fn shared(reference: &crate::received::ReceivedValueReference) -> Option<&str> {
    match reference {
        crate::received::ReceivedValueReference::Shared(id) => Some(id.as_str()),
        _ => None,
    }
}
fn sorted_unique(mut references: Vec<&str>) -> Vec<&str> {
    references.sort_by(|a, b| crate::encoding::js_string_cmp(a, b));
    references.dedup();
    references
}
/// The same complete shared-value closure as the existing SQL reference owner.
pub fn received_contact_value_references(contact: &CurrentContact) -> Vec<&str> {
    let mut references = Vec::new();
    for source in contact.content.originals.values() {
        references.extend(super::received_observation_value_references(source));
    }
    for group in &contact.content.groups {
        for field in group.received.fields.values() {
            references.extend(received_facet_value_references(&field.value));
        }
        for partition in &group.metadata {
            references.extend(partition.frame_ref.as_ref().and_then(shared));
        }
    }
    for stamp in contact.sight.iter() {
        references.extend(shared(&stamp.frame_ref));
        references.extend(
            stamp
                .detail
                .as_ref()
                .and_then(|stamp| shared(&stamp.frame_ref)),
        );
    }
    sorted_unique(references)
}
pub fn received_owner_value_references(owner: &super::PerceptionEvidenceOwner) -> Vec<&str> {
    received_header_value_references(owner.visual_confirmation.as_ref(), &owner.received)
}
pub(crate) fn received_header_value_references<'a>(
    visual_confirmation: Option<&'a super::VisualConfirmation>,
    received: &'a [Arc<ReceivedObservation>],
) -> Vec<&'a str> {
    let mut references = Vec::new();
    if let Some(phase) = visual_confirmation {
        references.extend(shared(&phase.frame_ref));
        references.extend(
            phase
                .complete
                .as_ref()
                .and_then(|stamp| shared(&stamp.frame_ref)),
        );
    }
    for source in received {
        references.extend(super::received_observation_value_references(source));
    }
    sorted_unique(references)
}

/// The resident reference union reads acquired metadata, never physical truth or
/// materialized personal bodies. Save projection uses this same finite closure.
/// The current capture and canonical residency owners share the exact closure;
/// this visits only one receiver's current groups, phases and motion samples.
pub(crate) fn visit_current_value_references<'a>(
    owner: &'a super::PerceptionEvidenceOwner,
    visit: &mut impl FnMut(&'a str),
) {
    fn reference<'a>(
        value: &'a crate::received::ReceivedValueReference,
        visit: &mut impl FnMut(&'a str),
    ) {
        if let crate::received::ReceivedValueReference::Shared(id) = value {
            visit(id)
        }
    }
    if let Some(phase) = &owner.visual_confirmation {
        reference(&phase.frame_ref, visit);
        if let Some(complete) = &phase.complete {
            reference(&complete.frame_ref, visit)
        }
    }
    for motion in owner.motion_samples.iter().flat_map(IndexMap::values) {
        for id in received_facet_value_references(&motion.earlier.value) {
            visit(id)
        }
    }
    for contact in owner.current.values() {
        for source in contact.content.originals.values() {
            for id in super::received_observation_value_references(source) {
                visit(id)
            }
        }
        for group in &contact.content.groups {
            for field in group.received.fields.values() {
                for id in received_facet_value_references(&field.value) {
                    visit(id)
                }
            }
            for partition in &group.metadata {
                if let Some(frame) = &partition.frame_ref {
                    reference(frame, visit)
                }
            }
        }
        if let Some(sight) = &contact.sight {
            reference(&sight.frame_ref, visit);
            if let Some(detail) = &sight.detail {
                reference(&detail.frame_ref, visit)
            }
        }
    }
}

pub(crate) fn visit_resident_value_references<'a>(
    state: &'a super::ReceptionState,
    visit: &mut impl FnMut(&'a str),
) {
    for owner in state.perception_evidence.iter().flat_map(IndexMap::values) {
        for original in &owner.received {
            for id in super::received_observation_value_references(original) {
                visit(id)
            }
        }
        visit_current_value_references(owner, visit);
    }
}
