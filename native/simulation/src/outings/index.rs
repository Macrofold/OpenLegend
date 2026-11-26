//! The same JSON tuple/JavaScript ordering as outing-index.ts. Records stay in
//! their original map; only affected records add/remove these derived keys.
use super::*;
use crate::encoding::{js_string_cmp, json_record};
use crate::host::retained_size::tree_node_bound;
use std::cmp::Ordering;
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Eq, PartialEq)]
struct Key(String);
impl PartialOrd for Key {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}
impl Ord for Key {
    fn cmp(&self, other: &Self) -> Ordering {
        js_string_cmp(&self.0, &other.0)
    }
}
#[derive(Clone)]
struct Due {
    at: f64,
    id: Key,
}
impl PartialEq for Due {
    fn eq(&self, other: &Self) -> bool {
        self.at.to_bits() == other.at.to_bits() && self.id == other.id
    }
}
impl Eq for Due {}
impl PartialOrd for Due {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}
// Source timeKey is the big-endian Float64 hexadecimal string, not a
// numerical sort. Preserve its exact current-format ordering as well.
impl Ord for Due {
    fn cmp(&self, other: &Self) -> Ordering {
        self.at
            .to_bits()
            .cmp(&other.at.to_bits())
            .then_with(|| self.id.cmp(&other.id))
    }
}

pub(super) struct OutingKeys {
    id: String,
    accepted: Option<[Key; 2]>,
    actor: [Key; 2],
    pair: Key,
    destination: Vec<Key>,
    due: Option<Due>,
}
impl OutingKeys {
    pub(super) fn new(facts: &crate::worlds::InstalledOutingFacts) -> Result<Self, ExecutionError> {
        let encode = |a: &str, b: &str| {
            json_record(&(a, b))
                .map(Key)
                .map_err(|_| ExecutionError::Invariant)
        };
        let actor = [
            encode(&facts.proposer, &facts.id)?,
            encode(&facts.recipient, &facts.id)?,
        ];
        let (a, b) = if js_string_cmp(&facts.proposer, &facts.recipient).is_le() {
            (&facts.proposer, &facts.recipient)
        } else {
            (&facts.recipient, &facts.proposer)
        };
        let pair = Key(json_record(&(a, b, &facts.id)).map_err(|_| ExecutionError::Invariant)?);
        let destination = facts
            .destinations
            .iter()
            .map(|id| encode(id, &facts.id))
            .collect::<Result<_, _>>()?;
        let accepted = if facts.status == OutingStatus::Pending {
            None
        } else {
            Some([
                encode(facts.kind.name(), &facts.proposer)?,
                encode(facts.kind.name(), &facts.recipient)?,
            ])
        };
        let due = facts.deadline.map(|at| Due {
            at,
            id: Key(facts.id.clone()),
        });
        Ok(Self {
            id: facts.id.clone(),
            accepted,
            actor,
            pair,
            destination,
            due,
        })
    }
    pub(super) fn index_bytes(&self) -> Result<usize, ExecutionError> {
        let count = 3usize
            .checked_add(self.destination.len())
            .and_then(|n| n.checked_add(if self.accepted.is_some() { 2 } else { 0 }))
            .ok_or(ExecutionError::Capacity)?;
        let strings = self.heap_bytes().ok_or(ExecutionError::Capacity)?;
        heap_sum([
            strings,
            count
                .checked_mul(self.id.capacity())
                .ok_or(ExecutionError::Capacity)?,
            count
                .checked_mul(tree_node_bound::<Key, String>().ok_or(ExecutionError::Capacity)?)
                .ok_or(ExecutionError::Capacity)?,
            if self.due.is_some() {
                tree_node_bound::<Due, ()>().ok_or(ExecutionError::Capacity)?
            } else {
                0
            },
        ])
        .ok_or(ExecutionError::Capacity)
    }
}
impl HeapBytes for OutingKeys {
    fn heap_bytes(&self) -> Option<usize> {
        let strings = self
            .actor
            .iter()
            .chain(std::iter::once(&self.pair))
            .chain(&self.destination)
            .chain(self.accepted.iter().flatten())
            .try_fold(self.id.capacity(), |n, key| n.checked_add(key.0.capacity()))?;
        heap_sum([
            strings,
            self.destination.capacity().checked_mul(size_of::<Key>())?,
            self.due.as_ref().map_or(0, |due| due.id.0.capacity()),
        ])
    }
}
#[derive(Default)]
pub(super) struct OutingIndex {
    actor: BTreeMap<Key, String>,
    pair: BTreeMap<Key, String>,
    destination: BTreeMap<Key, String>,
    accepted: BTreeMap<Key, String>,
    due: BTreeSet<Due>,
}
impl OutingIndex {
    pub(super) fn by_pair<'a>(
        &'a self,
        a: &str,
        b: &str,
        budget: &ByteBudget,
    ) -> Result<OutingIds<'a>, ExecutionError> {
        let owners = if js_string_cmp(a, b).is_le() {
            [a, b]
        } else {
            [b, a]
        };
        related(&self.pair, &owners, budget)
    }
    pub(super) fn check_replacement(&self, record: &OutingRecord) -> Result<(), ExecutionError> {
        if record
            .keys
            .accepted
            .iter()
            .flatten()
            .any(|key| self.accepted.get(key).is_some_and(|id| id != record.id()))
        {
            return Err(ExecutionError::Invariant);
        }
        Ok(())
    }
    pub(super) fn insert(&mut self, record: &OutingRecord) {
        for key in &record.keys.actor {
            self.actor.insert(key.clone(), record.id().into());
        }
        self.pair
            .insert(record.keys.pair.clone(), record.id().into());
        for key in &record.keys.destination {
            self.destination.insert(key.clone(), record.id().into());
        }
        for key in record.keys.accepted.iter().flatten() {
            self.accepted.insert(key.clone(), record.id().into());
        }
        self.due.extend(record.keys.due.iter().cloned());
    }
    pub(super) fn remove(&mut self, record: &OutingRecord) {
        for key in &record.keys.actor {
            self.actor.remove(key);
        }
        self.pair.remove(&record.keys.pair);
        for key in &record.keys.destination {
            self.destination.remove(key);
        }
        for key in record.keys.accepted.iter().flatten() {
            if self.accepted.get(key).is_some_and(|id| id == record.id()) {
                self.accepted.remove(key);
            }
        }
        if let Some(due) = &record.keys.due {
            self.due.remove(due);
        }
        // BTreeMap may retain an empty root allocation after its final removal.
        // Free it before the last record's index custody can be destroyed.
        if self.actor.is_empty() {
            self.actor = BTreeMap::new();
        }
        if self.pair.is_empty() {
            self.pair = BTreeMap::new();
        }
        if self.destination.is_empty() {
            self.destination = BTreeMap::new();
        }
        if self.accepted.is_empty() {
            self.accepted = BTreeMap::new();
        }
        if self.due.is_empty() {
            self.due = BTreeSet::new();
        }
    }
}

/// This finite query owns only the encoded tuple prefix. Returned IDs borrow
/// the independently funded index, without copying or scanning record bodies.
pub(crate) struct OutingIds<'a> {
    range: std::collections::btree_map::Range<'a, Key, String>,
    prefix: String,
    _allocation: ByteReservation,
}
impl<'a> Iterator for OutingIds<'a> {
    type Item = &'a str;
    fn next(&mut self) -> Option<Self::Item> {
        let (key, id) = self.range.next()?;
        key.0.starts_with(&self.prefix).then_some(id.as_str())
    }
}
fn related<'a>(
    map: &'a BTreeMap<Key, String>,
    owners: &[&str],
    budget: &ByteBudget,
) -> Result<OutingIds<'a>, ExecutionError> {
    let bytes = owners
        .iter()
        .try_fold(128usize, |n, id| {
            id.len().checked_mul(12).and_then(|s| n.checked_add(s))
        })
        .ok_or(ExecutionError::Capacity)?;
    let allocation = budget.reserve(bytes)?;
    let mut prefix = json_record(owners).map_err(|_| ExecutionError::Invariant)?;
    if prefix.pop() != Some(']') {
        return Err(ExecutionError::Invariant);
    }
    prefix.push(',');
    let range = map.range(Key(prefix.clone())..);
    Ok(OutingIds {
        range,
        prefix,
        _allocation: allocation,
    })
}
impl OutingState {
    pub(crate) fn actor_ids<'a>(
        &'a self,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<OutingIds<'a>, ExecutionError> {
        related(&self.index.actor, &[actor], budget)
    }
    pub(crate) fn destination_ids<'a>(
        &'a self,
        entity: &str,
        budget: &ByteBudget,
    ) -> Result<OutingIds<'a>, ExecutionError> {
        related(&self.index.destination, &[entity], budget)
    }
    pub(crate) fn pair_ids<'a>(
        &'a self,
        a: &str,
        b: &str,
        budget: &ByteBudget,
    ) -> Result<OutingIds<'a>, ExecutionError> {
        self.index.by_pair(a, b, budget)
    }
    pub(crate) fn accepted_id(
        &self,
        actor: &str,
        kind: OutingKind,
        budget: &ByteBudget,
    ) -> Result<Option<&str>, ExecutionError> {
        let _guard = budget.reserve(
            actor
                .len()
                .checked_mul(6)
                .and_then(|n| n.checked_add(128))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let key = Key(json_record(&(kind.name(), actor)).map_err(|_| ExecutionError::Invariant)?);
        Ok(self.index.accepted.get(&key).map(String::as_str))
    }
    pub(crate) fn next_deadline(&self) -> Option<f64> {
        self.index.due.first().map(|due| due.at)
    }
    pub(crate) fn due_ids(&self, at: f64) -> impl Iterator<Item = &str> {
        self.index
            .due
            .iter()
            .take_while(move |due| due.at <= at)
            .map(|due| due.id.0.as_str())
    }
}
