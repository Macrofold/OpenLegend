//! Authored bundled gift wording shared with the TypeScript world.
use serde::Deserialize;
use std::sync::LazyLock;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GiftCopy {
    pub candidate_lots: usize,
    pub nearest_proposal_recipients: usize,
    pub resident_proposal_lots: usize,
    pub resident_proposals: usize,
    pub gift_description: &'static str,
    pub counter_description: &'static str,
    pub changed: &'static str,
    pub reciprocal_separator: &'static str,
    pub reciprocal_unavailable: &'static str,
    pub reciprocal_accepted: &'static str,
    pub gift_unavailable: &'static str,
    pub choose_person: &'static str,
    pub cannot_take: &'static str,
    pub offer_reach: &'static str,
    pub mutual_sight: &'static str,
    pub accept_reach: &'static str,
    pub own_possessions: &'static str,
    pub review_item: &'static str,
    pub not_portable: &'static str,
    pub quantity: &'static str,
    pub whole_object: &'static str,
    pub access_granted: &'static str,
    pub duplicate_item: &'static str,
    pub already_offered: &'static str,
    pub unavailable: &'static str,
    pub expired: &'static str,
    pub declined: &'static str,
    pub withdrawn: &'static str,
    pub own_ending: &'static str,
    pub own_ending_receipt: &'static str,
    pub witness_exchange: &'static str,
    pub participant_exchange: &'static str,
    pub deadline: &'static str,
    pub lapsed: &'static str,
    pub proposed: &'static str,
    pub accepted: &'static str,
    pub no_transfer: &'static str,
    pub reply_accept_gift: &'static str,
    pub reply_decline_gift: &'static str,
    pub reply_accept_trade: &'static str,
    pub reply_decline_trade: &'static str,
    pub reply_during_work: &'static str,
    pub decision: &'static str,
}
pub(crate) static GIFT_COPY: LazyLock<GiftCopy> = LazyLock::new(|| {
    serde_json::from_str(include_str!("../handover-copy.json")).expect("bundled gift wording")
});
