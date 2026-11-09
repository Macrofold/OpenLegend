//! Saved application control and account bindings. These facts establish who
//! may request an actor's private capture; perceived identity grants do not.

use crate::host::retained_size::{HeapBytes, heap_record, heap_sum};
use crate::install::rows::{take_collection, take_one, validate_map_row, validate_row};
use crate::install::{InstallError, RowImport};
use crate::state::EntityStore;
use crate::values::{
    deserialize_nullable, deserialize_present_option, deserialize_present_safe_integer,
    deserialize_safe_integer, is_safe_record_id,
};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
heap_record!(ControlBindings {
    controlled_entity_id,
    default_resident_entity_id
});
heap_record!(Authorship {
    creator_account_ids,
    player_account_ids
});

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ControlBindings {
    pub controlled_entity_id: String,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub default_resident_entity_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Authorship {
    pub creator_account_ids: Vec<String>,
    pub player_account_ids: IndexMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct ObjectMembership {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
}

pub(crate) struct AdministrationState {
    pub control: Option<ControlBindings>,
    pub authorship: Authorship,
    pub object_membership: ObjectMembership,
    _storage: crate::host::ResidentReservation,
}

/// Server controls travel back to the operational owner on installation. They
/// are not actor facts and are not copied into the writable simulation graph.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct InstalledHostSettings {
    #[serde(skip)]
    _storage: Option<crate::host::ResidentReservation>,
    pub world: crate::experience::EmptyChildOwner,
    // Exact immutable asset reference, interpreted/authorized by the existing
    // server asset owner. Native gameplay never uses it as a body permission.
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub presentation_release: Option<Box<serde_json::value::RawValue>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub presentation_release_revision: Option<u64>,
    pub speed: f64,
    pub manually_paused: bool,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub actor_milestones: Option<IndexMap<String, IndexMap<String, bool>>>,
}

pub(crate) fn read_host_settings(
    import: &mut RowImport,
    budget: &crate::host::ByteBudget,
) -> Result<InstalledHostSettings, InstallError> {
    let mut rows = import.take_table("data_world");
    if rows.len() != 1 {
        return Err(InstallError::CurrentFormat);
    }
    let row = rows.pop().expect("one saved application root");
    if row.id != "[]"
        || !row.parent.is_empty()
        || !row.slot.is_empty()
        || row.position != 0
        || !row.extra.is_empty()
    {
        return Err(InstallError::RowPlacement);
    }
    let mut settings: InstalledHostSettings =
        serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
    if !settings.speed.is_finite()
        || settings
            .actor_milestones
            .as_ref()
            .is_some_and(|values| !values.is_empty())
    {
        return Err(InstallError::CurrentFormat);
    }
    let milestones = take_collection(
        import,
        "actor_milestones",
        "[]",
        settings.actor_milestones.is_some(),
        true,
    )?;
    for row in milestones.rows {
        validate_map_row(
            &row,
            "[]",
            "actorMilestones",
            &row.slot,
            milestones.coverage.next_ordinal,
        )?;
        if !row.extra.is_empty() {
            return Err(InstallError::CurrentFormat);
        }
        let values: IndexMap<String, bool> =
            serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
        if settings
            .actor_milestones
            .as_mut()
            .ok_or(InstallError::ParentPresence)?
            .insert(row.slot, values)
            .is_some()
        {
            return Err(InstallError::DuplicateRow);
        }
    }
    let bytes = heap_sum([
        settings
            .presentation_release
            .as_ref()
            .map_or(0, |raw| raw.get().len()),
        settings
            .actor_milestones
            .heap_bytes()
            .ok_or(InstallError::Capacity)?,
    ])
    .ok_or(InstallError::Capacity)?;
    settings._storage = Some(
        budget
            .reserve_record(bytes)
            .map_err(|_| InstallError::Capacity)?,
    );
    Ok(settings)
}

pub(crate) fn install_administration(
    import: &mut RowImport,
    control_present: bool,
    authorship_present: bool,
    objects_present: bool,
    entities: &EntityStore,
    budget: &crate::host::ByteBudget,
) -> Result<AdministrationState, InstallError> {
    let control = take_one::<ControlBindings>(
        import,
        "world_control",
        "[\"world\"]",
        "identity",
        control_present,
    )?
    .map(|(row, value)| {
        if !row.extra.is_empty()
            || !entities
                .get(&value.controlled_entity_id)
                .is_some_and(|e| e.actor.is_some())
            || value
                .default_resident_entity_id
                .as_ref()
                .is_some_and(|id| !entities.get(id).is_some_and(|e| e.actor.is_some()))
        {
            return Err(InstallError::CurrentFormat);
        }
        Ok(value)
    })
    .transpose()?;
    let (owner, mut authorship) = take_one::<Authorship>(
        import,
        "world_authorship",
        "[\"world\"]",
        "authorship",
        authorship_present,
    )?
    .ok_or(InstallError::ParentPresence)?;
    if !owner.extra.is_empty()
        || !authorship.creator_account_ids.is_empty()
        || !authorship.player_account_ids.is_empty()
    {
        return Err(InstallError::CurrentFormat);
    }
    let creators = take_collection(import, "world_creators", &owner.id, true, true)?;
    for (at, row) in creators.rows.into_iter().enumerate() {
        let slot = at.to_string();
        validate_row(
            &row,
            &["world", "authorship", "creatorAccountIds", &slot],
            &owner.id,
            &slot,
            creators.coverage.next_ordinal,
        )?;
        let account: String =
            serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
        if row.position != at as u64
            || !row.extra.is_empty()
            || !is_safe_record_id(&account)
            || authorship.creator_account_ids.contains(&account)
        {
            return Err(InstallError::CurrentFormat);
        }
        authorship.creator_account_ids.push(account);
    }
    // This is the existing saved-authorship bound, not a native population cap.
    if authorship.creator_account_ids.is_empty() || authorship.creator_account_ids.len() > 64 {
        return Err(InstallError::CurrentFormat);
    }
    let players = take_collection(import, "world_player_accounts", &owner.id, true, true)?;
    for row in players.rows {
        validate_map_row(
            &row,
            &owner.id,
            "playerAccountIds",
            &row.slot,
            players.coverage.next_ordinal,
        )?;
        let account: String =
            serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
        if !row.extra.is_empty()
            || !is_safe_record_id(&row.slot)
            || !is_safe_record_id(&account)
            || authorship
                .player_account_ids
                .insert(row.slot, account)
                .is_some()
        {
            return Err(InstallError::CurrentFormat);
        }
    }
    let (row, object_membership) = take_one::<ObjectMembership>(
        import,
        "sim_object_state",
        "[\"world\"]",
        "objectState",
        objects_present,
    )?
    .ok_or(InstallError::ParentPresence)?;
    if !row.extra.is_empty() {
        return Err(InstallError::CurrentFormat);
    }
    Ok(AdministrationState {
        _storage: budget
            .reserve_record(
                heap_sum([
                    control.heap_bytes().ok_or(InstallError::Capacity)?,
                    authorship.heap_bytes().ok_or(InstallError::Capacity)?,
                ])
                .ok_or(InstallError::Capacity)?,
            )
            .map_err(|_| InstallError::Capacity)?,
        control,
        authorship,
        object_membership,
    })
}
