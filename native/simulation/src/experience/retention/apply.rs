//! The sole experience writer publishes natural expiry and its exact account
//! deltas. This does not correct evidence, revoke learning, or change privacy.
use super::*;
use crate::commands::Outcome;
use crate::host::retained_size::tree_node_bound;
use crate::records::RecordPlacement;

pub(crate) struct AccountRetentionCursor {
    read: Option<AccountRetentionRead>,
    _storage: ByteReservation,
}
pub(crate) struct CompletedAccountRetention {
    pub(crate) outcome: Outcome,
    _storage: ByteReservation,
}
impl AccountRetentionCursor {
    pub(super) fn prepare_storage(budget: &ByteBudget) -> Result<ByteReservation, ExecutionError> {
        Ok(budget.reserve(
            size_of::<Self>() + size_of::<CompletedAccountRetention>() + "account-retention".len(),
        )?)
    }
    pub(super) fn from_prepared(read: AccountRetentionRead, storage: ByteReservation) -> Self {
        Self {
            read: Some(read),
            _storage: storage,
        }
    }
    pub(crate) fn new(
        read: AccountRetentionRead,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if read
            .selection
            .as_ref()
            .is_none_or(|selection| selection.records.is_none())
        {
            return Err(ExecutionError::Invariant);
        }
        let storage = Self::prepare_storage(budget)?;
        Ok(Self::from_prepared(read, storage))
    }
    pub(crate) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<CompletedAccountRetention, ExecutionError> {
        let read = self.read.take().ok_or(ExecutionError::Invariant)?;
        let current = read.current(core)?;
        if current {
            read.apply(core, budget)?;
        }
        let storage = self
            ._storage
            .split_off(size_of::<CompletedAccountRetention>() + "account-retention".len())?;
        Ok(CompletedAccountRetention {
            outcome: Outcome {
                spent: None,
                outputs: None,
                ok: current,
                code: "account-retention".into(),
                message: "".into(),
                recipe_id: None,
                item_id: None,
                entity_id: None,
                goal_id: None,
                plan_id: None,
                action_id: None,
            },
            _storage: storage,
        })
    }
}
impl AccountRetentionRead {
    fn current(&self, core: &CoreMutation<'_>) -> Result<bool, ExecutionError> {
        let state = &core.state;
        if state.physical.header.id != self.world || state.generation != self.generation {
            return Ok(false);
        }
        let Some(history) = state.temporal.actor(&self.actor) else {
            return Ok(false);
        };
        let Some(accounts) = history.header().accounts.as_ref() else {
            return Ok(false);
        };
        if history.header().physical_life != self.life
            || history.header().epoch != self.epoch
            || accounts.archives != self.accounts.archives
            || state
                .experience
                .actor(&self.actor)
                .is_none_or(|actor| actor.privacy.revision() != self.privacy)
        {
            return Ok(false);
        }
        let selection = self.selection.as_ref().ok_or(ExecutionError::Invariant)?;
        for record in selection
            .records
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
        {
            if state
                .records
                .placement(record.header.reference.kind.table(), record.row_id())
                .is_some_and(|placement| {
                    placement.parent != record.parent()
                        || placement.slot != record.slot()
                        || placement.position != record.position()
                })
            {
                return Ok(false);
            }
            let Some(collection) = state
                .experience
                .optional_collection(&self.actor, record.header.reference.kind)?
            else {
                return Ok(false);
            };
            match collection.resident_record(&record.header.reference.id) {
                Some(current)
                    if current.header.reference == record.header.reference
                        && current.row_id() == record.row_id()
                        && current.parent() == record.parent()
                        && current.slot() == record.slot()
                        && current.position() == record.position()
                        && !current.header.protected
                        && !current.header.unresolved_commitment => {}
                Some(_) => return Ok(false),
                None if collection.coverage.complete => return Ok(false),
                // The exact SQL selection/source watch covers this absent cold
                // row only. This never certifies a whole historical collection.
                None => {
                    if record.header.protected || record.header.unresolved_commitment {
                        return Ok(false);
                    }
                }
            }
        }
        Ok(true)
    }
    fn apply(
        mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let selection = self.selection.take().ok_or(ExecutionError::Invariant)?;
        let records = selection.records.ok_or(ExecutionError::Invariant)?;
        let installed = core.state.installed.clone();
        let policy = &installed.attention.value().retention;
        let can_recall = core
            .state
            .physical
            .entities
            .get(&self.actor)
            .is_some_and(|actor| actor.has_memory());
        let changed_required = core
            .state
            .temporal
            .actor(&self.actor)
            .and_then(|actor| actor.header().accounts.as_ref())
            .is_none_or(|accounts| accounts.required != self.accounts.required);
        let mut totals = self.accounts.clone();
        let mut next_due = selection.next_due;
        let mut support_ids = IndexSet::new();
        let mut places_changed = false;
        let mut effect_bytes = records
            .len()
            .checked_mul(
                size_of::<Option<String>>()
                    .checked_add(
                        usize::try_from(policy.impression.max_bytes)
                            .map_err(|_| ExecutionError::Capacity)?,
                    )
                    .ok_or(ExecutionError::Capacity)?,
            )
            .ok_or(ExecutionError::Capacity)?;
        for record in &records {
            effect_bytes = effect_bytes
                .checked_add(encoded_body_bound(record.payload())?)
                .ok_or(ExecutionError::Capacity)?;
        }
        let _effects = budget.reserve(effect_bytes)?;
        let mut replacements = Vec::with_capacity(records.len());
        let mut replacement_ids = IndexSet::with_capacity(records.len());
        let _replacement_index = budget
            .reserve(map_storage::<String, ()>(records.len()).ok_or(ExecutionError::Capacity)?)?;
        for (record, summary) in records.iter().zip(&selection.summaries) {
            let _work = budget.reserve(
                encoded_body_bound(record.payload())?
                    .checked_mul(3)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let body = memory::MemoryBody::decode(record.payload())?;
            let projection = body.projection()?;
            if !memory::columns::known_place_capsules(
                &projection,
                body.originals()?,
                &self.actor,
                self.at,
            )?
            .is_empty()
            {
                places_changed = true;
            }
            if let Some(locator) = record
                .header
                .retention
                .as_ref()
                .and_then(|retention| retention.receipt.as_ref())
            {
                support_ids.insert(locator.id());
            }
            if let Some(locator) = record.header.source_receipt.as_ref() {
                support_ids.insert(locator.id());
            }
            #[derive(Deserialize)]
            struct Receipts {
                #[serde(default)]
                receipts: Vec<crate::received::TemporalReceiptLocator>,
            }
            if let Some(manifest) = body.get::<Receipts>("manifest")? {
                for locator in manifest.receipts {
                    support_ids.insert(locator.id());
                }
            }
            let old = account_mut(&mut totals, record.header.class)?;
            old.bytes = old
                .bytes
                .checked_sub(record.payload().len() as u64)
                .ok_or(ExecutionError::Invariant)?;
            old.count = old.count.checked_sub(1).ok_or(ExecutionError::Invariant)?;
            let mut replacement = None;
            if can_recall {
                if let Some(payload) =
                    recollection::released(record, summary.as_ref(), self.at, &installed)?
                {
                    let bytes = payload.len() as u64;
                    if totals
                        .optional
                        .bytes
                        .checked_add(bytes)
                        .is_some_and(|n| n <= policy.optional.max_bytes)
                        && totals.optional.count < policy.optional.max_records
                    {
                        let id = &record.header.reference.id;
                        if !replacement_ids.insert(id.clone()) {
                            return Err(ExecutionError::Invariant);
                        }
                        let prior = if record.header.reference.kind == PersonalSourceKind::Memory {
                            Some(record.as_ref())
                        } else {
                            None
                        };
                        if prior.is_none()
                            && (selection.occupied_memory_ids.contains(id)
                                || core
                                    .state
                                    .experience
                                    .optional_collection(&self.actor, PersonalSourceKind::Memory)?
                                    .is_some_and(|records| records.resident_record(id).is_some()))
                        {
                            return Err(ExecutionError::Invariant);
                        }
                        // Installing later uses the then-current canonical append ordinal,
                        // so several cross-kind recollections cannot share one slot.
                        totals.optional.bytes += bytes;
                        totals.optional.count += 1;
                        replacement = Some(payload);
                    }
                }
            }
            replacements.push(replacement);
        }
        // The SQL source watch permits unrelated accepted suffixes. Refine the
        // current ledger with only these verified placements; partial history
        // remains partial, and the truthful metadata survives private rollback.
        let placement_bytes = records.iter().try_fold(0usize, |bytes, record| {
            heap_sum([
                bytes,
                size_of::<RecordPlacement>(),
                record.row_id().len(),
                record.parent().len(),
                record.slot().len(),
            ])
            .ok_or(ExecutionError::Capacity)
        })?;
        let _placements = budget.reserve(
            heap_sum([
                placement_bytes,
                tree_node_bound::<String, Vec<RecordPlacement>>()
                    .and_then(|bytes| bytes.checked_mul(3))
                    .ok_or(ExecutionError::Capacity)?,
                "mind_awareness".len() + "mind_memories".len() + "mind_summaries".len(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut placements = BTreeMap::new();
        // Existing working records already have accepted placement or an actual
        // private append. Only newly fetched cold rows refine the accepted
        // ledger; a new private collection cannot become accepted metadata.
        for kind in [
            PersonalSourceKind::Awareness,
            PersonalSourceKind::Memory,
            PersonalSourceKind::Summary,
        ] {
            let source = core
                .state
                .experience
                .optional_collection(&self.actor, kind)?;
            let count = records
                .iter()
                .filter(|record| {
                    record.header.reference.kind == kind
                        && !source.is_some_and(|source| {
                            source
                                .resident_record(&record.header.reference.id)
                                .is_some()
                        })
                })
                .count();
            if count == 0 {
                continue;
            }
            let mut rows = Vec::with_capacity(count);
            for record in records.iter().filter(|record| {
                record.header.reference.kind == kind
                    && !source.is_some_and(|source| {
                        source
                            .resident_record(&record.header.reference.id)
                            .is_some()
                    })
            }) {
                rows.push(RecordPlacement {
                    id: record.row_id().into(),
                    parent: record.parent().into(),
                    slot: record.slot().into(),
                    position: record.position(),
                });
            }
            placements.insert(kind.table().into(), rows);
        }
        let refined = core
            .state
            .records
            .prepare_verified_hydration(core.state.accepted_cut, &placements, &[])
            .map_err(|_| ExecutionError::Invariant)?;
        core.state
            .records
            .apply_verified_hydration(refined)
            .map_err(|_| ExecutionError::Invariant)?;
        drop(placements);
        drop(_placements);
        // Preparation already admitted these exact bodies; move them into the
        // canonical working collection through the shared residency-only owner.
        for record in &records {
            core.journal
                .experience
                .load_selected_record(&mut core.state.experience, Arc::clone(record))?;
        }
        if !records.is_empty() {
            // Source expireExperience filters all three lists even if only one
            // kind expired. Its real empty collection owners must survive save.
            for kind in [
                PersonalSourceKind::Awareness,
                PersonalSourceKind::Memory,
                PersonalSourceKind::Summary,
            ] {
                core.journal.experience.ensure_collection(
                    &mut core.state.experience,
                    kind,
                    &self.actor,
                )?;
            }
        }
        core.state.temporal.mark_support_dirty(
            &self.actor,
            Some(&support_ids.into_iter().collect::<Vec<_>>()),
        )?;
        for record in &records {
            core.state.temporal.adjust_account(
                &self.actor,
                record.header.class,
                -(record.payload().len() as i128),
                -1,
                None,
                core.state.physical.header.sim_time,
                policy,
            )?;
        }
        for (record, replacement) in records.iter().zip(replacements) {
            if let Some(payload) = replacement {
                core.journal.experience.ensure_collection(
                    &mut core.state.experience,
                    PersonalSourceKind::Memory,
                    &self.actor,
                )?;
                let prior = if record.header.reference.kind == PersonalSourceKind::Memory {
                    Some(record.as_ref())
                } else {
                    None
                };
                // Complete checkpoint expiry removes then appends the recalled
                // member, just like a cold selected account. Its logical slot
                // advances while the retirement proof preserves SQL position.
                let slot = if prior.is_some()
                    && (self.complete_checkpoint
                        || !self.resident.iter().any(|candidate| {
                            candidate.kind == PersonalSourceKind::Memory
                                && candidate.id == record.header.reference.id
                        })) {
                    Some(
                        core.state
                            .experience
                            .actor(&self.actor)
                            .ok_or(ExecutionError::Invariant)?
                            .collection(PersonalSourceKind::Memory)?
                            .coverage
                            .next_ordinal,
                    )
                } else {
                    None
                };
                let after = super::super::impression::install_record(
                    core,
                    &self.actor,
                    &record.header.reference.id,
                    payload,
                    prior,
                    slot,
                    budget,
                )?;
                if let Some(due) = experience_retention_due(&after.header, policy) {
                    next_due = Some(next_due.map_or(due, |prior| prior.min(due)));
                }
                core.state.temporal.adjust_account(
                    &self.actor,
                    after.header.class,
                    after.payload().len() as i128,
                    1,
                    experience_retention_due(&after.header, policy),
                    core.state.physical.header.sim_time,
                    policy,
                )?;
                if record.header.reference.kind == PersonalSourceKind::Memory {
                    core.journal.experience.replace(
                        &mut core.state.experience,
                        &record.header.reference,
                        after,
                    )?;
                } else {
                    core.journal
                        .experience
                        .append(&mut core.state.experience, after)?;
                    core.journal.experience.remove(
                        &mut core.state.experience,
                        &self.actor,
                        record.header.reference.kind,
                        &record.header.reference.id,
                    )?;
                }
            } else {
                core.journal.experience.remove(
                    &mut core.state.experience,
                    &self.actor,
                    record.header.reference.kind,
                    &record.header.reference.id,
                )?;
            }
        }
        if places_changed {
            core.journal
                .experience
                .invalidate_known_places(&mut core.state.experience, &self.actor)?;
        }
        for kind in [
            PersonalSourceKind::Awareness,
            PersonalSourceKind::Memory,
            PersonalSourceKind::Summary,
        ] {
            if let Some(records) = core
                .state
                .experience
                .optional_collection(&self.actor, kind)?
            {
                for record in records.records().filter(|record| !record.header.sensory) {
                    if let Some(due) = experience_retention_due(&record.header, policy) {
                        next_due = Some(next_due.map_or(due, |prior| prior.min(due)));
                    }
                }
            }
        }
        core.state.temporal.set_account_due(
            &self.actor,
            next_due,
            changed_required,
            core.state.physical.header.sim_time,
            policy,
        )?;
        Ok(())
    }
}
