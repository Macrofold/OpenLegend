use crate::execution::{CoreMutation, ExecutionError};
use crate::host::retained_size::{HeapBytes, heap_record, map_storage};
use crate::host::{ByteBudget, ByteReservation, ResidentReservation};
use crate::records::{RecordEncodingError, RowEncoder};
use crate::simulation::SimulationState;
use crate::values::{deserialize_safe_integer, is_safe_record_id};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::mem::size_of;
#[path = "archives.rs"]
mod archives;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RestoreBinding {
    pub actor_id: String,
    pub account_id: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RestoreGrant {
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub actor_id: Option<String>,
    pub account_id: String,
}
#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum ArchiveCategory {
    Optional,
    Required,
    Speech,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RestoreArchive {
    pub actor_id: String,
    pub kind: String,
    pub id: String,
    pub revision: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub bytes: u64,
    pub category: ArchiveCategory,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RestoreMetadataInput {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub identity_floor: u64,
    pub actor_owners: Vec<RestoreBinding>,
    pub world_grants: Vec<RestoreGrant>,
    pub privacy_revisions: IndexMap<String, u64>,
    pub namespace: String,
    pub archives: Vec<RestoreArchive>,
}
heap_record!(RestoreBinding {
    actor_id,
    account_id
});
heap_record!(RestoreGrant {
    actor_id,
    account_id
});
heap_record!(RestoreArchive {
    actor_id,
    kind,
    id,
    revision
});
heap_record!(RestoreMetadataInput {
    actor_owners,
    world_grants,
    privacy_revisions,
    namespace,
    archives
});
#[derive(Serialize)]
pub(crate) struct RestorePrivacy {
    pub forgotten: IndexMap<String, Vec<String>>,
    pub corrections: IndexMap<String, IndexMap<String, String>>,
}
heap_record!(RestorePrivacy {
    forgotten,
    corrections
});
pub(crate) struct RestoreMetadataPreparation {
    input: RestoreMetadataInput,
    storage: ByteReservation,
    selection: Option<archives::Selection>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestoreMetadataResult {
    pub kept_archives: Vec<RestoreArchive>,
    pub privacy: RestorePrivacy,
    #[serde(skip)]
    _storage: ByteReservation,
}

struct BindingBefore {
    value: IndexMap<String, String>,
    storage: ResidentReservation,
}
pub(crate) struct MetadataJournal {
    before: Vec<BindingBefore>,
    storage: ByteReservation,
    budget: ByteBudget,
}
impl MetadataJournal {
    pub(crate) fn new(budget: &ByteBudget) -> Result<Self, ExecutionError> {
        Ok(Self {
            before: Vec::new(),
            storage: budget.reserve(0)?,
            budget: budget.clone(),
        })
    }
    pub(crate) fn checkpoint(&self) -> usize {
        self.before.len()
    }
    pub(crate) fn rollback_to(
        &mut self,
        state: &mut SimulationState,
        at: usize,
    ) -> Result<(), ExecutionError> {
        if at > self.before.len() {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        while self.before.len() > at {
            let old = self.before.pop().ok_or(ExecutionError::Invariant)?;
            state.administration.authorship.player_account_ids = old.value;
            state.administration.player_storage = old.storage;
        }
        Ok(())
    }
    pub(crate) fn discard_undo(&mut self) {
        self.before.clear();
    }
    fn replace_bindings(
        &mut self,
        state: &mut SimulationState,
        next: IndexMap<String, String>,
        storage: ResidentReservation,
    ) -> Result<(), ExecutionError> {
        let bytes = self
            .before
            .capacity()
            .checked_add(4)
            .and_then(|n| n.checked_mul(2 * size_of::<BindingBefore>()))
            .ok_or(ExecutionError::Capacity)?;
        self.storage.resize(bytes)?;
        self.before
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        self.budget
            .retain_record(&state.administration.player_storage)?;
        self.before.push(BindingBefore {
            value: std::mem::replace(
                &mut state.administration.authorship.player_account_ids,
                next,
            ),
            storage: std::mem::replace(&mut state.administration.player_storage, storage),
        });
        Ok(())
    }
    pub(crate) fn encode_changes(
        &self,
        state: &SimulationState,
        output: &mut RowEncoder<'_>,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        let Some(before) = self.before.first() else {
            return Ok(());
        };
        crate::records::encode_map_changes(
            &state.installed.schema,
            &state.records,
            "world_player_accounts",
            &["world", "authorship"],
            Some("playerAccountIds"),
            Some(&before.value),
            Some(&state.administration.authorship.player_account_ids),
            crate::records::MapPositions::Ordered,
            output,
            budget,
        )
    }
}
fn invalid() -> ExecutionError {
    ExecutionError::InvalidCheckpoint
}
pub(crate) fn begin_restore_metadata(
    core: &mut CoreMutation<'_>,
    input: RestoreMetadataInput,
    budget: &ByteBudget,
) -> Result<RestoreMetadataPreparation, ExecutionError> {
    if input.identity_floor > crate::identity::MAX_SAFE_INTEGER
        || crate::encoding::js_trim(&input.namespace).is_empty()
        || input.namespace.encode_utf16().count() > 64
        || input.privacy_revisions.iter().any(|(actor, revision)| {
            !is_safe_record_id(actor) || *revision > crate::identity::MAX_SAFE_INTEGER
        })
        || input
            .actor_owners
            .iter()
            .any(|b| !is_safe_record_id(&b.actor_id) || !is_safe_record_id(&b.account_id))
        || input.world_grants.iter().any(|b| {
            !is_safe_record_id(&b.account_id)
                || b.actor_id.as_ref().is_some_and(|id| {
                    !is_safe_record_id(id)
                        || core
                            .state
                            .physical
                            .entities
                            .get(id)
                            .is_none_or(|e| e.actor.is_none())
                })
        })
    {
        return Err(invalid());
    }
    let storage = budget.reserve(
        input
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?
            .checked_add(size_of::<RestoreMetadataPreparation>())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    core.state.physical.identity.preserve_issued_high_water(
        crate::identity::IdentityState::install(
            core.state.physical.identity.rng_state(),
            input.identity_floor,
        )?,
    );
    let old = &core.state.administration.authorship.player_account_ids;
    let count = old
        .len()
        .checked_add(input.actor_owners.len())
        .and_then(|n| n.checked_add(input.world_grants.len()))
        .ok_or(ExecutionError::Capacity)?;
    let strings = input
        .actor_owners
        .iter()
        .map(|b| b.actor_id.len() + b.account_id.len())
        .chain(
            input
                .world_grants
                .iter()
                .map(|b| b.actor_id.as_ref().map_or(0, String::len) + b.account_id.len()),
        )
        .try_fold(
            old.iter()
                .try_fold(0usize, |n, (id, account)| {
                    n.checked_add(id.capacity() + account.capacity())
                })
                .ok_or(ExecutionError::Capacity)?,
            |n, bytes| n.checked_add(bytes),
        )
        .ok_or(ExecutionError::Capacity)?;
    let mut guard = budget.reserve(
        map_storage::<String, String>(
            count
                .checked_mul(2)
                .and_then(|n| n.checked_add(3))
                .ok_or(ExecutionError::Capacity)?,
        )
        .and_then(|n| n.checked_add(strings))
        .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut next = IndexMap::with_capacity(count);
    next.extend(
        old.iter()
            .map(|(id, account)| (id.clone(), account.clone())),
    );
    for (actor, account) in input
        .actor_owners
        .iter()
        .map(|b| (&b.actor_id, &b.account_id))
        .chain(
            input
                .world_grants
                .iter()
                .filter_map(|b| b.actor_id.as_ref().map(|id| (id, &b.account_id))),
        )
    {
        next.insert(actor.clone(), account.clone());
        if core
            .state
            .physical
            .entities
            .get(actor)
            .is_some_and(|entity| entity.actor.is_some())
        {
            core.physical().restore_actor_operational(actor, true)?;
        }
    }
    if next != core.state.administration.authorship.player_account_ids {
        guard.resize(next.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        let record = budget.adopt_record(guard)?;
        core.journal
            .restore_metadata
            .replace_bindings(core.state, next, record)?;
    }
    let count = core.state.physical.entities.len();
    let _ids = budget.reserve(
        count
            .checked_mul(size_of::<String>())
            .and_then(|n| {
                core.state
                    .physical
                    .entities
                    .ordered_ids()
                    .try_fold(n, |n, id| n.checked_add(id.len()))
            })
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let ids = core
        .state
        .physical
        .entities
        .ordered_ids()
        .filter(|id| {
            core.state.physical.entities.get(id).is_some_and(|e| {
                e.actor
                    .as_ref()
                    .is_some_and(|a| a.inventory_inspection.is_some())
            })
        })
        .map(str::to_owned)
        .collect::<Vec<_>>();
    for actor in ids {
        core.physical().restore_actor_operational(&actor, false)?;
    }
    Ok(RestoreMetadataPreparation {
        input,
        storage,
        selection: None,
    })
}
pub(crate) fn finish_restore_metadata(
    core: &mut CoreMutation<'_>,
    prepared: RestoreMetadataPreparation,
    budget: &ByteBudget,
) -> Result<RestoreMetadataResult, ExecutionError> {
    let RestoreMetadataPreparation {
        input,
        mut storage,
        selection,
    } = prepared;
    let kept_archives = selection.ok_or(ExecutionError::InvalidCheckpoint)?;
    core.state.temporal.restore_archive_totals(
        input
            .archives
            .iter()
            .zip(&kept_archives.kept)
            .filter_map(|(row, category)| {
                category
                    .filter(|_| row.kind != "perspective")
                    .map(|category| (row.actor_id.as_str(), category, row.bytes))
            }),
        budget,
    )?;
    for (actor, revision) in &input.privacy_revisions {
        core.journal.experience.restore_privacy_revision(
            &mut core.state.experience,
            actor,
            *revision,
        )?;
    }
    // These are actual current owner constraints after alias expansion and all
    // correction/forget children, not the incoming historical privacy ledger.
    let bytes = core
        .state
        .experience
        .privacy_metadata_bound()
        .ok_or(ExecutionError::Capacity)?;
    storage.resize(
        storage
            .bytes()
            .checked_add(bytes)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let privacy = core.state.experience.restore_privacy_metadata();
    crate::reception::clear_restore_recordings(core, budget)?;
    core.state.temporal.begin_restore_epoch(
        &input.namespace,
        &mut core.state.physical.identity,
        budget,
    )?;
    core.state.physical.header.paused = true;
    // The input iterator retains its carrier while surviving rows move into
    // the result. Fund that second carrier before allocating it.
    storage.merge(
        budget.reserve(
            input
                .archives
                .len()
                .checked_mul(size_of::<RestoreArchive>())
                .ok_or(ExecutionError::Capacity)?,
        )?,
    )?;
    let mut selected = Vec::with_capacity(input.archives.len());
    for (i, row) in input.archives.into_iter().enumerate() {
        if let Some(category) = kept_archives.kept.get(i).copied().flatten().as_ref() {
            selected.push(RestoreArchive {
                category: *category,
                ..row
            })
        }
    }
    Ok(RestoreMetadataResult {
        kept_archives: selected,
        privacy,
        _storage: storage,
    })
}

pub(crate) use archives::{
    RestoreArchivesAnswer, RestoreArchivesCursor, RestoreArchivesQuestion, RestoreArchivesStep,
};
