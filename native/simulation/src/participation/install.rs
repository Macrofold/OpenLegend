use super::*;
use crate::install::rows::{take_collection, validate_map_row};
fn presence(children: &mut WorldChildren, field: &str) -> Result<bool, InstallError> {
    match children.take(field)? {
        None => Ok(false),
        Some(true) => Ok(true),
        _ => Err(InstallError::ParentPresence),
    }
}
impl ParticipationState {
    pub(crate) fn install(
        import: &mut RowImport,
        children: &mut WorldChildren,
        entities: &EntityStore,
        budget: &ByteBudget,
    ) -> Result<Self, InstallError> {
        let mut social = [false; 2];
        for (index, (field, table)) in [
            ("outings", "activity_outings"),
            ("socialCompacts", "social_compacts"),
        ]
        .into_iter()
        .enumerate()
        {
            social[index] = presence(children, field)?;
            let owner = take_collection(import, table, "[\"world\"]", social[index], true)?;
            if !owner.rows.is_empty() {
                return Err(InstallError::UnsupportedFamily(field));
            }
        }
        let present = presence(children, "exitExposures")?;
        let rows = take_collection(import, "sim_exit_exposures", "[\"world\"]", present, true)?;
        let bytes = map_storage::<String, f64>(rows.rows.len())
            .and_then(|n| {
                rows.rows
                    .iter()
                    .try_fold(n, |n, row| n.checked_add(row.slot.capacity()))
            })
            .ok_or(InstallError::Capacity)?;
        let mut construction = budget.reserve(bytes).map_err(|_| InstallError::Capacity)?;
        let mut exposures = if present {
            Some(IndexMap::with_capacity(rows.rows.len()))
        } else {
            None
        };
        for row in rows.rows {
            let _path = budget
                .reserve(
                    row.id
                        .len()
                        .checked_mul(4)
                        .and_then(|n| n.checked_add(256))
                        .ok_or(InstallError::Capacity)?,
                )
                .map_err(|_| InstallError::Capacity)?;
            validate_map_row(
                &row,
                "[\"world\"]",
                "exitExposures",
                &row.slot,
                rows.coverage.next_ordinal,
            )?;
            let deadline: f64 =
                serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
            if !deadline.is_finite()
                || deadline < 0.0
                || !row.extra.is_empty()
                || !entities
                    .get(&row.slot)
                    .and_then(|entity| entity.actor.as_ref())
                    .and_then(|actor| actor.participation.as_ref())
                    .is_some_and(|state| state.phase == "exiting")
                || exposures
                    .as_mut()
                    .ok_or(InstallError::ParentPresence)?
                    .insert(row.slot, deadline)
                    .is_some()
            {
                return Err(InstallError::CurrentFormat);
            }
        }
        construction
            .resize(exposures.heap_bytes().ok_or(InstallError::Capacity)?)
            .map_err(|_| InstallError::Capacity)?;
        Ok(Self {
            exposures,
            _outings_present: social[0],
            _compacts_present: social[1],
            budget: budget.clone(),
            storage: budget
                .adopt_backing(construction)
                .map_err(|_| InstallError::Capacity)?,
        })
    }
}
