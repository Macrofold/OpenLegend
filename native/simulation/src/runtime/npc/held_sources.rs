//! Withdrawal may name an expired receipt only while a genuine issued read
//! still holds it. Weak entries do not grant recall or keep history alive.
use crate::capture::PreparedNpcSources;
use crate::execution::ExecutionError;
use crate::host::retained_size::tree_node_bound;
use crate::host::{ByteBudget, ByteReservation};
use crate::received::{CapturedTemporalReceipt, TemporalValueMeaning};
use std::collections::BTreeMap;
use std::mem::{align_of, size_of};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Weak};

pub(super) fn marker_backing_bytes() -> usize {
    size_of::<AtomicBool>() + 2 * size_of::<usize>() + align_of::<usize>() - 1
}
fn receipt_backing_bytes() -> Option<usize> {
    size_of::<CapturedTemporalReceipt>()
        .checked_add(2 * size_of::<usize>())?
        .checked_add(align_of::<CapturedTemporalReceipt>().max(align_of::<usize>()) - 1)?
        .checked_add(marker_backing_bytes())
}
struct Entry {
    // Bind the receiving read's body life, independently of an older receipt.
    observer_life: u64,
    receipt: Weak<CapturedTemporalReceipt>,
    payload: Weak<AtomicBool>,
    // A Weak retains the Arc's inline allocation after its body guard drops.
    // Reserve that fixed backing independently; this is escrow, not RSS.
    _backing: ByteReservation,
}
impl Entry {
    fn live(&self) -> bool {
        self.receipt.strong_count() != 0
            && self
                .payload
                .upgrade()
                .is_some_and(|payload| payload.load(Ordering::Acquire))
    }
}
struct Actor {
    entries: Vec<Entry>,
    storage: ByteReservation,
}
pub(in crate::runtime) struct HeldReceiptRegistry {
    generation: u64,
    actors: BTreeMap<String, Actor>,
    _storage: ByteReservation,
}

/// This proof keeps the selected immutable capture, but not its permission
/// alive. Actual read/ticket release clears the independent payload marker.
pub(crate) struct HeldSourceProof {
    observer_life: u64,
    receipt: Arc<CapturedTemporalReceipt>,
    payload: Weak<AtomicBool>,
    generation: u64,
    source_id: String,
    _storage: ByteReservation,
}
impl HeldSourceProof {
    pub(crate) fn permits(
        &self,
        generation: u64,
        actor_id: &str,
        physical_life: u64,
        source_id: &str,
    ) -> bool {
        self.generation == generation
            && self.source_id == source_id
            && self.receipt.receipt().locator.actor_id == actor_id
            && self.observer_life == physical_life
            && self
                .payload
                .upgrade()
                .is_some_and(|payload| payload.load(Ordering::Acquire))
    }
}
impl HeldReceiptRegistry {
    pub(in crate::runtime) fn new(
        generation: u64,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        Ok(Self {
            generation,
            actors: BTreeMap::new(),
            _storage: budget.reserve(size_of::<Self>())?,
        })
    }
    fn prune(&mut self) {
        // This walks only issued weak metadata, never actor/world/history rows.
        self.actors.retain(|_, actor| {
            actor.entries.retain(Entry::live);
            !actor.entries.is_empty()
        });
    }
    pub(in crate::runtime) fn register(
        &mut self,
        sources: &PreparedNpcSources,
        payload: &Arc<AtomicBool>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        self.prune();
        if sources.receipts.is_empty() || !payload.load(Ordering::Acquire) {
            return Ok(());
        }
        let actor_id = sources.scope.actor_id.as_str();
        let payload = Arc::downgrade(payload);
        let count = sources
            .receipts
            .iter()
            .filter(|receipt| {
                self.actors.get(actor_id).is_none_or(|actor| {
                    !actor.entries.iter().any(|entry| {
                        Weak::ptr_eq(&entry.receipt, &Arc::downgrade(&receipt.capture))
                            && Weak::ptr_eq(&entry.payload, &payload)
                    })
                })
            })
            .count();
        if count == 0 {
            return Ok(());
        }
        let backing_bytes = receipt_backing_bytes().ok_or(ExecutionError::Capacity)?;
        let mut backing = budget.reserve(
            count
                .checked_mul(backing_bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let base = tree_node_bound::<String, Actor>()
            .and_then(|n| n.checked_add(actor_id.len()))
            .ok_or(ExecutionError::Capacity)?;
        if !self.actors.contains_key(actor_id) {
            let storage = budget.reserve(base)?;
            self.actors.insert(
                actor_id.to_owned(),
                Actor {
                    entries: Vec::new(),
                    storage,
                },
            );
        }
        let result = (|| {
            let actor = self
                .actors
                .get_mut(actor_id)
                .ok_or(ExecutionError::Invariant)?;
            let capacity = actor
                .entries
                .len()
                .checked_add(count)
                .ok_or(ExecutionError::Capacity)?;
            if capacity > actor.entries.capacity() {
                // The existing guard funds old backing during reallocation;
                // this new guard funds the complete replacement before growth.
                let storage = budget.reserve(
                    base.checked_add(
                        capacity
                            .checked_mul(size_of::<Entry>())
                            .ok_or(ExecutionError::Capacity)?,
                    )
                    .ok_or(ExecutionError::Capacity)?,
                )?;
                actor
                    .entries
                    .try_reserve_exact(capacity - actor.entries.len())
                    .map_err(|_| ExecutionError::Capacity)?;
                actor.storage = storage;
            }
            for receipt in &sources.receipts {
                let capture = Arc::downgrade(&receipt.capture);
                if actor.entries.iter().any(|entry| {
                    Weak::ptr_eq(&entry.receipt, &capture) && Weak::ptr_eq(&entry.payload, &payload)
                }) {
                    continue;
                }
                actor.entries.push(Entry {
                    observer_life: sources.scope.physical_life,
                    receipt: capture,
                    payload: payload.clone(),
                    _backing: backing.split_off(backing_bytes)?,
                });
            }
            Ok(())
        })();
        if result.is_err() {
            self.prune();
        }
        result
    }
    pub(in crate::runtime) fn prove(
        &mut self,
        generation: u64,
        actor_id: &str,
        physical_life: u64,
        source_id: &str,
        meaning: &dyn TemporalValueMeaning,
        budget: &ByteBudget,
    ) -> Result<Option<HeldSourceProof>, ExecutionError> {
        if generation != self.generation {
            return Ok(None);
        }
        let Some(actor) = self.actors.get_mut(actor_id) else {
            return Ok(None);
        };
        actor.entries.retain(Entry::live);
        for entry in &actor.entries {
            let Some(receipt) = entry.receipt.upgrade() else {
                continue;
            };
            if receipt.receipt().locator.actor_id != actor_id
                || entry.observer_life != physical_life
            {
                continue;
            }
            let _aliases = budget.reserve(
                crate::received::temporal_receipt_aliases_bound(
                    receipt.receipt(),
                    receipt.fragments(),
                    meaning,
                )
                .ok_or(ExecutionError::Capacity)?,
            )?;
            let aliases = crate::received::temporal_receipt_aliases(
                receipt.receipt(),
                &None::<&crate::received::ReceivedValues>,
                meaning,
                Some(receipt.fragments()),
            )?;
            if !aliases.contains(source_id) {
                continue;
            }
            let storage = budget.reserve(
                size_of::<HeldSourceProof>()
                    .checked_add(source_id.len())
                    .and_then(|n| n.checked_add(marker_backing_bytes()))
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            return Ok(Some(HeldSourceProof {
                observer_life: entry.observer_life,
                receipt,
                payload: entry.payload.clone(),
                generation,
                source_id: source_id.to_owned(),
                _storage: storage,
            }));
        }
        if actor.entries.is_empty() {
            self.actors.remove(actor_id);
        }
        Ok(None)
    }
}
