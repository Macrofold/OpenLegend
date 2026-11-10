//! Whole-install adoption retains its actual proposed rows and pre-funded
//! replacement save/residency owners until the real SQL outcome is known.
use super::*;

pub(super) struct RestoreAdoption {
    key: CandidateKey,
    save: SaveJournal,
    residency: crate::received::PreparedTemporalResidency,
    revision: u64,
    identity_through: u64,
}
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PreparedRestoreFacts<'a> {
    world_id: &'a str,
    generation: &'a str,
    revision: u64,
    accepted_cut: u64,
    identity_through: u64,
    installation: CurrentInstallation<'a>,
    retained_values: RestoreRetainedValueIds<'a>,
    changes: &'a crate::records::ChangedRows,
}
struct RestoreRetainedValueIds<'a>(Option<&'a crate::received::ReceivedValues>);
impl serde::Serialize for RestoreRetainedValueIds<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeMap;
        let mut out =
            serializer.serialize_map(Some(self.0.map_or(0, |values| values.shared_ids().len())))?;
        if let Some(values) = self.0 {
            for id in values.shared_ids() {
                out.serialize_entry(id, &true)?;
            }
        }
        out.end()
    }
}
impl Session {
    pub(crate) fn begin_restore(
        &mut self,
        input: super::super::restore::RestoreInput,
        limits: crate::experience::HistoryEditLimits,
    ) -> Result<CandidateKey, SessionError> {
        if !self.save_barrier_complete() {
            return Err(FenceError::Busy.into());
        }
        let (key, mut journal) = self.begin()?;
        let driver = (|| {
            let mut core = CoreMutation {
                state: &mut self.simulation.state,
                journal: &mut journal,
            };
            let cursor = super::super::restore::RestoreReconcileCursor::new(
                &mut core,
                input,
                key,
                limits,
                self.temporal_save_limits,
                self.save.durable_identity_through(),
                &self.budget,
            )?;
            OperationDriver::restore(&mut core, cursor, &self.budget)
        })();
        self.install_driver(key, journal, driver, false)?;
        self.host.manually_paused = true;
        Ok(key)
    }
    pub(crate) fn prepare_restore_adoption(
        &mut self,
        key: CandidateKey,
    ) -> Result<(), SessionError> {
        if self.restore_adoption.is_some() {
            return Err(FenceError::Busy.into());
        }
        let Some(Candidate::Prepared(prepared)) = &self.candidate else {
            return Err(FenceError::NotReady.into());
        };
        if prepared.key != key {
            return Err(FenceError::Stale.into());
        }
        let state = &self.simulation.state;
        let through = key
            .base_cut
            .checked_add(1)
            .ok_or(ExecutionError::Invariant)?;
        let residency = prepared
            .publication
            .restore_residency(&self.save)?
            .prepare_restore_apply(state, through, &self.budget)?;
        let save = self.save.prepare_installation_journal(
            state.durable_revision,
            through,
            state.physical.identity.next_id(),
        )?;
        self.restore_adoption = Some(RestoreAdoption {
            key,
            save,
            residency,
            revision: state.durable_revision,
            identity_through: state.physical.identity.next_id(),
        });
        Ok(())
    }
    pub(crate) fn prepared_restore_facts(
        &self,
        key: CandidateKey,
    ) -> Result<Option<PreparedRestoreFacts<'_>>, SessionError> {
        let Some(adoption) = &self.restore_adoption else {
            return Ok(None);
        };
        let Some(Candidate::Prepared(prepared)) = &self.candidate else {
            return Err(FenceError::NotReady.into());
        };
        if adoption.key != key || prepared.key != key {
            return Err(FenceError::Stale.into());
        }
        let rows = prepared
            .publication
            .read_protected_prefix(&self.save)?
            .ok_or(SaveError::Binding)?;
        let state = &self.simulation.state;
        let mut installation = CurrentInstallation::capture(state)?;
        installation.accepted_cut = key.base_cut + 1;
        Ok(Some(PreparedRestoreFacts {
            world_id: &state.physical.header.id,
            generation: &state.generation,
            revision: adoption.revision,
            accepted_cut: key.base_cut + 1,
            identity_through: adoption.identity_through,
            installation,
            retained_values: RestoreRetainedValueIds(state.reception.received_values.as_ref()),
            changes: &rows.changes,
        }))
    }
    pub(crate) fn finish_restore(
        &mut self,
        key: CandidateKey,
        world: &str,
        generation: &str,
        revision: u64,
        cut: u64,
    ) -> Result<bool, SessionError> {
        let adoption = self.restore_adoption.as_ref().ok_or(FenceError::NotReady)?;
        let state = &self.simulation.state;
        if adoption.key != key
            || world != state.physical.header.id
            || generation != state.generation
            || revision != adoption.revision
            || cut != key.base_cut + 1
        {
            return Err(FenceError::Stale.into());
        }
        if self.finish_settlement(key)?.is_none() {
            return Ok(false);
        }
        let adoption = self
            .restore_adoption
            .take()
            .expect("validated whole-install adoption");
        if let Err((error, _residency)) = adoption.residency.apply(&mut self.simulation.state) {
            self.simulation.fence.poison();
            return Err(error.into());
        }
        // These are fixed moves after genuine candidate acceptance. No new
        // admission, gameplay transition or fabricated save ACK occurs here.
        self.save = adoption.save;
        self.simulation.state.durable_revision = revision;
        Ok(true)
    }
}
