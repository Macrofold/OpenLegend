//! Real dependency-ordered composition of the currently converted owners.
//! Remaining roots stay unclaimed: this private intermediate cannot install a
//! live simulation, advance it or mint a Ready/completion token.

use super::*;
use crate::events::OriginalOccurrenceInput;
use crate::experience::{
    PersonalInstallContext, install_cognition, install_personal, install_received_values,
};
use crate::host::ByteBudget;
use crate::received::ReceivedChargeDirectory;
use crate::reception::{OriginalRevisionRegistry, ReceptionRoots, read_reception_rows};
use crate::records::{CurrentRecords, RecordLayout, RecordSchema};
use crate::simulation::{InstalledWorld, SimulationState};
use crate::worlds::InstalledEvidenceMeaning;

#[derive(Debug)]
pub(crate) enum CoreInstallError {
    Records(InstallError),
    Encoding(crate::records::RecordEncodingError),
    Personal(crate::experience::PersonalInstallError),
    Receiving(crate::received::ReceivedError),
    Activity(crate::activity::ActivityError),
    Execution(crate::execution::ExecutionError),
    MissingTemporal,
}
impl From<InstallError> for CoreInstallError {
    fn from(value: InstallError) -> Self {
        Self::Records(value)
    }
}
impl From<crate::records::RecordEncodingError> for CoreInstallError {
    fn from(value: crate::records::RecordEncodingError) -> Self {
        Self::Encoding(value)
    }
}
impl From<crate::experience::PersonalInstallError> for CoreInstallError {
    fn from(value: crate::experience::PersonalInstallError) -> Self {
        Self::Personal(value)
    }
}
impl From<crate::received::ReceivedError> for CoreInstallError {
    fn from(value: crate::received::ReceivedError) -> Self {
        Self::Receiving(value)
    }
}
impl From<crate::activity::ActivityError> for CoreInstallError {
    fn from(value: crate::activity::ActivityError) -> Self {
        Self::Activity(value)
    }
}
impl From<crate::execution::ExecutionError> for CoreInstallError {
    fn from(value: crate::execution::ExecutionError) -> Self {
        Self::Execution(value)
    }
}

pub(crate) struct CoreInstallInput {
    pub records: CurrentRecords,
    pub originals: Vec<OriginalOccurrenceInput>,
    pub definitions: NativeDefinitionInputs,
    pub settings: NativeSetupSettings,
    pub layouts: Vec<RecordLayout>,
    pub cold_directories: Option<IndexMap<String, Vec<ReceivedChargeDirectory>>>,
    pub accepted_cut: u64,
}
pub(crate) struct CoreInstallation {
    pub state: SimulationState,
    pub host_settings: crate::administration::InstalledHostSettings,
    pub remaining_rows: RowImport,
    pub remaining_children: WorldChildren,
    pub archived_event_count: Option<u64>,
    pub assembly_geometry_revision: Option<u64>,
    pub story_policy_revision: Option<u64>,
}
fn child(children: &mut WorldChildren, field: &str, required: bool) -> Result<bool, InstallError> {
    match children.take(field)? {
        Some(true) => Ok(true),
        None if !required => Ok(false),
        _ => Err(InstallError::ParentPresence),
    }
}
fn selected<T: DefinitionIdentity + DeserializeOwned + PartialEq>(
    input: DefinitionInput,
) -> Result<VerifiedDefinition<T>, InstallError> {
    let value = serde_json::from_str(&input.canonical).map_err(|_| InstallError::DefinitionBody)?;
    input.verify(value)
}

pub(crate) fn assemble_core(
    input: CoreInstallInput,
    database_schema: &str,
    budget: &ByteBudget,
) -> Result<CoreInstallation, CoreInstallError> {
    assemble_selected_core(input, None, database_schema, budget)
}
/// Active cold restoration supplies the exact indexed selection made by the
/// maintained SQL owner; creation/full current import supplies complete rows.
pub(crate) fn assemble_working_core(
    input: CoreInstallInput,
    selection: WorkingSetSelection,
    database_schema: &str,
    budget: &ByteBudget,
) -> Result<CoreInstallation, CoreInstallError> {
    // The Source startup prunes hot pointers and forces its archived header
    // through the same first save. Refuse until that native saved projection
    // has joined the save owner; importing fewer pointers alone loses counts.
    if selection.removed_hot_events != 0 {
        return Err(InstallError::UnsupportedFamily("active hot-history projection").into());
    }
    assemble_selected_core(input, Some(selection), database_schema, budget)
}
fn assemble_selected_core(
    input: CoreInstallInput,
    working_set: Option<WorkingSetSelection>,
    database_schema: &str,
    budget: &ByteBudget,
) -> Result<CoreInstallation, CoreInstallError> {
    if input.accepted_cut > MAX_SAFE_INTEGER {
        return Err(InstallError::Identity.into());
    }
    let CoreInstallInput {
        records,
        originals,
        definitions,
        settings,
        layouts,
        cold_directories,
        accepted_cut,
    } = input;
    let schema = Arc::new(RecordSchema::install(layouts)?);
    let record_ledger = crate::records::RecordLedger::from_records(&records, accepted_cut, budget)?;
    let mut import = RowImport::new(records, CurrentFormat { database_schema })?;
    if let Some(selection) = working_set {
        import.install_working_set(selection, budget)?;
    }
    let host_settings = crate::administration::read_host_settings(&mut import, budget)?;
    let NativeDefinitionInputs {
        manifest,
        retained,
        attributes,
        senses,
        acoustics,
        response_profiles,
        body_policy,
        status_policy,
        work_policy,
        attention,
        event_disclosure,
        detection_support,
        prepared_responses,
        movement_policy,
        time_rules,
        account_rules,
        name_rules,
        recognition,
        occurrence_rules,
        speech_action,
        ordinary_actions,
        observation_rules,
        event_appraisal_rules,
        promises,
        social_defaults,
        presentation,
    } = definitions;
    let mut root = read_physical_root(&mut import, presentation.as_ref())?;
    crate::worlds::require_profile(&root.content.profile)?;
    let manifest_present = child(&mut root.children, "moduleManifest", true)?;
    let statuses_present = child(&mut root.children, "statusEffectPolicy", true)?;
    let profiles_present = child(&mut root.children, "nativeResponseProfiles", false)?;
    let NativeSetupSettings {
        encounter_batch_entries,
        work,
        maximum_change_scopes,
        spatial,
        movement,
        time_epsilon,
        activity,
        activity_display_bytes,
        native_response,
        personal_evidence_preparation,
        mind,
        agency,
        actor_response,
    } = settings;
    let encounter_batch_entries = usize::try_from(encounter_batch_entries)
        .ok()
        .filter(|n| *n > 0)
        .ok_or(InstallError::CurrentFormat)?;
    let meanings = install_physical_meanings(
        &mut import,
        manifest_present,
        statuses_present,
        profiles_present,
        PhysicalDefinitionInputs {
            manifest,
            attributes,
            senses,
            acoustics,
            body_policy,
            response_profiles,
            status_policy,
            work_policy,
        },
        work,
    )?;
    let map_present = child(&mut root.children, "map", true)?;
    let geometry = Arc::new(install_geometry(&mut import, map_present)?);
    let social = install_social(
        &mut import,
        root.children.take("socialPolicy")?,
        &social_defaults,
    )?;
    let prepared = selected::<crate::experience::PreparedResponseProfile>(prepared_responses)?;
    let cognition = install_cognition(
        &mut import,
        child(&mut root.children, "cognitionPolicy", true)?,
        Some(&prepared),
        &meanings.status_policy,
    )?;
    let attention = selected::<crate::attention::AttentionPolicy>(attention)?;
    let account_rules = selected::<crate::worlds::InstalledAccountRules>(account_rules)?;
    let name_rules = selected::<crate::worlds::InstalledPersonalNameRules>(name_rules)?;
    let recognition = selected::<crate::worlds::InstalledRecognitionPolicy>(recognition)?;
    let occurrence_rules = selected::<crate::worlds::InstalledOccurrenceRules>(occurrence_rules)?;
    let speech_action = selected::<crate::worlds::InstalledSpeechAction>(speech_action)?;
    let ordinary_actions =
        selected::<crate::worlds::InstalledOrdinaryActionRules>(ordinary_actions)?;
    let promises = selected::<crate::worlds::InstalledPromiseRules>(promises)?;
    let observation_rules =
        selected::<crate::worlds::InstalledObservationRules>(observation_rules)?;
    let event_appraisal_rules =
        selected::<crate::worlds::InstalledEventAppraisalRules>(event_appraisal_rules)?;
    let event_disclosure = selected::<crate::worlds::InstalledEventDisclosure>(event_disclosure)?;
    let detection_support =
        selected::<crate::reception::DetectionSupportPolicy>(detection_support)?;
    let movement_law = crate::worlds::InstalledMovementPolicy::install(movement_policy)?;
    let maximum_candidates = usize::try_from(native_response.maximum_candidates)
        .map_err(|_| InstallError::CurrentFormat)?;
    let maximum_path_points =
        usize::try_from(spatial.max_path_points).map_err(|_| InstallError::CurrentFormat)?;
    let PhysicalInstallation {
        state: mut physical,
        mut content,
        personal,
        archived_event_count,
        assembly_geometry_revision,
        story_policy_revision,
        mut children,
    } = install_physical(
        &mut import,
        root,
        &PhysicalDefinitions {
            senses: &meanings.senses,
            default_senses: &meanings.default_senses,
            response_profiles: &meanings.response_profiles,
            work_policy: meanings.work_policy.clone(),
            attributes: &meanings.attributes,
            status_policy: &meanings.status_policy,
            body_policy: meanings.body_policy.as_ref().map(VerifiedDefinition::value),
            maximum_candidates,
            maximum_path_points,
            epsilon: spatial.epsilon,
            population_work: &meanings.population_work,
        },
    )?;
    physical.entities.fund_installed_actions(budget)?;
    physical.entities.fund_installed_goals(budget)?;
    physical.entities.fund_installed_intents(budget)?;
    physical.entities.fund_entity_metadata(budget)?;
    content.fund(budget)?;
    let retained = install_retained(&mut import, &mut children, retained, &schema, budget)?;
    super::physical::validate_physical_item_references(&physical, &retained)?;
    let installed = Arc::new(InstalledWorld {
        encounter_batch_entries,
        manifest: meanings.manifest,
        retained,
        schema: schema.clone(),
        content,
        attributes: meanings.attributes,
        senses: meanings.senses,
        default_senses: meanings.default_senses,
        acoustics: meanings.acoustics,
        response_profiles: meanings.response_profiles,
        status_policy: meanings.status_policy,
        capabilities: meanings.capabilities,
        status_policy_canonical: meanings.status_policy_canonical,
        status_work: meanings.status_work,
        population_work: meanings.population_work,
        status_rosters: crate::status::StatusRosters::new(),
        geometry,
        work_policy: meanings.work_policy,
        event_disclosure,
        attention,
        cognition,
        prepared_responses: prepared,
        name_rules,
        recognition,
        social,
        speech_action,
        ordinary_actions,
        promises,
        observation_rules,
        event_appraisal_rules,
        account_rules,
        occurrence_rules,
        detection_support,
        maximum_change_scopes: usize::try_from(maximum_change_scopes)
            .map_err(|_| InstallError::CurrentFormat)?,
        movement: movement_law,
        time_rules: crate::worlds::InstalledTimeRules::install(time_rules)?,
        body_policy: meanings.body_policy,
        spatial,
        movement_settings: movement,
        time_epsilon,
        response_settings: native_response,
        personal_evidence_preparation,
        mind_limits: mind,
        agency_limits: agency,
        actor_response_limits: actor_response,
    });
    crate::plans::validate_installation(&physical, &installed)?;
    // Every presence below is consumed from the actual root, including empty
    // owners. Missing rows never synthesize an empty receiver or personal graph.
    let roots = ReceptionRoots {
        sensory: child(&mut children, "sensory", false)?,
        perception_evidence: child(&mut children, "perceptionEvidence", false)?,
        observer_identities: child(&mut children, "observerIdentities", false)?,
        perception_episodes: child(&mut children, "perceptionEpisodes", false)?,
        actor_knowledge: child(&mut children, "actorKnowledge", false)?,
        knowledge_revisions: child(&mut children, "knowledgeRevisions", false)?,
        visible_objects: child(&mut children, "visibleObjects", false)?,
        visible_people: child(&mut children, "visiblePeople", false)?,
        visible_places: child(&mut children, "visiblePlaces", false)?,
        map_markers: child(&mut children, "mapMarkers", false)?,
    };
    for field in ["experience", "memories", "receivedValues", "events"] {
        child(&mut children, field, matches!(field, "memories" | "events"))?;
    }
    let display_bytes =
        usize::try_from(activity_display_bytes).map_err(|_| InstallError::CurrentFormat)?;
    let display = Arc::new(activity.display(display_bytes)?);
    let received = install_received_values(
        &mut import,
        personal.received_values,
        physical.header.sim_time,
        physical.header.sequence,
        display.clone(),
        budget,
    )?;
    let mut reception = read_reception_rows(&mut import, roots, received, &schema, budget)?;
    reception.fund_originals(budget)?;
    reception.fund_current_records(budget)?;
    let mut revisions = OriginalRevisionRegistry::new(budget)?;
    let personal_install = install_personal(
        &mut import,
        originals,
        PersonalInstallContext {
            activity_limits: &display,
            budget,
            presence: personal,
            through: physical.header.sim_time,
            archived_event_count,
            reception: &reception,
            cold_directories: cold_directories.as_ref(),
            original_revisions: &mut revisions,
        },
        &InstalledEvidenceMeaning,
    )?;
    let temporal = personal_install
        .temporal
        .ok_or(CoreInstallError::MissingTemporal)?;
    reception.validate_reception(&physical, &installed, &temporal, &mut revisions)?;
    let activity = crate::activity::install_activity(
        &mut import,
        child(&mut children, "actionExperience", true)?,
        Arc::new(activity),
        display,
        budget,
    )?;
    let commands = crate::commands::CommandState::install(
        &mut import,
        child(&mut children, "commandReceipts", true)?,
    )?;
    let responses = crate::response::ResponseState::install(
        &mut import,
        child(&mut children, "responseReceipts", false)?,
        &installed.actor_response_limits,
        budget,
    )?;
    let minds = crate::cognition::install_minds(
        &mut import,
        child(&mut children, "minds", false)?,
        child(&mut children, "innerWorlds", false)?,
        &physical.entities,
        &installed.mind_limits,
        &schema,
        budget,
    )?;
    let administration = crate::administration::install_administration(
        &mut import,
        child(&mut children, "identity", false)?,
        child(&mut children, "authorship", true)?,
        child(&mut children, "objectState", true)?,
        &physical.entities,
        budget,
    )?;
    let inventory = super::inventory::install_closed_inventory(
        &mut import,
        child(&mut children, "resourceReservations", false)?,
        &physical.entities,
    )?;
    let learned_capabilities = install_learned_capabilities(
        &mut import,
        child(&mut children, "knowledge", true)?,
        &physical.entities,
    )?;
    let mut appraisals = crate::appraisals::install_appraisals(
        &mut import,
        child(&mut children, "appraisals", false)?,
        child(&mut children, "appraisalProcesses", false)?,
        &physical.entities,
        &installed,
    )?;
    appraisals.prepare_indices(budget)?;
    let state = SimulationState {
        records: record_ledger,
        generation: import.generation().to_owned(),
        accepted_cut,
        durable_revision: import.durable_revision(),
        installed,
        physical,
        reception,
        experience: personal_install.experience,
        temporal,
        occurrences: personal_install.occurrences,
        activity,
        commands,
        responses,
        minds,
        administration,
        inventory,
        learned_capabilities,
        appraisals,
    };
    Ok(CoreInstallation {
        state,
        host_settings,
        remaining_rows: import,
        remaining_children: children,
        archived_event_count,
        assembly_geometry_revision,
        story_policy_revision,
    })
}
