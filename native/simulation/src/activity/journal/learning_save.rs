//! Learning rows use the same current record placements and SQL signature key
//! as the Source writer. A private support edit never rewrites shared meaning.
use super::*;
use crate::records::{
    OrderedMapRows, RecordEncodingError, RecordLedger, RowEffects, RowEncoder, SelectedPlacement,
    SqlCell,
};
use indexmap::IndexSet;

fn invalid() -> RecordEncodingError {
    RecordEncodingError("Learning save requires its actual current row placement.")
}
impl ActivityJournal {
    pub(super) fn encode_learning_changes(
        &self,
        state: &ActivityState,
        ledger: &RecordLedger,
        output: &mut RowEncoder<'_>,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        let count = self.undo.len();
        let _selection = budget
            .reserve(
                map_storage::<&str, ()>(count)
                    .and_then(|n| n.checked_mul(3))
                    .and_then(|n| n.checked_add(map_storage::<(&str, &str), ()>(count)?))
                    .ok_or_else(invalid)?,
            )
            .map_err(|_| invalid())?;
        let mut methods = IndexSet::with_capacity(count);
        let mut acquired = IndexSet::with_capacity(count);
        let mut owners = IndexSet::with_capacity(count);
        let mut actors = IndexSet::with_capacity(count);
        for undo in &self.undo {
            match undo {
                ActivityUndo::MethodInsert { id } => {
                    methods.insert(id.as_str());
                }
                ActivityUndo::Acquisition {
                    actor,
                    id,
                    new_owner,
                    ..
                } => {
                    acquired.insert((actor.as_str(), id.as_str()));
                    actors.insert(actor.as_str());
                    if *new_owner {
                        owners.insert(actor.as_str());
                    }
                }
                _ => {}
            }
        }
        if !methods.is_empty() {
            let ordered = OrderedMapRows::new(&state.library.methods, budget)?;
            for (position, id, method) in ordered.iter() {
                let placement = SelectedPlacement::new(
                    ledger,
                    "activity_methods",
                    &["world", "actionExperience", "methods", id],
                    &["world", "actionExperience"],
                    id,
                    position,
                    false,
                    budget,
                )?;
                if methods.contains(id)
                    || ledger
                        .placement("activity_methods", &placement.value().id)
                        .is_none_or(|old| old.position != position)
                {
                    let _signature = budget.reserve(128).map_err(|_| invalid())?;
                    let signature = crate::encoding::sha256_hex(method.signature().as_bytes());
                    output.write(
                        "activity_methods",
                        placement.value(),
                        method.as_ref(),
                        &[SqlCell::from(signature)],
                        placement.create(),
                        RowEffects::default(),
                    )?;
                }
            }
        }
        if !owners.is_empty() {
            let ordered = OrderedMapRows::new(&state.library.acquisitions, budget)?;
            for (position, actor, _) in ordered.iter() {
                let placement = SelectedPlacement::new(
                    ledger,
                    "activity_acquisitions_owners",
                    &["world", "actionExperience", "acquisitions", actor],
                    &["world", "actionExperience"],
                    actor,
                    position,
                    false,
                    budget,
                )?;
                if owners.contains(actor)
                    || ledger
                        .placement("activity_acquisitions_owners", &placement.value().id)
                        .is_none_or(|old| old.position != position)
                {
                    output.write_encoded(
                        "activity_acquisitions_owners",
                        placement.value(),
                        "{}",
                        &[],
                        placement.create(),
                        RowEffects::default(),
                    )?;
                }
            }
        }
        for actor in actors {
            let own = state.library.acquisitions.get(actor).ok_or_else(invalid)?;
            let ordered = OrderedMapRows::new(own, budget)?;
            for (position, id, record) in ordered.iter() {
                let placement = SelectedPlacement::new(
                    ledger,
                    "activity_acquisitions",
                    &["world", "actionExperience", "acquisitions", actor, id],
                    &["world", "actionExperience", "acquisitions", actor],
                    id,
                    position,
                    false,
                    budget,
                )?;
                if acquired.contains(&(actor, id))
                    || ledger
                        .placement("activity_acquisitions", &placement.value().id)
                        .is_none_or(|old| old.position != position)
                {
                    output.write(
                        "activity_acquisitions",
                        placement.value(),
                        record.as_ref(),
                        &[],
                        placement.create(),
                        RowEffects::default(),
                    )?;
                }
            }
        }
        Ok(())
    }
}
