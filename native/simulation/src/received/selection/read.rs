//! Expanded read values already contain their personal reception. Borrow the
//! remaining receipt fields without copying that reception into the wire twice.
use super::*;
use serde::{Serialize, Serializer, ser::SerializeSeq};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct ReceiptRead<'a> {
    #[serde(flatten)]
    header: &'a ReceivedReceiptHeader,
    #[serde(flatten)]
    locator: &'a TemporalReceiptLocator,
    id: &'a str,
    at: f64,
    order: u64,
    required: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    receiver_frame: Option<&'a crate::reception::ObservationFrame>,
    #[serde(skip_serializing_if = "Option::is_none")]
    origin: Option<&'a ObservationOrigin>,
    facets: Facets<'a>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Facet<'a> {
    #[serde(flatten)]
    clock: &'a ReceivedFieldClock,
    member_index: u64,
    value_ref: &'a ReceivedValueReference,
    #[serde(skip_serializing_if = "Option::is_none")]
    track: Option<&'a String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    original: Option<&'a ObservationFactKey>,
    #[serde(skip_serializing_if = "Option::is_none")]
    received_from: Option<&'a EvidenceSource>,
    #[serde(skip_serializing_if = "Option::is_none")]
    support: Option<&'a crate::reception::ReceivedFacetProof>,
    #[serde(skip_serializing_if = "Option::is_none")]
    detail_support: Option<&'a TemporalDetailSupport>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pose_frame: Option<&'a crate::reception::ObservationFrame>,
}
struct Facets<'a>(&'a [TemporalFacetReference]);
impl Serialize for Facets<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut out = serializer.serialize_seq(Some(self.0.len()))?;
        for field in self.0 {
            out.serialize_element(&Facet {
                clock: &field.clock,
                member_index: field.member_index,
                value_ref: &field.value_ref,
                track: field.track.as_ref(),
                original: field.original.as_ref(),
                received_from: field.received_from.as_ref(),
                support: field.support.as_ref(),
                detail_support: field.detail_support.as_ref(),
                pose_frame: field.pose_frame.as_ref(),
            })?;
        }
        out.end()
    }
}
pub(super) fn receipt_read(receipt: &TemporalReceipt) -> ReceiptRead<'_> {
    ReceiptRead {
        header: &receipt.header,
        locator: &receipt.locator,
        id: &receipt.id,
        at: receipt.at,
        order: receipt.order,
        required: receipt.required,
        receiver_frame: receipt.receiver_frame.as_ref(),
        origin: receipt.origin.as_ref(),
        facets: Facets(&receipt.facets),
    }
}
