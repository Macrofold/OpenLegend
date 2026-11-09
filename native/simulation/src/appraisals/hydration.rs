//! Privacy erasure selects all saved appraisal rows, including terminal private
//! attribution. An active-only startup witness cannot certify that selection.
use super::*;
impl AppraisalState {
    pub(crate) fn load_historical_owner(
        &mut self,
        actor: &str,
        rows: Vec<InstalledRow>,
        coverage: &OwnerCoverage,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let owner = self.owners.get(actor).ok_or(ExecutionError::Invariant)?;
        if coverage.table != "mind_appraisals" || coverage.owner != owner.coverage.owner
            || !coverage.complete || !coverage.parent_present
            || coverage.next_ordinal != owner.coverage.next_ordinal {
            return Err(ExecutionError::Invariant);
        }
        let count = rows.len();
        let bytes = heap_sum([
            size_of::<AppraisalUndo>(), actor.len(),
            map_storage::<String, Arc<AppraisalRecord>>(count).ok_or(ExecutionError::Capacity)?,
            rows.iter().try_fold(0usize, |n, row| n.checked_add(row.slot.len())).ok_or(ExecutionError::Capacity)?,
        ]).ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        let mut records = IndexMap::new();
        records.try_reserve(count).map_err(|_| ExecutionError::Capacity)?;
        for row in rows {
            let _decode = budget.reserve(crate::experience::encoded_body_bound(&row.payload)?)?;
            validate_map_row(&row, &coverage.owner, "", &row.slot, coverage.next_ordinal)
                .map_err(|_| ExecutionError::Invariant)?;
            if let Some(prior) = owner.records.get(&row.slot) {
                if prior.row.id != row.id || prior.row.parent != row.parent || prior.row.slot != row.slot
                    || prior.row.position != row.position || prior.row.payload != row.payload || prior.row.extra != row.extra {
                    return Err(ExecutionError::Invariant);
                }
                records.insert(row.slot, Arc::clone(prior));
                continue;
            }
            if owner.coverage.complete { return Err(ExecutionError::Invariant); }
            let value: Appraisal = serde_json::from_str(&row.payload).map_err(|_| ExecutionError::Invariant)?;
            if value.actor_id != actor || value.id != row.slot || self.definitions.get(&value.definition_pin.id)
                .is_none_or(|definition| definition.pin != value.definition_pin)
                || value.cause.as_ref().is_some_and(|cause| !matches!(cause.kind.as_str(), "perceived-event" | "remembered")) {
                return Err(ExecutionError::Invariant);
            }
            let guard = budget.reserve(super::residency::record_bytes(&value, &row)?)?;
            if records.insert(value.id.clone(), Arc::new(AppraisalRecord { value, row, _reservation: Some(guard) })).is_some() {
                return Err(ExecutionError::Invariant);
            }
        }
        if owner.records.keys().any(|id| !records.contains_key(id)) { return Err(ExecutionError::Invariant); }
        if owner.coverage.complete { return Ok(()); }
        records.sort_by(|_, a, _, b| a.row.position.cmp(&b.row.position));
        self.undo.try_reserve_exact(1).map_err(|_| ExecutionError::Capacity)?;
        let owner = self.owners.get_mut(actor).ok_or(ExecutionError::Invariant)?;
        for record in records.values().filter(|record| !owner.records.contains_key(&record.value.id)) {
            owner.index.insert(&record.value)?;
            index_deadline(&mut self.deadlines, &record.value);
        }
        self.undo.push(AppraisalUndo::HydratedOwner {
            actor: actor.to_owned(), prior: std::mem::replace(&mut owner.records, records),
            complete: owner.coverage.complete, active_complete: owner.active_complete, _storage: storage,
        });
        owner.coverage.complete = true;
        owner.active_complete = true;
        Ok(())
    }
}
