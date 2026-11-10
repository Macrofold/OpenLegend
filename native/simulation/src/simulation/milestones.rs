//! Application progression follows the selected world's actual emitted events.
//! The sparse journal changes only monotonic flags; it retains no actor bodies.
use super::SimulationState;
use crate::administration::InstalledHostSettings;
use crate::events::WorldEvent;
use crate::execution::ExecutionError;
use crate::host::retained_size::map_storage;
use crate::host::{ByteBudget, ByteReservation};
use crate::records::{
    OrderedMapRows, OwnerCoverage, RecordEncodingError, RowEffects, RowEncoder, SelectedPlacement,
};
use indexmap::IndexMap;
use std::mem::size_of;

struct Edit {
    actor: String,
    key: String,
    before: Option<bool>,
    created_actor: bool,
    root_backing_before: usize,
    flags_backing_before: usize,
    unreconciled_growth: usize,
}
pub(crate) struct MilestoneJournal {
    present_before: bool,
    storage_before: usize,
    edits: Vec<Edit>,
    storage: Option<ByteReservation>,
}
impl MilestoneJournal {
    pub(crate) fn new(host: &InstalledHostSettings) -> Self {
        Self {
            present_before: host.actor_milestones.is_some(),
            storage_before: host.storage_bytes(),
            edits: Vec::new(),
            storage: None,
        }
    }
    pub(crate) fn changed(&self) -> bool {
        !self.edits.is_empty()
    }
    pub(crate) fn apply<'a>(
        &mut self,
        host: &mut InstalledHostSettings,
        state: &SimulationState,
        events: impl Iterator<Item = &'a WorldEvent>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let rule = &state.installed.ordinary_actions.value().audience_milestone;
        for event in events {
            for actor in &event.audience {
                if !rule.earned_by_audience_member(event, actor)
                    || !state
                        .physical
                        .entities
                        .get(actor)
                        .and_then(|entity| entity.actor.as_ref())
                        .is_some_and(|actor| actor.controller == "player")
                {
                    continue;
                }
                self.grant(host, actor, &rule.id, budget)?;
            }
        }
        Ok(())
    }
    /// Startup visits eligible players in actual entity order, matching the
    /// Source all-player pass without rescanning hot history for every player.
    pub(crate) fn apply_hot(
        &mut self,
        host: &mut InstalledHostSettings,
        state: &SimulationState,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let rule = &state.installed.ordinary_actions.value().audience_milestone;
        let mut storage = budget.reserve(0)?;
        let mut eligible = IndexMap::<&str, &str>::new();
        for event in state.occurrences.hot().map(|record| record.event().event()) {
            for actor in &event.audience {
                if !rule.earned_by_audience_member(event, actor)
                    || eligible.contains_key(actor.as_str())
                    || host
                        .actor_milestones
                        .as_ref()
                        .and_then(|rows| rows.get(actor))
                        .and_then(|flags| flags.get(&rule.id))
                        == Some(&true)
                    || !state
                        .physical
                        .entities
                        .get(actor)
                        .and_then(|entity| entity.actor.as_ref())
                        .is_some_and(|actor| actor.controller == "player")
                {
                    continue;
                }
                if eligible.len() == eligible.capacity() {
                    let maximum = eligible
                        .len()
                        .checked_add(1)
                        .and_then(|n| n.checked_mul(2))
                        .and_then(|n| n.checked_add(4))
                        .ok_or(ExecutionError::Capacity)?;
                    storage.resize(
                        map_storage::<&str, &str>(maximum).ok_or(ExecutionError::Capacity)?,
                    )?;
                    eligible
                        .try_reserve(1)
                        .map_err(|_| ExecutionError::Capacity)?;
                    storage.resize(
                        map_storage::<&str, &str>(eligible.capacity())
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                }
                eligible.insert(
                    actor,
                    state
                        .physical
                        .entities
                        .ordering(actor)
                        .ok_or(ExecutionError::Invariant)?,
                );
            }
        }
        eligible.sort_unstable_by(|_, first, _, second| first.cmp(second));
        for actor in eligible.keys() {
            self.grant(host, actor, &rule.id, budget)?;
        }
        Ok(())
    }
    fn grant(
        &mut self,
        host: &mut InstalledHostSettings,
        actor: &str,
        key: &str,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let row = host
            .actor_milestones
            .as_ref()
            .and_then(|rows| rows.get(actor));
        let before = row.and_then(|flags| flags.get(key)).copied();
        if before == Some(true) {
            return Ok(());
        }
        let created_actor = row.is_none();
        let root_cap = host.actor_milestones.as_ref().map_or(0, IndexMap::capacity);
        let root_len = host.actor_milestones.as_ref().map_or(0, IndexMap::len);
        let flag_cap = row.map_or(0, IndexMap::capacity);
        let flag_len = row.map_or(0, IndexMap::len);
        let root_max = if created_actor && root_len == root_cap {
            root_len
                .checked_add(1)
                .and_then(|n| n.checked_mul(2))
                .and_then(|n| n.checked_add(4))
                .ok_or(ExecutionError::Capacity)?
        } else {
            root_cap
        };
        let flag_max = if before.is_none() && flag_len == flag_cap {
            flag_len
                .checked_add(1)
                .and_then(|n| n.checked_mul(2))
                .and_then(|n| n.checked_add(4))
                .ok_or(ExecutionError::Capacity)?
        } else {
            flag_cap
        };
        let root_before = map_storage::<String, IndexMap<String, bool>>(root_cap)
            .ok_or(ExecutionError::Capacity)?;
        let flags_before = map_storage::<String, bool>(flag_cap).ok_or(ExecutionError::Capacity)?;
        let payload = (if created_actor { actor.len() } else { 0 })
            .checked_add(if before.is_none() { key.len() } else { 0 })
            .ok_or(ExecutionError::Capacity)?;
        let growth = map_storage::<String, IndexMap<String, bool>>(root_max)
            .and_then(|n| n.checked_sub(root_before))
            .and_then(|n| {
                n.checked_add(map_storage::<String, bool>(flag_max)?.checked_sub(flags_before)?)
            })
            .and_then(|n| n.checked_add(payload))
            .ok_or(ExecutionError::Capacity)?;
        let slots = if self.edits.len() == self.edits.capacity() {
            self.edits
                .len()
                .checked_add(1)
                .and_then(|n| n.checked_mul(2))
                .and_then(|n| n.max(4).checked_sub(self.edits.capacity()))
                .and_then(|n| n.checked_mul(size_of::<Edit>()))
                .ok_or(ExecutionError::Capacity)?
        } else {
            0
        };
        let undo = slots
            .checked_add(actor.len())
            .and_then(|n| n.checked_add(key.len()))
            .ok_or(ExecutionError::Capacity)?;
        if self.storage.is_none() {
            self.storage = Some(
                budget
                    .reserve(size_of::<Self>())
                    .map_err(|_| ExecutionError::Capacity)?,
            );
        }
        let storage = self.storage.as_mut().expect("created journal funding");
        storage
            .resize(
                storage
                    .bytes()
                    .checked_add(undo)
                    .ok_or(ExecutionError::Capacity)?,
            )
            .map_err(|_| ExecutionError::Capacity)?;
        self.edits
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        // Record the inverse before any host semantic mutation. Backing growth
        // is operational capacity and remains funded even after a refusal.
        self.edits.push(Edit {
            actor: actor.into(),
            key: key.into(),
            before,
            created_actor,
            root_backing_before: root_before,
            flags_backing_before: flags_before,
            unreconciled_growth: 0,
        });
        host.fund_milestone_allocation(growth, budget)?;
        self.edits
            .last_mut()
            .expect("recorded inverse")
            .unreconciled_growth = growth;
        let rows = host.actor_milestones.get_or_insert_with(IndexMap::new);
        if created_actor {
            rows.try_reserve(1).map_err(|_| ExecutionError::Capacity)?;
            rows.insert(actor.into(), IndexMap::new());
        }
        let root_after = map_storage::<String, IndexMap<String, bool>>(rows.capacity())
            .ok_or(ExecutionError::Capacity)?;
        let flags = rows.get_mut(actor).ok_or(ExecutionError::Invariant)?;
        if before.is_none() {
            flags.try_reserve(1).map_err(|_| ExecutionError::Capacity)?;
        }
        let actual = root_after
            .checked_sub(root_before)
            .and_then(|n| {
                n.checked_add(
                    map_storage::<String, bool>(flags.capacity())?.checked_sub(flags_before)?,
                )
            })
            .and_then(|n| n.checked_add(payload))
            .ok_or(ExecutionError::Capacity)?;
        if actual > growth {
            return Err(ExecutionError::Invariant);
        }
        host.release_milestone_allocation(growth - actual)?;
        self.edits
            .last_mut()
            .expect("recorded inverse")
            .unreconciled_growth = 0;
        let flags = host
            .actor_milestones
            .as_mut()
            .and_then(|rows| rows.get_mut(actor))
            .ok_or(ExecutionError::Invariant)?;
        if let Some(prior) = flags.get_mut(key) {
            *prior = true;
        } else {
            flags.insert(key.into(), true);
        }
        Ok(())
    }
    pub(crate) fn rollback(
        &mut self,
        host: &mut InstalledHostSettings,
    ) -> Result<(), ExecutionError> {
        while let Some(edit) = self.edits.last_mut() {
            // A fallible allocator may stop between the two funded reserves.
            // Settle unused admission against only these touched maps; retained
            // backing remains charged and no whole-host recount is needed.
            if edit.unreconciled_growth != 0 {
                let rows = host.actor_milestones.as_ref();
                let root = map_storage::<String, IndexMap<String, bool>>(
                    rows.map_or(0, IndexMap::capacity),
                )
                .ok_or(ExecutionError::Capacity)?;
                let flags = rows.and_then(|rows| rows.get(&edit.actor));
                let flag_bytes = map_storage::<String, bool>(flags.map_or(0, IndexMap::capacity))
                    .ok_or(ExecutionError::Capacity)?;
                let actor_bytes = if edit.created_actor {
                    rows.and_then(|rows| rows.get_key_value(&edit.actor))
                        .map_or(0, |(key, _)| key.capacity())
                } else {
                    0
                };
                let actual = root
                    .checked_sub(edit.root_backing_before)
                    .and_then(|n| n.checked_add(flag_bytes.checked_sub(edit.flags_backing_before)?))
                    .and_then(|n| n.checked_add(actor_bytes))
                    .ok_or(ExecutionError::Invariant)?;
                let unused = edit
                    .unreconciled_growth
                    .checked_sub(actual)
                    .ok_or(ExecutionError::Invariant)?;
                host.release_milestone_allocation(unused)?;
                edit.unreconciled_growth = 0;
            }
            let Some(rows) = host.actor_milestones.as_mut() else {
                self.edits.pop();
                continue;
            };
            if edit.created_actor {
                if let Some((key, flags)) = rows.shift_remove_entry(&edit.actor) {
                    let bytes = key
                        .capacity()
                        .checked_add(
                            crate::host::retained_size::HeapBytes::heap_bytes(&flags)
                                .ok_or(ExecutionError::Capacity)?,
                        )
                        .ok_or(ExecutionError::Capacity)?;
                    drop(key);
                    drop(flags);
                    host.release_milestone_allocation(bytes)?;
                }
            } else if let Some(flags) = rows.get_mut(&edit.actor) {
                if let Some(before) = edit.before {
                    if let Some(value) = flags.get_mut(&edit.key) {
                        *value = before;
                    }
                } else if let Some((key, _)) = flags.shift_remove_entry(&edit.key) {
                    let bytes = key.capacity();
                    drop(key);
                    host.release_milestone_allocation(bytes)?;
                }
            }
            self.edits.pop();
        }
        if !self.present_before {
            host.actor_milestones = None;
            host.restore_milestone_storage(self.storage_before)?;
        }
        Ok(())
    }
    pub(crate) fn encode(
        &self,
        host: &InstalledHostSettings,
        state: &SimulationState,
        output: &mut RowEncoder<'_>,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        if !self.changed() {
            return Ok(());
        }
        let error =
            || RecordEncodingError("Milestone save requires its actual host/placement owner.");
        let rows = host.actor_milestones.as_ref().ok_or_else(error)?;
        let coverage = state
            .records
            .coverage("actor_milestones", "[]")
            .ok_or_else(error)?;
        if !coverage.complete {
            return Err(error());
        }
        let membership = self.edits.iter().any(|edit| edit.created_actor);
        let _dirty_storage = budget
            .reserve(map_storage::<&str, ()>(self.edits.len()).ok_or_else(error)?)
            .map_err(|_| error())?;
        let mut dirty = IndexMap::with_capacity(self.edits.len());
        for edit in &self.edits {
            dirty.insert(edit.actor.as_str(), ());
        }
        let mut next = coverage.next_ordinal;
        let mut write = |position: u64,
                         actor: &str,
                         flags: &IndexMap<String, bool>|
         -> Result<(), RecordEncodingError> {
            let changed = dirty.contains_key(actor);
            let address = SelectedPlacement::new(
                &state.records,
                "actor_milestones",
                &["actorMilestones", actor],
                &[],
                actor,
                position,
                false,
                budget,
            )?;
            if changed
                || state
                    .records
                    .placement("actor_milestones", &address.value().id)
                    .is_some_and(|p| p.position != position)
            {
                output.write(
                    "actor_milestones",
                    address.value(),
                    flags,
                    &[],
                    address.create(),
                    RowEffects::default(),
                )?;
            }
            next = next.max(position.checked_add(1).ok_or_else(error)?);
            Ok(())
        };
        if membership {
            for (position, actor, flags) in OrderedMapRows::new(rows, budget)?.iter() {
                write(position, actor, flags)?;
            }
        } else {
            for edit in &self.edits {
                let flags = rows.get(&edit.actor).ok_or_else(error)?;
                let id_bytes =
                    crate::encoding::json_record_len(&["actorMilestones", edit.actor.as_str()])
                        .map_err(|_| error())?;
                let _id_guard = budget
                    .reserve(id_bytes.checked_mul(2).ok_or_else(error)?)
                    .map_err(|_| error())?;
                let id = crate::encoding::json_record(&["actorMilestones", edit.actor.as_str()])
                    .map_err(|_| error())?;
                let position = state
                    .records
                    .placement("actor_milestones", &id)
                    .ok_or_else(error)?
                    .position;
                write(position, &edit.actor, flags)?;
            }
        }
        output.observe_owner(&OwnerCoverage {
            table: "actor_milestones".into(),
            owner: "[]".into(),
            complete: true,
            next_ordinal: next,
            parent_present: true,
        })
    }
}
