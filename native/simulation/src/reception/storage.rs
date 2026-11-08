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
    received: CurrentReceivedContent,
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
        encoded_payload: Some(Arc::from(payload)),
        order: body.order,
        content: CurrentContactContent {
            field_order: body.content.field_order,
            originals: body.content.originals,
            groups: body
                .content
                .groups
                .into_iter()
                .zip(times.groups)
                .map(|(content, metadata)| CurrentReceivedGroup {
                    received: content.received,
                    metadata: metadata.metadata,
                    recordings: metadata.recordings,
                })
                .collect(),
        },
        sight: times.sight,
    })
}
