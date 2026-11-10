//! Privacy rows follow their actual canonical lists/maps and the accepted row
//! ledger. An absent owner is certified by complete coverage, never by a missing
//! resident entry. These rows use the same SQL writer as every personal source.

use super::*;
use crate::experience::privacy_mutation::PrivacyUndo;

const PARENT: &str = "[\"world\",\"experience\"]";

fn ordered_actors<'a>(
    table: &str,
    changed: &IndexSet<&'a str>,
    ledger: &'a RecordLedger,
    budget: &ByteBudget,
) -> Result<(Vec<&'a str>, crate::host::ByteReservation), RecordEncodingError> {
    let coverage = ledger.coverage(table, PARENT).ok_or_else(encoding)?;
    if !coverage.complete {
        return Err(encoding());
    }
    let count = ledger
        .placements(table, PARENT)
        .count()
        .checked_add(changed.len())
        .ok_or_else(encoding)?;
    let reservation = budget
        .reserve(
            count
                .checked_mul(size_of::<(&str, u64)>() + size_of::<&str>())
                .and_then(|bytes| bytes.checked_add(map_storage::<&str, ()>(count)?))
                .ok_or_else(encoding)?,
        )
        .map_err(|_| encoding())?;
    let mut keys = Vec::new();
    let mut seen = IndexSet::new();
    seen.try_reserve(count).map_err(|_| encoding())?;
    keys.try_reserve_exact(count).map_err(|_| encoding())?;
    for row in ledger.placements(table, PARENT) {
        seen.insert(row.slot.as_str());
        keys.push((row.slot.as_str(), row.position));
    }
    keys.sort_unstable_by_key(|(_, position)| *position);
    for actor in changed {
        if seen.insert(actor) {
            keys.push((actor, u64::MAX));
        }
    }
    keys.sort_by(|(a, _), (b, _)| crate::encoding::js_property_cmp(a, b));
    // Both vector allocations are funded while the tuple keys are collected.
    let keys = keys.into_iter().map(|(actor, _)| actor).collect();
    Ok((keys, reservation))
}

fn owner(
    table: &str,
    field: &str,
    actors: &[&str],
    changed: &IndexSet<&str>,
    ledger: &RecordLedger,
    output: &mut RowEncoder<'_>,
    unordered: bool,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    for (index, actor) in actors.iter().enumerate() {
        let _temporary = budget
            .reserve(
                actor
                    .len()
                    .checked_mul(12)
                    .and_then(|n| n.checked_add(512))
                    .ok_or_else(encoding)?,
            )
            .map_err(|_| encoding())?;
        let id = json_record(&["world", "experience", field, actor]).map_err(|_| encoding())?;
        let previous = ledger.placement(table, &id);
        let position = if unordered { 0 } else { index as u64 };
        if changed.contains(actor) || previous.is_some_and(|previous| previous.position != position)
        {
            let placement = RecordPlacement {
                id,
                parent: PARENT.to_owned(),
                slot: (*actor).to_owned(),
                position,
            };
            output.write_encoded(
                table,
                &placement,
                if unordered { "{}" } else { "[]" },
                &[],
                create(ledger, table, &placement, true)?,
                RowEffects::default(),
            )?;
        }
    }
    output.observe_owner(&OwnerCoverage {
        table: table.to_owned(),
        owner: PARENT.to_owned(),
        complete: true,
        next_ordinal: if unordered {
            u64::from(!actors.is_empty())
        } else {
            actors.len() as u64
        },
        parent_present: true,
    })
}

pub(super) fn encode_privacy_changes(
    state: &ExperienceState,
    journal: &ExperienceJournal,
    ledger: &RecordLedger,
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let operations = journal
        .undo
        .iter()
        .filter(|operation| {
            matches!(
                operation,
                super::super::mutation::ExperienceUndo::Privacy(_)
            )
        })
        .count();
    if operations == 0 {
        return Ok(());
    }
    let bytes = map_storage::<&str, ()>(operations)
        .and_then(|n| n.checked_mul(3))
        .ok_or_else(encoding)?;
    let _selection = budget.reserve(bytes).map_err(|_| encoding())?;
    let mut revisions = IndexSet::new();
    let mut forgotten = IndexSet::new();
    let mut corrections = IndexSet::new();
    for set in [&mut revisions, &mut forgotten, &mut corrections] {
        set.try_reserve(operations).map_err(|_| encoding())?;
    }
    for operation in &journal.undo {
        if let super::super::mutation::ExperienceUndo::Privacy(operation) = operation {
            match operation {
                PrivacyUndo::CreatedActor { .. } => {},
                PrivacyUndo::Revision { actor, .. } => {
                    revisions.insert(actor.as_str());
                }
                PrivacyUndo::Forgotten { actor, .. } => {
                    forgotten.insert(actor.as_str());
                }
                PrivacyUndo::Correction { actor, .. } => {
                    corrections.insert(actor.as_str());
                }
            }
        }
    }
    if !revisions.is_empty() {
        let (actors, _order) =
            ordered_actors("mind_privacy_revisions", &revisions, ledger, budget)?;
        for (position, actor) in actors.iter().enumerate() {
            let _temporary = budget
                .reserve(
                    actor
                        .len()
                        .checked_mul(12)
                        .and_then(|n| n.checked_add(512))
                        .ok_or_else(encoding)?,
                )
                .map_err(|_| encoding())?;
            let id = json_record(&["world", "experience", "privacyRevisions", actor])
                .map_err(|_| encoding())?;
            let previous = ledger.placement("mind_privacy_revisions", &id);
            if !revisions.contains(actor)
                && previous.is_some_and(|prior| prior.position == position as u64)
            {
                continue;
            }
            let revision = state
                .actors
                .get(*actor)
                .and_then(|actor| actor.privacy.revision)
                .ok_or_else(encoding)?;
            let placement = RecordPlacement {
                id,
                parent: PARENT.to_owned(),
                slot: (*actor).to_owned(),
                position: position as u64,
            };
            output.write(
                "mind_privacy_revisions",
                &placement,
                &revision,
                &[],
                create(ledger, "mind_privacy_revisions", &placement, true)?,
                RowEffects::default(),
            )?;
        }
        output.observe_owner(&OwnerCoverage {
            table: "mind_privacy_revisions".to_owned(),
            owner: PARENT.to_owned(),
            complete: true,
            next_ordinal: actors.len() as u64,
            parent_present: true,
        })?;
    }
    if !forgotten.is_empty() {
        let (actors, _order) = ordered_actors("mind_forgotten_owners", &forgotten, ledger, budget)?;
        owner(
            "mind_forgotten_owners",
            "forgotten",
            &actors,
            &forgotten,
            ledger,
            output,
            false,
            budget,
        )?;
        for actor in forgotten {
            let _actor = budget
                .reserve(
                    actor
                        .len()
                        .checked_mul(12)
                        .and_then(|n| n.checked_add(512))
                        .ok_or_else(encoding)?,
                )
                .map_err(|_| encoding())?;
            let privacy = &state.actors.get(actor).ok_or_else(encoding)?.privacy;
            let first = journal
                .undo
                .iter()
                .filter_map(|operation| match operation {
                    super::super::mutation::ExperienceUndo::Privacy(PrivacyUndo::Forgotten {
                        actor: owner,
                        length,
                        ..
                    }) if owner == actor => Some(*length),
                    _ => None,
                })
                .min()
                .ok_or_else(encoding)?;
            let parent = json_record(&["world", "experience", "forgotten", actor])
                .map_err(|_| encoding())?;
            for (position, id) in privacy.forgotten.iter().enumerate().skip(first) {
                let _temporary = budget
                    .reserve(
                        actor
                            .len()
                            .checked_add(id.len())
                            .and_then(|n| n.checked_mul(12))
                            .and_then(|n| n.checked_add(512))
                            .ok_or_else(encoding)?,
                    )
                    .map_err(|_| encoding())?;
                let slot = position.to_string();
                let placement = RecordPlacement {
                    id: json_record(&["world", "experience", "forgotten", actor, &slot])
                        .map_err(|_| encoding())?,
                    parent: parent.clone(),
                    slot,
                    position: position as u64,
                };
                let columns = [actor.into(), id.as_str().into()];
                output.write(
                    "mind_forgotten",
                    &placement,
                    id,
                    &columns,
                    create(ledger, "mind_forgotten", &placement, true)?,
                    RowEffects::default(),
                )?;
            }
            output.observe_owner(&OwnerCoverage {
                table: "mind_forgotten".to_owned(),
                owner: parent,
                complete: true,
                next_ordinal: privacy.forgotten.len() as u64,
                parent_present: true,
            })?;
        }
    }
    if !corrections.is_empty() {
        let (actors, _order) =
            ordered_actors("mind_corrections_owners", &corrections, ledger, budget)?;
        owner(
            "mind_corrections_owners",
            "corrections",
            &actors,
            &corrections,
            ledger,
            output,
            true,
            budget,
        )?;
        for actor in corrections {
            let _actor = budget
                .reserve(
                    actor
                        .len()
                        .checked_mul(12)
                        .and_then(|n| n.checked_add(512))
                        .ok_or_else(encoding)?,
                )
                .map_err(|_| encoding())?;
            let privacy = &state.actors.get(actor).ok_or_else(encoding)?.privacy;
            let parent = json_record(&["world", "experience", "corrections", actor])
                .map_err(|_| encoding())?;
            let mut changed = IndexSet::new();
            let _keys = budget
                .reserve(map_storage::<&str, ()>(operations).ok_or_else(encoding)?)
                .map_err(|_| encoding())?;
            changed.try_reserve(operations).map_err(|_| encoding())?;
            for operation in &journal.undo {
                if let super::super::mutation::ExperienceUndo::Privacy(PrivacyUndo::Correction {
                    actor: owner,
                    id,
                    ..
                }) = operation
                {
                    if owner == actor {
                        changed.insert(id.as_str());
                    }
                }
            }
            for id in changed {
                let _temporary = budget
                    .reserve(
                        actor
                            .len()
                            .checked_add(id.len())
                            .and_then(|n| n.checked_mul(12))
                            .and_then(|n| n.checked_add(512))
                            .ok_or_else(encoding)?,
                    )
                    .map_err(|_| encoding())?;
                let row_id = json_record(&["world", "experience", "corrections", actor, id])
                    .map_err(|_| encoding())?;
                if let Some(evidence) = privacy.corrections.get(id) {
                    let _evidence = budget.reserve(evidence.len()).map_err(|_| encoding())?;
                    let placement = RecordPlacement {
                        id: row_id,
                        parent: parent.clone(),
                        slot: id.to_owned(),
                        position: 0,
                    };
                    let columns = [actor.into(), id.into(), evidence.as_str().into()];
                    output.write(
                        "mind_corrections",
                        &placement,
                        evidence,
                        &columns,
                        create(ledger, "mind_corrections", &placement, true)?,
                        RowEffects::default(),
                    )?;
                } else if ledger.presence("mind_corrections", &row_id, &parent) == Some(true) {
                    output.delete("mind_corrections", &row_id, false)?;
                }
            }
            output.observe_owner(&OwnerCoverage {
                table: "mind_corrections".to_owned(),
                owner: parent,
                complete: true,
                next_ordinal: u64::from(!privacy.corrections.is_empty()),
                parent_present: true,
            })?;
        }
    }
    Ok(())
}
