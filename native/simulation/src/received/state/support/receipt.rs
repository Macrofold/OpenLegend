//! Keep the exact selected recent receipt, retaining original member coordinates
//! and minimum body reception. This is the same support writer as original
//! fallback capture, not a parallel history store or a new acquisition.

use super::*;
use crate::experience::KnownPlaceMutation;
use crate::experience::personal_fact_alias;
use crate::host::ByteBudget;
use crate::received::{TemporalValueMeaning, select_temporal_receipt_facets};

pub(crate) struct SupportRetentionContext<'a> {
    pub values: &'a ReceivedValues,
    pub meaning: &'a dyn TemporalValueMeaning,
    pub now: f64,
    pub policy: &'a AttentionRetentionPolicy,
    pub meters: &'a mut WorkMeters,
    pub budget: &'a ByteBudget,
    pub places: Option<KnownPlaceMutation<'a>>,
}
impl TemporalState {
    pub(crate) fn retain_receipt_support(
        &mut self,
        locator: &TemporalReceiptLocator,
        member_indices: Option<&BTreeSet<u64>>,
        required: bool,
        limits: &AccountRetentionLimits,
        mut context: SupportRetentionContext<'_>,
    ) -> Result<Option<Arc<TemporalSupportRecord>>, TemporalAppendError> {
        let actor_id = &locator.actor_id;
        let Some(actor) = self.actor(actor_id) else {
            return Ok(None);
        };
        let prior = actor
            .supports()
            .map(|supports| supports.get(&locator.id()))
            .transpose()?
            .flatten()
            .cloned();
        if let Some(prior) = &prior {
            if (prior.capsule().receipt.header.change == TemporalChange::RetainedState
                && member_indices.is_none())
                || member_indices.is_some_and(|indices| {
                    indices.iter().all(|ordinal| {
                        prior
                            .capsule()
                            .receipt
                            .facets
                            .iter()
                            .any(|field| field.member_index == *ordinal)
                    })
                })
            {
                if required
                    && !prior.capsule().required
                    && !self.set_support_required(
                        actor_id,
                        &locator.id(),
                        true,
                        limits,
                        context.values,
                        context.now,
                        context.policy,
                    )?
                {
                    return Ok(None);
                }
                return Ok(self
                    .actor(actor_id)
                    .and_then(|actor| actor.supports())
                    .map(|supports| supports.get(&locator.id()))
                    .transpose()?
                    .flatten()
                    .cloned());
            }
        }
        let Some(captured) =
            self.native_receipt(locator, context.values, context.meaning, context.budget)?
        else {
            return Ok(None);
        };
        if !crate::received::temporal_recent_at(
            captured.receipt().at,
            context.now,
            context.policy.recent.max_age_seconds,
        ) {
            return Ok(None);
        }
        if member_indices.is_some_and(|indices| {
            indices.iter().any(|ordinal| {
                !captured
                    .receipt()
                    .facets
                    .iter()
                    .any(|field| field.member_index == *ordinal)
            })
        }) {
            return Ok(None);
        }
        let selected = member_indices.map(|indices| {
            indices
                .iter()
                .copied()
                .chain(prior.iter().flat_map(|prior| {
                    prior
                        .capsule()
                        .receipt
                        .facets
                        .iter()
                        .map(|field| field.member_index)
                }))
                .collect::<BTreeSet<_>>()
        });
        let (receipt, fragments, _reservation) = captured.into_parts();
        let mut facets = Vec::new();
        let mut kept = Vec::new();
        facets
            .try_reserve_exact(receipt.facets.len())
            .map_err(|_| ReceivedError("Sparse receipt facets capacity exhausted."))?;
        kept.try_reserve_exact(fragments.len())
            .map_err(|_| ReceivedError("Sparse receipt values capacity exhausted."))?;
        for (field, fragment) in receipt.facets.iter().zip(fragments) {
            if selected
                .as_ref()
                .is_none_or(|selected| selected.contains(&field.member_index))
            {
                facets.push(field.clone());
                kept.push(fragment);
            }
        }
        if facets.is_empty() {
            return Ok(None);
        }
        let availability_last = facets.len() != receipt.facets.len();
        let mut selected_receipt =
            select_temporal_receipt_facets(receipt, facets, context.values, context.meaning)?;
        let mut aliases = selected_receipt
            .header
            .source_ids
            .iter()
            .cloned()
            .collect::<indexmap::IndexSet<_>>();
        for field in &selected_receipt.facets {
            aliases.insert(
                personal_fact_alias(&selected_receipt.id, field.member_index)
                    .map_err(|_| invalid())?,
            );
            if let Some(original) = &field.original {
                aliases.insert(original.source.id.clone());
                aliases.insert(
                    personal_fact_alias(&original.source.id, original.ordinal)
                        .map_err(|_| invalid())?,
                );
            }
        }
        selected_receipt.header.source_ids = aliases.into_iter().collect();
        // capture_receipt already replaced shared pose references with their
        // owned exact received pose. Primary fragments keep the same identity.
        let capsule = TemporalSupportCapsule {
            receipt: Arc::new(selected_receipt),
            values: Arc::from(kept),
            bytes: 0,
            required: required || prior.as_ref().is_some_and(|prior| prior.capsule().required),
        };
        self.admit_support(
            actor_id,
            capsule,
            limits,
            context.values,
            context.now,
            context.policy,
            context.meters,
            context.places.take(),
            SupportEncoding::Receipt { availability_last },
        )
    }
}
