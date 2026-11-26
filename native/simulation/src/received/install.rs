//! Consuming chronological installation. Cold logical directories are explicit;
//! loaded tail pages do not reconstruct absent history or reset quotas.

use super::{
    ReceivedChargeDirectory, TemporalActorHistory, TemporalPageRecord, TemporalState,
    TemporalStateHeader, TemporalSupportCollection, TemporalValueMeaning,
};
use crate::experience::PersonalInstallError;
use crate::install::rows::{take_collection, take_one, validate_map_row};
use crate::install::{InstallError, RowImport};
use crate::reception::ReceptionState;
use indexmap::IndexMap;
use std::sync::Arc;

pub(crate) fn install_temporal(
    import: &mut RowImport,
    present: bool,
    through: f64,
    reception: &ReceptionState,
    cold_directories: Option<&IndexMap<String, Vec<ReceivedChargeDirectory>>>,
    meaning: &dyn TemporalValueMeaning,
    budget: &crate::host::ByteBudget,
    activity_limits: &crate::activity::ActivityDisplayLimits,
) -> Result<Option<TemporalState>, PersonalInstallError> {
    let generation = import.generation().to_owned();
    let Some((root, header)) = take_one::<TemporalStateHeader>(
        import,
        "mind_temporal_state",
        "[\"world\",\"experience\"]",
        "temporal",
        present,
    )?
    else {
        return Ok(None);
    };
    if !root.extra.is_empty() {
        return Err(InstallError::CurrentFormat.into());
    }
    let actors = take_collection(import, "mind_temporal_actors", &root.id, true, true)?;
    let mut histories = IndexMap::new();
    let actor_coverage = actors.coverage;
    for row in actors.rows {
        validate_map_row(
            &row,
            &root.id,
            "actors",
            &row.slot,
            actor_coverage.next_ordinal,
        )?;
        let actor_id = row.slot.clone();
        let pages = take_collection(import, "mind_temporal_pages", &row.id, true, false)?;
        let mut installed_pages = Vec::with_capacity(pages.rows.len());
        for page in pages.rows {
            let values = reception.received_values.as_ref();
            installed_pages.push(Arc::new(TemporalPageRecord::install(
                page,
                &actor_id,
                through,
                &values,
                Some(meaning),
                activity_limits,
                budget,
            )?));
        }
        let owned_directories;
        let directories = if pages.coverage.complete {
            owned_directories = installed_pages
                .iter()
                .map(|page| page.metadata().charge_directory.clone())
                .collect::<Vec<_>>();
            &owned_directories
        } else {
            let cold = cold_directories
                .and_then(|actors| actors.get(&actor_id))
                .ok_or(PersonalInstallError::Missing(
                    "complete cold charge directory",
                ))?;
            for resident in installed_pages
                .iter()
                .map(|page| &page.metadata().charge_directory)
            {
                if !cold.iter().any(|directory| directory == resident) {
                    return Err(InstallError::CurrentFormat.into());
                }
            }
            cold
        };
        let checkpoints = reception.recordings(&actor_id).collect::<Vec<_>>();
        let closed_tail = import
            .working_set()
            .is_some_and(|selection| selection.temporal_tail(&actor_id));
        let mut history = TemporalActorHistory::install(
            actor_id.clone(),
            row,
            installed_pages,
            pages.coverage,
            directories,
            &checkpoints,
            through,
            closed_tail,
            budget,
        )?;
        let supports = take_collection(
            import,
            "mind_temporal_supports",
            &crate::encoding::json_record(&[
                "world",
                "experience",
                "temporal",
                "actors",
                &actor_id,
            ])
            .map_err(|_| InstallError::RowIdentity)?,
            history.header().supports.is_some(),
            false,
        )?;
        let supports = TemporalSupportCollection::install(
            &actor_id,
            supports.rows,
            supports.coverage,
            through,
            reception.received_values.as_ref(),
            budget,
            activity_limits,
        )?;
        history.install_supports(supports)?;
        if histories.insert(actor_id, history).is_some() {
            return Err(InstallError::DuplicateRow.into());
        }
    }
    Ok(Some(TemporalState::install(
        generation,
        header,
        histories,
        actor_coverage,
        budget,
    )?))
}
