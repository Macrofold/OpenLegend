//! The two finite parent headers contain scalars and empty child markers. Each
//! child owner encodes its own changed records; this never walks those bodies.
use super::SimulationState;
use crate::administration::InstalledHostSettings;
use crate::host::ByteBudget;
use crate::host::retained_size::map_storage;
use crate::records::SqlCell;
use crate::records::{RecordEncodingError, RowEncoder};
use indexmap::IndexMap;

/// One complete gameplay delta for the existing SQL writer. Each semantic
/// journal selects its own rows and columns; this composition does not diff a
/// world or let a caller omit receiving, cognition or chronological recording.
pub(crate) fn encode_candidate_changes(
    state: &SimulationState,
    journal: &crate::execution::CandidateJournal,
    host: &InstalledHostSettings,
    write_host: bool,
    budget: &ByteBudget,
) -> Result<crate::records::EncodedRows, RecordEncodingError> {
    // Encoding is also useful inside a private rollback checkpoint. It grants
    // no publication: Ready must separately require closed operations and fund
    // the actual ledger/save/consumer products before accepting this delta.
    let mut output = RowEncoder::new(&state.installed.schema, budget)?;
    journal
        .physical
        .encode_changes(&state.physical, &state.records, &[], &mut output, budget)?;
    journal
        .activity
        .encode_changes(&state.activity, &state.records, &mut output, budget)?;
    journal
        .commands
        .encode_changes(&state.commands, &state.records, &mut output, budget)?;
    journal
        .responses
        .encode_changes(&state.responses, &state.records, &mut output, budget)?;
    journal.encode_reception_changes(state, &mut output, budget)?;
    crate::experience::encode_personal_changes(
        &state.experience,
        &journal.experience,
        &state.records,
        &mut output,
        budget,
    )?;
    crate::events::encode_occurrence_changes(&state.occurrences, &mut output, budget)?;
    crate::appraisals::encode_appraisal_changes(
        &state.appraisals,
        &state.records,
        &mut output,
        budget,
    )?;
    crate::cognition::encode_cognition_changes(
        &state.minds,
        &journal.cognition,
        &state.records,
        &mut output,
        budget,
    )?;
    crate::received::encode_temporal_changes(
        &state.temporal,
        &state.records,
        &mut output,
        budget,
        state.physical.identity.next_id(),
    )?;
    encode_root_changes(state, host, write_host, &mut output, budget)?;
    output.finish()
}
fn error() -> RecordEncodingError {
    RecordEncodingError("Native parent save has unavailable scalar fields or capacity.")
}
fn set(map: &mut IndexMap<String, SqlCell>, key: &str, value: SqlCell) {
    map.insert(key.to_owned(), value);
}
fn optional<T: serde::Serialize>(
    map: &mut IndexMap<String, SqlCell>,
    key: &str,
    value: Option<&T>,
) -> Result<(), RecordEncodingError> {
    if let Some(value) = value {
        set(
            map,
            key,
            serde_json::to_value(value).map_err(|_| error())?.into(),
        );
    } else {
        map.shift_remove(key);
    }
    Ok(())
}
fn marker(map: &mut IndexMap<String, SqlCell>, key: &str, present: bool) {
    if present {
        if !map.contains_key(key) {
            set(map, key, SqlCell::Object(IndexMap::new()));
        }
    } else {
        map.shift_remove(key);
    }
}
pub(crate) fn encode_root_changes(
    state: &SimulationState,
    host: &InstalledHostSettings,
    write_host: bool,
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let template = state.records.world_settings_template();
    let header = &state.physical.header;
    let bound = crate::experience::encoded_body_bound(template).map_err(|_| error())?;
    let mut header_reservation = budget.reserve(bound).map_err(|_| error())?;
    let SqlCell::Object(mut body) = serde_json::from_str(template).map_err(|_| error())? else {
        return Err(error());
    };
    const CREATED_FIELDS: &[&str] = &[
        "nativeInterval",
        "archivedEventCount",
        "workState",
        "pendingNativeIntegration",
        "sensory",
        "perceptionEvidence",
        "receivedValues",
        "observerIdentities",
        "perceptionEpisodes",
        "actorKnowledge",
        "knowledgeRevisions",
        "visibleObjects",
        "visiblePeople",
        "visiblePlaces",
        "mapMarkers",
        "minds",
        "innerWorlds",
        "appraisals",
        "appraisalProcesses",
        "responseReceipts",
        "exitExposures",
    ];
    let extra = map_storage::<String, SqlCell>(
        body.len()
            .checked_add(CREATED_FIELDS.len())
            .ok_or_else(error)?,
    )
    .ok_or_else(error)?
    .checked_add(
        CREATED_FIELDS
            .iter()
            .map(|field| field.len())
            .sum::<usize>(),
    )
    .and_then(|n| n.checked_add(map_storage::<String, SqlCell>(2)?))
    .and_then(|n| n.checked_add("remainingSeconds".len() + "endsAt".len()))
    .ok_or_else(error)?;
    header_reservation
        .resize(bound.checked_add(extra).ok_or_else(error)?)
        .map_err(|_| error())?;
    set(
        &mut body,
        "schemaVersion",
        SqlCell::from(header.schema_version),
    );
    set(
        &mut body,
        "rngState",
        SqlCell::from(u64::from(state.physical.identity.rng_state())),
    );
    set(
        &mut body,
        "nextId",
        SqlCell::from(state.physical.identity.next_id()),
    );
    set(&mut body, "sequence", SqlCell::from(header.sequence));
    set(&mut body, "simTime", SqlCell::from(header.sim_time));
    set(&mut body, "paused", SqlCell::from(header.paused));
    optional(&mut body, "nativeInterval", header.native_interval.as_ref())?;
    optional(
        &mut body,
        "archivedEventCount",
        state.occurrences.archived_count().as_ref(),
    )?;
    marker(
        &mut body,
        "coachingEpisodes",
        state.physical.coaching.is_present(),
    );
    marker(&mut body, "exitExposures", state.physical.participation.is_present());
    marker(
        &mut body,
        "workState",
        state.physical.work.state().is_some(),
    );
    marker(
        &mut body,
        "pendingNativeIntegration",
        state.physical.pending_values.is_some(),
    );
    let reception = &state.reception;
    for (field, present) in [
        ("sensory", reception.sensory.is_some()),
        (
            "perceptionEvidence",
            reception.perception_evidence.is_some(),
        ),
        ("receivedValues", reception.received_values.is_some()),
        (
            "observerIdentities",
            reception.observer_identities.is_some(),
        ),
        (
            "perceptionEpisodes",
            reception.perception_episodes.is_some(),
        ),
        ("actorKnowledge", reception.actor_knowledge.is_some()),
        (
            "knowledgeRevisions",
            reception.knowledge_revisions.is_some(),
        ),
        ("visibleObjects", reception.visible_objects.is_some()),
        ("visiblePeople", reception.visible_people.is_some()),
        ("visiblePlaces", reception.visible_places.is_some()),
        ("mapMarkers", reception.map_markers.is_some()),
        ("minds", state.minds.minds.is_some()),
        ("innerWorlds", state.minds.inner_worlds.is_some()),
        ("appraisals", state.appraisals.owner_coverage.parent_present),
        ("appraisalProcesses", state.appraisals.processes_present),
        ("responseReceipts", state.responses.present()),
    ] {
        marker(&mut body, field, present);
    }
    let placement = state
        .records
        .placement("world_settings", "[\"world\"]")
        .ok_or_else(error)?;
    output.write_if_changed("world_settings", placement, &body, template)?;
    if write_host {
        let template = state.records.host_settings_template();
        let _host = budget
            .reserve(
                crate::experience::encoded_body_bound(template)
                    .map_err(|_| error())?
                    .checked_add("speed".len() + "manuallyPaused".len())
                    .ok_or_else(error)?,
            )
            .map_err(|_| error())?;
        let SqlCell::Object(mut body) = serde_json::from_str(template).map_err(|_| error())? else {
            return Err(error());
        };
        set(&mut body, "speed", SqlCell::from(host.speed));
        set(
            &mut body,
            "manuallyPaused",
            SqlCell::Bool(host.manually_paused),
        );
        // Presentation references and milestone bodies keep their operational
        // owner. This gameplay prefix changes only these admitted controls.
        let placement = state
            .records
            .placement("data_world", "[]")
            .ok_or_else(error)?;
        output.write_if_changed("data_world", placement, &body, template)?;
    }
    Ok(())
}
