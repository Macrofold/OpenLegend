//! Whole-account edit aliases use compact canonical rows and selected support.
//! A field's dependency never becomes a bidirectional account alias: revoking
//! one measured fact must preserve independently received sibling fields.

use super::*;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::{
    ReceivedBatch, ReceivedEntry, ReceivedValues, TemporalValueMeaning,
    received_record_account_aliases, temporal_receipt_account_aliases,
};
use indexmap::IndexSet;
use std::mem::size_of;

pub(crate) struct TemporalAccountAliases {
    groups: Vec<Vec<String>>,
    by_alias: IndexMap<String, Vec<usize>>,
    reservation: ByteReservation,
}
fn invalid() -> ReceivedError {
    ReceivedError(
        "Privacy aliases require complete original received ownership and byte allowance.",
    )
}
fn scratch(names: &[String], budget: &ByteBudget) -> Result<ByteReservation, ReceivedError> {
    let bytes = names
        .iter()
        .try_fold(0usize, |sum, name| sum.checked_add(name.len()))
        .and_then(|bytes| bytes.checked_mul(4))
        .and_then(|bytes| bytes.checked_add(names.len().checked_mul(size_of::<String>() * 3)?))
        .and_then(|bytes| {
            bytes.checked_add(map_storage::<String, ()>(names.len())?.checked_mul(3)?)
        })
        .ok_or_else(invalid)?;
    budget.reserve(bytes).map_err(|_| invalid())
}
impl TemporalAccountAliases {
    fn add(&mut self, id: String, aliases: Vec<&str>) -> Result<(), ReceivedError> {
        let mut group = Vec::new();
        group
            .try_reserve_exact(aliases.len() + 1)
            .map_err(|_| invalid())?;
        group.push(id);
        group.extend(aliases.into_iter().map(str::to_owned));
        let index = self.groups.len();
        for alias in &group {
            self.by_alias.entry(alias.clone()).or_default().push(index);
        }
        self.groups.push(group);
        Ok(())
    }
    /// The index and its guard must remain alive while the caller uses the
    /// expanded set. Extra personal-source IDs remain that caller's ownership.
    pub(crate) fn expand(&mut self, selected: &mut IndexSet<String>) -> Result<(), ReceivedError> {
        let maximum = selected
            .len()
            .checked_add(self.by_alias.len())
            .ok_or_else(invalid)?;
        let names = self
            .by_alias
            .keys()
            .try_fold(0usize, |sum, key| sum.checked_add(key.len()))
            .ok_or_else(invalid)?;
        let bytes = heap_sum([
            map_storage::<String, ()>(maximum).ok_or_else(invalid)?,
            names,
            self.groups
                .len()
                .checked_mul(size_of::<bool>())
                .ok_or_else(invalid)?,
        ])
        .ok_or_else(invalid)?;
        self.reservation
            .resize(
                self.reservation
                    .bytes()
                    .checked_add(bytes)
                    .ok_or_else(invalid)?,
            )
            .map_err(|_| invalid())?;
        selected
            .try_reserve(self.by_alias.len())
            .map_err(|_| invalid())?;
        let mut visited = vec![false; self.groups.len()];
        let mut position = 0;
        while position < selected.len() {
            let key = selected.get_index(position).ok_or_else(invalid)?;
            if let Some(groups) = self.by_alias.get(key) {
                for &index in groups {
                    if std::mem::replace(&mut visited[index], true) {
                        continue;
                    }
                    for alias in &self.groups[index] {
                        selected.insert(alias.clone());
                    }
                }
            }
            position += 1;
        }
        Ok(())
    }
}
impl TemporalState {
    pub(crate) fn account_alias_index(
        &self,
        actor_id: &str,
        values: &ReceivedValues,
        meaning: &dyn TemporalValueMeaning,
        budget: &ByteBudget,
    ) -> Result<TemporalAccountAliases, ReceivedError> {
        let actor = self.actor(actor_id).ok_or_else(invalid)?;
        if !actor.complete_pages
            || actor
                .supports
                .as_ref()
                .is_none_or(|supports| !supports.coverage.complete)
        {
            return Err(invalid());
        }
        let mut groups = 0usize;
        let mut edges = 0usize;
        let mut names = 0usize;
        let mut count =
            |batch: &ReceivedBatch, entry: &ReceivedEntry| -> Result<(), ReceivedError> {
                groups = groups.checked_add(1).ok_or_else(invalid)?;
                edges = edges
                    .checked_add(entry.receipt.header.source_ids.len() + 1)
                    .ok_or_else(invalid)?;
                names = entry
                    .receipt
                    .header
                    .source_ids
                    .iter()
                    .try_fold(names, |sum, id| sum.checked_add(id.len()))
                    .and_then(|sum| sum.checked_add(batch.locator(entry.entry_index).id_len()?))
                    .ok_or_else(invalid)?;
                Ok(())
            };
        for page in actor.pages.values() {
            for batch in page.batches() {
                for entry in &batch.entries {
                    count(batch, entry)?;
                }
            }
        }
        for page in &actor.pending_pages {
            for entry in &page.batch().entries {
                count(page.batch(), entry)?;
            }
        }
        for support in actor.supports.as_ref().ok_or_else(invalid)?.records() {
            let receipt = &support.capsule().receipt;
            groups = groups.checked_add(1).ok_or_else(invalid)?;
            edges = edges
                .checked_add(receipt.header.source_ids.len() + 1)
                .ok_or_else(invalid)?;
            names = receipt
                .header
                .source_ids
                .iter()
                .try_fold(names, |sum, id| sum.checked_add(id.len()))
                .and_then(|sum| sum.checked_add(receipt.id.len()))
                .ok_or_else(invalid)?;
        }
        let bytes = heap_sum([
            size_of::<TemporalAccountAliases>(),
            groups
                .checked_mul(size_of::<Vec<String>>())
                .ok_or_else(invalid)?,
            edges
                .checked_mul(size_of::<String>() + size_of::<usize>() * 4)
                .ok_or_else(invalid)?,
            names.checked_mul(2).ok_or_else(invalid)?,
            map_storage::<String, Vec<usize>>(edges).ok_or_else(invalid)?,
        ])
        .ok_or_else(invalid)?;
        let reservation = budget.reserve(bytes).map_err(|_| invalid())?;
        let mut index = TemporalAccountAliases {
            groups: Vec::new(),
            by_alias: IndexMap::new(),
            reservation,
        };
        index
            .groups
            .try_reserve_exact(groups)
            .map_err(|_| invalid())?;
        index.by_alias.try_reserve(edges).map_err(|_| invalid())?;
        for page in actor.pages.values() {
            let _scratch = scratch(&page.metadata().source_ids, budget)?;
            for batch in page.batches() {
                for entry in &batch.entries {
                    index.add(
                        batch.locator(entry.entry_index).id(),
                        received_record_account_aliases(batch, entry, values, meaning)?,
                    )?;
                }
            }
        }
        for page in &actor.pending_pages {
            let _scratch = scratch(&page.metadata().source_ids, budget)?;
            for entry in &page.batch().entries {
                index.add(
                    page.batch().locator(entry.entry_index).id(),
                    received_record_account_aliases(page.batch(), entry, values, meaning)?,
                )?;
            }
        }
        for support in actor.supports.as_ref().ok_or_else(invalid)?.records() {
            let capsule = support.capsule();
            let _scratch = budget
                .reserve(
                    support
                        .payload()
                        .len()
                        .checked_mul(8)
                        .and_then(|sum| {
                            sum.checked_add(capsule.receipt.facets.len().checked_mul(2048)?)
                        })
                        .ok_or_else(invalid)?,
                )
                .map_err(|_| invalid())?;
            index.add(
                capsule.receipt.id.clone(),
                temporal_receipt_account_aliases(
                    &capsule.receipt,
                    values,
                    meaning,
                    Some(&capsule.values),
                )?,
            )?;
        }
        Ok(index)
    }
}
