//! Size only the identifiers actually visited by the receipt alias factory.
//! Large quoted/body values are borrowed and do not become alias allocations.
use super::*;
use crate::host::retained_size::{heap_sum, map_storage};
use crate::reception::{ObservationFactKey, SensoryFacet};
use std::mem::size_of;

#[derive(Clone, Copy)]
pub struct DependencyAliasAllocation {
    pub items: usize,
    pub strings: usize,
    pub temporary: usize,
}
impl DependencyAliasAllocation {
    pub(crate) fn empty() -> Self {
        Self {
            items: 0,
            strings: 0,
            temporary: 0,
        }
    }
    fn text(&mut self, bytes: usize) -> Option<()> {
        self.items = self.items.checked_add(1)?;
        // A growing JSON writer may retain up to twice its encoded length.
        self.strings = self.strings.checked_add(bytes.checked_mul(2)?)?;
        Some(())
    }
    fn fact(&mut self, key: &ObservationFactKey) -> Option<()> {
        self.text(key.source.id.len())?;
        self.text(
            crate::encoding::json_record_len(&("perception-fact", &key.source.id, key.ordinal))
                .ok()?,
        )
    }
    fn combine(&mut self, other: Self) -> Option<()> {
        self.items = self.items.checked_add(other.items)?;
        self.strings = self.strings.checked_add(other.strings)?;
        self.temporary = self.temporary.max(other.temporary);
        Some(())
    }
    fn map_and_vector(&self) -> Option<usize> {
        if self.items == 0 {
            return Some(0);
        }
        heap_sum([
            map_storage::<String, ()>(self.items.checked_mul(2)?.max(3))?,
            self.items.checked_mul(size_of::<String>())?,
        ])
    }
    pub(crate) fn bytes(&self) -> Option<usize> {
        heap_sum([self.strings, self.map_and_vector()?, self.temporary])
    }
}
/// The caller holds the same complete fragments later passed to the alias
/// visitor. No shared value lookup or evidence acquisition happens here.
pub(crate) fn temporal_receipt_aliases_bound(
    receipt: &TemporalReceipt,
    fragments: &[ReceivedValueFragment],
    meaning: &dyn TemporalValueMeaning,
) -> Option<usize> {
    if receipt.facets.len() != fragments.len() {
        return None;
    }
    receipt_aliases_bound(receipt, meaning, |index, _| fragments.get(index))
}
pub(super) fn temporal_receipt_lookup_aliases_bound(
    receipt: &TemporalReceipt,
    values: &impl crate::reception::ReceivedValueLookup,
    meaning: &dyn TemporalValueMeaning,
) -> Option<usize> {
    receipt_aliases_bound(receipt, meaning, |_, field| {
        values.value_at(&field.value_ref)
    })
}
fn receipt_aliases_bound<'a>(
    receipt: &'a TemporalReceipt,
    meaning: &dyn TemporalValueMeaning,
    fragment: impl Fn(usize, &'a TemporalFacetReference) -> Option<&'a ReceivedValueFragment>,
) -> Option<usize> {
    let mut total = DependencyAliasAllocation::empty();
    for id in &receipt.header.source_ids {
        total.text(id.len())?;
    }
    total.text(receipt.id.len())?;
    for (index, field) in receipt.facets.iter().enumerate() {
        let fragment = fragment(index, field)?;
        total.text(
            crate::encoding::json_record_len(&("perception-fact", &receipt.id, field.member_index))
                .ok()?,
        )?;
        if let Some(original) = &field.original {
            total.fact(original)?;
        }
        for proof in field
            .support
            .iter()
            .chain(field.detail_support.iter().map(|d| &d.proof))
        {
            total.fact(&proof.original)?;
            total.text(proof.confirmation.id.len())?;
            for id in proof.aliases.iter().flatten() {
                total.text(id.len())?;
            }
        }
        if let Some(source) = &field.received_from {
            total.text(source.id.len())?;
        }
        let mut inner = DependencyAliasAllocation::empty();
        match fragment {
            ReceivedValueFragment::Sensory(SensoryFacet::Association {
                learning_support, ..
            }) => {
                inner = meaning.recognition_support_allocation_bound(
                    learning_support.as_deref().unwrap_or(&[]),
                )?;
            }
            ReceivedValueFragment::Sensory(SensoryFacet::Claim {
                support,
                support_aliases,
                ..
            }) => {
                for key in support {
                    inner.fact(key)?;
                }
                if !support.is_empty() {
                    for alias in support_aliases.iter().flatten() {
                        inner.text(alias.id.len())?;
                    }
                }
            }
            ReceivedValueFragment::Sensory(SensoryFacet::PhysicalBoundary { boundary }) => {
                inner.fact(&boundary.near_surface.support)?;
                inner.fact(&boundary.far_surface.support)?;
            }
            _ => {}
        }
        // The inner dependency visitor briefly owns its map and returned Vec
        // before transferring actual strings into the outer receipt set.
        inner.temporary = inner.temporary.checked_add(inner.map_and_vector()?)?;
        total.combine(inner)?;
    }
    total.bytes()
}
