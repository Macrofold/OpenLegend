//! A protected edit advertises its complete SQL prefix before Ready. Until its
//! genuine acceptance this owner cannot acknowledge or publish those rows.
use super::*;
use crate::host::retained_size::{heap_sum, map_storage};
use crate::received::TemporalSaveLimits;
use crate::records::{OwnerCoverage, PreparedRecordLedger, RecordLedger};
use indexmap::IndexMap;

impl SaveJournal {
    pub(crate) fn prepare_protected_append(
        &mut self,
        candidate: CandidateKey,
        cut: TemporalSaveCut<'_>,
        changes: ChangedRows,
        owners: &[OwnerCoverage],
        limits: TemporalSaveLimits,
        schema: &Arc<RecordSchema>,
        ledger: &mut RecordLedger,
        scratch: &ByteBudget,
    ) -> Result<(PreparedSaveAppend, PreparedRecordLedger), SaveError> {
        let through_cut = candidate
            .base_cut
            .checked_add(1)
            .ok_or(SaveError::Binding)?;
        if !self.barrier_complete() {
            return Err(SaveError::Preparing);
        }
        if candidate.base_cut != self.through_cut
            || cut.world_id != self.world_id
            || cut.generation != self.generation
            || cut.through_cut != through_cut
            || through_cut > MAX_SAFE_INTEGER
            || cut.identity_through < self.identity_through
            || cut.identity_through > MAX_SAFE_INTEGER
            || self.next_prefix > MAX_SAFE_INTEGER
        {
            return Err(SaveError::Binding);
        }
        schema.validate_changes(&changes)?;
        let packed = crate::received::pack_temporal_save(
            &cut,
            &changes,
            Some(self.durable_identity_through),
            limits,
            schema,
            scratch,
        )?;
        let owner_count = owners
            .len()
            .checked_add(packed.owners().len())
            .ok_or(SaveError::Capacity)?;
        let names = owners
            .iter()
            .chain(packed.owners())
            .try_fold(0usize, |n, owner| {
                n.checked_add(owner.table.capacity())?
                    .checked_add(owner.owner.capacity())
            })
            .ok_or(SaveError::Capacity)?;
        let _owner_storage = scratch
            .reserve(
                heap_sum([
                    map_storage::<(&str, &str), OwnerCoverage>(
                        owner_count
                            .checked_mul(2)
                            .and_then(|n| n.checked_add(4))
                            .ok_or(SaveError::Capacity)?,
                    )
                    .ok_or(SaveError::Capacity)?,
                    owner_count
                        .checked_mul(size_of::<OwnerCoverage>())
                        .ok_or(SaveError::Capacity)?,
                    names,
                ])
                .ok_or(SaveError::Capacity)?,
            )
            .map_err(|_| SaveError::Capacity)?;
        let mut observed = IndexMap::with_capacity(owner_count);
        for owner in owners.iter().chain(packed.owners()) {
            let key = (owner.table.as_str(), owner.owner.as_str());
            if let Some(before) = observed.get_mut(&key) {
                let before: &mut OwnerCoverage = before;
                if before.complete != owner.complete
                    || before.parent_present != owner.parent_present
                {
                    return Err(SaveError::Binding);
                }
                before.next_ordinal = before.next_ordinal.max(owner.next_ordinal);
            } else {
                observed.insert(key, owner.clone());
            }
        }
        let observed = observed.into_values().collect::<Vec<_>>();
        let workspace_bytes =
            merge_workspace_bound(&changes, packed.changes()).ok_or(SaveError::Capacity)?;
        let _workspace = scratch
            .reserve(workspace_bytes)
            .map_err(|_| SaveError::Capacity)?;
        let fixed = size_of::<SavePrefix>()
            .checked_add(2 * size_of::<usize>())
            .and_then(|n| n.checked_add(self.world_id.len()))
            .and_then(|n| n.checked_add(self.generation.len()))
            .ok_or(SaveError::Capacity)?;
        let bytes = heap_sum([
            changes_heap(&changes).ok_or(SaveError::Capacity)?,
            changes_heap(packed.changes()).ok_or(SaveError::Capacity)?,
            workspace_bytes,
            fixed,
            prefix_index_bound(&changes).ok_or(SaveError::Capacity)?,
            prefix_index_bound(packed.changes()).ok_or(SaveError::Capacity)?,
        ])
        .ok_or(SaveError::Capacity)?;
        let reservation = self
            .budget
            .reserve(bytes)
            .map_err(|_| SaveError::Capacity)?;
        let empty_reservation = self.budget.reserve(0).map_err(|_| SaveError::Capacity)?;
        let empty_workspace = scratch.reserve(0).map_err(|_| SaveError::Capacity)?;
        let serial = self
            .next_admission
            .checked_add(1)
            .ok_or(SaveError::Binding)?;
        let (pages, page_owners, page_guard, residency) = packed.into_parts();
        let merged = merge_changes(changes, pages, schema)?;
        let prepared_ledger = ledger.prepare_accepted(candidate, &merged, &observed)?;
        let prefix = self.finish_prefix(&cut, merged, residency, reservation);
        drop(page_owners);
        drop(page_guard);
        self.next_admission = serial;
        self.pending_append = Some(PendingAppend {
            candidate,
            serial,
            through_cut,
            identity_through: cut.identity_through,
            changes: ChangedRows::default(),
            schema: Arc::clone(schema),
            reservation: empty_reservation,
            _workspace: empty_workspace,
            protected: Some(prefix),
        });
        Ok((
            PreparedSaveAppend {
                owner: Arc::clone(&self.owner),
                candidate,
                serial,
            },
            prepared_ledger,
        ))
    }

    pub(crate) fn prepared_prefix(
        &self,
        prepared: &PreparedSaveAppend,
    ) -> Result<Option<&SaveRows>, SaveError> {
        self.validate_prepared(prepared)?;
        Ok(self
            .pending_append
            .as_ref()
            .expect("validated private prefix")
            .protected
            .as_ref()
            .map(|prefix| prefix.rows()))
    }

    pub(crate) fn prepared_prefix_owner(
        &self,
        prepared: &PreparedSaveAppend,
    ) -> Result<Option<&Arc<SavePrefix>>, SaveError> {
        self.validate_prepared(prepared)?;
        Ok(self
            .pending_append
            .as_ref()
            .expect("validated private prefix")
            .protected
            .as_ref())
    }

    /// A complete current-format install adopts its one SQL head directly.
    /// Fund this fresh owner before commit; replacing it after the genuine
    /// install receipt never acknowledges an invented ordinary save revision.
    pub(crate) fn prepare_installation_journal(
        &self,
        revision: u64,
        through_cut: u64,
        identity_through: u64,
    ) -> Result<SaveJournal, SaveError> {
        SaveJournal::new(
            self.world_id.clone(),
            self.generation.clone(),
            revision,
            through_cut,
            identity_through,
            self.budget.clone(),
        )
    }

    /// Both ordinary capture and protected preparation use this exact factory.
    /// The caller admitted the complete move/merge/index peak before allocation.
    pub(super) fn finish_prefix(
        &self,
        cut: &TemporalSaveCut<'_>,
        changes: ChangedRows,
        temporal_residency: Arc<crate::received::SavedTemporalResidency>,
        mut reservation: ByteReservation,
    ) -> Arc<SavePrefix> {
        let actual = changes_heap(&changes)
            .and_then(|n| n.checked_add(size_of::<SavePrefix>() + 2 * size_of::<usize>()))
            .and_then(|n| n.checked_add(self.world_id.len()))
            .and_then(|n| n.checked_add(self.generation.len()))
            .and_then(|n| n.checked_add(prefix_index_bound(&changes)?))
            .expect("save prefix bounded by its admitted inputs");
        assert!(
            actual <= reservation.bytes(),
            "save prefix exceeded its admitted peak"
        );
        let presence = prefix_index(&changes);
        reservation
            .resize(actual)
            .expect("shrinking admitted save prefix");
        Arc::new(SavePrefix {
            rows: SaveRows {
                world_id: self.world_id.clone(),
                generation: self.generation.clone(),
                prefix: self.next_prefix,
                base_revision: self.durable_revision,
                through_cut: cut.through_cut,
                identity_through: cut.identity_through,
                changes,
            },
            presence,
            temporal_residency,
            _reservation: reservation,
        })
    }
}
