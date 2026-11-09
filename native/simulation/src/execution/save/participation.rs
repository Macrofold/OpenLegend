use super::*;
pub(super) fn encode_exposures(
    journal: &PhysicalJournal, state: &PhysicalState, ledger: &RecordLedger,
    output: &mut RowEncoder<'_>, budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    if !journal.undo.iter().any(|change| matches!(change, Undo::ExitExposure { .. })) { return Ok(()); }
    let mut previous = IndexMap::<&str, bool>::new();
    let _selection = budget.reserve(map_storage::<&str, bool>(journal.undo.len()).ok_or_else(error)?)
        .map_err(|_| error())?;
    for change in &journal.undo {
        if let Undo::ExitExposure { actor, before, .. } = change { previous.entry(actor).or_insert(before.is_some()); }
    }
    let current = state.participation.exposures();
    for (&actor, &present) in &previous {
        if present && !current.is_some_and(|rows| rows.contains_key(actor)) {
            let path = ["world", "exitExposures", actor];
            let length = crate::encoding::json_record_len(&path).map_err(|_| error())?;
            let _id = budget.reserve(length.checked_mul(2).ok_or_else(error)?).map_err(|_| error())?;
            output.delete("sim_exit_exposures", &crate::encoding::json_record(&path).map_err(|_| error())?, false)?;
        }
    }
    if let Some(current) = current {
        for (position, actor, deadline) in OrderedMapRows::new(current, budget)?.iter() {
            let address = SelectedPlacement::new(ledger, "sim_exit_exposures",
                &["world", "exitExposures", actor], &["world"], actor, position, false, budget)?;
            // Deleting an earlier JS map key shifts later semantic ordinals.
            if !previous.contains_key(actor) && ledger.placement("sim_exit_exposures", &address.value().id)
                .is_some_and(|before| before.position == position) { continue; }
            output.write("sim_exit_exposures", address.value(), deadline, &[], address.create(), RowEffects::default())?;
        }
    }
    let _owner = budget.reserve("sim_exit_exposures".len() + "[\"world\"]".len()).map_err(|_| error())?;
    output.observe_owner(&OwnerCoverage { table: "sim_exit_exposures".to_owned(), owner: "[\"world\"]".to_owned(),
        complete: true, parent_present: current.is_some(), next_ordinal: current.map_or(0, |rows| rows.len() as u64) })?;
    Ok(())
}
