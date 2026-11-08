//! Immutable inputs for the existing history writer. Original truth stays in
//! the internal original row; each personal account comes only from that actor's
//! actually admitted awareness or original temporal occurrence.

use super::*;
use crate::encoding::json_record_len;
use crate::events::{OccurrenceHistory, OriginalOccurrence};
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage, tree_node_bound};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::{
    ReceivedBatch, ReceivedChargeDirectory, ReceivedEntry, ReceivedEntryKind, ReceivedFrontier,
    ReceivedOrigin, ReceivedValueFragment, TemporalReceipt, materialize_received_receipt,
};
use crate::reception::{ReceivedValueLookup, SensoryFacet};
use crate::simulation::SimulationState;
use serde::ser::{SerializeStruct, Serializer};
use std::mem::size_of;

pub(crate) struct HistorySettings<'a> {
    pub policy_id: &'a str,
    pub policy_revision: u64,
}
struct Original(Arc<OriginalOccurrence>);
impl Serialize for Original {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        let mut out = s.serialize_struct("Original", 2)?;
        out.serialize_field("eventId", &self.0.event().id)?;
        out.serialize_field("payload", self.0.payload())?;
        out.end()
    }
}
struct AwarenessBody(Arc<PersonalSourceRecord>);
impl Serialize for AwarenessBody {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(self.0.payload())
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TemporalAccount {
    receipt: TemporalReceipt,
    values: Vec<SensoryFacet>,
    bytes: u64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Account {
    event_id: String,
    actor_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    awareness_payload: Option<AwarenessBody>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temporal: Option<TemporalAccount>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ActorCut {
    actor_id: String,
    at: f64,
    max_age_seconds: f64,
    forgotten: Vec<String>,
    corrected: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    frontier: Option<ReceivedFrontier>,
    recent_present: bool,
    recent_directories: Vec<ReceivedChargeDirectory>,
    recent_bytes: u64,
    recent_count: u64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Subject {
    id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    mechanism_fields: Option<IndexMap<String, IndexMap<String, f64>>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    actor: Option<EmptyChildOwner>,
    #[serde(skip_serializing_if = "Option::is_none")]
    animal: Option<EmptyChildOwner>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Principal {
    actor_id: String,
    owner_id: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HistoryInput {
    world_id: String,
    generation: String,
    base_cut: u64,
    policy_revision: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    policy_payload: Option<String>,
    principals: Vec<Principal>,
    changed: Vec<Original>,
    accounts: Vec<Account>,
    cuts: Vec<ActorCut>,
    subjects: Vec<Subject>,
}

/// Raw source bytes retain their immutable canonical owner. Expanded receipt
/// and actor metadata allocations retain their own guards through handoff.
pub(crate) struct CapturedHistoryInput {
    input: HistoryInput,
    _reservations: Vec<ByteReservation>,
}
impl CapturedHistoryInput {
    pub(crate) fn value(&self) -> impl Serialize + '_ {
        &self.input
    }
    pub(crate) fn base_cut(&self) -> u64 {
        self.input.base_cut
    }
    pub(crate) fn generation(&self) -> &str {
        &self.input.generation
    }
    pub(crate) fn world_id(&self) -> &str {
        &self.input.world_id
    }
}

fn capacity() -> ExperienceError {
    ExperienceError::Capacity
}
fn reserve(budget: &ByteBudget, bytes: Option<usize>) -> Result<ByteReservation, ExperienceError> {
    budget
        .reserve(bytes.ok_or_else(capacity)?)
        .map_err(|_| capacity())
}
fn receipt_bound(batch: &ReceivedBatch, entry: &ReceivedEntry) -> Option<usize> {
    let record = &entry.receipt;
    let fields = record.facets.len();
    let sources = record.sources.heap_bytes()?;
    let frames = record.frames.heap_bytes()?;
    heap_sum([
        record.heap_bytes()?,
        sources.checked_mul(fields.checked_mul(6)?.checked_add(1)?)?,
        frames.checked_mul(fields.checked_mul(2)?.checked_add(1)?)?,
        fields.checked_mul(4 * size_of::<crate::received::TemporalFacetReference>())?,
        record
            .sources
            .len()
            .checked_add(record.frames.len())?
            .checked_mul(tree_node_bound::<u64, ()>()?)?,
        batch.actor_id.len(),
        batch.epoch.len(),
        128,
    ])
    .and_then(|bytes| bytes.checked_mul(2))
}
fn temporal_account(
    state: &SimulationState,
    batch: &ReceivedBatch,
    entry: &ReceivedEntry,
    budget: &ByteBudget,
) -> Result<Option<(TemporalAccount, Vec<ByteReservation>)>, ExperienceError> {
    let reservation = reserve(budget, receipt_bound(batch, entry))?;
    let mut reservations = Vec::new();
    reservations.try_reserve_exact(2).map_err(|_| capacity())?;
    reservations.push(reservation);
    let receipt = materialize_received_receipt(batch, entry, None)
        .map_err(|_| ExperienceError::InvalidBody("history receipt"))?;
    let values = state.reception.received_values.as_ref();
    let mut selected = Vec::new();
    selected
        .try_reserve_exact(receipt.facets.len())
        .map_err(|_| capacity())?;
    let mut bytes = receipt
        .facets
        .len()
        .checked_mul(size_of::<SensoryFacet>())
        .ok_or_else(capacity)?;
    for field in &receipt.facets {
        let Some(fragment) = values.value_at(&field.value_ref) else {
            return Err(ExperienceError::Unavailable);
        };
        if !matches!(
            fragment,
            ReceivedValueFragment::Sensory(SensoryFacet::Event { .. } | SensoryFacet::Sound { .. })
        ) {
            continue;
        }
        if !super::evidence::temporal_facet_eligible(
            &state.experience,
            &batch.actor_id,
            field,
            fragment,
            &state.installed.account_law(),
        )? {
            continue;
        }
        let ReceivedValueFragment::Sensory(value) = fragment else {
            unreachable!()
        };
        bytes = bytes
            .checked_add(value.heap_bytes().ok_or_else(capacity)?)
            .ok_or_else(capacity)?;
        selected.push(value);
    }
    if !selected
        .iter()
        .any(|value| matches!(value, SensoryFacet::Event { .. }))
    {
        return Ok(None);
    }
    reservations.push(reserve(budget, Some(bytes))?);
    let values = selected.into_iter().cloned().collect::<Vec<_>>();
    #[derive(Serialize)]
    struct Charge<'a> {
        receipt: &'a TemporalReceipt,
        values: &'a [SensoryFacet],
    }
    let bytes = u64::try_from(
        json_record_len(&Charge {
            receipt: &receipt,
            values: &values,
        })
        .map_err(|_| ExperienceError::InvalidBody("history account encoding"))?,
    )
    .map_err(|_| capacity())?;
    Ok(Some((
        TemporalAccount {
            receipt,
            values,
            bytes,
        },
        reservations,
    )))
}

/// New originals are issued by the single occurrence owner in this candidate;
/// their IDs cannot occur in a cold predecessor. No missing resident old source
/// is interpreted as absent. The receiver scopes must already be flushed.
pub(crate) fn capture_history_input(
    state: &SimulationState,
    history: &OccurrenceHistory,
    journal: &ExperienceJournal,
    settings: HistorySettings<'_>,
    budget: &ByteBudget,
) -> Result<CapturedHistoryInput, ExperienceError> {
    let originals = history.appended().count();
    let audiences = history
        .appended()
        .try_fold(0usize, |count, row| {
            count.checked_add(row.event().event().audience.len())
        })
        .ok_or_else(capacity)?;
    let max_actors = audiences
        .checked_add(journal.undo.len())
        .ok_or_else(capacity)?;
    let max_subjects = originals
        .checked_add(audiences)
        .and_then(|n| n.checked_mul(2))
        .ok_or_else(capacity)?;
    let max_guards = audiences
        .checked_mul(5)
        .and_then(|n| n.checked_add(max_actors))
        .and_then(|n| n.checked_add(originals.checked_mul(3)?))
        .and_then(|n| n.checked_add(2))
        .ok_or_else(capacity)?;
    let skeleton = heap_sum([
        size_of::<HistoryInput>(),
        state.physical.header.id.len(),
        state.generation.len(),
        originals
            .checked_mul(size_of::<Original>())
            .ok_or_else(capacity)?,
        audiences
            .checked_mul(size_of::<Account>())
            .ok_or_else(capacity)?,
        max_actors
            .checked_mul(size_of::<ActorCut>())
            .ok_or_else(capacity)?,
        max_guards
            .checked_mul(size_of::<ByteReservation>())
            .ok_or_else(capacity)?,
        max_subjects
            .checked_mul(size_of::<Subject>())
            .ok_or_else(capacity)?,
        map_storage::<&str, ()>(max_actors).ok_or_else(capacity)?,
        map_storage::<String, ()>(max_subjects).ok_or_else(capacity)?,
        state
            .administration
            .authorship
            .player_account_ids
            .heap_bytes()
            .ok_or_else(capacity)?,
        state
            .administration
            .authorship
            .player_account_ids
            .len()
            .checked_mul(size_of::<Principal>())
            .ok_or_else(capacity)?,
    ])
    .ok_or_else(capacity)?;
    let skeleton = reserve(budget, Some(skeleton))?;
    let mut reservations = Vec::new();
    reservations
        .try_reserve_exact(max_guards)
        .map_err(|_| capacity())?;
    reservations.push(skeleton);
    let mut changed = Vec::new();
    changed
        .try_reserve_exact(originals)
        .map_err(|_| capacity())?;
    let mut accounts = Vec::new();
    accounts
        .try_reserve_exact(audiences)
        .map_err(|_| capacity())?;
    let mut actors = IndexSet::new();
    actors.try_reserve(max_actors).map_err(|_| capacity())?;
    let mut wanted_subjects = IndexSet::<String>::new();
    wanted_subjects
        .try_reserve(max_subjects)
        .map_err(|_| capacity())?;
    for placed in history.appended() {
        let original = placed.event();
        let event = original.event();
        changed.push(Original(Arc::clone(original)));
        reservations.push(reserve(
            budget,
            event
                .actor_id
                .as_ref()
                .map_or(0, String::len)
                .checked_add(event.target_id.as_ref().map_or(0, String::len)),
        )?);
        wanted_subjects.extend(event.actor_id.iter().cloned());
        wanted_subjects.extend(event.target_id.iter().cloned());
        for actor_id in &event.audience {
            actors.insert(actor_id.as_str());
            let privacy = state.experience.actor(actor_id).map(|actor| &actor.privacy);
            if privacy.is_some_and(|privacy| privacy.forgotten_index.contains(&event.id)) {
                continue;
            }
            let awareness = state
                .experience
                .optional_collection(actor_id, PersonalSourceKind::Awareness)?
                .and_then(|sources| {
                    sources
                        .records()
                        .find(|source| source.header.reference.id == event.id)
                });
            if let Some(source) = awareness {
                let _ids = reserve(
                    budget,
                    event
                        .id
                        .len()
                        .checked_add(actor_id.len())
                        .and_then(|bytes| {
                            bytes.checked_add(
                                source
                                    .header
                                    .evidence_source_id
                                    .as_ref()
                                    .map_or(0, String::len),
                            )
                        })
                        .and_then(|bytes| {
                            bytes.checked_add(
                                source
                                    .header
                                    .evidence_target_id
                                    .as_ref()
                                    .map_or(0, String::len),
                            )
                        }),
                )?;
                reservations.push(_ids);
                wanted_subjects.extend(source.header.evidence_source_id.iter().cloned());
                wanted_subjects.extend(source.header.evidence_target_id.iter().cloned());
                accounts.push(Account {
                    event_id: event.id.clone(),
                    actor_id: actor_id.clone(),
                    awareness_payload: Some(AwarenessBody(Arc::clone(source))),
                    temporal: None,
                });
                continue;
            }
            let Some(actor) = state.temporal.actor(actor_id) else {
                continue;
            };
            let mut found = None;
            'pages: for page in actor.pending_pages().iter().rev() {
                for entry in &page.batch().entries {
                    if entry.kind == ReceivedEntryKind::Occurrence
                        && matches!(&entry.receipt.origin,Some(ReceivedOrigin::Occurrence{event_id,..})if event_id==&event.id)
                    {
                        if let Some(account) = temporal_account(state, page.batch(), entry, budget)?
                        {
                            found = Some(account);
                            break 'pages;
                        }
                    }
                }
            }
            if let Some((account, guards)) = found {
                let references = account
                    .values
                    .iter()
                    .find_map(|value| match value {
                        SensoryFacet::Event { references, .. } => Some(references),
                        _ => None,
                    })
                    .ok_or(ExperienceError::InvalidBody("history event value"))?;
                let ids = [
                    crate::reception::ReferenceRole::Actor,
                    crate::reception::ReferenceRole::Target,
                ]
                .map(|role| {
                    references
                        .iter()
                        .find(|reference| reference.role == role)
                        .map(|reference| reference.id.as_str())
                });
                let bytes = ids.iter().flatten().try_fold(
                    event
                        .id
                        .len()
                        .checked_add(actor_id.len())
                        .ok_or_else(capacity)?,
                    |bytes, id| bytes.checked_add(id.len()).ok_or_else(capacity),
                )?;
                reservations.extend(guards);
                reservations.push(reserve(budget, Some(bytes))?);
                wanted_subjects.extend(ids.into_iter().flatten().map(str::to_owned));
                accounts.push(Account {
                    event_id: event.id.clone(),
                    actor_id: actor_id.clone(),
                    awareness_payload: None,
                    temporal: Some(account),
                });
            }
        }
    }
    // The same fixed cut supplies privacy for source-version preparation even
    // when a personal memory changed without emitting an original occurrence.
    actors.extend(
        journal
            .appended(&state.experience)
            .chain(journal.replaced(&state.experience))
            .map(|record| record.header.actor_id.as_str()),
    );
    actors.extend(
        journal
            .removed()
            .map(|record| record.header.actor_id.as_str()),
    );
    actors.extend(journal.changed_privacy_actors());
    let mut cuts = Vec::new();
    cuts.try_reserve_exact(actors.len())
        .map_err(|_| capacity())?;
    for actor_id in actors {
        let (cut, reservation) = capture_actor_cut(state, actor_id, budget)?;
        cuts.push(cut);
        reservations.push(reservation);
    }
    let mut subjects = Vec::new();
    subjects
        .try_reserve_exact(wanted_subjects.len())
        .map_err(|_| capacity())?;
    for id in wanted_subjects {
        if let Some(entity) = state.physical.entities.get(&id) {
            let mechanism = entity
                .mechanism_fields
                .as_ref()
                .and_then(|fields| fields.get(settings.policy_id));
            let bytes = heap_sum([
                size_of::<Subject>(),
                id.len(),
                mechanism
                    .map_or(Some(0), |fields| {
                        heap_sum([
                            map_storage::<String, IndexMap<String, f64>>(1)?,
                            settings.policy_id.len(),
                            fields.heap_bytes()?,
                        ])
                    })
                    .ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)?;
            reservations.push(reserve(budget, Some(bytes))?);
            subjects.push(Subject {
                id,
                mechanism_fields: mechanism.map(|fields| {
                    IndexMap::from([(settings.policy_id.to_owned(), fields.clone())])
                }),
                actor: entity.actor.as_ref().map(|_| EmptyChildOwner {}),
                animal: entity.animal.as_ref().map(|_| EmptyChildOwner {}),
            });
        }
    }
    let policy_payload = state
        .installed
        .retained
        .story_policy
        .as_ref()
        .map(|policy| policy.payload());
    reservations.push(reserve(budget, Some(policy_payload.map_or(0, str::len)))?);
    let principals = state
        .administration
        .authorship
        .player_account_ids
        .iter()
        .map(|(actor, owner)| Principal {
            actor_id: actor.clone(),
            owner_id: owner.clone(),
        })
        .collect();
    Ok(CapturedHistoryInput {
        input: HistoryInput {
            world_id: state.physical.header.id.clone(),
            generation: state.generation.clone(),
            base_cut: state.accepted_cut,
            policy_revision: settings.policy_revision,
            policy_payload: policy_payload.map(str::to_owned),
            principals,
            changed,
            accounts,
            cuts,
            subjects,
        },
        _reservations: reservations,
    })
}

fn capture_actor_cut(
    state: &SimulationState,
    actor_id: &str,
    budget: &ByteBudget,
) -> Result<(ActorCut, ByteReservation), ExperienceError> {
    let privacy = state.experience.actor(actor_id).map(|actor| &actor.privacy);
    let temporal = state.temporal.actor(actor_id);
    let forgotten = privacy.map_or(0, |p| p.forgotten.len());
    let corrected = privacy.map_or(0, |p| p.corrections.len());
    let dirs = temporal.map_or(0, |actor| actor.recent().directories().count());
    let bytes = heap_sum([
        actor_id.len(),
        forgotten
            .checked_add(corrected)
            .and_then(|n| n.checked_mul(size_of::<String>()))
            .ok_or_else(capacity)?,
        privacy
            .map_or(Some(0), |p| {
                p.forgotten
                    .iter()
                    .chain(p.corrections.keys())
                    .try_fold(0usize, |n, id| n.checked_add(id.len()))
            })
            .ok_or_else(capacity)?,
        dirs.checked_mul(size_of::<ReceivedChargeDirectory>())
            .ok_or_else(capacity)?,
        temporal
            .map_or(Some(0), |actor| {
                actor
                    .recent()
                    .directories()
                    .try_fold(0usize, |n, d| n.checked_add(d.heap_bytes()?))
            })
            .ok_or_else(capacity)?,
    ])
    .ok_or_else(capacity)?;
    let reservation = reserve(budget, Some(bytes))?;
    let cut = ActorCut {
        actor_id: actor_id.to_owned(),
        at: state.physical.header.sim_time,
        max_age_seconds: state
            .installed
            .attention
            .value()
            .retention
            .recent
            .max_age_seconds,
        forgotten: privacy.map(|p| p.forgotten.clone()).unwrap_or_default(),
        corrected: privacy
            .map(|p| p.corrections.keys().cloned().collect())
            .unwrap_or_default(),
        frontier: temporal.and_then(|actor| actor.header().frontier.clone()),
        recent_present: temporal.is_some(),
        recent_directories: temporal
            .map(|actor| actor.recent().directories().cloned().collect())
            .unwrap_or_default(),
        recent_bytes: temporal.map_or(0, |actor| actor.recent().bytes()),
        recent_count: temporal.map_or(0, |actor| actor.recent().count()),
    };
    Ok((cut, reservation))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HistoryCuts {
    world_id: String,
    generation: String,
    base_cut: u64,
    cuts: Vec<ActorCut>,
}
pub(crate) struct CapturedHistoryCuts {
    input: HistoryCuts,
    _reservations: Vec<ByteReservation>,
}
impl CapturedHistoryCuts {
    pub(crate) fn value(&self) -> impl Serialize + '_ {
        &self.input
    }
}

/// Refresh only the actual actors retained by a pending history prefix. Their
/// old personal accounts remain immutable; present eligibility comes from this
/// exact later cut rather than from a stale retained world.
pub(crate) fn capture_history_cuts<'a>(
    state: &SimulationState,
    actors: impl Clone + Iterator<Item = &'a str>,
    budget: &ByteBudget,
) -> Result<CapturedHistoryCuts, ExperienceError> {
    let count = actors.clone().count();
    let bytes = (|| {
        heap_sum([
            size_of::<HistoryCuts>(),
            state.physical.header.id.len(),
            state.generation.len(),
            count.checked_mul(size_of::<ActorCut>())?,
            count
                .checked_add(1)?
                .checked_mul(size_of::<ByteReservation>())?,
            map_storage::<&str, ()>(count)?,
        ])
    })()
    .ok_or_else(capacity)?;
    let reservation = reserve(budget, Some(bytes))?;
    let mut reservations = Vec::new();
    reservations
        .try_reserve_exact(count.checked_add(1).ok_or_else(capacity)?)
        .map_err(|_| capacity())?;
    reservations.push(reservation);
    let mut cuts = Vec::new();
    cuts.try_reserve_exact(count).map_err(|_| capacity())?;
    let mut seen = IndexSet::new();
    seen.try_reserve(count).map_err(|_| capacity())?;
    for actor in actors {
        if seen.insert(actor) {
            let (cut, reservation) = capture_actor_cut(state, actor, budget)?;
            cuts.push(cut);
            reservations.push(reservation);
        }
    }
    Ok(CapturedHistoryCuts {
        input: HistoryCuts {
            world_id: state.physical.header.id.clone(),
            generation: state.generation.clone(),
            base_cut: state.accepted_cut,
            cuts,
        },
        _reservations: reservations,
    })
}
