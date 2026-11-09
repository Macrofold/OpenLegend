//! Participation owns simulated absence and its deadlines. Operational presence
//! supplies requests; wall-clock expiry never makes a still-present body safe.
use crate::host::retained_size::{HeapBytes, map_storage};
use crate::host::{ByteBudget, ResidentReservation};
use crate::install::{InstallError, RowImport, WorldChildren};
use crate::state::EntityStore;
use indexmap::IndexMap;

mod install;

pub(crate) struct ParticipationState {
    pub(super) exposures: Option<IndexMap<String, f64>>,
    // These closed facts come from complete current owners. Positive social
    // records are refused until their real reconciliation producers are joined.
    _outings_present: bool,
    _compacts_present: bool,
    budget: ByteBudget,
    storage: ResidentReservation,
}
impl ParticipationState {
    pub(crate) fn exposures(&self) -> Option<&IndexMap<String, f64>> {
        self.exposures.as_ref()
    }
    pub(crate) fn is_present(&self) -> bool {
        self.exposures.is_some()
    }
    pub(crate) fn validate_policy(
        &self,
        policy: Option<&crate::install::ParticipationReadPolicy>,
        entities: &EntityStore,
    ) -> Result<(), InstallError> {
        let exposure = policy.and_then(|policy| policy.exit_exposure_seconds);
        if exposure.is_some_and(|seconds| !seconds.is_finite() || seconds <= 0.0) {
            return Err(InstallError::CurrentFormat);
        }
        if exposure.is_none() && self.exposures.as_ref().is_some_and(|rows| !rows.is_empty()) {
            return Err(InstallError::CurrentFormat);
        }
        for id in entities.ordered_ids() {
            let Some(actor) = entities.get(id).and_then(|entity| entity.actor.as_ref()) else {
                continue;
            };
            let Some(state) = &actor.participation else {
                continue;
            };
            if !matches!(state.phase.as_str(), "active" | "exiting" | "inactive")
                || (state.phase == "active" && state.exit_attempt_id.is_some())
                || (state.phase != "active"
                    && !state
                        .exit_attempt_id
                        .as_deref()
                        .is_some_and(crate::values::is_safe_record_id))
                || (state.phase == "inactive" && actor.action.is_some())
                || (state.phase == "exiting"
                    && exposure.is_some()
                    && !self
                        .exposures
                        .as_ref()
                        .is_some_and(|rows| rows.contains_key(id)))
                || state.return_anchor.as_ref().is_some_and(|anchor| {
                    ![anchor.x, anchor.y, anchor.z].iter().all(|v| v.is_finite())
                        || !crate::values::is_safe_record_id(&anchor.surface_id)
                })
            {
                return Err(InstallError::CurrentFormat);
            }
        }
        Ok(())
    }
    /// Fund any new backing and key before its allocation. Existing keys keep
    /// their insertion slots; removals leave the actual map capacity retained.
    pub(crate) fn prepare_write(
        &mut self,
        id: &str,
        insert: bool,
    ) -> Result<(), crate::execution::ExecutionError> {
        let map = self.exposures.as_ref();
        let new = insert && !map.is_some_and(|map| map.contains_key(id));
        let capacity = map.map_or(0, IndexMap::capacity);
        let count = map.map_or(0, IndexMap::len);
        let desired = if new && count == capacity {
            capacity
                .checked_mul(2)
                .and_then(|n| n.checked_add(1))
                .ok_or(crate::execution::ExecutionError::Capacity)?
        } else {
            capacity
        };
        let keys = map
            .map_or(Some(0), |map| {
                map.keys()
                    .try_fold(0usize, |n, key| n.checked_add(key.capacity()))
            })
            .and_then(|n| n.checked_add(if new { id.len() } else { 0 }))
            .ok_or(crate::execution::ExecutionError::Capacity)?;
        let bytes = map_storage::<String, f64>(desired)
            .and_then(|n| n.checked_add(keys))
            .ok_or(crate::execution::ExecutionError::Capacity)?;
        self.budget.resize_backing(&mut self.storage, bytes)?;
        if insert {
            self.exposures
                .get_or_insert_with(IndexMap::new)
                .try_reserve(usize::from(new))
                .map_err(|_| crate::execution::ExecutionError::Capacity)?;
        }
        Ok(())
    }
    pub(crate) fn settle(&mut self) -> Result<(), crate::execution::ExecutionError> {
        let bytes = self
            .exposures
            .heap_bytes()
            .ok_or(crate::execution::ExecutionError::Capacity)?;
        if bytes > self.storage.bytes() {
            return Err(crate::execution::ExecutionError::Invariant);
        }
        self.storage.resize(bytes)?;
        Ok(())
    }
    pub(crate) fn settle_restored(&mut self, from: &mut crate::host::ByteReservation) -> Result<(), crate::execution::ExecutionError> {
        let bytes = self.exposures.heap_bytes().ok_or(crate::execution::ExecutionError::Capacity)?;
        if bytes > self.storage.bytes() {
            let growth = from.split_off(bytes - self.storage.bytes())?;
            self.budget.restore_backing(&mut self.storage, growth)?;
        }
        self.storage.resize(bytes)?;
        Ok(())
    }
}
