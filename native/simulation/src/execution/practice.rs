//! Explicit evidence revocation also reaches coaching supplied by this actor
//! to another actor. Scan work and the actual affected progress join the same
//! work meter, sparse physical journal and attribute-change notice owner.

use super::*;
use crate::host::retained_size::heap_record;
use crate::work::WorkUnit;

heap_record!(crate::state::ReleaseSupport {
    occurrence_id,
    event_id
});
heap_record!(crate::state::CoachingSupport {
    event_id,
    observed,
    coach_id,
    coach_evidence_id,
    learner_evidence_id
});
heap_record!(crate::state::PracticeProgress { releases, coaching });

impl CoreMutation<'_> {
    pub(crate) fn revoke_practice_support(
        &mut self,
        actor_id: &str,
        selected: &IndexSet<String>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let _handles = budget.reserve(
            self.state
                .physical
                .entities
                .len()
                .checked_mul(size_of::<EntityHandle>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut handles = Vec::new();
        handles
            .try_reserve_exact(self.state.physical.entities.len())
            .map_err(|_| ExecutionError::Capacity)?;
        for id in self.state.physical.entities.ordered_ids() {
            handles.push(
                self.state
                    .physical
                    .entities
                    .handle(id)
                    .ok_or(ExecutionError::Invariant)?,
            );
        }
        for handle in handles {
            self.journal.meters.charge(&[(WorkUnit::Tests, 1)])?;
            let entity = self
                .state
                .physical
                .entities
                .resolve(handle)
                .ok_or(ExecutionError::Invariant)?;
            let Some(practice) = entity
                .actor
                .as_ref()
                .and_then(|actor| actor.practice.as_ref())
            else {
                continue;
            };
            let _order = budget.reserve(
                practice
                    .len()
                    .checked_mul(size_of::<usize>())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let mut order = Vec::new();
            order
                .try_reserve_exact(practice.len())
                .map_err(|_| ExecutionError::Capacity)?;
            order.extend(0..practice.len());
            order.sort_by(|a, b| {
                crate::encoding::js_property_cmp(
                    practice.get_index(*a).expect("Current practice index").0,
                    practice.get_index(*b).expect("Current practice index").0,
                )
            });
            for index in order {
                self.physical()
                    .revoke_practice_member(handle, index, actor_id, selected)?;
            }
        }
        Ok(())
    }
}
impl PhysicalMutation<'_> {
    fn revoke_practice_member(
        &mut self,
        handle: EntityHandle,
        index: usize,
        actor_id: &str,
        selected: &IndexSet<String>,
    ) -> Result<(), ExecutionError> {
        let entity = self
            .state
            .entities
            .resolve(handle)
            .ok_or(ExecutionError::Invariant)?;
        let (key, progress) = entity
            .actor
            .as_ref()
            .and_then(|actor| actor.practice.as_ref())
            .and_then(|practice| practice.get_index(index))
            .ok_or(ExecutionError::Invariant)?;
        let own = entity.id == actor_id;
        let releases = own
            && progress.releases.iter().any(|support| {
                selected.contains(&support.event_id) || selected.contains(&support.occurrence_id)
            });
        let coaching = progress.coaching.as_ref().is_some_and(|help| {
            own && [
                &help.event_id,
                &help.observed.event_id,
                &help.observed.occurrence_id,
                &help.learner_evidence_id,
            ]
            .into_iter()
            .any(|id| selected.contains(id))
                || help.coach_id == actor_id
                    && [
                        &help.event_id,
                        &help.observed.event_id,
                        &help.observed.occurrence_id,
                        &help.coach_evidence_id,
                    ]
                    .into_iter()
                    .any(|id| selected.contains(id))
        });
        if !releases && !coaching {
            return Ok(());
        }
        let revision = progress
            .revision
            .checked_add(1)
            .filter(|revision| *revision <= MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Identity)?;
        let bytes = heap_sum([
            key.len().checked_mul(3).ok_or(ExecutionError::Capacity)?,
            entity.id.len(),
            progress.heap_bytes().ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        self.journal.reserve(bytes)?;
        let undo_key = UndoKey::Practice(handle.slot, handle.generation, key.clone());
        if self.journal.first(&undo_key)? {
            self.journal.retain(
                undo_key,
                Undo::Practice {
                    entity: handle,
                    key: key.clone(),
                    before: progress.clone(),
                },
            )?;
        }
        let entity_id = entity.id.clone();
        let progress = self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|entity| entity.actor.as_mut())
            .and_then(|actor| actor.practice.as_mut())
            .and_then(|practice| practice.get_index_mut(index))
            .ok_or(ExecutionError::Invariant)?
            .1;
        if releases {
            progress.releases.retain(|support| {
                !selected.contains(&support.event_id) && !selected.contains(&support.occurrence_id)
            });
        }
        if coaching {
            progress.coaching = None;
        }
        progress.revision = revision;
        self.journal.change(PhysicalChange::Attribute {
            entity_id,
            outward_change: true,
        })
    }
}
