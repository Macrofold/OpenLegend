//! Explicit evidence revocation also reaches coaching supplied by this actor
//! to another actor. Scan work and the actual affected progress join the same
//! work meter, sparse physical journal and attribute-change notice owner.

use super::*;
use crate::activity::PracticeReleaseFacts;
use crate::host::retained_size::heap_record;
use crate::state::{PracticeProgress, ReleaseSupport};
use crate::status::PracticeProfile;
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

impl PracticeProgress {
    /// Apply the installed rule to the remaining lawful support, including
    /// the character's authored starting rank and any completed coaching.
    pub fn rank(&self, profile: &PracticeProfile) -> u64 {
        u64::from(
            self.starting == 1
                || self.releases.len() as u64 >= profile.independent_releases
                || (self.coaching.is_some()
                    && self.releases.len() as u64 >= profile.coached_releases),
        )
    }
}

impl CoreMutation<'_> {
    /// Record this exact committed shot and its owned skill evidence in the
    /// same candidate as the ammunition debit. Returns whether rank improved.
    pub(crate) fn record_practice_release(
        &mut self,
        actor: &str,
        action: &str,
        emitted: &CompletedOccurrence,
        facts: PracticeReleaseFacts<'_>,
    ) -> Result<bool, ExecutionError> {
        let profile = facts
            .definition
            .practice
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let event = emitted.event_id();
        let Some(occurrence) = self
            .journal
            .activity
            .install_practice_release(
                &mut self.state.activity,
                actor,
                action,
                event,
                &facts,
                profile,
            )
            .map_err(ExecutionError::Activity)?
        else {
            return Ok(false);
        };
        self.physical()
            .credit_practice(actor, &facts.definition.id, occurrence, event, profile)
    }

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
    fn practice_before(
        journal: &mut PhysicalJournal,
        handle: EntityHandle,
        actor: &str,
        key: &str,
        progress: &PracticeProgress,
        growth: usize,
    ) -> Result<u64, ExecutionError> {
        let revision = progress
            .revision
            .checked_add(1)
            .filter(|revision| *revision <= MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Identity)?;
        let bytes = heap_sum([
            key.len().checked_mul(3).ok_or(ExecutionError::Capacity)?,
            actor.len(),
            progress.heap_bytes().ok_or(ExecutionError::Capacity)?,
            growth,
        ])
        .ok_or(ExecutionError::Capacity)?;
        journal.reserve(bytes)?;
        let undo_key = UndoKey::Practice(handle.slot, handle.generation, key.to_owned());
        if journal.first(&undo_key)? {
            journal.retain(
                undo_key,
                Undo::Practice {
                    entity: handle,
                    key: key.to_owned(),
                    before: progress.clone(),
                },
            )?;
        }
        Ok(revision)
    }

    fn practice_member_mut(
        &mut self,
        handle: EntityHandle,
        index: usize,
    ) -> Result<&mut PracticeProgress, ExecutionError> {
        self.state
            .entities
            .resolve_mut(handle)
            .and_then(|entity| entity.actor.as_mut())
            .and_then(|actor| actor.practice.as_mut())
            .and_then(|practice| practice.get_index_mut(index))
            .map(|(_, progress)| progress)
            .ok_or(ExecutionError::Invariant)
    }

    fn settle_practice_change(
        &mut self,
        handle: EntityHandle,
        entity_id: String,
    ) -> Result<(), ExecutionError> {
        self.state
            .entities
            .settle_practice_memory(handle, &mut self.journal.reservation, false)?;
        self.journal.change(PhysicalChange::Attribute {
            entity_id,
            outward_change: true,
        })
    }

    fn credit_practice(
        &mut self,
        actor: &str,
        attribute: &str,
        occurrence_id: String,
        event: &str,
        profile: &PracticeProfile,
    ) -> Result<bool, ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(actor)
            .ok_or(ExecutionError::MissingActor)?;
        let Some((index, key, progress)) = self
            .state
            .entities
            .resolve(handle)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.practice.as_ref())
            .and_then(|practice| practice.get_full(attribute))
        else {
            return Ok(false);
        };
        let releases = &progress.releases;
        if releases.len() as u64 >= profile.independent_releases
            || releases
                .iter()
                .any(|support| support.occurrence_id == occurrence_id)
        {
            return Ok(false);
        }
        let prior_rank = progress.rank(profile);
        let growth = heap_sum([
            occurrence_id.capacity(),
            event.len(),
            if releases.len() == releases.capacity() {
                size_of::<ReleaseSupport>()
            } else {
                0
            },
        ])
        .ok_or(ExecutionError::Capacity)?;
        let revision = Self::practice_before(self.journal, handle, actor, key, progress, growth)?;
        let progress = self.practice_member_mut(handle, index)?;
        progress
            .releases
            .try_reserve_exact(1)
            .map_err(|_| ExecutionError::Capacity)?;
        progress.releases.push(ReleaseSupport {
            occurrence_id,
            event_id: event.to_owned(),
        });
        progress.revision = revision;
        let improved = prior_rank == 0 && progress.rank(profile) == 1;
        self.settle_practice_change(handle, actor.to_owned())?;
        Ok(improved)
    }

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
        let revision = Self::practice_before(self.journal, handle, &entity.id, key, progress, 0)?;
        let entity_id = entity.id.clone();
        let progress = self.practice_member_mut(handle, index)?;
        if releases {
            progress.releases.retain(|support| {
                !selected.contains(&support.event_id) && !selected.contains(&support.occurrence_id)
            });
        }
        if coaching {
            progress.coaching = None;
        }
        progress.revision = revision;
        self.settle_practice_change(handle, entity_id)
    }
}
