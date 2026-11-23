//! Hold no Rust world state across the bounded inspection query.

use super::*;

/// Canonical save owners for one live personal evidence listing. The trusted
/// application retains only the selected actor's keys before releasing the turn.
pub struct RuntimeMemoryPageRead<'a> {
    pub world_id: &'a str,
    pub generation: &'a str,
    pub actor: &'a str,
    pub memory_revision: u64,
    pub durable_revision: u64,
    pub in_flight_through: Option<u64>,
    pub life: u64,
    pub sequence: u64,
    pub detached: Option<&'a crate::records::ChangedRows>,
    pub suffix: &'a crate::records::ChangedRows,
}

impl NativeWorldSession {
    /// Borrow pending memory rows at the same accepted cut as the caller's
    /// authorized personal-history capture. No body is copied by this callback.
    pub fn with_memory_page_read<T>(
        &self,
        actor: &str,
        prepare: impl FnOnce(RuntimeMemoryPageRead<'_>) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        let state = &self.session.accepted().map_err(failure)?.state;
        let Some(life) = actor_life(state, actor) else {
            return Ok(None);
        };
        let (cut, save) = self.session.accepted_save_read().map_err(failure)?;
        let (detached, suffix) = save.pending_read_rows();
        Ok(Some(prepare(RuntimeMemoryPageRead {
            world_id: &state.physical.header.id,
            generation: &state.generation,
            actor,
            memory_revision: self.memory_revision(state, actor)?,
            durable_revision: cut.durable_revision,
            in_flight_through: cut.in_flight_through,
            life,
            sequence: state.physical.header.sequence,
            detached,
            suffix,
        })))
    }

    /// Check the selected actor's physical life inside an already held
    /// private history disclosure. That read owns world and privacy checks.
    pub fn memory_page_subject_current(
        &self,
        actor: &str,
        life: u64,
        revision: u64,
    ) -> Result<bool, RuntimeError> {
        let state = &self.session.publication_read().map_err(failure)?.state;
        Ok(actor_life(state, actor) == Some(life)
            && self.memory_revision(state, actor)? == revision)
    }

    fn memory_revision(
        &self,
        state: &crate::simulation::SimulationState,
        actor: &str,
    ) -> Result<u64, RuntimeError> {
        let _key = self.budget.reserve(512 + 8 * actor.len())?;
        let owner = crate::experience::collection_owner(
            crate::experience::PersonalSourceKind::Memory,
            actor,
        )
        .map_err(failure)?;
        Ok(state.records.memory_revision(&owner))
    }
}

fn actor_life(state: &crate::simulation::SimulationState, actor: &str) -> Option<u64> {
    state
        .physical
        .entities
        .get(actor)?
        .actor
        .as_ref()
        .map(|body| body.physical_life.unwrap_or(0))
}
