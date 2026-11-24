//! Private diagnostics keep only provenance from the actual signed dialogue
//! cuts. This witness grants no execution authority or access to another mind.
use super::{
    NativeWorldSession, RuntimeError, RuntimeNpcPublication, RuntimeNpcRead,
    RuntimeNpcResponseTicket, failure,
};
use crate::{
    capture::{NpcBindingPurpose, NpcHistoricalScope},
    host::{ByteBudget, ByteReservation, CapacityError, retained_size::heap_sum},
    response::ResponseConsumer,
    simulation::SimulationState,
};
use serde::{Deserialize, Serialize};
use std::mem::size_of;

pub(super) struct StageCut {
    knowledge_revision: u64,
    mind_revision: u64,
    manifest_revision: u64,
}

impl StageCut {
    pub(super) fn capture(state: &SimulationState, actor: &str) -> Option<Self> {
        Some(Self {
            knowledge_revision: state.reception.knowledge_revision(actor),
            mind_revision: state.minds.minds.as_ref()?.get(actor)?.revision,
            manifest_revision: state.installed.manifest.revision,
        })
    }
}

/// The saved, body-free proof for one exact, source-checked provider stage.
/// The host binds it to the original job/attempt and funds the decoded value.
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RuntimeNpcStageWitness {
    world_id: String,
    generation: String,
    actor_id: String,
    physical_life: u64,
    through_time: f64,
    privacy_revision: u64,
    knowledge_revision: u64,
    mind_revision: u64,
    manifest_revision: u64,
}

impl RuntimeNpcStageWitness {
    pub fn actor_id(&self) -> &str {
        &self.actor_id
    }
}

impl RuntimeNpcRead {
    pub fn stage_capture_enabled(&self) -> bool {
        self.historical_scope.stage_capture
    }
}

impl RuntimeNpcResponseTicket {
    /// Fund only the compact disclosure proof. The stand-alone formatter has
    /// already checked that this stage projects only the supported families.
    pub fn stage_witness(
        &self,
        budget: &ByteBudget,
    ) -> Result<Option<(RuntimeNpcStageWitness, ByteReservation)>, RuntimeError> {
        let Some(current) = &self.current.stage_cut else {
            return Ok(None);
        };
        let owner = &self.current.historical_scope;
        let matches = |scope: &NpcHistoricalScope| {
            scope.stage_capture
                && scope.actor_id == owner.actor_id
                && scope.world_id == owner.world_id
                && scope.generation == owner.generation
                && scope.physical_life == owner.physical_life
                && scope.privacy_revision == owner.privacy_revision
                && scope.at <= owner.at
        };
        if self.bindings.consumer != ResponseConsumer::Chat
            || self.bindings.purpose != NpcBindingPurpose::Decision
            || self.checks_query_evidence
            || self.original.activity_inspection.is_some()
            || !matches(&self.original.historical_scope)
            || !self.current.stage_notes_match(current.knowledge_revision)
            || self
                .bindings
                .selected_personal
                .iter()
                .any(|(inventory, _)| {
                    self.original.sources.get(*inventory).is_none_or(|source| {
                        !matches(&source.scope)
                            || source.stage_knowledge_revision != Some(current.knowledge_revision)
                    })
                })
        {
            return Ok(None);
        }
        let storage = budget.reserve(
            heap_sum([
                size_of::<RuntimeNpcStageWitness>(),
                owner.world_id.len(),
                owner.generation.len(),
                owner.actor_id.len(),
            ])
            .ok_or(CapacityError)?,
        )?;
        Ok(Some((
            RuntimeNpcStageWitness {
                world_id: owner.world_id.clone(),
                generation: owner.generation.clone(),
                actor_id: owner.actor_id.clone(),
                physical_life: owner.physical_life,
                through_time: owner.at,
                privacy_revision: owner.privacy_revision,
                knowledge_revision: current.knowledge_revision,
                mind_revision: current.mind_revision,
                manifest_revision: current.manifest_revision,
            },
            storage,
        )))
    }
}

impl NativeWorldSession {
    /// Check the historical source before entering the NPC send's existing
    /// publication lease. The host owns the same session turn for both.
    pub fn npc_stage_current(
        &self,
        witness: &RuntimeNpcStageWitness,
    ) -> Result<Result<(), &'static str>, RuntimeError> {
        self.require_active()?;
        let state = &self.session.accepted().map_err(failure)?.state;
        if state.generation != witness.generation || state.physical.header.id != witness.world_id {
            return Ok(Err("native-stage-timeline"));
        }
        if !(state.physical.header.sim_time >= witness.through_time) {
            return Ok(Err("native-stage-chronology"));
        }
        let actor_id = witness.actor_id();
        let body_current = state.physical.entities.get(actor_id).is_some_and(|entity| {
            entity.has_memory()
                && entity.actor.as_ref().is_some_and(|actor| {
                    actor.controller == "npc"
                        && actor.physical_life.unwrap_or(0) == witness.physical_life
                })
        });
        if !body_current {
            return Ok(Err("native-stage-actor-life"));
        }
        let privacy = state
            .experience
            .actor(actor_id)
            .map_or(0, |actor| actor.privacy.revision());
        if privacy != witness.privacy_revision {
            return Ok(Err("native-stage-privacy-revision"));
        }
        let Some(current) = StageCut::capture(state, actor_id) else {
            return Ok(Err("native-stage-mind-unavailable"));
        };
        if current.knowledge_revision != witness.knowledge_revision {
            return Ok(Err("native-stage-knowledge-revision"));
        }
        if current.mind_revision != witness.mind_revision {
            return Ok(Err("native-stage-mind-revision"));
        }
        if current.manifest_revision != witness.manifest_revision {
            return Ok(Err("native-stage-manifest-revision"));
        }
        Ok(Ok(()))
    }

    /// Check the exact historical owner and own its independent read lease.
    /// Hold the lease through synchronous handoff only.
    pub fn npc_stage_publication(
        &self,
        witness: &RuntimeNpcStageWitness,
    ) -> Result<Result<RuntimeNpcPublication, &'static str>, RuntimeError> {
        if let Err(reason) = self.npc_stage_current(witness)? {
            return Ok(Err(reason));
        }
        Ok(Ok(RuntimeNpcPublication {
            _lease: self.session.fence().begin_publication().map_err(failure)?,
        }))
    }
}
