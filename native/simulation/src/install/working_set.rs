//! Exact indexed startup selections. These certify named current subsets, never
//! the absence of an arbitrary historical row or permission to consume it.
use super::InstallError;
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::identity::MAX_SAFE_INTEGER;
use indexmap::IndexSet;
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct WorkingSetSelection {
    world_id: String,
    generation: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    revision: u64,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub removed_hot_events: u64,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    hot_event_window: u64,
    received_value_closure: bool,
    active_appraisals: Vec<String>,
    open_agreement_heads: Vec<String>,
    sensory_awareness: Vec<String>,
    unresolved_memories: Vec<String>,
    running_activities: Vec<String>,
    current_contributions: Vec<String>,
}
pub(crate) struct InstalledWorkingSet {
    pub removed_hot_events: u64,
    pub received_value_closure: bool,
    pub hot_event_window: usize,
    active_appraisals: IndexSet<String>,
    open_agreement_heads: IndexSet<String>,
    sensory_awareness: IndexSet<String>,
    unresolved_memories: IndexSet<String>,
    running_activities: IndexSet<String>,
    current_contributions: IndexSet<String>,
    _reservation: ByteReservation,
}
fn set_bound(values: &[String]) -> Option<usize> {
    // Fund pinned collection growth before allocating its actual index. This
    // bound covers both backing allocations; the finished owner keeps only its
    // actual collection-capacity bound below.
    map_storage::<String, ()>(values.len().checked_mul(2)?.checked_add(4)?)?.checked_add(
        values
            .iter()
            .try_fold(0usize, |n, s| n.checked_add(s.capacity()))?,
    )
}
fn set_heap(values: &IndexSet<String>) -> Option<usize> {
    map_storage::<String, ()>(values.capacity())?.checked_add(
        values
            .iter()
            .try_fold(0usize, |n, s| n.checked_add(s.capacity()))?,
    )
}
impl WorkingSetSelection {
    pub(super) fn install(
        self,
        world: &str,
        generation: &str,
        revision: u64,
        budget: &ByteBudget,
    ) -> Result<InstalledWorkingSet, InstallError> {
        if self.world_id != world
            || self.generation != generation
            || self.revision != revision
            || self.removed_hot_events > MAX_SAFE_INTEGER
        {
            return Err(InstallError::CurrentFormat);
        }
        let bytes = heap_sum([
            std::mem::size_of::<InstalledWorkingSet>(),
            set_bound(&self.active_appraisals).ok_or(InstallError::Capacity)?,
            set_bound(&self.open_agreement_heads).ok_or(InstallError::Capacity)?,
            set_bound(&self.sensory_awareness).ok_or(InstallError::Capacity)?,
            set_bound(&self.unresolved_memories).ok_or(InstallError::Capacity)?,
            set_bound(&self.running_activities).ok_or(InstallError::Capacity)?,
            set_bound(&self.current_contributions).ok_or(InstallError::Capacity)?,
        ])
        .ok_or(InstallError::Capacity)?;
        let reservation = budget.reserve(bytes).map_err(|_| InstallError::Capacity)?;
        let mut selected = InstalledWorkingSet {
            removed_hot_events: self.removed_hot_events,
            hot_event_window: usize::try_from(self.hot_event_window)
                .map_err(|_| InstallError::Capacity)?,
            received_value_closure: self.received_value_closure,
            active_appraisals: self.active_appraisals.into_iter().collect(),
            open_agreement_heads: self.open_agreement_heads.into_iter().collect(),
            sensory_awareness: self.sensory_awareness.into_iter().collect(),
            unresolved_memories: self.unresolved_memories.into_iter().collect(),
            running_activities: self.running_activities.into_iter().collect(),
            current_contributions: self.current_contributions.into_iter().collect(),
            _reservation: reservation,
        };
        let actual = heap_sum([
            std::mem::size_of::<InstalledWorkingSet>(),
            set_heap(&selected.active_appraisals).ok_or(InstallError::Capacity)?,
            set_heap(&selected.open_agreement_heads).ok_or(InstallError::Capacity)?,
            set_heap(&selected.sensory_awareness).ok_or(InstallError::Capacity)?,
            set_heap(&selected.unresolved_memories).ok_or(InstallError::Capacity)?,
            set_heap(&selected.running_activities).ok_or(InstallError::Capacity)?,
            set_heap(&selected.current_contributions).ok_or(InstallError::Capacity)?,
        ])
        .ok_or(InstallError::Capacity)?;
        selected
            ._reservation
            .resize(actual)
            .map_err(|_| InstallError::Capacity)?;
        Ok(selected)
    }
}
impl InstalledWorkingSet {
    pub(crate) fn active_appraisals(&self, actor: &str) -> bool {
        self.active_appraisals.contains(actor)
    }
    pub(crate) fn open_agreement_heads(&self, actor: &str) -> bool {
        self.open_agreement_heads.contains(actor)
    }
    pub(crate) fn sensory_awareness(&self, actor: &str) -> bool {
        self.sensory_awareness.contains(actor)
    }
    pub(crate) fn unresolved_memories(&self, actor: &str) -> bool {
        self.unresolved_memories.contains(actor)
    }
    pub(crate) fn running_activities(&self, actor: &str) -> bool {
        self.running_activities.contains(actor)
    }
    pub(crate) fn current_contributions(&self, entity: &str) -> bool {
        self.current_contributions.contains(entity)
    }
}
