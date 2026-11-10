//! Earned-time retention through the same sparse journal and actual recurring
//! invocation owner. Reads remain pure; replacing a cohort settles only its
//! affected episodes before the new interval is charged.

use super::*;
use crate::host::retained_size::map_storage;
use crate::values::RetainedBinding;
use indexmap::IndexSet;

impl CoreMutation<'_> {
    /// Source's default world-edit boundary settles already-earned arithmetic
    /// and retires its sampling prediction. Typed live commands keep their
    /// separate scoped retention rules.
    pub(crate) fn materialize_world_edit(&mut self) -> Result<(), ExecutionError> {
        if self.physical().settle_all_numeric_values()? {
            self.journal.sensory.invalidate_all(
                &mut self.state.reception,
                self.state.physical.header.sim_time,
            )?;
        }
        self.state.physical.header.native_interval = None;
        Ok(())
    }

    pub(crate) fn retain_numeric_interval(
        &mut self,
        incoming: Vec<RetainedBinding>,
        seconds: f64,
    ) -> Result<IndexSet<String>, ExecutionError> {
        let installed = self.state.installed.clone();
        let maximum = incoming.len();
        let payload = incoming
            .iter()
            .try_fold(0usize, |sum, binding| {
                sum.checked_add(binding.episode.len())?
                    .checked_add(binding.entity_id.len().checked_mul(2)?)
            })
            .ok_or(ExecutionError::Capacity)?;
        self.journal.physical.reserve(
            payload
                .checked_add(map_storage::<String, ()>(maximum).ok_or(ExecutionError::Capacity)?)
                .and_then(|n| n.checked_add(maximum.checked_mul(size_of::<PhysicalChange>() * 2)?))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut retained = IndexSet::with_capacity(maximum);
        for binding in &incoming {
            retained.insert(binding.episode.clone());
        }
        self.physical()
            .retain_numeric_values(incoming, seconds, &installed)?;
        Ok(retained)
    }
}
impl PhysicalMutation<'_> {
    /// Ordinary Source startup materializes the already-earned deferred window
    /// before its world edit. Use each existing episode's sparse journal; this
    /// neither earns time nor charges another invocation.
    pub(crate) fn settle_all_numeric_values(&mut self) -> Result<bool, ExecutionError> {
        let Some(window) = self.state.pending_values.as_ref() else {
            return Ok(false);
        };
        let bytes = window.bindings.keys().try_fold(
            window
                .bindings
                .len()
                .checked_mul(size_of::<String>())
                .ok_or(ExecutionError::Capacity)?,
            |bytes, key| bytes.checked_add(key.len()).ok_or(ExecutionError::Capacity),
        )?;
        self.journal.reserve(bytes)?;
        let mut episodes: Vec<String> = window.bindings.keys().cloned().collect();
        episodes.sort_by(|left, right| crate::encoding::js_property_cmp(left, right));
        for episode in &episodes {
            self.settle_episode(episode)?;
        }
        Ok(!episodes.is_empty())
    }

    fn retain_numeric_values(
        &mut self,
        incoming: Vec<RetainedBinding>,
        seconds: f64,
        installed: &crate::simulation::InstalledWorld,
    ) -> Result<(), ExecutionError> {
        if !seconds.is_finite() || seconds <= 0.0 {
            return Err(ExecutionError::Invariant);
        }
        // The borrowed selected index and returned replaced IDs are temporary
        // source-local work, not a second canonical attribute table.
        if let Some(window) = self.state.pending_values.as_ref() {
            let ids = window
                .bindings
                .values()
                .try_fold(0usize, |sum, binding| {
                    sum.checked_add(binding.episode.len())
                })
                .ok_or(ExecutionError::Capacity)?;
            self.journal.reserve(
                ids.checked_add(
                    window
                        .bindings
                        .len()
                        .checked_mul(size_of::<String>())
                        .ok_or(ExecutionError::Capacity)?,
                )
                .and_then(|n| n.checked_add(map_storage::<&str, &RetainedBinding>(incoming.len())?))
                .ok_or(ExecutionError::Capacity)?,
            )?;
            let replaced = window.replaced_episodes(&incoming);
            for episode in replaced {
                self.settle_episode(&episode)?;
            }
        }
        if incoming.is_empty() {
            return Ok(());
        }
        // Retention charges the already admitted exact invocation directly.
        // Calling ordinary charge_work here would settle its live binding and
        // turn every earned-time segment back into an eager write.
        for binding in &incoming {
            let invocation = self
                .state
                .work
                .invocation(&binding.episode)
                .ok_or(ValueError::MissingInvocation)?;
            self.journal.reserve(
                size_of::<InvocationEdit>() * 4
                    + invocation.id.len()
                    + invocation.root_id.len()
                    + invocation.actor_id.len()
                    + invocation.module_id.len()
                    + invocation.definition_pin.id.len()
                    + invocation.definition_pin.digest.len(),
            )?;
            let plan = self
                .state
                .work
                .plan_interval(&binding.episode, self.state.header.sim_time)?;
            self.apply_work(plan)?;
            let plan = self.state.work.plan_charge(
                &binding.episode,
                WorkDemand {
                    tests: Some(binding.demand.tests),
                    effects: Some(binding.demand.effects),
                    ..Default::default()
                },
            )?;
            self.apply_work(plan)?;
        }
        let new_count = incoming
            .iter()
            .filter(|binding| {
                self.state
                    .pending_values
                    .as_ref()
                    .is_none_or(|window| !window.bindings.contains_key(&binding.episode))
            })
            .count();
        let window = self.state.pending_values.as_ref();
        let binding_needed = window
            .map_or(0, |window| window.bindings.len())
            .checked_add(new_count)
            .ok_or(ExecutionError::Capacity)?;
        let subject_needed = window
            .map_or(0, |window| window.by_entity.len())
            .checked_add(new_count)
            .ok_or(ExecutionError::Capacity)?;
        let bindings_growth =
            if window.is_some_and(|window| binding_needed <= window.bindings.capacity()) {
                0
            } else {
                map_storage::<String, NativeValueBinding>(
                    binding_needed
                        .checked_mul(2)
                        .and_then(|n| n.checked_add(8))
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?
            };
        let subjects_growth =
            if window.is_some_and(|window| subject_needed <= window.by_entity.capacity()) {
                0
            } else {
                map_storage::<String, IndexMap<String, String>>(
                    subject_needed
                        .checked_mul(2)
                        .and_then(|n| n.checked_add(8))
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?
            };
        self.journal.reserve(
            heap_sum([
                bindings_growth,
                subjects_growth,
                map_storage::<&str, usize>(incoming.len()).ok_or(ExecutionError::Capacity)?,
                incoming
                    .len()
                    .checked_mul(size_of::<(String, bool, bool, bool)>())
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut links_needed: IndexMap<&str, usize> = IndexMap::with_capacity(incoming.len());
        for binding in &incoming {
            if self
                .state
                .pending_values
                .as_ref()
                .is_some_and(|window| window.bindings.contains_key(&binding.episode))
            {
                continue;
            }
            let count = links_needed.entry(&binding.entity_id).or_insert_with(|| {
                self.state
                    .pending_values
                    .as_ref()
                    .and_then(|window| window.by_entity.get(&binding.entity_id))
                    .map_or(0, IndexMap::len)
            });
            *count = count
                .checked_add(binding.attributes.len())
                .ok_or(ExecutionError::Capacity)?;
        }
        for (entity, needed) in links_needed {
            let existing = self
                .state
                .pending_values
                .as_ref()
                .and_then(|window| window.by_entity.get(entity));
            if existing.is_none_or(|links| needed > links.capacity()) {
                self.journal.reserve(
                    map_storage::<String, String>(
                        needed
                            .checked_mul(2)
                            .and_then(|n| n.checked_add(8))
                            .ok_or(ExecutionError::Capacity)?,
                    )
                    .ok_or(ExecutionError::Capacity)?,
                )?;
            }
        }
        let before = self
            .state
            .pending_values
            .as_ref()
            .map(|window| WindowClock {
                elapsed_seconds: window.elapsed_seconds,
                sim_time: window.sim_time,
                binding_count: window.binding_count,
            });
        self.journal.reserve(size_of::<Undo>() * 2)?;
        if self.journal.first(&UndoKey::NativeWindow)? {
            self.journal
                .retain(UndoKey::NativeWindow, Undo::NativeWindow { before })?;
        }
        let mut effects = Vec::with_capacity(incoming.len());
        for binding in &incoming {
            let changed = binding
                .attributes
                .values()
                .any(|attribute| attribute.changed);
            let outward = binding.attributes.iter().any(|(id, attribute)| {
                attribute.changed
                    && installed
                        .attributes
                        .get(id)
                        .is_some_and(|definition| definition.value().disclosure == "public")
            });
            let observer = self
                .state
                .entities
                .get(&binding.entity_id)
                .ok_or(ExecutionError::MissingEntity)?;
            let parameters = binding.attributes.iter().any(|(id, attribute)| {
                attribute.changed && installed.account_law().affects_observation(observer, id)
            });
            let new = self
                .state
                .pending_values
                .as_ref()
                .is_none_or(|window| !window.bindings.contains_key(&binding.episode));
            if new {
                let mut bytes = heap_sum([
                    size_of::<Undo>() * 2,
                    binding.heap_bytes().ok_or(ExecutionError::Capacity)?,
                    binding
                        .entity_id
                        .len()
                        .checked_mul(2)
                        .ok_or(ExecutionError::Capacity)?,
                    binding
                        .episode
                        .len()
                        .checked_mul(3)
                        .ok_or(ExecutionError::Capacity)?,
                    binding
                        .attributes
                        .len()
                        .checked_mul(size_of::<String>())
                        .ok_or(ExecutionError::Capacity)?,
                ])
                .ok_or(ExecutionError::Capacity)?;
                for id in binding.attributes.keys() {
                    bytes = bytes
                        .checked_add(id.len().checked_mul(2).ok_or(ExecutionError::Capacity)?)
                        .and_then(|n| n.checked_add(binding.episode.len()))
                        .ok_or(ExecutionError::Capacity)?;
                }
                self.journal.reserve(bytes)?;
                self.journal
                    .undo
                    .try_reserve(1)
                    .map_err(|_| ExecutionError::Capacity)?;
                self.journal.undo.push(Undo::RetainedBinding {
                    episode: binding.episode.clone(),
                    entity_id: binding.entity_id.clone(),
                });
            }
            self.journal.reserve(binding.entity_id.len())?;
            effects.push((binding.entity_id.clone(), changed, outward, parameters));
        }
        crate::values::retain_segment(
            &mut self.state.pending_values,
            incoming,
            seconds,
            self.state.header.sim_time,
        )?;
        for (entity, changed, outward, parameters) in effects {
            if changed {
                self.journal
                    .reserve(size_of::<PhysicalChange>() * 2 + entity.len() * 2)?;
                self.journal.change(PhysicalChange::Attribute {
                    entity_id: entity.clone(),
                    outward_change: outward,
                })?;
            }
            if parameters {
                self.journal
                    .reserve(size_of::<PhysicalChange>() * 2 + entity.len() * 2)?;
                self.journal.change(PhysicalChange::ObservationParameters {
                    entity_id: entity,
                    request_detail: false,
                })?;
            }
        }
        Ok(())
    }
}
