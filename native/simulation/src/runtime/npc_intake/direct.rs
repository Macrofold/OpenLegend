//! Direct application wakeup reads over the same committed native owners.
//! The scheduler retains admission metadata, never a second world or account.

use super::*;
use crate::experience::{PersonalSourceKind, PersonalSourceRef};

pub struct NpcSchedulePopulation {
    pub world: String,
    pub generation: String,
    pub paused: bool,
    pub now: f64,
    pub actors: Vec<String>,
    _storage: ByteReservation,
}

pub struct NpcScheduleSources {
    pub references: Vec<PersonalSourceRef>,
    _storage: ByteReservation,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NpcScheduleCause<'a> {
    key: &'a str,
    qualitative_revision: &'a str,
    pub severity: f64,
    generation: u64,
}

impl RuntimeNpcTrigger {
    /// The inspected cut must carry the same exact inputs as the queued wake.
    pub fn matches_queue(&self, queued: &NpcQueueInputs) -> bool {
        self.read.matches_queue(queued)
    }

    pub fn schedule_causes(&self) -> impl ExactSizeIterator<Item = NpcScheduleCause<'_>> {
        self.read
            .semantic_causes()
            .iter()
            .map(|cause| NpcScheduleCause {
                key: &cause.key,
                qualitative_revision: &cause.qualitative_revision,
                severity: cause.severity,
                generation: cause.generation,
            })
    }
}

impl NativeWorldSession {
    /// Prepare a detached read at the current accepted cut. The trigger
    /// retains validity and cause witnesses independently of the facts the
    /// scheduler needs while awaiting speech receipts.
    pub fn read_npc_schedule(
        &self,
        actor_id: String,
        after_sequence: u64,
        weighed_through: Option<u64>,
        selection: RuntimeNpcIntakeSelection,
    ) -> Result<(RuntimeNpcTrigger, NpcScheduleFacts), RuntimeError> {
        self.require_active()?;
        if after_sequence > crate::identity::MAX_SAFE_INTEGER
            || weighed_through.is_some_and(|through| through > crate::identity::MAX_SAFE_INTEGER)
        {
            return Err(failure("invalid NPC schedule cursor"));
        }
        let state = &self.session.accepted().map_err(session_failure)?.state;
        let request = crate::capture::npc_intake::NpcIntakeReadRequest {
            actor_id,
            after_sequence,
            weighed_through,
            selection,
            schedule_through: Some(self.session.durable_identity_through()),
        };
        let (read, facts) =
            crate::capture::npc_intake::capture_schedule(state, request, &self.budget)
                .map_err(|error| session_failure(error.into()))?;
        Ok((RuntimeNpcTrigger { read }, facts))
    }

    /// Membership is cheap and uses the actual accepted entity, before an
    /// affected-row hint can prepare private evidence for a non-NPC owner.
    pub fn npc_schedule_enrolled(&self, actor: &str) -> Result<bool, RuntimeError> {
        self.require_active()?;
        let state = &self.session.accepted().map_err(session_failure)?.state;
        Ok(state.physical.entities.get(actor).is_some_and(|entity| {
            entity.has_memory()
                && entity
                    .actor
                    .as_ref()
                    .is_some_and(|actor| actor.alive && actor.controller == "npc")
        }) && state
            .minds
            .minds
            .as_ref()
            .is_some_and(|minds| minds.contains_key(actor)))
    }

    pub fn npc_schedule_durable_identity(&self) -> Result<u64, RuntimeError> {
        self.require_active()?;
        Ok(self.session.durable_identity_through())
    }
    /// Select the real semantic owners of this installation. World-wide
    /// enrollment is needed on startup/replacement, not during every turn.
    pub fn npc_schedule_population(&self) -> Result<NpcSchedulePopulation, RuntimeError> {
        self.require_active()?;
        let state = &self.session.accepted().map_err(session_failure)?.state;
        let actors = || {
            state
                .physical
                .entities
                .ordered_ids()
                .filter_map(|id| state.physical.entities.get(id))
                .filter(|entity| {
                    entity.has_memory()
                        && entity
                            .actor
                            .as_ref()
                            .is_some_and(|actor| actor.alive && actor.controller == "npc")
                })
        };
        let size = actors()
            .try_fold(256usize, |n, entity| {
                n.checked_add(2 * size_of::<String>() + entity.id.len())
            })
            .and_then(|n| n.checked_add(state.physical.header.id.len() + state.generation.len()))
            .ok_or_else(|| failure("capacity"))?;
        let custody = self.budget.reserve(size)?;
        Ok(NpcSchedulePopulation {
            world: state.physical.header.id.clone(),
            generation: state.generation.clone(),
            paused: self.clock()?.paused,
            now: state.physical.header.sim_time,
            actors: actors()
                .filter(|entity| {
                    state
                        .minds
                        .minds
                        .as_ref()
                        .is_some_and(|minds| minds.contains_key(&entity.id))
                })
                .map(|entity| entity.id.clone())
                .collect(),
            _storage: custody,
        })
    }

    /// Prove both the retained intake selection and its actual current source
    /// versions at one accepted cut. Rust owns the selected account headers;
    /// the application supplies only the IDs chosen from its original read.
    pub fn npc_schedule_sources(
        &self,
        trigger: &RuntimeNpcTrigger,
        actor: &str,
        selected: &[(PersonalSourceKind, String)],
    ) -> Result<Option<NpcScheduleSources>, RuntimeError> {
        self.require_active()?;
        if !self.npc_trigger_current(trigger)? {
            return Ok(None);
        }
        let state = &self.session.accepted().map_err(session_failure)?.state;
        if !trigger.read.matches_actor(actor) {
            return Ok(None);
        }
        let mut storage = self
            .budget
            .reserve(256 + selected.len() * size_of::<PersonalSourceRef>())
            .map_err(RuntimeError::from)?;
        let mut references = Vec::with_capacity(selected.len());
        for (kind, id) in selected {
            let Some(collection) = state
                .experience
                .optional_collection(actor, *kind)
                .map_err(|error| session_failure(error.into()))?
            else {
                return Ok(None);
            };
            let Some(account) = collection.resident_record(id) else {
                return Ok(None);
            };
            let reference = &account.header().reference;
            storage
                .resize(
                    storage
                        .bytes()
                        .checked_add(reference.id.len() + reference.revision.len())
                        .ok_or(CapacityError)?,
                )
                .map_err(RuntimeError::from)?;
            references.push(reference.clone());
        }
        Ok(Some(NpcScheduleSources {
            references,
            _storage: storage,
        }))
    }
}
