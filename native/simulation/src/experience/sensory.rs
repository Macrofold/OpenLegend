//! Optional sensory expiry never revokes the admitted animal controller's cue.
//! This index retains references to actual immutable accounts, not copied bodies
//! or a second history. Only due accounts are selected on recurring time work.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::{ByteBudget, ByteReservation};
use std::{cmp::Ordering, collections::BTreeSet, mem::size_of};

struct Entry {
    at: f64,
    source: Arc<PersonalSourceRecord>,
}
impl Entry {
    fn from_source(source: &Arc<PersonalSourceRecord>) -> Option<Self> {
        if source.header.class != AccountClass::Sensory {
            return None;
        }
        Some(Self {
            at: source
                .header
                .expires_at
                .expect("sensory expiry validated by source installation"),
            source: Arc::clone(source),
        })
    }
}
impl Ord for Entry {
    fn cmp(&self, other: &Self) -> Ordering {
        self.at
            .partial_cmp(&other.at)
            .expect("finite sensory expiry")
            .then_with(|| {
                crate::encoding::js_string_cmp(
                    &self.source.header.actor_id,
                    &other.source.header.actor_id,
                )
            })
            .then(self.source.position.cmp(&other.source.position))
    }
}
impl PartialOrd for Entry {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}
impl PartialEq for Entry {
    fn eq(&self, other: &Self) -> bool {
        self.cmp(other).is_eq()
    }
}
impl Eq for Entry {}

#[derive(Debug)]
pub(super) struct SensoryDeadlines {
    entries: BTreeSet<Entry>,
    funded_nodes: usize,
    reservation: ByteReservation,
}
impl std::fmt::Debug for Entry {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_tuple("SensoryDeadline")
            .field(&self.at)
            .field(&self.source.header.actor_id)
            .field(&self.source.position)
            .finish()
    }
}
impl SensoryDeadlines {
    pub(super) fn install(
        actors: &IndexMap<String, PersonalHistory>,
        budget: &ByteBudget,
    ) -> Result<Self, ExperienceError> {
        let mut index = Self {
            entries: BTreeSet::new(),
            funded_nodes: 0,
            reservation: budget
                .reserve(size_of::<Self>())
                .map_err(|_| ExperienceError::Capacity)?,
        };
        for actor in actors.values() {
            if let Some(source) = actor.sources.get(&PersonalSourceKind::Awareness) {
                for record in source.records() {
                    index.prepare_exchange(None, Some(record))?;
                    index.exchange(None, Some(record));
                }
            }
        }
        Ok(index)
    }
    pub(super) fn prepare_exchange(
        &mut self,
        before: Option<&Arc<PersonalSourceRecord>>,
        after: Option<&Arc<PersonalSourceRecord>>,
    ) -> Result<(), ExperienceError> {
        let old =
            usize::from(before.is_some_and(|source| source.header.class == AccountClass::Sensory));
        let new =
            usize::from(after.is_some_and(|source| source.header.class == AccountClass::Sensory));
        let needed = self
            .entries
            .len()
            .checked_sub(old)
            .and_then(|n| n.checked_add(new))
            .ok_or(ExperienceError::InvalidOrdinal)?;
        if needed > self.funded_nodes {
            let bytes = crate::host::retained_size::tree_node_bound::<Entry, ()>()
                .and_then(|bytes| bytes.checked_mul(needed))
                .and_then(|bytes| bytes.checked_add(size_of::<Self>()))
                .ok_or(ExperienceError::Capacity)?;
            self.reservation
                .resize(bytes)
                .map_err(|_| ExperienceError::Capacity)?;
            self.funded_nodes = needed;
        }
        Ok(())
    }
    /// The placement journal funds both forward and inverse node counts before
    /// changing canonical storage. Keep that peak allowance until its caller's
    /// settlement boundary so rollback cannot compete for its released capacity.
    pub(super) fn exchange(
        &mut self,
        before: Option<&Arc<PersonalSourceRecord>>,
        after: Option<&Arc<PersonalSourceRecord>>,
    ) {
        if let Some(entry) = before.and_then(Entry::from_source) {
            self.entries.remove(&entry);
        }
        if let Some(entry) = after.and_then(Entry::from_source) {
            self.entries.insert(entry);
        }
    }
    pub(super) fn settle(&mut self) -> Result<(), ExperienceError> {
        let count = self.entries.len();
        let bytes = crate::host::retained_size::tree_node_bound::<Entry, ()>()
            .and_then(|bytes| bytes.checked_mul(count))
            .and_then(|bytes| bytes.checked_add(size_of::<Self>()))
            .ok_or(ExperienceError::Capacity)?;
        self.reservation
            .resize(bytes)
            .map_err(|_| ExperienceError::Capacity)?;
        self.funded_nodes = count;
        Ok(())
    }
}
fn complete_awareness(state: &ExperienceState) -> Result<(), ExperienceError> {
    let owners = state
        .owner_maps
        .get(&PersonalSourceKind::Awareness)
        .ok_or(ExperienceError::UnknownCoverage)?;
    if !owners.coverage.complete
        || owners.placements.keys().any(|actor| {
            state
                .actors
                .get(actor)
                .and_then(|actor| actor.sources.get(&PersonalSourceKind::Awareness))
                .is_none_or(|source| !source.coverage.complete)
        })
    {
        return Err(ExperienceError::Unavailable);
    }
    Ok(())
}
pub(crate) fn next_sensory_expiry(state: &ExperienceState) -> Result<f64, ExperienceError> {
    complete_awareness(state)?;
    Ok(state
        .sensory
        .entries
        .first()
        .map_or(f64::INFINITY, |entry| entry.at))
}
pub(crate) fn expire_sensory_awareness(core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
    complete_awareness(&core.state.experience)?;
    let now = core.state.physical.header.sim_time;
    loop {
        let Some(entry) = core
            .state
            .experience
            .sensory
            .entries
            .first()
            .filter(|entry| entry.at <= now)
        else {
            break;
        };
        let source = Arc::clone(&entry.source);
        // Sensory accounts have zero quota charge (the same accounting owner
        // checks this class on acquisition). Removing them does not change a
        // cognition/privacy revision or forget the controller's admitted cue.
        if !core.journal.experience.remove(
            &mut core.state.experience,
            &source.header.actor_id,
            PersonalSourceKind::Awareness,
            &source.header.reference.id,
        )? {
            return Err(ExperienceError::InvalidOrdinal.into());
        }
    }
    Ok(())
}
