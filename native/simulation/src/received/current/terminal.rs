//! Secure one largest supported independent member close before admitting it.
//! String number sentinels are deliberately longer than every finite JS Number
//! spelling; quota reservation never predicts the next physical occurrence.

use super::*;
use serde::Serialize;

#[derive(Serialize)]
struct Gap<'a> {
    from: &'a str,
    through: &'a str,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Envelope<'a> {
    actor_id: &'a str,
    physical_life: u64,
    epoch: &'a str,
    batch_order: u64,
    entry_index: u64,
    id: String,
    at: &'a str,
    order: u64,
    acquisition: u64,
    subject: &'a str,
    change: TemporalChange,
    availability_at: &'a str,
    coverage_gap: Gap<'a>,
    ended_fields: [(&'a str, CurrentReceivedPart); 1],
    spatial_context: bool,
    required: bool,
    source_ids: [(); 0],
    facets: [(); 0],
}
pub(crate) fn terminal_member_bytes(
    actor_id: &str,
    epoch: &str,
    subject: &str,
    members: &[(String, CurrentReceivedPart)],
) -> Result<u64, ReceivedError> {
    let mut largest = ("", CurrentReceivedPart::Detail);
    let mut largest_bytes = 0;
    for (kind, part) in members {
        let bytes = crate::encoding::json_record_len(&(kind, part))
            .map_err(|_| ReceivedError("Terminal member encoding failed."))?;
        if bytes > largest_bytes {
            largest = (kind.as_str(), *part);
            largest_bytes = bytes;
        }
    }
    let ordinal = crate::identity::MAX_SAFE_INTEGER;
    let id = TemporalReceiptLocator {
        actor_id: actor_id.to_owned(),
        physical_life: ordinal,
        epoch: epoch.to_owned(),
        batch_order: ordinal,
        entry_index: ordinal,
    }
    .id();
    let number = "99999999999999999999999999999999";
    crate::encoding::json_record_len(&Envelope {
        actor_id,
        physical_life: ordinal,
        epoch,
        batch_order: ordinal,
        entry_index: ordinal,
        id,
        at: number,
        order: ordinal,
        acquisition: ordinal,
        subject,
        change: TemporalChange::AttentionExit,
        availability_at: number,
        coverage_gap: Gap {
            from: number,
            through: number,
        },
        ended_fields: [largest],
        spatial_context: true,
        required: false,
        source_ids: [],
        facets: [],
    })
    .map(|bytes| bytes as u64)
    .map_err(|_| ReceivedError("Terminal reservation encoding failed."))
}
