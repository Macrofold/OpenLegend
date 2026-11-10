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
    pub(crate) player_storage: crate::host::ResidentReservation,
}

/// Server controls travel back to the operational owner on installation. They
/// are not actor facts and are not copied into the writable simulation graph.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct InstalledHostSettings {
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
    // Drop owned strings/maps before releasing their canonical allocation.
    #[serde(skip)]
    _storage: Option<crate::host::ResidentReservation>,
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
    let mut decoded = crate::install::reserve_typed_parse::<InstalledHostSettings>(
        &row.payload,
        0,
        Some(std::mem::size_of::<(usize, String, IndexMap<String, bool>)>()),
        budget,
    )?;
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
    decoded.resize(bytes).map_err(|_| InstallError::Capacity)?;
    settings._storage = Some(
        budget
            .adopt_backing(decoded)
            .map_err(|_| InstallError::Capacity)?,
    );
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
        let target = settings
            .actor_milestones
            .as_ref()
            .ok_or(InstallError::ParentPresence)?;
        if target.contains_key(&row.slot) {
            return Err(InstallError::DuplicateRow);
        }
        let before = crate::host::retained_size::map_storage::<String, IndexMap<String, bool>>(
            target.capacity(),
        )
        .ok_or(InstallError::Capacity)?;
        let maximum_capacity = if target.len() == target.capacity() {
            target
                .len()
                .checked_add(1)
                .and_then(|n| n.checked_mul(2))
                .and_then(|n| n.checked_add(4))
                .ok_or(InstallError::Capacity)?
        } else {
            target.capacity()
        };
        let maximum = crate::host::retained_size::map_storage::<String, IndexMap<String, bool>>(
            maximum_capacity,
        )
        .ok_or(InstallError::Capacity)?;
        let mut decoded = crate::install::reserve_typed_parse::<IndexMap<String, bool>>(
            &row.payload,
            0,
            Some(std::mem::size_of::<(usize, String, bool)>()),
            budget,
        )?;
        let values: IndexMap<String, bool> =
            serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
        let incoming = values
            .heap_bytes()
            .and_then(|n| n.checked_add(row.slot.capacity()))
            .and_then(|n| n.checked_add(maximum.checked_sub(before)?))
            .ok_or(InstallError::Capacity)?;
        // The decoder already funds this actual flags body. Transfer it and
        // admit root backing growth before moving the row into canonical state.
        decoded
            .resize(incoming)
            .map_err(|_| InstallError::Capacity)?;
        budget
            .fund_backing(
                settings
                    ._storage
                    .as_mut()
                    .ok_or(InstallError::CurrentFormat)?,
                decoded,
            )
            .map_err(|_| InstallError::Capacity)?;
        let target = settings
            .actor_milestones
            .as_mut()
            .ok_or(InstallError::ParentPresence)?;
        target.try_reserve(1).map_err(|_| InstallError::Capacity)?;
        let actual = crate::host::retained_size::map_storage::<String, IndexMap<String, bool>>(
            target.capacity(),
        )
        .ok_or(InstallError::Capacity)?;
        let unused = maximum.checked_sub(actual).ok_or(InstallError::Capacity)?;
        target.insert(row.slot, values);
        settings
            .release_milestone_allocation(unused)
            .map_err(|_| InstallError::Capacity)?;
    }
    Ok(settings)
}

impl InstalledHostSettings {
    pub(crate) fn storage_bytes(&self) -> usize {
        self._storage
            .as_ref()
            .map_or(0, crate::host::ResidentReservation::bytes)
    }
    pub(crate) fn fund_milestone_allocation(
        &mut self,
        bytes: usize,
        budget: &crate::host::ByteBudget,
    ) -> Result<(), crate::execution::ExecutionError> {
        if bytes == 0 {
            return Ok(());
        }
        let storage = self
            ._storage
            .as_mut()
            .ok_or(crate::execution::ExecutionError::Invariant)?;
        let incoming = budget
            .reserve(bytes)
            .map_err(|_| crate::execution::ExecutionError::Capacity)?;
        budget
            .fund_backing(storage, incoming)
            .map_err(|_| crate::execution::ExecutionError::Capacity)
    }
    pub(crate) fn release_milestone_allocation(
        &mut self,
        bytes: usize,
    ) -> Result<(), crate::execution::ExecutionError> {
        let storage = self
            ._storage
            .as_mut()
            .ok_or(crate::execution::ExecutionError::Invariant)?;
        let next = storage
            .bytes()
            .checked_sub(bytes)
            .ok_or(crate::execution::ExecutionError::Invariant)?;
        storage
            .resize(next)
            .map_err(|_| crate::execution::ExecutionError::Capacity)
    }
    pub(crate) fn restore_milestone_storage(
        &mut self,
        bytes: usize,
    ) -> Result<(), crate::execution::ExecutionError> {
        let storage = self
            ._storage
            .as_mut()
            .ok_or(crate::execution::ExecutionError::Invariant)?;
        if bytes > storage.bytes() {
            return Err(crate::execution::ExecutionError::Invariant);
        }
        storage
            .resize(bytes)
            .map_err(|_| crate::execution::ExecutionError::Capacity)
    }
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
                    authorship
                        .creator_account_ids
                        .heap_bytes()
                        .ok_or(InstallError::Capacity)?,
                ])
                .ok_or(InstallError::Capacity)?,
            )
            .map_err(|_| InstallError::Capacity)?,
        player_storage: budget
            .reserve_record(
                authorship
                    .player_account_ids
                    .heap_bytes()
                    .ok_or(InstallError::Capacity)?,
            )
            .map_err(|_| InstallError::Capacity)?,
        control,
        authorship,
        object_membership,
    })
}
