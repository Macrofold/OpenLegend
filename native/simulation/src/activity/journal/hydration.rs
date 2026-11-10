//! Exact selected history imports do not begin/end an activity or reindex its
//! original SQL list. The enclosing privacy preparation owns their purpose.
use super::*;
use crate::records::InstalledRow;
impl ActivityJournal {
    pub(crate) fn load_selected_occurrences(
        &mut self,
        state: &mut ActivityState,
        rows: Vec<InstalledRow>,
        budget: &ByteBudget,
    ) -> Result<(), ActivityError> {
        for row in rows {
            let _decode = budget
                .reserve(
                    crate::experience::encoded_body_bound(&row.payload)
                        .map_err(|_| ActivityError::Capacity)?
                        .checked_add(row.id.len())
                        .ok_or(ActivityError::Capacity)?,
                )
                .map_err(|_| ActivityError::Capacity)?;
            let actor = row
                .extra
                .first()
                .and_then(crate::records::SqlCell::as_str)
                .ok_or(ActivityError::InvalidStructure)?
                .to_owned();
            let owner = state
                .collections
                .get(&actor)
                .ok_or(ActivityError::Unavailable)?;
            let parent = crate::encoding::json_record(&[
                "world",
                "actionExperience",
                "occurrences",
                actor.as_str(),
            ])
            .map_err(|_| ActivityError::InvalidStructure)?;
            let occurrence: ActivityOccurrence =
                serde_json::from_str(&row.payload).map_err(|_| ActivityError::UnsupportedFamily)?;
            super::super::state::validate_activity_row(
                &row,
                &occurrence,
                &actor,
                &parent,
                owner.next_ordinal,
                &state.limits,
                &state.display,
                budget,
            )?;
            let id = occurrence.id.clone();
            let record = ActivityRecord::installed(occurrence, row.position, row.slot, budget)?;
            if let Some(known) = owner.records.get(&id) {
                if known.position != record.position
                    || known.slot != record.slot
                    || crate::encoding::json_record(&known.occurrence)
                        .map_err(|_| ActivityError::InvalidStructure)?
                        != crate::encoding::json_record(&record.occurrence)
                            .map_err(|_| ActivityError::InvalidStructure)?
                {
                    return Err(ActivityError::InvalidStructure);
                }
                continue;
            }
            if owner.complete || owner.order.contains_key(&record.position) {
                return Err(ActivityError::InvalidStructure);
            }
            self.reserve(
                actor
                    .len()
                    .checked_add(id.len())
                    .ok_or(ActivityError::Capacity)?,
            )?;
            self.prepare_undo_slots(1)?;
            if self.prepare_collection(state, &actor)?.is_some() {
                return Err(ActivityError::Unavailable);
            }
            let owner = state
                .collections
                .get_mut(&actor)
                .ok_or(ActivityError::Unavailable)?;
            owner.index_action(
                &id,
                record.position,
                None,
                Some(&record.occurrence.action_id),
            );
            owner.order.insert(record.position, id.clone());
            self.undo.push(ActivityUndo::Loaded {
                actor,
                id: id.clone(),
                position: record.position,
            });
            owner.records.insert(id, record);
        }
        Ok(())
    }
}
