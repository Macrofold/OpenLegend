//! Whole-set sparse proof cleanup, independent of account aging. Indexed SQL
//! proves cold account membership; the sole native support writer releases it.
use super::*;
use crate::commands::Outcome;
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::GeometryBinding;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::{EncounterExposure, SensoryFacet};
use indexmap::IndexSet;
use std::{mem::size_of, sync::Arc};

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct SupportPreparation {
    pub bytes: usize,
    pub rows: usize,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SupportMembershipRequest {
    pub binding: GeometryBinding,
    pub world_id: String,
    pub generation: String,
    pub accepted_cut: u64,
    pub actor_id: String,
    pub aliases: Vec<String>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct SupportMembershipAnswer {
    pub binding: GeometryBinding,
    pub retained: Vec<usize>,
}
struct Candidate {
    record: Arc<TemporalSupportRecord>,
    aliases: Vec<usize>,
}
struct Selection {
    revision: u64,
    candidates: Vec<Candidate>,
    aliases: IndexSet<String>,
    retained: Vec<bool>,
    through: usize,
    request: Option<(SupportMembershipRequest, ByteReservation)>,
    _storage: ByteReservation,
}
pub(crate) struct SupportRetentionCursor {
    key: crate::host::CandidateKey,
    actors: Vec<String>,
    next: usize,
    current: Option<Selection>,
    preparation: SupportPreparation,
    restore: bool,
    _storage: ByteReservation,
}
pub(crate) struct CompletedSupportRetention {
    pub(crate) outcome: Outcome,
    _storage: ByteReservation,
}
pub(crate) enum SupportRetentionStep<'a> {
    Continue,
    Membership(&'a SupportMembershipRequest),
    Complete(CompletedSupportRetention),
}
fn place(capsule: &TemporalSupportCapsule) -> bool {
    capsule.values.iter().any(|value| {
        matches!(
            value,
            ReceivedValueFragment::Sensory(SensoryFacet::EncounterExposure {
                exposure: EncounterExposure::Place { .. }
            })
        )
    })
}
impl SupportRetentionCursor {
    pub(crate) fn new(
        key: crate::host::CandidateKey,
        actors: Vec<String>,
        preparation: SupportPreparation,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if preparation.rows == 0 || preparation.bytes < 2 {
            return Err(ExecutionError::Invariant);
        }
        let storage = budget.reserve(
            heap_sum([
                size_of::<Self>()
                    + size_of::<CompletedSupportRetention>()
                    + "support-retention".len(),
                actors.heap_bytes().ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Self {
            key,
            actors,
            next: 0,
            current: None,
            preparation,
            restore: false,
            _storage: storage,
        })
    }
    /// Complete checkpoint retention checks the whole sparse set and releases
    /// unused proof, without claiming an ordinary dirty-generation settlement.
    pub(crate) fn new_restore(
        key: crate::host::CandidateKey,
        actors: Vec<String>,
        preparation: SupportPreparation,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let mut cursor = Self::new(key, actors, preparation, budget)?;
        cursor.restore = true;
        Ok(cursor)
    }
    fn prepare_actor(
        &self,
        core: &CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<Option<Selection>, ExecutionError> {
        let actor_id = &self.actors[self.next];
        let Some(actor) = core.state.temporal.actor(actor_id) else {
            return Ok(None);
        };
        let Some(accounts) = actor.header().accounts.as_ref() else {
            return Ok(None);
        };
        if !self.restore && accounts.support_dirty_revision == accounts.support_settled_revision {
            return Ok(None);
        }
        let supports = actor.supports();
        if supports.is_none() && actor.header().supports.is_some()
            || supports.is_some_and(|supports| !supports.coverage().complete)
        {
            return Err(ExecutionError::Invariant);
        }
        let meaning = core.state.installed.account_law();
        let mut bytes = size_of::<Selection>();
        let mut capacity = 0usize;
        if let Some(supports) = supports {
            for record in supports.records() {
                let capsule = record.capsule();
                if capsule.required || place(capsule) {
                    continue;
                }
                capacity += 1;
                bytes = heap_sum([
                    bytes,
                    size_of::<Candidate>(),
                    temporal_receipt_aliases_bound(&capsule.receipt, &capsule.values, &meaning)
                        .and_then(|n| n.checked_mul(3))
                        .ok_or(ExecutionError::Capacity)?,
                ])
                .ok_or(ExecutionError::Capacity)?;
            }
        }
        let storage = budget.reserve(bytes)?;
        let held = crate::worlds::selected_held_support_aliases(core, actor_id, budget)?;
        let mut candidates = Vec::with_capacity(capacity);
        let mut aliases = IndexSet::new();
        if let Some(supports) = supports {
            for record in supports.records() {
                let capsule = record.capsule();
                if capsule.required || place(capsule) {
                    continue;
                }
                let keys = temporal_receipt_aliases(
                    &capsule.receipt,
                    &core.state.reception.received_values.as_ref(),
                    &meaning,
                    Some(&capsule.values),
                )?;
                if keys.iter().any(|key| held.keys.contains(key)) {
                    continue;
                }
                let mut positions = Vec::with_capacity(keys.len());
                for key in keys {
                    positions.push(aliases.insert_full(key).0);
                }
                candidates.push(Candidate {
                    record: Arc::clone(record),
                    aliases: positions,
                });
            }
        }
        let retained = vec![false; aliases.len()];
        Ok(Some(Selection {
            revision: accounts.support_dirty_revision,
            candidates,
            aliases,
            retained,
            through: 0,
            request: None,
            _storage: storage,
        }))
    }
    fn prepare_question(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let selection = self.current.as_mut().ok_or(ExecutionError::Invariant)?;
        let binding = GeometryBinding::new(
            self.key,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        );
        let from = selection.through;
        let mut end = from;
        let mut encoded = crate::encoding::json_record_len(&(
            binding,
            &core.state.physical.header.id,
            &core.state.generation,
            &self.actors[self.next],
        ))
        .map_err(|_| ExecutionError::Invariant)?
        .checked_add(128)
        .ok_or(ExecutionError::Capacity)?;
        let mut strings = 0usize;
        while end < selection.aliases.len() && end - from < self.preparation.rows {
            let alias = selection
                .aliases
                .get_index(end)
                .ok_or(ExecutionError::Invariant)?;
            let size =
                crate::encoding::json_record_len(alias).map_err(|_| ExecutionError::Invariant)?;
            if encoded
                .checked_add(size + 1)
                .ok_or(ExecutionError::Capacity)?
                > self.preparation.bytes
            {
                break;
            }
            strings = strings
                .checked_add(alias.len())
                .ok_or(ExecutionError::Capacity)?;
            encoded += size + 1;
            end += 1;
        }
        if end == from {
            return Err(ExecutionError::Capacity);
        }
        let actor_id = &self.actors[self.next];
        let storage = budget.reserve(
            heap_sum([
                size_of::<SupportMembershipRequest>(),
                strings,
                (end - from)
                    .checked_mul(size_of::<String>())
                    .ok_or(ExecutionError::Capacity)?,
                core.state.physical.header.id.len(),
                core.state.generation.len(),
                actor_id.len(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut aliases = Vec::with_capacity(end - from);
        aliases.extend(
            selection
                .aliases
                .iter()
                .skip(from)
                .take(end - from)
                .cloned(),
        );
        let request = SupportMembershipRequest {
            binding,
            world_id: core.state.physical.header.id.clone(),
            generation: core.state.generation.clone(),
            accepted_cut: core.state.accepted_cut,
            actor_id: actor_id.clone(),
            aliases,
        };
        selection.through = end;
        selection.request = Some((request, storage));
        Ok(())
    }
    pub(crate) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<SupportMembershipAnswer>,
        budget: &ByteBudget,
    ) -> Result<SupportRetentionStep<'_>, ExecutionError> {
        if let Some(answer) = answer {
            let selection = self.current.as_mut().ok_or(ExecutionError::Invariant)?;
            let (request, _) = selection
                .request
                .as_ref()
                .ok_or(ExecutionError::Invariant)?;
            if answer.binding != request.binding
                || answer
                    .retained
                    .iter()
                    .any(|index| *index >= request.aliases.len())
            {
                return Err(ExecutionError::Invariant);
            }
            let from = selection.through - request.aliases.len();
            for index in answer.retained {
                selection.retained[from + index] = true;
            }
            selection.request = None;
        }
        if self.next == self.actors.len() {
            let storage = self
                ._storage
                .split_off(size_of::<CompletedSupportRetention>() + "support-retention".len())?;
            return Ok(SupportRetentionStep::Complete(CompletedSupportRetention {
                outcome: Outcome {
                    ok: true,
                    code: "support-retention".into(),
                    message: "".into(),
                    spent: None,
                    outputs: None,
                    recipe_id: None,
                    item_id: None,
                    entity_id: None,
                    goal_id: None,
                    plan_id: None,
                    action_id: None,
                },
                _storage: storage,
            }));
        }
        if self.current.is_none() {
            self.current = self.prepare_actor(core, budget)?;
            if self.current.is_none() {
                self.next += 1;
                return Ok(SupportRetentionStep::Continue);
            }
        }
        if self
            .current
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .request
            .is_some()
        {
            return Err(ExecutionError::Invariant);
        }
        let needs_question = self
            .current
            .as_ref()
            .is_some_and(|selection| selection.through < selection.aliases.len());
        if needs_question {
            self.prepare_question(core, budget)?;
            return Ok(SupportRetentionStep::Membership(
                &self
                    .current
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .request
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .0,
            ));
        }
        let selection = self.current.as_ref().ok_or(ExecutionError::Invariant)?;
        // Complete the whole captured set before inferring absence. Recheck live
        // local ownership as Source's applyAccountRetentionPlan does at apply.
        let actor_id = &self.actors[self.next];
        let held = crate::worlds::selected_held_support_aliases(core, actor_id, budget)?;
        let installed = Arc::clone(&core.state.installed);
        let now = core.state.physical.header.sim_time;
        let mut changed = false;
        for candidate in &selection.candidates {
            if candidate.aliases.iter().any(|index| {
                selection.retained[*index]
                    || selection
                        .aliases
                        .get_index(*index)
                        .is_some_and(|id| held.keys.contains(id))
            }) {
                continue;
            }
            let id = &candidate.record.capsule().receipt.id;
            let Some(current) = core
                .state
                .temporal
                .actor(actor_id)
                .and_then(|actor| actor.supports())
                .and_then(|supports| supports.get(id).transpose())
                .transpose()?
            else {
                continue;
            };
            if !Arc::ptr_eq(current, &candidate.record) {
                continue;
            }
            core.state.temporal.release_support(
                actor_id,
                id,
                now,
                &installed.attention.value().retention,
                None,
            )?;
            changed = true;
        }
        if !self.restore {
            changed |= core
                .state
                .temporal
                .settle_support_cleanup(actor_id, selection.revision)?;
            if changed {
                // Source publishes this cleanup through updateWorld. Only its
                // actual mutation discards inherited sampling progress.
                // docs/simulation-time.md#native-interval-contract
                core.state.physical.header.native_interval = None;
            }
        }
        self.current = None;
        self.next += 1;
        Ok(SupportRetentionStep::Continue)
    }
}
