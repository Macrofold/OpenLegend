//! Persist one changed actor's encounters using the existing structural rows.
use super::*;
use crate::combat_encounters::PersonalEncounters;

pub(super) fn encode(
    actor: &str,
    before: Option<&PersonalEncounters>,
    after: Option<&PersonalEncounters>,
    ledger: &RecordLedger,
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let parent = ["world", "entities", actor, "actor"];
    let owner = ["world", "entities", actor, "actor", "encounters"];
    if before.map(|row| (row.life, row.next_at)) != after.map(|row| (row.life, row.next_at)) {
        one(
            ledger,
            output,
            "sim_personal_encounters",
            &owner,
            &parent,
            "encounters",
            after,
            budget,
        )?;
    }
    collection(
        ledger,
        output,
        "sim_encounter_pairs",
        &owner,
        "pairs",
        before.map(|row| &row.pairs),
        after.map(|row| &row.pairs),
        budget,
    )?;
    collection(
        ledger,
        output,
        "sim_unknown_dangers",
        &owner,
        "unknown",
        before.map(|row| &row.unknown),
        after.map(|row| &row.unknown),
        budget,
    )?;
    observe(
        output,
        "sim_personal_encounters",
        &parent,
        after.is_some(),
        u64::from(after.is_some()),
        budget,
    )
}

fn collection<T: PartialEq + Serialize>(
    ledger: &RecordLedger,
    output: &mut RowEncoder<'_>,
    table: &str,
    owner: &[&str],
    field: &str,
    before: Option<&IndexMap<String, T>>,
    after: Option<&IndexMap<String, T>>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    if before == after {
        return Ok(());
    }
    let entries = before
        .map_or(0, IndexMap::len)
        .checked_add(after.map_or(0, IndexMap::len))
        .ok_or_else(error)?;
    let _workspace = budget
        .reserve(map_storage::<&str, bool>(entries).ok_or_else(error)?)
        .map_err(|_| error())?;
    let mut changed = IndexMap::new();
    changed.try_reserve(entries).map_err(|_| error())?;
    for (id, old) in before.into_iter().flatten() {
        if after.and_then(|rows| rows.get(id)) != Some(old) {
            changed.insert(id.as_str(), true);
        }
    }
    for (id, next) in after.into_iter().flatten() {
        if before.and_then(|rows| rows.get(id)) != Some(next) {
            changed.entry(id.as_str()).or_insert(false);
        }
    }
    map(
        ledger, output, table, owner, field, after, &changed, false, budget,
    )
}
