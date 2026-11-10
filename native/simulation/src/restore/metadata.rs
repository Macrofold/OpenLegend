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
/// The first selected archive state has entered the real temporal journal.
/// Retention may change it, but finalization cannot reset it to this baseline.
pub(crate) struct RestoreArchiveBaseline {
    prepared: RestoreMetadataPreparation,
}
pub(crate) struct PreparedRestoreArchives {
    rows: Vec<RestoreArchive>,
    storage: ByteReservation,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestoreMetadataResult {
    pub kept_archives: Vec<RestoreArchive>,
    pub privacy: RestorePrivacy,
    pub archive_baseline: Vec<RestoreArchive>,
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
pub(crate) fn apply_restore_archive_baseline(
    core: &mut CoreMutation<'_>,
    prepared: RestoreMetadataPreparation,
    budget: &ByteBudget,
) -> Result<RestoreArchiveBaseline, ExecutionError> {
    let input = &prepared.input;
    let kept_archives = prepared
        .selection
        .as_ref()
        .ok_or(ExecutionError::InvalidCheckpoint)?;
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
    crate::reception::clear_restore_recordings(core, budget)?;
    core.state.temporal.begin_restore_epoch(
        &input.namespace,
        &mut core.state.physical.identity,
        budget,
    )?;
    core.state.physical.header.paused = true;
    Ok(RestoreArchiveBaseline { prepared })
}

impl RestoreArchiveBaseline {
    pub(crate) fn archives(&self) -> impl Serialize + '_ {
        struct Rows<'a>(&'a RestoreMetadataPreparation);
        impl Serialize for Rows<'_> {
            fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
                use serde::ser::SerializeSeq;
                let selected = self
                    .0
                    .selection
                    .as_ref()
                    .expect("validated archive baseline");
                let mut rows = serializer.serialize_seq(Some(
                    selected.kept.iter().filter(|value| value.is_some()).count(),
                ))?;
                #[derive(Serialize)]
                #[serde(rename_all = "camelCase")]
                struct Row<'a> {
                    actor_id: &'a str,
                    kind: &'a str,
                    id: &'a str,
                    revision: &'a str,
                    bytes: u64,
                    category: ArchiveCategory,
                }
                for (row, category) in self.0.input.archives.iter().zip(&selected.kept) {
                    if let Some(category) = category {
                        rows.serialize_element(&Row {
                            actor_id: &row.actor_id,
                            kind: &row.kind,
                            id: &row.id,
                            revision: &row.revision,
                            bytes: row.bytes,
                            category: *category,
                        })?;
                    }
                }
                rows.end()
            }
        }
        Rows(&self.prepared)
    }

    /// Prepare exact final metadata before applying the provider's journal
    /// effects. A malformed prior leaves the same archive question retryable.
    pub(crate) fn prepare_versions(
        &self,
        plan: &crate::received::SourceVersionPlan,
        budget: &ByteBudget,
    ) -> Result<PreparedRestoreArchives, crate::experience::HistoryPreparationError> {
        use crate::experience::HistoryPreparationError as E;
        use crate::host::retained_size::heap_sum;
        use crate::received::AccountClass;
        type Key<'a> = (&'a str, &'a str, &'a str, &'a str);
        let selected = self
            .prepared
            .selection
            .as_ref()
            .ok_or(E::MalformedResponse)?;
        let count = selected.kept.iter().filter(|value| value.is_some()).count();
        let changes = plan.archive_changes().len();
        let maximum = count.checked_add(changes).ok_or(E::Capacity)?;
        let names = self
            .prepared
            .input
            .archives
            .iter()
            .zip(&selected.kept)
            .filter(|(_, category)| category.is_some())
            .try_fold(0usize, |n, (row, _)| n.checked_add(row.heap_bytes()?))
            .and_then(|n| {
                plan.archive_changes().try_fold(n, |n, row| {
                    n.checked_add(row.actor_id.len())?
                        .checked_add(row.kind.len())?
                        .checked_add(row.id.len())?
                        .checked_add(row.revision.len())
                })
            })
            .ok_or(E::Capacity)?;
        let bytes = heap_sum([
            size_of::<PreparedRestoreArchives>(),
            names,
            maximum
                .checked_mul(size_of::<RestoreArchive>())
                .ok_or(E::Capacity)?,
            map_storage::<Key<'_>, Option<crate::received::SourceVersionArchiveChange<'_>>>(
                changes,
            )
            .ok_or(E::Capacity)?,
        ])
        .ok_or(E::Capacity)?;
        let mut storage = budget.reserve(bytes).map_err(|_| E::Capacity)?;
        let mut updates = IndexMap::new();
        updates
            .try_reserve_exact(changes)
            .map_err(|_| E::Capacity)?;
        for change in plan.archive_changes() {
            let key = (change.actor_id, change.kind, change.id, change.revision);
            if updates.insert(key, Some(change)).is_some() {
                return Err(E::MalformedResponse);
            }
        }
        let category = |class| match class {
            AccountClass::Optional => ArchiveCategory::Optional,
            AccountClass::Required => ArchiveCategory::Required,
            AccountClass::Speech => ArchiveCategory::Speech,
        };
        let class = |value| match value {
            ArchiveCategory::Optional => AccountClass::Optional,
            ArchiveCategory::Required => AccountClass::Required,
            ArchiveCategory::Speech => AccountClass::Speech,
        };
        let mut rows = Vec::new();
        rows.try_reserve_exact(maximum).map_err(|_| E::Capacity)?;
        for (row, before) in self.prepared.input.archives.iter().zip(&selected.kept) {
            let Some(before) = before else {
                continue;
            };
            let key = (
                row.actor_id.as_str(),
                row.kind.as_str(),
                row.id.as_str(),
                row.revision.as_str(),
            );
            let after = if let Some(change) = updates.get_mut(&key) {
                let change = change.take().ok_or(E::MalformedResponse)?;
                if change.expected_prior != Some((class(*before), row.bytes)) {
                    return Err(E::MalformedResponse);
                }
                let Some((next, bytes)) = change.desired else {
                    continue;
                };
                if bytes != row.bytes {
                    return Err(E::MalformedResponse);
                }
                category(next)
            } else {
                *before
            };
            rows.push(RestoreArchive {
                category: after,
                ..row.clone()
            });
        }
        for (_, change) in updates {
            let Some(change) = change else {
                continue;
            };
            if change.expected_prior.is_some() {
                return Err(E::MalformedResponse);
            }
            if let Some((next, bytes)) = change.desired {
                if !change.has_payload {
                    return Err(E::MalformedResponse);
                }
                rows.push(RestoreArchive {
                    actor_id: change.actor_id.to_owned(),
                    kind: change.kind.to_owned(),
                    id: change.id.to_owned(),
                    revision: change.revision.to_owned(),
                    bytes,
                    category: category(next),
                });
            }
        }
        // The selection map and its carrier have now been dropped. Only this
        // actual final metadata vector survives the provider phase.
        storage
            .resize(
                rows.heap_bytes()
                    .and_then(|n| n.checked_add(size_of::<PreparedRestoreArchives>()))
                    .ok_or(E::Capacity)?,
            )
            .map_err(|_| E::Capacity)?;
        Ok(PreparedRestoreArchives { rows, storage })
    }
}
pub(crate) fn finish_restore_metadata(
    core: &mut CoreMutation<'_>,
    baseline: RestoreArchiveBaseline,
    final_archives: PreparedRestoreArchives,
    budget: &ByteBudget,
) -> Result<RestoreMetadataResult, ExecutionError> {
    let RestoreMetadataPreparation {
        input,
        mut storage,
        selection,
    } = baseline.prepared;
    let kept = selection.ok_or(ExecutionError::InvalidCheckpoint)?;
    let count = kept.kept.iter().filter(|value| value.is_some()).count();
    storage.merge(
        budget.reserve(
            count
                .checked_mul(size_of::<RestoreArchive>())
                .ok_or(ExecutionError::Capacity)?,
        )?,
    )?;
    let mut before = Vec::new();
    before
        .try_reserve_exact(count)
        .map_err(|_| ExecutionError::Capacity)?;
    let RestoreMetadataInput {
        archives,
        actor_owners,
        world_grants,
        privacy_revisions,
        namespace,
        ..
    } = input;
    for (row, category) in archives.into_iter().zip(kept.kept) {
        if let Some(category) = category {
            before.push(RestoreArchive { category, ..row });
        }
    }
    drop((actor_owners, world_grants, privacy_revisions, namespace));
    let PreparedRestoreArchives {
        rows,
        storage: final_storage,
    } = final_archives;
    storage.merge(final_storage)?;
    // Alias expansion and retention have finished. Capture the actual current
    // constraints; no operational epoch or archive total is reset here.
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
    let bytes = crate::host::retained_size::heap_sum([
        size_of::<RestoreMetadataResult>(),
        before.heap_bytes().ok_or(ExecutionError::Capacity)?,
        rows.heap_bytes().ok_or(ExecutionError::Capacity)?,
        privacy.heap_bytes().ok_or(ExecutionError::Capacity)?,
    ])
    .ok_or(ExecutionError::Capacity)?;
    storage.resize(bytes)?;
    Ok(RestoreMetadataResult {
        kept_archives: rows,
        privacy,
        archive_baseline: before,
        _storage: storage,
    })
}

pub(crate) use archives::{
    RestoreArchivesAnswer, RestoreArchivesCursor, RestoreArchivesQuestion, RestoreArchivesStep,
};
